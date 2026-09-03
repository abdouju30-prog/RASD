"""
Import du Catalogue d'État russe des pesticides -> data/russie.json

    python scripts/import_gospesticid.py

POURQUOI CETTE SOURCE.

C'est l'équivalent russe de l'E-Phy français : un document officiel qui nomme,
pour chaque produit homologué, la ou les sociétés qui en détiennent
l'homologation. La Russie est un pays de sourcing générique où l'outil ne
connaissait que deux sociétés — contre vingt-quatre pour l'Inde et la Chine.

⚠️ POURQUOI UN MIROIR RÉGIONAL, ET NON LE SITE FÉDÉRAL.
`mcx.gov.ru` ne répond pas depuis l'extérieur de la Russie. Le même document
officiel est republié par les ministères régionaux de l'agriculture, qui eux
répondent. Ce n'est pas une copie officieuse : c'est le PDF du Minselkhoz,
octet pour octet, hébergé ailleurs.

⚠️ CE QUE CE FICHIER NE DIT PAS.
Aucune valeur réglementaire au Maroc : une homologation russe n'ouvre pas la
voie me-too et ne remplace aucune étude de l'Annexe 3-B. Le détenteur d'une
homologation russe n'est pas nécessairement le fabricant de la matière active —
c'est souvent un distributeur ou la filiale russe d'un groupe étranger.

⚠️ L'ÉDITION ACCESSIBLE EST DATÉE. Le miroir sert la version du 4 avril 2022.
Elle reste utile pour ce qu'on lui demande — IDENTIFIER DES SOCIÉTÉS, qui ne
disparaissent pas en quatre ans — mais ses dates d'expiration et ses numéros
d'homologation ne valent plus comme statut courant. Le module l'affiche.

Source : Минсельхоз России — « Государственный каталог пестицидов и
агрохимикатов, разрешенных к применению на территории Российской Федерации ».
Document officiel ; la citation impose la référence à l'édition.
"""

import json
import re
import unicodedata
from collections import defaultdict
from datetime import datetime
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent
SORTIE = RACINE / "data" / "russie.json"
CACHE = RACINE / "data" / "_cache" / "gospesticid.pdf"

# Miroirs régionaux du même document officiel, essayés dans l'ordre.
MIROIRS = [
    ("Ministère de l'agriculture de l'oblast d'Oulianovsk",
     "https://mcx73.ru/upload/iblock/246/"
     "%D0%93%D0%BE%D1%81%D1%83%D0%B4%D0%B0%D1%80%D1%81%D1%82%D0%B2%D0%B5%D0%BD"
     "%D0%BD%D1%8B%D0%B9%20%D0%BA%D0%B0%D1%82%D0%B0%D0%BB%D0%BE%D0%B3%20"
     "%D0%BF%D0%B5%D1%81%D1%82%D0%B8%D1%86%D0%B8%D0%B4%D0%BE%D0%B2%20%D0%B8%20"
     "%D0%B0%D0%B3%D1%80%D0%BE%D1%85%D0%B8%D0%BC%D0%B8%D0%BA%D0%B0%D1%82%D0%BE"
     "%D0%B2.pdf"),
]

SOURCE = "Минсельхоз России — Государственный каталог пестицидов и агрохимикатов"
URL_OFFICIELLE = (
    "https://mcx.gov.ru/ministry/departments/"
    "departament-rastenievodstva-mekhanizatsii-khimizatsii-i-zashchity-rasteniy/"
)

# ── Repères de découpage ────────────────────────────────────────────────────
# Une entrée se lit : « matière active | Produit, FORME (teneur) | société(s) |
# classe de danger | numéro d'homologation | échéance ».

NUMERO = re.compile(r"(\d{3}(?:\([\d,\s]*\))?-\d{2}-\d{3,4}-\d)\s+(\d{2}\.\d{2}\.\d{4})")
# « Каратэ Зеон, МКС (50 г/л) » — la forme galénique est en capitales.
FIN_PRODUIT = re.compile(r",\s*([А-ЯЁ]{1,4}(?:-[А-ЯЁ]{1,3})?)\s*(\([^)]{0,80}\))?\s*$")
CLASSE = re.compile(r"\s*\d[\d\s\-]*/\s*\d\s*$")
GUILLEMETS = re.compile("[«\"“]([^»\"”]{2,90})[»\"”]")

