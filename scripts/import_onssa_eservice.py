"""
Import des registres publics de l'ONSSA -> data/onssa-eservice.json

    python scripts/import_onssa_eservice.py

POURQUOI CETTE SOURCE.

Jusqu'ici, tout ce que l'outil savait du Maroc venait d'un fichier Excel :
l'index phytosanitaire, figé au jour de son export. Or l'ONSSA publie
elle-même plusieurs registres, tenus à jour, et deux d'entre eux répondent à
des questions que l'index ne pose même pas :

  1. SOCIÉTÉS PHYTOSANITAIRES AGRÉÉES — qui a le droit d'importer et de
     distribuer au Maroc, avec le numéro d'agrément, sa date, l'ingénieur
     responsable et les coordonnées. C'est la réponse officielle à « avec qui
     puis-je travailler », et l'annuaire par lequel lancer une consultation.

  2. ORGANISMES AGRÉÉS EN BONNES PRATIQUES D'EXPÉRIMENTATION — qui peut
     réaliser les essais d'efficacité que réclame l'Annexe 3-B, et sur quelles
     cultures. Un organisme agréé pour les cultures légumières ne peut pas
     couvrir un usage en arboriculture : le périmètre compte autant que
     l'agrément.

  3. PRODUITS PESTICIDES EXPIRÉS — les homologations marocaines arrivées à
     terme. C'est un FAIT marocain, là où le reste de la veille est une
     PRÉDICTION tirée du statut français. Double lecture : contrôle de la
     prédiction, et places laissées vacantes sur le marché.

⚠️ CE QUI N'EST PAS IMPORTÉ, ET POURQUOI.
  • « Commission des Pesticides à Usage Agricole » : dernière réunion publiée
    le 06/05/2020. Le registre n'est plus tenu ; le présenter comme un pipeline
    d'homologations en cours induirait en erreur.
  • « Évaluateurs » : noms, téléphones mobiles et adresses de fonctionnaires de
    l'ONSSA. Aucun besoin métier ne justifie de recopier des données
    personnelles dans une application déployée.
  • « Index phytosanitaire » : fiches produit (usages, dose, DAR) importées
    à part par scripts/import_onssa_indpesticide.py depuis IndPesticide.aspx.

Source : ONSSA — https://eservice.onssa.gov.ma, registres publics.
"""

import html
import json
import re
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _reseau import telecharger  # noqa: E402

RACINE = Path(__file__).resolve().parent.parent
SORTIE = RACINE / "data" / "onssa-eservice.json"

BASE = "https://eservice.onssa.gov.ma"
ATTRIBUTION = "ONSSA — registres publics eservice.onssa.gov.ma"


