"""
Import du registre brésilien des produits techniques -> data/bresil.json

    python scripts/import_agrofit.py
    python scripts/import_agrofit.py --sans-iso   # sans régénérer data/_iso.json

POURQUOI CETTE SOURCE EST LA MEILLEURE DE TOUTES.

Aucun autre registre ouvert ne dit ce que celui-ci dit. Le Brésil homologue
SÉPARÉMENT le produit technique, et publie pour chacun :

    la matière active, son groupe chimique et SA TENEUR      973 g/kg
    le titulaire brésilien de l'homologation
    LE FABRICANT, AVEC SON SITE ET SON PAYS                  Meghmani Organics
                                                             Ltd. - Unit II -
                                                             Panoli <ÍNDIA>

C'est exactement ce qu'on cherchait sans le trouver : une liste d'usines de
synthèse, nommées, situées, rattachées à une matière active précise, et vérifiée
par un régulateur qui exige un dossier complet. 338 lignes indiennes couvrant 77
usines, 2 554 lignes chinoises — là où le registre national indien reste fermé.

⚠️ POURQUOI PAS AGROFIT DIRECTEMENT. L'application `agrofit.agricultura.gov.br`
refuse les requêtes automatisées (403). Le même contenu est publié en données
ouvertes par le ministère : c'est ce fichier-là qu'on lit, et il est officiel.

⚠️ CE QUE CE FICHIER NE DIT PAS.
Aucune valeur réglementaire au Maroc : une homologation brésilienne n'ouvre pas
la voie me-too et ne remplace aucune étude de l'Annexe 3-B. « FABRICANTE »
désigne le fabricant du technique déclaré au dossier brésilien — c'est un fait
déclaré à un régulateur, pas un audit d'usine. Ni prix, ni capacité, ni qualité.

Source : Ministério da Agricultura e Pecuária — Sistema de Agrotóxicos
Fitossanitários (AGROFIT), portail de données ouvertes.
"""

import csv
import json
import re
import subprocess
import sys
from collections import defaultdict
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _chimie import cle_chimique, verifier_collisions  # noqa: E402

RACINE = Path(__file__).resolve().parent.parent
SORTIE = RACINE / "data" / "bresil.json"
CACHE = RACINE / "data" / "_cache" / "agrofit_tecnicos.csv"
ISO = RACINE / "data" / "_iso.json"

SOURCE = "Ministério da Agricultura e Pecuária — AGROFIT, produits techniques"
URL_JEU = ("https://dados.agricultura.gov.br/dataset/"
           "sistema-de-agrotoxicos-fitossanitarios-agrofit")
URL_CSV = ("https://dados.agricultura.gov.br/dataset/"
           "6c913699-e82e-4da3-a0a1-fb6c431e367f/resource/"
           "a200c70b-e025-4a9a-be1b-ec7275d7921f/download/agrofitprodutostecnicos.csv")

# « (Meghmani Organics Ltd. - Unit II - Panoli<ÍNDIA>FABRICANTE) »
ENTREPRISE = re.compile(r"\(([^<()]+)<([^>]*)>([^)]*)\)")

PAYS = {
    "CHINA, REPUBLICA POPULAR": "Chine", "ÍNDIA": "Inde", "BRASIL": "Brésil",
    "ESTADOS UNIDOS": "États-Unis", "ALEMANHA": "Allemagne", "JAPÃO": "Japon",
    "ISRAEL": "Israël", "SUÍCA": "Suisse", "TAIWAN (ILHA FORMOSA)": "Taïwan",
    "CORÉIA (DO SUL), REPÚBLICA DA": "Corée du Sud", "REINO UNIDO": "Royaume-Uni",
    "INGLATERRA": "Royaume-Uni", "FRANÇA": "France", "ITÁLIA": "Italie",
    "DINAMARCA": "Danemark", "MÉXICO": "Mexique", "ARGENTINA": "Argentine",
    "PARAGUAI": "Paraguay", "BÉLGICA": "Belgique", "FINLÂNDIA": "Finlande",
    "ESPANHA": "Espagne", "ÁUSTRIA": "Autriche", "AUSTRÁLIA": "Australie",
    "COLÔMBIA": "Colombie", "MALÁSIA": "Malaisie", "PORTO RICO": "Porto Rico",
    "BULGÁRIA, REPÚBLICA DA": "Bulgarie", "PAÍSES BAIXOS, HOLANDA": "Pays-Bas",
    "PERU": "Pérou", "CANADÁ": "Canada", "HUNGRIA, REPUBLICA DA": "Hongrie",
    "GUATEMALA": "Guatemala", "CHILE": "Chili", "ÁFRICA DO SUL": "Afrique du Sud",
}

