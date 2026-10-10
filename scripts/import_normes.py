"""
Normes privées, bio et conventions -> data/normes.json
Statut européen automatique, CAS, DJA, ARfD -> data/substances-ue.json

    python scripts/import_normes.py

POURQUOI. Un exportateur marocain certifié Fairtrade ou Rainforest Alliance
ne peut pas utiliser une molécule de leur liste rouge, même homologuée par
l'ONSSA ; un producteur bio ne peut utiliser que l'annexe I du règlement
(UE) 2021/1165. Ces listes sont publiques : les croiser avec l'index évite
de conseiller un produit interdit au client.

LE LIEN EST LE NUMÉRO CAS, jamais le nom. L'API européenne des substances
actives donne le CAS de chaque substance ; chaque liste est lue par CAS.
Une matière de l'index sans CAS connu reste « non évaluée ».

SOURCES (toutes publiques, relues à chaque exécution) :
  Fairtrade   Hazardous Materials List (rouge = interdite, orange = restreinte,
              jaune = signalée)
  Rainforest  Farming Annex, chapitre 4 (interdites, obsolètes, à atténuation)
  Bio UE      Règlement d'exécution (UE) 2021/1165, annexe I (consolidé)
  Rotterdam   Convention, annexe III (procédure PIC)
  Stockholm   Liste des polluants organiques persistants
"""

from __future__ import annotations

import html
import json
import re
import sys
import time
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _reseau import telecharger  # noqa: E402

RACINE = Path(__file__).resolve().parent.parent
DATA = RACINE / "data"
API = "https://api.datalake.sante.service.ec.europa.eu/sante/pesticides"
CAS = re.compile(r"\b\d{2,7}-\d{2}-\d\b")

SOURCES = {
    "fairtrade": {
        "nom": "Fairtrade — Hazardous Materials List",
        "url": "https://fairtrade.net/content/dam/fairtrade/fairtrade-international/hazardous-materials-list/Hazardous_Materials_List_EN.pdf",
    },
    "rainforest": {
        "nom": "Rainforest Alliance — Farming Annex (chapitre 4)",
        "url": "https://knowledge.rainforest-alliance.org/docs/farming-annex",
    },
    "bio": {
        "nom": "Bio UE — Règlement d'exécution (UE) 2021/1165, annexe I",
        "url": "https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:02021R1165-20250615",
    },
    "rotterdam": {
        "nom": "Convention de Rotterdam — annexe III",
        "url": "https://www.pic.int/Portals/5/download.aspx?d=UNEP-FAO-RC-CONVTEXT-2023.English.pdf",
    },
    "stockholm": {
        "nom": "Convention de Stockholm — polluants organiques persistants",
        "url": "https://www.pops.int/TheConvention/ThePOPs/AllPOPs/tabid/2509/Default.aspx",
    },
}


def texte_html(brut: bytes) -> str:
    t = brut.decode("utf-8", "replace")
    t = t.replace("\\u003C", "<").replace("\\u003E", ">").replace("\\u002F", "/").replace('\\"', '"')
    t = re.sub(r"<script.*?</script>|<style.*?</style>", " ", t, flags=re.S)
    return html.unescape(re.sub(r"<[^>]+>", "\n", t))


def texte_pdf(brut: bytes) -> str:
    import fitz  # PyMuPDF

    doc = fitz.open(stream=brut, filetype="pdf")
    return "".join(p.get_text() for p in doc)


def cas_entre(t: str, debut: str, fin: str | None, depuis: int = 0) -> set[str]:
    i = t.find(debut, depuis)
    if i < 0:
        raise SystemExit(f"section introuvable : {debut!r}")
    j = t.find(fin, i + len(debut)) if fin else len(t)
    return set(CAS.findall(t[i: j if j > 0 else len(t)]))


def fairtrade() -> dict[str, str]:
    t = texte_pdf(telecharger(SOURCES["fairtrade"]["url"]))
    fin = t.find("Change history")
    historique = t[fin:] if fin > 0 else ""
    dates = sorted(re.findall(r"\b(\d{1,2})\.(\d{2})\.(\d{4})\b", historique),
                   key=lambda d: (d[2], d[1], d[0].zfill(2)))
    SOURCES["fairtrade"]["miseAJour"] = f"{dates[-1][2]}-{dates[-1][1]}-{dates[-1][0].zfill(2)}" if dates else None
    p1, p2, p3 = (t.find(f"Part {n}: Fairtrade International") for n in (1, 2, 3))
    # La liste jaune s'arrête au journal des modifications, qui cite aussi des CAS.
    out = {c: "jaune" for c in CAS.findall(t[p3:fin if fin > 0 else len(t)])}
    out.update({c: "orange" for c in CAS.findall(t[p2:p3])})
    # Liste rouge : « ** » après le nom = conditions ou dérogations propres à
    # certaines cultures et régions (glyphosate, abamectine… depuis 2026).
    lignes = t[p1:p2].split("\n")
    for k, l in enumerate(lignes):
        for c in CAS.findall(l):
            noms = [x.strip() for x in lignes[max(0, k - 6):k] if x.strip() and not CAS.search(x)]
            derogation = bool(noms) and noms[-1].endswith("**")
            out[c] = "rouge (dérogations possibles)" if derogation else "rouge"
    return out


