"""
Groupes de mode d'action FRAC / IRAC / HRAC -> data/modes-action.json

    python scripts/import_modes_action.py

POURQUOI. Alterner les modes d'action est la règle de base contre les
résistances : deux produits du même groupe FRAC ou IRAC ne se relaient pas.
Afficher le groupe à côté de chaque matière active permet de construire un
programme de traitement qui tourne.

SOURCES (codes mondiaux, publiés en tableaux par CropLife Australia, alignés
sur FRAC et IRAC ; HRAC publie sa propre liste maîtresse) :
  FRAC  CropLife — Fungicide Activity Group Table (juillet 2026)
  IRAC  CropLife — Insecticide MoA, Active Constituent List (juin 2026)
  HRAC  HRAC Global — Herbicide MoA Classification Master List (2026)

Rapprochement par nom ISO anglais exact (casse, espaces et tirets ignorés).
Une matière absente des trois listes n'a pas de groupe : rien n'est déduit.
"""

from __future__ import annotations

import io
import json
import re
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _reseau import telecharger  # noqa: E402

RACINE = Path(__file__).resolve().parent.parent
DATA = RACINE / "data"

SOURCES = {
    "FRAC": "https://media.croplife.org.au/2026/07/CropLife_2026-FungicideActivityGroupTable.pdf",
    "IRAC": "https://media.croplife.org.au/2026/07/CropLife_2026_Insecticide_ActiveConList.pdf",
    "HRAC": "https://hracglobal.com/getdoc.php?file=2026-Herbicide-MoA-Classification-Master-List-without-Molecular-Structures.xlsx",
}
CODE_FRAC = re.compile(r"^(\d{1,2}|M\s?\d{1,2}|P\s?\d{1,2}|U\s?\d{1,2}|BM\s?\d{1,2}|NC)$")
CODE_IRAC = re.compile(r"^(\d{1,2}[A-G]?|UN|UNB|UNE|UNF|UNM|UNP|NC)$")


def cle(nom: str) -> str:
    return re.sub(r"[^a-z0-9]", "", nom.lower())


def lignes_pdf(url: str) -> list[str]:
    import fitz

    doc = fitz.open(stream=telecharger(url), filetype="pdf")
    return [l.strip() for p in doc for l in p.get_text().split("\n") if l.strip()]


def frac() -> dict[str, dict]:
    """Le code précède son groupe : on retient, pour chaque nom, le dernier code vu."""
    lignes = lignes_pdf(SOURCES["FRAC"])
    out, code, groupe = {}, None, None
    for k, l in enumerate(lignes):
        if CODE_FRAC.match(l):
            code = l.replace(" ", "")
            # Le libellé suit le code ; « (33) » est l'ancien numéro, pas un libellé.
            suite = [x for x in lignes[k + 1:k + 3] if not x.startswith("(")]
            groupe = suite[0] if suite else None
            continue
        if code:
            # Une ligne de matière active peut porter un mélange « benalaxyl (+ mancozeb) » :
            # seul le premier nom est rattaché au groupe.
            nom = re.split(r"\s*[(\[]", l)[0]
            if nom and nom[0].islower() and len(nom) > 3:
                out.setdefault(cle(nom), {"groupe": code, "libelle": groupe})
    return out


def irac() -> dict[str, dict]:
    lignes = lignes_pdf(SOURCES["IRAC"])
    out = {}
    for k in range(len(lignes) - 1):
        if CODE_IRAC.match(lignes[k + 1]) and not CODE_IRAC.match(lignes[k]):
            out.setdefault(cle(lignes[k]), {"groupe": lignes[k + 1], "libelle": None})
    return out


def hrac() -> dict[str, dict]:
    import openpyxl

    wb = openpyxl.load_workbook(io.BytesIO(telecharger(SOURCES["HRAC"])), read_only=True)
    out = {}
    for r in list(wb.worksheets[0].iter_rows(values_only=True))[1:]:
        moa, famille, actif, groupe, ancien = (list(r) + [None] * 5)[:5]
        if actif and groupe is not None:
            out.setdefault(cle(str(actif)), {
                "groupe": str(groupe), "ancien": ancien, "libelle": moa, "famille": famille})
    return out


def main():
    iso = json.loads((DATA / "_iso.json").read_text(encoding="utf-8"))["iso"]
    listes = {"FRAC": frac(), "IRAC": irac(), "HRAC": hrac()}
    for k, v in listes.items():
        print(f"  {k} : {len(v)} matières actives")

    out = {}
    for nom in iso:
        # Nom de base : « EMAMECTIN BENZOATE » se cherche aussi sous « emamectin ».
        essais = [nom, re.split(r"\s+PRESENT AS\s+", nom)[-1], nom.split(" ")[0],
                  nom.replace("-ALUMINIUM", "-AL")]
        for systeme, table in listes.items():
            for e in essais:
                if cle(e) in table:
                    out.setdefault(nom, {})[systeme] = table[cle(e)]
                    break
    (DATA / "modes-action.json").write_text(json.dumps({
        "meta": {"genere": date.today().isoformat(), "sources": SOURCES,
                 "avertissement": "Groupes mondiaux FRAC, IRAC et HRAC. Un groupe absent n'est pas déduit."},
        "matieres": dict(sorted(out.items())),
    }, ensure_ascii=False, indent=1), encoding="utf-8")
    nb = {k: sum(1 for v in out.values() if k in v) for k in listes}
    print(f"OK : {len(out)} matières de l'index avec un groupe ({nb})")


if __name__ == "__main__":
    main()
