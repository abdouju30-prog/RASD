"""
Import du registre des établissements producteurs de l'EPA -> data/epa.json

    python scripts/import_epa.py

POURQUOI CETTE SOURCE — et en quoi elle diffère des deux autres.

L'APVMA et l'ICAMA nomment des sociétés qui DÉTIENNENT une homologation.
Celle-ci nomme des USINES. Pour qu'un pesticide entre aux États-Unis, le site
qui le produit doit être enregistré auprès de l'EPA et reçoit un numéro
d'établissement, porté sur l'étiquette de chaque bidon. Le registre publie donc
la liste des sites de production, avec leur adresse physique et leur pays.

C'est le seul moyen trouvé de répondre à « quelles usines existent en Inde, en
Turquie, au Brésil ? » sans dépendre du registre de chacun de ces pays — dont
la plupart sont fermés ou ne publient pas le titulaire.

⚠️ CE QU'ELLE NE DIT PAS, ET C'EST MAJEUR.
**Aucune matière active.** Le registre dit qui produit et où, jamais quoi. Il ne
peut donc pas répondre « qui fabrique l'abamectine en Inde » — seulement « voici
les usines indiennes enregistrées à l'EPA ». C'est un annuaire, pas un
appariement. L'apport se fait autrement : en rapprochant ces usines des
fournisseurs déjà connus, un titulaire devient un producteur avéré, avec un
site localisé.

⚠️ Aucune valeur réglementaire au Maroc, comme les autres registres étrangers :
ni voie me-too, ni étude en moins. Et un enregistrement d'établissement n'est
pas un audit — l'EPA le dit elle-même, il identifie un lieu de production, il
n'atteste d'aucune conformité.

Accès : l'EPA sert ce tableau par une application Qlik Sense. Les URL ne
rendent que la coquille HTML ; les données passent par l'API moteur en
WebSocket. Le proxy virtuel « /public » est anonyme (mustAuthenticate=false),
contrairement à la racine « / » qui exige une authentification Windows.

Source : US EPA — National List of Active EPA-Registered Foreign and Domestic
Pesticide and/or Device-Producing Establishments. Domaine public.
"""

import json
import ssl
import sys
import time
from collections import Counter
from datetime import datetime
from pathlib import Path

import websocket

RACINE = Path(__file__).resolve().parent.parent
SORTIE = RACINE / "data" / "epa.json"

HOTE = "awsedap.epa.gov"
APP = "90b69309-b1ce-43b0-a1d2-e515419a07c4"
OBJET = "PpXvTJp"
PAGE = "https://www.epa.gov/compliance/national-list-active-epa-registered-foreign-and-domestic-pesticide-andor-device"
ATTRIBUTION = "US EPA — National List of Active Pesticide-Producing Establishments"

# Colonnes retenues sur les 29 du tableau. Les adresses postales et les
# adresses du siège sont écartées : elles n'aident pas à qualifier un site.
COL = {
    "numero": 0,
    "etablissement": 1,
    "adresse": 2,
    "ville": 4,
    "region": 5,
    "pays": 8,
    "societe": 16,
}

# Code ISO3 -> nom français. Limité aux pays qui apparaissent réellement au
# registre pour l'usage qui nous occupe ; les autres restent sous leur code,
# ce qui est préférable à une traduction inventée.
PAYS = {
    "USA": "États-Unis", "IND": "Inde", "CHN": "Chine", "TUR": "Turquie",
    "BRA": "Brésil", "MEX": "Mexique", "COL": "Colombie", "RUS": "Russie",
    "ARG": "Argentine", "CHL": "Chili", "TWN": "Taïwan", "SGP": "Singapour",
    "JOR": "Jordanie", "JPN": "Japon", "KOR": "Corée du Sud", "DEU": "Allemagne",
    "FRA": "France", "ESP": "Espagne", "ITA": "Italie", "GBR": "Royaume-Uni",
    "NLD": "Pays-Bas", "BEL": "Belgique", "CHE": "Suisse", "AUT": "Autriche",
    "DNK": "Danemark", "SWE": "Suède", "IRL": "Irlande", "PRT": "Portugal",
    "POL": "Pologne", "CZE": "Tchéquie", "HUN": "Hongrie", "GRC": "Grèce",
    "ISR": "Israël", "IDN": "Indonésie", "MYS": "Malaisie", "THA": "Thaïlande",
    "VNM": "Viêt Nam", "PHL": "Philippines", "AUS": "Australie",
    "NZL": "Nouvelle-Zélande", "CAN": "Canada", "ZAF": "Afrique du Sud",
    "EGY": "Égypte", "MAR": "Maroc", "TUN": "Tunisie", "PER": "Pérou",
    "ECU": "Équateur", "CRI": "Costa Rica", "GTM": "Guatemala", "URY": "Uruguay",
    "HKG": "Hong Kong", "PAK": "Pakistan", "LKA": "Sri Lanka", "BGD": "Bangladesh",
    "UKR": "Ukraine", "BGR": "Bulgarie", "ROU": "Roumanie", "SRB": "Serbie",
    "HRV": "Croatie", "SVN": "Slovénie", "SVK": "Slovaquie", "FIN": "Finlande",
    "NOR": "Norvège", "LTU": "Lituanie", "LVA": "Lettonie", "EST": "Estonie",
    "LUX": "Luxembourg", "SAU": "Arabie saoudite", "ARE": "Émirats arabes unis",
}

# Pays où le sourcing générique est compétitif. Même liste que scripts/_pays.py,
# exprimée en codes ISO3 puisque c'est ce que publie l'EPA.
SOURCING = {"IND", "CHN", "TUR", "BRA", "MEX", "COL", "RUS", "ARG", "CHL",
            "TWN", "SGP", "JOR", "IDN", "MYS", "THA", "VNM", "PAK"}


