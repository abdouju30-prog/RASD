"""
Import du Catalogue d'État russe des pesticides -> data/russie.json

    python scripts/import_gospesticid.py
    python scripts/import_gospesticid.py --sans-iso   # sans régénérer data/_iso.json

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
import subprocess
import sys
import unicodedata
from collections import defaultdict
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _chimie import cle_chimique, verifier_collisions  # noqa: E402

RACINE = Path(__file__).resolve().parent.parent
SORTIE = RACINE / "data" / "russie.json"
CACHE = RACINE / "data" / "_cache" / "gospesticid.pdf"
ISO = RACINE / "data" / "_iso.json"

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

# ── Lecture du PDF ──────────────────────────────────────────────────────────
#
# ⚠️ LA STRUCTURE EST DANS LES STYLES, PAS DANS LE TEXTE. Le catalogue compose
# les matières actives en GRAS ITALIQUE et les noms de produits en GRAS. Le
# premier jet reconstituait tout à coups d'expressions régulières sur le texte
# aplati ; c'était deviner ce que le document déclare. On lit donc les styles.
GRAS, ITALIQUE = 16, 2

NUMERO = re.compile(r"(\d{3}(?:\([\d,\s]*\))?-\d{2}-\d{3,4}-\d)\s+(\d{2}\.\d{2}\.\d{4})")

# Le catalogue renvoie à ses notes de bas de page par « 3/ » accolé au nom du
# détenteur, et marque d'un astérisque les homologations sous condition.
#
# ⚠️ Le chiffre est parfois un « З » CYRILLIQUE, qui se lit comme un 3 mais que
# `\d` ignore. Et un détenteur en porte souvent DEUX à la suite — « … АГ 3/ 1/ ».
# « КЕМИНОВА А/С » n'est pas touchée : la chaîne ne se termine pas par une
# barre, c'est la forme juridique danoise et non un renvoi.
NOTE = re.compile(r"(?:\s*[0-9A-Za-zА-Яа-яЁё]{1,3}\s*/)+\s*$")
GUILLEMETS = re.compile("[«\"“]([^»\"”]{2,90})[»\"”]")

# ⚠️ Ces formes se comparent en TOKENS ENTIERS, jamais en sous-chaînes.
# « Щёлково Агрохим », premier producteur russe, contient « АГ » : testé en
# sous-chaîne il ressortait étranger, avec Syngenta et BASF.
FORMES_RU = {"ООО", "АО", "ЗАО", "ОАО", "ПАО", "НПФ", "НПП", "НПО", "ПО", "ТПК",
             "УК", "МНТЦ", "ИП", "ФКП", "КФХ", "НПЦ", "ТД", "ГК", "ФИРМА"}
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
            # « Щелково » -> « Shchelkovo », pas « SHCHelkovo ».
            out.append(t.capitalize())
        else:
            out.append(t.upper())
    return "".join(out)


# Sociétés étrangères que la seule forme juridique ne suffit pas à situer.
ALIAS_SOCIETES = {
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


def normaliser(s: str) -> str:
    # ⚠️ L'ORDRE COMPTE. La ponctuation se retire AVANT le renvoi de note :
    # « … АГ 3/ - » se terminait par un tiret, le motif de note ne mordait pas,
    # et le nettoyage de ponctuation laissait « … АГ 3/ » derrière lui.
    s = unicodedata.normalize("NFKC", s or "").strip()
    # « АГРОХИМ- XXI » : césure du PDF, le second morceau étant en latin.
    s = re.sub(r"-\s+", "-", s)
    s = re.sub(r"\s+", " ", s).strip(" *,.;:·—- ")
    return NOTE.sub("", s).strip(" *,.;:·—- ")


def cle(s: str) -> str:
    return re.sub(r"[^A-ZА-ЯЁ0-9]+", " ", normaliser(s).upper()).strip()


def tokens(s: str):
    return set(cle(s).split())


# ── Rapprochement des matières actives avec les noms ISO ────────────────────
#
# Le catalogue nomme les substances en russe, l'index marocain en français, et
# les registres étrangers en ISO anglais. Le pont français -> ISO existe déjà
# (lib/apvma.ts, via data/_iso.json) ; reste le pont russe -> ISO.
#
# ⚠️ LA RÈGLE VIT DANS scripts/_chimie.py, pas ici. Le registre brésilien pose
# exactement le même problème depuis le portugais : deux implémentations
# auraient dérivé l'une de l'autre sans qu'on s'en aperçoive.


# Correspondances que la réduction phonétique ne peut pas produire : traductions
# (« Сера » pour SULPHUR), formes descriptives de l'index marocain, ou lettres
# d'isomère écrites en cyrillique. Chacune a été lue dans le catalogue.
ALIAS_MATIERES = {
    "SULPHUR": "Сера",
    "PYRETHRIN": "Экстракт натуральных пиретринов",
    "QUIZALOFOP-P-ETHYL": "Хизалофоп-П-этил",
    "LAMBDA-CYHALOTHRIN": "Лямбда-цигалотрин",
    "GAMMA-CYHALOTHRIN": "Гамма-цигалотрин",
    "FENHEXAMID": "Фенгексамид",
    "METALDEHYDE": "Метальдегид",
    "COPPER PRESENT AS COPPER OXYCHLORIDE": "Медь оксихлорид",
    "CHLORMEQUAT PRESENT AS CHLORMEQUAT CHLORIDE": "Хлормекватхлорид",
    "GLYPHOSATE ACID": "Глифосат кислоты",
    "2,4-D 2-ETHYLHEXYL ESTER": "2,4-Д (2-этилгексиловый эфир)",
    "FOSETYL-ALUMINIUM": "Алюминия фосэтил",
    "IODOSULFURON-METHYL-SODIUM": "Йодосульфурон-метил-натрий",
    "DIMETHENAMID-P": "Диметенамид-Р",
    "PYRAFLUFEN-ETHYL": "Пирафлуфен-этила",
    "DIFLUFENICAN": "дифлюфеникан",
}


def societes_du_bloc(bloc: str):
    """(nom, formes juridiques) par société citée, plus ce qui reste non découpé.

    ⚠️ LA FORME JURIDIQUE EST HORS DES GUILLEMETS : le catalogue écrit
    ООО «Сибагрохим». N'extraire que l'intérieur des guillemets perdait
    précisément l'indice de nationalité. On lit donc les quarante caractères
    qui précèdent chaque ouverture de guillemet.
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
    u = cle(nom)
    for k, (latin, pays) in ALIAS_SOCIETES.items():
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
        # Une forme juridique russe est un fait porté par le catalogue, pas une
        # déduction sur le nom : l'entité est immatriculée en Russie. Le premier
        # jet la marquait « à vérifier », ce qui affublait d'un « ? » les cent
        # cinquante sociétés russes — un doute affiché là où il n'y en a pas.
        # Ce qui reste incertain, et que le catalogue ne dit pas, c'est si elle
        # appartient à un groupe étranger.
        return "Russie", True, False
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


