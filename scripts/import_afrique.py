"""
Homologations voisines : Tunisie et Sahel (CSP) -> data/afrique.json

    python scripts/import_afrique.py              # Tunisie + Sahel (OCR si Tesseract est présent)
    python scripts/import_afrique.py --sans-ocr   # Tunisie seule, Sahel conservé tel quel

POURQUOI. Un produit homologué au Maroc l'est-il chez les voisins ? C'est la
question d'un distributeur qui vise le Maghreb ou l'Afrique de l'Ouest, et la
zone que les bases mondiales couvrent le moins.

SOURCES OFFICIELLES PUBLIQUES
  Tunisie  DGSVCIA — Liste des produits pesticides homologués (19 avril 2023,
           dernière version publiée sur le portail open data agridata.tn)
  Sahel    Comité sahélien des pesticides (CILSS/INSAH) — Liste globale des
           pesticides autorisés, octobre 2025 ; document scanné, lu par OCR.
  Algérie  aucune liste publique en ligne : non couverte, l'écran le dit.

MÉTHODE. Pour chaque molécule de l'index marocain (nom français et nom ISO
anglais), on compte les produits de la liste qui la portent. Le CSP étant lu
par OCR, son compte est un ordre de grandeur (« mentions »), jamais une liste
nominative.
"""

from __future__ import annotations

import json
import re
import shutil
import subprocess
import sys
import tempfile
import unicodedata
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _reseau import telecharger  # noqa: E402

RACINE = Path(__file__).resolve().parent.parent
DATA = RACINE / "data"
SORTIE = DATA / "afrique.json"

TUNISIE = {
    "nom": "Tunisie — DGSVCIA, liste des produits pesticides homologués",
    "date": "2023-04-19",
    "url": "https://catalog.agridata.tn/dataset/583ceab9-fba3-481c-bf9d-0d12edcec48d/resource/cf3723c4-6996-4793-9a04-314ba5b3cd53/download/liste-des-produits-pesticides-homologues_ver.finale-19-avril-2023.pdf",
}
CSP = {
    "nom": "Sahel — Comité sahélien des pesticides, liste globale des pesticides autorisés",
    "date": "2025-10",
    "url": "https://insah.cilss.int/wp-content/uploads/2026/09/Liste-globale-des-Pesticides-Autorises-par-le-CSP-Octobre-2025.pdf",
}
TESSERACT = shutil.which("tesseract") or (
    r"C:\Program Files\Tesseract-OCR\tesseract.exe" if Path(r"C:\Program Files\Tesseract-OCR\tesseract.exe").exists() else None)


def normaliser(t: str) -> str:
    t = unicodedata.normalize("NFKD", t).encode("ascii", "ignore").decode().lower()
    return " " + re.sub(r"[^a-z0-9]+", " ", t).strip() + " "


def motifs_molecules() -> dict[str, re.Pattern]:
    """Molécule de l'index -> motif cherchant son nom français ou ISO, « e » final facultatif."""
    onssa = json.loads((DATA / "onssa.json").read_text(encoding="utf-8"))
    iso = {m["id"]: m.get("iso") for m in json.loads((DATA / "_iso.json").read_text(encoding="utf-8"))["matieres"]}
    noms: dict[str, set[str]] = {}
    for m in onssa["matieres"]:
        mol = re.split(r"\s+-", m["molecule"])[0].strip()
        if len(mol) < 4:
            continue
        e = noms.setdefault(mol, set())
        e.add(normaliser(mol).strip())
        if iso.get(m["id"]):
            e.add(normaliser(iso[m["id"]]).strip())
    motifs = {}
    for mol, variantes in noms.items():
        alts = "|".join(re.escape(re.sub(r"e$", "", v)) + r"e?" for v in sorted(variantes) if len(v) >= 4)
        motifs[mol] = re.compile(rf" (?:{alts}) ")
    return motifs


