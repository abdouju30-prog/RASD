"""
Spectres d'emploi des 21 matières actives PHYTO BEHT.

Même règle que lib/usages.ts + lib/formulation.ts : pour chaque molécule,
tous les usages homologués au Maroc, tous détenteurs confondus — culture,
parasite, dose, DAR. Aucun taux d'efficacité n'est inventé.

Sortie : data/spectres-21-matieres-actives.pdf
"""

from __future__ import annotations

import json
import re
import unicodedata
from collections import defaultdict
from datetime import datetime
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.platypus import (
    CondPageBreak,
    HRFlowable,
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

RACINE = Path(__file__).resolve().parent.parent
DATA_DIR = RACINE / "data"
PDF_SORTIE = DATA_DIR / "spectres-21-matieres-actives.pdf"
DETENTEUR_ID = "phyto-beht"

BLEU_FONCE = colors.HexColor("#0d5c73")
BLEU_CLAIR = colors.HexColor("#eaf3f6")
VERT_LOW = colors.HexColor("#0e6b47")
TEXTE_MAIN = colors.HexColor("#0e1a20")
TEXTE_MUTED = colors.HexColor("#4a5a63")
GRIS_FOND = colors.HexColor("#f7fafb")
GRIS_BORD = colors.HexColor("#dde4e8")
BLANC = colors.white

# Les 21 substances des 36 fiches techniques PHYTO BEHT.
SUBSTANCES = [
    ("2,4-D", "Herbicide"),
    ("Abamectine", "Insecticide-Acridicide"),
    ("Azoxystrobine", "Fongicide"),
    ("Bentazone", "Herbicide"),
    ("Clodinafop-propargyl", "Herbicide"),
    ("Cloquintocet-méxyl", "Safener"),
    ("Cyperméthrine", "Insecticide"),
    ("Dicamba", "Herbicide"),
    ("Difénoconazole", "Fongicide"),
    ("Emamectin benzoate", "Insecticide"),
    ("Fluroxypyr", "Herbicide"),
    ("Fosétyl-Aluminium", "Fongicide"),
    ("Glyphosate", "Herbicide"),
    ("Huile minérale paraffinique", "Insecticide"),
    ("Imidaclopride", "Insecticide"),
    ("Lambda cyhalothrine", "Insecticide"),
    ("Métalaxyl", "Fongicide"),
    ("Oxychlorure de cuivre", "Fongicide"),
    ("Oxyfluorfène", "Herbicide"),
    ("Pyriméthanil", "Fongicide"),
    ("Soufre", "Fongicide"),
]


def xml(s: str | None) -> str:
    return (s or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def fold(s: str) -> str:
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = re.sub(r"[^a-z0-9]+", " ", s.lower())
    return re.sub(r"\s+", " ", s).strip()


def sans_teneurs(nom: str) -> str:
    out: list[str] = []
    profondeur = 0
    for c in nom:
        if c == "(":
            profondeur += 1
        elif c == ")":
            if profondeur > 0:
                profondeur -= 1
            else:
                out.append(" ")
        elif profondeur == 0:
            out.append(c)
    return "".join(out)


def composants(nom: str, repli: str | None = None) -> list[str]:
    parts = [
        x.strip().lstrip("-–,; ").rstrip("-–,; ")
        for x in sans_teneurs(nom).split("/")
    ]
    parts = [p for p in parts if len(p) >= 4]
    uniques = list(dict.fromkeys(parts))
    if uniques:
        return uniques
    r = (repli or nom).strip()
    return [r] if r else []


def base(nom: str) -> str:
    nom = re.sub(r"\s*-\s*(sels?|esters?)\b.*$", "", nom, flags=re.I)
    nom = re.sub(
        r"\s*-\s*(2-éthylhexyl|éthylhexyl|isoctylique)\b.*$", "", nom, flags=re.I
    )
    return nom.strip()


def molecules(nom: str, repli: str | None = None) -> list[str]:
    return list(dict.fromkeys(base(c) for c in composants(nom, repli) if base(c)))


def porte(mol: str, cible: str) -> bool:
    """Appariement strict, comme le Set de lib/usages.ts — pas de sous-chaîne."""
    fm, fc = fold(mol), fold(cible)
    fm = re.sub(r"\bsafener\b", "", fm).strip()
    fc = re.sub(r"\bsafener\b", "", fc).strip()
    if fm == fc:
        return True
    if fc == "oxychlorure de cuivre" and fm.endswith("oxychlorure de cuivre"):
        return True
    if fc == "emamectin benzoate" and fm in {
        "emamectin benzoate",
        "emamectine benzoate",
    }:
        return True
    if fc.startswith("cloquintocet") and fm.startswith("cloquintocet"):
        return True
    return False


class NumerotationCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        total = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_number(total)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_page_number(self, total: int) -> None:
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(TEXTE_MUTED)
        if self._pageNumber > 1:
            self.drawString(
                16 * mm,
                287 * mm,
                "Homologa  ·  Spectres d'emploi  ·  21 matières actives PHYTO BEHT",
            )
            self.setStrokeColor(GRIS_BORD)
            self.setLineWidth(0.5)
            self.line(16 * mm, 284 * mm, 194 * mm, 284 * mm)
        self.setStrokeColor(GRIS_BORD)
        self.setLineWidth(0.5)
        self.line(16 * mm, 12 * mm, 194 * mm, 12 * mm)
        self.drawString(
            16 * mm,
            7 * mm,
            "Index ONSSA  ·  tous détenteurs  ·  aucun taux d'efficacité inventé",
        )
        self.drawRightString(194 * mm, 7 * mm, f"Page {self._pageNumber} / {total}")
        self.restoreState()


def spectre_de(index: dict, cible: str, detenteur_id: str) -> dict:
    lignes: set[str] = set()
    mols_vues: set[str] = set()
    categorie = None
    for m in index["matieres"]:
        mols = molecules(m["nom"], m.get("molecule") or None)
        if any(porte(mol, cible) for mol in mols):
            lignes.add(m["id"])
            for mol in mols:
                if porte(mol, cible):
                    mols_vues.add(mol)
            if categorie is None:
                categorie = m.get("categorie")

    par: dict[str, dict] = {}
    produits: set[str] = set()
    detenteurs: set[str] = set()
    vos: set[str] = set()
    vos_produits: list[str] = []

    for p in index["portefeuille"]:
        if not any(i in lignes for i in p.get("matieresActivesIds") or []):
            continue
        produits.add(p["nomCommercial"])
        detenteurs.add(p["detenteur"])
        if p.get("detenteurId") == detenteur_id and p["nomCommercial"] not in vos_produits:
            vos_produits.append(p["nomCommercial"])

        for u in p.get("usages") or []:
            culture, cible_u = u.get("culture"), u.get("cible")
            if not culture or not cible_u:
                continue
            k = f"{culture} / {cible_u}"
            if p.get("detenteurId") == detenteur_id:
                vos.add(k)
            e = par.get(k)
            if e is None:
                e = {
                    "culture": culture,
                    "cible": cible_u,
                    "doses": [],
                    "dar": [],
                    "nbApplications": [],
                    "produits": [],
                    "detenteurs": [],
                }
                par[k] = e

            def pousser(lst: list, v: str | None) -> None:
                x = (v or "").strip()
                if x and x not in lst:
                    lst.append(x)

            pousser(e["doses"], u.get("dose"))
            pousser(e["dar"], u.get("dar"))
            pousser(e["nbApplications"], u.get("nbAppl"))
            if p["nomCommercial"] not in e["produits"]:
                e["produits"].append(p["nomCommercial"])
            if p["detenteur"] not in e["detenteurs"]:
                e["detenteurs"].append(p["detenteur"])

    emplois = sorted(
        par.values(),
        key=lambda e: (
            -len(e["produits"]),
            e["culture"],
            e["cible"],
        ),
    )
    cultures = sorted({e["culture"] for e in emplois}, key=lambda x: x.lower())
    cibles = sorted({e["cible"] for e in emplois}, key=lambda x: x.lower())
    return {
        "molecules": sorted(mols_vues),
        "emplois": emplois,
        "cultures": cultures,
        "cibles": cibles,
        "nbProduits": len(produits),
        "nbDetenteurs": len(detenteurs),
        "vosEmplois": vos,
        "vosProduits": vos_produits,
        "categorie": categorie,
        "nbLignesIndex": len(lignes),
    }


def par_culture(emplois: list[dict]) -> list[tuple[str, list[dict]]]:
    par: dict[str, list[dict]] = defaultdict(list)
    for e in emplois:
        par[e["culture"]].append(e)
    return sorted(par.items(), key=lambda kv: (-len(kv[1]), kv[0].lower()))


def valeurs(v: list[str], max_n: int = 2) -> str:
    if not v:
        return "—"
    shown = " · ".join(v[:max_n])
    if len(v) > max_n:
        shown += f" +{len(v) - max_n}"
    return shown


def styles_rapport():
    base = getSampleStyleSheet()
    return {
        "surtitre": ParagraphStyle(
            "SurTitre",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=9,
            textColor=TEXTE_MUTED,
            spaceAfter=4,
        ),
        "titre": ParagraphStyle(
            "TitreRapport",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=20,
            leading=24,
            textColor=BLEU_FONCE,
        ),
        "sous": ParagraphStyle(
            "SousTitre",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=9.5,
            leading=13,
            textColor=TEXTE_MUTED,
        ),
        "h2": ParagraphStyle(
            "H2",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=13,
            leading=17,
            textColor=BLEU_FONCE,
            spaceBefore=4,
            spaceAfter=4,
        ),
        "h3": ParagraphStyle(
            "H3",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=11,
            leading=14,
            textColor=BLEU_FONCE,
            spaceBefore=2,
            spaceAfter=2,
        ),
        "corps": ParagraphStyle(
            "Corps",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=8.5,
            leading=12,
            textColor=TEXTE_MAIN,
        ),
        "cell": ParagraphStyle(
            "Cell",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=7.5,
            leading=10,
            textColor=TEXTE_MAIN,
        ),
        "cell_b": ParagraphStyle(
            "CellB",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=7.5,
            leading=10,
            textColor=TEXTE_MAIN,
        ),
        "head": ParagraphStyle(
            "Head",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=7.5,
            leading=10,
            textColor=BLANC,
        ),
        "cult": ParagraphStyle(
            "Cult",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=8,
            leading=11,
            textColor=BLEU_FONCE,
        ),
        "muted": ParagraphStyle(
            "Muted",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=8,
            leading=11,
            textColor=TEXTE_MUTED,
        ),
    }


def tableau_usages(s, spectre: dict, emplois: list[dict]) -> Table:
    header = [
        Paragraph("Parasite", s["head"]),
        Paragraph("Dose", s["head"]),
        Paragraph("DAR", s["head"]),
        Paragraph("Appl.", s["head"]),
        Paragraph("Prod.", s["head"]),
        Paragraph("PHYTO BEHT", s["head"]),
    ]
    data = [header]
    spans: list[tuple] = []
    row = 1
    culture_rows: list[int] = []
    vous_rows: list[int] = []

    for culture, group in par_culture(emplois):
        data.append(
            [
                Paragraph(xml(culture) + f"  —  {len(group)} usage(s)", s["cult"]),
                "",
                "",
                "",
                "",
                "",
            ]
        )
        spans.append(row)
        culture_rows.append(row)
        row += 1
        for e in sorted(group, key=lambda x: x["cible"].lower()):
            k = f"{e['culture']} / {e['cible']}"
            vous = k in spectre["vosEmplois"]
            if vous:
                vous_rows.append(row)
            marque = "● oui" if vous else "—"
            data.append(
                [
                    Paragraph(xml(e["cible"]), s["cell"]),
                    Paragraph(xml(valeurs(e["doses"])), s["cell"]),
                    Paragraph(xml(valeurs(e["dar"])), s["cell"]),
                    Paragraph(xml(valeurs(e["nbApplications"])), s["cell"]),
                    Paragraph(str(len(e["produits"])), s["cell"]),
                    Paragraph(marque, s["cell_b"] if vous else s["cell"]),
                ]
            )
            row += 1

    col = [58 * mm, 42 * mm, 18 * mm, 16 * mm, 16 * mm, 28 * mm]
    t = Table(data, colWidths=col, repeatRows=1)
    cmds = [
        ("BACKGROUND", (0, 0), (-1, 0), BLEU_FONCE),
        ("TEXTCOLOR", (0, 0), (-1, 0), BLANC),
        ("BOX", (0, 0), (-1, -1), 0.4, GRIS_BORD),
        ("INNERGRID", (0, 0), (-1, -1), 0.3, GRIS_BORD),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ALIGN", (2, 1), (-1, -1), "RIGHT"),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [BLANC, GRIS_FOND]),
    ]
    for r in spans:
        cmds.append(("SPAN", (0, r), (-1, r)))
    for r in culture_rows:
        cmds.append(("BACKGROUND", (0, r), (-1, r), BLEU_CLAIR))
        cmds.append(("ALIGN", (0, r), (-1, r), "LEFT"))
    for r in vous_rows:
        cmds.append(("TEXTCOLOR", (-1, r), (-1, r), VERT_LOW))
    t.setStyle(TableStyle(cmds))
    return t


def generer_pdf_spectres() -> Path:
    print("-> Génération du PDF des 21 spectres d'emploi...")
    with open(DATA_DIR / "onssa.json", encoding="utf-8") as f:
        index = json.load(f)

    meta = index.get("meta", {})
    date_index = (meta.get("genere") or "")[:10]
    s = styles_rapport()
    story = []

    fiches: list[tuple[str, str, dict]] = []
    for nom, cat_defaut in SUBSTANCES:
        sp = spectre_de(index, nom, DETENTEUR_ID)
        fiches.append((nom, sp.get("categorie") or cat_defaut, sp))

    # ── Couverture ──────────────────────────────────────────────────────────
    story.append(Paragraph("HOMOLOGA · SOURCING / DÉVELOPPEMENT", s["surtitre"]))
    story.append(Paragraph("Spectres d'emploi — 21 matières actives", s["titre"]))
    story.append(Spacer(1, 4))
    story.append(
        Paragraph(
            f"Portefeuille PHYTO BEHT · 36 fiches techniques · index ONSSA du "
            f"{xml(date_index) or '—'} · {meta.get('nbProduitsIndex', 1413)} produits, "
            f"{meta.get('nbDetenteurs', 76)} détenteurs.",
            s["sous"],
        )
    )
    story.append(Spacer(1, 8))
    story.append(HRFlowable(width="100%", thickness=1.5, color=BLEU_FONCE, spaceAfter=10))
    story.append(
        Paragraph(
            "Méthode identique à la fiche matière de Homologa "
            "(<font color='#0d5c73'>/sourcing</font> → fiche molécule → spectre d'emploi) : "
            "on part de la <b>molécule</b>, pas de la ligne d'index. Un mélange qui porte "
            "la substance compte comme un usage de cette substance. Tous les détenteurs "
            "marocains sont agrégés. Les lignes marquées <font color='#0e6b47'><b>● oui</b></font> "
            "sont déjà revendiquées par PHYTO BEHT.",
            s["corps"],
        )
    )
    story.append(Spacer(1, 6))
    story.append(
        Paragraph(
            "<b>Aucun registre public ne publie de taux d'efficacité.</b> "
            "Ce PDF n'en invente aucun. Ce qui est opposable devant l'ONSSA — "
            "culture, parasite, dose, DAR, nombre d'applications — figure en entier.",
            s["muted"],
        )
    )
    story.append(Spacer(1, 12))

    tot_usages = sum(len(sp["emplois"]) for _, _, sp in fiches)
    tot_cult = len({c for _, _, sp in fiches for c in sp["cultures"]})
    tot_cibles = len({c for _, _, sp in fiches for c in sp["cibles"]})
    kpi = [[
        Paragraph(
            f"<font size='16'><b>{len(fiches)}</b></font><br/>"
            f"<font size='8' color='#4a5a63'>Matières actives</font>",
            s["cell"],
        ),
        Paragraph(
            f"<font size='16'><b>{tot_usages}</b></font><br/>"
            f"<font size='8' color='#4a5a63'>Usages homologués</font>",
            s["cell"],
        ),
        Paragraph(
            f"<font size='16'><b>{tot_cult}</b></font><br/>"
            f"<font size='8' color='#4a5a63'>Cultures distinctes</font>",
            s["cell"],
        ),
        Paragraph(
            f"<font size='16'><b>{tot_cibles}</b></font><br/>"
            f"<font size='8' color='#4a5a63'>Parasites distincts</font>",
            s["cell"],
        ),
    ]]
    t_kpi = Table(kpi, colWidths=[44.5 * mm] * 4)
    t_kpi.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), GRIS_FOND),
                ("BOX", (0, 0), (-1, -1), 0.5, GRIS_BORD),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, GRIS_BORD),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    story.append(t_kpi)
    story.append(Spacer(1, 14))
    story.append(Paragraph("1. Vue d'ensemble", s["h2"]))

    recap = [[
        Paragraph("#", s["head"]),
        Paragraph("Matière active", s["head"]),
        Paragraph("Catégorie", s["head"]),
        Paragraph("Cult.", s["head"]),
        Paragraph("Paras.", s["head"]),
        Paragraph("Usages", s["head"]),
        Paragraph("Prod. Maroc", s["head"]),
        Paragraph("Dont vous", s["head"]),
    ]]
    for i, (nom, cat, sp) in enumerate(fiches, 1):
        recap.append([
            Paragraph(str(i), s["cell"]),
            Paragraph(xml(nom), s["cell_b"]),
            Paragraph(xml(cat or "—"), s["cell"]),
            Paragraph(str(len(sp["cultures"])), s["cell"]),
            Paragraph(str(len(sp["cibles"])), s["cell"]),
            Paragraph(str(len(sp["emplois"])), s["cell"]),
            Paragraph(str(sp["nbProduits"]), s["cell"]),
            Paragraph(str(len(sp["vosProduits"])), s["cell"]),
        ])
    t_r = Table(
        recap,
        colWidths=[10 * mm, 48 * mm, 32 * mm, 16 * mm, 18 * mm, 18 * mm, 22 * mm, 14 * mm],
        repeatRows=1,
    )
    t_r.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), BLEU_FONCE),
                ("BOX", (0, 0), (-1, -1), 0.4, GRIS_BORD),
                ("INNERGRID", (0, 0), (-1, -1), 0.3, GRIS_BORD),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("ALIGN", (3, 1), (-1, -1), "RIGHT"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [BLANC, GRIS_FOND]),
                ("TOPPADDING", (0, 0), (-1, -1), 3.5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3.5),
                ("LEFTPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    story.append(t_r)
    story.append(Spacer(1, 8))
    story.append(
        Paragraph(
            "« Dont vous » = spécialités PHYTO BEHT portant la molécule. "
            "« Prod. Maroc » = toutes les spécialités de l'index qui la portent, "
            "mélanges compris.",
            s["muted"],
        )
    )

    # ── Fiches ──────────────────────────────────────────────────────────────
    story.append(PageBreak())
    story.append(Paragraph("2. Spectre détaillé par matière active", s["h2"]))
    story.append(
        Paragraph(
            "Chaque fiche reprend le spectre d'emploi Homologa : cultures, parasites, "
            "doses et DAR relevés à l'index. Les usages PHYTO BEHT sont marqués ● oui.",
            s["sous"],
        )
    )
    story.append(Spacer(1, 8))

    for i, (nom, cat, sp) in enumerate(fiches, 1):
        bloc = []
        bloc.append(CondPageBreak(55 * mm))
        titre = f"{i}. {nom}"
        if sp["molecules"] and sp["molecules"] != [nom]:
            titre += f"  ·  {', '.join(sp['molecules'])}"
        bloc.append(Paragraph(xml(titre), s["h3"]))
        vos = ", ".join(sp["vosProduits"]) or "aucun produit PHYTO BEHT"
        bloc.append(
            Paragraph(
                f"{xml(cat or '—')}  ·  {len(sp['cultures'])} culture(s)  ·  "
                f"{len(sp['cibles'])} parasite(s)  ·  {len(sp['emplois'])} usage(s)  ·  "
                f"{sp['nbProduits']} produit(s) chez {sp['nbDetenteurs']} détenteur(s)<br/>"
                f"<font color='#4a5a63'>PHYTO BEHT : {xml(vos)}</font>",
                s["muted"],
            )
        )
        if sp["cibles"]:
            apercu = "  ·  ".join(sp["cibles"][:18])
            extra = f"  ·  +{len(sp['cibles']) - 18}" if len(sp["cibles"]) > 18 else ""
            bloc.append(Paragraph(f"Parasites : {xml(apercu)}{xml(extra)}", s["corps"]))
        bloc.append(Spacer(1, 4))
        if sp["emplois"]:
            bloc.append(tableau_usages(s, sp, sp["emplois"]))
        else:
            bloc.append(
                Paragraph(
                    "Aucun usage homologué au Maroc pour cette molécule dans l'index.",
                    s["muted"],
                )
            )
        bloc.append(Spacer(1, 12))
        keepable = [x for x in bloc if x is not None]
        if len(sp["emplois"]) <= 8:
            story.append(KeepTogether(keepable))
        else:
            story.extend(keepable)

    story.append(Spacer(1, 8))
    story.append(HRFlowable(width="100%", thickness=0.6, color=GRIS_BORD, spaceAfter=6))
    story.append(
        Paragraph(
            f"Document généré le {datetime.now().strftime('%d/%m/%Y')} par Homologa "
            f"à partir de {xml(meta.get('source', 'FICHIERS PHYTO.xlsx'))} "
            f"(import {xml(date_index) or '—'}). "
            "Les doses sont reproduites telles qu'écrites à l'index, sans normalisation.",
            s["muted"],
        )
    )

    # Filter accidental Nones
    story = [x for x in story if x is not None]

    doc = SimpleDocTemplate(
        str(PDF_SORTIE),
        pagesize=A4,
        leftMargin=16 * mm,
        rightMargin=16 * mm,
        topMargin=18 * mm,
        bottomMargin=16 * mm,
        title="Homologa — Spectres d'emploi, 21 matières actives PHYTO BEHT",
        author="Homologa",
        subject="Spectres d'emploi ONSSA — portefeuille PHYTO BEHT",
    )
    doc.build(story, canvasmaker=NumerotationCanvas)
    print(f"  [ok] {PDF_SORTIE}  ({PDF_SORTIE.stat().st_size // 1024} Ko)")
    return PDF_SORTIE


if __name__ == "__main__":
    generer_pdf_spectres()
