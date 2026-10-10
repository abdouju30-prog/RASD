"""
Import du registre chinois de l'ICAMA -> data/icama.json

    python scripts/import_icama.py            # tout
    python scripts/import_icama.py --sans-iso # sans régénérer data/_iso.json
    python scripts/import_icama.py --limite 20

POURQUOI CETTE SOURCE — et ce qu'elle n'est PAS.

L'index ONSSA ne nomme que les fournisseurs déjà entrés au Maroc. Le registre
australien élargit à qui détient une homologation là-bas. Ni l'un ni l'autre ne
répond à la question la plus concrète du sourcing générique : **quelles usines
chinoises fabriquent cette matière active ?**

L'ICAMA publie deux choses, et le croisement des deux est ce qui a de la valeur :

  1. Les homologations de MATIÈRE ACTIVE TECHNIQUE (剂型 = 原药, « yuanyao »).
     Détenir une homologation TC en Chine, c'est être autorisé à produire et
     vendre la substance technique — pas une formulation. C'est exactement le
     maillon qu'on cherche pour un dossier me-too marocain.

  2. Les LICENCES DE PRODUCTION (农药生产许可证), qui listent les entreprises
     autorisées à fabriquer, avec leur périmètre de production.

Une société qui a les deux est un fabricant. Une société qui n'a que la
première peut n'être qu'un titulaire — un négociant, ou un groupe qui fait
produire ailleurs. La distinction est faite et affichée, pas gommée.

⚠️ CE QUE CE FICHIER NE DIT PAS.
Rien de réglementaire pour le Maroc. Une homologation chinoise n'ouvre aucun
droit devant l'ONSSA, n'abrège aucun délai, ne remplace aucune étude — seul un
fournisseur DÉJÀ référencé à l'index marocain ouvre la voie me-too. Rien non
plus sur les prix, sur la capacité, sur la volonté d'exporter, ni sur la
qualité : une licence n'est pas un audit.

⚠️ RECHERCHE EN MODE EXACT, JAMAIS FLOU. Le formulaire propose les deux. En
mode flou, « sulfur » ramène 168 résultats dont toutes les sulfonylurées
(甲基二磺隆, 烟嘧磺隆…) qui n'ont aucun rapport avec le soufre ; en mode exact,
5 résultats, tous 硫磺. Sur un sujet réglementaire, le flou fabrique des
erreurs de fond.

Source : ICAMA (Institute for the Control of Agrochemicals, Ministry of
Agriculture and Rural Affairs), www.icama.cn — registre public, sans compte.
"""

import json
import re
import subprocess
import sys
import time
from collections import defaultdict
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _reseau import poster  # noqa: E402

RACINE = Path(__file__).resolve().parent.parent
ISO = RACINE / "data" / "_iso.json"
SORTIE = RACINE / "data" / "icama.json"

URL_REG = "https://www.icama.cn/BasicdataSystem/pesticideRegistration/queryselect.do"
URL_LIC = "https://www.icama.cn/DataCenter/manufacturer/query"
ATTRIBUTION = "ICAMA — China Pesticide Information Network"

TECHNIQUE = "原药"  # matière active technique, par opposition aux formulations
PAUSE = 1.0  # une requête par seconde : le registre est public, pas gratuit à servir

CHAMPS_REG = (
    "djzh nymc cjmc sf nylb zhl jx zwmc fzdx syff dx yxcf yxcf_en yxcfhl yxcf2 "
    "yxcf2_en yxcf2hl yxcf3 yxcf3_en yxcf3hl yxqs_start yxqs_end yxjz_start "
    "yxjz_end dj hj ygq"
).split()


def cellules(html):
    """Lignes de résultat d'un tableau ICAMA, texte nettoyé, en-têtes exclus."""
    out = []
    for tr in re.findall(r"<tr[^>]*>(.*?)</tr>", html, flags=re.S):
        c = [
            re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", x)).replace("\xa0", " ").strip()
            for x in re.findall(r"<td[^>]*>(.*?)</td>", tr, flags=re.S)
        ]
        if c:
            out.append(c)
    return out


def teneur_num(t):
    """« 95% » -> 95.0. Comparer les teneurs en texte classerait 9 % au-dessus
    de 45 %."""
    m = re.search(r"([\d.]+)", t or "")
    try:
        return float(m.group(1)) if m else -1.0
    except ValueError:
        return -1.0


