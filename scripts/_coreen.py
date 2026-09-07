"""
Lecture des raisons sociales coréennes — romanisation et identification.

Même discipline que pour le chinois et le russe : le hangul du registre fait
foi, la romanisation n'est qu'une POIGNÉE POUR CHERCHER. La romanisation
révisée est déterministe — elle se calcule syllabe par syllabe — mais elle ne
retrouve pas le nom commercial : « 팜한농 » donne « pamhannong » là où la
société signe « Farm Hannong ».

D'où deux niveaux, qu'il ne faut pas confondre :

    latin       calculé, toujours disponible, jamais faux mais souvent inutile
    commercial  relevé à la main, seulement pour les sociétés qui comptent

⚠️ LA FILIALE N'EST PAS LE GROUPE. « 신젠타코리아 » est l'entité coréenne de
Syngenta : elle détient des homologations coréennes, elle ne fabrique pas de
technique générique. La distinguer évite de présenter la filiale d'un
inventeur comme une piste de sourcing — c'est la même règle que pour les
« AUSTRALIA PTY LTD » du registre australien.
"""

# Romanisation révisée du coréen (2000), appliquée syllabe par syllabe.
# Les règles d'assimilation entre syllabes ne sont PAS appliquées : elles
# supposent de savoir où sont les frontières de mots, ce qu'une raison sociale
# ne dit pas. Le résultat se cherche et se prononce, il ne fait pas autorité.
INITIALES = ["g", "kk", "n", "d", "tt", "r", "m", "b", "pp", "s", "ss", "",
             "j", "jj", "ch", "k", "t", "p", "h"]
VOYELLES = ["a", "ae", "ya", "yae", "eo", "e", "yeo", "ye", "o", "wa", "wae",
            "oe", "yo", "u", "wo", "we", "wi", "yu", "eu", "ui", "i"]
FINALES = ["", "k", "k", "ks", "n", "nj", "nh", "t", "l", "lk", "lm", "lb",
           "ls", "lt", "lp", "lh", "m", "p", "ps", "t", "t", "ng", "t", "t",
           "k", "t", "p", "t"]

# Formes juridiques. « (주) » abrège 주식회사, société par actions ; elle se
# place avant ou après le nom selon l'usage de la société, et les deux
# graphies coexistent dans le registre.
FORMES = {
    "주식회사": "S.A.",
    "(주)": "S.A.",
    "㈜": "S.A.",
    "(유)": "SARL",
    "㈜)": "S.A.",
    "농업회사법인": "société agricole",
}

# Noms commerciaux relevés un par un. `groupe` nomme la maison mère étrangère
# quand l'entité coréenne en est la filiale — auquel cas ce n'est pas une piste
# de sourcing générique mais l'antenne locale d'un groupe déjà connu.
ALIAS = {
    # ── Producteurs coréens ────────────────────────────────────────────────
    "(주)팜한농": ("Farm Hannong", None),
    "(주)경농": ("Kyung Nong", None),
    "(주)동방아그로": ("Dongbang Agro", None),
    "(주)농협케미컬": ("Nonghyup Chemical", None),
    "(주)한얼싸이언스": ("Hanuel Science", None),
    "한국삼공(주)": ("Hankook Samgong", None),
    "인바이오(주)": ("InBio", None),
    "(주)케이씨생명과학": ("KC Life Science", None),
    "에스비성보주식회사": ("SB Sungbo", None),
    "아그리젠토(주)": ("Agrigento", None),
    "(주)신농팜케미컬": ("Shinnong Farm Chemical", None),
    "(주)태준아그로텍": ("Taejun Agrotech", None),
    "선문그린사이언스(주)": ("Sunmoon Green Science", None),
    "(주)천지인바이오텍": ("Cheonjiin Biotech", None),
    "유원에코사이언스(주)": ("Yuwon Eco Science", None),
    "(주)유일": ("Yuil", None),
    "(주)대유": ("Daeyu", None),
    "아진케미칼(주)": ("Ajin Chemical", None),
    "(주)장유산업": ("Jangyu Industrial", None),
    "(주)누보": ("Nuvo", None),
    "(주)새한농": ("Saehannong", None),
    "(주)엘지화학": ("LG Chem", None),
    # ── Filiales de groupes étrangers ──────────────────────────────────────
    "신젠타코리아(주)": ("Syngenta Korea", "Syngenta"),
    "바이엘크롭사이언스(주)": ("Bayer CropScience Korea", "Bayer"),
    "한국바스프(주)": ("BASF Korea", "BASF"),
    "코르테바아그리사이언스코리아(유)": ("Corteva Agriscience Korea", "Corteva"),
    "에프엠씨코리아(주)": ("FMC Korea", "FMC"),
    "아다마코리아(주)": ("Adama Korea", "Adama"),
    "(주)유피엘리미티드코리아": ("UPL Limited Korea", "UPL"),
    "ISK바이오사이언스 코리아(주)": ("ISK Biosciences Korea", "Ishihara Sangyo"),
    "닛산케미칼아그로코리아(주)": ("Nissan Chemical Agro Korea", "Nissan Chemical"),
    "스미토모화학아그로서울(주)": ("Sumitomo Chemical Agro Seoul", "Sumitomo Chemical"),
    "닛소코리아(주)": ("Nisso Korea", "Nippon Soda"),
    "미쓰이화학크롭앤라이프솔루션코리아(주)": ("Mitsui Chemicals Crop & Life Solutions Korea", "Mitsui"),
    "아그로카네쇼코리아(주)": ("Agro-Kanesho Korea", "Agro-Kanesho"),
    "아그로프레쉬코리아(유)": ("AgroFresh Korea", "AgroFresh"),
    "린데코리아(주)": ("Linde Korea", "Linde"),
    # Le groupe chinois de Weifang — première usine du registre brésilien —
    # tient aussi une entité coréenne.
    "레인보우애그로사이언스(주)": ("Rainbow Agrosciences", "Shandong Weifang Rainbow"),
}


def romaniser(s: str) -> str:
    """Hangul -> latin, romanisation révisée. Une poignée, pas une identité."""
    out = []
    for c in s or "":
        code = ord(c) - 0xAC00
        if 0 <= code <= 11171:
            out.append(INITIALES[code // 588])
            out.append(VOYELLES[(code % 588) // 28])
            out.append(FINALES[code % 28])
        else:
            out.append(c)
    return "".join(out)


def nom_nu(nom: str) -> str:
    """Raison sociale débarrassée de sa forme juridique."""
    s = nom or ""
    for f in FORMES:
        s = s.replace(f, " ")
    return " ".join(s.split())


def identifier(nom: str):
    """(latin, commercial|None, groupe|None, formes[]) pour une raison sociale.

    `latin` est calculé et toujours présent ; `commercial` n'existe que si le
    nom a été relevé à la main. Quand une société appartient à un groupe
    étranger, `groupe` le nomme : ce n'est alors pas une piste de sourcing
    coréenne mais l'antenne locale d'un fabricant déjà connu par ailleurs.
    """
    brut = (nom or "").strip()
    formes = [lib for f, lib in FORMES.items() if f in brut]
    nu = nom_nu(brut)
    latin = romaniser(nu).strip() or None
    commercial, groupe = ALIAS.get(brut, (None, None))
    return latin, commercial, groupe, sorted(set(formes))
