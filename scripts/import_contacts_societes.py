"""
Coordonnées publiques des fabricants, relues sur leur site officiel.

Entrée   scripts/sites-societes.json — un site officiel par ligne, avec les
         raisons sociales des registres qu'il couvre.
Sortie   data/contacts-societes.json

Règles, dans l'esprit des contacts ICAMA :
  - le site doit répondre et citer la société (un mot distinctif de sa raison
    sociale dans le HTML) ; sinon il est écarté, jamais deviné ;
  - e-mails et téléphones lus dans le HTML de l'accueil et des pages Contact
    (liens mailto:/tel:, mentions « Tel », e-mails protégés Cloudflare) ;
  - un e-mail n'est gardé que s'il est au domaine de la société ou chez une
    messagerie publique (163.com, gmail.com…) affichée par la société ;
  - seules les coordonnées publiées par la société sont relevées : aucune
    recherche de personnes, aucun profil LinkedIn ;
  - un site qui ne répond pas garde son dernier relevé.

    python scripts/import_contacts_societes.py            # tout le fichier
    python scripts/import_contacts_societes.py syngenta   # sites contenant « syngenta »
"""

from __future__ import annotations

import html
import json
import re
import shutil
import subprocess
import sys
import unicodedata
from concurrent.futures import ThreadPoolExecutor
from datetime import date
from pathlib import Path
from urllib.parse import unquote, urljoin, urlparse

RACINE = Path(__file__).resolve().parent.parent
ENTREE = RACINE / "scripts" / "sites-societes.json"
SORTIE = RACINE / "data" / "contacts-societes.json"
UA = "Rasd/1.0 (veille reglementaire)"

# Même liste que cleFabricant (lib/cle.ts) : formes sociales sans valeur distinctive.
FORMES = {"co", "ltd", "limited", "inc", "incorporated", "corp", "corporation", "company",
          "sa", "sas", "s", "a", "ltda", "gmbh", "ag", "bv", "nv", "pvt", "private", "pty", "plc", "llc", "srl",
          "spa", "kg", "jsc", "ooo", "zao", "oao", "pjsc", "the", "and", "de", "cv", "sl", "sac", "sae", "kft",
          "sro", "as", "ab", "oy", "lda", "cia", "cie", "et", "eirl", "sdn", "bhd", "tbk", "pte"}
# Mots trop communs pour prouver qu'une page parle de la bonne société.
GENERIQUES = FORMES | {
    "chemical", "chemicals", "chemistry", "chem", "agro", "agrochemical", "agrochemicals", "crop", "science",
    "sciences", "industrial", "industry", "industries", "group", "international", "intl", "biotech",
    "biotechnology", "technology", "technologies", "holding", "europe", "india", "china", "products",
    "protection", "solutions", "agricultural", "agriculture", "pesticide", "pesticides", "bio", "biochemical",
    "plant", "manufacturing", "mfg", "imp", "exp", "trading", "usa", "uk", "france", "espana", "spain",
    "deutschland", "benelux", "netherlands", "branch", "lifescience", "lifesciences", "biosciences",
    "bioscience", "agriscience", "agrosciences", "agroscience", "cropscience", "fine", "new", "union",
    "jiangsu", "zhejiang", "shandong", "hebei", "anhui", "hunan", "sichuan", "jiangxi", "ningxia", "liaoning",
    "inner", "mongolia", "henan", "hubei", "guangdong", "shanghai", "beijing", "weifang", "nantong",
    "rudong", "yancheng", "lianyungang", "ningbo", "nanjing", "hangzhou", "qingdao", "hefei", "anyang",
}
MESSAGERIES = {"163.com", "126.com", "qq.com", "gmail.com", "yahoo.com", "hotmail.com", "outlook.com",
               "sina.com", "sohu.com", "foxmail.com", "aliyun.com", "139.com", "yeah.net", "rediffmail.com",
               "vip.163.com", "vip.sina.com", "yahoo.co.in"}
EXCLUS = re.compile(r"(sentry|wixpress|example\.|domain\.|yourdomain|email\.com$|w3\.org|schema\.org|"
                    r"godaddy|cloudflare|jquery|\.png$|\.jpe?g$|\.gif$|\.svg$|\.webp$)", re.I)