def date_num(d):
    """« 2031-9-29 » -> (2031, 9, 29). Le registre n'aligne ni le mois ni le
    jour sur deux chiffres : en texte, « 2031-9-29 » passerait après
    « 2031-12-6 »."""
    m = re.match(r"(\d{4})-(\d{1,2})-(\d{1,2})", (d or "").strip())
    return tuple(int(x) for x in m.groups()) if m else (0, 0, 0)


def total(html):
    m = re.search(r"共\s*([\d,]+)\s*条", html)
    return int(m.group(1).replace(",", "")) if m else 0


# ── 1. Homologations de matière active technique ────────────────────────────
# Le numéro d'homologation chinois commence par deux lettres (PD, WP, LS, WL…).
# S'en servir pour reconnaître une vraie ligne évite de ramasser les cellules
# du formulaire de recherche, qui vit dans la même page.
NUM_HOMOLOGATION = re.compile(r"^[A-Z]{2}[A-Z0-9-]{3,}$")


def homologations_tc(nom_iso):
    """Détenteurs d'une homologation chinoise de matière active technique."""
    champs = {c: "" for c in CHAMPS_REG}
    champs.update({
        "pageNo": "1",
        "pageSize": "500",
        "jx": TECHNIQUE,
        "yxcf_en": nom_iso,
        "accOrfuzzy": "1",  # exact — voir l'avertissement en tête de fichier
    })
    html = poster(URL_REG, champs, referer=URL_REG)

    lignes = []
    for c in cellules(html):
        if not NUM_HOMOLOGATION.match(c[0]) or len(c) < 6:
            continue
        lignes.append({
            "homologation": c[0],
            "nomChinois": c[1],
            "categorie": c[2] or None,
            "teneur": c[4] or None,
            "expiration": c[5] or None,
            "detenteur": c[-1] or None,
        })
    return lignes, total(html)


# ── 2. Licences de production ───────────────────────────────────────────────
NUM_LICENCE = re.compile(r"^农药生许")


def licences_production():
    """Toutes les entreprises titulaires d'une licence de production chinoise."""
    out = {}
    page = 1
    attendu = None
    while True:
        html = poster(URL_LIC, {
            "pageNum": str(page), "pageSize": "50", "productionLicenseCode": "",
            "enterpriseName": "", "creditCode": "", "provinceCode": "",
            "productScope": "", "productAddress": "", "startDate": "",
            "endDate": "", "status": "",
        }, referer=URL_LIC)

        if attendu is None:
            attendu = total(html)
            print(f"  {attendu} licences de production à parcourir")

        n = 0
        for c in cellules(html):
            if len(c) < 4 or not NUM_LICENCE.match(c[0]):
                continue
            n += 1
            out.setdefault(c[1], {
                "entreprise": c[1],
                "licence": c[0],
                "expiration": c[2] or None,
                # Périmètre : matières actives et formulations autorisées, en
                # chinois. Tronqué par l'affichage du registre, gardé tel quel.
                "perimetre": c[3] or None,
            })
        if n == 0:
            break
        print(f"    page {page} · {len(out)} entreprises", end="\r")
        if len(out) >= attendu or page > 60:
            break
        page += 1
        time.sleep(PAUSE)
    print()
    return out


def regenerer_iso():
    """Le pont français -> ISO anglais vient de lib/apvma.ts, pas d'ici."""
    print("génération de data/_iso.json (appariement lib/apvma.ts)…")
    r = subprocess.run(
        ["npx", "tsx", "scripts/noms_iso.ts"], cwd=RACINE,
        capture_output=True, text=True, shell=(sys.platform == "win32"),
    )
    print("  " + (r.stdout or r.stderr).strip().splitlines()[-1])
    if not ISO.exists():
        raise SystemExit("data/_iso.json absent : lancez « npx tsx scripts/noms_iso.ts ».")


