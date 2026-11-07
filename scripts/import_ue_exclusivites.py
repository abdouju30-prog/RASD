"""
Substances actives UE — TOUTES, avec leur date d'approbation -> data/ue-exclusivites.json

Usage : python scripts/import_ue_exclusivites.py      (npm run import:exclusivites)

POURQUOI UN SECOND FICHIER UE.
data/substances-ue.json (scripts/import_normes.py) ne garde que les matières
déjà présentes à l'index ONSSA. L'agent de prospection cherche justement ce
qui n'y est PAS : il lui faut la base entière (~1 500 substances) pour voir
les molécules homologuées en UE qu'aucun détenteur marocain ne porte encore.

CE QUE LA DATE D'APPROBATION DIT — ET NE DIT PAS.
Règlement (CE) 1107/2009, art. 59 : les études d'une substance nouvelle sont
protégées 10 ans à compter de la première autorisation dans un État membre.
On ESTIME donc la fin de protection des données à « approbation UE + 10 ans ».
  ⚠️ Pour une substance renouvelée, la date publiée peut être celle du
     renouvellement : l'estimation est alors trop TARDIVE (prudente).
  ⚠️ Le brevet de molécule (20 ans + certificat complémentaire jusqu'à 5 ans)
     est indépendant : il peut courir après la protection des données.
  ⚠️ Rien de tout cela ne lie l'ONSSA. C'est un signal commercial — « les
     génériqueurs peuvent maintenant la fabriquer et la vendre » — à faire
     confirmer (brevet, SPC) avant d'engager un dossier.

Seules les substances chimiques sont gardées : micro-organismes, substances
de base et phéromones n'ont pas de « sortie d'exclusivité » au sens générique.
"""

from __future__ import annotations

import json
import re
import ssl
import time
import urllib.request
from datetime import date
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent
DATA = RACINE / "data"
API = "https://api.datalake.sante.service.ec.europa.eu/sante/pesticides"
CAS = re.compile(r"\b\d{2,7}-\d{2}-\d\b")


def get_json(url: str, essais: int = 4) -> dict:
    ctx = ssl.create_default_context()
    for i in range(essais):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Rasd-veille/1.0", "Accept": "application/json"})
            with urllib.request.urlopen(req, timeout=90, context=ctx) as r:
                return json.loads(r.read().decode("utf-8"))
        except Exception as e:  # réseau capricieux : on réessaie, puis on abandonne
            if i == essais - 1:
                raise
            print(f"  nouvel essai ({e})")
            time.sleep(2 ** (i + 1))
    return {}


def get_tout(url: str) -> list[dict]:
    tout: list[dict] = []
    while url:
        d = get_json(url)
        tout.extend(d.get("value", []))
        url = d.get("nextLink")
    return tout


def iso_date(jjmmaaaa: str | None) -> str | None:
    if not jjmmaaaa:
        return None
    m = re.match(r"(\d{2})/(\d{2})/(\d{4})", jjmmaaaa)
    return f"{m.group(3)}-{m.group(2)}-{m.group(1)}" if m else None


def plus_dix_ans(iso: str | None) -> str | None:
    if not iso:
        return None
    a, m, j = iso.split("-")
    # 29 février + 10 ans n'existe pas toujours : on recule au 28.
    if m == "02" and j == "29":
        j = "28"
    return f"{int(a) + 10}-{m}-{j}"


def main():
    print("substances actives UE (base complète)…")
    brut = get_tout(f"{API}/active-substances?format=json&api-version=v3.0")
    print(f"  {len(brut)} entrées")

    substances = []
    vus = set()
    for s in brut:
        nom = (s.get("substance_name") or "").strip()
        if not nom or nom in vus:
            continue
        if s.get("as_micro_org") == "Yes" or s.get("basic_substance") == "Yes":
            continue
        vus.add(nom)
        approbation = iso_date(s.get("approval_date"))
        cas = sorted(set(CAS.findall(" ".join(filter(None, [s.get("cas_number"), s.get("as_cas_number")])))))
        substances.append({
            "nom": nom,
            "cas": cas,
            "statut": s.get("substance_status"),
            "categorie": s.get("substance_category"),
            "approbation": approbation,
            "expiration": iso_date(s.get("expiry_date")),
            "finProtectionEstimee": plus_dix_ans(approbation),
            "rms": s.get("rms"),
            "substitution": s.get("candidate_for_substitution") == "Yes",
            "faibleRisque": s.get("low_risk_active_substance") == "Yes",
        })

    substances.sort(key=lambda x: x["nom"].lower())
    approuvees = sum(1 for x in substances if x["statut"] == "Approved")
    (DATA / "ue-exclusivites.json").write_text(json.dumps({
        "meta": {
            "source": "EU Pesticides Database — DG SANTE, API active-substances v3.0",
            "genere": date.today().isoformat(),
            "nbSubstances": len(substances),
            "nbApprouvees": approuvees,
            "regle": ("finProtectionEstimee = date d'approbation UE + 10 ans (règl. 1107/2009, art. 59). "
                      "Estimation à confirmer : renouvellements, brevets et certificats complémentaires non lus."),
        },
        "substances": substances,
    }, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"OK : {len(substances)} substances chimiques, dont {approuvees} approuvées -> data/ue-exclusivites.json")


if __name__ == "__main__":
    main()
