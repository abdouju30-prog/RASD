"""
Nouvelles usines chinoises : qui vient d'obtenir une homologation de matière
active technique, d'un relevé ICAMA à l'autre.

    python scripts/_icama_nouveautes.py                  # compare à data/icama.json du dernier commit
    python scripts/_icama_nouveautes.py --avant f.json --date 2026-10-09

Écrit data/icama-nouveautes.json (journal cumulé, un an glissant).

Seules les molécules présentes dans LES DEUX relevés sont comparées : une
molécule interrogée pour la première fois ferait sinon passer toutes ses
usines pour nouvelles. Une société qui disparaît n'est pas signalée — le
registre retire aussi des homologations échues, ce n'est pas une nouvelle.
"""

from __future__ import annotations

import argparse
import json
import subprocess
from datetime import date, timedelta
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent
ICAMA = RACINE / "data" / "icama.json"
SORTIE = RACINE / "data" / "icama-nouveautes.json"
FENETRE_JOURS = 365


def societes_par_molecule(d: dict) -> dict[str, dict[str, bool]]:
    """iso -> {nom han: a une licence de production}"""
    return {
        m["iso"]: {s["nom"]: bool(s.get("licenceProduction")) for s in m["societes"]}
        for m in d.get("matieres", [])
    }


def charger_avant(chemin: str | None) -> dict | None:
    if chemin:
        return json.loads(Path(chemin).read_text(encoding="utf-8"))
    r = subprocess.run(
        ["git", "show", "HEAD:data/icama.json"], cwd=RACINE, capture_output=True,
    )
    if r.returncode != 0:
        return None
    return json.loads(r.stdout.decode("utf-8"))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--avant", default=None)
    ap.add_argument("--date", default=None)
    args = ap.parse_args()
    constat = args.date or date.today().isoformat()

    avant = charger_avant(args.avant)
    apres = json.loads(ICAMA.read_text(encoding="utf-8"))
    journal = json.loads(SORTIE.read_text(encoding="utf-8")) if SORTIE.exists() else {"evenements": []}
    deja = {(e["iso"], e["societe"]) for e in journal["evenements"]}

    nouveaux = []
    if avant:
        a, b = societes_par_molecule(avant), societes_par_molecule(apres)
        for iso in sorted(set(a) & set(b)):
            for nom, usine in b[iso].items():
                if nom not in a[iso] and (iso, nom) not in deja:
                    nouveaux.append({"date": constat, "iso": iso, "societe": nom, "usine": usine})

    limite = (date.fromisoformat(constat) - timedelta(days=FENETRE_JOURS)).isoformat()
    evenements = [e for e in journal["evenements"] + nouveaux if e["date"] >= limite]
    evenements.sort(key=lambda e: (e["date"], e["iso"], e["societe"]), reverse=True)
    SORTIE.write_text(json.dumps({
        "meta": {
            "role": (
                "Sociétés chinoises apparues sur une matière active entre deux relevés ICAMA "
                "(homologation de matière technique). « usine » = licence de production."
            ),
            "dernierConstat": constat,
            "fenetreJours": FENETRE_JOURS,
            "nbEvenements": len(evenements),
        },
        "evenements": evenements,
    }, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"nouvelles usines chinoises : +{len(nouveaux)} ce relevé, {len(evenements)} au journal")
    for e in nouveaux[:15]:
        print(f"  {e['iso']:24} {'usine' if e['usine'] else 'titulaire':9} {e['societe']}")


if __name__ == "__main__":
    main()