def regenerer_iso():
    """Le pont français -> ISO anglais vient de lib/apvma.ts, pas d'ici."""
    print("  génération de data/_iso.json (appariement lib/apvma.ts)…")
    subprocess.run(["npx", "tsx", "scripts/noms_iso.ts"], cwd=RACINE, check=True,
                   shell=(sys.platform == "win32"))
    if not ISO.exists():
        raise SystemExit("data/_iso.json absent : lancez « npx tsx scripts/noms_iso.ts ».")


def lire_pdf(data: bytes):
    """(texte aplati, transitions matière, transitions produit).

    Les transitions sont des couples (offset, valeur) : la matière active et le
    produit en vigueur à un point du texte sont ceux de la dernière transition
    qui le précède. Le catalogue n'écrit la matière active qu'une fois, en tête
    de groupe, puis enchaîne les produits qui la contiennent.
    """
    import fitz
    doc = fitz.open(stream=data, filetype="pdf")

    morceaux = []           # (nature, texte) fusionnés par nature consécutive
    for pno in range(doc.page_count):
        for bloc in doc[pno].get_text("dict")["blocks"]:
            for ligne in bloc.get("lines", []):
                for span in ligne["spans"]:
                    t = span["text"]
                    if not t.strip():
                        continue
                    f = span["flags"]
                    nature = ("matiere" if (f & GRAS and f & ITALIQUE)
                              else "produit" if f & GRAS else "texte")
                    if morceaux and morceaux[-1][0] == nature:
                        morceaux[-1][1] += t
                    else:
                        morceaux.append([nature, t])
                morceaux.append(["texte", "\n"])

    plat = []
    pos = 0
    tr_matiere, tr_produit = [], []
    for nature, texte in morceaux:
        if nature == "matiere":
            v = re.sub(r"\s+", " ", texte).strip()
            if v:
                tr_matiere.append((pos, v))
        elif nature == "produit":
            v = re.sub(r"\s+", " ", texte).strip()
            if v:
                tr_produit.append((pos, v))
        plat.append(texte)
        pos += len(texte)

    return "".join(plat), tr_matiere, tr_produit, doc


