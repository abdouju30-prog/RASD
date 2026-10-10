"""
Registres ajoutés : Nouvelle-Zélande (ACVM) et Colombie (ICA).

Importés par scripts/import_registres_ouverts.py, au même format que les autres
registres ouverts : (société, matière active) par produit.

Nouvelle-Zélande  MPI — ACVM Register, export CSV « Entire register ». Seuls
                  les produits de protection des cultures sont gardés (herbicides,
                  fongicides, insecticides, acaricides, régulateurs…), pas les
                  médicaments vétérinaires du même registre.
Colombie          ICA — Registros nacionales de plaguicidas (PDF, 178 pages).
                  Les cellules sont coupées sur plusieurs lignes : chaque fiche
                  est relue à partir de sa classe (HERBICIDA, INSECTICIDA…), le
                  titulaire étant la ligne qui finit par une forme sociale. Une
                  fiche qui ne se relit pas proprement est écartée, jamais devinée.
"""

from __future__ import annotations

import csv
import io
import re

from _reseau import telecharger

NZ_URL = (
    "https://eatsafe.nzfsa.govt.nz/web/public/acvm-register?p_p_id=searchAcvm_WAR_aaol&p_p_lifecycle=0"
    "&p_p_state=exclusive&p_p_mode=view&p_p_col_id=column-2&p_p_col_count=1"
    "&_searchAcvm_WAR_aaol_action=document&_searchAcvm_WAR_aaol_form-submit=true"
    "&_searchAcvm_WAR_aaol_documentId=72955"
)
NZ_TYPES = {"Herbicide", "Fungicide", "Insecticide", "Plant growth regulator", "Miticide",
            "Bactericide", "Molluscicide", "Nematicide"}

CO_URL = ("https://www.ica.gov.co/getattachment/Areas/Agricola/Servicios/Regulacion-y-Control-de-Plaguicidas-Quimicos/"
          "PUBLICACION-BD_RN-RF-4.pdf.aspx?lang=es-CO")
CO_CLASSES = re.compile(
    r"^(HERBICIDA|INSECTICIDA|FUNGICIDA|ACARICIDA|NEMATICIDA|BACTERICIDA|MOLUSQUICIDA|RODENTICIDA|"
    r"COADYUVANTE|REGULADOR|DEFOLIANTE|FUMIGANTE|INSECTICIDA[ -]ACARICIDA|FUNGICIDA[ -]BACTERICIDA)\b")
CO_TOX = re.compile(r"^(I|II|III|IV|IA|IB|V)$")
CO_FORME = re.compile(r"(S\.?\s?A\.?\s?S?\.?|LTDA\.?|S\.?\s?A\.?\s?S\.?|INC\.?|CORP\.?|CORPORATION|GMBH|LIMITED|LTD\.?|"
                      r"B\.?\s?V\.?|AG|S\.?\s?L\.?|CIA\.?|COMPANY|S\.?\s?A\.?\s?C\.?\s?I\.?)\s*$", re.I)
CO_DATE = re.compile(r"\d{2}-\d{2}-\d{2,4}")


# Fin d'un nom de produit qui déborde sur la cellule du titulaire : « 400 EC », « 72 WG ».
CO_FORMULATION = re.compile(
    r"^.*?\b\d+(?:[.,]\d+)?\s?%?\s?(?:EC|SC|SL|WG|WP|SP|GR|DP|CS|OD|EW|ME|SE|FS|DC|GL|ULV|EO|WDG|SG|TB|PM|CE|LS|DF|SU|XL|PS)\b\s*")


def nettoyer_societe(s: str) -> str:
    s = re.sub(r"^CANCELADO\b.*?\d{2}-\d{2}-\d{4}\s*", "", s)   # mention d'annulation
    s = CO_FORMULATION.sub("", s)
    s = re.sub(r"^(?:\d+\s+)?(?:EC|SC|SL|WG|WP|WS|SP|GR|OD|EW|SE|FS|DC|CS|ME|SG|DF)\s+", "", s)  # code seul en tête
    s = re.sub(r"\s+", " ", s).strip(" -")
    # Une forme sociale seule (« LTDA ») n'est pas un titulaire.
    return "" if re.fullmatch(r"(S\.?A\.?S?\.?|LTDA\.?|SAS\.?|S\.?A\.?)", s) else s


def nouvelle_zelande() -> list[tuple[str, str]]:
    texte = telecharger(NZ_URL, timeout=300).decode("utf-8", "replace")
    paires = []
    for r in csv.DictReader(io.StringIO(texte)):
        if r.get("Product Type") in NZ_TYPES and r.get("Registrant Name"):
            paires.append((r["Registrant Name"].strip(), (r.get("Ingredient") or "").strip().title()))
    return paires


def colombie() -> list[tuple[str, str]]:
    import fitz

    doc = fitz.open(stream=telecharger(CO_URL, timeout=300), filetype="pdf")
    lignes = [l.strip() for p in doc for l in p.get_text().split("\n") if l.strip()]
    # Une fiche commence par son numéro de registre (« 0012 ») suivi d'une date.
    debuts = [k for k, l in enumerate(lignes)
              if re.fullmatch(r"\d{3,5}", l) and k + 1 < len(lignes) and CO_DATE.search(lignes[k + 1])]
    paires = []
    for i, k in enumerate(debuts):
        bloc = lignes[k + 1: debuts[i + 1] if i + 1 < len(debuts) else len(lignes)]
        # Après les dates et résolutions : le produit, le titulaire, l'ingrédient.
        j = 0
        while j < len(bloc) and (CO_DATE.search(bloc[j]) or re.fullmatch(r"[\d/\s-]+", bloc[j])):
            j += 1
        reste = bloc[j:]
        c = next((x for x, l in enumerate(reste) if CO_CLASSES.match(l)), None)
        if c is None or c < 4 or not CO_TOX.match(reste[c - 1]):
            continue
        conc = c - 2
        corps = reste[1:conc]  # sans le nom du produit
        fin = next((x for x, l in enumerate(corps) if CO_FORME.search(l)), None)
        if fin is None or fin + 1 >= len(corps):
            continue
        societe = nettoyer_societe(" ".join(corps[: fin + 1]))
        ingredient = " ".join(corps[fin + 1:])
        if 3 <= len(societe) <= 90 and 3 <= len(ingredient) <= 160:
            paires.append((societe, ingredient.title()))
    return paires
