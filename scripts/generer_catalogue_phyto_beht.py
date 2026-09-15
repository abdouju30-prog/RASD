"""
Recompose le catalogue PHYTOBEHT dans la maquette du PDF transmis :
couverture, sommaire, fiches compactes (deux par page) et annexe complète
des usages. Les deux AMM expirées au 15/09/2026 sont exclues.
"""

from __future__ import annotations

import json
import re
import unicodedata
from collections import Counter
from datetime import date, datetime
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph, Table, TableStyle
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT

ROOT = Path("/workspace")
DATA = ROOT / "data"
ASSETS = Path("/tmp/catalogue_assets")
OUT = DATA / "Catalogue_PHYTOBEHT_2026_complet.pdf"
DATE_CATALOGUE = date(2026, 9, 15)

NAVY = colors.HexColor("#243f8f")
GREEN = colors.HexColor("#087f3e")
ORANGE = colors.HexColor("#c16b08")
YELLOW = colors.HexColor("#f2d000")
PALE = colors.HexColor("#f3f8f5")
PALE_BLUE = colors.HexColor("#f4f7fb")
TEXT = colors.HexColor("#26375e")
MUTED = colors.HexColor("#8290ae")
LINE = colors.HexColor("#dbe2ec")
WHITE = colors.white

CATEGORY_ORDER = ["Fongicide", "Herbicide", "Insecticide"]
CATEGORY_LABEL = {
    "Fongicide": "FONGICIDES",
    "Herbicide": "HERBICIDES",
    "Insecticide": "INSECTICIDES",
    "Insecticide-Acridicide": "INSECTICIDES",
}
CATEGORY_COLOR = {
    "Fongicide": GREEN,
    "Herbicide": ORANGE,
    "Insecticide": NAVY,
    "Insecticide-Acridicide": NAVY,
}

# Visuels extraits du PDF fourni. Les nouvelles fiches restent honnêtement
# signalées comme sans visuel fourni au lieu de réutiliser une mauvaise photo.
PHOTO = {
    "ARMETIL C": "armetil_c.png",
    "BELLIT": "bellit.png",
    "COBELL'S": "cobells.png",
    "COBRE KEY": "cobre_key.png",
    "HELLISH": "hellish.png",
    "LOVIT FLASH": "lovit_flash.png",
    "SCANGOLD 250": "scangold_250.png",
    "ALTO-DICOT 860": "alto_dicot_860.png",
    "BARCLAY BARBARIAN SUPER 360": "barclay_barbarian_super_360.png",
    "BARCLAY GLYFAST 450": "barclay_glyfast_450.png",
    "HDIDANE ULTRA": "hdidane_ultra.png",
    "NATAL 480": "natal_480.png",
    "TWESS": "twess.png",
    "TWIN-PRO": "twin_pro.png",
    "BRIGHT SC": "bright_sc.png",
    "MURFOTOX PLUS": "murfotox_plus.png",
    "PROKIM": "prokim.png",
    "SOLTAN 500 SC": "soltan_500_sc.png",
    "VAPCOMIC 1,8% EC": "vapcomic.png",
}


def esc(value: object) -> str:
    return (
        str(value or "")
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


def fold(value: str) -> str:
    value = unicodedata.normalize("NFKD", value)
    value = "".join(c for c in value if not unicodedata.combining(c))
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9]+", " ", value.lower())).strip()


def sans_teneurs(value: str) -> str:
    out = []
    depth = 0
    for char in value:
        if char == "(":
            depth += 1
        elif char == ")":
            depth = max(0, depth - 1)
        elif depth == 0:
            out.append(char)
    return "".join(out)


def molecules(value: str) -> list[str]:
    result = []
    for part in sans_teneurs(value).split("/"):
        part = re.sub(r"\s*-\s*(sels?|esters?)\b.*$", "", part, flags=re.I)
        part = part.strip(" -–,;")
        if len(part) >= 4 and part not in result:
            result.append(part)
    return result


