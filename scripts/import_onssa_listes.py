"""
Listes opérationnelles ONSSA -> data/onssa-listes.json

    python scripts/import_onssa_listes.py
    python scripts/import_onssa_listes.py --depuis-fichiers /tmp/onssa-retirees.pdf /tmp/onssa-restr.pdf

Les avis et listes de Reglementation_N.aspx ne se valent pas. Un calendrier
CNPPP, un avis d'étiquetage, une liste de revendeurs : à lire. Deux listes,
elles, portent des NOMS et des DATES qui changent une décision :

  • substances actives retirées / interdites au Maroc
  • substances soumises à restriction d'usage

On les lit dans les PDF, on les croise ensuite avec l'index Excel. On
n'invente aucune AMM : une molécule retirée n'apparaît pas comme homologuée.
Une molécule encore à l'index mais restreinte porte l'avertissement. Une
molécule encore à l'index alors que la liste la dit retirée est une
incohérence de source — alerte, pas correction silencieuse.

Les autres avis restent dans le journal des textes.
"""

from __future__ import annotations

import argparse
import io
import json
import re
import sys
from datetime import datetime
from pathlib import Path
from urllib.parse import quote, urlsplit, urlunsplit

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _reseau import telecharger  # noqa: E402

RACINE = Path(__file__).resolve().parent.parent
TEXTES = RACINE / "data" / "onssa-reglementation.json"
SORTIE = RACINE / "data" / "onssa-listes.json"

CAS = re.compile(r"\d{2,7}-\d{2}-\d")
DATE = re.compile(r"\d{2}/\d{2}/\d{4}")
LIGNE_RETIREE = re.compile(
    r"^(.+?)\s+(\d{2,7}-\d{2}-\d)\s+(\d{2}/\d{2}/\d{4})\s*$"
)


def encoder(url: str) -> str:
    p = urlsplit(url)
    return urlunsplit((p.scheme, p.netloc, quote(p.path), p.query, p.fragment))


def iso(d: str) -> str | None:
    try:
        return datetime.strptime(d, "%d/%m/%Y").date().isoformat()
    except ValueError:
        return None


def pdf_texte(brut: bytes) -> str:
    from pypdf import PdfReader

    r = PdfReader(io.BytesIO(brut))
    return "\n".join((p.extract_text() or "") for p in r.pages)


def nettoyer_nom(s: str) -> str:
    s = re.sub(r"\s+", " ", s).strip(" -–—\t")
    s = re.sub(r"^(substance active|num\.?\s*cas|date de retrait|date de restriction)\s*", "", s, flags=re.I)
    return s.strip()


def lire_retirees(texte: str) -> tuple[str | None, list[dict]]:
    maj = None
    m = re.search(r"Date de mise à jour\s*:\s*(\d{1,2}\s+\w+\s+\d{4}|\d{2}/\d{2}/\d{4})", texte, re.I)
    if m:
        brut = m.group(1)
        maj = iso(brut) if "/" in brut else brut
        # « 28 Mai 2025 »
        if not iso(brut) and re.search(r"\d{4}", brut):
            mois = {
                "janvier": "01", "fevrier": "02", "février": "02", "mars": "03",
                "avril": "04", "mai": "05", "juin": "06", "juillet": "07",
                "aout": "08", "août": "08", "septembre": "09", "octobre": "10",
                "novembre": "11", "decembre": "12", "décembre": "12",
            }
            mm = re.search(r"(\d{1,2})\s+([A-Za-zéûô]+)\s+(\d{4})", brut)
            if mm:
                mo = mois.get(mm.group(2).lower())
                if mo:
                    maj = f"{mm.group(3)}-{mo}-{int(mm.group(1)):02d}"

    out: list[dict] = []
    vu: set[str] = set()
    for ligne in texte.splitlines():
        ligne = re.sub(r"\s+", " ", ligne).strip()
        hit = LIGNE_RETIREE.match(ligne)
        if not hit:
            continue
        nom = nettoyer_nom(hit.group(1))
        if len(nom) < 3:
            continue
        cle = nom.casefold()
        if cle in vu:
            continue
        vu.add(cle)
        out.append({"nom": nom, "cas": hit.group(2), "dateRetrait": iso(hit.group(3))})
    return maj, out