# ⚠️ Ces formes se comparent en TOKENS ENTIERS, jamais en sous-chaînes.
# « Щёлково Агрохим », premier producteur russe, contient « АГ » : testé en
# sous-chaîne il ressortait étranger, avec Syngenta et BASF. Le premier jet le
# faisait, et le classement des sociétés russes s'en trouvait inversé.
FORMES_RU = {"ООО", "АО", "ЗАО", "ОАО", "ПАО", "НПФ", "НПП", "НПО", "ПО", "ТПК",
             "УК", "МНТЦ", "ИП", "ФКП", "КФХ", "НПЦ", "ТД", "ГК", "ФИРМА"}
# Formes étrangères translittérées : l'entité est immatriculée hors de Russie.
# C'est le seul indice de nationalité que porte le catalogue, et il est bon —
# « ЛТД » ou « ГМБХ » ne s'appliquent pas à une société russe.
# « КО » en est volontairement absent : « Агрорус и Ко » est une société russe,
# et « и Ко » traduit « & Co » aussi bien en russe qu'ailleurs. Les sociétés
# asiatiques écrites « Ко., Лтд » restent prises par « ЛТД ».
FORMES_ETR = {"ЛТД", "ГМБХ", "АГ", "АС", "СА", "СЛ", "ИНК", "БВ", "КФТ", "АД",
              "ДОО", "СПА", "ЛЛС", "ЛЛК", "САРЛ", "САС", "ПТЕ", "КОРП", "НВ",
              "ОЮ", "АПС", "СРЛ", "СЕ"}

TRANSLIT = {
    "а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "е": "e", "ё": "e",
    "ж": "zh", "з": "z", "и": "i", "й": "y", "к": "k", "л": "l", "м": "m",
    "н": "n", "о": "o", "п": "p", "р": "r", "с": "s", "т": "t", "у": "u",
    "ф": "f", "х": "kh", "ц": "ts", "ч": "ch", "ш": "sh", "щ": "shch",
    "ъ": "", "ы": "y", "ь": "", "э": "e", "ю": "yu", "я": "ya",
}


def translitterer(s: str) -> str:
    """Cyrillique -> latin. Un handle pour chercher, jamais une identité prouvée.

    Le catalogue rend les noms étrangers phonétiquement : « СИНГЕНТА » pour
    Syngenta, « КЕМИНОВА » pour Cheminova. La translittération inverse ne
    retrouve donc pas l'orthographe d'origine — elle donne de quoi chercher.
    C'est pourquoi les sociétés qui comptent passent par la table d'alias.
    """
    out = []
    for i, c in enumerate(s):
        b = c.lower()
        if b not in TRANSLIT:
            out.append(c)
            continue
        t = TRANSLIT[b]
        if not c.isupper():
            out.append(t)
        elif i + 1 < len(s) and s[i + 1].islower():
            # « Щелково » -> « Shchelkovo », pas « SHCHelkovo » : seule la
            # première lettre du digramme se met en capitale au fil du mot.
            out.append(t.capitalize())
        else:
            out.append(t.upper())
    return "".join(out)


