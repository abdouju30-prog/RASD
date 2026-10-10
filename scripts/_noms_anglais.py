"""
Nom anglais des usines chinoises, et registres étrangers où elles figurent.

    python scripts/_noms_anglais.py        # écrit data/icama-anglais.json

POURQUOI.

Le pinyin transcrit les sons, pas la marque : 润丰 se lit « Runfeng », mais la
société exporte sous « Rainbow ». Le Brésil (AGROFIT), l'EPA, l'Australie et
l'index ONSSA publient, eux, les raisons sociales anglaises. Les retrouver
donne un nom qui se tape dans un courriel, et dit au passage où l'usine est
déjà enregistrée — un fabricant présent au Brésil, aux États-Unis et en
Australie a déjà passé des dossiers exigeants.

DEUX NIVEAUX, JAMAIS PLUS.

    confirmé   le nom anglais porte TOUS les mots de marque du pinyin, dont
               un rare (Binnong, Tianyu, Yongnong…), et la même province ;
               trouvé seulement à l'EPA, il doit en plus dire « chem / agro /
               pesticide… » (l'EPA liste aussi emballages et appareils).
    probable   le nom anglais porte la ville du pinyin (Weifang…) ET le
               Brésil lui attribue au moins 5 des mêmes molécules, soit 30 %
               au moins du catalogue chinois, trois fois plus que le suivant.

Un mot de ville seul (Nantong, Ningbo, Nanjing) ne suffit jamais : trop
d'usines le partagent. Une marque traduite (红太阳 « Red Sun ») reste
introuvable sans dictionnaire — l'écran le dit, il ne devine pas.
"""

from __future__ import annotations

import json
import re
import unicodedata
from collections import Counter, defaultdict
from datetime import date
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent
DATA = RACINE / "data"
SORTIE = DATA / "icama-anglais.json"

# Mots du pinyin qui décrivent l'activité ou la forme juridique, pas la marque.
GENERIQUES = {
    "huagong", "gufen", "youxiangongsi", "youxian", "gongsi", "keji", "shengwu", "nongyao",
    "nonghua", "jituan", "shiye", "gongye", "zhiyao", "yaoye", "huaxue", "jingxi", "kaifa",
    "guoji", "maoyi", "jinchukou", "shengwukeji", "shenghua", "zuowu", "baohu", "zhibao",
    "cailiao", "chang", "yanjiusuo", "jishu", "zerengongsi", "zeren", "fenchang", "youxianzeren",
    "kexue", "gongcheng", "zhongxin", "nongyong", "jisu", "yanjiu", "xinxing", "fazhan",
    "nongye", "youxianzerengongsi",
    # côté anglais
    "chemical", "chemicals", "industry", "industrial", "group", "company", "limited",
    "technology", "technologies", "agrochemical", "agrochemicals", "biochemical", "pesticide",
    "pesticides", "science", "sciences", "biological", "bio", "crop", "protection", "agro",
    "corporation", "factory", "plant", "import", "export", "trading", "development",
}
PROVINCES = {
    "shandong", "jiangsu", "zhejiang", "hebei", "anhui", "shanghai", "beijing", "sichuan",
    "hubei", "hunan", "jiangxi", "guangdong", "neimenggu", "henan", "shanxi", "shaanxi",
    "liaoning", "jilin", "heilongjiang", "tianjin", "chongqing", "fujian", "guangxi",
    "yunnan", "guizhou", "gansu", "xinjiang", "ningxia", "qinghai", "hainan", "inner",
    "mongolia", "china",
}
# Région ICAMA (glose française) -> mot attendu dans un nom anglais.
REGION_EN = {"Pékin": "beijing", "Mongolie-Intérieure": "mongolia", "Taïwan": "taiwan"}

# Le registre américain mêle usines de pesticides, d'emballages et d'appareils :
# un nom trouvé là seulement doit dire une activité agrochimique.
AGRO = re.compile(r"chem|agro|pestic|crop|bio|scien|pharm|insectic|herbic|fungic|plant|nong")

MIN_COMMUN = 5
MIN_PART = 0.30
MARGE = 3


def ascii_bas(s: str) -> str:
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9 ]", " ", s)


def mots(s: str) -> list[str]:
    return ascii_bas(s).split()


def cle_molecule(s: str) -> str:
    return ascii_bas(s).replace(" ", "")


def cle_societe(nom: str) -> str:
    """Une même société écrite trois fois (casse, ponctuation, Co./Ltd, nom tronqué
    par le registre) -> une clé : ses mots distinctifs, triés."""
    m = {w for w in mots(nom) if w not in GENERIQUES and w not in {"co", "ltd", "inc", "corp", "the", "and", "of", "stock", "fine"}}
    return " ".join(sorted(m))


def joli(nom: str) -> str:
    """Les noms EPA/ONSSA sont en capitales : les remettre en casse de titre."""
    if nom.isupper():
        return " ".join(w.capitalize() if len(w) > 3 else w.title() for w in nom.split())
    return nom


def charger(nom: str) -> dict:
    return json.loads((DATA / nom).read_text(encoding="utf-8"))


