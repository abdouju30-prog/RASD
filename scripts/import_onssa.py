"""
Import de l'index phytosanitaire ONSSA + portefeuille PHYTO BEHT.

Source : « FICHIERS PHYTO.xlsx » (feuille Feuil2 = index ONSSA complet).
Sortie : data/onssa.json — consommé par lib/data.ts.

    python scripts/import_onssa.py "C:/Users/.../FICHIERS PHYTO.xlsx"

Le script n'invente rien : tout champ absent de la source reste null.
Le pays du fournisseur est *inféré* par mots-clés et porte un drapeau
`paysInfere` — à valider avant usage commercial.
"""

import json
import re
import sys
import unicodedata
from collections import Counter, defaultdict
from datetime import date, datetime
from pathlib import Path

import openpyxl

# Détenteur mis en avant par défaut au premier chargement. L'outil couvre
# désormais TOUS les détenteurs de l'index : celui-ci n'est qu'un point
# d'entrée, changeable à l'écran.
DETENTEUR_DEFAUT = "PHYTO BEHT"

# --- Pays fournisseur : inférence en deux passes ----------------------------
# Passe 1 : mots-clés propres à une société (indice fiable).
# Passe 2 : suffixe juridique générique (indice faible -> paysFiable=false).
# Les pays de « sourcing économique » sont marqués coutFaible.

# Pays où le sourcing générique est compétitif (cible de prospection).
PAYS_COUT_FAIBLE = {
    "Inde", "Chine", "Russie", "Mexique", "Colombie", "Turquie", "Brésil",
    "Taïwan", "Jordanie", "Chili", "Argentine", "Singapour",
}