class Moteur:
    """Client minimal de l'API moteur Qlik, en JSON-RPC sur WebSocket."""

    def __init__(self):
        self.ws = websocket.create_connection(
            f"wss://{HOTE}/public/app/{APP}",
            timeout=90,
            origin=f"https://{HOTE}",
            header=["User-Agent: Homologa/1.0 (veille reglementaire)"],
            sslopt={"cert_reqs": ssl.CERT_REQUIRED},
        )
        self.seq = 0
        accueil = json.loads(self.ws.recv())
        if accueil.get("params", {}).get("mustAuthenticate"):
            raise SystemExit(
                "Le moteur exige une authentification : le proxy anonyme « /public » "
                "a peut-être changé de nom."
            )

    def appel(self, handle, methode, params=None):
        self.seq += 1
        self.ws.send(json.dumps({"jsonrpc": "2.0", "id": self.seq, "handle": handle,
                                 "method": methode, "params": params or {}}))
        while True:
            m = json.loads(self.ws.recv())
            if m.get("id") == self.seq:
                if "error" in m:
                    raise RuntimeError(f"{methode} : {m['error']}")
                return m["result"]

    def fermer(self):
        try:
            self.ws.close()
        except Exception:
            pass


def main():
    print(f"connexion au moteur Qlik de l'EPA — {HOTE}")
    m = Moteur()
    try:
        hDoc = m.appel(-1, "OpenDoc", {"qDocName": APP})["qReturn"]["qHandle"]
        hObj = m.appel(hDoc, "GetObject", {"qId": OBJET})["qReturn"]["qHandle"]
        hc = m.appel(hObj, "GetLayout")["qLayout"]["qHyperCube"]
        total, largeur = hc["qSize"]["qcy"], hc["qSize"]["qcx"]
        print(f"  {total} établissements, {largeur} colonnes")

        # Le moteur plafonne une page de données à ~10 000 cellules.
        hauteur = max(1, 10_000 // largeur)
        lignes = []
        haut = 0
        while haut < total:
            page = m.appel(hObj, "GetHyperCubeData", {
                "qPath": "/qHyperCubeDef",
                "qPages": [{"qTop": haut, "qLeft": 0,
                            "qWidth": largeur, "qHeight": hauteur}],
            })["qDataPages"][0]["qMatrix"]
            if not page:
                break
            for l in page:
                v = [(c.get("qText") or "").strip() for c in l]
                lignes.append(v)
            haut += len(page)
            print(f"    {haut}/{total}", end="\r")
            time.sleep(0.2)
        print(" " * 30, end="\r")
    finally:
        m.fermer()

    def vide(x):
        # Le registre remplit les cellules absentes par un tiret ou un libellé
        # technique : les laisser passerait pour une donnée.
        return not x or x in {"-", "(UNKNOWN DATA ELEMENT)", "N/A"}

    etabs = []
    for v in lignes:
        code = v[COL["pays"]].upper()
        if vide(code):
            continue
        etabs.append({
            "numero": v[COL["numero"]],
            "etablissement": v[COL["etablissement"]] or None,
            "adresse": None if vide(v[COL["adresse"]]) else v[COL["adresse"]],
            "ville": None if vide(v[COL["ville"]]) else v[COL["ville"]],
            "region": None if vide(v[COL["region"]]) else v[COL["region"]],
            "codePays": code,
            "pays": PAYS.get(code, code),
            "paysConnu": code in PAYS,
            "societe": v[COL["societe"]] or None,
            "sourcing": code in SOURCING,
        })

    etrangers = [e for e in etabs if e["codePays"] != "USA"]
    cibles = [e for e in etabs if e["sourcing"]]
    parPays = Counter(e["pays"] for e in etrangers)

    payload = {
        "meta": {
            "source": ATTRIBUTION,
            "url": PAGE,
            "licence": "Domaine public (œuvre du gouvernement des États-Unis)",
            "attribution": f"{ATTRIBUTION} — relevé du {datetime.now().date().isoformat()}",
            "genere": datetime.now().isoformat(timespec="seconds"),
            "nbTotal": len(etabs),
            "nbEtrangers": len(etrangers),
            "nbSourcing": len(cibles),
            "nbPays": len(parPays),
            "avertissement": (
                "Liste des sites de production enregistrés auprès de l'EPA pour "
                "produire des pesticides destinés au marché américain. Elle dit "
                "QUI produit et OÙ, jamais QUOI : aucune matière active n'y "
                "figure. Aucune valeur réglementaire au Maroc, et un "
                "enregistrement d'établissement n'atteste d'aucune conformité — "
                "l'EPA précise qu'il identifie un lieu de production, rien de plus."
            ),
        },
        "parPays": [{"pays": p, "n": n} for p, n in parPays.most_common()],
        # Seuls les établissements hors États-Unis sont conservés : le marché
        # américain n'est pas une source de sourcing générique, et garder les
        # 16 000 sites domestiques tripleraient le fichier sans rien apporter.
        "etablissements": sorted(etrangers, key=lambda e: (e["pays"], e["etablissement"] or "")),
    }

    SORTIE.parent.mkdir(parents=True, exist_ok=True)
    SORTIE.write_text(json.dumps(payload, ensure_ascii=False, indent=1), encoding="utf-8")

    print(f"OK -> {SORTIE}")
    print(f"  {len(etabs)} établissements, dont {len(etrangers)} hors États-Unis")
    print(f"  {len(cibles)} en pays de sourcing générique, {len(parPays)} pays représentés\n")
    for p, n in parPays.most_common(14):
        print(f"    {n:5}  {p}")


if __name__ == "__main__":
    main()