# Traductions que la réduction phonétique ne peut pas produire : le portugais
# traduit certains noms au lieu de les translittérer. Chacune a été lue au
# fichier.
ALIAS_MATIERES = {
    "SULPHUR": "enxofre",
    "COPPER PRESENT AS COPPER OXYCHLORIDE": "oxicloreto de cobre",
    "COPPER PRESENT AS COPPER SULFATE PENTAHYDRATE": "sulfato de cobre",
    "PHOSPHINE": "fosfeto de alumínio",
    "PYRETHRIN": "piretrinas",
    "PARAFFIN OIL": "óleo mineral",
}


def teneur(txt: str):
    """« 973 g/kg » -> (973.0, « g/kg »). Le technique se compare à sa teneur."""
    m = re.match(r"\s*([\d.,]+)\s*(.*)$", txt or "")
    if not m:
        return None, (txt or None)
    try:
        return float(m.group(1).replace(",", ".")), m.group(2).strip() or None
    except ValueError:
        return None, txt


def champs(valeur: str):
    """Nom de la matière, groupe chimique, teneur — lus de DROITE À GAUCHE.

    ⚠️ Les parenthèses s'imbriquent : « amitraz (bis(arilformamidina))
    (970 g/kg) ». Une expression régulière naïve sur « (...)(...) » manquait
    cinquante-neuf lignes. On dépile donc les groupes par la fin.
    """
    v = (valeur or "").strip()
    piles = []
    while v.endswith(")"):
        profondeur = 0
        for i in range(len(v) - 1, -1, -1):
            if v[i] == ")":
                profondeur += 1
            elif v[i] == "(":
                profondeur -= 1
                if profondeur == 0:
                    piles.append(v[i + 1:-1])
                    v = v[:i].strip()
                    break
        else:
            break
    piles.reverse()
    groupe = piles[0] if len(piles) >= 2 else None
    conc = piles[-1] if piles else None
    return v.strip(), groupe, conc


def site(nom: str):
    """(société, site) — « UPL Limited - Jhagadia » nomme l'usine après le tiret.

    Le découpage est indicatif : plusieurs raisons sociales contiennent
    elles-mêmes un tiret. Le libellé complet reste conservé.
    """
    parts = [p.strip() for p in nom.split(" - ") if p.strip()]
    if len(parts) >= 2:
        return parts[0], " - ".join(parts[1:])
    return nom.strip(), None


def telecharger() -> str:
    import urllib.request
    if CACHE.exists() and CACHE.stat().st_size > 100_000:
        print(f"  cache : {CACHE.name} ({CACHE.stat().st_size:,} octets)")
        return CACHE.read_text(encoding="utf-8-sig")
    print(f"  téléchargement — {URL_CSV.rsplit('/', 1)[-1]}")
    req = urllib.request.Request(URL_CSV, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=240) as r:
        data = r.read()
    if len(data) < 100_000:
        raise SystemExit(f"Réponse trop courte ({len(data)} octets).")
    CACHE.parent.mkdir(parents=True, exist_ok=True)
    CACHE.write_bytes(data)
    return data.decode("utf-8-sig")


def regenerer_iso():
    print("  génération de data/_iso.json (appariement lib/apvma.ts)…")
    subprocess.run(["npx", "tsx", "scripts/noms_iso.ts"], cwd=RACINE, check=True,
                   shell=(sys.platform == "win32"))