def fmt_date(value: str | None) -> str:
    if not value:
        return "Non renseignée"
    try:
        return datetime.strptime(value, "%Y-%m-%d").strftime("%d/%m/%Y")
    except ValueError:
        return value


def fmt(value: str | None, fallback: str = "—") -> str:
    value = (value or "").strip()
    return value or fallback


def load_data() -> tuple[dict, list[dict], list[str]]:
    with open(DATA / "onssa.json", encoding="utf-8") as file:
        index = json.load(file)
    products = [
        p for p in index["portefeuille"]
        if p.get("detenteurId") == "phyto-beht"
        and (
            not p.get("expiration")
            or date.fromisoformat(p["expiration"]) >= DATE_CATALOGUE
        )
    ]
    products.sort(
        key=lambda p: (
            CATEGORY_ORDER.index(
                "Insecticide" if p.get("categorie") == "Insecticide-Acridicide"
                else p.get("categorie")
            ),
            p["nomCommercial"].lower(),
        )
    )
    substances = sorted(
        {
            molecule
            for p in products
            for composition in p.get("matieresActives") or []
            for molecule in molecules(composition)
        },
        key=fold,
    )
    return index, products, substances


def register_fonts() -> tuple[str, str]:
    regular = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
    bold = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
    if Path(regular).exists() and Path(bold).exists():
        pdfmetrics.registerFont(TTFont("CatalogueSans", regular))
        pdfmetrics.registerFont(TTFont("CatalogueSansBold", bold))
        return "CatalogueSans", "CatalogueSansBold"
    return "Helvetica", "Helvetica-Bold"


def draw_top_bar(c: canvas.Canvas, y: float = 838) -> None:
    colors_bar = [ORANGE, YELLOW, GREEN, NAVY]
    width = A4[0] / len(colors_bar)
    for i, color in enumerate(colors_bar):
        c.setFillColor(color)
        c.rect(i * width, y, width + 0.5, 4, stroke=0, fill=1)


def draw_logo(c: canvas.Canvas, x: float, y: float, w: float = 130) -> None:
    path = ASSETS / "logo.png"
    if not path.exists():
        c.setFillColor(NAVY)
        c.setFont("CatalogueSansBold", 19)
        c.drawString(x, y + 12, "PHYTO")
        c.setFillColor(GREEN)
        c.drawString(x + 58, y + 12, "BEHT")
        return
    image = ImageReader(str(path))
    iw, ih = image.getSize()
    h = w * ih / iw
    c.drawImage(image, x, y, width=w, height=h, mask="auto", preserveAspectRatio=True)


def draw_contain(c: canvas.Canvas, path: Path, x: float, y: float, w: float, h: float) -> None:
    if not path.is_file():
        c.setFillColor(PALE)
        c.roundRect(x, y, w, h, 5, stroke=0, fill=1)
        c.setFillColor(MUTED)
        c.setFont("CatalogueSansBold", 6.5)
        c.drawCentredString(x + w / 2, y + h / 2 + 4, "VISUEL")
        c.drawCentredString(x + w / 2, y + h / 2 - 6, "NON FOURNI")
        return
    image = ImageReader(str(path))
    iw, ih = image.getSize()
    scale = min(w / iw, h / ih)
    dw, dh = iw * scale, ih * scale
    c.drawImage(
        image,
        x + (w - dw) / 2,
        y + (h - dh) / 2,
        width=dw,
        height=dh,
        mask="auto",
        preserveAspectRatio=True,
    )


def para(text: str, x: float, y: float, w: float, h: float, style: ParagraphStyle) -> None:
    p = Paragraph(text, style)
    p.wrapOn(_CANVAS, w, h)
    p.drawOn(_CANVAS, x, y + h - p.height)