RE_EMAIL = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}")
RE_TEL_TEXTE = re.compile(
    r"(?:\bTel\b|\bTél\b|\bPhone\b|\bTelephone\b|\bTéléphone\b|\bTeléfono\b|\bTelefono\b|\bTelefone\b|"
    r"\bTelefon\b|\bT\.|电话|電話|\bHotline\b|\bMob(?:ile)?\b)\s*[:：.]?\s*(\+?\(?\d[\d\s().\-/]{6,24}\d)", re.I)
RE_CONTACT = re.compile(r"contact|kontakt|contacto|contato|contatti|联系|聯繫|問い合わせ|iletisim|iletişim|"
                        r"reach-us|get-in-touch|enquiry|inquiry", re.I)
CHEMINS_CONTACT = ["/contact", "/contact-us", "/en/contact", "/en/contact-us", "/contactus", "/contacts",
                   "/en/contacts", "/contact.html", "/contactus.html", "/en/contactus.html"]
SLD = {"co", "com", "net", "org", "ac", "gov", "or", "ne"}


def mots(nom: str) -> list[str]:
    t = unicodedata.normalize("NFD", nom).encode("ascii", "ignore").decode().lower()
    t = re.sub(r"\(.*?\)", " ", t)
    return [m for m in re.sub(r"[^a-z0-9]+", " ", t).split() if m and m not in FORMES]


def domaine(url_ou_hote: str) -> str:
    """Domaine enregistré : « www.foo.co.uk » → « foo.co.uk »."""
    hote = urlparse(url_ou_hote).hostname if "//" in url_ou_hote else url_ou_hote
    parts = (hote or "").lower().split(".")
    if len(parts) >= 3 and parts[-2] in SLD and len(parts[-1]) == 2:
        return ".".join(parts[-3:])
    return ".".join(parts[-2:])


def recuperer(url: str) -> tuple[int, str, str]:
    """(statut HTTP, URL finale, HTML décodé). Certificats toujours vérifiés."""
    curl = shutil.which("curl")
    r = subprocess.run(
        [curl, "-sSL", "--compressed", "--max-time", "30", "--max-redirs", "6", "-A", UA,
         "-H", "Accept: text/html,application/xhtml+xml", "-H", "Accept-Language: en,fr;q=0.8",
         "-w", "\n%{http_code} %{url_effective}", url],
        capture_output=True,
    )
    brut = r.stdout
    fin = brut.rfind(b"\n")
    statut, _, finale = brut[fin + 1:].decode("ascii", "replace").partition(" ")
    corps = brut[:fin]
    m = re.search(rb"charset=[\"']?([A-Za-z0-9_-]+)", corps[:4000])
    enc = (m.group(1).decode() if m else "utf-8").lower()
    if enc in ("gb2312", "gbk"):
        enc = "gb18030"
    try:
        texte = corps.decode(enc, "replace")
    except LookupError:
        texte = corps.decode("utf-8", "replace")
    return (int(statut) if statut.isdigit() else 0), finale.strip() or url, texte


def cfemail(hexa: str) -> str:
    try:
        cle = int(hexa[:2], 16)
        return "".join(chr(int(hexa[i:i + 2], 16) ^ cle) for i in range(2, len(hexa), 2))
    except ValueError:
        return ""


def texte_visible(h: str) -> str:
    h = re.sub(r"(?is)<(script|style|noscript)\b.*?</\1>", " ", h)
    return html.unescape(re.sub(r"<[^>]+>", " ", h))


def cite_la_societe(h: str, noms: list[str]) -> bool:
    t = " " + re.sub(r"[^a-z0-9]+", " ", unicodedata.normalize("NFD", texte_visible(h) + " " + h[:3000])
                     .encode("ascii", "ignore").decode().lower()) + " "
    brut = texte_visible(h).lower().replace("ё", "е")
    for nom in noms:
        if not nom.isascii():
            # Raison sociale en cyrillique ou en caractères chinois : citée telle quelle.
            if nom.lower().replace("ё", "е") in brut:
                return True
            continue
        ms = mots(nom)
        distinctifs = [m for m in ms if m not in GENERIQUES and len(m) >= 3]
        if distinctifs and any(f" {m} " in t for m in distinctifs):
            return True
        if not distinctifs and ms and all(f" {m} " in t for m in ms):
            return True
    return False


