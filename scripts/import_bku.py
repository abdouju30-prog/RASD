"""
Import du registre turc BKÜ -> data/bku.json

    python scripts/import_bku.py

POURQUOI CETTE SOURCE.

La Turquie est un pays de sourcing générique proche du Maroc — climat, cultures
et logistique — et son registre publie ce que l'Inde et la Russie refusent : le
titulaire de chaque homologation, avec son adresse.

Elle apporte surtout une distinction que ni l'Australie ni l'EPA ne donnent, et
qui vaut celle du registre chinois : chaque produit porte la mention **İMAL**
(fabriqué en Turquie) ou **İTHAL** (importé). Une société qui détient des
homologations İMAL produit sur place ; celle qui n'a que des İTHAL est un
importateur, quel que soit le nombre de ses homologations.

⚠️ CE QUE CE FICHIER NE DIT PAS.
Aucune valeur réglementaire au Maroc : une homologation turque n'ouvre pas la
voie me-too et ne remplace aucune étude de l'Annexe 3-B. Et « İMAL » désigne une
fabrication en Turquie, pas nécessairement la synthèse de la matière active —
une formulation locale à partir d'un technique importé porte la même mention.

Accès : l'écran de recherche est un formulaire ASP.NET, mais le tableau est
alimenté par un point d'entrée DataTables qui répond en JSON sans jeton ni
session — c'est lui qu'on interroge.

Source : T.C. Tarım ve Orman Bakanlığı — Bitki Koruma Ürünleri Veri Tabanı,
https://bku.tarimorman.gov.tr — registre public.
"""

import json
import re
import sys
import time
import unicodedata
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _reseau import poster  # noqa: E402

RACINE = Path(__file__).resolve().parent.parent
SORTIE = RACINE / "data" / "bku.json"

BASE = "https://bku.tarimorman.gov.tr"
URL = f"{BASE}/BKURuhsat/RuhsatIndeksGetir"
REFERER = f"{BASE}/BKURuhsat/Index"
ATTRIBUTION = "T.C. Tarım ve Orman Bakanlığı — BKÜ Veri Tabanı"

COLONNES = [
    "compoundName", "itsRuhsatDurum", "aktifMaddeName",
    "itsCompanyNameWithAddress", "ruhsatTarihi", "ruhsatNo", "formulasyonName", "id",
]
PAGE = 500
PAUSE = 0.6


def requete(debut, taille):
    d = {"draw": "1", "start": str(debut), "length": str(taille)}
    for i, c in enumerate(COLONNES):
        d[f"columns[{i}][data]"] = c
        d[f"columns[{i}][name]"] = ""
        d[f"columns[{i}][searchable]"] = "true"
        d[f"columns[{i}][orderable]"] = "true"
        d[f"columns[{i}][search][value]"] = ""
        d[f"columns[{i}][search][regex]"] = "false"
    d["order[0][column]"] = "0"
    d["order[0][dir]"] = "asc"
    d["search[value]"] = ""
    d["search[regex]"] = "false"
    return json.loads(poster(URL, d, referer=REFERER))


# ── Découpage des libellés ──────────────────────────────────────────────────

def societe_et_adresse(brut):
    """« NOM A.Ş. (Rue…, Ville) » -> (nom, adresse). Le registre les colle."""
    s = (brut or "").strip()
    i = s.find(" (")
    if i < 0:
        return (s or None), None
    return s[:i].strip() or None, s[i + 2:].rstrip(")").strip() or None


# « İMAL » = fabriqué en Turquie, « İTHAL » = importé. La mention est accolée au
# nom commercial, pas dans un champ.
def origine(nom):
    u = (nom or "").upper()
    if "(İMAL)" in u or "(IMAL)" in u:
        return "imal"
    if "(İTHAL)" in u or "(ITHAL)" in u:
        return "ithal"
    return None


def nom_produit(nom):
    return re.sub(r"\s*\((?:İMAL|IMAL|İTHAL|ITHAL)\)\s*$", "", (nom or "").strip(), flags=re.I)


# « 650 g/l Malathion + 20 g/l Deltamethrin » -> ["Malathion", "Deltamethrin"].
# Le registre note la teneur de deux façons, jamais documentées ensemble :
#   « 45 g/l Chlorantraniliprole »  — nombre puis unité
#   « %22,5 Famoxadone »            — pourcentage avant le nombre
TENEUR = re.compile(
    r"^\s*(?:%\s*[\d.,]+|[\d.,]+\s*(?:%|g\s*/\s*l|g\s*/\s*kg|kg\s*/\s*l|ml\s*/\s*l|"
    r"mg\s*/\s*kg|iu\s*/\s*mg|ppm|g|mg))\s*",
    re.I,
)
# « (safener) », « (synergist) » : un rôle, pas un nom de substance.
ROLE = re.compile(r"\s*\((?:safener|synergist|sinerjist)\)\s*$", re.I)


def matieres_actives(brut):
    out = []
    for bout in re.split(r"\s\+\s", (brut or "")):
        nom = ROLE.sub("", TENEUR.sub("", bout).strip(" .,;"))
        # Si la teneur n'a pas été reconnue, on garde le libellé brut plutôt
        # que d'inventer un découpage : une matière mal nommée se repère,
        # une matière tronquée passe inaperçue.
        if nom:
            out.append(nom)
    return out


def cle(s):
    s = unicodedata.normalize("NFKD", (s or "").replace("İ", "I").replace("ı", "i"))
    s = "".join(c for c in s if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]+", " ", s.lower()).strip()


