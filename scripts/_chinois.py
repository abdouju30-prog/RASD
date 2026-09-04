"""
Latinisation des raisons sociales chinoises.

    python scripts/_chinois.py        # réécrit data/icama.json en place

POURQUOI.

Le registre chinois nomme ses sociétés en caractères han. Affichées telles
quelles, elles ne sont ni lisibles ni cherchables depuis un clavier latin :
« 山东潍坊润丰化工股份有限公司 » ne se recopie pas dans un moteur de recherche,
ne se dicte pas au téléphone, et ne se retrouve pas dans un courriel.

Trois sorties, de la plus littérale à la plus lisible :

    nom     山东潍坊润丰化工股份有限公司       ce que dit le registre
    latin   Shandong Weifang Runfeng Huagong Gufen Youxiangongsi
    glose   Shandong Weifang Runfeng — chimie (S.A.)

⚠️ CE N'EST PAS UNE TRADUCTION DU NOM COMMERCIAL. Le pinyin transcrit les sons,
il ne retrouve pas la marque déposée : « 润丰 » se transcrit « Runfeng » alors
que la société se présente à l'international sous « Rainbow ». La glose sert à
chercher et à reconnaître, jamais à identifier une société dans un contrat.

⚠️ LA SEGMENTATION EST STATISTIQUE. jieba découpe le chinois en mots par un
modèle, pas par une règle : un découpage peut être discutable sans être faux.
Le nom d'origine reste affiché partout, c'est lui qui fait foi.

Dépendances :  pip install jieba pypinyin
"""

import json
import re
import sys
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent
ICAMA = RACINE / "data" / "icama.json"

# Termes génériques traduits plutôt que transcrits : « chimie » se lit, pas
# « Huagong ». Le reste du nom — la marque — reste en pinyin.
TERMES = {
    "化工": "chimie", "化学": "chimie", "精细化工": "chimie fine",
    "农药": "pesticides", "农化": "agrochimie", "作物保护": "protection des cultures",
    "生物": "bio", "生化": "biochimie", "生物工程": "génie biologique",
    "生物科技": "biotechnologies", "科技": "technologies", "技术": "technologies",
    "药业": "pharmacie", "制药": "pharmaceutique", "医药": "pharmacie",
    "实业": "industries", "工业": "industrie", "集团": "groupe",
    "国际": "international", "进出口": "import-export", "贸易": "négoce",
    "股份有限公司": "S.A.", "有限责任公司": "SARL", "有限公司": "SARL",
    "股份": "S.A.", "公司": "société", "厂": "usine",
    "研究所": "institut de recherche", "开发": "développement",
    "新材料": "matériaux nouveaux", "植保": "protection des plantes",
}

# Provinces et régions : elles disent où se trouve l'usine, ce qui décide du
# port d'embarquement et donc du fret. À afficher séparément du nom.
REGIONS = {
    "山东": "Shandong", "江苏": "Jiangsu", "浙江": "Zhejiang", "河北": "Hebei",
    "安徽": "Anhui", "上海": "Shanghai", "北京": "Pékin", "四川": "Sichuan",
    "湖北": "Hubei", "湖南": "Hunan", "江西": "Jiangxi", "广东": "Guangdong",
    "内蒙古": "Mongolie-Intérieure", "河南": "Henan", "山西": "Shanxi",
    "陕西": "Shaanxi", "辽宁": "Liaoning", "吉林": "Jilin",
    "黑龙江": "Heilongjiang", "天津": "Tianjin", "重庆": "Chongqing",
    "福建": "Fujian", "广西": "Guangxi", "云南": "Yunnan", "贵州": "Guizhou",
    "甘肃": "Gansu", "新疆": "Xinjiang", "宁夏": "Ningxia", "青海": "Qinghai",
    "海南": "Hainan", "西藏": "Tibet", "台湾": "Taïwan",
}

HAN = re.compile(r"[一-鿿]")


def _outils():
    try:
        import jieba
        from pypinyin import lazy_pinyin
    except ImportError as exc:  # noqa: BLE001
        raise SystemExit(
            "Latinisation du chinois : « pip install jieba pypinyin » requis "
            f"({exc})."
        )
    return jieba, lazy_pinyin