def en_vigueur(transitions, offset):
    """Dernière valeur déclarée avant `offset`, par recherche dichotomique."""
    import bisect
    i = bisect.bisect_right([o for o, _ in transitions], offset) - 1
    return transitions[i][1] if i >= 0 else None


def main():
    args = sys.argv[1:]
    print(f"catalogue d'État russe — {SOURCE}")
    if "--sans-iso" not in args:
        regenerer_iso()
    if not ISO.exists():
        raise SystemExit("data/_iso.json absent : lancez « npx tsx scripts/noms_iso.ts ».")
    noms_iso = json.loads(ISO.read_text(encoding="utf-8"))["iso"]

    data = telecharger()
    try:
        import fitz  # noqa: F401
    except ImportError:
        raise SystemExit("PyMuPDF requis :  pip install pymupdf")

    brut, tr_matiere, tr_produit, doc = lire_pdf(data)
    print(f"  {doc.page_count} pages · {len(tr_matiere)} en-têtes de matière active")

    m = re.search(r"по состоянию на\s+(\d{1,2}\s+\S+\s+\d{4})", brut)
    edition = m.group(1) if m else None

    # ── Index russe des matières actives ────────────────────────────────────
    # Les en-têtes combinés (« Абамектин + спиромезифен ») se scindent : chaque
    # substance doit être trouvable seule.
    par_cle = {}
    for _, titre in tr_matiere:
        for part in re.split(r"\s*\+\s*", titre):
            part = part.strip(" .,;")
            if part:
                par_cle.setdefault(cle_chimique(part, translitterer), part)

    # ⚠️ Une collision interdirait de distinguer deux substances : on refuse.
    collisions = verifier_collisions(noms_iso, translitterer)
    if collisions:
        raise SystemExit(f"Clés chimiques en collision, rapprochement refusé : {collisions}")

    iso_par_cle = {}
    for n in noms_iso:
        alias = ALIAS_MATIERES.get(n)
        k = cle_chimique(alias, translitterer) if alias else cle_chimique(n, translitterer)
        if k in par_cle:
            iso_par_cle[k] = n
    print(f"  {len(iso_par_cle)}/{len(noms_iso)} matières actives de l'index retrouvées au catalogue")

    # ── Homologations ───────────────────────────────────────────────────────
    plat = re.sub(r"(-\d{3,4}-)\s+(\d)", r"\1\2", brut)
    plat = re.sub(r"(\d{3}(?:\([\d,\s]*\))?)-\s*(\d{2})-", r"\1-\2-", plat)
    # Les deux substitutions ci-dessus raccourcissent le texte ; les offsets de
    # transition ne valent plus. On travaille donc sur le texte d'origine pour
    # localiser, et sur le texte recollé pour lire les numéros.
    entrees = []
    non_decoupes = 0
    for x in NUMERO.finditer(brut):
        amont = brut[max(0, x.start() - 320):x.start()]
        amont = re.sub(r"\s+", " ", amont)
        amont = re.sub(r"\s*\d[\d\s\-]*/\s*\d\s*$", "", amont)

        titre = en_vigueur(tr_matiere, x.start())
        produit = en_vigueur(tr_produit, x.start())

        # Le bloc société est ce qui suit le nom du produit dans le texte amont.
        bloc = amont
        if produit:
            j = amont.rfind(produit[-24:]) if len(produit) > 24 else amont.rfind(produit)
            if j >= 0:
                bloc = amont[j + len(produit[-24:] if len(produit) > 24 else produit):]

        noms, reste = societes_du_bloc(bloc)
        if not noms:
            non_decoupes += 1

        substances = [p.strip(" .,;") for p in re.split(r"\s*\+\s*", titre or "") if p.strip()]
        entrees.append({
            "numero": x.group(1),
            "expiration": x.group(2),
            "produit": normaliser(produit) if produit else None,
            "matiereRusse": titre,
            "iso": sorted({iso_par_cle[k] for k in
                           (cle_chimique(s, translitterer) for s in substances)
                           if k in iso_par_cle}),
            "societes": [{"nom": n, "formes": f} for n, f in noms],
            "blocNonDecoupe": reste,
        })

    # ── Agrégation par société ──────────────────────────────────────────────
    par = defaultdict(lambda: {"nom": None, "produits": [], "numeros": [],
                               "formes": set(), "iso": set(), "russes": set()})
    for e in entrees:
        for s in e["societes"]:
            v = par[cle(s["nom"])]
            v["nom"] = v["nom"] or s["nom"]
            v["formes"].update(s["formes"])
            v["iso"].update(e["iso"])
            if e["matiereRusse"]:
                v["russes"].add(e["matiereRusse"])
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
            "matieres": sorted(v["iso"]),
            "matieresRusses": sorted(v["russes"])[:30],
            "produits": sorted(set(v["produits"]))[:40],
        })
    societes.sort(key=lambda x: (-len(x["matieres"]), -x["nbHomologations"], x["nom"] or ""))

    # ── Index par matière active ────────────────────────────────────────────
    par_ma = defaultdict(lambda: {"russes": set(), "societes": set(), "numeros": set()})
    for e in entrees:
        for n in e["iso"]:
            m = par_ma[n]
            if e["matiereRusse"]:
                m["russes"].add(e["matiereRusse"])
            m["numeros"].add(e["numero"])
            for s in e["societes"]:
                m["societes"].add(cle(s["nom"]))
    nom_par_cle = {s["cle"]: s["nom"] for s in societes}
    matieres = [
        {
            "iso": n,
            "nomsRusses": sorted(v["russes"]),
            "nbHomologations": len(v["numeros"]),
            "societes": sorted(nom_par_cle.get(c, c) for c in v["societes"]),
        }
        for n, v in sorted(par_ma.items())
    ]

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
            "nbMatieres": len(matieres),
            "nbMatieresIndex": len(noms_iso),
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
        "matieres": matieres,
        "entrees": entrees,
    }

    SORTIE.parent.mkdir(parents=True, exist_ok=True)
    SORTIE.write_text(json.dumps(payload, ensure_ascii=False, indent=1), encoding="utf-8")

    print(f"OK -> {SORTIE}")
    print(f"  édition : {edition}")
    print(f"  {len(entrees)} homologations · {non_decoupes} sans société identifiée")
    print(f"  {len(societes)} sociétés · {payload['meta']['nbRusses']} russes · "
          f"{payload['meta']['nbEtrangeres']} étrangères")
    print(f"  {len(matieres)} matières actives de l'index marocain couvertes\n")
    for s in societes[:12]:
        d = (s["pays"] or ("étranger" if s["etrangere"] else "?"))[:18]
        print(f"    {len(s['matieres']):>3} M.A.  {s['nbHomologations']:>4} hom.  "
              f"{d:<18} {(s['nom'] or '')[:38]}")


if __name__ == "__main__":
    main()
