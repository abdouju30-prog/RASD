"""
Produits sortis de l'index ONSSA — la mémoire que l'e-service n'a pas.

    python scripts/_sortis.py --depuis ancien-onssa.json   (amorçage manuel)

IndPesticide.aspx ne liste que les homologations EN VIGUEUR : une AMM échue
disparaît purement et simplement de l'index. Sans mémoire, l'outil ne verrait
jamais d'« AMM expirée » — l'alerte la plus directe pour un détenteur.

Chaque import compare donc le nouvel index au précédent. Un produit qui
disparaît est consigné dans data/onssa-sortis.json avec sa dernière fiche
connue et la date du constat ; un produit qui réapparaît en est retiré.
Rien n'est déduit : le motif de la sortie (échéance, retrait, non-renouvellement)
n'est pas publié par l'ONSSA, seule la date d'expiration connue est montrée.
"""

from __future__ import annotations

import argparse
import json
from datetime import date
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent
FICHIER = RACINE / "data" / "onssa-sortis.json"


def charger(chemin: Path) -> dict:
    if not chemin.exists():
        return {}
    try:
        return json.loads(chemin.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}


def mettre_a_jour(ancien: dict, nouveau: dict, source_ancien: str, constat: str | None = None) -> dict:
    """Consigne les produits de `ancien` absents de `nouveau` ; écrit et renvoie le registre."""
    constat = constat or date.today().isoformat()
    registre = charger(FICHIER)
    sortis = {p["id"]: p for p in registre.get("produits", [])}

    ids_nouveaux = {p["id"] for p in nouveau.get("portefeuille", [])}
    # Un produit dont le numéro d'AMM reste à l'index a changé de nom, il n'est pas sorti
    # (ex. KARBICURE devenu MERANTO SL sous l'AMM H02-1-004).
    amm_nouveaux = {p.get("amm") for p in nouveau.get("portefeuille", []) if p.get("amm")}
    ajoutes = 0
    for p in ancien.get("portefeuille", []):
        if p["id"] in ids_nouveaux or p["id"] in sortis or (p.get("amm") and p["amm"] in amm_nouveaux):
            continue
        sortis[p["id"]] = {**p, "sortiLe": constat, "sourceSortie": source_ancien}
        ajoutes += 1

    revenus = [i for i, p in sortis.items() if i in ids_nouveaux or (p.get("amm") and p["amm"] in amm_nouveaux)]
    for i in revenus:
        del sortis[i]

    produits = sorted(sortis.values(), key=lambda p: (p["detenteur"], p["nomCommercial"]))
    payload = {
        "meta": {
            "role": (
                "Produits présents dans un index ONSSA antérieur et absents du dernier "
                "relevé IndPesticide.aspx. L'e-service ne publie que les AMM en vigueur."
            ),
            "majConstat": constat,
            "nbProduits": len(produits),
        },
        "produits": produits,
    }
    FICHIER.write_text(json.dumps(payload, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"  sortis de l'index : +{ajoutes} consigné(s), {len(revenus)} revenu(s), {len(produits)} au registre")
    return payload


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--depuis", required=True, help="ancien data/onssa.json à comparer à l'index actuel")
    ap.add_argument("--constat", default=None, help="date du constat (AAAA-MM-JJ), défaut : aujourd'hui")
    args = ap.parse_args()
    ancien = charger(Path(args.depuis))
    if not ancien:
        raise SystemExit(f"{args.depuis} illisible")
    actuel = charger(RACINE / "data" / "onssa.json")
    source = (ancien.get("meta") or {}).get("source") or Path(args.depuis).name
    mettre_a_jour(ancien, actuel, source, args.constat)


if __name__ == "__main__":
    main()