def tunisie(motifs: dict[str, re.Pattern]) -> dict[str, dict]:
    import fitz

    doc = fitz.open(stream=telecharger(TUNISIE["url"]), filetype="pdf")
    lignes = [l.strip() for p in doc for l in p.get_text().split("\n") if l.strip()]
    # Une ligne de produit commence par son numéro d'ordre, suivi du nom de la
    # substance — sur la même ligne (« 139 Lambda cyhalothrin ») ou la suivante.
    rangs: list[tuple[int, str]] = []
    for k, l in enumerate(lignes):
        m = re.fullmatch(r"(\d{1,3})\s+([A-Za-zÀ-ÿ]{4,}.*)", l)  # « 200 g/L » n'est pas un produit
        if m:
            rangs.append((k, m.group(2)))
        elif re.fullmatch(r"\d{1,3}", l) and k + 1 < len(lignes) and re.match(r"[A-Za-zÀ-ÿ]", lignes[k + 1]):
            suite = lignes[k + 2] if k + 2 < len(lignes) and not re.match(r"[\d(]", lignes[k + 2]) else ""
            rangs.append((k, f"{lignes[k + 1]} {suite}"))
    out: dict[str, dict] = {}
    for i, (k, nom_substance) in enumerate(rangs):
        bloc = lignes[k:rangs[i + 1][0] if i + 1 < len(rangs) else len(lignes)]
        substance = normaliser(nom_substance)
        texte = " ".join(bloc)
        # Une restriction vise le produit : on ne l'attribue à une molécule que si
        # le produit n'en contient qu'une.
        restriction = None
        r = re.search(r"Restriction d.usage\s*:?\s*([^()]+)", texte, flags=re.I)
        if r and "+" not in nom_substance:
            restriction = re.sub(r"\s+", " ", r.group(1)).strip()[:140]
        for mol, motif in motifs.items():
            if motif.search(substance):
                e = out.setdefault(mol, {"n": 0})
                e["n"] += 1
                if restriction and not e.get("restriction"):
                    e["restriction"] = restriction
    return out


def csp(motifs: dict[str, re.Pattern]) -> dict[str, dict] | None:
    if not TESSERACT:
        print("  Tesseract absent : Sahel non relu")
        return None
    import fitz

    doc = fitz.open(stream=telecharger(CSP["url"], timeout=900), filetype="pdf")
    textes = []
    with tempfile.TemporaryDirectory() as tmp:
        for i, page in enumerate(doc):
            # Les pages sont scannées de côté : rotation de 270° avant lecture.
            img = Path(tmp) / f"p{i}.png"
            page.get_pixmap(matrix=fitz.Matrix(200 / 72, 200 / 72).prerotate(270)).save(img)
            r = subprocess.run([TESSERACT, str(img), "stdout", "-l", "eng", "--psm", "6"],
                               capture_output=True, text=True, encoding="utf-8", errors="replace")
            textes.append(r.stdout)
            if (i + 1) % 10 == 0:
                print(f"    OCR {i + 1}/{len(doc)} pages", flush=True)
    texte = normaliser(" ".join(textes))
    out = {}
    for mol, motif in motifs.items():
        n = len(motif.findall(texte))
        if n:
            out[mol] = {"n": n}
    return out


def main():
    motifs = motifs_molecules()
    precedent = json.loads(SORTIE.read_text(encoding="utf-8")) if SORTIE.exists() else {}
    print("Tunisie…")
    tn = tunisie(motifs)
    print(f"  {len(tn)} molécules de l'index présentes en Tunisie")
    sahel = None
    if "--sans-ocr" not in sys.argv:
        print("Sahel (OCR)…")
        sahel = csp(motifs)
    if sahel is None:
        sahel = {m: v["sahel"] for m, v in (precedent.get("matieres") or {}).items() if "sahel" in v}
    print(f"  {len(sahel)} molécules de l'index citées dans la liste du CSP")

    matieres = {}
    for mol in sorted(set(tn) | set(sahel)):
        e = {}
        if mol in tn:
            e["tunisie"] = tn[mol]
        if mol in sahel:
            e["sahel"] = sahel[mol]
        matieres[mol] = e
    SORTIE.write_text(json.dumps({
        "meta": {"genere": date.today().isoformat(), "tunisie": TUNISIE, "sahel": CSP,
                 "nonCouverts": ["Algérie (aucune liste publique en ligne)"]},
        "matieres": matieres,
    }, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"OK -> {SORTIE}")


if __name__ == "__main__":
    main()
