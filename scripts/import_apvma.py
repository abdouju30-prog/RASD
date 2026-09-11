"""
Import du registre PUBCRIS de l'APVMA (Australie) -> data/apvma.json

    python scripts/import_apvma.py            # télécharge la dernière archive
    python scripts/import_apvma.py chemin.zip # utilise une archive déjà obtenue

POURQUOI CETTE SOURCE — et ce qu'elle n'est PAS.

L'APVMA ne gouverne pas l'ONSSA : contrairement à l'ANSES, son avis n'annonce
rien du statut marocain. Elle sert à autre chose, qui manque à l'outil :
**recouper une décision européenne hors du référentiel européen.**

L'Australie est un régulateur exigeant, hors UE, sur un climat et des cultures
plus proches du Maroc que ceux de l'Europe du Nord. Confronter les deux donne
un signal de convergence :

  • retirée en France ET plus aucun produit en Australie
    -> le retrait est consensuel, la molécule est finie. Substituer.

  • retirée en France MAIS toujours autorisée en Australie
    -> le motif est peut-être propre au contexte européen (pression sociétale,
       protection des nappes en climat tempéré humide). C'est un argument
       recevable pour défendre un maintien devant l'ONSSA — à instruire, pas
       à invoquer tel quel.

Le fichier produit ne contient donc AUCUN score : il fournit un statut
australien brut, que lib/apvma.ts confronte au statut français.

Source : APVMA PUBCRIS, publié sur data.gov.au sous licence Creative Commons
Attribution 3.0 Australia. Mise à jour hebdomadaire. Toute réutilisation doit
citer « APVMA PUBCRIS ».
"""

import csv
import io
import json
import re
import sys
import unicodedata
import zipfile

from collections import Counter, defaultdict
from datetime import date, datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _reseau import telecharger  # noqa: E402
from _pays import (  # noqa: E402
    PAYS_COUT_FAIBLE,
    est_filiale_australienne,
    est_multinationale,
    pays_societe,
)

RACINE = Path(__file__).resolve().parent.parent
SORTIE = RACINE / "data" / "apvma.json"

URL_ZIP = (
    "https://data.gov.au/data/dataset/0de37904-43e0-4814-b21b-5b64fafefe6f/"
    "resource/ee2301fd-71a6-4716-95c2-916d253e6462/download/pubcris.zip"
)
PAGE = (
    "https://data.gov.au/data/dataset/apvma-pubcris-dataset-for-registered-"
    "agricultural-and-veterinary-chemical-products-and-approved-acti"
)
ATTRIBUTION = "APVMA PUBCRIS"

# Types de produits agricoles. Les vétérinaires (VM, VP) sont écartés : une
# substance autorisée en médecine vétérinaire ne dit rien de son usage phyto.
PREFIXES_AGRICOLES = ("A",)
TYPE_MATIERE_ACTIVE = "TG"  # constituant actif approuvé, « technical grade »


from _texte import slug  # noqa: E402,F401


def parse_date(s):
    s = (s or "").strip()
    if not s:
        return None
    s = s.split(" ")[0]
    for f in ("%d/%m/%Y", "%Y-%m-%d", "%m/%d/%Y"):
        try:
            return datetime.strptime(s, f).date()
        except ValueError:
            pass
    return None


def charger(argv):
    if len(argv) > 1:
        chemin = Path(argv[1])
        print(f"archive locale : {chemin}")
        zf = zipfile.ZipFile(chemin)
        dates = [datetime(*i.date_time).date().isoformat() for i in zf.infolist() if i.date_time]
        return zf, (max(dates) if dates else None)
    print(f"téléchargement : {URL_ZIP}")
    brut = telecharger(URL_ZIP)
    print(f"  {len(brut) / 1_048_576:.1f} Mo reçus")
    zf = zipfile.ZipFile(io.BytesIO(brut))
    dates = [datetime(*i.date_time).date().isoformat() for i in zf.infolist() if i.date_time]
    return zf, (max(dates) if dates else None)


