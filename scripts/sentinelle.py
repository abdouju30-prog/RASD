"""
Sentinelle — les matières actives homologuées ailleurs, absentes du Maroc.

    python scripts/sentinelle.py

CE QU'ON CHERCHE : L'EXCLUSIVITÉ.

Le radar défend le portefeuille contre les retraits. Celui-ci fait l'inverse :
il cherche ce qu'on pourrait homologuer le premier au Maroc. Une matière
active enregistrée à l'étranger et absente de l'index marocain est une
première homologation possible — et la première homologation EST l'exclusivité :
le suivant devra constituer son propre dossier complet, sans voie me-too, faute
de lettre d'accès du premier déposant.

LE SIGNAL, ET POURQUOI C'EST CELUI-LÀ.

⚠️ AUCUN REGISTRE OUVERT NE PUBLIE L'ÉTAT DES BREVETS. Une molécule récente de
Syngenta, Bayer, BASF ou Corteva est protégée par brevet et par la protection
des données : personne ne la fabrique pour vous, et l'inventeur l'homologuera
lui-même au Maroc. Guetter les lancements des majors ne donne donc aucune piste
d'approvisionnement — ça donne une information de concurrence, ce qui n'est pas
la même chose et se range à part.

Le seul signal FIABLE qu'une molécule est devenue accessible est celui-ci :

    quelqu'un d'autre que son inventeur en fabrique le technique,
    et l'a déclaré à un régulateur exigeant.

Le registre brésilien publie exactement cela, fabricant par fabricant. Un
fabricant chinois ou indien déclaré sur une molécule est la preuve, par les
faits, que sa fabrication générique a lieu. C'est ce que cette sentinelle
relève. Le classement « ouverte / fermée » se fait côté application, dans
lib/sentinelle.ts, là où l'écran l'affiche.

CE QUE LE SCRIPT CROISE.

    AGROFIT (Brésil)   la matière technique, ses fabricants, leur pays
    index ONSSA        est-elle déjà connue au Maroc ?
    E-Phy (Anses)      quel statut en France — l'ONSSA s'y aligne
    PUBCRIS (Australie) recoupement d'existence hors référentiel européen

⚠️ UNE MOLÉCULE RETIRÉE EN FRANCE N'EST PAS UNE OCCASION, C'EST UN PIÈGE.
L'ONSSA suit l'ANSES. Homologuer au Maroc ce que la France vient de retirer,
c'est acheter un dossier qui sera rattrapé. Le statut français est donc porté
sur chaque candidate, et il pèse autant que le nombre de fabricants.

⚠️ « ABSENTE DE L'INDEX » VEUT DIRE « LA CLÉ CHIMIQUE N'A RIEN APPARIÉ ».
Une graphie portugaise que la réduction ne ramène pas au nom marocain
produirait un faux positif. Vérifier l'absence à l'index avant d'agir.
"""

import json
import re
import sys
from collections import defaultdict
from datetime import date, datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _chimie import cle_chimique, verifier_collisions  # noqa: E402
from _pays import PAYS_COUT_FAIBLE  # noqa: E402

RACINE = Path(__file__).resolve().parent.parent
BRESIL = RACINE / "data" / "bresil.json"
EPHY = RACINE / "data" / "ephy.json"
APVMA = RACINE / "data" / "apvma.json"
ISO = RACINE / "data" / "_iso.json"
ONSSA = RACINE / "data" / "onssa.json"
SORTIE = RACINE / "data" / "sentinelle.json"

# Journal des premières apparitions. C'est lui qui fait la notification : une
# candidate absente de ce fichier est nouvelle depuis le dernier relevé, et
# l'historique git en tient le registre — même principe que la veille ANSES,
# qui ne stocke rien d'autre que ce que la source a changé.
VU = RACINE / "data" / "sentinelle-vu.json"


def charger(p: Path):
    if not p.exists():
        raise SystemExit(f"{p.name} absent — lancez d'abord son importateur.")
    return json.loads(p.read_text(encoding="utf-8"))