# Passe 1 — sociétés identifiées. Le Japon passe AVANT la Chine : plusieurs
# sociétés japonaises portent un suffixe « Co., Ltd » qui, seul, évoque la Chine.
REGLES_PAYS = [
    ("Japon", [
        "MITSUI", "OAT AGRIO", "NIPPON SODA", "KUMIAI", "SUMITOMO CHEMICAL CO",
        "ISHIHARA SANGYO", "AGRO KANESHO", "KANESHO", "NIHON NOHYAKU", "NICHINO",
        "SUMI AGRO", "HOKKO", "SDS BIOTECH",
    ]),
    ("Inde", [
        "SHARDA", "SHYAM", "GHARDA", "MEGHMANI", "RALLIS", "KRISHI", "UPL LIMITED",
        "INSECTICIDES (INDIA)", "COROMANDEL", "HERANBA", "TAGROS", "BHARAT",
        "NAGARJUNA", "PI INDUSTRIES", "DHANUKA", "WILLOWOOD", "BEST AGROLIFE",
        "AIMCO", "SULPHUR MILLS", "INDOFIL", "GSP CROP", "ATUL", "PARIJAT",
        "CRYSTAL CROP", "EXCEL INDUSTRIES", "SUMMIT AGRO INDIA", "KILPEST",
        "DEVIDAYAL", "NACL INDUSTRIES", "SUMITOMO CHEMICAL INDIA", "PARIKH",
        "CROPNOSYS INDIA", "AGRICH CROP", "INDIA LIMITED", "INDIA PRIVATE",
        "INDIA PESTICIDE", "INDIA PESTICIDES",
    ]),
    ("Chine", [
        "NANJING", "SHANDONG", "NINGBO", "JIANGSU", "ZHEJIANG", "HEBEI", "ANHUI",
        "SHANGHAI", "BEIJING", "SICHUAN", "HUBEI", "HUNAN", "JIANGXI", "GUANGDONG",
        "PILARQUIM", "ROTAM", "NGC AGROSCIENCES", "RAINBOW", "LIMIN", "BINNONG",
        "SINOCHEM", "HAILIR", "KINGQUENSON", "WYNCA", "YONGNONG", "XINGFA",
        "LIER CHEMICAL", "HUIFENG", "WEIFANG", "NUTRICHEM", "E-TONG CHEMICAL",
        "CAC NANTONG", "SUNJOY", "AGROPHARM CHINA",
    ]),
    ("Russie", ["AUGUST", "AVGUST", "SHCHELKOVO", "JOINT STOCK COMPANY", "JSC "]),
    ("Mexique", ["ALBAUGH MEXICO", "VELSIMEX", "TEKCHEM", "AGRICULTURA NACIONAL", "DRAGON"]),
    ("Colombie", ["BEQUISA", "BERNARDO QUIMICA", "INVESA", "COLJAP", "AGROSAVIA"]),
    ("Turquie", ["TARKIM", "HEKTAS", "SAFA TARIM", "AGROBEST", "DOKTOR TARSA"]),
    ("Brésil", ["OURO FINO", "ADAMA BRASIL", "NORTOX", "IHARABRAS"]),
    ("Taïwan", ["SINON", "TAIWAN"]),
    ("Jordanie", ["VAPCO"]),
    ("Chili", ["QUIMETAL"]),
    ("Singapour", ["PTE., LTD", "PTE. LTD", "PTE LTD"]),
    ("Espagne", [
        "INDUSTRIAS QUIMICAS DEL VALLES", "IQV", "SEIPASA", "LAINCO", "SIPCAM INAGRA",
        "INDUSTRIAL QUIMICA KEY", "IQK", "FUTURECO", "PROBELTE", "MASSO", "AFRASA",
        "KENOGARD", "TRADECORP", "SARABIA", "ORSANI", "ALMANDINE", "QEMETICA",
        "INGENIERIA INDUSTRIAL", "VIVAGRO", "PALLARES", "TRIS HISPANIA",
        "ADAMA AGRICULTURE ESPANA", "PROTEKTING", "AGROFINA", "CEV, SA",
    ]),
    ("Allemagne", [
        "BAYER AG", "BAYER CROPSCIENCE", "BASF SE", "BASF AGRICULTURAL", "COSACO",
        "NISSO CHEMICAL EUROPE", "DVA AGRO", "ALZCHEM", "EVONIK", "SAN AGROW",
        "AGROSTULIN", "CHEMINOVA DEUTSCHLAND",
    ]),
    ("Suisse", ["SYNGENTA CROP PROTECTION AG", "CORTEVA AGRISCIENCE INTERNATIONAL",
                "FMC IP TECHNOLOGY", "ANDERMATT BIOCONTROL"]),
    ("France", ["NUFARM SAS", "SUMITOMO CHEMICALS AGRO EUROPE", "DE SANGOSSE",
                "ACTION PIN", "AGRAUXINE", "TOTALENERGIES", "AGROFRESH HOLDING FRANCE",
                "ENVIRONMENTAL SCIENCE FR"]),
    ("Italie", ["CBC EUROPE", "MANICA", "SIPCAM ITALIA", "ISAGRO", "FINCHIMICA",
                "ICA INTERNATIONAL CHEMICALS", "DIACHEM", "TRIS INTERNATIONAL"]),
    ("Belgique", ["GLOBACHEM", "CERTIS BELCHIM", "BELCHIM", "TAMINCO", "BIOBEST",
                  "JANSSEN PHARMACEUTICA", "ARYSTA LIFESCIENCE BENELUX",
                  "FMC CHEMICAL SPRL", "EUROBROM", "MEBROM"]),
    ("Pays-Bas", ["AAKO", "BASF AGRO BV", "CERADIS", "ADAMA CELSIUS"]),
    ("Portugal", ["ASCENZA"]),
    ("Irlande", ["BARCLAY CHEMICALS"]),
    ("Danemark", ["CHEMINOVA", "FMC AGRICULTURE SOLUTION AS"]),
    ("Royaume-Uni", ["AGRICHEM UK", "FINE AGROCHEMICAL", "INTERFARM"]),
    ("États-Unis", ["CERTIS USA", "ALBAUGH LLC", "AMVAC", "GOWAN CROP", "VALENT",
                    "BRANDT CONSOLIDATED", "MARRONE BIO", "JH BIOTECH", "AGROFRESH FRUIT"]),
    ("Slovénie", ["ALBAUGH TKI"]),
    ("Tchéquie", ["BIOPREPARATY"]),
    ("Bulgarie", ["AGRIA SA"]),
    ("Maroc", ["CPCM", "COMPTOIR COMMERCIAL DES LUBRIFIANTS"]),
]