def lire(zf, nom):
    cible = next((n for n in zf.namelist() if n.endswith(nom)), None)
    if not cible:
        raise SystemExit(f"Fichier « {nom} » absent de l'archive.")
    with zf.open(cible) as fh:
        return list(csv.DictReader(io.TextIOWrapper(fh, encoding="utf-8-sig", newline="", errors="replace")))


def main():
    zf, maj = charger(sys.argv)

    constit = lire(zf, "constit.csv")
    produits = lire(zf, "product.csv")
    liens = lire(zf, "prodcon.csv")
    print(f"  {len(constit)} constituants, {len(produits)} produits, {len(liens)} liens")

    auj = date.today()

    # ── Produits : ne garder que l'agricole, et distinguer actif / échu ──────
    info = {}
    for p in produits:
        t = (p.get("prodtype") or "").strip()
        exp = parse_date(p.get("expdate"))
        info[(p.get("pcode") or "").strip()] = {
            "societe": (p.get("sname") or "").strip() or None,
            "type": t,
            "agricole": t.startswith(PREFIXES_AGRICOLES) and t != TYPE_MATIERE_ACTIVE,
            "matiereActive": t == TYPE_MATIERE_ACTIVE,
            "enregistre": (p.get("regcode") or "").strip() in ("R", "A"),
            "expiration": exp,
            "actif": exp is None or exp >= auj,
        }

    # ── Rattachement constituant -> produits ────────────────────────────────
    # Les sociétés détentrices australiennes sont le vrai apport du registre
    # pour la prospection : un fabricant indien ou chinois qui détient des
    # homologations en Australie a passé un régulateur exigeant. C'est une
    # piste de fournisseur que l'index ONSSA seul ne donne pas.
    societes_par_code = defaultdict(Counter)
    agri_actifs = defaultdict(int)
    agri_echus = defaultdict(int)
    ma_approuvee = defaultdict(int)
    derniere_exp = {}

    for l in liens:
        if (l.get("ctype") or "").strip() != "A":  # constituant actif seulement
            continue
        cc = (l.get("ccode") or "").strip()
        pi = info.get((l.get("pcode") or "").strip())
        if not cc or not pi or not pi["enregistre"]:
            continue
        if pi["matiereActive"]:
            if pi["actif"]:
                ma_approuvee[cc] += 1
            continue
        if not pi["agricole"]:
            continue
        if pi["actif"]:
            agri_actifs[cc] += 1
            if pi["societe"]:
                societes_par_code[cc][pi["societe"]] += 1
        else:
            agri_echus[cc] += 1
            e = pi["expiration"]
            if e and (cc not in derniere_exp or e > derniere_exp[cc]):
                derniere_exp[cc] = e

    # ── Constituants actifs ─────────────────────────────────────────────────
    # Le critère est le rôle joué dans les formulations (prodcon.ctype = 'A'),
    # PAS le champ constit.clevel1 : celui-ci porte la famille chimique
    # (Pyrethroids, Carbamates, UNGROUPED…), et le filtrer sur « ACTIVE » ne
    # retenait que 33 lignes sur 2 663.
    codes_actifs = {
        (l.get("ccode") or "").strip()
        for l in liens
        if (l.get("ctype") or "").strip() == "A"
    }

    # Constituants dont tous les produits sont vétérinaires : leur absence de
    # l'agriculture australienne n'a aucune valeur de signal phytosanitaire.
    types_par_code = defaultdict(set)
    for l in liens:
        if (l.get("ctype") or "").strip() != "A":
            continue
        pi = info.get((l.get("pcode") or "").strip())
        if pi:
            types_par_code[(l.get("ccode") or "").strip()].add(pi["type"])
    codes_veterinaires = {
        cc for cc, ts in types_par_code.items()
        if ts and not any(t.startswith(PREFIXES_AGRICOLES) and t != TYPE_MATIERE_ACTIVE for t in ts)
        and any(t.startswith("V") for t in ts)
    }

    def societes(cc):
        """Sociétés détenant une homologation agricole australienne active.

        Aucun plafond : sur les molécules à gros marché, les premières places
        vont aux distributeurs australiens, et tronquer la liste ferait
        disparaître précisément les fabricants génériques qu'on cherche.
        """
        out = []
        for nom, n in societes_par_code.get(cc, Counter()).most_common():
            pays, fiable = pays_societe(nom)
            out.append({
                "nom": nom,
                "pays": pays,
                "paysFiable": fiable,
                "coutFaible": bool(pays and pays in PAYS_COUT_FAIBLE),
                "multinationale": est_multinationale(nom),
                # « SHARDA AUSTRALIA PTY LTD » : entité australienne, groupe
                # indien. C'est le groupe qu'on source, mais le dire évite de
                # présenter une filiale locale comme la maison mère.
                "filialeLocale": est_filiale_australienne(nom),
                "nbProduits": n,
            })
        return out

    sortie = []
    vus = set()
    for c in constit:
        cc = (c.get("ccode") or "").strip()
        if cc not in codes_actifs:
            continue
        nom = (c.get("cname") or "").strip()
        if not nom or not cc:
            continue
        cle = slug(nom)
        if cle in vus:
            continue
        vus.add(cle)

        actifs = agri_actifs.get(cc, 0)
        echus = agri_echus.get(cc, 0)
        appro = ma_approuvee.get(cc, 0)
        vet = cc in codes_veterinaires

        # ⚠️ SÉMANTIQUE — à ne pas sur-interpréter.
        # PUBCRIS est un registre de ce qui EST enregistré, pas un historique :
        # 36 produits seulement portent une date d'expiration passée sur 18 658.
        # L'absence d'une molécule ne signifie donc PAS qu'elle a été retirée :
        # elle peut n'avoir jamais été homologuée en Australie. Seul le statut
        # « autorisée » est une information solide.
        if actifs > 0:
            statut = "autorisée"
        elif vet:
            statut = "vétérinaire seulement"
        else:
            statut = "absente"

        sortie.append({
            "id": cle,
            "code": cc,
            "nom": nom,
            "famille": (c.get("clevel1") or "").strip() or None,
            "statut": statut,
            "nbProduitsAgricoles": actifs,
            "nbProduitsEchus": echus,
            "matiereActiveApprouvee": appro > 0,
            "derniereExpiration": derniere_exp[cc].isoformat() if cc in derniere_exp else None,
            "societes": societes(cc),
        })

    sortie.sort(key=lambda x: x["nom"])

    payload = {
        "meta": {
            "source": ATTRIBUTION,
            "url": PAGE,
            "licence": "Creative Commons Attribution 3.0 Australia",
            "attribution": f"{ATTRIBUTION} — mise à jour du {maj or 'date inconnue'}",
            "majDonnees": maj,
            "genere": datetime.now().isoformat(timespec="seconds"),
            "nbConstituants": len(sortie),
            "nbProduitsAgricoles": sum(1 for i in info.values() if i["agricole"] and i["enregistre"]),
            "avertissement": (
                "L'APVMA ne gouverne pas l'ONSSA : ce statut sert à recouper une "
                "décision européenne hors du référentiel européen, pas à prédire "
                "une décision marocaine. PUBCRIS ne conserve que l'état courant, "
                "sans historique de retrait : « absente » signifie « aucun produit "
                "agricole enregistré aujourd'hui », ce qui peut vouloir dire "
                "retirée AUSSI BIEN QUE jamais homologuée. Seul « autorisée » est "
                "une information solide."
            ),
        },
        "constituants": sortie,
    }

    SORTIE.parent.mkdir(parents=True, exist_ok=True)
    SORTIE.write_text(json.dumps(payload, ensure_ascii=False, indent=1), encoding="utf-8")

    toutes = Counter()
    for x in sortie:
        for so in x["societes"]:
            toutes[so["nom"]] += 1
    generiques = {so["nom"] for x in sortie for so in x["societes"] if so["coutFaible"]}

    c = Counter(s["statut"] for s in sortie)
    print(f"\nOK -> {SORTIE}")
    print(f"  {len(sortie)} constituants actifs")
    for k, v in c.most_common():
        print(f"    {v:5}  {k}")
    print(f"  {len(toutes)} sociétés détentrices, dont {len(generiques)} en pays de sourcing générique")
    print(f"  données APVMA du {maj or '?'}")


if __name__ == "__main__":
    main()