# Sociétés étrangères que la seule forme juridique ne suffit pas à situer.
# Table explicite plutôt qu'un rapprochement phonétique : une identité
# réglementaire ne se devine pas. Chaque ligne a été lue dans le catalogue.
ALIAS = {
    "СИНГЕНТА": ("Syngenta", "Suisse"),
    "БАЙЕР": ("Bayer", "Allemagne"),
    "БАСФ": ("BASF", "Allemagne"),
    "КЕМИНОВА": ("Cheminova A/S", "Danemark"),
    "ДЮПОН": ("DuPont", "États-Unis"),
    "ЭФЭМСИ": ("FMC", "États-Unis"),
    "ЮПЛ": ("UPL", "Inde"),
    "РАНГОЛИ": ("Rangoli Agrotech", "Inde"),
    "АДАМА": ("Adama", "Israël"),
    "РОТАМ": ("Rotam", "Chine"),
    # ⚠️ Le groupe Nufarm est australien, mais l'entité qui détient les
    # homologations russes est « Нуфарм ГмбХ и Ко. КГ » — Linz, Autriche. La
    # table nomme l'ENTITÉ, pas le groupe : classer ces lignes en « Australie »
    # faisait apparaître un fournisseur australien qui n'existe pas.
    "НУФАРМ": ("Nufarm GmbH & Co KG", "Autriche"),
    "САММИТ АГРО": ("Summit Agro", "Japon"),
    "СУМИТОМО": ("Sumitomo Chemical", "Japon"),
    "АРИСТА": ("Arysta LifeScience", "France"),
    "ГАРДА": ("Gharda Chemicals", "Inde"),
    "ШАРДА": ("Sharda Cropchem", "Inde"),
    "КРИСТАЛ КРОП": ("Crystal Crop Protection", "Inde"),
    "ХЕРАНБА": ("Heranba Industries", "Inde"),
    "ТАГРОС": ("Tagros Chemicals", "Inde"),
    "МЕГХМАНИ": ("Meghmani Organics", "Inde"),
    "ВИЛЛОВУД": ("Willowood", "Inde"),
    "БЕСТ АГРОЛАЙФ": ("Best Agrolife", "Inde"),
    "АГРОБЕСТ ГРУП": ("Agrobest Grup", "Turquie"),
    "АГРИЯ": ("Agria AD", "Bulgarie"),
    "ФРАНДЕСА": ("Frandesa", "Biélorussie"),
    "АГРО-КЕМИ": ("Agro-Kemi", "Hongrie"),
    "ХЕМИНОВА": ("Cheminova", "Danemark"),
    "КОРТЕВА": ("Corteva", "États-Unis"),
    # Sociétés asiatiques et européennes lues dans le catalogue. Celles de
    # Chine comptent double : plusieurs sont déjà fournisseurs à l'ONSSA, et
    # les retrouver ici corrobore l'existence d'une production réelle.
    "ШАНДОНГ ВЕЙФАНГ РЕЙНБОУ": ("Shandong Weifang Rainbow Chemical", "Chine"),
    "ЧЖАНГСУ ГУД ХАРВЕСТ": ("Jiangsu Good Harvest-Weien Agrochemical", "Chine"),
    "КИНГТАЙ": ("Kingtai Chemicals", "Chine"),
    "НИППОН СОДА": ("Nippon Soda", "Japon"),
    "КУМИАИ": ("Kumiai Chemical Industry", "Japon"),
    "ШИН-ЕТСУ": ("Shin-Etsu Chemical", "Japon"),
    "АЛЬБАУ": ("Albaugh", "États-Unis"),
    "СТОЛЛЕР": ("Stoller", "États-Unis"),
    "ГЛОБАКЕМ": ("Globachem", "Belgique"),
    "ПЕТЕРС": ("Peters & Burg", "Hongrie"),
    "АГРИ ЗВЕЗДА": ("Agri Star", "Hongrie"),
    "АНДЕРМАТТ": ("Andermatt Biocontrol", "Suisse"),
    "МОНСАНТО": ("Monsanto", "États-Unis"),
    "СИНТЕЗИЯ": ("Synthesia", "Tchéquie"),
}


# Le catalogue renvoie à ses notes de bas de page par « 3/ » accolé au nom du
# détenteur, et marque d'un astérisque les homologations sous condition.
#
# ⚠️ Le chiffre est parfois un « З » CYRILLIQUE, qui se lit comme un 3 mais que
# `\d` ignore. « Байер КропСайенс АГ З/ » ressortait alors comme une société
# distincte de « Байер КропСайенс АГ ». La classe accepte donc n'importe quel
# caractère de mot, court : aucune raison sociale ne se termine par « X/ ».
#
# ⚠️ Un détenteur en porte souvent DEUX à la suite — « … АГ 3/ 1/ ». Le motif
# est donc répété : sans le `+`, seul le dernier partait et la société sortait
# encore sous deux noms. « КЕМИНОВА А/С » n'est pas touchée, la chaîne ne se
# terminant pas par une barre : c'est la forme juridique danoise, pas un renvoi.
NOTE = re.compile(r"(?:\s*[0-9A-Za-zА-Яа-яЁё]{1,3}\s*/)+\s*$")


def normaliser(s: str) -> str:
    # ⚠️ L'ORDRE COMPTE. La ponctuation se retire AVANT le renvoi de note :
    # « … АГ 3/ - » se terminait par un tiret, le motif de note ne mordait pas,
    # et le nettoyage de ponctuation laissait « … АГ 3/ » derrière lui.
    s = unicodedata.normalize("NFKC", s or "").strip()
    # « АГРОХИМ- XXI » : césure du PDF qu'on n'a pas pu recoller plus tôt,
    # le second morceau étant en caractères latins.
    s = re.sub(r"-\s+", "-", s)
    s = re.sub(r"\s+", " ", s).strip(" *,.;:·—- ")
    return NOTE.sub("", s).strip(" *,.;:·—- ")


def cle(s: str) -> str:
    return re.sub(r"[^A-ZА-ЯЁ0-9]+", " ", normaliser(s).upper()).strip()


def tokens(s: str):
    return set(cle(s).split())