def emails_de(h: str) -> list[str]:
    trouves = [cfemail(x) for x in re.findall(r'data-cfemail="([0-9a-fA-F]+)"', h)]
    trouves += [cfemail(x) for x in re.findall(r"/cdn-cgi/l/email-protection#([0-9a-fA-F]+)", h)]
    propre = re.sub(r"\\?u003[ce]", " ", html.unescape(h).replace("%40", "@")).replace("mailto:", " ")
    trouves += RE_EMAIL.findall(propre)
    return [re.sub(r"^mailto", "", e.lower().strip(".")) for e in trouves if e and not EXCLUS.search(e)]


def telephones_de(h: str) -> list[str]:
    bruts = [unquote(html.unescape(x)) for x in re.findall(r'href=["\']tel:([^"\']+)["\']', h, re.I)]
    bruts += RE_TEL_TEXTE.findall(texte_visible(h))
    out = []
    for b in bruts:
        b = re.sub(r"\s+", " ", re.sub(r"^tel:", "", b.strip(), flags=re.I)).strip(" -./")
        chiffres = re.sub(r"\D", "", b)
        if 8 <= len(chiffres) <= 16 and not re.fullmatch(r"(19|20)\d{2}\D*", b):
            out.append(b)
    return out


# Adresses de service publiées pour les demandes commerciales. Une adresse
# nominative (prenom.nom@…) ou d'un service sans rapport (presse, RH,
# investisseurs, données personnelles) n'est pas gardée.
ROLES = re.compile(r"^(info|sales|export|contact|office|marketing|inquir|enquir|service|customer|trade|"
                   r"international|global|regulatory|registration|agro|business|comercial|commercial|"
                   r"vendas|ventas|vertrieb|order|support|tech|kontakt|hello|general|mail|admin|sekretariat|"
                   r"secretaria|reception|crop|plant)", re.I)
HORS_SUJET = re.compile(r"(privacy|gdpr|rgpd|dpo|datenschutz|career|job|hr\b|askhr|resume|recruit|benefit|"
                        r"investor|^ir@|shareholder|actionnaire|media|press|^pr@|communication|webmaster|"
                        r"compliance|ethic|whistle|legal|scip|sustainab)", re.I)
PREMIERES = {"info", "sales", "export", "contact", "agro", "international", "office", "comercial",
             "commercial", "marketing", "global-sales", "enquiry", "inquiry", "contacto", "kontakt"}
# Pages Contact d'un service sans rapport avec un achat de matière.
PAGES_EXCLUES = re.compile(r"investor|/ir[/_-]|ir_en|shareholder|media|press|news|career|job|privacy|legal|"
                           r"cookie|recruit|tostaff|sustainab|whistle|ethic", re.I)


def garder_email(e: str, site: str, noms: list[str]) -> bool:
    local, d = e.split("@", 1)
    local = re.sub(r"^mailto", "", local)
    if HORS_SUJET.search(local + "@"):
        return False
    distinctifs = [m for nom in noms for m in mots(nom) if m not in GENERIQUES and len(m) >= 4]
    if not (ROLES.match(local) or any(m in local for m in distinctifs) or local in {"sml", "iqv", "dcm"}):
        return False
    if d in MESSAGERIES or domaine(d) == domaine(site):
        return True
    racine = domaine(d).split(".")[0]
    return any(m in racine for m in distinctifs)


def uniques(xs: list[str], cle) -> list[str]:
    vus, out = set(), []
    for x in xs:
        k = cle(x)
        if k and k not in vus:
            vus.add(k)
            out.append(x)
    return out


