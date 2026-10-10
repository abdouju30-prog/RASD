"""
Relevé des registres encore hors de l'outil : Inde, Canada, Colombie,
Argentine, Mexique, Malaisie, Thaïlande, Nouvelle-Zélande, Afrique du Sud,
Japon, Chili, article 95 de l'ECHA.

On n'écrit que ce qu'un fichier public permet de lire. Un portail sans
extraction reste une source (URL, ce qu'il nomme), avec une liste vide.

    python scripts/import_registres_ouverts.py
"""

from __future__ import annotations

import csv
import json
import re
import zipfile
from collections import defaultdict
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from xml.etree import ElementTree as ET

import xlrd

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent))
import _registres_complements as complements  # noqa: E402

RACINE = Path(__file__).resolve().parent.parent
SORTIE = RACINE / "data" / "registres-ouverts.json"
CACHE = Path("/tmp/src")

NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
PAYS_ECHA = {
    "Spain", "France", "Belgium", "Italy", "Germany", "Netherlands", "Ireland",
    "Austria", "Poland", "Portugal", "Sweden", "Denmark", "Finland", "Greece",
    "Hungary", "Czechia", "Czech Republic", "Slovakia", "Slovenia", "Romania",
    "Bulgaria", "Croatia", "Lithuania", "Latvia", "Estonia", "Luxembourg",
    "Malta", "Cyprus", "Norway", "Switzerland", "United Kingdom", "India",
    "China", "United States", "USA", "Japan", "Israel", "Brazil", "Canada",
    "Australia", "Turkey", "South Africa", "Mexico", "Argentina",
}


def xlsx_lignes(path: Path) -> list[list[str]]:
    z = zipfile.ZipFile(path)
    ss: list[str] = []
    if "xl/sharedStrings.xml" in z.namelist():
        root = ET.fromstring(z.read("xl/sharedStrings.xml"))
        for si in root.findall("m:si", NS):
            ss.append("".join(t.text or "" for t in si.iter(f"{{{NS['m']}}}t")))
    feuilles = [n for n in z.namelist() if re.fullmatch(r"xl/worksheets/sheet\d+\.xml", n)]
    out: list[list[str]] = []
    for feuille in feuilles:
        root = ET.fromstring(z.read(feuille))
        for row in root.findall("m:sheetData/m:row", NS):
            vals: list[str] = []
            for c in row.findall("m:c", NS):
                v = c.find("m:v", NS)
                if v is None or v.text is None:
                    vals.append("")
                elif c.get("t") == "s":
                    vals.append(ss[int(v.text)])
                else:
                    vals.append(v.text)
            if any(x.strip() for x in vals):
                out.append(vals)
    return out


