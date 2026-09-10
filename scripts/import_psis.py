"""
Import du registre coréen des produits phytosanitaires -> data/coree.json

    python scripts/import_psis.py
    python scripts/import_psis.py --sans-iso   # sans régénérer data/_iso.json
    python scripts/import_psis.py --frais      # ignore le cache et retélécharge

CE QUE CETTE SOURCE APPORTE, ET QU'AUCUNE AUTRE N'APPORTE.

La Corée du Sud est membre de l'OCDE ET un pays de production générique réelle
— la combinaison est rare, la Turquie mise à part. Son registre public donne
trois choses que les autres ne donnent pas ensemble :

    LE NOM COMMUN EN ANGLAIS ISO          « Emamectin benzoate »
    LA SOCIÉTÉ, ET SON RÔLE               제조 fabriqué / 수입 importé
    LA DATE D'HOMOLOGATION                2026-08-06
    QUAND LE GÉNÉRIQUE ARRIVE             l'écart entre la première
                                          homologation et la première d'un
                                          producteur coréen INDÉPENDANT
    L'USAGE, CULTURE PAR RAVAGEUR         29 462 couples, avec dilution,
                                          délai avant récolte et nombre
                                          d'applications

La date est ce qui manquait partout ailleurs. Le catalogue russe est daté de
2022, le registre brésilien ne publie pas de date d'entrée : impossible d'y
voir ce qui vient d'arriver. Ici, chaque homologation porte son jour, et le
fichier est régénéré quotidiennement — on voit donc entrer les molécules, ce
qui donne une veille de nouveautés sur un registre de l'OCDE.

⚠️ « 제조 » VEUT DIRE PRODUIT FABRIQUÉ EN CORÉE, PAS MATIÈRE ACTIVE SYNTHÉTISÉE.
Un formulateur coréen peut parfaitement fabriquer son produit à partir d'un
technique chinois importé. Ce registre nomme le TITULAIRE de l'homologation,
comme l'australien — il ne nomme pas l'usine de synthèse, comme le brésilien.
Ne jamais présenter une société d'ici comme un fabricant de technique.

⚠️ AUCUNE VALEUR RÉGLEMENTAIRE AU MAROC : ni voie me-too, ni étude en moins.
La Corée adhère à l'AMD par son adhésion à l'OCDE, ce qui donne une portée
internationale à ses études BPL — un argument dans un dossier, pas un droit
opposable à l'ONSSA, qui n'y adhère pas.

Source : 농촌진흥청 (Rural Development Administration) — 농약안전정보시스템 (PSIS),
export « 농약제품 목록 ». robots.txt autorise ; seul /psis/search.ps est exclu.
"""

import json
import re
import statistics
import subprocess
import sys
import urllib.request
import warnings
from collections import defaultdict
from datetime import datetime
from pathlib import Path

warnings.filterwarnings("ignore")

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _chimie import cle_chimique, verifier_collisions  # noqa: E402
from _coreen import identifier  # noqa: E402
from _coreen_agro import (  # noqa: E402
    cadence, culture as culture_fr, dilution, methode,
    parasite as parasite_fr, stade,
)

RACINE = Path(__file__).resolve().parent.parent
SORTIE = RACINE / "data" / "coree.json"
# ⚠️ FICHIER À PART. La matrice d'usages pèse 10 Mo : la laisser dans
# data/coree.json obligeait tous les écrans à la charger pour lire trois
# compteurs. Seule la fiche d'une matière active en a besoin.
SORTIE_USAGES = RACINE / "data" / "coree-usages.json"
CACHE = RACINE / "data" / "_cache" / "psis_produits.xlsx"
ISO = RACINE / "data" / "_iso.json"

SOURCE = "농촌진흥청 — 농약안전정보시스템 (PSIS), 농약제품 목록"
URL_PAGE = "https://psis.rda.go.kr/psis/agc/res/agchmRegistStusLst.ps?menuId=PS00263"
URL_XLSX = ("https://psis.rda.go.kr/psis/agc/res/"
            "agchmRegistInfoAllExcelLst.ps?menuId=PS00263")