def main():
    print(f"registre BKÜ — {BASE}")
    tete = requete(0, 1)
    total = int(tete.get("recordsFiltered") or 0)
    if not total:
        raise SystemExit("Le registre n'a renvoyé aucun enregistrement.")
    print(f"  {total} homologations à parcourir")

    lignes = []
    debut = 0
    while debut < total:
        j = requete(debut, PAGE)
        page = j.get("data") or []
        if not page:
            break
        lignes.extend(page)
        debut += len(page)
        print(f"    {debut}/{total}", end="\r")
        time.sleep(PAUSE)
    print(" " * 30, end="\r")

    produits = []
    for l in lignes:
        nom, adresse = societe_et_adresse(l.get("itsCompanyNameWithAddress"))
        brut = l.get("compoundName")
        produits.append({
            "id": str(l.get("id")),
            "produit": nom_produit(brut),
            "origine": origine(brut),
            "statut": l.get("itsRuhsatDurum"),
            "ruhsatlie": bool(l.get("isRuhsatli")),
            "matieresActives": matieres_actives(l.get("aktifMaddeName")),
            "teneurBrute": l.get("aktifMaddeName"),
            "societe": nom,
            "societeId": l.get("ruhsatSahibiFirmaId"),
            "adresse": adresse,
            "ruhsatNo": str(l.get("ruhsatNo") or "") or None,
            "date": (l.get("ruhsatTarihi") or "")[:10] or None,
            "formulation": l.get("formulasyonName"),
        })

    # ── Sociétés ────────────────────────────────────────────────────────────
    # Le regroupement se fait sur l'identifiant de firme du registre, pas sur le
    # nom : c'est la seule clé stable, et deux libellés diffèrent souvent par
    # l'adresse accolée.
    par = {}
    for p in produits:
        if p["societeId"] is None:
            continue
        s = par.setdefault(p["societeId"], {
            "id": p["societeId"], "nom": p["societe"], "adresse": p["adresse"],
            "nbProduits": 0, "nbImal": 0, "nbIthal": 0,
            "matieres": set(), "matieresImal": set(),
        })
        s["nbProduits"] += 1
        if p["origine"] == "imal":
            s["nbImal"] += 1
            s["matieresImal"].update(p["matieresActives"])
        elif p["origine"] == "ithal":
            s["nbIthal"] += 1
        s["matieres"].update(p["matieresActives"])

    societes = []
    for s in par.values():
        societes.append({
            **{k: v for k, v in s.items() if k not in ("matieres", "matieresImal")},
            "matieres": sorted(s["matieres"]),
            "matieresImal": sorted(s["matieresImal"]),
            # Une société qui n'a que des İTHAL est un importateur : le dire
            # évite de la présenter comme un fabricant.
            "fabricant": s["nbImal"] > 0,
        })
    societes.sort(key=lambda x: (-x["nbImal"], -x["nbProduits"], x["nom"] or ""))

    # ── Matières actives ────────────────────────────────────────────────────
    par_ma = defaultdict(lambda: {"nom": None, "societes": set(), "societesImal": set()})
    for p in produits:
        for m in p["matieresActives"]:
            e = par_ma[cle(m)]
            e["nom"] = e["nom"] or m
            if p["societe"]:
                e["societes"].add(p["societe"])
                if p["origine"] == "imal":
                    e["societesImal"].add(p["societe"])

    matieres = [
        {
            "cle": k,
            "nom": v["nom"],
            "societes": sorted(v["societes"]),
            "societesImal": sorted(v["societesImal"]),
        }
        for k, v in sorted(par_ma.items())
    ]

    o = Counter(p["origine"] for p in produits)
    payload = {
        "meta": {
            "source": ATTRIBUTION,
            "url": REFERER,
            "attribution": f"{ATTRIBUTION} — relevé du {datetime.now().date().isoformat()}",
            "genere": datetime.now().isoformat(timespec="seconds"),
            "nbProduits": len(produits),
            "nbSocietes": len(societes),
            "nbFabricants": sum(1 for s in societes if s["fabricant"]),
            "nbMatieres": len(matieres),
            "nbImal": o.get("imal", 0),
            "nbIthal": o.get("ithal", 0),
            "avertissement": (
                "Registre turc des produits de protection des plantes. Aucune "
                "valeur réglementaire au Maroc : ni voie me-too, ni étude en "
                "moins. « İMAL » désigne une fabrication en Turquie, pas "
                "nécessairement la synthèse de la matière active — une "
                "formulation locale à partir d'un technique importé porte la "
                "même mention."
            ),
        },
        "societes": societes,
        "matieres": matieres,
    }

    SORTIE.parent.mkdir(parents=True, exist_ok=True)
    SORTIE.write_text(json.dumps(payload, ensure_ascii=False, indent=1), encoding="utf-8")

    print(f"OK -> {SORTIE}")
    print(f"  {len(produits)} homologations · {o.get('imal', 0)} İMAL / {o.get('ithal', 0)} İTHAL")
    print(f"  {len(societes)} sociétés, dont {payload['meta']['nbFabricants']} avec au moins un İMAL")
    print(f"  {len(matieres)} matières actives distinctes\n")
    for s in societes[:6]:
        print(f"    {s['nbImal']:4} İMAL  {len(s['matieresImal']):3} M.A.  {(s['nom'] or '')[:50]}")


if __name__ == "__main__":
    main()