def main():
    args = sys.argv[1:]
    print(f"registre brésilien — {SOURCE}")
    if "--sans-iso" not in args:
        regenerer_iso()
    if not ISO.exists():
        raise SystemExit("data/_iso.json absent : lancez « npx tsx scripts/noms_iso.ts ».")
    noms_iso = json.loads(ISO.read_text(encoding="utf-8"))["iso"]

    collisions = verifier_collisions(noms_iso)
    if collisions:
        raise SystemExit(f"Clés chimiques en collision, rapprochement refusé : {collisions}")

    texte = telecharger()
    lignes = list(csv.DictReader(texte.splitlines(), delimiter=";"))
    print(f"  {len(lignes)} homologations de produit technique")

    homologations = []
    par_nom_pt = {}
    for x in lignes:
        nom_ma, groupe, conc = champs(x.get("INGREDIENTE_ATIVO(GRUPO_QUIMICI)(CONCENTRACAO)"))
        valeur, unite = teneur(conc)
        fabricants = []
        for brut, pays_pt, role in ENTREPRISE.findall(x.get("EMPRESA_<PAIS>_TIPO") or ""):
            societe, lieu = site(brut.strip())
            fabricants.append({
                "nom": societe,
                "libelle": brut.strip(),
                "site": lieu,
                "paysBrut": pays_pt.strip(),
                "pays": PAYS.get(pays_pt.strip()),
                "role": role.strip() or None,
            })
        if nom_ma:
            par_nom_pt.setdefault(cle_chimique(nom_ma), nom_ma)
        homologations.append({
            "numero": (x.get("NUMERO_REGISTRO") or "").strip() or None,
            "produit": (x.get("PRODUTO_TECNICO_MARCA_COMERCIAL") or "").strip() or None,
            "matierePt": nom_ma or None,
            "groupeChimique": groupe,
            "teneur": valeur,
            "teneurUnite": unite,
            "classe": (x.get("CLASSE") or "").strip() or None,
            "titulaire": (x.get("TITULAR_REGISTRO") or "").strip() or None,
            "fabricants": fabricants,
        })

    # ── Pont portugais -> ISO ───────────────────────────────────────────────
    iso_par_cle = {}
    for n in noms_iso:
        alias = ALIAS_MATIERES.get(n)
        k = cle_chimique(alias) if alias else cle_chimique(n)
        if k in par_nom_pt:
            iso_par_cle[k] = n
    for h in homologations:
        h["iso"] = iso_par_cle.get(cle_chimique(h["matierePt"] or ""))
    couvertes = {h["iso"] for h in homologations if h["iso"]}
    print(f"  {len(couvertes)}/{len(noms_iso)} matières actives de l'index retrouvées")

    # ── Usines ──────────────────────────────────────────────────────────────
    # Une usine se compte par (société, pays) : le même groupe déclare souvent
    # plusieurs sites, et les confondre ferait disparaître des implantations.
    usines = defaultdict(lambda: {
        "nom": None, "pays": None, "paysBrut": None, "sites": set(),
        "iso": set(), "matieresPt": set(), "numeros": set(), "titulaires": set(),
    })
    for h in homologations:
        for f in h["fabricants"]:
            if not f["nom"]:
                continue
            u = usines[(f["nom"].upper(), f["paysBrut"])]
            u["nom"] = u["nom"] or f["nom"]
            u["pays"] = u["pays"] or f["pays"]
            u["paysBrut"] = u["paysBrut"] or f["paysBrut"]
            if f["site"]:
                u["sites"].add(f["site"])
            if h["iso"]:
                u["iso"].add(h["iso"])
            if h["matierePt"]:
                u["matieresPt"].add(h["matierePt"])
            if h["numero"]:
                u["numeros"].add(h["numero"])
            if h["titulaire"]:
                u["titulaires"].add(h["titulaire"])

    liste_usines = [{
        "id": f"{k[0]}|{k[1]}",
        "nom": u["nom"],
        "pays": u["pays"],
        "paysBrut": u["paysBrut"],
        "sites": sorted(u["sites"]),
        "matieres": sorted(u["iso"]),
        "matieresPt": sorted(u["matieresPt"])[:40],
        "nbHomologations": len(u["numeros"]),
        "titulaires": sorted(u["titulaires"])[:10],
    } for k, u in usines.items()]
    liste_usines.sort(key=lambda u: (-len(u["matieres"]), -u["nbHomologations"], u["nom"] or ""))

    # ── Index par matière active ────────────────────────────────────────────
    par_ma = defaultdict(lambda: {"pt": set(), "usines": [], "numeros": set(), "teneurs": []})
    for h in homologations:
        if not h["iso"]:
            continue
        m = par_ma[h["iso"]]
        if h["matierePt"]:
            m["pt"].add(h["matierePt"])
        if h["numero"]:
            m["numeros"].add(h["numero"])
        if h["teneur"]:
            m["teneurs"].append(h["teneur"])
        for f in h["fabricants"]:
            if f["nom"]:
                m["usines"].append(f"{f['nom'].upper()}|{f['paysBrut']}")
    par_id = {u["id"]: u for u in liste_usines}
    matieres = [{
        "iso": n,
        "nomsPt": sorted(v["pt"]),
        "nbHomologations": len(v["numeros"]),
        # La teneur la plus haute homologuée : c'est celle qu'on vise au cahier
        # des charges, et ce registre la publie — aucun autre ne le fait.
        "teneurMax": max(v["teneurs"]) if v["teneurs"] else None,
        "usines": sorted({u for u in v["usines"] if u in par_id}),
    } for n, v in sorted(par_ma.items())]

    # ── Matières HORS index — le gisement de première homologation ──────────
    #
    # Jusqu'ici on jetait tout ce qui ne correspondait pas à une matière active
    # du portefeuille marocain. C'était jeter le plus intéressant : une matière
    # homologuée au Brésil et absente de l'index marocain est une première
    # homologation possible au Maroc, donc une exclusivité.
    #
    # ⚠️ ON N'ÉMET ICI QUE DES FAITS. Savoir si la molécule est sourçable —
    # c'est-à-dire si quelqu'un d'autre que son inventeur la fabrique — se
    # décide dans lib/sentinelle.ts, sur ces noms de fabricants. La règle n'est
    # écrite qu'une fois, et là où l'écran l'affiche.
    #
    # ⚠️ « Hors index » veut dire « la clé chimique n'a rien apparié ». Une
    # graphie portugaise que la réduction ne ramène pas au nom ISO produirait
    # un faux positif : vérifier l'absence à l'index avant d'agir.
    hors = defaultdict(lambda: {
        "numeros": set(), "titulaires": set(), "fabricants": {},
        "groupes": set(), "teneurs": [],
    })
    for h in homologations:
        if h["iso"] or not h["matierePt"]:
            continue
        v = hors[h["matierePt"]]
        if h["numero"]:
            v["numeros"].add(h["numero"])
        if h["titulaire"]:
            v["titulaires"].add(h["titulaire"])
        if h["groupeChimique"]:
            v["groupes"].add(h["groupeChimique"])
        if h["teneur"]:
            v["teneurs"].append(h["teneur"])
        for f in h["fabricants"]:
            if f["nom"]:
                v["fabricants"][f["nom"]] = f["pays"] or f["paysBrut"]

    liste_hors = [{
        "nomPt": n,
        "groupeChimique": sorted(v["groupes"])[0] if v["groupes"] else None,
        "nbHomologations": len(v["numeros"]),
        "teneurMax": max(v["teneurs"]) if v["teneurs"] else None,
        "titulaires": sorted(v["titulaires"]),
        "fabricants": [{"nom": k, "pays": p} for k, p in sorted(v["fabricants"].items())],
    } for n, v in sorted(hors.items())]
    liste_hors.sort(key=lambda m: (-len(m["fabricants"]), -m["nbHomologations"], m["nomPt"]))
    print(f"  {len(liste_hors)} matières actives hors index marocain")

    par_pays = defaultdict(int)
    for u in liste_usines:
        par_pays[u["pays"] or u["paysBrut"] or "—"] += 1

    payload = {
        "meta": {
            "source": SOURCE,
            "url": URL_JEU,
            "attribution": f"{SOURCE} — relevé du {datetime.now().date().isoformat()}",
            "genere": datetime.now().isoformat(timespec="seconds"),
            "nbHomologations": len(homologations),
            "nbUsines": len(liste_usines),
            "nbMatieres": len(matieres),
            "nbMatieresIndex": len(noms_iso),
            "nbHorsIndex": len(liste_hors),
            "parPays": sorted(par_pays.items(), key=lambda kv: -kv[1]),
            "avertissement": (
                "Registre brésilien des produits techniques. Aucune valeur "
                "réglementaire au Maroc : ni voie me-too, ni étude en moins. "
                "« FABRICANTE » est le fabricant du technique déclaré au "
                "dossier brésilien — un fait déclaré à un régulateur, pas un "
                "audit d'usine. Ni prix, ni capacité, ni qualité."
            ),
        },
        "matieres": matieres,
        "horsIndex": liste_hors,
        "usines": liste_usines,
    }

    SORTIE.parent.mkdir(parents=True, exist_ok=True)
    SORTIE.write_text(json.dumps(payload, ensure_ascii=False, indent=1), encoding="utf-8")

    print(f"OK -> {SORTIE}")
    print(f"  {len(liste_usines)} usines · {len(matieres)} matières actives de l'index\n")
    print("  usines les plus polyvalentes :")
    for u in liste_usines[:12]:
        print(f"    {len(u['matieres']):>3} M.A.  {(u['pays'] or u['paysBrut'] or '?')[:12]:<12} "
              f"{(u['nom'] or '')[:46]}")


if __name__ == "__main__":
    main()
