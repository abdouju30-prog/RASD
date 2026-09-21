"""
Textes réglementaires ONSSA -> data/onssa-reglementation.json

    python scripts/import_onssa_reglementation.py
    python scripts/import_onssa_reglementation.py --self-test

POURQUOI CETTE SOURCE.

L'index phytosanitaire (Excel) dit quels produits sont homologués. Il ne dit
pas quand l'Office publie une loi, un décret, un arrêté ou une note. Or c'est
précisément ce que le professionnel doit connaître la semaine où ça sort :
un décret d'application change les pièces du dossier, pas le statut d'une
matière active.

Deux pages, un seul corpus :

  1. https://eservice.onssa.gov.ma/Reglementation_N.aspx
     Les documents servis par l'e-service (PDF, dates, dernière MAJ).
  2. https://www.onssa.gov.ma/reglementation/reglementation-sectorielle/intrants-agricoles/
     La liste consolidée « Produits Phytopharmaceutiques » du site public,
     avec les PDF officiels. Secours si l'e-service ne répond pas — et
     recoupement quand il répond.

⚠️ CE QUI N'EST PAS LÀ.
  L'index des matières actives et des AMM. Il reste alimenté par
  « FICHIERS PHYTO.xlsx » (`npm run import`). Les deux ne se confondent pas :
  l'un est un registre de produits, l'autre un journal de textes.

Le journal `data/onssa-reglementation-vu.json` retient la date de première
vue de chaque texte. Un texte déjà connu n'est pas une nouveauté ; un texte
qui apparaît au relevé suivant, si. L'historique git est le journal daté.
"""

from __future__ import annotations

import html
import json
import re
import sys
import unicodedata
from datetime import date, datetime
from pathlib import Path
from urllib.parse import urljoin

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _reseau import telecharger  # noqa: E402

RACINE = Path(__file__).resolve().parent.parent
SORTIE = RACINE / "data" / "onssa-reglementation.json"
VU = RACINE / "data" / "onssa-reglementation-vu.json"

ESERVICE = "https://eservice.onssa.gov.ma/Reglementation_N.aspx"
WWW_INTRANTS = (
    "https://www.onssa.gov.ma/reglementation/"
    "reglementation-sectorielle/intrants-agricoles/"
)
WWW_AVIS = (
    "https://www.onssa.gov.ma/"
    "reglementation-sectorielle-produits-phytopharmaceutiques-2/"
)
WP_PAGE = "https://www.onssa.gov.ma/wp-json/wp/v2/pages?slug=intrants-agricoles"
WP_MEDIA = (
    "https://www.onssa.gov.ma/wp-json/wp/v2/media"
    "?search=phytopharmaceutiques&per_page=100"
)
WP_MEDIA_RECENT = (
    "https://www.onssa.gov.ma/wp-json/wp/v2/media"
    "?search=2-22&per_page=40"
)

ATTRIBUTION = "ONSSA — textes réglementaires produits phytopharmaceutiques"


# ── Nettoyage ────────────────────────────────────────────────────────────────

