"""
LMR de l'Union européenne pour les cultures marocaines -> data/lmr-ue.json

    python scripts/import_lmr_ue.py

Source : EU Pesticides Database, API publique de la DG SANTE
(api.datalake.sante.service.ec.europa.eu/sante/pesticides, v3.0).

POURQUOI. Un produit homologué au Maroc sur tomate peut laisser un résidu
supérieur à la LMR européenne : la tomate est refusée à l'arrivée. Croiser
l'usage marocain (culture × matière active) avec la LMR du marché d'export
est ce qu'un exportateur demande en premier.

CE QUI EST GARDÉ. Pour chaque culture marocaine de la table CULTURES, la
LMR en vigueur et, s'il y en a une, la LMR votée mais pas encore applicable
(avec sa date) — les deux sont publiées par l'API. Seuls les résidus dont le
nom de base correspond à une matière active de l'index marocain (pont ISO,
data/_iso.json) sont conservés.

⚠️ « 0.01* » : l'astérisque marque une LMR fixée à la limite de
quantification — en pratique, pas de tolérance. C'est le signal d'alerte.
⚠️ La définition du résidu européenne peut couvrir plusieurs molécules
(« somme de… ») : elle est conservée telle quelle, jamais résumée.
"""

from __future__ import annotations

import json
import re
import sys
import time
import unicodedata
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _reseau import telecharger  # noqa: E402

RACINE = Path(__file__).resolve().parent.parent
SORTIE = RACINE / "data" / "lmr-ue.json"
ISO = RACINE / "data" / "_iso.json"
API = "https://api.datalake.sante.service.ec.europa.eu/sante/pesticides"

# Culture de l'index ONSSA -> produits de l'annexe I du règlement (CE) 396/2005.
# Table EXPLICITE : une culture absente d'ici n'a pas de LMR affichée.
CULTURES: dict[str, list[str]] = {
    "Tomate": ["0231010"], "Tomate (sous serre)": ["0231010"], "Tomate (pépinière)": ["0231010"],
    "Agrumes": ["0110020", "0110050", "0110030"], "Agrumes: Fruits": ["0110020", "0110050", "0110030"],
    "Agrumes: Clémentinier": ["0110050"],
    "Vigne": ["0151010", "0151020"],
    "Blés": ["0500090"], "Orge": ["0500010"], "Maïs": ["0500030"], "Maïs doux": ["0234000"],
    "Pomme de terre": ["0211000"], "Pommier": ["0130010"], "Poirier": ["0130020"], "Cognassier": ["0130030"],
    "Betterave à sucre": ["0900010"], "Fraisier": ["0152000"], "Poivron": ["0231020"],
    "Melon": ["0233010"], "Pastèque": ["0233030"], "Olivier": ["0161030", "0402010"],
    "Haricot vert": ["0260010"], "Framboisier": ["0153030"], "Myrtillier": ["0154010"],
    "Mûrier (mûre de Ronce)": ["0153010"], "Courgette": ["0232030"], "Concombre": ["0232010"],
    "Oignon": ["0220020"], "Pêcher": ["0140030"], "Nectarinier": ["0140030"], "Abricotier": ["0140010"],
    "Menthe": ["0256080"], "Colza": ["0401060"], "Tournesol": ["0401050"], "Avocatier": ["0163010"],
    "Laitue": ["0251020"], "Figuier de barbarie": ["0162040"], "Chou de Bruxelles": ["0242010"],
    "Carotte": ["0213020"], "Palmier dattier": ["0161010"], "Épinard": ["0252010"],
    "Asperge": ["0270010"], "Aubergine": ["0231030"], "Artichaut": ["0270050"], "Radis": ["0213080"],
    "Bananier": ["0163020"], "Grenadier": ["0163050"], "Kaki": ["0161060"], "Arachide": ["0401020"],
    "Brocoli": ["0241010"], "Chou fleur": ["0241020"], "Chou": ["0242020"], "Canne à sucre": ["0900020"],
}