# Passe 2 — suffixes juridiques seuls. Indice faible : paysFiable=false.
SUFFIXES = [
    ("Inde", ["PVT LTD", "PRIVATE LIMITED"]),
    ("Chine", ["CO.,LTD", "CO., LTD", "CO. LTD", "CO.; LTD"]),
    ("Allemagne", ["GMBH"]),
    ("France", [" SAS", " SARL"]),
    ("Italie", [" SRL", " S.P.A", " SPA"]),
    ("Belgique", [" N.V", " NV", " SPRL"]),
    ("Pays-Bas", [" B.V", " BV"]),
    ("Espagne", [" S.L", " SL"]),
]

MULTINATIONALES = ["SYNGENTA", "BAYER", "BASF", "CORTEVA", "FMC ", "UPL LIMITED",
                   "SUMITOMO", "NUFARM", "ADAMA", "MITSUI"]


def pays_fournisseur(nom):
    """Infère le pays d'un fournisseur. Retourne (pays|None, fiable: bool)."""
    if not nom:
        return None, False
    u = nom.upper()
    for pays, motifs in REGLES_PAYS:
        if any(m in u for m in motifs):
            return pays, True
    for pays, motifs in SUFFIXES:
        if any(m in u for m in motifs):
            return pays, False
    return None, False


def est_multinationale(nom):
    u = (nom or "").upper()
    return any(m in u for m in MULTINATIONALES)


# --- Normalisation ---------------------------------------------------------
def slug(s):
    if not s:
        return ""
    s = unicodedata.normalize("NFKD", str(s))
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = re.sub(r"[^a-zA-Z0-9]+", "-", s).strip("-").lower()
    return s[:70]


def molecule_base(ma):
    """« Abamectine(1,8%) » -> « Abamectine ». Garde le nom complet par ailleurs."""
    if not ma:
        return ""
    return re.split(r"[(\[]", str(ma))[0].strip(" -")


def parse_date(v):
    if v is None or v == "":
        return None
    if isinstance(v, datetime):
        return v.date().isoformat()
    if isinstance(v, date):
        return v.isoformat()
    s = str(v).strip()
    for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y"):
        try:
            return datetime.strptime(s, fmt).date().isoformat()
        except ValueError:
            pass
    # certaines cellules sont des séries Excel
    if s.isdigit():
        try:
            return (date(1899, 12, 30) + __import__("datetime").timedelta(days=int(s))).isoformat()
        except Exception:
            return None
    return None


def txt(v):
    if v is None:
        return None
    s = str(v).strip()
    return s or None