# Les deux séparateurs de mélange employés par le registre, indifféremment.
#
# ⚠️ LE POINT NE SÉPARE QUE S'IL N'EST PAS SUIVI D'UN ESPACE. Le registre écrit
# les mélanges collés — « Azoxystrobin.Oxathiapiprolin » — mais il écrit aussi
# les noms de micro-organismes avec des abréviations ponctuées :
# « Bacillus thuringiensis subsp. kurstaki IMBL-B9 ». Découper sur tous les
# points cassait ces noms en morceaux, et l'écran annonçait « subsp » comme une
# matière active à saisir.
#
# ⚠️ LE « + » NE SÉPARE PAS ENTRE DEUX CHIFFRES. « Gibberellin A4+7 » désigne
# un mélange d'isomères qui porte un seul nom : découpé, il produisait une
# matière active « 7 » et une association « 7 + Gibberellic acid ».
SEPARATEURS = re.compile(r"(?<![0-9])\+(?![0-9])|\.(?!\s)")

# La seule abréviation que la règle d'espacement ne rattrape pas : « B.T. »
# porte un point non suivi d'espace. Le registre écrit la même bactérie en
# toutes lettres ailleurs — on aligne sur la graphie longue, qui est aussi
# celle des autres registres.
ABREVIATIONS = {"B.T.": "Bacillus thuringiensis"}


def developper(nom: str) -> str:
    for court, long in ABREVIATIONS.items():
        nom = nom.replace(court, long)
    return nom

# Le libellé de rôle, tel qu'il figure au fichier.
FABRIQUE, IMPORTE = "제조", "수입"


def telecharger(frais: bool = False) -> Path:
    # ⚠️ CE REGISTRE EST RÉGÉNÉRÉ CHAQUE JOUR. Se contenter du cache revient à
    # relire l'export d'hier — ce qui vide de son sens la veille des nouveautés
    # qu'il est justement le seul à permettre. En intégration continue le cache
    # n'existe pas ; en local, « --frais » le contourne.
    if not frais and CACHE.exists() and CACHE.stat().st_size > 1_000_000:
        print(f"  cache : {CACHE.name} ({CACHE.stat().st_size:,} octets)")
        return CACHE
    print("  téléchargement de l'export « 농약제품 목록 »…")
    req = urllib.request.Request(URL_XLSX, headers={
        "User-Agent": "Mozilla/5.0 (compatible; Homologa/1.0; veille reglementaire)",
        "Referer": URL_PAGE,
    })
    with urllib.request.urlopen(req, timeout=300) as r:
        data = r.read()
    if len(data) < 1_000_000:
        raise SystemExit(f"Réponse trop courte ({len(data)} octets).")
    CACHE.parent.mkdir(parents=True, exist_ok=True)
    CACHE.write_bytes(data)
    print(f"  {len(data):,} octets")
    return CACHE


def lire(chemin: Path):
    """Lignes du classeur, en dictionnaires.

    ⚠️ L'en-tête est en TROISIÈME ligne : les deux premières portent le titre
    de l'export et une ligne vide. Lire la première comme en-tête donnerait un
    classeur d'une seule colonne.
    """
    import openpyxl
    wb = openpyxl.load_workbook(chemin, data_only=True)
    ws = wb[wb.sheetnames[0]]
    it = ws.iter_rows(values_only=True)
    next(it), next(it)
    head = [str(c or "").strip() for c in next(it)]
    for r in it:
        yield dict(zip(head, r))


def texte(v) -> str:
    return str(v).strip() if v is not None else ""


def jour(v) -> str | None:
    """« 2026-08-06 » ou un datetime -> « 2026-08-06 »."""
    if isinstance(v, datetime):
        return v.date().isoformat()
    s = texte(v)[:10]
    return s if re.fullmatch(r"\d{4}-\d{2}-\d{2}", s) else None