# Résidus européens dont le nom de base diffère du nom ISO de l'index marocain.
ALIAS = {
    "COPPER COMPOUNDS": ["COPPER HYDROXIDE", "COPPER OXYCHLORIDE", "COPPER SULFATE", "COPPER SULPHATE",
                         "COPPER OXIDE", "CUPROUS OXIDE", "TRIBASIC COPPER SULFATE", "COPPER"],
    "SULFUR": ["SULPHUR", "SULFUR"],
    "FOSETYL-AL": ["FOSETYL-ALUMINIUM", "FOSETYL"],
    "FOSETYL": ["FOSETYL-ALUMINIUM", "FOSETYL"],
    "MANCOZEB": ["MANCOZEB"],
}


# Définition de résidu européenne (début du nom) -> matières de l'index qu'elle couvre.
# La LMR d'un ester ou d'un isomère est fixée sur le résidu « mère » : table explicite.
ALIAS_PREFIXE: list[tuple[str, list[str]]] = [
    ("cypermethrin", ["CYPERMETHRIN", "ALPHA CYPERMETHRIN", "ZETA-CYPERMETHRIN", "BETA-CYPERMETHRIN"]),
    ("lambda-cyhalothrin", ["LAMBDA-CYHALOTHRIN", "GAMMA-CYHALOTHRIN"]),
    ("6-benzyladenine", ["BENZYLADENINE", "6-BENZYLADENINE"]),
    ("chlormequat", ["CHLORMEQUAT PRESENT AS CHLORMEQUAT CHLORIDE", "CHLORMEQUAT"]),
    ("clodinafop", ["CLODINAFOP-PROPARGYL"]),
    ("total copper", ["COPPER PRESENT AS COPPER OXYCHLORIDE", "COPPER PRESENT AS COPPER SULFATE PENTAHYDRATE",
                      "COPPER HYDROXIDE", "COPPER OXYCHLORIDE", "COPPER SULFATE", "COPPER OXIDE"]),
    ("cyanamide", ["CYANAMIDE"]),
    ("methylisothiocyanate", ["DAZOMET", "METAM-SODIUM", "METAM SODIUM", "METAM-POTASSIUM"]),
    ("dichlorprop", ["DICHLORPROP-P"]),
    ("dimethenamid", ["DIMETHENAMID-P"]),
    ("emamectin", ["EMAMECTIN BENZOATE"]),
    ("fenoxaprop-p", ["FENOXAPROP-P-ETHYL"]),
    ("fluazifop-p", ["FLUAZIFOP-P-BUTYL"]),
    ("glyphosate", ["GLYPHOSATE ACID"]),
    ("imazalil", ["IMAZALIL", "IMAZALIL SULFATE"]),
    ("iodosulfuron-methyl", ["IODOSULFURON-METHYL-SODIUM"]),
    ("aluminium silicate", ["KAOLIN, CALCINED"]),
    ("mcpa and mcpb", ["MCPA", "MCPB"]),
    ("metalaxyl and metalaxyl-m", ["METALAXYL", "METALAXYL M"]),
    ("sum of metobromuron", ["METOBROMURON"]),
    ("metolachlor", ["S-METOLACHLOR"]),
    ("picloram", ["PICLORAM"]),
    ("sum of m4 and m6", ["PINOXADEN"]),
    ("prohexadione", ["PROHEXADIONE-CALCIUM"]),
    ("quizalofop", ["PROPAQUIZAFOP", "QUIZALOFOP-P-ETHYL", "QUIZALOFOP-P-TEFURYL"]),
    ("prothioconazole", ["PROTHIOCONAZOLE"]),
    ("pyrethrins", ["PYRETHRIN"]),
    ("spirotetramat", ["SPIROTETRAMAT"]),
    ("fluvalinate", ["TAU-FLUVALINATE"]),
    ("trinexapac", ["TRINEXAPAC-ETHYL"]),
]


def get_tout(url: str) -> list[dict]:
    lignes = []
    while url:
        for essai in range(4):
            try:
                d = json.loads(telecharger(url, timeout=120).decode("utf-8"))
                break
            except Exception as exc:  # noqa: BLE001
                if essai == 3:
                    raise
                print(f"    nouvel essai ({exc})")
                time.sleep(5 * (essai + 1))
        lignes += d.get("value", [])
        url = d.get("nextLink")
    return lignes


def base_residu(nom: str) -> str:
    """« Abamectin (sum of …) (F)(R) » -> « ABAMECTIN »."""
    s = unicodedata.normalize("NFKD", nom).encode("ascii", "ignore").decode()
    s = re.split(r"\s*\(", s, maxsplit=1)[0]
    return re.sub(r"\s+", " ", s).strip().upper()