def candidats_anglais() -> list[dict]:
    """Toutes les raisons sociales anglaises de sociétés chinoises connues de l'outil."""
    out = []
    br = charger("bresil.json")
    for u in br.get("usines", []):
        if u.get("pays") == "Chine":
            out.append({"registre": "Brésil", "nom": u["nom"], "mol": {cle_molecule(x) for x in u.get("matieres", [])}})
    epa = charger("epa.json")
    for e in epa.get("etablissements", []):
        if e.get("pays") in ("Chine", "CHN") or e.get("codePays") == "CHN":
            out.append({"registre": "États-Unis", "nom": e["etablissement"], "mol": set()})
    on = charger("onssa.json")
    for f in on.get("fournisseurs", []):
        if (f.get("pays") or "") == "Chine":
            out.append({"registre": "Maroc", "nom": f["nom"], "mol": set()})
    ap = charger("apvma.json")
    vus = set()
    for c in ap.get("constituants", []):
        for s in c.get("societes", []):
            if (s.get("pays") or "") == "Chine" and s["nom"] not in vus:
                vus.add(s["nom"])
                out.append({"registre": "Australie", "nom": s["nom"], "mol": set()})
    return out


def main():
    ic = charger("icama.json")
    usines: dict[str, dict] = {}
    for m in ic["matieres"]:
        for s in m["societes"]:
            u = usines.setdefault(s["nom"], {
                "latin": s.get("latin") or "", "glose": s.get("glose") or "",
                "region": s.get("region"), "mol": set(),
            })
            u["mol"].add(cle_molecule(m["iso"]))

    cands = candidats_anglais()

    # Rareté d'un mot : dans combien d'usines chinoises (pinyin) et de sociétés
    # anglaises distinctes il apparaît. Un mot partagé est une ville ou un générique.
    freq_cn = Counter(w for u in usines.values() for w in set(mots(u["latin"])))
    freq_en = Counter(w for k in {cle_societe(c["nom"]) for c in cands} for w in set(k.split()))
    par_mot = defaultdict(list)
    for c in cands:
        for w in set(mots(c["nom"])) - GENERIQUES - PROVINCES:
            if len(w) >= 4:
                par_mot[w].append(c)

    resultat = {}
    nb = Counter()
    for nom, u in usines.items():
        lat = [w for w in mots(u["latin"]) if w not in GENERIQUES and w not in PROVINCES and len(w) >= 4]
        region = u["region"]
        mot_region = REGION_EN.get(region, ascii_bas(region or "").replace(" ", "")) if region else None

        def province_ok(en: str) -> bool:
            return not mot_region or mot_region in mots(en) or not (set(mots(en)) & PROVINCES)

        # 1) Tous les mots de marque, dont un rare : confirmé.
        tete = u["glose"].split(" — ")[0] if u["glose"] else u["latin"]
        marque = [w for w in mots(tete) if w not in GENERIQUES and w not in PROVINCES and len(w) >= 3]
        rares = [w for w in marque if freq_cn[w] <= 2 and freq_en.get(w, 0) <= 3]
        marques = rares
        confirmes = {}
        for w in rares[:1]:
            for c in par_mot.get(w, []):
                enm = set(mots(c["nom"]))
                if not all(x in enm for x in marque) or not province_ok(c["nom"]):
                    continue
                confirmes.setdefault(cle_societe(c["nom"]), []).append(c)
        # Une société vue seulement à l'EPA doit avoir une activité agrochimique.
        confirmes = {
            k: v for k, v in confirmes.items()
            if any(c["registre"] != "États-Unis" for c in v) or any(AGRO.search(ascii_bas(c["nom"])) for c in v)
        }
        choix, niveau, regle = None, None, None
        if len(confirmes) == 1:
            choix = next(iter(confirmes.values()))
            niveau, regle = "confirmé", f"marque « {' '.join(marque)} »"
        elif not confirmes:
            # 2) Ville + catalogue de molécules : probable.
            scores = {}
            for w in lat:
                if w in marques:
                    continue
                for c in par_mot.get(w, []):
                    if c["mol"] and province_ok(c["nom"]):
                        k = cle_societe(c["nom"])
                        commun = len(u["mol"] & c["mol"])
                        if commun > scores.get(k, (0, None))[0]:
                            scores[k] = (commun, w)
            classes = sorted(scores.items(), key=lambda x: -x[1][0])
            if classes:
                (k1, (n1, w1)) = classes[0]
                n2 = classes[1][1][0] if len(classes) > 1 else 0
                if n1 >= MIN_COMMUN and n1 >= MIN_PART * len(u["mol"]) and n1 >= MARGE * max(n2, 1):
                    choix = [c for c in cands if cle_societe(c["nom"]) == k1]
                    niveau = "probable"
                    regle = f"ville « {w1} » + {n1} molécules en commun au Brésil"
        if not choix:
            nb["introuvable"] += 1
            continue
        # Toutes les écritures de la même société, dans tous les registres.
        k = cle_societe(choix[0]["nom"])
        toutes = [c for c in cands if cle_societe(c["nom"]) == k]
        prefere = next((c for c in toutes if c["registre"] == "Brésil"), toutes[0])
        resultat[nom] = {
            "nomAnglais": joli(prefere["nom"]),
            "niveau": niveau,
            "regle": regle,
            "registres": sorted({c["registre"] for c in toutes}),
        }
        nb[niveau] += 1

    payload = {
        "meta": {
            "role": (
                "Nom anglais des usines chinoises de l'ICAMA, retrouvé dans les registres "
                "brésilien, américain, australien et marocain. « probable » = à vérifier."
            ),
            "genere": date.today().isoformat(),
            "nbUsines": len(usines),
            "nbConfirmes": nb["confirmé"],
            "nbProbables": nb["probable"],
            "nbIntrouvables": nb["introuvable"],
        },
        "usines": dict(sorted(resultat.items())),
    }
    SORTIE.write_text(json.dumps(payload, ensure_ascii=False, indent=1), encoding="utf-8")
    m = payload["meta"]
    print(f"noms anglais : {m['nbConfirmes']} confirmés, {m['nbProbables']} probables, "
          f"{m['nbIntrouvables']} introuvables sur {m['nbUsines']} usines")


if __name__ == "__main__":
    main()