def lire_restrictions(texte: str) -> tuple[str | None, list[dict]]:
    maj = None
    m = re.search(r"Date de mise à jour\s*:\s*(\d{1,2}\s+\w+\s+\d{4}|\d{2}/\d{2}/\d{4})", texte, re.I)
    if m:
        brut = m.group(1)
        if "/" in brut:
            maj = iso(brut)
        else:
            mois = {
                "janvier": "01", "fevrier": "02", "février": "02", "mars": "03",
                "avril": "04", "mai": "05", "juin": "06", "juillet": "07",
                "aout": "08", "août": "08", "septembre": "09", "octobre": "10",
                "novembre": "11", "decembre": "12", "décembre": "12",
            }
            mm = re.search(r"(\d{1,2})\s+([A-Za-zéûô]+)\s+(\d{4})", brut)
            if mm:
                mo = mois.get(mm.group(2).lower())
                if mo:
                    maj = f"{mm.group(3)}-{mo}-{int(mm.group(1)):02d}"

    # Ancres : un CAS, une date, puis les conditions jusqu'au CAS suivant.
    ancre = re.compile(
        r"([A-Za-zÀ-ÿ0-9,'’().\-\/ ]{3,80}?)\s+(\d{2,7}-\d{2}-\d)\s+(\d{2}/\d{2}/\d{4})\s*(.*?)(?=(?:[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ0-9,'’().\-\/ ]{2,60}\s+\d{2,7}-\d{2}-\d\s+\d{2}/\d{2}/\d{4})|\Z)",
        re.S,
    )
    out: list[dict] = []
    vu: set[str] = set()
    for nom, cas, date, cond in ancre.findall(texte):
        nom = nettoyer_nom(nom)
        if len(nom) < 3:
            continue
        cond = re.sub(r"\s+", " ", cond).strip(" -–—*")
        cond = re.sub(r"https?://\S+", "", cond).strip()
        cle = nom.casefold()
        if cle in vu:
            continue
        vu.add(cle)
        out.append({"nom": nom, "cas": cas, "dateRestriction": iso(date), "condition": cond[:400]})
    return maj, out


def url_depuis_textes(*motifs: str) -> str | None:
    if not TEXTES.exists():
        return None
    data = json.loads(TEXTES.read_text(encoding="utf-8"))
    for t in data.get("textes") or []:
        blob = f"{t.get('id','')} {t.get('titre','')}".lower()
        if all(m in blob for m in motifs):
            return t.get("url")
    return None


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--depuis-fichiers", nargs=2, metavar=("RETIREES", "RESTRICTIONS"))
    args = ap.parse_args()

    url_r = url_depuis_textes("retirees au maroc") or url_depuis_textes("matieres actives retirees")
    url_s = url_depuis_textes("restriction")

    if args.depuis_fichiers:
        brut_r = Path(args.depuis_fichiers[0]).read_bytes()
        brut_s = Path(args.depuis_fichiers[1]).read_bytes()
    else:
        if not url_r or not url_s:
            print("URLs des listes introuvables dans onssa-reglementation.json", file=sys.stderr)
            return 1
        print(f"retraites : {url_r}")
        brut_r = telecharger(encoder(url_r))
        print(f"  {len(brut_r)} octets")
        print(f"restrictions : {url_s}")
        brut_s = telecharger(encoder(url_s))
        print(f"  {len(brut_s)} octets")

    maj_r, retirees = lire_retirees(pdf_texte(brut_r))
    maj_s, restrictions = lire_restrictions(pdf_texte(brut_s))

    if len(retirees) < 40 or len(restrictions) < 8:
        print(
            f"Parse trop pauvre ({len(retirees)} retirées, {len(restrictions)} restrictions), "
            "fichier conservé.",
            file=sys.stderr,
        )
        return 1

    sortie = {
        "meta": {
            "source": "ONSSA — listes opérationnelles (retraits et restrictions d'usage)",
            "attribution": "ONSSA — listes de substances actives, pas l'index des AMM",
            "genere": datetime.now().isoformat(timespec="seconds"),
            "urlRetirees": url_r,
            "urlRestrictions": url_s,
            "majRetirees": maj_r,
            "majRestrictions": maj_s,
            "nbRetirees": len(retirees),
            "nbRestrictions": len(restrictions),
            "avertissement": (
                "Lecture des PDF officiels. Une présence ici n'ouvre aucun droit "
                "et n'ajoute aucune AMM. L'index Excel reste la source des homologations."
            ),
        },
        "retirees": retirees,
        "restrictions": restrictions,
    }
    SORTIE.write_text(json.dumps(sortie, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"→ {SORTIE.relative_to(RACINE)} : {len(retirees)} retirées, {len(restrictions)} restrictions")
    return 0


if __name__ == "__main__":
    sys.exit(main())