def date_iso(s: str | None) -> str | None:
    if not s:
        return None
    try:
        return datetime.strptime(s, "%d/%m/%Y").date().isoformat()
    except ValueError:
        return None


def main():
    iso_maroc = set(json.loads(ISO.read_text(encoding="utf-8"))["iso"])
    codes = sorted({c for v in CULTURES.values() for c in v})

    print("produits UE…")
    produits = {p["product_code"]: p for p in get_tout(
        f"{API}/pesticide-residues-products?format=json&language=EN&api-version=v3.0")}
    print(f"  {len(produits)} produits ; {len(codes)} retenus")

    print("résidus (noms anglais)…")
    residus = {r["pesticide_residue_id"]: r["pesticide_residue_name"] for r in get_tout(
        f"{API}/pesticide-residues?format=json&pesticide_residue_lg=EN&api-version=v3.0")}
    print(f"  {len(residus)} définitions de résidu")

    aujourd = date.today().isoformat()
    sortie_residus: dict[str, dict] = {}
    # Chaque produit compte des dizaines de pages (l'historique des LMR est inclus) :
    # huit produits téléchargés en parallèle, le traitement reste séquentiel.
    absents = [c for c in codes if c not in produits]
    for c in absents:
        print(f"  ⚠ produit {c} absent de l'API")
    with ThreadPoolExecutor(max_workers=8) as pool:
        pages = dict(zip(
            [c for c in codes if c in produits],
            pool.map(lambda c: get_tout(
                f"{API}/pesticide-residues-mrls?format=json&product_id={produits[c]['product_id']}&api-version=v3.0"),
                [c for c in codes if c in produits]),
        ))
    for code, lignes in pages.items():
        p = produits[code]
        gardees = 0
        for l in lignes:
            nom_ue = residus.get(l["pesticide_residue_id"])
            if not nom_ue:
                continue
            base = base_residu(nom_ue)
            cibles = [i for i in ALIAS.get(base, [base]) if i in iso_maroc]
            bas = nom_ue.lower()
            for prefixe, isos in ALIAS_PREFIXE:
                if bas.startswith(prefixe):
                    cibles += [i for i in isos if i in iso_maroc and i not in cibles]
            if not cibles:
                continue
            appli = date_iso(l.get("application_date"))
            texte = (l.get("applicability_text") or "").lower()
            futur = appli is not None and appli > aujourd
            if "no longer" in texte:
                continue
            valeur = {
                "v": l.get("mrl_value_only"),
                "lq": l.get("mrl_lod") == "*",
                "date": appli,
                "reglement": l.get("regulation_number"),
            }
            for iso in cibles:
                r = sortie_residus.setdefault(iso, {"residuUE": nom_ue, "lmr": {}})
                case = r["lmr"].setdefault(code, {})
                cle = "futur" if futur else "actuel"
                # Plusieurs lignes possibles (versions de la définition) : garder la plus récente.
                if cle not in case or (appli or "") > (case[cle].get("date") or ""):
                    case[cle] = valeur
            gardees += 1
        print(f"  {code} {p['product_name'][:30]:30} {len(lignes):5} LMR, {gardees} pour l'index marocain", flush=True)

    payload = {
        "meta": {
            "source": "EU Pesticides Database — DG SANTE",
            "url": "https://food.ec.europa.eu/plants/pesticides/eu-pesticides-database_en",
            "genere": aujourd,
            "nbProduits": len(codes),
            "nbResidus": len(sortie_residus),
            "avertissement": (
                "LMR en mg/kg. Une valeur suivie de « LQ » est fixée à la limite de "
                "quantification : aucune tolérance. Vérifier la définition du résidu et la "
                "LMR du pays de destination avant toute exportation."
            ),
        },
        "produits": {c: {"nom": produits[c]["product_name"]} for c in codes if c in produits},
        "cultures": CULTURES,
        "residus": dict(sorted(sortie_residus.items())),
    }
    SORTIE.write_text(json.dumps(payload, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"OK -> {SORTIE} : {len(sortie_residus)} matières actives de l'index avec une LMR UE")


if __name__ == "__main__":
    main()
