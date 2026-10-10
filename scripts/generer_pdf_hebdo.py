"""
Générateur de rapport hebdomadaire PDF officiel — Rasd
Synthèse des nouveautés réglementaires ONSSA, produits, revendeurs, cultures et usages.

Sortie : data/rapport-hebdo-onssa.pdf
"""

import json
import os
import sys
from datetime import datetime
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm, mm
from reportlab.pdfgen import canvas
from reportlab.platypus import (
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
FICHIER_NOUVEAUTES = DATA_DIR / "nouveautes.json"
PDF_SORTIE = DATA_DIR / "rapport-hebdo-onssa.pdf"

# Palette Rasd
BLEU_FONCE = colors.HexColor("#0d5c73")
BLEU_CLAIR = colors.HexColor("#eaf3f6")
ROUGE_CRIT = colors.HexColor("#ad0f36")
ORANGE_HIGH = colors.HexColor("#b0430b")
VERT_LOW = colors.HexColor("#0e6b47")
TEXTE_MAIN = colors.HexColor("#0e1a20")
TEXTE_MUTED = colors.HexColor("#4a5a63")
GRIS_FOND = colors.HexColor("#f7fafb")
GRIS_BORD = colors.HexColor("#dde4e8")

class NumerotationCanvas(canvas.Canvas):
    """Canvas personnalisé pour numéroter les pages 'Page X / Y'."""
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_number(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_page_number(self, total):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(TEXTE_MUTED)

        # En-tête courant (sauf page 1)
        if self._pageNumber > 1:
            self.drawString(20 * mm, 287 * mm, "Rasd · Rapport Hebdomadaire Réglementaire ONSSA")
            self.setStrokeColor(GRIS_BORD)
            self.setLineWidth(0.5)
            self.line(20 * mm, 284 * mm, 190 * mm, 284 * mm)

        # Pied de page
        self.setStrokeColor(GRIS_BORD)
        self.setLineWidth(0.5)
        self.line(20 * mm, 14 * mm, 190 * mm, 14 * mm)

        texte_gauche = "Destinataire confidentiel : abdouju30@gmail.com · Source : eservice.onssa.gov.ma"
        self.drawString(20 * mm, 9 * mm, texte_gauche)

        page_str = f"Page {self._pageNumber} / {total}"
        self.drawRightString(190 * mm, 9 * mm, page_str)
        self.restoreState()


def generer_rapport_pdf():
    print("-> Génération du rapport hebdomadaire PDF...")

    if not FICHIER_NOUVEAUTES.exists():
        print("  [!] Fichier data/nouveautes.json introuvable, génération préalable requise.")
        from veille_onssa import generer_journal_nouveautes
        donnees = generer_journal_nouveautes()
    else:
        with open(FICHIER_NOUVEAUTES, encoding="utf-8") as f:
            donnees = json.load(f)

    meta = donnees.get("meta", {})
    stats = donnees.get("statistiques", {})
    evenements = donnees.get("evenements", [])

    doc = SimpleDocTemplate(
        str(PDF_SORTIE),
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
    )

    styles = getSampleStyleSheet()

    titre_style = ParagraphStyle(
        "TitreRapport",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=24,
        textColor=BLEU_FONCE,
    )

    sous_titre_style = ParagraphStyle(
        "SousTitreRapport",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=10,
        leading=14,
        textColor=TEXTE_MUTED,
    )

    h2_style = ParagraphStyle(
        "SectionH2",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=13,
        leading=17,
        textColor=BLEU_FONCE,
        spaceBefore=14,
        spaceAfter=6,
    )

    cell_style = ParagraphStyle(
        "TableCell",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=11,
        textColor=TEXTE_MAIN,
    )

    cell_bold = ParagraphStyle(
        "TableCellBold",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8.5,
        leading=11,
        textColor=TEXTE_MAIN,
    )

    cell_header = ParagraphStyle(
        "TableHeader",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8.5,
        leading=11,
        textColor=colors.white,
    )

    story = []

    # ── En-tête principal ──
    story.append(Paragraph("RASD · VEILLE RÉGLEMENTAIRE ONSSA", ParagraphStyle("SurTitre", fontName="Helvetica-Bold", fontSize=9, textColor=TEXTE_MUTED, spaceAfter=4)))
    story.append(Paragraph("Rapport Hebdomadaire des Nouveautés (Édition du Jeudi)", titre_style))
    story.append(Spacer(1, 4))
    date_jour = datetime.now().strftime("%d/%m/%Y")
    maj_onssa = meta.get("dateMajOnssa") or "Août 2026"
    story.append(Paragraph(f"Édition du Jeudi ({date_jour}) · Données extraites de l'index officiel ONSSA (MAJ {maj_onssa}) · Destinataire : <b>{meta.get('emailDestinataire', 'abdouju30@gmail.com')}</b>", sous_titre_style))
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=1.5, color=BLEU_FONCE, spaceAfter=14))

    # ── Boîtes de KPIs ──
    kpi_data = [
        [
            Paragraph(f"<font size='16'><b>{stats.get('nbNouveauxProduits', 0)}</b></font><br/><font size='8' color='#4a5a63'>Nouveaux Produits</font>", cell_style),
            Paragraph(f"<font size='16'><b>{stats.get('nbNouvellesSocietes', 0)}</b></font><br/><font size='8' color='#4a5a63'>Revendeurs & Détenteurs</font>", cell_style),
            Paragraph(f"<font size='16'><b>{stats.get('nbNouveauxUsages', 0)}</b></font><br/><font size='8' color='#4a5a63'>Cultures & Usages</font>", cell_style),
            Paragraph(f"<font size='16' color='#ad0f36'><b>{stats.get('nbRetraitsExpires', 0)}</b></font><br/><font size='8' color='#4a5a63'>Expirés / Vacants</font>", cell_style),
            Paragraph(f"<font size='16' color='#0d5c73'><b>{stats.get('totalProduitsEnLigne', 1473)}</b></font><br/><font size='8' color='#4a5a63'>Total Index Maroc</font>", cell_style),
        ]
    ]
    t_kpi = Table(kpi_data, colWidths=[35 * mm] * 5)
    t_kpi.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), GRIS_FOND),
        ("BOX", (0, 0), (-1, -1), 0.5, GRIS_BORD),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, GRIS_BORD),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(t_kpi)
    story.append(Spacer(1, 14))

    # ── Section 1 : Nouveaux Produits & Homologations ──
    story.append(Paragraph("1. Nouveaux Produits Détectés dans l'Index ONSSA", h2_style))
    story.append(Paragraph("Spécialités commerciales référencées en ligne sur <font color='#0d5c73'>https://eservice.onssa.gov.ma/IndPesticide.aspx</font> :", sous_titre_style))
    story.append(Spacer(1, 6))

    prods_evts = [e for e in evenements if e["categorie"] == "produit"][:12]
    if prods_evts:
        table_prods = [[
            Paragraph("Spécialité Commerciale", cell_header),
            Paragraph("Statut", cell_header),
            Paragraph("Source Registre", cell_header),
            Paragraph("Signalement", cell_header),
        ]]
        for e in prods_evts:
            table_prods.append([
                Paragraph(f"<b>{e['details'].get('nomCommercial', e['titre'])}</b>", cell_bold),
                Paragraph("<font color='#0e6b47'><b>Enregistré</b></font>", cell_style),
                Paragraph("ONSSA e-Service", cell_style),
                Paragraph("Homologation officielle en ligne", cell_style),
            ])
        t_p = Table(table_prods, colWidths=[65 * mm, 25 * mm, 35 * mm, 49 * mm])
        t_p.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), BLEU_FONCE),
            ("BOX", (0, 0), (-1, -1), 0.5, GRIS_BORD),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, GRIS_BORD),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, GRIS_FOND]),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ]))
        story.append(t_p)
    else:
        story.append(Paragraph("Aucun nouveau produit détecté lors du relevé.", cell_style))

    story.append(Spacer(1, 14))

    # ── Section 2 : Sociétés & Revendeurs Agréés ──
    story.append(Paragraph("2. Nouveaux Agréments Revendeurs, Importateurs & Distributeurs", h2_style))
    story.append(Paragraph("Sociétés autorisées par l'ONSSA à commercialiser et distribuer les produits phytosanitaires :", sous_titre_style))
    story.append(Spacer(1, 6))

    soc_evts = [e for e in evenements if e["categorie"] == "societe"][:10]
    if soc_evts:
        table_socs = [[
            Paragraph("Raison Sociale", cell_header),
            Paragraph("N° Agrément", cell_header),
            Paragraph("Date", cell_header),
            Paragraph("Siège / Ville", cell_header),
            Paragraph("Ingénieur Responsable", cell_header),
        ]]
        for e in soc_evts:
            d = e.get("details", {})
            table_socs.append([
                Paragraph(f"<b>{d.get('societe', '')}</b>", cell_bold),
                Paragraph(d.get("agrement") or "—", cell_style),
                Paragraph(d.get("date") or "—", cell_style),
                Paragraph(d.get("siege") or "Maroc", cell_style),
                Paragraph(d.get("ingenieur") or "Renseigné", cell_style),
            ])
        t_s = Table(table_socs, colWidths=[55 * mm, 25 * mm, 22 * mm, 38 * mm, 34 * mm])
        t_s.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), BLEU_FONCE),
            ("BOX", (0, 0), (-1, -1), 0.5, GRIS_BORD),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, GRIS_BORD),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, GRIS_FOND]),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ]))
        story.append(t_s)

    story.append(Spacer(1, 14))

    # ── Section 3 : Usages, Cultures & Bioagresseurs ──
    story.append(Paragraph("3. Synthèse Usages, Cultures & Organismes Nuisibles Ciblés", h2_style))
    story.append(Paragraph("Couples agronomiques prioritaires suivis sur le marché marocain :", sous_titre_style))
    story.append(Spacer(1, 6))

    usage_evts = [e for e in evenements if e["categorie"] == "usage"]
    if usage_evts:
        table_u = [[
            Paragraph("Culture", cell_header),
            Paragraph("Organisme Nuisible / Cible", cell_header),
            Paragraph("Type", cell_header),
            Paragraph("Matière Active Référence", cell_header),
            Paragraph("Statut Réglementaire", cell_header),
        ]]
        for e in usage_evts:
            d = e.get("details", {})
            table_u.append([
                Paragraph(f"<b>{d.get('culture', '')}</b>", cell_bold),
                Paragraph(d.get("nuisible", ""), cell_style),
                Paragraph(d.get("type", ""), cell_style),
                Paragraph(d.get("matiere", ""), cell_style),
                Paragraph("Homologué ONSSA", cell_style),
            ])
        t_u = Table(table_u, colWidths=[30 * mm, 54 * mm, 24 * mm, 38 * mm, 28 * mm])
        t_u.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), BLEU_FONCE),
            ("BOX", (0, 0), (-1, -1), 0.5, GRIS_BORD),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, GRIS_BORD),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, GRIS_FOND]),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ]))
        story.append(t_u)

    story.append(Spacer(1, 14))

    # ── Section 4 : Expirations & Marchés Vacants ──
    story.append(Paragraph("4. Produits Pesticides Expirés & Opportunités de Substitution", h2_style))
    story.append(Paragraph("Homologations marocaines échues (source registre ONSSA PesticidesExpire) :", sous_titre_style))
    story.append(Spacer(1, 6))

    retrait_evts = [e for e in evenements if e["categorie"] == "retrait"][:12]
    if retrait_evts:
        table_r = [[
            Paragraph("Produit Expiré", cell_header),
            Paragraph("Détenteur", cell_header),
            Paragraph("Matières Actives", cell_header),
            Paragraph("Date Expiration", cell_header),
            Paragraph("AMM", cell_header),
        ]]
        for e in retrait_evts:
            d = e.get("details", {})
            table_r.append([
                Paragraph(f"<b>{d.get('produit', '')}</b>", cell_bold),
                Paragraph(d.get("detenteur") or "—", cell_style),
                Paragraph(d.get("matiere") or "—", cell_style),
                Paragraph(f"<font color='#ad0f36'><b>{d.get('expiration', '')}</b></font>", cell_style),
                Paragraph(d.get("amm") or "—", cell_style),
            ])
        t_r = Table(table_r, colWidths=[42 * mm, 38 * mm, 46 * mm, 26 * mm, 22 * mm])
        t_r.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), BLEU_FONCE),
            ("BOX", (0, 0), (-1, -1), 0.5, GRIS_BORD),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, GRIS_BORD),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, GRIS_FOND]),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ]))
        story.append(t_r)

    story.append(Spacer(1, 20))
    story.append(Paragraph("Avertissement : Ce rapport est généré automatiquement par Rasd pour la veille interne. Seules les attestations d'homologation délivrées par l'ONSSA font foi au plan juridique.", ParagraphStyle("Avertissement", fontName="Helvetica-Oblique", fontSize=8, textColor=TEXTE_MUTED)))

    doc.build(story, canvasmaker=NumerotationCanvas)
    print(f"OK -> PDF généré : {PDF_SORTIE} ({PDF_SORTIE.stat().st_size // 1024} Ko)")
    return PDF_SORTIE

if __name__ == "__main__":
    generer_rapport_pdf()