class TableHtml(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.rows: list[list[str]] = []
        self.row: list[str] | None = None
        self.cell: list[str] | None = None

    def handle_starttag(self, tag: str, attrs) -> None:
        if tag == "tr":
            self.row = []
        elif tag in ("td", "th") and self.row is not None:
            self.cell = []

    def handle_endtag(self, tag: str) -> None:
        if tag in ("td", "th") and self.cell is not None and self.row is not None:
            self.row.append(re.sub(r"\s+", " ", "".join(self.cell)).strip())
            self.cell = None
        elif tag == "tr" and self.row is not None:
            if any(self.row):
                self.rows.append(self.row)
            self.row = None

    def handle_data(self, data: str) -> None:
        if self.cell is not None:
            self.cell.append(data)


def agregat(paires: list[tuple[str, str]]) -> list[dict]:
    par: dict[str, dict] = {}
    for societe, matiere in paires:
        societe = re.sub(r"\s+", " ", societe).strip(" ,;.")
        matiere = re.sub(r"\s+", " ", matiere).strip(" ,;.")
        if len(societe) < 2:
            continue
        e = par.setdefault(societe, {"nom": societe, "nb": 0, "mat": set()})
        e["nb"] += 1
        if matiere and matiere.lower() not in ("not available", "n/a", "-"):
            for morceau in re.split(r"\s*\+\s*|;\s*", matiere):
                morceau = morceau.strip()
                if 1 < len(morceau) <= 80:
                    e["mat"].add(morceau)
    # Pas de plafond : une matière au-delà des 60 premières
    # disparaîtrait de la recherche.
    lignes = []
    for e in par.values():
        mats = sorted(e["mat"], key=lambda s: s.lower())
        lignes.append({"nom": e["nom"], "nb": e["nb"], "matieres": mats})
    lignes.sort(key=lambda s: (-s["nb"], s["nom"].lower()))
    return lignes


def fiche(id_: str, pays: str, autorite: str, url: str, nomme: str, avertissement: str, paires, page: str | None = None) -> dict:
    societes = agregat(paires)
    return {
        "id": id_,
        "pays": pays,
        "autorite": autorite,
        "url": url,
        "page": page or url,
        "nomme": nomme,
        "avertissement": avertissement,
        "nbProduits": len(paires),
        "nbSocietes": len(societes),
        "societes": societes,
    }


def canada() -> dict:
    path = CACHE / "ca-product.csv"
    paires = []
    with path.open(encoding="cp1252", errors="replace", newline="") as f:
        for row in csv.DictReader(f):
            if row.get("Registration Status") != "Full Registration":
                continue
            paires.append((row.get("Registrant name") or "", row.get("Active ingredients - English") or ""))
    return fiche(
        "canada",
        "Canada",
        "Santé Canada — ARLA, base PPID",
        "https://pest-control.canada.ca/pesticide-registry-api/api/extract/product?lang=fr",
        "Le titulaire et les matières actives des produits en homologation pleine",
        "Aucune valeur réglementaire au Maroc. Le titulaire canadien n'est pas nécessairement le fabricant du technique.",
        paires,
        "https://open.canada.ca/data/en/dataset/e10b0d6e-04ac-4014-a64a-666c3874bbe0",
    )


def malaisie() -> dict:
    parser = TableHtml()
    parser.feed((CACHE / "my.html").read_text(encoding="utf-8", errors="ignore"))
    paires = []
    for row in parser.rows[1:]:
        if len(row) < 5 or not row[0].isdigit():
            continue
        paires.append((row[4], row[3]))
    return fiche(
        "malaisie",
        "Malaisie",
        "Lembaga Racun Makhluk Perosak — DOA",
        "http://www.portal.doa.gov.my/racunberdaftar/",
        "Le produit homologué, son n° LRMP, la matière active, le titulaire et la date d'expiration",
        "Liste gazettée, mise à jour mensuelle par le Pesticides Board. Aucune valeur réglementaire au Maroc.",
        paires,
    )


def japon() -> dict:
    z = zipfile.ZipFile(CACHE / "jp-kihon.zip")
    book = xlrd.open_workbook(file_contents=z.read("登録基本部.xls"))
    sh = book.sheet_by_name("登録基本部")
    paires = []
    for i in range(1, sh.nrows):
        societe = str(sh.cell_value(i, 3)).strip()
        matiere = str(sh.cell_value(i, 4)).strip()
        paires.append((societe, matiere))
    return fiche(
        "japon",
        "Japon",
        "FAMIC — 農薬登録情報",
        "https://www.acis.famic.go.jp/ddata/index.htm",
        "Le titulaire d'homologation et la matière active, tels que le fichier de base les écrit",
        "Noms de matières en katakana demi-chasse, raisons sociales en japonais. Aucune valeur réglementaire au Maroc. Relevé FAMIC du 10 septembre 2026 (fichier 登録基本部).",
        paires,
        "https://www.acis.famic.go.jp/toroku/",
    )


def argentine() -> dict:
    lignes = xlsx_lignes(CACHE / "ar-plantas.xlsx")
    paires = []
    for row in lignes:
        nom = (row[1] if len(row) > 1 else "").strip()
        if not nom or nom.lower().startswith("nombre"):
            continue
        if nom.upper() == nom and len(nom) < 4:
            continue
        paires.append((nom, ""))
    bloc = fiche(
        "argentine",
        "Argentine",
        "SENASA — Registro Nacional de Terapéutica Vegetal",
        "https://aps2.senasa.gov.ar/vademecum/app/publico",
        "Les plantes de formulation déclarées, et le vadémécum public des produits inscrits",
        "Le tableur officiel ne couvre que les usines de formulation, pas chaque produit. Le vadémécum en ligne porte les produits inscrits. Aucune valeur réglementaire au Maroc.",
        paires,
        "https://www.argentina.gob.ar/senasa/programas-sanitarios/productosveterinarios-fitosanitarios-y-fertilizantes/registro-nacional-de-terapeutica-vegetal",
    )
    return bloc


def afrique() -> dict:
    lignes = xlsx_lignes(CACHE / "za-restricted.xlsx")
    paires = []
    for row in lignes:
        if len(row) < 4:
            continue
        societe, matiere = row[3].strip(), row[2].strip()
        if not societe or societe.lower().startswith("company"):
            continue
        if "act 36" in societe.lower() or "act no" in row[0].lower():
            continue
        paires.append((societe, matiere))
    return fiche(
        "afrique",
        "Afrique du Sud",
        "DALRRD — Act 36 of 1947",
        "https://www.nda.gov.za/index.php/publication/616-registered-products",
        "Les spécialités restreintes : produit, n° d'enregistrement, matière active, société",
        "Seul le tableur des remèdes restreints est publié en fichier. La liste complète des produits enregistrés est annoncée sur la page, sans fichier. Aucune valeur réglementaire au Maroc.",
        paires,
    )


def echa() -> dict:
    texte = (CACHE / "art95.txt").read_text(encoding="utf-8", errors="ignore").replace("\u00ad", "")
    i = texte.find("1/426")
    body = re.sub(r"\s+", " ", texte[i if i >= 0 else 0 :])
    parts = re.split(r"\d{1,2} (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4}", body)
    paires = []
    for part in parts:
        part = re.sub(r"(\d{1,2})(?=[A-Z])", r"\1 ", part)
        parens = re.findall(r"\(([A-Za-z][^)]{1,60})\)", part)
        communs = [
            p.strip()
            for p in parens
            if not re.match(r"^(Acting|Annex|UK|US|USA|India|CAS|Cat\b)", p.strip(), re.I)
        ]
        if not communs:
            continue
        m = re.search(
            r"(?:Not allocated|\d{3}-\d{3}-\d)\s+\S+\s+(.+?)\s+(?:Substance|Product|Former|AS not|Art\.|RP Participant|Third Party)",
            part,
        )
        if not m:
            continue
        societe = re.sub(r"\s+", " ", m.group(1)).strip(" ,")
        for pays in sorted(PAYS_ECHA, key=len, reverse=True):
            if societe.endswith(" " + pays):
                societe = societe[: -(len(pays) + 1)].strip()
                break
        societe = re.sub(r"^\d{1,2}\s+", "", societe)
        societe = re.sub(r"(Substance|Product|Former|Supplier).*$", "", societe).strip(" ,")
        for pays in sorted(PAYS_ECHA, key=len, reverse=True):
            if societe.endswith(" " + pays):
                societe = societe[: -(len(pays) + 1)].strip()
        if len(societe) < 3 or societe.lower().startswith("supplier"):
            continue
        paires.append((societe, communs[-1]))
    bloc = fiche(
        "echa",
        "Union européenne",
        "ECHA — liste article 95",
        "https://echa.europa.eu/documents/10162/5604808/art95_list_en.pdf/f6dae020-1e04-b1fd-699f-f17a3bc2efc4",
        "Le fournisseur de substance ou de produit biocide autorisé à approvisionner le marché européen",
        "Liste biocide, pas phytosanitaire. Statut du 20 février 2026. Une inscription article 95 n'ouvre aucun droit devant l'ONSSA.",
        paires,
        "https://echa.europa.eu/regulations/biocidal-products-regulation/approved-suppliers",
    )
    return bloc


def garder(id_: str, construire) -> dict:
    """Relève un registre ; si sa source manque ou échoue, garde le dernier relevé publié."""
    try:
        return construire()
    except Exception as exc:  # noqa: BLE001
        precedent = json.loads(SORTIE.read_text(encoding="utf-8")) if SORTIE.exists() else {}
        for r in precedent.get("registres", []):
            if r.get("id") == id_ and r.get("nbSocietes"):
                print(f"  {id_:12} source indisponible ({type(exc).__name__}) : dernier relevé conservé")
                return r
        print(f"  {id_:12} source indisponible ({type(exc).__name__}) : registre vide")
        raise


def vide(id_: str, pays: str, autorite: str, url: str, nomme: str, avertissement: str, page: str | None = None) -> dict:
    return fiche(id_, pays, autorite, url, nomme, avertissement, [], page)


def main() -> None:
    registres = [
        vide(
            "inde",
            "Inde",
            "CIB&RC — PPQS, Registered Products",
            "https://www.ppqs.gov.in/divisions/cib-rc/registered-products",
            "La liste des pesticides enregistrés sous l'Insecticides Act, 1968 (fichier au 30 octobre 2025)",
            "Le portail répond 403 depuis l'extérieur, et cibrc.gov.in ne se résout plus. La page officielle publie trois fichiers (liste générale, section 9(3), substances bannies au 31 mars 2024). Aucune société indienne n'est inventée à partir d'un autre registre.",
        ),
        garder("canada", canada),
        garder("colombie", lambda: fiche(
            "colombie",
            "Colombie",
            "ICA — registros nacionales de plaguicidas",
            complements.CO_URL,
            "Le titulaire colombien et l'ingrédient actif de chaque registre national de plaguicida",
            "PDF public de l'ICA relu fiche par fiche à partir de la classe du produit ; une fiche "
            "illisible est écartée. Le titulaire est souvent la filiale locale d'un fabricant.",
            complements.colombie(),
            "https://www.ica.gov.co/areas/agricola/servicios/regulacion-y-control-de-plaguicidas-quimicos.aspx",
        )),
        garder("argentine", argentine),
        vide(
            "mexique",
            "Mexique",
            "COFEPRIS — consulta de registros sanitarios",
            "https://siipris03.cofepris.gob.mx/Resoluciones/Consultas/ConWebRegPlaguicida.asp",
            "Le registre sanitaire d'un plaguicida, d'un nutriment ou d'une LMR, par société, nom commercial ou numéro",
            "Consultation unitaire, sans fichier ouvert. Le portail gob.mx/cofepris reste la porte d'entrée. Aucune ligne n'est inventée.",
            "https://www.gob.mx/cofepris",
        ),
        garder("malaisie", malaisie),
        vide(
            "thailande",
            "Thaïlande",
            "DOA — สำนักควบคุมพืชและวัสดุการเกษตร",
            "https://www.doa.go.th/ard/?page_id=3030",
            "Les licences de substances dangereuses agricoles (วัตถุอันตราย)",
            "La page des licences répond, le gestionnaire de fichiers ne publie pas de tableur exploitable. Aucune ligne n'est inventée.",
        ),
        garder("nz", lambda: fiche(
            "nz",
            "Nouvelle-Zélande",
            "MPI — ACVM Register",
            "https://eatsafe.nzfsa.govt.nz/web/public/acvm-register",
            "Le titulaire et les ingrédients des produits de protection des cultures (export « Entire register »)",
            "Seuls herbicides, fongicides, insecticides, acaricides, régulateurs, bactéricides, molluscicides "
            "et nématicides sont gardés. Le titulaire peut être un fabricant étranger représenté par un agent néo-zélandais.",
            complements.nouvelle_zelande(),
        )),
        garder("afrique", afrique),
        garder("japon", japon),
        vide(
            "chili",
            "Chili",
            "SAG — plaguicidas autorizados",
            "https://www.sag.gob.cl/ambitos-de-accion/listado-de-plaguicidas-autorizados-prohibidos-restringidos-y-cancelados-etiquetas-y-hds",
            "Les plaguicidas autorisés, restreints, annulés, et les étiquettes",
            "Le rapport complet est un tableau Power BI, la page signale une maintenance. Pas de planilla téléchargée. Aucune ligne n'est inventée.",
            "https://app.powerbi.com/view?r=eyJrIjoiNzAxNTc2MjEtYmQ0ZS00YzZkLWJlMGYtNjZhZDE1YzhmYWViIiwidCI6Ijc3ZWNkYTc1LTU4NjQtNDIyYS1hNTM1LTZlYTY3MTU0MDI5YyIsImMiOjR9",
        ),
        garder("echa", echa),
    ]
    doc = {
        "meta": {
            "genere": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
            "releve": "2026-09-23",
            "avertissement": "Sources officielles ajoutées après vérification d'accès. Une homologation étrangère n'ouvre ni la voie me-too ni une étude en moins devant l'ONSSA.",
        },
        "registres": registres,
    }
    SORTIE.write_text(json.dumps(doc, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"écrit {SORTIE}")
    for r in registres:
        print(f"  {r['id']:12} sociétés {r['nbSocietes']:5}  lignes {r['nbProduits']:6}")


if __name__ == "__main__":
    csv.field_size_limit(10_000_000)
    main()