def latiniser(nom: str):
    """(latin, glose, région) pour une raison sociale chinoise.

    Rend (nom, None, None) tel quel si le nom ne contient pas de caractère han :
    plusieurs sociétés du registre sont déjà nommées en alphabet latin.
    """
    if not nom or not HAN.search(nom):
        return nom, None, None
    jieba, lazy_pinyin = _outils()

    # ⚠️ jieba agglutine parfois deux termes génériques en un seul segment —
    # « 化工集团 » pour « chimie » + « groupe » — et colle le suffixe
    # administratif à la province : « 山东省 » plutôt que « 山东 ». Les deux
    # ressortaient alors comme des morceaux de marque, et « Huagongjituan »
    # passait pour un nom propre. On redécoupe donc chaque segment sur les
    # termes connus, du plus long au plus court.
    connus = sorted(set(TERMES) | set(REGIONS), key=len, reverse=True)

    def redecouper(m: str):
        if m in TERMES or m in REGIONS:
            return [m]
        for t in connus:
            i = m.find(t)
            if i >= 0 and len(m) > len(t):
                return redecouper(m[:i]) + [t] + redecouper(m[i + len(t):])
        return [m] if m else []

    mots = []
    for m in jieba.cut(nom):
        if not m.strip():
            continue
        # « 山东省 » -> « 山东 » : le suffixe administratif ne porte rien.
        m = re.sub(r"(省|市|自治区|自治州)$", "", m) or m
        mots.extend(redecouper(m))

    latin, glose, region = [], [], None

    for m in mots:
        if m in REGIONS and region is None:
            region = REGIONS[m]
            latin.append("".join(lazy_pinyin(m)).capitalize())
            continue
        if m in TERMES:
            glose.append(TERMES[m])
            latin.append("".join(lazy_pinyin(m)).capitalize())
            continue
        if HAN.search(m):
            latin.append("".join(lazy_pinyin(m)).capitalize())
            glose.append("".join(lazy_pinyin(m)).capitalize())
        else:
            latin.append(m)
            glose.append(m)

    # La glose se lit « marque — qualificatifs » : la marque d'abord, les mots
    # génériques ensuite, parce que c'est la marque qu'on retient et qu'on cite.
    generiques = [g for g in glose if g in TERMES.values()]
    # « 股份有限公司 » (société par actions) est segmenté en « 股份 » + « 有限公司 »
    # et ressortait « S.A., SARL » — deux formes juridiques contradictoires pour
    # une seule société. La forme par actions l'emporte, elle est plus précise.
    if "S.A." in generiques:
        generiques = [g for g in generiques if g != "SARL"]
    marque = [g for g in glose if g not in TERMES.values()]
    lisible = " ".join(marque)
    if generiques:
        lisible = f"{lisible} — {', '.join(dict.fromkeys(generiques))}".strip(" —")
    return " ".join(latin), lisible or None, region


def main():
    if not ICAMA.exists():
        raise SystemExit(f"{ICAMA} absent — lancez d'abord scripts/import_icama.py.")
    d = json.loads(ICAMA.read_text(encoding="utf-8"))

    vues, n = {}, 0
    for m in d["matieres"]:
        for s in m["societes"]:
            nom = s.get("nom")
            if not nom:
                continue
            if nom not in vues:
                vues[nom] = latiniser(nom)
                n += 1
            s["latin"], s["glose"], s["region"] = vues[nom]

    d["meta"]["latinisation"] = (
        "Raisons sociales transcrites en pinyin (jieba + pypinyin). Le pinyin "
        "transcrit les sons, il ne retrouve pas la marque déposée : sert à "
        "chercher et à reconnaître, pas à identifier dans un contrat."
    )
    ICAMA.write_text(json.dumps(d, ensure_ascii=False, indent=1), encoding="utf-8")

    print(f"OK -> {ICAMA}")
    print(f"  {n} raisons sociales distinctes latinisées\n")
    for nom, (latin, glose, region) in list(vues.items())[:8]:
        print(f"    {nom}")
        print(f"      latin  {latin}")
        print(f"      glose  {glose}   [{region or 'région non reconnue'}]")


if __name__ == "__main__":
    sys.exit(main())