def main():
    args = sys.argv[1:]
    limite = None
    if "--limite" in args:
        limite = int(args[args.index("--limite") + 1])
    if "--sans-iso" not in args:
        regenerer_iso()

    iso = json.loads(ISO.read_text(encoding="utf-8"))
    noms = iso["iso"][:limite] if limite else iso["iso"]

    print(f"\n1/2 · homologations de matière active technique — {len(noms)} noms ISO")
    par_iso = {}
    zh_par_iso = defaultdict(set)
    detenteurs = defaultdict(set)
    for i, nom in enumerate(noms, 1):
        try:
            lignes, tot = homologations_tc(nom)
        except Exception as e:
            print(f"  [{i}/{len(noms)}] {nom} — échec : {e}")
            continue
        if lignes:
            par_iso[nom] = lignes
            for l in lignes:
                zh_par_iso[nom].add(l["nomChinois"])
                if l["detenteur"]:
                    detenteurs[l["detenteur"]].add(nom)
        print(f"  [{i}/{len(noms)}] {nom[:38]:40} {len(lignes):4} détenteurs TC", end="\r")
        time.sleep(PAUSE)
    print(" " * 78, end="\r")
    print(f"  {len(par_iso)} matières actives trouvées, {len(detenteurs)} détenteurs distincts")

    print("\n2/2 · licences de production")
    lic = licences_production()

    # Croisement : titulaire d'homologation TC ET d'une licence de production.
    # Le nom d'entreprise est la seule clé commune aux deux registres, mais ils
    # sont tenus par la même administration : l'égalité stricte suffit ici, et
    # un rapprochement approximatif inventerait des usines.
    fabricants = {n: n in lic for n in detenteurs}

    matieres = []
    for nom in sorted(par_iso):
        lignes = par_iso[nom]
        soc = {}
        for l in lignes:
            if not l["detenteur"]:
                continue
            s = soc.setdefault(l["detenteur"], {
                "nom": l["detenteur"],
                "licenceProduction": lic.get(l["detenteur"], {}).get("licence"),
                "nbHomologations": 0,
                "teneurMax": None,
                "expirationMax": None,
            })
            s["nbHomologations"] += 1
            if l["teneur"] and teneur_num(l["teneur"]) > teneur_num(s["teneurMax"]):
                s["teneurMax"] = l["teneur"]
            if l["expiration"] and date_num(l["expiration"]) > date_num(s["expirationMax"]):
                s["expirationMax"] = l["expiration"]
        matieres.append({
            "iso": nom,
            "nomsChinois": sorted(zh_par_iso[nom]),
            "nbHomologationsTC": len(lignes),
            "societes": sorted(soc.values(), key=lambda s: (-s["nbHomologations"], s["nom"])),
        })

    payload = {
        "meta": {
            "source": ATTRIBUTION,
            "url": "https://www.icama.cn/BasicdataSystem/pesticideRegistration/queryselect.do",
            "attribution": f"{ATTRIBUTION} — relevé du {datetime.now().date().isoformat()}",
            "genere": datetime.now().isoformat(timespec="seconds"),
            "nbMatieres": len(matieres),
            "nbSocietes": len(detenteurs),
            "nbFabricants": sum(1 for v in fabricants.values() if v),
            "nbLicencesProduction": len(lic),
            "nomsIsoInterroges": len(noms),
            "avertissement": (
                "Registre chinois des homologations de matière active technique "
                "(原药) et des licences de production. Aucune valeur réglementaire "
                "au Maroc : une homologation chinoise n'ouvre pas la voie me-too "
                "et ne remplace aucune étude de l'Annexe 3-B. Sert à identifier "
                "et qualifier un fabricant, rien d'autre. Une société sans licence "
                "de production peut n'être que titulaire, pas producteur. Ni prix, "
                "ni capacité, ni audit qualité."
            ),
        },
        "matieres": matieres,
        "licences": sorted(lic.values(), key=lambda x: x["entreprise"]),
    }

    SORTIE.parent.mkdir(parents=True, exist_ok=True)
    SORTIE.write_text(json.dumps(payload, ensure_ascii=False, indent=1), encoding="utf-8")

    print(f"\nOK -> {SORTIE}")
    print(f"  {len(matieres)} matières actives · {len(detenteurs)} sociétés")
    print(f"  {payload['meta']['nbFabricants']} avec licence de production (fabricants confirmés)")
    print(f"  {len(lic)} licences de production au total")
    gros = sorted(detenteurs.items(), key=lambda kv: -len(kv[1]))[:5]
    for nom, mas in gros:
        marque = "usine" if fabricants.get(nom) else "titulaire"
        print(f"     {len(mas):3} M.A.  {marque:9}  {nom}")


if __name__ == "__main__":
    main()