def draw_footer(c: canvas.Canvas, page: int, total: int, small: bool = False) -> None:
    c.setStrokeColor(LINE)
    c.setLineWidth(0.5)
    c.line(56, 38, 539, 38)
    c.setFont("CatalogueSans", 7.2)
    c.setFillColor(MUTED)
    c.drawString(
        56, 25,
        "PHYTOBEHT Sarl  ·  Catalogue produits 2026  ·  Index ONSSA",
    )
    c.setFillColor(GREEN if not small else NAVY)
    c.setFont("CatalogueSansBold", 8)
    c.drawRightString(539, 25, str(page))


def draw_cover(c: canvas.Canvas, index: dict, products: list[dict], substances: list[str], font: str, bold: str) -> None:
    draw_top_bar(c)
    draw_logo(c, 63, 710, 178)
    c.setFillColor(NAVY)
    c.setFont(bold, 34)
    c.drawString(63, 586, "CATALOGUE")
    c.setFillColor(GREEN)
    c.setFont(font, 34)
    c.drawString(63, 548, "PRODUITS")
    c.setStrokeColor(ORANGE)
    c.setLineWidth(4)
    c.line(63, 526, 148, 526)
    c.setFillColor(MUTED)
    c.setFont(font, 12)
    c.drawString(63, 494, "Phytosanitaires homologués au Maroc")
    c.setFont(font, 9)
    c.drawString(63, 472, "Fongicides · Herbicides · Insecticides")

    # Cinq visuels de couverture repris de la maquette fournie.
    cover_names = ["cover_1.png", "cover_2.png", "cover_3.png", "cover_4.png", "cover_5.png"]
    for i, name in enumerate(cover_names):
        draw_contain(c, ASSETS / name, 63 + i * 94, 320, 65, 118)

    counts = Counter(
        "Insecticide" if p.get("categorie") == "Insecticide-Acridicide"
        else p.get("categorie")
        for p in products
    )
    for x, category, color in [
        (63, "Fongicide", GREEN),
        (221, "Herbicide", ORANGE),
        (379, "Insecticide", NAVY),
    ]:
        c.setFillColor(color)
        c.rect(x, 270, 25, 4, stroke=0, fill=1)
        c.setFont(font, 27)
        c.drawString(x, 207, str(counts[category]))
        c.setFont(bold, 7.5)
        c.drawString(x, 187, CATEGORY_LABEL[category])

    c.setFillColor(NAVY)
    c.rect(0, 0, A4[0], 137, stroke=0, fill=1)
    draw_top_bar(c, 137)
    c.setFillColor(WHITE)
    c.setFont(bold, 13)
    c.drawString(63, 99, "PHYTOBEHT Sarl")
    c.setFont(font, 8)
    c.setFillColor(colors.HexColor("#b7c7ed"))
    c.drawString(63, 79, "Importateur et distributeur exclusif au Maroc")
    c.drawString(63, 57, "368, Avenue El Moukaouama — Sidi Maârouf, 20280 Casablanca")
    c.drawString(63, 40, "Tél. +212 5 22 97 40 04/05   ·   phytobeht@gmail.com")
    c.drawRightString(539, 40, "Édition complète du 15 septembre 2026")
    c.showPage()