def texte(x):
    return html.unescape(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", x))).strip()


def lignes(page):
    """Cellules de chaque <tr>, texte nettoyé."""
    return [
        [texte(c) for c in re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", tr, flags=re.S)]
        for tr in re.findall(r"<tr[^>]*>(.*?)</tr>", page, flags=re.S)
    ]


def maj(page):
    """Date de dernière mise à jour affichée en tête de chaque registre."""
    m = re.search(r"Derni[eè]re MAJ\s*:\s*([0-9/]+)", texte(page))
    return m.group(1) if m else None


def charger(nom):
    page = telecharger(f"{BASE}/{nom}.aspx").decode("utf-8", "replace")
    print(f"  {nom:20} {len(page) // 1024:4} Ko · MAJ {maj(page) or '?'}")
    return page


# ── Découpage des blocs « Étiquette : valeur » ──────────────────────────────
# L'ONSSA sert une fiche entière dans une seule cellule, les champs séparés par
# leur seule étiquette. On coupe sur les étiquettes connues plutôt que sur un
# séparateur : il n'y en a pas.

def decouper(cellule, etiquettes):
    """« Raison Sociale : X Siège social : Y » -> {'Raison Sociale': 'X', …}."""
    motif = "|".join(re.escape(e) for e in etiquettes)
    bouts = re.split(rf"\b({motif})\s*:\s*", cellule)
    out = {}
    for i in range(1, len(bouts) - 1, 2):
        out[bouts[i]] = bouts[i + 1].strip(" ;-")
    return out


CHAMPS_SOCIETE = ["Raison Sociale", "Siège social", "RC", "Téléphone", "Fax", "Email"]


def societe(cellule):
    d = decouper(cellule, CHAMPS_SOCIETE)
    return {
        "nom": d.get("Raison Sociale") or None,
        "siege": d.get("Siège social") or None,
        "rc": d.get("RC") or None,
        "telephone": d.get("Téléphone") or None,
        "fax": d.get("Fax") or None,
        # L'ONSSA sépare parfois deux adresses par un point-virgule.
        "emails": [e.strip() for e in (d.get("Email") or "").split(";") if e.strip()],
    }


def agrement(cellule, avec_expiration=False):
    et = ["Numéro", "Date", "Date d’expiration", "Date d'expiration"]
    d = decouper(cellule, et)
    a = {"numero": d.get("Numéro") or None, "date": d.get("Date") or None}
    if avec_expiration:
        a["expiration"] = d.get("Date d’expiration") or d.get("Date d'expiration") or None
    return a


def importer_societes(page):
    out = []
    for c in lignes(page):
        if len(c) < 3 or "Raison Sociale" not in c[0]:
            continue
        d = decouper(c[2], ["Local", "Ingénieur"])
        # Ce qui précède « Local : » est le libellé de l'activité.
        activite = re.split(r"\bLocal\s*:", c[2])[0].strip()
        out.append({
            **societe(c[0]),
            "agrement": agrement(c[1]),
            "activite": activite or None,
            "local": d.get("Local") or None,
            "ingenieur": d.get("Ingénieur") or None,
        })
    return out


# Périmètres d'agrément BPE, tels que libellés par l'ONSSA. Découper dessus est
# le seul moyen de séparer une liste que rien ne ponctue.
PERIMETRES_BPE = [
    "Cultures fruitières",
    "Cultures légumières et plantes aromatiques et médicinales",
    "Grandes cultures",
    "Cultures ornementales",
    "Cultures tropicales",
    "Zones non cultivées (excepté les arbres forestiers)",
    "Milieu forestier",
    "Traitement des semences",
    "Production de matériel végétal de multiplication",
    "Désinfection des sols",
    "Traitement des produits récoltés (entreposage)",
]


def importer_bpe(page):
    out = []
    for c in lignes(page):
        if len(c) < 3 or "Raison Sociale" not in c[0]:
            continue
        brut = re.sub(r"^\s*Activité\s*:\s*", "", c[2])
        couverture = [p for p in PERIMETRES_BPE if p in brut]
        # Ce que le découpage n'a pas reconnu : signalé plutôt que perdu.
        reste = brut
        for p in couverture:
            reste = reste.replace(p, " ")
        reste = re.sub(r"\s+", " ", reste).strip()
        out.append({
            **societe(c[0]),
            "agrement": agrement(c[1], avec_expiration=True),
            "couverture": couverture,
            "couvertureNonReconnue": reste or None,
        })
    return out


def parse_date(s):
    m = re.match(r"(\d{2})/(\d{2})/(\d{4})", (s or "").strip())
    return f"{m.group(3)}-{m.group(2)}-{m.group(1)}" if m else None


def importer_expires(page):
    out = []
    for c in lignes(page):
        # Produit | Fournisseur | Détenteur | Matières actives | Expiration | AMM
        if len(c) != 6 or c[0] in ("", "Produit") or c[0].startswith("Produits ("):
            continue
        if not parse_date(c[4]):
            continue
        out.append({
            "produit": c[0] or None,
            "fournisseur": c[1] or None,
            "detenteur": c[2] or None,
            "matieresActives": c[3] or None,
            "expiration": parse_date(c[4]),
            "amm": c[5] or None,
        })
    return out


def main():
    print("registres ONSSA :")
    p_soc = charger("IndSteAgreee")
    p_bpe = charger("IndSteAgreeeBPE")
    p_exp = charger("PesticidesExpire")

    societes = importer_societes(p_soc)
    bpe = importer_bpe(p_bpe)
    expires = importer_expires(p_exp)

    payload = {
        "meta": {
            "source": ATTRIBUTION,
            "url": f"{BASE}/Default.aspx",
            "attribution": f"{ATTRIBUTION} — relevé du {datetime.now().date().isoformat()}",
            "genere": datetime.now().isoformat(timespec="seconds"),
            "majSocietes": maj(p_soc),
            "majBpe": maj(p_bpe),
            "majExpires": maj(p_exp),
            "nbSocietes": len(societes),
            "nbBpe": len(bpe),
            "nbExpires": len(expires),
            "avertissement": (
                "Registres publiés par l'ONSSA. L'Office décline toute "
                "responsabilité sur une omission ou une erreur, et rappelle que "
                "seules les attestations d'homologation font foi. La liste des "
                "produits expirés est un FAIT marocain, à ne pas confondre avec "
                "la prédiction tirée du statut français."
            ),
        },
        "societesAgreees": sorted(societes, key=lambda s: s["nom"] or ""),
        "organismesBpe": sorted(bpe, key=lambda s: s["nom"] or ""),
        "produitsExpires": sorted(expires, key=lambda p: p["expiration"] or "", reverse=True),
    }

    SORTIE.parent.mkdir(parents=True, exist_ok=True)
    SORTIE.write_text(json.dumps(payload, ensure_ascii=False, indent=1), encoding="utf-8")

    print(f"\nOK -> {SORTIE}")
    print(f"  {len(societes)} sociétés agréées · MAJ {payload['meta']['majSocietes']}")
    print(f"  {len(bpe)} organismes BPE · MAJ {payload['meta']['majBpe']}")
    print(f"  {len(expires)} produits expirés · MAJ {payload['meta']['majExpires']}")

    manque = [s["nom"] for s in societes if not s["agrement"]["numero"]]
    if manque:
        print(f"  ⚠ {len(manque)} société(s) sans numéro d'agrément lisible : {manque[:3]}")
    inconnu = [b["nom"] for b in bpe if b["couvertureNonReconnue"]]
    if inconnu:
        print(f"  ⚠ périmètre BPE partiellement non reconnu : {inconnu[:3]}")


if __name__ == "__main__":
    main()