def rainforest() -> dict[str, str]:
    t = texte_html(telecharger(SOURCES["rainforest"]["url"]))
    # Le corps de l'annexe commence au deuxième titre « List of Prohibited Pesticides »
    # (le premier figure dans le journal des modifications).
    debut = t.find("The List of Prohibited Pesticides referred in base requirement")
    interdites = cas_entre(t, "The List of Prohibited Pesticides referred in base requirement", "Obsolete Pesticides", debut - 50)
    obsoletes = cas_entre(t, "OBSOLETE PESTICIDES", "Risk Mitigation Pesticides", debut)
    attenuation = cas_entre(t, "RISK MITIGATION PESTICIDES", "Risk mitigation measures required", debut)
    out = {c: "atténuation" for c in attenuation}
    out.update({c: "obsolète" for c in obsoletes})
    out.update({c: "interdite" for c in interdites})
    return out


def bio() -> dict[str, str]:
    t = texte_html(telecharger(SOURCES["bio"]["url"]))
    lignes = [l.strip() for l in t.split("\n") if l.strip()]
    i = next(k for k, l in enumerate(lignes) if l.startswith("ANNEX I") and "Active substances" in " ".join(lignes[k:k + 2]))
    j = next(k for k in range(i + 1, len(lignes)) if lignes[k].startswith("ANNEX II"))
    seg = [l for l in lignes[i:j] if not l.startswith(("▼", "►", "◄"))]
    code = re.compile(r"^\d{1,3}\s?[A-E](\s+\d{1,3}\s?[A-E])*$")  # « 139A », « 294A 295A »

    def est_cas(l: str) -> bool:
        return bool(CAS.search(l)) and len(l) < 40

    out: dict[str, str] = {}
    k = 0
    while k < len(seg):
        if not est_cas(seg[k]):
            k += 1
            continue
        cas = []
        while k < len(seg) and est_cas(seg[k]):
            cas += CAS.findall(seg[k])
            k += 1
        # Le nom, puis les conditions d'emploi, jusqu'à l'entrée suivante.
        bloc = []
        while k < len(seg) and not code.match(seg[k]) and not est_cas(seg[k]):
            bloc.append(seg[k])
            k += 1
        # Les notes de bas de page « ( 1 ) Listing according to… » ne sont pas des conditions.
        condition = re.split(r"\s\(\s?\d+\s?\)\s", " ".join(bloc[1:]))[0].strip()
        for c in cas:
            out[c] = condition[:220] if condition else "autorisée"
    return out


def rotterdam() -> set[str]:
    t = texte_pdf(telecharger(SOURCES["rotterdam"]["url"]))
    return cas_entre(t, "CHEMICALS SUBJECT TO THE PRIOR INFORMED CONSENT PROCEDURE", "ANNEX IV")


def stockholm() -> set[str]:
    return set(CAS.findall(texte_html(telecharger(SOURCES["stockholm"]["url"]))))


def get_tout(url: str) -> list[dict]:
    lignes = []
    while url:
        for essai in range(4):
            try:
                d = json.loads(telecharger(url, timeout=120).decode("utf-8"))
                break
            except Exception:  # noqa: BLE001
                if essai == 3:
                    raise
                time.sleep(5 * (essai + 1))
        lignes += d.get("value", [])
        url = d.get("nextLink")
    return lignes


# Noms ISO de l'index -> nom de la substance européenne, quand aucune règle
# d'écriture ne les rapproche. Table EXPLICITE, jamais de rapprochement flou.
ALIAS_UE = {
    "KAOLIN, CALCINED": "ALUMINIUM SILICATE",
    "ORTHOPHENYLPHENOL": "2-PHENYLPHENOL",
    "PYRETHRIN": "PYRETHRINS",
    "BENZYLADENINE": "6-BENZYLADENINE",
    "SULFUR": "SULPHUR",
}
# CAS absents de l'API européenne (« No CAS allocated ») mais publiés par les listes.
CAS_COMPLEMENT = {"SULPHUR": ["7704-34-9"]}
# Suffixes de sel ou d'ester : l'UE approuve souvent la substance « mère ».
SUFFIXES = (" BENZOATE", "-ALUMINIUM", "-PROPARGYL", "-P-BUTYL", "-BUTYL", "-SODIUM", "-CALCIUM",
            " ACID", " SULFATE", " CHLORIDE", "-METHYL", "-ETHYL")