def draw_toc(c: canvas.Canvas, products: list[dict], substances: list[str], font: str, bold: str) -> None:
    draw_logo(c, 63, 780, 126)
    c.setFillColor(MUTED)
    c.setFont(bold, 10)
    c.drawRightString(539, 792, "S O M M A I R E")
    y = 749
    for category_index, category in enumerate(CATEGORY_ORDER):
        category_products = [
            p for p in products
            if ("Insecticide" if p.get("categorie") == "Insecticide-Acridicide"
                else p.get("categorie")) == category
        ]
        color = CATEGORY_COLOR[category]
        c.setFillColor(color)
        c.rect(63, y - 3, 7, 15, stroke=0, fill=1)
        c.setFillColor(color)
        c.setFont(bold, 10)
        c.drawString(83, y, CATEGORY_LABEL[category])
        y -= 24
        for i, product in enumerate(category_products):
            page = 4 + products.index(product) // 2
            active = " / ".join(product.get("matieresActives") or ["—"])
            c.setFillColor(TEXT)
            c.setFont(bold, 8.7)
            c.drawString(83, y, product["nomCommercial"])
            c.setFillColor(MUTED)
            c.setFont(font, 7.3)
            # Keep the compact catalogue line readable without overflowing.
            active_short = active if len(active) <= 69 else active[:66] + "..."
            c.drawString(270, y, active_short)
            c.setFillColor(color)
            c.setFont(bold, 8)
            c.drawRightString(539, y, str(page))
            c.setStrokeColor(LINE)
            c.setLineWidth(0.5)
            c.line(83, y - 6, 539, y - 6)
            y -= 19
        y -= 16
        # Les 36 références nécessitent une seconde page de sommaire dans la
        # même présentation. Le détail des insecticides commence page 3.
        if category_index == 1:
            c.setFillColor(MUTED)
            c.setFont(font, 7.3)
            c.drawString(
                63, 57,
                "Suite du sommaire page suivante · les pages produit commencent page 4.",
            )
            c.showPage()
            draw_logo(c, 63, 780, 126)
            c.setFillColor(MUTED)
            c.setFont(bold, 10)
            c.drawRightString(539, 792, "S O M M A I R E  ·  S U I T E")
            y = 749

    c.setFillColor(MUTED)
    c.setFont(font, 7.3)
    c.drawString(
        63, 57,
        f"Catalogue actif : {len(products)} produits · {len(substances)} matières actives · "
        "doses, DAR et applications repris de l'index ONSSA.",
    )
    c.drawString(
        63, 44,
        "AL-KATIL et ATLANTIC sont exclus : leurs homologations ont expiré en juillet et août 2026.",
    )
    c.showPage()


def draw_label_value(c: canvas.Canvas, label: str, value: str, x: float, y: float, font: str, bold: str, width: float = 145) -> None:
    c.setFillColor(MUTED)
    c.setFont(font, 6.1)
    c.drawString(x, y, label.upper())
    c.setFillColor(TEXT)
    c.setFont(bold, 8.2)
    while len(value) > 3 and pdfmetrics.stringWidth(value, bold, 8.2) > width:
        value = value[:-4].rstrip() + "..."
    c.drawString(x, y - 13, value)