def regenerer_iso():
    print("  génération de data/_iso.json (appariement lib/apvma.ts)…")
    subprocess.run(["npx", "tsx", "scripts/noms_iso.ts"], cwd=RACINE, check=True,
                   shell=(sys.platform == "win32"))


def main():
    args = sys.argv[1:]
    print(f"registre coréen — {SOURCE}")
    if "--sans-iso" not in args:
        regenerer_iso()
    if not ISO.exists():
        raise SystemExit("data/_iso.json absent : lancez « npx tsx scripts/noms_iso.ts ».")
    noms_iso = json.loads(ISO.read_text(encoding="utf-8"))["iso"]

    collisions = verifier_collisions(noms_iso)
    if collisions:
        raise SystemExit(f"Clés chimiques en collision, rapprochement refusé : {collisions}")
    iso_par_cle = {}
    for n in noms_iso:
        iso_par_cle.setdefault(cle_chimique(n), n)

    lignes = list(lire(telecharger(frais="--frais" in args)))
    print(f"  {len(lignes)} lignes d'usage")

    # ── Une homologation, pas un usage ──────────────────────────────────────
    # Le fichier décrit des couples culture × ravageur : le même produit y
    # revient des dizaines de fois. On compte des homologations, sinon
    # l'emamectine benzoate pèserait 18 688 lignes à elle seule.
    produits = {}
    for x in lignes:
        num = texte(x.get("등록번호"))
        if not num:
            continue
        p = produits.get(num)
        if p is None:
            p = produits[num] = {
                "numero": num,
                "role": texte(x.get("구분")),
                "marque": texte(x.get("상표명")),
                "produit": texte(x.get("품목명")),
                "communs": developper(texte(x.get("일반명"))),
                "teneur": texte(x.get("주성분함량")),
                "usage": texte(x.get("용도")),
                "formulation": texte(x.get("제형")),
                "societe": texte(x.get("회사명")),
                "date": jour(x.get("등록일")),
                "nbUsages": 0,
            }
        p["nbUsages"] += 1
    print(f"  {len(produits)} homologations distinctes")

    # ── Matières actives ────────────────────────────────────────────────────
    matieres = defaultdict(lambda: {
        "coreens": set(), "produits": set(), "societes": set(),
        "dates": [], "fabrique": 0, "importe": 0,
    })
    for p in produits.values():
        for brut in SEPARATEURS.split(p["communs"]):
            nom = brut.strip()
            if not nom:
                continue
            m = matieres[nom]
            m["coreens"].add(nom)
            m["produits"].add(p["numero"])
            if p["societe"]:
                m["societes"].add(p["societe"])
            if p["date"]:
                m["dates"].append(p["date"])
            if p["role"] == FABRIQUE:
                m["fabrique"] += 1
            elif p["role"] == IMPORTE:
                m["importe"] += 1

    # ── Sociétés ────────────────────────────────────────────────────────────
    # (placé ici car la fenêtre d'exclusivité ci-dessous a besoin de
    # liste_societes pour construire groupe_de et etiquette_de)
    societes = defaultdict(lambda: {
        "produits": set(), "matieres": set(), "dates": [],
        "fabrique": 0, "importe": 0,
    })
    for p in produits.values():
        if not p["societe"]:
            continue
        s = societes[p["societe"]]
        s["produits"].add(p["numero"])
        for brut in SEPARATEURS.split(p["communs"]):
            if brut.strip():
                s["matieres"].add(brut.strip())
        if p["date"]:
            s["dates"].append(p["date"])
        if p["role"] == FABRIQUE:
            s["fabrique"] += 1
        elif p["role"] == IMPORTE:
            s["importe"] += 1

    liste_societes = []
    for nom, s in societes.items():
        latin, commercial, groupe, formes = identifier(nom)
        iso_connues = sorted({iso_par_cle[cle_chimique(m)] for m in s["matieres"]
                              if cle_chimique(m) in iso_par_cle})
        liste_societes.append({
            "cle": nom,
            "nom": nom,
            "latin": latin,
            "commercial": commercial,
            # Filiale d'un groupe étranger : ce n'est pas une piste coréenne,
            # c'est l'antenne locale d'un fabricant déjà connu par ailleurs.
            "groupe": groupe,
            "formes": formes,
            "nbHomologations": len(s["produits"]),
            "nbFabrique": s["fabrique"],
            "nbImporte": s["importe"],
            "nbMatieres": len(s["matieres"]),
            "matieres": iso_connues,
            "premiere": min(s["dates"]) if s["dates"] else None,
            "derniere": max(s["dates"]) if s["dates"] else None,
        })
    liste_societes.sort(key=lambda s: (-len(s["matieres"]), -s["nbHomologations"], s["nom"]))

    # ── Fenêtre d'exclusivité, observée ─────────────────────────────────────
    #
    # AUCUN REGISTRE NE PUBLIE LES BREVETS. Mais celui-ci date ses homologations
    # et distingue les sociétés coréennes indépendantes des filiales de majors :
    # l'écart entre la PREMIÈRE homologation d'une molécule et la première
    # homologation par un indépendant mesure, par les faits, combien de temps
    # l'inventeur l'a gardée pour lui.
    #
    # Sur les molécules où le basculement a eu lieu, la médiane tourne autour de
    # trois ans — mais le quartile haut, celui des molécules réellement
    # propriétaires, est à neuf ans passés. C'est ce chiffre-là qui sert à dire
    # quand préparer un dossier.
    #
    # ⚠️ CE N'EST PAS UNE DATE D'EXPIRATION DE BREVET. C'est une dynamique de
    # marché coréenne. Elle donne un ordre de grandeur et un signal de calendrier,
    # jamais une date opposable.
    #
    # ⚠️ ET L'ABSENCE DE GÉNÉRIQUE NE PROUVE PAS L'EXCLUSIVITÉ. Personne en Corée
    # n'a peut-être jugé utile de faire la molécule. C'est pourquoi l'application
    # croise avec le registre brésilien, qui dit qui FABRIQUE.
    premieres = defaultdict(dict)
    for p in produits.values():
        if not p["date"] or not p["societe"]:
            continue
        for brut in SEPARATEURS.split(p["communs"]):
            nom = brut.strip()
            if not nom:
                continue
            vue = premieres[nom].get(p["societe"])
            if vue is None or p["date"] < vue:
                premieres[nom][p["societe"]] = p["date"]

    groupe_de = {s["cle"]: s["groupe"] for s in liste_societes}
    etiquette_de = {s["cle"]: (s["commercial"] or s["latin"] or s["cle"]) for s in liste_societes}

    def ecart_ans(a, b):
        return round((int(b[:4]) - int(a[:4])) + (int(b[5:7]) - int(a[5:7])) / 12, 1)

    fenetres, ecarts = [], []
    for nom, socs in premieres.items():
        t0, s0 = min((d, s) for s, d in socs.items())
        indeps = [(d, s) for s, d in socs.items() if not groupe_de.get(s)]
        t1, s1 = min(indeps) if indeps else (None, None)
        # Un écart ne se mesure que si l'inventeur est arrivé le premier : quand
        # un indépendant ouvre le bal, la molécule n'a jamais été verrouillée.
        e = ecart_ans(t0, t1) if t1 and t1 > t0 else None
        if e and e > 0:
            ecarts.append(e)
        fenetres.append({
            "matiere": nom,
            "iso": iso_par_cle.get(cle_chimique(nom)),
            "premiere": t0,
            "premierTitulaire": etiquette_de.get(s0, s0),
            "premierGroupe": groupe_de.get(s0),
            "premierGenerique": t1,
            "premierGeneriqueSociete": etiquette_de.get(s1, s1) if s1 else None,
            "ecartAns": e,
            "nbSocietes": len(socs),
            "nbIndependants": len(indeps),
        })
    fenetres.sort(key=lambda f: f["premiere"])

    ecarts.sort()
    exclusivite = {
        "nbObservations": len(ecarts),
        "mediane": round(statistics.median(ecarts), 1) if ecarts else None,
        "quartileHaut": round(ecarts[3 * len(ecarts) // 4], 1) if ecarts else None,
        "maximum": round(max(ecarts), 1) if ecarts else None,
        "matieres": fenetres,
    }
    verrouillees = sum(1 for f in fenetres if f["nbIndependants"] == 0)
    print(f"  fenêtre d'exclusivité : médiane {exclusivite['mediane']} ans, "
          f"quartile haut {exclusivite['quartileHaut']} ans sur {len(ecarts)} basculements "
          f"· {verrouillees} matières sans producteur indépendant")

    # ── Usages : culture × ravageur ─────────────────────────────────────────
    #
    # 29 462 couples, dix fois le spectre marocain. C'est la seule source de
    # l'outil qui donne, pour une matière active, TOUT ce sur quoi elle est
    # employée ailleurs — donc les usages qu'on pourrait revendiquer ici.
    #
    # ⚠️ LA TRADUCTION PORTE SON NIVEAU DE CONFIANCE, et le coréen reste. Voir
    # scripts/_coreen_agro.py : « exact » quand le terme entier a été lu et
    # traduit à la main, « compose » quand il est reconstruit à partir de
    # morphèmes, « brut » quand il ne l'est pas. Un nom de ravageur faux
    # oriente un traitement : on ne devine pas, on marque.
    usages = defaultdict(lambda: {
        "produits": set(), "dilutions": set(), "doses": set(),
        "delais": set(), "applications": set(), "methodes": set(),
    })
    for x in lignes:
        num = texte(x.get("등록번호"))
        p = produits.get(num)
        if not p:
            continue
        cul = texte(x.get("작물명"))
        cib = texte(x.get("적용병해충"))
        if not cul or not cib:
            continue
        for brut in SEPARATEURS.split(p["communs"]):
            nom = brut.strip()
            if not nom:
                continue
            v = usages[(nom, cul, cib)]
            v["produits"].add(num)
            for champ, col in (("dilutions", "희석배수"), ("doses", "사용량"),
                               ("delais", "안전사용시기"), ("applications", "안전사용횟수"),
                               ("methodes", "사용방법")):
                t = texte(x.get(col))
                if t and t != "-":
                    v[champ].add(t)

    par_matiere = defaultdict(list)
    for (nom, cul, cib), v in usages.items():
        fr_cul, niv_cul = culture_fr(cul)
        fr_cib, niv_cib = parasite_fr(cib)
        par_matiere[nom].append({
            "culture": fr_cul,
            "cultureKo": cul,
            "cultureNiveau": niv_cul,
            "cible": fr_cib,
            "cibleKo": cib,
            "cibleNiveau": niv_cib,
            "nbProduits": len(v["produits"]),
            # Les trois colonnes ci-dessous suivent des motifs réguliers :
            # « 수확7일전 » = 7 jours avant récolte, « 2회 » = 2 applications,
            # « 2000배 » = dilution au 1:2000. Traduites par règle.
            "dilutions": [x for x in (dilution(d)[0] for d in sorted(v["dilutions"])[:4]) if x],
            "doses": sorted(v["doses"])[:4],
            "delais": [x for x in (stade(d)[0] for d in sorted(v["delais"])[:3]) if x],
            "applications": [x for x in (cadence(d)[0] for d in sorted(v["applications"])[:3]) if x],
            "methodes": [x for x in (methode(d)[0] for d in sorted(v["methodes"])[:2]) if x],
        })
    for l in par_matiere.values():
        l.sort(key=lambda u: (-u["nbProduits"], u["culture"], u["cible"]))

    liste_usages = [{
        "matiere": nom,
        "iso": iso_par_cle.get(cle_chimique(nom)),
        "nbUsages": len(l),
        "cultures": sorted({u["culture"] for u in l}),
        "cibles": sorted({u["cible"] for u in l}),
        "usages": l[:120],
    } for nom, l in sorted(par_matiere.items())]
    liste_usages.sort(key=lambda m: -m["nbUsages"])
    nb_traduits = sum(
        1 for l in par_matiere.values() for u in l
        if u["cultureNiveau"] != "brut" and u["cibleNiveau"] != "brut"
    )
    total_u = sum(len(l) for l in par_matiere.values())
    print(f"  {total_u} usages culture x ravageur · {nb_traduits * 100 // max(total_u, 1)} % entièrement traduits")

    # ── Associations ────────────────────────────────────────────────────────
    #
    # Le marché ne se vend pas en molécules mais en mélanges : 1 063 associations
    # distinctes ici, contre 167 à l'index marocain. Et chacune porte sa date,
    # ce qu'aucun autre registre de l'outil ne donne — on voit donc quelles
    # associations sortent, et lesquelles s'installent.
    melanges = defaultdict(lambda: {
        "produits": set(), "societes": set(), "dates": [],
        "fabrique": 0, "importe": 0, "usages": set(),
    })
    for p in produits.values():
        comp = sorted({c.strip() for c in SEPARATEURS.split(p["communs"]) if c.strip()})
        if len(comp) < 2:
            continue
        v = melanges[" + ".join(comp)]
        v["produits"].add(p["numero"])
        if p["societe"]:
            v["societes"].add(p["societe"])
        if p["date"]:
            v["dates"].append(p["date"])
        if p["usage"]:
            v["usages"].add(p["usage"])
        if p["role"] == FABRIQUE:
            v["fabrique"] += 1
        elif p["role"] == IMPORTE:
            v["importe"] += 1

    liste_melanges = [{
        "cle": k,
        "composants": k.split(" + "),
        "nbHomologations": len(v["produits"]),
        "nbSocietes": len(v["societes"]),
        "societes": sorted(v["societes"])[:12],
        "nbFabrique": v["fabrique"],
        "nbImporte": v["importe"],
        "usages": sorted(v["usages"]),
        "premiere": min(v["dates"]) if v["dates"] else None,
        "derniere": max(v["dates"]) if v["dates"] else None,
    } for k, v in melanges.items()]
    liste_melanges.sort(key=lambda m: (-m["nbHomologations"], -m["nbSocietes"], m["cle"]))
    print(f"  {len(liste_melanges)} associations distinctes")

    # ── Index par matière de l'index marocain, et hors index ────────────────
    dans, hors = [], []
    for nom, m in sorted(matieres.items()):
        entree = {
            "nom": nom,
            "iso": iso_par_cle.get(cle_chimique(nom)),
            "nbHomologations": len(m["produits"]),
            "nbFabrique": m["fabrique"],
            "nbImporte": m["importe"],
            "premiere": min(m["dates"]) if m["dates"] else None,
            "derniere": max(m["dates"]) if m["dates"] else None,
            "societes": sorted(m["societes"]),
        }
        (dans if entree["iso"] else hors).append(entree)
    par_iso = defaultdict(lambda: {"noms": set(), "produits": 0, "fabrique": 0,
                                   "importe": 0, "dates": [], "societes": set()})
    for e in dans:
        v = par_iso[e["iso"]]
        v["noms"].add(e["nom"])
        v["produits"] += e["nbHomologations"]
        v["fabrique"] += e["nbFabrique"]
        v["importe"] += e["nbImporte"]
        for d in (e["premiere"], e["derniere"]):
            if d:
                v["dates"].append(d)
        v["societes"] |= set(e["societes"])
    liste_matieres = [{
        "iso": k,
        "nomsCoreens": sorted(v["noms"]),
        "nbHomologations": v["produits"],
        "nbFabrique": v["fabrique"],
        "nbImporte": v["importe"],
        "premiere": min(v["dates"]) if v["dates"] else None,
        "derniere": max(v["dates"]) if v["dates"] else None,
        "societes": sorted(v["societes"]),
    } for k, v in sorted(par_iso.items())]

    hors.sort(key=lambda e: (e["premiere"] or "", e["nom"]), reverse=True)

    dates = [p["date"] for p in produits.values() if p["date"]]
    payload = {
        "meta": {
            "source": SOURCE,
            "url": URL_PAGE,
            "attribution": f"{SOURCE} — relevé du {datetime.now().date().isoformat()}",
            "genere": datetime.now().isoformat(timespec="seconds"),
            "derniereHomologation": max(dates) if dates else None,
            "nbLignesUsage": len(lignes),
            "nbHomologations": len(produits),
            "nbSocietes": len(liste_societes),
            "nbFiliales": sum(1 for s in liste_societes if s["groupe"]),
            "nbMatieres": len(matieres),
            "nbMatieresIndex": len(liste_matieres),
            "nbNomsIso": len(noms_iso),
            "nbHorsIndex": len(hors),
            "nbMelanges": len(liste_melanges),
            "nbUsages": total_u,
            "exclusiviteMediane": exclusivite["mediane"],
            "exclusiviteQuartileHaut": exclusivite["quartileHaut"],
            "nbVerrouillees": verrouillees,
            "partTraduite": nb_traduits * 100 // max(total_u, 1),
            "nbFabrique": sum(1 for p in produits.values() if p["role"] == FABRIQUE),
            "nbImporte": sum(1 for p in produits.values() if p["role"] == IMPORTE),
            "avertissement": (
                "Registre coréen des produits phytosanitaires. Aucune valeur "
                "réglementaire au Maroc : ni voie me-too, ni étude en moins. "
                "« 제조 » signifie produit fabriqué en Corée, PAS matière active "
                "synthétisée sur place : ce registre nomme le titulaire de "
                "l'homologation, pas l'usine de synthèse. Les raisons sociales "
                "sont romanisées (romanisation révisée) : une poignée pour "
                "chercher, pas une identité contractuelle. Ni prix, ni capacité, "
                "ni qualité."
            ),
        },
        "matieres": liste_matieres,
        "melanges": liste_melanges,
        "exclusivite": exclusivite,
        "horsIndex": hors,
        "societes": liste_societes,
    }
    SORTIE.parent.mkdir(parents=True, exist_ok=True)
    SORTIE.write_text(json.dumps(payload, ensure_ascii=False, indent=1), encoding="utf-8")

    SORTIE_USAGES.write_text(
        json.dumps({
            "meta": {
                "source": SOURCE,
                "attribution": payload["meta"]["attribution"],
                "genere": payload["meta"]["genere"],
                "nbUsages": total_u,
            "exclusiviteMediane": exclusivite["mediane"],
            "exclusiviteQuartileHaut": exclusivite["quartileHaut"],
            "nbVerrouillees": verrouillees,
                "partTraduite": nb_traduits * 100 // max(total_u, 1),
                "avertissement": (
                    "Usages homologués en Corée du Sud, culture par ravageur. Aucune "
                    "valeur réglementaire au Maroc : un usage coréen ne se revendique "
                    "pas devant l'ONSSA, il indique sur quoi la matière active est "
                    "employée ailleurs. Cultures et ravageurs traduits par glossaire "
                    "(scripts/_coreen_agro.py) ; chaque terme porte son niveau — exact, "
                    "composé ou brut — et le nom coréen d'origine, qui seul fait foi."
                ),
            },
            "matieres": liste_usages,
        }, ensure_ascii=False, indent=1),
        encoding="utf-8",
    )

    print(f"OK -> {SORTIE}")
    print(f"  {len(liste_matieres)}/{len(noms_iso)} matières actives de l'index retrouvées")
    print(f"  {len(liste_societes)} sociétés dont {payload['meta']['nbFiliales']} filiales de groupes étrangers")
    print(f"  {len(hors)} matières hors index marocain · dernière homologation "
          f"{payload['meta']['derniereHomologation']}\n")
    print("  sociétés les plus polyvalentes :")
    for s in liste_societes[:12]:
        etiquette = s["commercial"] or s["latin"] or s["nom"]
        print(f"    {len(s['matieres']):>3} M.A. de l'index  {s['nbHomologations']:>4} hom.  "
              f"{'filiale ' + s['groupe'] if s['groupe'] else 'coréenne':<26} {etiquette}")


if __name__ == "__main__":
    main()