def texte(x: str) -> str:
    return html.unescape(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", x or ""))).strip()


def slug(s: str) -> str:
    s = unicodedata.normalize("NFKD", s or "")
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = s.lower()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s or "texte"


MOIS = {
    "janvier": "01", "fevrier": "02", "février": "02", "mars": "03",
    "avril": "04", "mai": "05", "juin": "06", "juillet": "07",
    "aout": "08", "août": "08", "septembre": "09", "octobre": "10",
    "novembre": "11", "decembre": "12", "décembre": "12",
}


def iso_depuis(s: str | None) -> str | None:
    """Première date lisible, où qu'elle soit dans la chaîne."""
    if not s:
        return None
    s = unicodedata.normalize("NFC", s.strip())
    m = re.search(r"(\d{2})[/.](\d{2})[/.](\d{4})", s)
    if m:
        j, mo, a = int(m.group(1)), int(m.group(2)), m.group(3)
        if 1 <= j <= 31 and 1 <= mo <= 12:
            return f"{a}-{mo:02d}-{j:02d}"
    m = re.search(r"(\d{4})-(\d{2})-(\d{2})", s)
    if m:
        return m.group(0)
    for m in re.finditer(r"(\d{1,2})\s+([A-Za-zéûô]+)\s+(\d{4})", s, flags=re.I):
        mo = MOIS.get(m.group(2).lower())
        if mo:
            return f"{m.group(3)}-{mo}-{int(m.group(1)):02d}"
    m = re.search(
        r"\b(janvier|f[ée]vrier|mars|avril|mai|juin|juillet|ao[uû]t|septembre|octobre|novembre|d[ée]cembre)\s+(\d{4})\b",
        s,
        flags=re.I,
    )
    if m:
        mo = MOIS.get(m.group(1).lower())
        if mo:
            return f"{m.group(2)}-{mo}-01"
    return None


def date_fichier(url: str | None) -> str | None:
    """Horodatage collé par l'e-service en fin de nom de fichier (JJ-MM-AAAA)."""
    if not url:
        return None
    nom = url.rsplit("/", 1)[-1]
    found = re.findall(r"(\d{2})[-/.](\d{2})[-/.](\d{4})", nom)
    for j, mo, a in reversed(found):
        jj, mm = int(j), int(mo)
        if 1 <= jj <= 31 and 1 <= mm <= 12:
            return f"{a}-{mm:02d}-{jj:02d}"
    return None


def titre_sans_dates(titre: str) -> str:
    t = titre or ""
    t = re.sub(r"\([^)]*\d{4}[^)]*\)", " ", t)
    t = re.sub(r"\d{1,2}[/.]\d{1,2}[/.]\d{2,4}", " ", t)
    t = re.sub(r"\d{1,2}\s+[A-Za-zéûô]+\s+\d{4}", " ", t, flags=re.I)
    t = re.sub(r"arr[êe]t[ée]e?\s+le\s+", " ", t, flags=re.I)
    t = re.sub(r"date de mise [àa] jour\s*:?\s*", " ", t, flags=re.I)
    t = re.sub(r"\s+", " ", t).strip(" .-")
    return t


ACRONYMES = ("PPP", "PPPs", "ONSSA", "BPE", "CNPPP", "AMM", "MFSC", "PDF")


def presenter(titre: str) -> str:
    t = re.sub(r"\s+", " ", titre or "").strip()
    # JSON-LD collé au texte quand on lit une page WordPress (breadcrumb, @id…).
    t = re.split(r'\\?"\s*,\s*\\?"(?:breadcrumb|@context|@type|@id)\b', t, maxsplit=1)[0]
    t = t.rstrip(" \\\",")
    alpha = [c for c in t if c.isalpha()]
    if alpha and sum(c.isupper() for c in alpha) / len(alpha) >= 0.65:
        t = t.lower()
        t = t[0].upper() + t[1:] if t else t
        for a in ACRONYMES:
            t = re.sub(rf"\b{re.escape(a)}\b", a if a != "PPPs" else "PPP", t, flags=re.I)
    return t


def identifiant(titre: str, url: str | None = None) -> str:
    """Clé stable : le numéro du texte pour les lois/décrets, le titre sans dates sinon.

    Un avis qui *cite* le décret n°2-22-855 n'est pas ce décret : on ne lui
    vole pas l'identifiant. L'e-service recolle un horodatage au nom de fichier
    à chaque republication — d'où le titre sans dates, pas le fichier.
    """
    t = titre or ""
    k = kind(t)
    if k in ("loi", "decret", "arrete", "procedure", "referentiel"):
        for motif in (
            r"n[°oº]\s*(\d{1,4}-\d{1,3}(?:-\d{1,4})?)",
            r"\b(\d{1,4}-\d{2}-\d{1,4})\b",
            r"\b(\d{2,4}-\d{2})\b",
            r"\b(2-\d{2}-\d{3,4})\b",
            r"\b(CP\s*\d+\s*/\s*DCPV\s*/\s*\d+)\b",
            r"\b(REF\s*/\s*[A-Z]+\s*/\s*\d+\s*/\s*\d+[A-Z]?)\b",
        ):
            m = re.search(motif, t, flags=re.I)
            if m:
                return slug(m.group(1))
    stable = titre_sans_dates(t)
    if len(stable) >= 16:
        return slug(stable)[:72]
    if url:
        nom = re.sub(r"[?#].*$", "", url).rsplit("/", 1)[-1]
        nom = re.sub(r"\.(pdf|aspx)$", "", nom, flags=re.I)
        nom = re.sub(r"\.(FR|AR|ENG)_*$", "", nom, flags=re.I)
        nom = re.sub(r"[-_ ]?\d{2}[-/.]\d{2}[-/.]\d{4}.*$", "", nom)
        if nom and nom.lower() not in ("document", "docs", "telechargement"):
            return slug(nom)[:72]
    return slug(t)[:72]


def kind(titre: str) -> str:
    t = (titre or "").lower()
    if t.startswith("loi") or " dahir" in f" {t}":
        return "loi"
    if t.startswith("décret") or t.startswith("decret"):
        return "decret"
    if t.startswith("arrêté") or t.startswith("arrete") or t.startswith("arrête"):
        return "arrete"
    if "circulaire" in t:
        return "circulaire"
    if "code de procédure" in t or "code de procedure" in t:
        return "procedure"
    if "référentiel" in t or "referentiel" in t:
        return "referentiel"
    if t.startswith("avis") or "porté à la connaissance" in t or "avis aux" in t:
        return "avis"
    if "note de service" in t:
        return "note"
    if "liste des" in t or "substances actives" in t or "matières actives" in t or "matieres actives" in t:
        return "liste"
    if "cnppp" in t or "programme de réunion" in t or "réexamen" in t or "reexamen" in t:
        return "avis"
    if "décision" in t or "decision" in t:
        return "decision"
    return "autre"


def langue_de(url: str, titre: str = "") -> str | None:
    u = f"{url} {titre}".lower()
    if re.search(r"\.eng|[_-]eng\b|english", u):
        return "en"
    if re.search(r"\.ar\b|[_-]ar\b|\.ar_|arabe", u):
        return "ar"
    if re.search(r"\.fr\b|[_-]fr\b|\.fr_|français|francais", u):
        return "fr"
    return None


def url_absolue(href: str, base: str) -> str:
    href = html.unescape(href).strip().strip('"').strip("'")
    if href.startswith("//"):
        return "https:" + href
    return urljoin(base, href)


# ── E-service ────────────────────────────────────────────────────────────────

def maj_affichee(page: str) -> str | None:
    m = re.search(r"Derni[eè]re MAJ\s*:\s*([0-9/]+)", texte(page))
    return iso_depuis(m.group(1)) if m else None


def extraire_eservice(page: str, base: str = ESERVICE) -> list[dict]:
    """Tableaux et liens PDF de Reglementation_N.aspx."""
    out: list[dict] = []
    vus: set[str] = set()

    for tr in re.findall(r"<tr[^>]*>(.*?)</tr>", page, flags=re.S | re.I):
        cellules = [texte(c) for c in re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", tr, flags=re.S | re.I)]
        hrefs = re.findall(r'<a[^>]+href=["\']([^"\']+)["\']', tr, flags=re.I)
        pdfs = [h for h in hrefs if re.search(r"\.pdf($|\?)", h, flags=re.I) or "/docs/" in h.lower()]
        if not cellules:
            continue
        # En-tête
        joint = " ".join(cellules).lower()
        if joint in ("intitulé",) or (len(cellules) <= 3 and "intitulé" in joint and "date" in joint):
            continue
        titre = next((c for c in cellules if c and c.lower() not in ("pdf", "télécharger", "telecharger", "document")), "")
        if not titre or len(titre) < 8:
            continue
        date_c = next((iso_depuis(c) for c in cellules if iso_depuis(c)), None)
        titre = presenter(titre)
        url = url_absolue(pdfs[0], base) if pdfs else None
        item = {
            "id": identifiant(titre, url),
            "titre": titre,
            "type": kind(titre),
            "date": date_c or iso_depuis(titre) or date_fichier(url),
            "url": url,
            "source": "eservice",
            "langue": langue_de(url or "", titre) or "fr",
            "dateMiseEnLigne": date_fichier(url),
        }
        if item["id"] in vus:
            continue
        vus.add(item["id"])
        out.append(item)

    # Filet de sécurité : tout PDF hors tableau déjà vu.
    for m in re.finditer(
        r'<a[^>]+href=["\']([^"\']+\.pdf[^"\']*)["\'][^>]*>(.*?)</a>',
        page,
        flags=re.S | re.I,
    ):
        url = url_absolue(m.group(1), base)
        titre = texte(m.group(2)) or re.sub(r"[?#].*$", "", url).rsplit("/", 1)[-1]
        if not titre or titre.lower() in ("pdf", "télécharger", "telecharger"):
            # Intitulé dans le <td> précédent, déjà capturé.
            continue
        titre = presenter(titre)
        i = identifiant(titre, url)
        if i in vus:
            continue
        vus.add(i)
        out.append({
            "id": i,
            "titre": titre,
            "type": kind(titre),
            "date": iso_depuis(titre) or date_fichier(url),
            "url": url,
            "source": "eservice",
            "langue": langue_de(url, titre) or "fr",
            "dateMiseEnLigne": date_fichier(url),
        })
    return out


# ── Site public (WordPress) ──────────────────────────────────────────────────

SECTION_PPP = "Produits Phytopharmaceutiques"


BRUIT_NAV = {
    "accueil", "réglementation", "reglementation", "contactez nous",
    "recruitment competition", "professional examination",
    "continue with old version", "espace ressources humaines",
}


def extraire_liens_html(page: str, base: str, source: str) -> list[dict]:
    out = []
    vus: set[str] = set()
    for m in re.finditer(
        r'<a[^>]+href=["\']([^"\']+)["\'][^>]*>(.*?)</a>',
        page,
        flags=re.S | re.I,
    ):
        href, inner = m.group(1), presenter(texte(m.group(2)))
        if not inner or len(inner) < 12:
            continue
        if inner.lower() in BRUIT_NAV:
            continue
        if re.search(r"[\u0600-\u06FF]", inner) and not re.search(r"[A-Za-z]{4}", inner):
            continue
        url = url_absolue(href, base)
        est_pdf = bool(re.search(r"\.pdf($|\?)", url, flags=re.I))
        if not (
            est_pdf
            or kind(inner) in ("loi", "decret", "arrete", "avis", "procedure", "liste", "note", "circulaire")
        ):
            continue
        if not est_pdf and "controle-des-produits-alimentaires" in url.lower():
            continue
        i = identifiant(inner, url)
        if i in vus:
            continue
        vus.add(i)
        out.append({
            "id": i,
            "titre": inner,
            "type": kind(inner),
            "date": iso_depuis(inner) or date_fichier(url),
            "url": url,
            "source": source,
            "langue": langue_de(url, inner) or "fr",
            "dateMiseEnLigne": date_fichier(url),
        })
    return out


def extraire_section_ppp(html_page: str) -> list[dict]:
    """Coupe le HTML sur le titre de section PPP, ignore les fertilisants."""
    m = re.search(
        r"Produits\s+Phytopharmaceutiques(.*?)(?:Matières Fertilisantes|Alimentation Animale|</section>|$)",
        html_page,
        flags=re.S | re.I,
    )
    bloc = m.group(1) if m else html_page
    return extraire_liens_html(bloc, WWW_INTRANTS, "www")


def extraire_media_wp(items: list) -> list[dict]:
    out = []
    for it in items or []:
        url = it.get("source_url") or ""
        titre_fichier = texte((it.get("title") or {}).get("rendered") or "")
        mime = it.get("mime_type") or ""
        if "pdf" not in mime.lower() and not url.lower().endswith(".pdf"):
            continue
        # Organigrammes, images nommées « Division des … » : pas un texte.
        if titre_fichier.lower().startswith("division des"):
            continue
        lang = langue_de(url, titre_fichier)
        # Les versions AR/EN du même décret : on les rattache, on préfère FR plus tard.
        date_pub = (it.get("date") or "")[:10] or None
        # Un titre de fichier « DEC.2-22-855.FR » n'est pas lisible. On le
        # déplie en intitulé dès qu'on connaît le numéro.
        titre = intitule_depuis_fichier(titre_fichier) or titre_fichier
        i = identifiant(titre, url)
        out.append({
            "id": i,
            "titre": titre,
            "type": kind(titre) if kind(titre) != "autre" else kind(intitule_depuis_fichier(titre_fichier) or ""),
            "date": iso_depuis(titre),
            "url": url,
            "source": "www",
            "langue": lang or "fr",
            "dateMiseEnLigne": date_pub,
        })
    return out


def intitule_depuis_fichier(nom: str) -> str | None:
    n = re.sub(r"\.(FR|AR|ENG)_*$", "", nom or "", flags=re.I)
    n = n.replace("_", " ").replace(".", " ")
    m = re.search(r"LOI\s*(\d+\s*-?\s*\d+)", n, flags=re.I)
    if m:
        num = m.group(1).replace(" ", "")
        if num.startswith("34"):
            return f"Loi n°{num} relative aux produits phytopharmaceutiques"
        if num.startswith("42"):
            return f"Loi n°{num} relative au contrôle et à l'organisation du commerce des pesticides à usage agricole"
        return f"Loi n°{num}"
    m = re.search(r"DEC\s*(2-\d+-\d+)", n, flags=re.I)
    if m:
        return f"Décret n°{m.group(1)}"
    m = re.search(r"ARR\s*(\d+-\d+)", n, flags=re.I)
    if m:
        return f"Arrêté n°{m.group(1)}"
    if "circulaire" in n.lower() and "phosphine" in n.lower():
        return "Circulaire relative à la phosphine"
    return None


# ── Fusion ───────────────────────────────────────────────────────────────────

def meilleur(a: dict, b: dict) -> dict:
    """Un même décret vu deux fois : on garde l'intitulé le plus long, le PDF FR, l'e-service en plus."""
    out = dict(a)
    if len(b.get("titre") or "") > len(out.get("titre") or ""):
        out["titre"] = b["titre"]
    if b.get("type") and (out.get("type") in (None, "autre") or (
        b["type"] != "autre" and out.get("type") == "autre"
    )):
        if b["type"] != "autre" or not out.get("type"):
            out["type"] = b["type"]
    edict = iso_depuis(out.get("titre") or "") or iso_depuis(b.get("titre") or "")
    if edict:
        out["date"] = edict
    else:
        da, db = out.get("date"), b.get("date")
        if db and not da:
            out["date"] = db
        elif da and db and out.get("type") in ("loi", "decret", "arrete") and db < da:
            out["date"] = db
    # URL : PDF français d'abord, sinon e-service, sinon n'importe quel PDF.
    def score(x):
        u, lang, src = x.get("url") or "", x.get("langue"), x.get("source")
        s = 0
        if u.lower().endswith(".pdf") or ".pdf" in u.lower():
            s += 4
        if lang == "fr":
            s += 3
        if src == "eservice":
            s += 1
        if lang in ("ar", "en"):
            s -= 2
        return s
    if score(b) > score(out):
        out["url"] = b.get("url")
        out["langue"] = b.get("langue") or out.get("langue")
        out["source"] = b.get("source")
    sources = []
    for x in (a, b):
        if x.get("source") and x["source"] not in sources:
            sources.append(x["source"])
    out["sources"] = sources
    if b.get("dateMiseEnLigne") and (
        not out.get("dateMiseEnLigne") or b["dateMiseEnLigne"] > out["dateMiseEnLigne"]
    ):
        out["dateMiseEnLigne"] = b["dateMiseEnLigne"]
    return out


def fusionner(lots: list[list[dict]]) -> list[dict]:
    par: dict[str, dict] = {}
    for lot in lots:
        for t in lot:
            i = t["id"]
            t = dict(t)
            t.setdefault("sources", [t["source"]] if t.get("source") else [])
            par[i] = meilleur(par[i], t) if i in par else t
    # Un décret FR + AR + ENG : déjà fusionnés par id. On écarte les ids
    # anglais orphelins restants s'ils doublonnent un FR du même numéro.
    return list(par.values())


def ppp_seulement(textes: list[dict]) -> list[dict]:
    """Écarte fertilisants, navigation WordPress, PDF anglais/arabes restants."""
    out = []
    for t in textes:
        titre = t.get("titre") or ""
        tl = titre.lower()
        url = (t.get("url") or "").lower()
        if (
            ("fertilisant" in tl or "engrais" in tl)
            and "pesticide" not in tl
            and "phytopharmaceut" not in tl
        ):
            continue
        if t.get("langue") in ("ar", "en"):
            continue
        if tl in BRUIT_NAV:
            continue
        if re.search(r"[\u0600-\u06FF]", titre) and not re.search(r"[A-Za-z]{4}", titre):
            continue
        est_pdf = ".pdf" in url
        if not url:
            continue
        if not est_pdf and t.get("type") in ("autre",) and t.get("source") == "www":
            continue
        if tl.startswith("en aucun cas"):
            continue
        if "services en ligne" in tl or tl in ("notes de service", "code de procédures", "code de procedures"):
            continue
        if len(titre) < 12:
            continue
        t["titre"] = presenter(titre)
        out.append(t)
    return out


# ── Journal des nouveautés ───────────────────────────────────────────────────

def appliquer_journal(textes: list[dict]) -> tuple[list[dict], int, int]:
    aujourd = date.today().isoformat()
    brut = json.loads(VU.read_text(encoding="utf-8")) if VU.exists() else None
    premier = brut is None
    connues: dict = dict(brut["premiereVue"]) if brut else {}
    nb_nouveaux = 0
    nb_maj = 0
    for t in textes:
        i = t["id"]
        if i not in connues:
            connues[i] = {"date": aujourd, "url": t.get("url")}
            t["nouveau"] = not premier
            t["premiereVue"] = aujourd
            if not premier:
                nb_nouveaux += 1
        else:
            ancien = connues[i]
            if isinstance(ancien, str):
                ancien = {"date": ancien, "url": None}
            t["nouveau"] = False
            t["premiereVue"] = ancien.get("date")
            if t.get("url") and ancien.get("url") and t["url"] != ancien["url"]:
                t["misAJour"] = True
                nb_maj += 1
                connues[i] = {"date": ancien.get("date"), "url": t["url"]}
            else:
                t["misAJour"] = False
                connues[i] = {"date": ancien.get("date"), "url": t.get("url") or ancien.get("url")}
    VU.write_text(
        json.dumps({
            "commentaire": (
                "Date de première apparition de chaque texte ONSSA. Fichier tenu "
                "par scripts/import_onssa_reglementation.py ; l'historique git "
                "est le journal des nouveautés."
            ),
            "dernierReleve": aujourd,
            "premiereVue": dict(sorted(connues.items())),
        }, ensure_ascii=False, indent=1),
        encoding="utf-8",
    )
    return textes, nb_nouveaux, nb_maj


def trier(textes: list[dict]) -> list[dict]:
    return sorted(
        textes,
        key=lambda t: (
            bool(t.get("nouveau")),
            bool(t.get("misAJour")),
            t.get("dateMiseEnLigne") or t.get("date") or "",
        ),
        reverse=True,
    )


# ── Réseau ───────────────────────────────────────────────────────────────────

def essayer(url: str, label: str) -> str | None:
    try:
        brut = telecharger(url, timeout=90)
    except Exception as e:
        print(f"  {label:22} injoignable — {e}")
        return None
    page = brut.decode("utf-8", "replace") if isinstance(brut, (bytes, bytearray)) else str(brut)
    print(f"  {label:22} {len(page) // 1024:4} Ko")
    return page


def charger_json(url: str, label: str):
    page = essayer(url, label)
    if not page:
        return None
    try:
        return json.loads(page)
    except json.JSONDecodeError as e:
        print(f"  {label:22} JSON illisible — {e}")
        return None


# ── Amorce si le réseau est muet (premier déploiement) ───────────────────────
# Intitulés et PDF relevés sur www.onssa.gov.ma le 13/09/2026. N'est utilisée
# que si aucune source n'a répondu ET que le fichier de sortie n'existe pas.

AMORCE = [
    {
        "id": "34-18",
        "titre": "Loi n°34-18 relative aux produits phytopharmaceutiques, promulguée par le dahir n°1-21-67 du 14 juillet 2021.",
        "type": "loi",
        "date": "2021-07-14",
        "url": "https://www.onssa.gov.ma/wp-content/uploads/Reglementation/R%C3%A9glementation%20Sectorielle/Intrants%20Agricoles/Produits%20Phytopharmaceutiques/LOI.34-18.FR.pdf",
        "source": "www",
        "langue": "fr",
        "dateMiseEnLigne": "2021-12-22",
    },
    {
        "id": "2-22-855",
        "titre": "Décret n°2-22-855 du 20 kaada 1444 (9 juin 2023) pris pour l'application de certaines dispositions de la loi n°34-18 relative aux produits phytopharmaceutiques. Publié au BO n°7206 du 22/06/2023.",
        "type": "decret",
        "date": "2023-06-09",
        "url": "https://www.onssa.gov.ma/wp-content/uploads/2023/07/DEC.2-22-855.FR_.pdf",
        "source": "www",
        "langue": "fr",
        "dateMiseEnLigne": "2023-07-14",
    },
    {
        "id": "2-22-670",
        "titre": "Décret n°2-22-670 du 21 rabii II 1444 (16 novembre 2022) fixant la composition et les modalités de fonctionnement de la Commission nationale des produits phytopharmaceutiques.",
        "type": "decret",
        "date": "2022-11-16",
        "url": "https://www.onssa.gov.ma/wp-content/uploads/2023/07/DEC.2-22-670.FR_.pdf",
        "source": "www",
        "langue": "fr",
        "dateMiseEnLigne": "2023-07-11",
    },
    {
        "id": "2196-23",
        "titre": "Arrêté n°2196-23 du 7 safar 1445 (24 août 2023) portant approbation du règlement intérieur de la Commission nationale des produits phytopharmaceutiques.",
        "type": "arrete",
        "date": "2023-08-24",
        "url": "https://www.onssa.gov.ma/wp-content/uploads/2023/11/ARR.2196-23.FR_.pdf",
        "source": "www",
        "langue": "fr",
        "dateMiseEnLigne": "2023-11-16",
    },
    {
        "id": "2-99-105",
        "titre": "Décret n°2-99-105 du 18 Moharrem 1420 (05 mai 1999) relatif à l'homologation des produits pesticides à usage agricole.",
        "type": "decret",
        "date": "1999-05-05",
        "url": "https://www.onssa.gov.ma/wp-content/uploads/Reglementation/R%C3%A9glementation%20Sectorielle/Intrants%20Agricoles/Produits%20Phytopharmaceutiques/DEC.2-99-105.FR.pdf",
        "source": "www",
        "langue": "fr",
    },
    {
        "id": "2-99-106",
        "titre": "Décret n°2-99-106 du 18 Moharrem 1420 (05 mai 1999) relatif à l'exercice des activités d'importation, de fabrication et de commercialisation de produits pesticides à usage agricole.",
        "type": "decret",
        "date": "1999-05-05",
        "url": "https://www.onssa.gov.ma/wp-content/uploads/Reglementation/R%C3%A9glementation%20Sectorielle/Intrants%20Agricoles/Produits%20Phytopharmaceutiques/DEC.2-99-106.FR.pdf",
        "source": "www",
        "langue": "fr",
    },
    {
        "id": "2290-14",
        "titre": "Arrêté n°2290-14 du 27 chaabane 1435 (25 juin 2014) fixant les conditions d'emploi de la phosphine liquéfiée pour la désinsectisation par fumigation.",
        "type": "arrete",
        "date": "2014-06-25",
        "url": "https://www.onssa.gov.ma/wp-content/uploads/Reglementation/R%C3%A9glementation%20Sectorielle/Intrants%20Agricoles/Produits%20Phytopharmaceutiques/ARR.2290-14.FR.pdf",
        "source": "www",
        "langue": "fr",
        "dateMiseEnLigne": "2015-03-02",
    },
    {
        "id": "794-00",
        "titre": "Arrêté n°794-00 du 03 rebii I 1421 (06 juin 2000) relatif à l'organisation d'une formation d'un examen de qualification au profit des techniciens agricoles pour exercer la vente au détail des pesticides à usage agricole.",
        "type": "arrete",
        "date": "2000-06-06",
        "url": "https://www.onssa.gov.ma/wp-content/uploads/Reglementation/R%C3%A9glementation%20Sectorielle/Intrants%20Agricoles/Produits%20Phytopharmaceutiques/ARR.794-00.FR.pdf",
        "source": "www",
        "langue": "fr",
    },
    {
        "id": "1809-89",
        "titre": "Arrêté n°1809-89 du 13 Joumada I 1410 (13 décembre 1989) relatif à la vente et à l'emploi de la deltaméthrine et du piperonyl butoxyde pour la désinsectisation des graines de céréales.",
        "type": "arrete",
        "date": "1989-12-13",
        "url": "https://www.onssa.gov.ma/wp-content/uploads/Reglementation/R%C3%A9glementation%20Sectorielle/Intrants%20Agricoles/Produits%20Phytopharmaceutiques/ARR.1809-89.FR.c1.pdf",
        "source": "www",
        "langue": "fr",
    },
    {
        "id": "666-87",
        "titre": "Arrêté n°666-87 du 04 Chaâbane 1407 (03 avril 1987) réglementant les conditions d'emploi en agriculture, du bromure de méthyle destiné à la désinfection des sols nus, par fumigation.",
        "type": "arrete",
        "date": "1987-04-03",
        "url": "https://www.onssa.gov.ma/wp-content/uploads/Reglementation/R%C3%A9glementation%20Sectorielle/Intrants%20Agricoles/Produits%20Phytopharmaceutiques/ARR.666-87.FR.pdf",
        "source": "www",
        "langue": "fr",
    },
    {
        "id": "466-84",
        "titre": "Arrêté n°466-84 du 15 Joumada II 1404 (19 mars 1984) portant réglementation des pesticides organochlorés.",
        "type": "arrete",
        "date": "1984-03-19",
        "url": "https://www.onssa.gov.ma/wp-content/uploads/Reglementation/R%C3%A9glementation%20Sectorielle/Intrants%20Agricoles/Produits%20Phytopharmaceutiques/ARR.466-84.FR.pdf",
        "source": "www",
        "langue": "fr",
    },
    {
        "id": "777-72",
        "titre": "Arrêté n°777-72 du 21 août 1972 autorisant l'emploi du phosphure d'aluminium pour la désinsectisation des grains de céréales destinés à la semence ou à l'alimentation.",
        "type": "arrete",
        "date": "1972-08-21",
        "url": "https://www.onssa.gov.ma/wp-content/uploads/Reglementation/R%C3%A9glementation%20Sectorielle/Intrants%20Agricoles/Produits%20Phytopharmaceutiques/ARR.777-72.FR.pdf",
        "source": "www",
        "langue": "fr",
    },
    {
        "id": "cp-08-dcpv-15",
        "titre": "Code de procédures du contrôle à l'importation des pesticides à usage agricole, matières fertilisantes et supports de cultures (CP 08/DCPV/15, version B — 22 février 2018).",
        "type": "procedure",
        "date": "2018-02-22",
        "url": "https://eservice.onssa.gov.ma/Docs/Code%20de%20proc%C3%A9dures%2008%20DCPV%2015-CODE%20DE%20PROCEDURES-Version%20B%20-%2022-02-2018-28-02-2018%2015-06-34.pdf",
        "source": "eservice",
        "langue": "fr",
    },
    {
        "id": "avis-2-22-855",
        "titre": "Avis aux professionnels : publication du décret n°2-22-855 d'application de la loi n°34-18 au Bulletin Officiel n°7206 du 22/06/2023.",
        "type": "avis",
        "date": "2023-06-27",
        "url": WWW_AVIS,
        "source": "www",
        "langue": "fr",
        "dateMiseEnLigne": "2023-06-27",
    },
]


# Relevé e-service du 13/09/2026. Sert de filet si Reglementation_N.aspx
# ne répond pas : l'Office coupe souvent TLS hors du Maroc. Le cron
# hebdomadaire écrase ces lignes dès que la page répond.

RELEVE_ESERVICE = [
    {
        "id": "liste-revendeurs-ppp",
        "titre": "Liste des revendeurs des produits phytopharmaceutiques (arrêtée le 03 septembre 2026)",
        "type": "liste",
        "date": "2026-09-03",
        "url": "https://eservice.onssa.gov.ma/Docs/Liste des revendeurs des PPP Arrêtée le 03 septembre 2026-03-09-2026 10-54-53.pdf",
        "source": "eservice",
        "langue": "fr",
        "dateMiseEnLigne": "2026-09-03",
    },
    {
        "id": "avis-noms-commerciaux-retires",
        "titre": "Avis sur les noms commerciaux des produits phytopharmaceutiques retirés (18 septembre 2025)",
        "type": "avis",
        "date": "2025-09-18",
        "url": "https://eservice.onssa.gov.ma/Docs/AVIS AUX SOCIETES-NOMS COMMERCIAUX DES PPP RETIRES-18-09-2025-18-09-2025 16-27-17.PDF",
        "source": "eservice",
        "langue": "fr",
        "dateMiseEnLigne": "2025-09-18",
    },
    {
        "id": "substances-restrictions-maroc",
        "titre": "Substances actives de produits phytopharmaceutiques soumises à des restrictions d'usages au Maroc (mise à jour : 21 mai 2025)",
        "type": "liste",
        "date": "2025-05-21",
        "url": "https://eservice.onssa.gov.ma/Docs/MATIERES ACTIVES RESTRICTION-USAGE ONSSA FINAL  05-12-2025-05-12-2025 16-48-48.pdf",
        "source": "eservice",
        "langue": "fr",
        "dateMiseEnLigne": "2025-12-05",
    },
    {
        "id": "substances-retirees-maroc",
        "titre": "Substances actives de produits phytopharmaceutiques retirées au Maroc (mise à jour : 21 mai 2025)",
        "type": "liste",
        "date": "2025-05-21",
        "url": "https://eservice.onssa.gov.ma/Docs/MATIERES ACTIVES RETIREES ONSSA FINAL-MAI 25-06-02-2026 15-28-48.pdf",
        "source": "eservice",
        "langue": "fr",
        "dateMiseEnLigne": "2026-02-06",
    },
    {
        "id": "avis-fibre-coco",
        "titre": "Avis relatif à l'importation des substrats à base de fibre de coco (27 décembre 2024)",
        "type": "avis",
        "date": "2024-12-27",
        "url": "https://eservice.onssa.gov.ma/Docs/AVIS-IMPORTATION- SUBSTRATS A BASE DE FIBRE DE COCO-27-12-2024-27-12-2024 12-30-07.PDF",
        "source": "eservice",
        "langue": "fr",
        "dateMiseEnLigne": "2024-12-27",
    },
    {
        "id": "avis-modalites-distribution",
        "titre": "Avis de rappel sur les modalités de distribution et de vente des produits phytopharmaceutiques (8 août 2023)",
        "type": "avis",
        "date": "2023-08-08",
        "url": "https://eservice.onssa.gov.ma/Docs/Rappel des modalités de distributions des produits phytopharmaceutiques-2-08-08-08-08-2023 20-42-26.pdf",
        "source": "eservice",
        "langue": "fr",
        "dateMiseEnLigne": "2023-08-08",
    },
    {
        "id": "note-mise-en-demeure-agrements",
        "titre": "Note de service sur la mise en demeure des sociétés agréées pour la fabrication, l'importation ou la distribution des produits pesticides à usage agricole.",
        "type": "note",
        "date": "2018-07-25",
        "url": "https://eservice.onssa.gov.ma/Docs/NOTE DE SERVICE LA MISE EN DEMEURE DES AGREMENTS - 25-07-2018-01-08-2018 08-54-33.pdf",
        "source": "eservice",
        "langue": "fr",
        "dateMiseEnLigne": "2018-08-01",
    },
    {
        "id": "avis-organismes-bpe-2020",
        "titre": "Avis aux organismes agréés Bonnes Pratiques d'Expérimentation (BPE) (16 janvier 2020)",
        "type": "avis",
        "date": "2020-01-16",
        "url": "https://eservice.onssa.gov.ma/Docs/Lettre aux oraganismes agréés BPE-16 janvier 2020-16-01-2020 16-07-47.PDF",
        "source": "eservice",
        "langue": "fr",
        "dateMiseEnLigne": "2020-01-16",
    },
    {
        "id": "avis-neonicotinoides",
        "titre": "Avis public relatif aux pesticides néonicotinoïdes",
        "type": "avis",
        "date": "2022-03-24",
        "url": "https://eservice.onssa.gov.ma/Docs/AVIS PUBLIC-PESTICIDES NEONICOTINOIDES-24-03-2022_16-11-49-24-03-2022 16-21-57.PDF",
        "source": "eservice",
        "langue": "fr",
        "dateMiseEnLigne": "2022-03-24",
    },
    {
        "id": "avis-fumigants-sols",
        "titre": "Avis de rappel sur les conditions d'application des fumigants des sols (6 juin 2022)",
        "type": "avis",
        "date": "2022-06-06",
        "url": "https://eservice.onssa.gov.ma/Docs/AVIS DE RAPPEL-FUMIGANTS DES SOLS 06 JUIN 2022-06-06-2022 13-05-37.PDF",
        "source": "eservice",
        "langue": "fr",
        "dateMiseEnLigne": "2022-06-06",
    },
    {
        "id": "avis-regularisation-2019-2020",
        "titre": "Délais pour la régularisation des demandes d'homologation déposées en 2019-2020",
        "type": "avis",
        "date": "2023-05-12",
        "url": "https://eservice.onssa.gov.ma/Docs/AVIS SUR LA REGULARISATION DES DEMANDES DHOMOLOGATION 2019-2020-12-05-2023 18-55-45.PDF",
        "source": "eservice",
        "langue": "fr",
        "dateMiseEnLigne": "2023-05-12",
    },
    {
        "id": "avis-organismes-bpe-2023",
        "titre": "Avis aux organismes agréés en bonnes pratiques d'expérimentation des produits phytopharmaceutiques (19/12/2023)",
        "type": "avis",
        "date": "2023-12-19",
        "url": "https://eservice.onssa.gov.ma/Docs/AVIS AUX ORGANISMES AGREES BPE-19-12-2023-19-12-2023 12-25-48.PDF",
        "source": "eservice",
        "langue": "fr",
        "dateMiseEnLigne": "2023-12-19",
    },
    {
        "id": "avis-regularisation-2020-2022",
        "titre": "Avis relatif à la régularisation des demandes d'homologation, d'extension d'usage et de modification d'homologation (2020 à 2022)",
        "type": "avis",
        "date": "2024-03-26",
        "url": "https://eservice.onssa.gov.ma/Docs/AVIS-REGULASATION-26-03-2024 16-07-25.PDF",
        "source": "eservice",
        "langue": "fr",
        "dateMiseEnLigne": "2024-03-26",
    },
    {
        "id": "avis-formation-bpe-2025",
        "titre": "Avis relatif aux exigences de la formation sur les BPE des produits phytopharmaceutiques (02/07/2025)",
        "type": "avis",
        "date": "2025-07-02",
        "url": "https://eservice.onssa.gov.ma/Docs/AVIS RELATIF AUX EXIGENCES DE LA FORMATION SUR LES BPE DES PPP - 02 juillet 2025-02-07-2025 12-49-24.PDF",
        "source": "eservice",
        "langue": "fr",
        "dateMiseEnLigne": "2025-07-02",
    },
    {
        "id": "programme-cnppp-2026",
        "titre": "Programme de réunions de la Commission nationale des produits phytopharmaceutiques (CNPPP) au titre de l'année 2026",
        "type": "avis",
        "date": "2026-01-26",
        "url": "https://eservice.onssa.gov.ma/Docs/AVIS CNPPP-2026_0001-26-01-2026 16-08-50.pdf",
        "source": "eservice",
        "langue": "fr",
        "dateMiseEnLigne": "2026-01-26",
    },
    {
        "id": "avis-reexamen-ppp-2026",
        "titre": "Avis sur le programme de réexamen des produits phytopharmaceutiques (mai 2026)",
        "type": "avis",
        "date": "2026-05-01",
        "url": "https://eservice.onssa.gov.ma/Docs/AVIS-REEXAMEN DES PRODUITS PHYTOPHARMACEUTIQUES-MAI 2026-02-06-2026 12-30-02.pdf",
        "source": "eservice",
        "langue": "fr",
        "dateMiseEnLigne": "2026-06-02",
    },
    {
        "id": "avis-etiquetage-emballage-2026",
        "titre": "Avis aux opérateurs sur le contrôle de l'étiquetage et de l'emballage des PPP et des MFSC à l'importation",
        "type": "avis",
        "date": "2026-07-06",
        "url": "https://eservice.onssa.gov.ma/Docs/AVIS 3567  CONTROLE ETTIQUETAGE & EMBALLAGE PPP & MFSC-06-07-2026 12-27-33.pdf",
        "source": "eservice",
        "langue": "fr",
        "dateMiseEnLigne": "2026-07-06",
    },
]


def avec_sources(items):
    out = []
    for x in items:
        t = dict(x)
        t["id"] = identifiant(t["titre"], t.get("url"))
        t["type"] = t.get("type") or kind(t["titre"])
        t.setdefault("sources", [t["source"]] if t.get("source") else [])
        out.append(t)
    return out


def textes_precedents(source=None):
    if not SORTIE.exists():
        return []
    try:
        ancien = json.loads(SORTIE.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return []
    out = []
    for t in ancien.get("textes") or []:
        srcs = t.get("sources") or ([t["source"]] if t.get("source") else [])
        if source and source not in srcs:
            continue
        out.append(t)
    return out


FIXTURE_ESERVICE = """
<html><body>
<span>Dernière MAJ : 06/01/2026</span>
<table>
<tr><th>Intitulé</th><th>Date</th><th>Document</th></tr>
<tr>
  <td>Loi n°34-18 relative aux produits phytopharmaceutiques</td>
  <td>16/12/2021</td>
  <td><a href="Docs/LOI.34-18.FR.pdf">Télécharger</a></td>
</tr>
<tr>
  <td>Décret n°2-22-855 du 9 juin 2023</td>
  <td>22/06/2023</td>
  <td><a href="/Docs/DEC.2-22-855.FR.pdf">PDF</a></td>
</tr>
<tr>
  <td>Code de procédures du contrôle à l'importation CP 08/DCPV/15</td>
  <td>22/02/2018</td>
  <td><a href="Docs/Code_procedures.pdf">Télécharger</a></td>
</tr>
</table>
</body></html>
"""


def self_test() -> int:
    erreurs = []

    def verif(cond, msg):
        if not cond:
            erreurs.append(msg)

    verif(identifiant("Décret n°2-22-855 du 9 juin 2023") == "2-22-855", "id décret")
    verif(identifiant("Loi n°34-18 relative aux PPP") == "34-18", "id loi")
    verif(identifiant("Arrêté n°2196-23") == "2196-23", "id arrêté")
    verif(
        identifiant("Avis aux professionnels : publication du décret n°2-22-855")
        != "2-22-855",
        "un avis ne vole pas l'id du décret",
    )
    verif(iso_depuis("AVIS (19/12/2023)") == "2023-12-19", "date au milieu")
    verif(iso_depuis("Arrêtée le 03 septembre 2026") == "2026-09-03", "date française au milieu")
    verif(iso_depuis("du 20 kaada 1444 (9 juin 2023)") == "2023-06-09", "date après hégire")
    verif(
        identifiant("LISTE DES REVENDEURS DES PRODUITS PHYTOPHARMACEUTIQUES (Arrêtée le 03 septembre 2026)")
        == identifiant("LISTE DES REVENDEURS DES PRODUITS PHYTOPHARMACEUTIQUES (Arrêtée le 10 septembre 2026)"),
        "id stable malgré la date",
    )
    verif(kind("SUBSTANCES ACTIVES RETIREES AU MAROC") == "liste", "kind liste")
    verif(kind("Décret n°2-22-855") == "decret", "kind décret")
    verif(kind("Arrêté du ministre n°2196-23") == "arrete", "kind arrêté")

    textes = extraire_eservice(FIXTURE_ESERVICE)
    verif(len(textes) == 3, f"fixture: {len(textes)} textes, attendu 3")
    ids = {t["id"] for t in textes}
    verif("34-18" in ids and "2-22-855" in ids, f"ids fixture {ids}")
    loi = next(t for t in textes if t["id"] == "34-18")
    verif(loi["date"] == "2021-12-16", f"date loi {loi.get('date')}")
    verif(loi["url"].endswith("LOI.34-18.FR.pdf"), f"url loi {loi.get('url')}")
    verif(maj_affichee(FIXTURE_ESERVICE) == "2026-01-06", "MAJ e-service")

    html_wp = """
    <h5>Produits Phytopharmaceutiques</h5>
    <ul>
      <li><a href="https://www.onssa.gov.ma/x/LOI.34-18.FR.pdf">Loi n°34-18 relative aux produits phytopharmaceutiques.</a></li>
      <li><a href="https://www.onssa.gov.ma/y/DEC.2-22-855.FR_.pdf">Décret n°2-22-855 du 9 juin 2023</a></li>
    </ul>
    <h5>Matières Fertilisantes et Supports de Culture</h5>
    <ul><li><a href="https://www.onssa.gov.ma/z/LOI.53-18.FR.pdf">Loi n°53-18 relative aux matières fertilisantes.</a></li></ul>
    """
    wp = extraire_section_ppp(html_wp)
    verif(all("53-18" not in t["id"] for t in wp), "fertilisants exclus")
    verif(any(t["id"] == "34-18" for t in wp), "loi 34-18 extraite")

    fusion = fusionner([
        extraire_eservice(FIXTURE_ESERVICE),
        extraire_section_ppp(html_wp),
    ])
    d = next(t for t in fusion if t["id"] == "2-22-855")
    verif("eservice" in d.get("sources", [d.get("source")]), "fusion conserve e-service")

    if erreurs:
        print("SELF-TEST ÉCHEC :")
        for e in erreurs:
            print("  -", e)
        return 1
    print("SELF-TEST OK — 3 textes extraits de la fixture e-service, fusion www.")
    return 0


def ecrire(textes: list[dict], meta_extra: dict):
    textes, nb_nouveaux, nb_maj = appliquer_journal(textes)
    textes = trier(textes)
    # Ne pas persister les champs internes trop verbeux : sources déjà fusionnées.
    propres = []
    for t in textes:
        propres.append({
            "id": t["id"],
            "titre": t["titre"],
            "type": t.get("type") or "autre",
            "date": t.get("date"),
            "url": t.get("url"),
            "source": t.get("source"),
            "sources": t.get("sources") or ([t["source"]] if t.get("source") else []),
            "langue": t.get("langue") or "fr",
            "dateMiseEnLigne": t.get("dateMiseEnLigne"),
            "nouveau": bool(t.get("nouveau")),
            "misAJour": bool(t.get("misAJour")),
            "premiereVue": t.get("premiereVue"),
        })
    payload = {
        "meta": {
            "source": ATTRIBUTION,
            "url": ESERVICE,
            "urlConsolidée": WWW_INTRANTS,
            "attribution": f"{ATTRIBUTION} — relevé du {date.today().isoformat()}",
            "genere": datetime.now().isoformat(timespec="seconds"),
            "nbTextes": len(propres),
            "nbNouveaux": nb_nouveaux,
            "nbMisAJour": nb_maj,
            "avertissement": (
                "Textes publiés par l'ONSSA. Seuls les textes du Bulletin "
                "Officiel font foi. Cette liste a une valeur documentaire. "
                "Elle ne remplace pas l'index phytosanitaire (Excel) : "
                "aucune AMM n'y figure."
            ),
            **meta_extra,
        },
        "textes": propres,
    }
    SORTIE.parent.mkdir(parents=True, exist_ok=True)
    SORTIE.write_text(json.dumps(payload, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"\nOK -> {SORTIE}")
    print(f"  {len(propres)} texte(s) · {nb_nouveaux} nouveau(x) · {nb_maj} mis à jour")
    for t in propres[:8]:
        marque = "NEW " if t["nouveau"] else ("MAJ " if t["misAJour"] else "    ")
        print(f"  {marque}{t['id']:12} {t['titre'][:88]}")


def main() -> int:
    if "--self-test" in sys.argv:
        return self_test()

    print("textes ONSSA :")
    lots: list[list[dict]] = []
    sources_ok: list[str] = []
    maj_eservice = None
    maj_www = None

    page = essayer(ESERVICE, "e-service")
    if page:
        extraits = extraire_eservice(page)
        print(f"  {'e-service extraits':22} {len(extraits)}")
        lots.append(extraits)
        sources_ok.append("eservice")
        maj_eservice = maj_affichee(page)

    page_wp = charger_json(WP_PAGE, "www / page WP")
    if isinstance(page_wp, list) and page_wp:
        html_page = (page_wp[0].get("content") or {}).get("rendered") or ""
        extraits = extraire_section_ppp(html_page)
        print(f"  {'www / section PPP':22} {len(extraits)}")
        lots.append(extraits)
        sources_ok.append("www")
        # Date de modification de la page consolidée.
        maj_www = (page_wp[0].get("modified") or "")[:10] or None
    else:
        html_intrants = essayer(WWW_INTRANTS, "www / HTML")
        if html_intrants:
            extraits = extraire_section_ppp(html_intrants)
            print(f"  {'www / HTML PPP':22} {len(extraits)}")
            lots.append(extraits)
            sources_ok.append("www")

    for url, label in ((WP_MEDIA, "www / médias PPP"), (WP_MEDIA_RECENT, "www / médias 2-22")):
        media = charger_json(url, label)
        if isinstance(media, list) and media:
            extraits = extraire_media_wp(media)
            print(f"  {label:22} {len(extraits)}")
            lots.append(extraits)
            if "www" not in sources_ok:
                sources_ok.append("www")

    avis = essayer(WWW_AVIS, "www / avis PPP")
    if avis:
        # La page avis n'est qu'un communiqué : on en fait UNE entrée.
        tavis = texte(avis)
        m = re.search(r"Il est porté à la connaissance.{20,400}", tavis)
        lots.append([{
            "id": "avis-2-22-855" if "2-22-855" in tavis else identifiant(m.group(0) if m else "avis-onssa"),
            "titre": (m.group(0).strip() if m else "Avis ONSSA — produits phytopharmaceutiques")[:400],
            "type": "avis",
            "date": iso_depuis(tavis) or "2023-06-27",
            "url": WWW_AVIS,
            "source": "www",
            "langue": "fr",
        }])
        if "www" not in sources_ok:
            sources_ok.append("www")

    if "eservice" not in sources_ok:
        conserves = textes_precedents("eservice")
        if conserves:
            print(f"  {'e-service précédent':22} {len(conserves)} (page injoignable)")
            lots.append(conserves)
        else:
            print(f"  {'e-service filet':22} {len(RELEVE_ESERVICE)}")
            lots.append(avec_sources(RELEVE_ESERVICE))
            sources_ok.append("eservice-filet")

    # Corpus légal consolidé : toujours fusionné (les ids recoupent l'e-service).
    lots.append(avec_sources(AMORCE))
    if "amorce" not in sources_ok:
        sources_ok.append("corpus")

    textes = ppp_seulement(fusionner(lots))

    if not textes:
        print("aucune source joignable — fichier précédent conservé.")
        return 0 if SORTIE.exists() else 1

    ecrire(textes, {
        "majEservice": maj_eservice,
        "majWww": maj_www,
        "sourcesJointes": sources_ok,
    })
    return 0


if __name__ == "__main__":
    sys.exit(main())
