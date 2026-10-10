"""
Journal de l'index ONSSA : ce qui change d'un relevé IndPesticide à l'autre.

    python scripts/_journal_index.py --avant ancien.json --apres nouveau.json --date 2026-10-01

Écrit data/onssa-journal.json (cumulé, sans limite de durée : c'est l'historique).

Cinq événements, constatés en comparant deux index :
    nouveau        produit absent du précédent relevé
    sorti          produit disparu (l'e-service ne publie que les AMM en vigueur)
    échéance       date d'expiration de l'AMM modifiée (renouvellement, rectification)
    usages         nombre d'usages homologués modifié (extension ou retrait d'usage)
    renommé        même numéro d'AMM sous un autre nom commercial

La date d'un événement est celle de la mise à jour affichée par l'ONSSA, pas
celle du relevé : c'est ce que l'Office dit, au jour où il le dit.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent
FICHIER = RACINE / "data" / "onssa-journal.json"


def consigner(avant: dict, apres: dict, date_maj: str) -> list[dict]:
    a = {p["id"]: p for p in avant.get("portefeuille", [])}
    b = {p["id"]: p for p in apres.get("portefeuille", [])}
    ev = []

    def base(p: dict, type_: str, detail: str) -> dict:
        return {
            "date": date_maj, "type": type_, "produit": p["id"], "nomCommercial": p["nomCommercial"],
            "detenteurId": p["detenteurId"], "detenteur": p["detenteur"],
            "matieres": p.get("matieresActives", []), "detail": detail,
        }

    # Même numéro d'AMM sous un autre nom : un changement de nom, pas une entrée et une sortie.
    sortis = {a[i].get("amm"): a[i] for i in set(a) - set(b) if a[i].get("amm")}
    renommes = set()
    for i in sorted(set(b) - set(a)):
        p = b[i]
        avant = sortis.get(p.get("amm")) if p.get("amm") else None
        if avant:
            renommes.add(avant["id"])
            ev.append(base(p, "renommé", f"{avant['nomCommercial']} → {p['nomCommercial']} (AMM {p['amm']})"))
            continue
        ev.append(base(p, "nouveau", f"AMM {p.get('amm') or '—'} jusqu'au {p.get('expiration') or '—'}, {len(p.get('usages', []))} usage(s)"))
    for i in sorted(set(a) - set(b)):
        if i in renommes:
            continue
        p = a[i]
        ev.append(base(p, "sorti", f"AMM {p.get('amm') or '—'} (échéance connue : {p.get('expiration') or '—'})"))
    for i in sorted(set(a) & set(b)):
        x, y = a[i], b[i]
        if (x.get("expiration") or "") != (y.get("expiration") or ""):
            ev.append(base(y, "échéance", f"{x.get('expiration') or '—'} → {y.get('expiration') or '—'}"))
        nx, ny = len(x.get("usages", [])), len(y.get("usages", []))
        if nx != ny:
            ev.append(base(y, "usages", f"{nx} → {ny} usage(s)"))

    journal = json.loads(FICHIER.read_text(encoding="utf-8")) if FICHIER.exists() else {"evenements": []}
    deja = {(e["date"], e["type"], e["produit"]) for e in journal["evenements"]}
    ajout = [e for e in ev if (e["date"], e["type"], e["produit"]) not in deja]
    tous = sorted(journal["evenements"] + ajout, key=lambda e: (e["date"], e["type"], e["nomCommercial"]), reverse=True)
    FICHIER.write_text(json.dumps({
        "meta": {
            "role": "Changements de l'index ONSSA (IndPesticide.aspx) d'un relevé à l'autre.",
            "dernierConstat": date_maj,
            "nbEvenements": len(tous),
        },
        "evenements": tous,
    }, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"  journal de l'index : +{len(ajout)} événement(s), {len(tous)} au total")
    return ajout


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--avant", required=True)
    ap.add_argument("--apres", required=True)
    ap.add_argument("--date", required=True, help="date de mise à jour ONSSA du second index (AAAA-MM-JJ)")
    a = ap.parse_args()
    lire = lambda f: json.loads(Path(f).read_text(encoding="utf-8"))  # noqa: E731
    consigner(lire(a.avant), lire(a.apres), a.date)


if __name__ == "__main__":
    main()
