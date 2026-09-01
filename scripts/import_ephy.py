"""
Import du catalogue E-Phy de l'Anses -> data/ephy.json

    python scripts/import_ephy.py            # télécharge la dernière version
    python scripts/import_ephy.py chemin.zip # utilise une archive déjà obtenue

Pourquoi cette source : l'ONSSA s'aligne sur l'ANSES. Le statut français d'une
matière active anticipe son statut marocain — c'est le signal le plus prédictif
dont dispose Homologa, davantage que le statut UE qui est en amont et plus lent.

Deux niveaux de lecture, conservés séparément parce qu'ils ne disent pas la
même chose :

  • substance_active.« Etat d'autorisation » — inscription au règlement.
    NON_INSCRITE = la substance ne peut plus être autorisée en France.
  • produits.« Etat d'autorisation » — réalité commerciale. Une substance peut
    rester inscrite alors que plus aucun produit n'est autorisé (retrait
    commercial), et inversement des produits peuvent être en écoulement de
    stock après une non-inscription.

Le statut retenu par l'application croise les deux (voir lib/ephy.ts).

Source : Données E-Phy - Anses, https://www.data.gouv.fr/datasets/donnees-
ouvertes-du-catalogue-e-phy-des-produits-phytopharmaceutiques-matieres-
fertilisantes-et-supports-de-culture-adjuvants-produits-mixtes-et-melanges
Licence Ouverte. Toute réutilisation doit citer « Données E-Phy - Anses » et la
date de mise à jour des données.
"""

import csv
import io
import json
import re
import sys
import unicodedata
import urllib.request
import zipfile
from collections import defaultdict
from datetime import datetime
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent
SORTIE = RACINE / "data" / "ephy.json"

API_DATASET = (
    "https://www.data.gouv.fr/api/1/datasets/donnees-ouvertes-du-catalogue-e-phy-"
    "des-produits-phytopharmaceutiques-matieres-fertilisantes-et-supports-de-"
    "culture-adjuvants-produits-mixtes-et-melanges/"
)

ATTRIBUTION = "Données E-Phy - Anses"


def slug(s):
    s = unicodedata.normalize("NFKD", str(s or ""))
    s = "".join(c for c in s if not unicodedata.combining(c))
    return re.sub(r"[^a-zA-Z0-9]+", "-", s).strip("-").lower()[:70]