def relever(ligne: dict) -> dict:
    site, noms = ligne["site"], ligne["noms"]
    statut, finale, h = recuperer(site)
    base = {"site": site, "noms": noms, "verifie": date.today().isoformat()}
    if statut != 200 or not h.strip():
        return {**base, "statut": f"http {statut or 'injoignable'}"}
    if not cite_la_societe(h, noms):
        return {**base, "statut": "site sans le nom de la société"}

    pages = [(finale, h)]
    liens = []
    if ligne.get("contact"):
        liens.append(ligne["contact"])
    for href, txt in re.findall(r'<a\b[^>]*href=["\']([^"\'#]+)["\'][^>]*>(.*?)</a>', h, re.I | re.S):
        if RE_CONTACT.search(href) or RE_CONTACT.search(texte_visible(txt)):
            u = urljoin(finale, href)
            if (urlparse(u).scheme in ("http", "https") and domaine(u) == domaine(finale)
                    and not PAGES_EXCLUES.search(urlparse(u).path)):
                liens.append(u)
    for u in uniques(liens, lambda x: x.rstrip("/"))[:3]:
        s, f, hc = recuperer(u)
        if s == 200:
            pages.append((f, hc))
    if len(pages) == 1:
        # Menu construit en JavaScript : les adresses Contact usuelles sont essayées,
        # seule une page qui répond 200 et cite la société est lue.
        for chemin in CHEMINS_CONTACT:
            s, f, hc = recuperer(urljoin(finale, chemin))
            if s == 200 and cite_la_societe(hc, noms) and urlparse(f).path.rstrip("/") not in ("", "/en", "/fr"):
                pages.append((f, hc))
                break

    emails, tels, sources = [], [], []
    # Pages Contact d'abord : ce sont elles que la société destine aux demandes.
    for url, hp in pages[1:] + pages[:1]:
        e = [x for x in emails_de(hp) if garder_email(x, finale, noms)]
        t = telephones_de(hp)
        if (e or t) and url not in sources:
            sources.append(url)
        emails += e
        tels += t
    emails = uniques(emails, str.lower)
    # Adresse générale d'abord (info@, sales@, export@…), puis les autres services.
    emails.sort(key=lambda x: 0 if x.split("@")[0] in PREMIERES else 1 if ROLES.match(x) else 2)
    tels = uniques(tels, lambda x: re.sub(r"\D", "", x)[-9:])
    return {
        **base,
        "site": finale,
        "emails": emails[:4],
        "telephones": tels[:3],
        "sources": sources[:3],
        "statut": "ok" if emails or tels else "site sans coordonnées lisibles",
    }


def main() -> None:
    entree = json.loads(ENTREE.read_text(encoding="utf-8"))["sites"]
    filtre = sys.argv[1].lower() if len(sys.argv) > 1 else ""
    if filtre:
        entree = [l for l in entree if filtre in l["site"].lower() or any(filtre in n.lower() for n in l["noms"])]
    precedent = {}
    if SORTIE.exists():
        precedent = {s["site"]: s for s in json.loads(SORTIE.read_text(encoding="utf-8"))["societes"]}

    with ThreadPoolExecutor(8) as ex:
        resultats = list(ex.map(relever, entree))

    final = dict(precedent) if filtre else {}
    for ligne, r in zip(entree, resultats):
        ancien = precedent.get(ligne["site"]) or next(
            (p for p in precedent.values() if set(p["noms"]) & set(ligne["noms"])), None)
        if r["statut"].startswith("http") and ancien and ancien.get("statut") == "ok":
            print(f"  {ligne['site'][:50]:50} {r['statut']} : dernier relevé conservé")
            final[ligne["site"]] = ancien
            continue
        if ancien and ancien["site"] != r["site"]:
            final.pop(ancien["site"], None)
        final[r["site"]] = r
        print(f"  {r['site'][:50]:50} {r['statut']:32} {len(r.get('emails', []))} e-mail(s), "
              f"{len(r.get('telephones', []))} tél.")

    societes = sorted(final.values(), key=lambda s: s["noms"][0].lower())
    SORTIE.write_text(json.dumps({
        "_lisezmoi": [
            "Coordonnées publiées par les fabricants sur leur site officiel, relues dans le HTML.",
            "Un site est gardé s'il répond et cite la société ; un e-mail s'il est au domaine de",
            "la société ou chez une messagerie publique affichée par elle. Aucune donnée de personne",
            "n'est recherchée : ce sont les adresses de contact que la société publie.",
        ],
        "meta": {"dateTest": date.today().isoformat(), "nbSites": len(societes),
                 "nbJoignables": sum(1 for s in societes if s["statut"] == "ok")},
        "societes": societes,
    }, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    ok = sum(1 for s in societes if s["statut"] == "ok")
    print(f"{len(societes)} sites, {ok} avec e-mail ou téléphone : {SORTIE.relative_to(RACINE)}")


if __name__ == "__main__":
    main()