def main():
    src = Path(sys.argv[1] if len(sys.argv) > 1
               else r"C:\Users\DellVostro\Desktop\FICHIERS PHYTO.xlsx")
    out = Path(__file__).resolve().parent.parent / "data" / "onssa.json"

    wb = openpyxl.load_workbook(src, data_only=True, read_only=True)
    ws = wb["Feuil2"]
    rows = [r for r in ws.iter_rows(min_row=2, values_only=True) if r and r[0]]

    # colonnes : 0 Détenteur 1 Produit 2 Fournisseur 3 AMM 4 Valable jusqu'au
    # 5 Tox 6 Catégorie 7 Formulation 8 M.A. 9 Teneur 10 Usage 11 Dose
    # 12 Culture 13 DAR 14 Nbr application  ... 39 Cible extraite
    lignes = []
    for r in rows:
        lignes.append({
            "detenteur": txt(r[0]), "produit": txt(r[1]), "fournisseur": txt(r[2]),
            "amm": txt(r[3]), "expiration": parse_date(r[4]), "tox": txt(r[5]),
            "categorie": txt(r[6]), "formulation": txt(r[7]), "ma": txt(r[8]),
            "teneur": txt(r[9]), "usage": txt(r[10]), "dose": txt(r[11]),
            "culture": txt(r[12]), "dar": txt(r[13]), "nbAppl": txt(r[14]),
            "cible": txt(r[39]) if len(r) > 39 else None,
        })

    # ---------- Fournisseurs ----------
    fourn_ma = defaultdict(set)
    fourn_n = defaultdict(int)
    for l in lignes:
        if l["fournisseur"]:
            fourn_n[l["fournisseur"]] += 1
            if l["ma"]:
                fourn_ma[l["fournisseur"]].add(l["ma"])

    fournisseurs = []
    for nom, n in sorted(fourn_n.items(), key=lambda kv: -kv[1]):
        pays, certain = pays_fournisseur(nom)
        fournisseurs.append({
            "id": slug(nom), "nom": nom, "pays": pays, "paysInfere": True,
            "paysFiable": certain,
            "coutFaible": pays in PAYS_COUT_FAIBLE if pays else False,
            "multinationale": est_multinationale(nom),
            "nbLignesMaroc": n, "nbMatieresActives": len(fourn_ma[nom]),
        })

    # ---------- Agrégats par matière active ----------
    # Clé = slug, PAS le libellé brut : l'index contient des variantes
    # d'orthographe de la même substance (« Cyperméthrine » / « Cypermethrine »,
    # « Fosétyl » / « Fosetyl »). Les agréger séparément dédoublerait les
    # matières actives et fausserait le décompte des détenteurs.
    ma_agg = defaultdict(lambda: {
        "categories": set(), "detenteurs": set(), "fournisseurs": set(),
        "usages": set(), "cultures": set(), "cibles": set(), "amm": set(),
        "produits": set(), "doses": set(), "libelles": Counter(),
    })
    for l in lignes:
        if not l["ma"]:
            continue
        a = ma_agg[slug(l["ma"])]
        a["libelles"][l["ma"]] += 1
        if l["categorie"]:
            a["categories"].add(l["categorie"])
        if l["detenteur"]:
            a["detenteurs"].add(l["detenteur"])
        if l["fournisseur"]:
            a["fournisseurs"].add(l["fournisseur"])
        if l["usage"]:
            a["usages"].add(l["usage"])
        if l["culture"]:
            a["cultures"].add(l["culture"])
        if l["cible"]:
            a["cibles"].add(l["cible"])
        if l["amm"]:
            a["amm"].add(l["amm"])
        if l["produit"]:
            a["produits"].add(l["produit"])
        if l["usage"] and l["dose"]:
            a["doses"].add(f"{l['usage']} :: {l['dose']} :: {l['dar'] or '-'}")

    matieres = []
    for cle, a in ma_agg.items():
        # Libellé retenu : la variante la plus fréquente à l'index.
        nom = a["libelles"].most_common(1)[0][0]
        matieres.append({
            "id": cle, "nom": nom, "molecule": molecule_base(nom),
            "categorie": sorted(a["categories"])[0] if a["categories"] else None,
            "detenteurs": sorted(a["detenteurs"]),
            "fournisseurs": sorted(a["fournisseurs"]),
            "usages": sorted(a["usages"]),
            "cultures": sorted(a["cultures"]),
            "cibles": sorted(a["cibles"]),
            "produits": sorted(a["produits"]),
            "nbHomologations": len(a["amm"]),
            "referentielDoses": sorted(a["doses"])[:60],
        })
    matieres.sort(key=lambda m: m["nom"])

    # ---------- Portefeuilles de TOUS les détenteurs ----------
    # L'outil couvrait un seul détenteur ; il couvre maintenant les 76 de
    # l'index. Cela sert deux choses : le vendre à n'importe lequel d'entre
    # eux, et lire l'exposition d'un concurrent — une AMM qui expire en face
    # est un signal commercial.
    pf = defaultdict(lambda: {
        "detenteur": None,
        "fournisseurs": set(), "ma": set(), "usages": [],
        "amm": None, "expiration": None, "tox": None,
        "categorie": None, "formulation": None,
    })
    for l in lignes:
        if not l["detenteur"] or not l["produit"]:
            continue
        # Un même nom commercial peut exister chez deux détenteurs : la clé
        # doit donc porter les deux, sinon les portefeuilles fusionnent.
        p = pf[(l["detenteur"], l["produit"])]
        p["detenteur"] = l["detenteur"]
        if l["fournisseur"]:
            p["fournisseurs"].add(l["fournisseur"])
        if l["ma"]:
            p["ma"].add(l["ma"])
        p["amm"] = p["amm"] or l["amm"]
        p["expiration"] = p["expiration"] or l["expiration"]
        p["tox"] = p["tox"] or l["tox"]
        p["categorie"] = p["categorie"] or l["categorie"]
        p["formulation"] = p["formulation"] or l["formulation"]
        p["usages"].append({
            "usage": l["usage"], "culture": l["culture"], "cible": l["cible"],
            "dose": l["dose"], "dar": l["dar"], "nbAppl": l["nbAppl"],
        })

    produits = []
    for (det, nom), p in pf.items():
        produits.append({
            "id": slug(f"{det}--{nom}"),
            "detenteur": det,
            "detenteurId": slug(det),
            "nomCommercial": nom,
            "categorie": p["categorie"], "formulation": p["formulation"],
            "tox": p["tox"], "amm": p["amm"], "expiration": p["expiration"],
            "matieresActives": sorted(p["ma"]),
            "matieresActivesIds": [slug(m) for m in sorted(p["ma"])],
            "fournisseurs": sorted(p["fournisseurs"]),
            "usages": p["usages"],
        })
    produits.sort(key=lambda x: (x["detenteur"], x["nomCommercial"]))

    # ---------- Détenteurs ----------
    det_agg = defaultdict(lambda: {"produits": 0, "usages": 0, "ma": set(), "categories": set()})
    for pr in produits:
        d = det_agg[pr["detenteur"]]
        d["produits"] += 1
        d["usages"] += len(pr["usages"])
        d["ma"].update(pr["matieresActives"])
        if pr["categorie"]:
            d["categories"].add(pr["categorie"])

    detenteurs = [
        {
            "id": slug(nom),
            "nom": nom,
            "nbProduits": a["produits"],
            "nbUsages": a["usages"],
            "nbMatieresActives": len(a["ma"]),
            "categories": sorted(a["categories"]),
        }
        for nom, a in det_agg.items()
    ]
    detenteurs.sort(key=lambda d: -d["nbProduits"])

    payload = {
        "meta": {
            "source": src.name,
            "genere": datetime.now().isoformat(timespec="seconds"),
            "detenteurDefaut": DETENTEUR_DEFAUT,
            "nbDetenteursCouverts": len(detenteurs),
            "nbLignesIndex": len(lignes),
            "nbProduitsIndex": len({l["produit"] for l in lignes if l["produit"]}),
            "nbDetenteurs": len({l["detenteur"] for l in lignes if l["detenteur"]}),
            "avertissement": (
                "Index ONSSA importé tel quel. Le pays des fournisseurs est inféré "
                "par mots-clés (paysInfere=true) et doit être vérifié avant tout "
                "engagement commercial. Aucun prix ne figure dans la source."
            ),
        },
        "fournisseurs": fournisseurs,
        "matieres": matieres,
        "detenteurs": detenteurs,
        "portefeuille": produits,
    }

    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(payload, ensure_ascii=False, indent=1), encoding="utf-8")

    ko = [f for f in fournisseurs if not f["pays"]]
    print(f"OK -> {out}")
    print(f"  index      : {len(lignes)} lignes / {payload['meta']['nbProduitsIndex']} produits "
          f"/ {payload['meta']['nbDetenteurs']} détenteurs")
    print(f"  matieres   : {len(matieres)}")
    print(f"  fournisseurs: {len(fournisseurs)} ({len(ko)} sans pays inféré)")
    print(f"  detenteurs : {len(detenteurs)} · {len(produits)} produits au total")
    for d in detenteurs[:5]:
        print(f"     {d['nbProduits']:4} produits  {d['nom']}")


if __name__ == "__main__":
    main()