def cle_ue(nom: str) -> str:
    """« Abamectin (aka avermectin) » / « Paraffin oil/(CAS …) » / « Metalaxyl M » -> ABAMECTIN, PARAFFINOIL, METALAXYLM."""
    n = nom.upper()
    if " PRESENT AS " in n:
        n = n.split(" PRESENT AS ", 1)[1]
    n = re.split(r"\s*/?\(", n, maxsplit=1)[0]
    return re.sub(r"[^A-Z0-9]", "", n)


def apparier(iso: str, index: dict[str, list[dict]]) -> list[dict]:
    essais = [ALIAS_UE.get(iso, iso)]
    n = iso.split(" PRESENT AS ", 1)[1] if " PRESENT AS " in iso else iso
    for suf in SUFFIXES:
        if n.endswith(suf):
            essais.append(n[: -len(suf)])
    essais.append(n)
    for e in essais:
        if cle_ue(e) in index:
            return index[cle_ue(e)]
    return []


def main():
    iso_maroc = set(json.loads((DATA / "_iso.json").read_text(encoding="utf-8"))["iso"])

    print("substances actives UE…")
    ue = get_tout(f"{API}/active-substances?format=json&api-version=v3.0")
    index: dict[str, list[dict]] = {}
    for s in ue:
        index.setdefault(cle_ue(s.get("substance_name") or ""), []).append(s)
    substances_ue = {}
    for iso in sorted(iso_maroc):
        trouves = apparier(iso, index)
        if not trouves:
            continue
        # Plusieurs entrées (huiles de paraffine par CAS…) : tous les CAS, statut « Approved » s'il en est un.
        s = next((x for x in trouves if x.get("substance_status") == "Approved"), trouves[0])
        cas = sorted({c for x in trouves for c in CAS.findall(" ".join(filter(None, [x.get("cas_number"), x.get("as_cas_number")])))})
        cas = cas or CAS_COMPLEMENT.get(iso, [])
        substances_ue[iso] = {
            "nomUE": s.get("substance_name"),
            "cas": cas,
            "statut": s.get("substance_status"),
            "approbation": s.get("approval_date"),
            "expiration": s.get("expiry_date"),
            "categorie": s.get("substance_category"),
            "dja": s.get("tox_value_adi"),
            "arfd": s.get("tox_value_arfd"),
        }
    print(f"  {len(ue)} substances UE, {len(substances_ue)} matières de l'index appariées par nom")

    print("listes…")
    listes = {}
    for nom, f in [("fairtrade", fairtrade), ("rainforest", rainforest), ("bio", bio),
                   ("rotterdam", rotterdam), ("stockholm", stockholm)]:
        listes[nom] = f()
        print(f"  {nom:10} {len(listes[nom])} CAS")

    normes = {}
    for iso, s in substances_ue.items():
        e = {}
        for c in s["cas"]:
            if c in listes["fairtrade"]:
                e["fairtrade"] = listes["fairtrade"][c]
            if c in listes["rainforest"]:
                e["rainforest"] = listes["rainforest"][c]
            if c in listes["bio"]:
                e["bio"] = listes["bio"][c]
            if c in listes["rotterdam"]:
                e["rotterdam"] = True
            if c in listes["stockholm"]:
                e["stockholm"] = True
        normes[iso] = e

    aujourd = date.today().isoformat()
    (DATA / "substances-ue.json").write_text(json.dumps({
        "meta": {"source": "EU Pesticides Database — DG SANTE (substances actives)", "genere": aujourd,
                 "nbSubstances": len(substances_ue)},
        "substances": substances_ue,
    }, ensure_ascii=False, indent=1), encoding="utf-8")
    (DATA / "normes.json").write_text(json.dumps({
        "meta": {"genere": aujourd, "sources": SOURCES,
                 "avertissement": ("Rapprochement par numéro CAS. Une matière sans CAS connu n'est pas "
                                   "évaluée. Les normes privées ont des exceptions et des conditions : "
                                   "vérifier le document en vigueur avant tout conseil.")},
        "substances": normes,
    }, ensure_ascii=False, indent=1), encoding="utf-8")
    nb = {k: sum(1 for e in normes.values() if k in e) for k in listes}
    print(f"OK : {len(normes)} matières évaluées ; " + ", ".join(f"{k} {v}" for k, v in nb.items()))


if __name__ == "__main__":
    main()