def parse_date(s):
    s = (s or "").strip()
    if not s:
        return None
    for f in ("%d/%m/%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(s, f).date().isoformat()
        except ValueError:
            pass
    return None


def resoudre_url():
    """Trouve l'archive CSV UTF-8 la plus récente publiée sur data.gouv.fr."""
    with urllib.request.urlopen(API_DATASET, timeout=60) as r:
        d = json.load(r)
    for res in d.get("resources", []):
        titre = (res.get("title") or "").lower()
        if "csv" in titre and "utf8" in titre and titre.endswith(".zip"):
            return res["url"], (res.get("last_modified") or d.get("last_modified") or "")[:10]
    raise SystemExit("Archive CSV UTF-8 introuvable dans le jeu de données.")


def charger_archive(argv):
    if len(argv) > 1:
        chemin = Path(argv[1])
        print(f"archive locale : {chemin}")
        zf = zipfile.ZipFile(chemin)
        # Date des données = date du contenu de l'archive, pas de son
        # téléchargement : l'attribution doit citer la mise à jour Anses.
        dates = [datetime(*i.date_time).date().isoformat() for i in zf.infolist() if i.date_time]
        return zf, (max(dates) if dates else None)
    url, maj = resoudre_url()
    print(f"téléchargement : {url}")
    with urllib.request.urlopen(url, timeout=300) as r:
        brut = r.read()
    print(f"  {len(brut) / 1_048_576:.1f} Mo reçus")
    return zipfile.ZipFile(io.BytesIO(brut)), maj


def lire_csv(zf, motif):
    noms = [n for n in zf.namelist() if motif in n and n.endswith(".csv")]
    if not noms:
        raise SystemExit(f"Fichier « {motif} » absent de l'archive.")
    with zf.open(noms[0]) as fh:
        texte = io.TextIOWrapper(fh, encoding="utf-8", newline="")
        return list(csv.DictReader(texte, delimiter=";"))


# « diméthoate (Dimethoate) 400.0 g/L » -> ("diméthoate", "Dimethoate")
RE_SUBSTANCE = re.compile(r"^(.*?)\s*\(([^)]+)\)")


def substances_du_produit(champ):
    out = []
    for bloc in (champ or "").split("|"):
        m = RE_SUBSTANCE.match(bloc.strip())
        if m:
            out.append((m.group(1).strip(), m.group(2).strip()))
    return out


def main():
    zf, maj = charger_archive(sys.argv)

    subs = lire_csv(zf, "substance_active")
    prods = lire_csv(zf, "produits_utf8")
    print(f"  {len(subs)} substances, {len(prods)} produits")

    # ── Agrégation produits par substance ───────────────────────────────────
    # Restreint aux produits phytopharmaceutiques (PPP) : les matières
    # fertilisantes et adjuvants ne relèvent pas du même régime.
    autorises = defaultdict(int)
    retires = defaultdict(int)
    dernier_retrait = {}
    noms_fr = defaultdict(set)

    for p in prods:
        if p.get("type produit") != "PPP":
            continue
        etat = p.get("Etat d’autorisation")
        d = parse_date(p.get("Date de retrait du produit"))
        for fr, iso in substances_du_produit(p.get("Substances actives")):
            cle = slug(iso)
            if not cle:
                continue
            noms_fr[cle].add(fr)
            if etat == "AUTORISE":
                autorises[cle] += 1
            elif etat == "RETIRE":
                retires[cle] += 1
                if d and (cle not in dernier_retrait or d > dernier_retrait[cle]):
                    dernier_retrait[cle] = d

    # ── Substances ──────────────────────────────────────────────────────────
    sortie = []
    vus = set()
    for s in subs:
        nom = (s.get("Nom substance active") or "").strip()
        if not nom:
            continue
        cle = slug(nom)
        if cle in vus:
            continue
        vus.add(cle)

        variantes = [
            v.strip()
            for v in (s.get("Variant") or "").split("|")
            if v.strip()
        ]
        # Les noms français relevés sur les produits élargissent l'appariement
        # avec l'index ONSSA, qui est en français.
        variantes += sorted(noms_fr.get(cle, set()))

        sortie.append({
            "id": cle,
            "nom": nom,
            "cas": (s.get("Numero CAS") or "").strip() or None,
            "etat": (s.get("Etat d’autorisation") or "").strip() or None,
            "variantes": sorted({v for v in variantes if v}),
            "nbProduitsAutorises": autorises.get(cle, 0),
            "nbProduitsRetires": retires.get(cle, 0),
            "dernierRetrait": dernier_retrait.get(cle),
        })

    sortie.sort(key=lambda x: x["nom"])

    payload = {
        "meta": {
            "source": ATTRIBUTION,
            "url": "https://www.data.gouv.fr/datasets/donnees-ouvertes-du-catalogue-e-phy-des-produits-phytopharmaceutiques-matieres-fertilisantes-et-supports-de-culture-adjuvants-produits-mixtes-et-melanges",
            "licence": "Licence Ouverte / Open Licence",
            "attribution": f"{ATTRIBUTION} — mise à jour du {maj or 'date inconnue'}",
            "majDonnees": maj,
            "genere": datetime.now().isoformat(timespec="seconds"),
            "nbSubstances": len(sortie),
            "nbProduitsPPP": sum(1 for p in prods if p.get("type produit") == "PPP"),
            "avertissement": (
                "Statut français. L'ONSSA s'alignant sur l'ANSES, il anticipe le "
                "statut marocain — il ne s'y substitue pas."
            ),
        },
        "substances": sortie,
    }

    SORTIE.parent.mkdir(parents=True, exist_ok=True)
    SORTIE.write_text(json.dumps(payload, ensure_ascii=False, indent=1), encoding="utf-8")

    ni = sum(1 for s in sortie if s["etat"] == "NON_INSCRITE")
    ins = sum(1 for s in sortie if s["etat"] == "INSCRITE")
    orphelines = sum(1 for s in sortie if not s["nbProduitsAutorises"] and not s["nbProduitsRetires"])
    print(f"\nOK -> {SORTIE}")
    print(f"  {len(sortie)} substances : {ins} inscrites, {ni} non inscrites")
    print(f"  {orphelines} sans produit PPP rattaché")
    print(f"  données Anses du {maj or '?'}")


if __name__ == "__main__":
    main()
