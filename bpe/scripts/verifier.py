#!/usr/bin/env python3
"""Integrity checks for data/corpus.json. Run from the bpe directory."""

import json
import sys
from pathlib import Path

FORBIDDEN = {"detenteurs", "fournisseurs", "produits", "amm", "caAnnuel", "nomCommercial"}


def walk(node: object) -> None:
    if isinstance(node, dict):
        for key, value in node.items():
            if key in FORBIDDEN:
                raise SystemExit(f"forbidden key: {key}")
            walk(value)
    elif isinstance(node, list):
        for value in node:
            walk(value)


def main() -> None:
    corpus = json.loads(Path("data/corpus.json").read_text(encoding="utf-8"))
    walk(corpus)
    ids = [m["id"] for m in corpus["matieres"]]
    if len(ids) != len(set(ids)):
        raise SystemExit("duplicate matiere id")
    idset = set(ids)
    if not corpus["melanges"]:
        raise SystemExit("no mixtures")
    for mix in corpus["melanges"]:
        if len(mix["composants"]) < 2 or len(mix["composantIds"]) != len(mix["composants"]):
            raise SystemExit(f"bad mixture {mix['id']}")
        if any(i not in idset for i in mix["composantIds"]):
            raise SystemExit(f"unknown component in {mix['id']}")
    if len(corpus["organismes"]) < 1:
        raise SystemExit("no BPE organisms")
    if any(not o.get("nom") for o in corpus["organismes"]):
        raise SystemExit("organism without name")
    cultures = {c["nom"] for c in corpus["cultures"]}
    for m in corpus["matieres"]:
        if any(c not in cultures for c in m["cultures"]):
            raise SystemExit(f"unknown culture on {m['id']}")
    print(
        f"ok matieres={len(ids)} melanges={len(corpus['melanges'])} "
        f"cultures={len(cultures)} organismes={len(corpus['organismes'])}"
    )


if __name__ == "__main__":
    sys.exit(main())