def actives_marocaines(matieres):
    """Les molécules de l'index ONSSA, une par une.

    ⚠️ IL FAUT LES DÉCOUPER. L'index nomme des formulations, pas des molécules :

        « 1,3-Dichloropropène(38%) / Chloropicrine(57%) »

    Compter cette ligne comme un seul nom laisserait la chloropicrine passer
    pour absente du Maroc, et l'écran l'annoncerait comme une occasion à saisir.
    Les teneurs partent d'abord (elles contiennent un « / » qu'il ne faut pas
    prendre pour un séparateur), les molécules ensuite.

    ⚠️ ET IL FAUT LES 653, PAS LES 168. Le pont ISO n'apparie que le tiers de
    l'index ; s'y limiter faisait ressortir le cymoxanil ou le folpet comme des
    nouveautés alors qu'ils sont homologués au Maroc depuis des années.
    """
    out = set()
    for m in matieres:
        nu = re.sub(r"\([^)]*\)", " ", m.get("nom") or "")
        for part in re.split(r"[/+]", nu):
            part = part.strip(" -–,;")
            if len(part) >= 4:
                out.add(part)
        mol = (m.get("molecule") or "").strip()
        if len(mol) >= 4:
            out.add(mol)
    return out


# Équivalences que la réduction phonétique ne peut pas produire : deux noms ISO
# également valides pour la même substance. Chacune a été lue dans les deux
# index avant d'être écrite ici.
ALIAS_MAROC = {
    "folpete": "Folpel",  # ISO « folpet » ; l'index marocain écrit « Folpel »
}


def index_par_cle(noms):
    """{clé chimique: nom d'origine}. Une clé en double est écartée des deux
    côtés : sur une identité réglementaire, l'ambiguïté ne se tranche pas."""
    par_cle = defaultdict(list)
    for n in noms:
        k = cle_chimique(n)
        if k:
            par_cle[k].append(n)
    return {k: v[0] for k, v in par_cle.items() if len(v) == 1}