def draw_product_card(
    c: canvas.Canvas,
    product: dict,
    x: float,
    y: float,
    font: str,
    bold: str,
    number: int,
) -> None:
    category = product.get("categorie") or "Produit"
    display_category = "Insecticide" if category == "Insecticide-Acridicide" else category
    color = CATEGORY_COLOR.get(category, NAVY)
    # 483 x 319 pt, proche des cartes du PDF transmis.
    c.setStrokeColor(LINE)
    c.setLineWidth(0.8)
    c.setFillColor(WHITE)
    c.roundRect(x, y, 483, 319, 11, stroke=1, fill=1)
    c.setFillColor(color)
    c.roundRect(x, y, 12, 319, 11, stroke=0, fill=1)
    c.rect(x + 6, y, 6, 319, stroke=0, fill=1)

    image_x, image_y, image_w, image_h = x + 23, y + 17, 146, 286
    c.setFillColor(PALE if color == GREEN else PALE_BLUE)
    c.roundRect(image_x, image_y, image_w, image_h, 6, stroke=0, fill=1)
    draw_contain(c, ASSETS / PHOTO.get(product["nomCommercial"], ""), image_x + 10, image_y + 8, image_w - 20, image_h - 16)

    tx = x + 195
    c.setFillColor(colors.Color(color.red, color.green, color.blue, alpha=0.1))
    c.roundRect(tx, y + 270, 68, 16, 8, stroke=0, fill=1)
    c.setFillColor(color)
    c.setFont(bold, 6.4)
    c.drawCentredString(tx + 34, y + 276, display_category.upper())
    c.setFillColor(NAVY)
    c.setFont(bold, 20)
    c.drawString(tx, y + 237, product["nomCommercial"])
    compositions = " / ".join(product.get("matieresActives") or ["Non renseignée"])
    c.setFillColor(GREEN)
    c.setFont(bold, 7.7)
    composition = compositions
    while len(composition) > 3 and pdfmetrics.stringWidth(composition, bold, 7.7) > 265:
        composition = composition[:-4].rstrip() + "..."
    c.drawString(tx, y + 217, composition)
    c.setStrokeColor(LINE)
    c.setLineWidth(1)
    c.line(tx, y + 198, x + 460, y + 198)

    usages = product.get("usages") or []
    first = usages[0] if usages else {}
    draw_label_value(c, "Formulation", fmt(product.get("formulation")), tx, y + 180, font, bold, 130)
    draw_label_value(c, "N° homologation", fmt(product.get("amm")), tx + 142, y + 180, font, bold, 125)
    draw_label_value(c, "Culture", fmt(first.get("culture")), tx, y + 132, font, bold, 130)
    draw_label_value(c, "Cible", fmt(first.get("cible")), tx + 142, y + 132, font, bold, 125)
    draw_label_value(c, "Valable jusqu'au", fmt_date(product.get("expiration")), tx, y + 84, font, bold, 130)
    draw_label_value(c, "Classement", fmt(product.get("tox"), "Non renseigné"), tx + 142, y + 84, font, bold, 125)
    draw_label_value(c, "Fournisseur", " · ".join(product.get("fournisseurs") or ["Non renseigné"]), tx, y + 36, font, bold, 265)

    strip_y = y + 10
    c.setFillColor(color)
    c.roundRect(tx, strip_y, 265, 34, 6, stroke=0, fill=1)
    values = [
        ("DOSE", fmt(first.get("dose"))),
        ("DAR", fmt(first.get("dar")) + ("" if fmt(first.get("dar")) in {"—", "Non requis"} else " j")),
        ("APPLICATIONS", fmt(first.get("nbAppl"))),
    ]
    for i, (label, value) in enumerate(values):
        xx = tx + i * 88.3
        if i:
            c.setStrokeColor(colors.Color(1, 1, 1, alpha=0.35))
            c.line(xx, strip_y + 6, xx, strip_y + 28)
        c.setFillColor(colors.Color(1, 1, 1, alpha=0.7))
        c.setFont(font, 5.8)
        c.drawCentredString(xx + 44, strip_y + 22, label)
        c.setFillColor(WHITE)
        c.setFont(bold, 8)
        value = value if len(value) <= 17 else value[:14] + "..."
        c.drawCentredString(xx + 44, strip_y + 9, value)

    if len(usages) > 1:
        c.setFillColor(MUTED)
        c.setFont(font, 6.4)
        c.drawString(tx, y + 1, f"+ {len(usages) - 1} autre(s) emploi(s) ONSSA détaillé(s) en annexe")


def draw_product_pages(c: canvas.Canvas, products: list[dict], font: str, bold: str) -> None:
    page = 4
    for start in range(0, len(products), 2):
        categories = {
            "Insecticide" if p.get("categorie") == "Insecticide-Acridicide" else p.get("categorie")
            for p in products[start:start + 2]
        }
        first_category = products[start].get("categorie")
        draw_logo(c, 63, 780, 126)
        c.setFillColor(MUTED)
        c.setFont(bold, 8.2)
        category_title = " / ".join(
            CATEGORY_LABEL.get(category, "PRODUITS")
            for category in CATEGORY_ORDER
            if category in categories
        )
        if len(categories) == 1:
            c.setFillColor(CATEGORY_COLOR.get(first_category, NAVY))
            c.rect(470, 789, 7, 7, stroke=0, fill=1)
            c.setFillColor(MUTED)
            c.drawString(483, 789, category_title)
        else:
            c.drawRightString(539, 789, category_title)
        c.setStrokeColor(LINE)
        c.line(56, 775, 539, 775)
        draw_product_card(c, products[start], 56, 420, font, bold, start + 1)
        if start + 1 < len(products):
            draw_product_card(c, products[start + 1], 56, 72, font, bold, start + 2)
        draw_footer(c, page, _TOTAL_PAGES)
        c.showPage()
        page += 1
    return page