def societes_du_bloc(bloc: str):
    """(nom, formes juridiques) par société citée, plus ce qui reste non découpé.

    ⚠️ LA FORME JURIDIQUE EST HORS DES GUILLEMETS : le catalogue écrit
    ООО «Сибагрохим». N'extraire que l'intérieur des guillemets perdait
    précisément l'indice de nationalité. On lit donc les quarante caractères
    qui précèdent chaque ouverture de guillemet.

    Les noms entre guillemets sont sûrs. Le reste — noms étrangers écrits sans
    guillemets, « РОТАМ ЛТД » — est repris tel quel plutôt que jeté : une
    société mal découpée se repère, une société absente ne se repère pas.
    """
    bloc = normaliser(bloc)
    if not bloc:
        return [], None
    out = []
    for m in GUILLEMETS.finditer(bloc):
        nom = normaliser(m.group(1))
        if not nom:
            continue
        avant = bloc[max(0, m.start() - 40):m.start()]
        formes = (tokens(avant) | tokens(nom)) & (FORMES_RU | FORMES_ETR)
        out.append((nom, sorted(formes)))
    if out:
        return out, None
    formes = tokens(bloc) & (FORMES_RU | FORMES_ETR)
    if formes and len(bloc) <= 90:
        return [(bloc, sorted(formes))], None
    return [], bloc or None


def alias_de(nom: str):
    """(nom latin, pays) si la société figure à la table, sinon (None, None)."""
    u = cle(nom)
    for k, (latin, pays) in ALIAS.items():
        if cle(k) in u:
            return latin, pays
    return None, None


def qualifier(nom: str, formes):
    """(pays|None, fiable, étrangère) pour une société du catalogue.

    Trois degrés, du plus sûr au moins sûr :
      1. table d'alias     — pays nommé, vérifié à la lecture
      2. forme étrangère   — hors de Russie, mais le pays reste inconnu
      3. forme russe seule — immatriculée en Russie, ce qui n'exclut pas
                             qu'elle soit la filiale d'un groupe étranger
    """
    f = set(formes or [])
    _, pays = alias_de(nom)
    if pays:
        return pays, True, pays != "Russie"
    if f & FORMES_ETR:
        return None, False, True
    if f & FORMES_RU:
        return "Russie", False, False
    return None, False, False


# ── Téléchargement ──────────────────────────────────────────────────────────

def telecharger() -> bytes:
    import urllib.request
    if CACHE.exists() and CACHE.stat().st_size > 1_000_000:
        print(f"  cache : {CACHE.name} ({CACHE.stat().st_size:,} octets)")
        return CACHE.read_bytes()
    dernier = None
    for hote, url in MIROIRS:
        try:
            print(f"  téléchargement — {hote}")
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=180) as r:
                data = r.read()
            if len(data) < 1_000_000:
                raise ValueError(f"réponse trop courte ({len(data)} octets)")
            CACHE.parent.mkdir(parents=True, exist_ok=True)
            CACHE.write_bytes(data)
            return data
        except Exception as exc:  # noqa: BLE001
            print(f"    échec : {exc}")
            dernier = exc
    raise SystemExit(f"Aucun miroir n'a répondu. Dernière erreur : {dernier}")