def main():
    print("sentinelle — matières actives homologuées ailleurs, absentes du Maroc")

    br = charger(BRESIL)
    ephy = charger(EPHY)
    apvma = charger(APVMA)
    noms_iso = charger(ISO)["iso"]

    collisions = verifier_collisions(noms_iso)
    if collisions:
        raise SystemExit(f"Clés chimiques en collision, rapprochement refusé : {collisions}")

    # ── Ponts vers les deux registres de référence ──────────────────────────
    par_ephy = index_par_cle([s["nom"] for s in ephy["substances"]])
    ephy_par_nom = {s["nom"]: s for s in ephy["substances"]}
    par_apvma = index_par_cle([c["nom"] for c in apvma["constituants"]])
    apvma_par_nom = {c["nom"]: c for c in apvma["constituants"]}
    print(f"  {len(par_ephy)} substances E-Phy · {len(par_apvma)} constituants PUBCRIS")

    # ── Second filtre : tout l'index marocain, pas seulement sa part appariée ─
    marocaines = actives_marocaines(charger(ONSSA)["matieres"])
    cles_maroc = {}
    for n in marocaines:
        k = cle_chimique(n)
        if k:
            cles_maroc.setdefault(k, n)
    print(f"  {len(marocaines)} molécules distinctes lues dans l'index ONSSA")

    candidates, ecartees = [], []
    for m in br["horsIndex"]:
        k = cle_chimique(m["nomPt"])
        alias = ALIAS_MAROC.get(m["nomPt"])
        deja = cles_maroc.get(cle_chimique(alias)) if alias else cles_maroc.get(k)
        if deja:
            ecartees.append((m["nomPt"], deja))
            continue
        nom_fr = par_ephy.get(k)
        nom_au = par_apvma.get(k)
        fr = ephy_par_nom.get(nom_fr) if nom_fr else None
        au = apvma_par_nom.get(nom_au) if nom_au else None
        candidates.append({
            "nomPt": m["nomPt"],
            # Le nom ISO anglais vient d'Australie quand il existe : c'est lui
            # qui se dicte à un fournisseur chinois ou indien.
            "iso": nom_au,
            "groupeChimique": m["groupeChimique"],
            "teneurMax": m["teneurMax"],
            "nbHomologationsBr": m["nbHomologations"],
            # ⚠️ `coutFaible` VIENT DU PAYS DÉCLARÉ AU REGISTRE, pas d'un nom de
            # société : c'est un fait, et il porte tout le raisonnement. Une
            # usine chinoise ou indienne déclarée sur une molécule prouve que
            # sa fabrication générique existe — le seul indice ouvert qu'elle
            # n'est plus verrouillée par son inventeur. La liste des pays est
            # celle de _pays.py, écrite une fois pour tout l'outil.
            "fabricants": [
                {**f, "coutFaible": f["pays"] in PAYS_COUT_FAIBLE} for f in m["fabricants"]
            ],
            "titulaires": m["titulaires"][:12],
            "france": None if not fr else {
                "nom": fr["nom"],
                "etat": fr["etat"],
                "nbProduitsAutorises": fr["nbProduitsAutorises"],
                "nbProduitsRetires": fr["nbProduitsRetires"],
                "dernierRetrait": fr["dernierRetrait"],
            },
            "australie": None if not au else {
                "nom": au["nom"],
                "statut": au["statut"],
                "nbProduitsAgricoles": au["nbProduitsAgricoles"],
                "matiereActiveApprouvee": au["matiereActiveApprouvee"],
            },
        })

    # ── Journal des premières apparitions ───────────────────────────────────
    aujourd_hui = date.today().isoformat()
    vu = json.loads(VU.read_text(encoding="utf-8")) if VU.exists() else None
    premier_releve = vu is None
    connues = dict(vu["premiereVue"]) if vu else {}
    nouvelles = []
    for c in candidates:
        if c["nomPt"] not in connues:
            connues[c["nomPt"]] = aujourd_hui
            if not premier_releve:
                nouvelles.append(c["nomPt"])
        c["premiereVue"] = connues[c["nomPt"]]
        c["nouvelle"] = c["nomPt"] in nouvelles

    VU.write_text(
        json.dumps({
            "commentaire": (
                "Date de première apparition de chaque candidate. Fichier tenu par "
                "scripts/sentinelle.py ; l'historique git est le journal des nouveautés."
            ),
            "dernierReleve": aujourd_hui,
            "premiereVue": dict(sorted(connues.items())),
        }, ensure_ascii=False, indent=1),
        encoding="utf-8",
    )

    nb_fr = sum(1 for c in candidates if c["france"])
    nb_au = sum(1 for c in candidates if c["australie"])
    payload = {
        "meta": {
            "source": "AGROFIT (Brésil) × index ONSSA × E-Phy (Anses) × PUBCRIS (Australie)",
            "genere": datetime.now().isoformat(timespec="seconds"),
            "dernierReleve": aujourd_hui,
            "premierReleve": premier_releve,
            "nbCandidates": len(candidates),
            "nbEcarteesIndexMaroc": len(ecartees),
            "nbNouvelles": len(nouvelles),
            "nbAvecStatutFrancais": nb_fr,
            "nbAvecStatutAustralien": nb_au,
            "avertissement": (
                "Matières actives homologuées comme produit technique au Brésil et "
                "non appariées à l'index ONSSA. « Absente de l'index » signifie que "
                "la clé chimique n'a rien apparié : une graphie portugaise non "
                "réduite au nom marocain produirait un faux positif, à vérifier "
                "avant tout engagement. Aucun registre ouvert ne publie l'état des "
                "brevets : la présence d'un fabricant autre que l'inventeur est le "
                "seul indice, par les faits, qu'une fabrication générique a lieu. "
                "Ni prix, ni capacité, ni qualité, ni liberté d'exploitation."
            ),
        },
        "candidates": candidates,
    }
    SORTIE.write_text(json.dumps(payload, ensure_ascii=False, indent=1), encoding="utf-8")

    print(f"OK -> {SORTIE}")
    print(f"  {len(ecartees)} écartées : déjà présentes à l'index ONSSA")
    for a, b in sorted(ecartees)[:12]:
        print(f"     - {a[:34]:<36} = {b}")
    print(f"  {len(candidates)} candidates · {nb_fr} avec statut français · "
          f"{nb_au} avec statut australien")
    if premier_releve:
        print("  premier relevé : le journal des apparitions est initialisé, "
              "rien n'est signalé comme nouveau")
    else:
        print(f"  {len(nouvelles)} nouvelle(s) depuis le dernier relevé")
        for n in nouvelles[:20]:
            print(f"     + {n}")


if __name__ == "__main__":
    main()