def draw_annex(c: canvas.Canvas, products: list[dict], font: str, bold: str, page: int) -> None:
    """Annexe lisible de tous les usages, sans modifier la maquette des fiches."""
    for product in products:
        draw_logo(c, 63, 780, 126)
        c.setFillColor(MUTED)
        c.setFont(bold, 8.2)
        c.drawRightString(539, 792, "A N N E X E  ·  E M P L O I S  O N S S A")
        c.setFillColor(NAVY)
        c.setFont(bold, 18)
        c.drawString(63, 735, product["nomCommercial"])
        c.setFillColor(GREEN)
        c.setFont(font, 8)
        c.drawString(63, 718, " / ".join(product.get("matieresActives") or ["Non renseignée"]))
        c.setFillColor(MUTED)
        c.setFont(font, 7.5)
        c.drawString(
            63, 699,
            "Usages homologués repris de l'index ONSSA · la fiche produit correspondante se trouve dans le catalogue.",
        )
        rows = [[
            "Culture", "Cible", "Dose", "DAR", "Applications"
        ]]
        for usage in product.get("usages") or []:
            rows.append([
                fmt(usage.get("culture")),
                fmt(usage.get("cible")),
                fmt(usage.get("dose")),
                fmt(usage.get("dar")),
                fmt(usage.get("nbAppl")),
            ])
        table = Table(rows, colWidths=[105, 185, 92, 52, 70], repeatRows=1)
        style = ParagraphStyle(
            "AnnexCell",
            fontName=font,
            fontSize=7.4,
            leading=9,
            textColor=TEXT,
        )
        head = ParagraphStyle(
            "AnnexHead",
            fontName=bold,
            fontSize=7.4,
            leading=9,
            textColor=WHITE,
        )
        table_data = []
        for ri, row in enumerate(rows):
            table_data.append([
                Paragraph(esc(cell), head if ri == 0 else style)
                for cell in row
            ])
        table = Table(table_data, colWidths=[105, 185, 92, 52, 70], repeatRows=1)
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), NAVY),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, PALE_BLUE]),
            ("GRID", (0, 0), (-1, -1), 0.35, LINE),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("ALIGN", (2, 1), (-1, -1), "RIGHT"),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ]))
        table.wrapOn(c, 504, 500)
        table.drawOn(c, 56, 650 - min(500, table._height))
        draw_footer(c, page, _TOTAL_PAGES, small=True)
        c.showPage()
        page += 1
    return page


def generate() -> Path:
    global _CANVAS, _TOTAL_PAGES
    index, products, substances = load_data()
    if len(products) != 36 or len(substances) != 21:
        raise RuntimeError(f"Données inattendues: {len(products)} produits, {len(substances)} substances")
    _TOTAL_PAGES = 3 + (len(products) + 1) // 2 + len(products)
    font, bold = register_fonts()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    _CANVAS = canvas.Canvas(str(OUT), pagesize=A4)
    _CANVAS.setTitle("Catalogue PHYTOBEHT 2026 — édition complète")
    _CANVAS.setAuthor("PHYTOBEHT Sarl")
    draw_cover(_CANVAS, index, products, substances, font, bold)
    draw_toc(_CANVAS, products, substances, font, bold)
    product_end = draw_product_pages(_CANVAS, products, font, bold)
    annex_end = draw_annex(_CANVAS, products, font, bold, product_end)
    # Les pieds de page des fiches sont complétés par Acrobat visuellement
    # avec leur numéro courant ; le PDF reste lisible même sans total connu.
    _CANVAS.save()
    print(
        f"[ok] {OUT} · {len(products)} produits · {len(substances)} matières actives · "
        f"{_TOTAL_PAGES} pages"
    )
    return OUT


if __name__ == "__main__":
    generate()