def main():
    print(f"catalogue d'État russe — {SOURCE}")
    data = telecharger()

    try:
        import fitz
    except ImportError:
        raise SystemExit("PyMuPDF requis :  pip install pymupdf")

    doc = fitz.open(stream=data, filetype="pdf")
    print(f"  {doc.page_count} pages")
    brut = "\n".join(doc[i].get_text() for i in range(doc.page_count))

    m = re.search(r"по состоянию на\s+(\d{1,2}\s+\S+\s+\d{4})", brut)
    edition = m.group(1) if m else None

    # ⚠️ RECOLLER LES MOTS CÉSURÉS AVANT D'APLATIR. Le PDF coupe les mots longs
    # en fin de ligne : « АГРОХИМИЧЕС-\nКИЕ ТЕХНОЛОГИИ ». Aplati d'abord, le
    # tiret devient indissociable d'un vrai trait d'union — « Агро-Кеми » — et
    # la société sort du fichier sous deux noms. La réparation se fait donc
    # tant que les retours de ligne sont là, et seulement entre deux lettres
    # cyrilliques : les plages de doses « 0,1-\n0,15 » ne sont pas touchées.
    brut = re.sub(r"([А-Яа-яЁё])-\s*\n\s*([А-Яа-яЁё])", r"\1\2", brut)

    # Le PDF coupe aussi les numéros d'homologation en fin de ligne.
    plat = re.sub(r"\s+", " ", brut)
    plat = re.sub(r"(-\d{3,4}-)\s+(\d)", r"\1\2", plat)
    plat = re.sub(r"(\d{3}(?:\([\d,\s]*\))?)-\s*(\d{2})-", r"\1-\2-", plat)

    entrees = []
    non_decoupes = 0
    for x in NUMERO.finditer(plat):
        amont = CLASSE.sub("", plat[max(0, x.start() - 320):x.start()])
        fin = FIN_PRODUIT.search(amont)
        if fin:
            produit = amont[:fin.end()].strip()
            bloc = amont[fin.end():]
        else:
            # Sans forme galénique reconnue, on retombe sur la dernière
            # parenthèse fermante — moins sûr, mais rien n'est inventé.
            j = amont.rfind(")")
            produit = amont[:j + 1].strip() if j >= 0 else ""
            bloc = amont[j + 1:] if j >= 0 else amont

        noms, reste = societes_du_bloc(bloc)
        if not noms:
            non_decoupes += 1
        entrees.append({
            "numero": x.group(1),
            "expiration": x.group(2),
            "produit": normaliser(produit)[-120:] or None,
            "societes": [{"nom": n, "formes": f} for n, f in noms],
            "blocNonDecoupe": reste,
        })

    # ── Agrégation par société ──────────────────────────────────────────────
    par = defaultdict(lambda: {"nom": None, "produits": [], "numeros": [], "formes": set()})
    for e in entrees:
        for s in e["societes"]:
            v = par[cle(s["nom"])]
            v["nom"] = v["nom"] or s["nom"]
            v["formes"].update(s["formes"])
            if e["produit"]:
                v["produits"].append(e["produit"])
            v["numeros"].append(e["numero"])

    societes = []
    for k, v in par.items():
        nom = v["nom"]
        pays, fiable, etr = qualifier(nom, v["formes"])
        latin, _ = alias_de(nom)
        societes.append({
            "cle": k,
            "nom": nom,
            "latin": latin or translitterer(nom),
            "identifie": bool(latin),
            "formes": sorted(v["formes"]),
            "etrangere": etr,
            "pays": pays,
            "paysFiable": fiable,
            "nbHomologations": len(set(v["numeros"])),
            "produits": sorted(set(v["produits"]))[:40],
        })
    societes.sort(key=lambda x: (-x["nbHomologations"], x["nom"] or ""))

    par_pays = defaultdict(int)
    for s in societes:
        par_pays[s["pays"] or ("hors Russie, pays à préciser" if s["etrangere"] else "—")] += 1

    payload = {
        "meta": {
            "source": SOURCE,
            "url": URL_OFFICIELLE,
            "miroir": MIROIRS[0][0],
            "edition": edition,
            "attribution": f"{SOURCE} — édition au {edition or 'date non lue'}",
            "genere": datetime.now().isoformat(timespec="seconds"),
            "nbPages": doc.page_count,
            "nbEntrees": len(entrees),
            "nbSocietes": len(societes),
            "nbRusses": sum(1 for s in societes if s["pays"] == "Russie"),
            "nbEtrangeres": sum(1 for s in societes if s["etrangere"]),
            "nbSansSociete": non_decoupes,
            "parPays": sorted(par_pays.items(), key=lambda kv: -kv[1]),
            "avertissement": (
                "Catalogue d'État russe des pesticides. Aucune valeur "
                "réglementaire au Maroc : ni voie me-too, ni étude en moins. "
                "Le détenteur d'une homologation russe n'est pas "
                "nécessairement le fabricant de la matière active. L'édition "
                "accessible étant datée, elle sert à IDENTIFIER des sociétés, "
                "pas à établir un statut réglementaire courant."
            ),
        },
        "societes": societes,
        "entrees": entrees,
    }

    SORTIE.parent.mkdir(parents=True, exist_ok=True)
    SORTIE.write_text(json.dumps(payload, ensure_ascii=False, indent=1), encoding="utf-8")

    print(f"OK -> {SORTIE}")
    print(f"  édition : {edition}")
    print(f"  {len(entrees)} homologations · {non_decoupes} sans société identifiée")
    print(f"  {len(societes)} sociétés · {payload['meta']['nbRusses']} russes · "
          f"{payload['meta']['nbEtrangeres']} étrangères\n")
    for s in societes[:14]:
        d = (s["pays"] or ("étranger" if s["etrangere"] else "?"))[:22]
        print(f"    {s['nbHomologations']:>4}  {d:<22} {(s['nom'] or '')[:40]:<40} {s['latin'][:24]}")


if __name__ == "__main__":
    main()
