"""
Import de l'index phytosanitaire ONSSA depuis l'e-service public.

    python scripts/import_onssa_indpesticide.py
    python scripts/import_onssa_indpesticide.py --workers 3
    python scripts/import_onssa_indpesticide.py --depuis-cache
    python scripts/import_onssa_indpesticide.py --self-test

Source : https://eservice.onssa.gov.ma/IndPesticide.aspx
Sortie : data/onssa.json — même schéma que scripts/import_onssa.py.

L'Excel « FICHIERS PHYTO.xlsx » n'est plus la source de l'index. Le site
expose chaque fiche (détenteur, fournisseur, AMM, matières, usages, dose,
DAR) par postback ASP.NET. Un POST qui inclut btnRech / be_exc ignore
__EVENTTARGET : on n'envoie que les champs cachés.
"""

from __future__ import annotations

import argparse
import html
import json
import re
import subprocess
import sys
import time
import unicodedata
import urllib.parse
from collections import Counter, defaultdict
from datetime import date, datetime
from multiprocessing import Process, Queue
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from _pays import PAYS_COUT_FAIBLE, est_multinationale, pays_societe  # noqa: E402

RACINE = Path(__file__).resolve().parent.parent
SORTIE = RACINE / "data" / "onssa.json"
CACHE = RACINE / "data" / "onssa-indpesticide-cache.jsonl"
URL = "https://eservice.onssa.gov.ma/IndPesticide.aspx"
UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
)
DETENTEUR_DEFAUT = "PHYTO BEHT"
HIDDEN = (
    "__EVENTTARGET",
    "__EVENTARGUMENT",
    "__VIEWSTATE",
    "__VIEWSTATEGENERATOR",
    "__PREVIOUSPAGE",
    "__EVENTVALIDATION",
)


def slug(s):
    if not s:
        return ""
    s = unicodedata.normalize("NFKD", str(s))
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = re.sub(r"[^a-zA-Z0-9]+", "-", s).strip("-").lower()
    return s[:70]


def molecule_base(ma):
    if not ma:
        return ""
    return re.split(r"[(\[]", str(ma))[0].strip(" -")


def parse_date(v):
    if v is None or v == "":
        return None
    if isinstance(v, datetime):
        return v.date().isoformat()
    if isinstance(v, date):
        return v.isoformat()
    s = str(v).strip()
    for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y"):
        try:
            return datetime.strptime(s, fmt).date().isoformat()
        except ValueError:
            pass
    return None


def txt(v):
    if v is None:
        return None
    s = str(v).strip()
    return s or None


def texte(x):
    return html.unescape(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", x or ""))).strip()


def champ(bloc, label):
    m = re.search(rf"{re.escape(label)}\s*:\s*<b>([^<]*)</b>", bloc)
    return txt(texte(m.group(1))) if m else None


def parse_maj(page: str):
    m = re.search(r"Derni[eè]re MAJ\s*:\s*([0-9]{2}/[0-9]{2}/[0-9]{4}(?:\s+[0-9:]{8})?)", texte(page))
    return m.group(1).strip() if m else None


def maj_vers_iso(maj: str | None) -> str:
    if not maj:
        return datetime.now().isoformat(timespec="seconds")
    for fmt in ("%d/%m/%Y %H:%M:%S", "%d/%m/%Y"):
        try:
            return datetime.strptime(maj, fmt).isoformat(timespec="seconds")
        except ValueError:
            pass
    return datetime.now().isoformat(timespec="seconds")


def parse_fields(page: str) -> dict:
    fields = {}
    for name, value in re.findall(
        r'<input[^>]*name=["\']([^"\']+)["\'][^>]*value=["\']([^"\']*)["\']',
        page,
        flags=re.I,
    ):
        fields[html.unescape(name)] = html.unescape(value)
    for value, name in re.findall(
        r'<input[^>]*value=["\']([^"\']*)["\'][^>]*name=["\']([^"\']+)["\']',
        page,
        flags=re.I,
    ):
        fields.setdefault(html.unescape(name), html.unescape(value))
    keep = {k: v for k, v in fields.items() if k in HIDDEN or k.startswith("ctl00$CPHCorps$ctl")}
    keep["ctl00$CPHCorps$txtRech"] = fields.get("ctl00$CPHCorps$txtRech", "")
    keep["ctl00$CPHCorps$txtRech2"] = fields.get("ctl00$CPHCorps$txtRech2", "")
    keep.setdefault("__EVENTTARGET", "")
    keep.setdefault("__EVENTARGUMENT", "")
    return keep


def encoder(fields: dict) -> bytes:
    return urllib.parse.urlencode(fields, quote_via=urllib.parse.quote, encoding="utf-8").encode("ascii")


def parse_usages(blob: str) -> list[dict]:
    """Les colonnes changent d'une fiche à l'autre (DAR, Intervalle, Mode…)."""
    usages = []
    for tm in re.finditer(r'<table class="Bordure"[^>]*>(.*?)</table>', blob, flags=re.S | re.I):
        block = tm.group(1)
        rows = re.findall(r"<tr>(.*?)</tr>", block, flags=re.S)
        if not rows:
            continue
        ths = re.findall(r"<th([^>]*)>(.*?)</th>", rows[0], flags=re.S)
        if not ths:
            continue
        headers = []
        for attrs, content in ths:
            label = texte(content)
            span_m = re.search(r"colspan=['\"](\d+)", attrs, flags=re.I)
            span = int(span_m.group(1)) if span_m else 1
            if span >= 2 and label.lower().startswith("usage"):
                headers.extend(["culture", "cible"])
            else:
                headers.append(label)
        if "culture" not in headers or not any(h.lower().startswith("dose") for h in headers):
            continue
        alias = {
            "dose": "dose",
            "max. appli.": "nbAppl",
            "max appli.": "nbAppl",
            "dar (j)": "dar",
            "dar": "dar",
            "stade ennemi": "stade",
            "période": "stade",
            "periode": "stade",
        }
        for row in rows[1:]:
            tds = [txt(texte(td)) for td in re.findall(r"<td[^>]*>(.*?)</td>", row, flags=re.S)]
            if len(tds) < 2:
                continue
            raw = {h: v for h, v in zip(headers, tds)}
            mapped = {}
            for h, v in raw.items():
                key = alias.get(h.strip().lower())
                if key:
                    mapped[key] = v
            culture, cible = raw.get("culture"), raw.get("cible")
            usage = " / ".join(x for x in (culture, cible) if x)
            usages.append({
                "usage": usage or None,
                "culture": culture,
                "cible": cible,
                "dose": mapped.get("dose"),
                "stade": mapped.get("stade"),
                "dar": mapped.get("dar"),
                "nbAppl": mapped.get("nbAppl"),
            })
        if usages:
            break
    return usages


def parse_fiche(page: str) -> dict | None:
    """Lit le tableau français de la fiche produit. Ignore le volet arabe."""
    m = re.search(r'<table id="ctl00_CPHCorps_tblPesticide"[^>]*>(.*)', page, flags=re.S)
    if not m:
        return None
    blob = m.group(1)
    cut = blob.find('id="ctl00_CPHCorps_tblPesticide_TW"')
    if cut != -1:
        blob = blob[:cut]

    nom = champ(blob, "Nom commercial")
    if not nom:
        return None

    matieres = []
    mm = re.search(r"<th>Matière Active</th><th>Teneur</th></tr>(.*?)</table>", blob, flags=re.S)
    if mm:
        for a, b in re.findall(r"<td[^>]*>(.*?)</td>\s*<td[^>]*>(.*?)</td>", mm.group(1), flags=re.S):
            n, t = txt(texte(a)), txt(texte(b))
            if n:
                matieres.append({"nom": n, "teneur": t})

    usages = parse_usages(blob)

    return {
        "nomCommercial": nom,
        "detenteur": champ(blob, "Détenteur"),
        "fournisseur": champ(blob, "Fournisseur"),
        "amm": champ(blob, "Numéro homologation"),
        "expiration": parse_date(champ(blob, "Valable jusqu'au")),
        "tox": champ(blob, "Tableau toxicologique"),
        "categorie": champ(blob, "Catégorie"),
        "formulation": champ(blob, "Formulation"),
        "matieres": matieres,
        "usages": usages,
    }


def lister_produits(page: str) -> list[tuple[int, str]]:
    """Les fiches françaises portent un __doPostBack ; le volet arabe est disabled."""
    vus = []
    for i, nom in re.findall(
        r"__doPostBack\('ctl00\$CPHCorps\$lnkProduits(\d+)'[^>]*>([^<]+)</a>",
        page,
    ):
        nom = txt(texte(nom))
        if nom:
            vus.append((int(i), nom))
    vus.sort()
    return vus


def curl(cookie: Path, out: Path, data: bytes | None = None, timeout: int = 120) -> bytes:
    hdr = out.with_suffix(".hdr")
    cmd = [
        "curl", "-sS", "-k", "--http1.1", "--tlsv1.2", "--compressed",
        "--retry", "8", "--retry-all-errors", "--retry-delay", "2",
        "--connect-timeout", "25", "--max-time", str(timeout),
        "-A", UA, "-e", URL,
        "-c", str(cookie), "-b", str(cookie),
        "-D", str(hdr),
        "-H", "Origin: https://eservice.onssa.gov.ma",
        "-H", "Connection: close",
        "-o", str(out),
    ]
    if data is not None:
        body = out.with_suffix(".body")
        body.write_bytes(data)
        cmd.extend([
            "-H", "Content-Type: application/x-www-form-urlencoded",
            "--data-binary", f"@{body}",
        ])
    cmd.append(URL)
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0 and not out.exists():
        raise RuntimeError(f"curl {r.returncode}: {(r.stderr or '')[:300]}")
    return out.read_bytes() if out.exists() else b""


def session_liste(workdir: Path, tag: str) -> tuple[bytes, dict, str | None, list[tuple[int, str]]]:
    cookie = workdir / f"{tag}.cookies"
    raw = curl(cookie, workdir / f"{tag}-get.html")
    page = raw.decode("utf-8", "replace")
    maj = parse_maj(page)
    fields = parse_fields(page)
    fields["__EVENTTARGET"] = "ctl00$CPHCorps$lnkRech8"
    fields["__EVENTARGUMENT"] = ""
    raw = curl(cookie, workdir / f"{tag}-nomcom.html", encoder(fields), timeout=180)
    page = raw.decode("utf-8", "replace")
    maj = parse_maj(page) or maj
    produits = lister_produits(page)
    return raw, parse_fields(page), maj, produits


def fiche_depuis_liste(workdir: Path, tag: str, fields: dict, idx: int) -> dict | None:
    cookie = workdir / f"{tag}.cookies"
    f = dict(fields)
    f["__EVENTTARGET"] = f"ctl00$CPHCorps$lnkProduits{idx}"
    f["__EVENTARGUMENT"] = ""
    raw = curl(cookie, workdir / f"{tag}-fiche.html", encoder(f), timeout=180)
    page = raw.decode("utf-8", "replace")
    return parse_fiche(page)


def worker(tag: str, taches: list[tuple[int, str]], q: Queue, workdir: str):
    wd = Path(workdir)
    try:
        _, fields, _, _ = session_liste(wd, tag)
    except Exception as e:
        q.put({"fatal": str(e), "tag": tag})
        return
    consecutifs = 0
    for idx, nom in taches:
        fiche = None
        err = None
        for essai in range(4):
            try:
                fiche = fiche_depuis_liste(wd, tag, fields, idx)
                if fiche:
                    break
                err = "pas de tblPesticide"
            except Exception as e:
                err = str(e)
                fiche = None
            consecutifs += 1
            if consecutifs >= 3:
                try:
                    _, fields, _, _ = session_liste(wd, tag)
                    consecutifs = 0
                except Exception as e2:
                    err = f"reprise session: {e2}"
            time.sleep(1.2 * (essai + 1))
        if fiche:
            consecutifs = 0
            q.put({"idx": idx, "nom": nom, "fiche": fiche})
        else:
            q.put({"idx": idx, "nom": nom, "fiche": None, "err": err})
    q.put({"done": tag})


def charger_cache(path: Path) -> dict[int, dict]:
    out: dict[int, dict] = {}
    if not path.exists():
        return out
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        row = json.loads(line)
        fiche = row.get("fiche")
        idx = row.get("idx")
        if fiche and idx is not None:
            out[int(idx)] = fiche
    return out


def ma_libelle(m: dict) -> str:
    nom, ten = m.get("nom"), m.get("teneur")
    if nom and ten:
        return f"{nom}({ten})"
    return nom or ""


def lignes_depuis_fiche(fiche: dict) -> list[dict]:
    mas = fiche.get("matieres") or [{"nom": None, "teneur": None}]
    usages = fiche.get("usages") or [{
        "usage": None, "culture": None, "cible": None,
        "dose": None, "dar": None, "nbAppl": None,
    }]
    lignes = []
    for ma in mas:
        for u in usages:
            lignes.append({
                "detenteur": txt(fiche.get("detenteur")),
                "produit": txt(fiche.get("nomCommercial")),
                "fournisseur": txt(fiche.get("fournisseur")),
                "amm": txt(fiche.get("amm")),
                "expiration": fiche.get("expiration"),
                "tox": txt(fiche.get("tox")),
                "categorie": txt(fiche.get("categorie")),
                "formulation": txt(fiche.get("formulation")),
                "ma": txt(ma_libelle(ma)) if isinstance(ma, dict) else txt(ma),
                "teneur": txt(ma.get("teneur")) if isinstance(ma, dict) else None,
                "usage": txt(u.get("usage")),
                "dose": txt(u.get("dose")),
                "culture": txt(u.get("culture")),
                "dar": txt(u.get("dar")),
                "nbAppl": txt(u.get("nbAppl")),
                "cible": txt(u.get("cible")),
            })
    return lignes


def construire(lignes: list[dict], meta_src: dict) -> dict:
    fourn_ma = defaultdict(set)
    fourn_n = defaultdict(int)
    for l in lignes:
        if l["fournisseur"]:
            fourn_n[l["fournisseur"]] += 1
            if l["ma"]:
                fourn_ma[l["fournisseur"]].add(l["ma"])

    fournisseurs = []
    for nom, n in sorted(fourn_n.items(), key=lambda kv: -kv[1]):
        pays, certain = pays_societe(nom)
        fournisseurs.append({
            "id": slug(nom), "nom": nom, "pays": pays, "paysInfere": True,
            "paysFiable": certain,
            "coutFaible": pays in PAYS_COUT_FAIBLE if pays else False,
            "multinationale": est_multinationale(nom),
            "nbLignesMaroc": n, "nbMatieresActives": len(fourn_ma[nom]),
        })

    ma_agg = defaultdict(lambda: {
        "categories": set(), "detenteurs": set(), "fournisseurs": set(),
        "usages": set(), "cultures": set(), "cibles": set(), "amm": set(),
        "produits": set(), "doses": set(), "libelles": Counter(),
    })
    for l in lignes:
        if not l["ma"]:
            continue
        a = ma_agg[slug(l["ma"])]
        a["libelles"][l["ma"]] += 1
        if l["categorie"]:
            a["categories"].add(l["categorie"])
        if l["detenteur"]:
            a["detenteurs"].add(l["detenteur"])
        if l["fournisseur"]:
            a["fournisseurs"].add(l["fournisseur"])
        if l["usage"]:
            a["usages"].add(l["usage"])
        if l["culture"]:
            a["cultures"].add(l["culture"])
        if l["cible"]:
            a["cibles"].add(l["cible"])
        if l["amm"]:
            a["amm"].add(l["amm"])
        if l["produit"]:
            a["produits"].add(l["produit"])
        if l["usage"] and l["dose"]:
            a["doses"].add(f"{l['usage']} :: {l['dose']} :: {l['dar'] or '-'}")

    matieres = []
    for cle, a in ma_agg.items():
        nom = a["libelles"].most_common(1)[0][0]
        matieres.append({
            "id": cle, "nom": nom, "molecule": molecule_base(nom),
            "categorie": sorted(a["categories"])[0] if a["categories"] else None,
            "detenteurs": sorted(a["detenteurs"]),
            "fournisseurs": sorted(a["fournisseurs"]),
            "usages": sorted(a["usages"]),
            "cultures": sorted(a["cultures"]),
            "cibles": sorted(a["cibles"]),
            "produits": sorted(a["produits"]),
            "nbHomologations": len(a["amm"]),
            "referentielDoses": sorted(a["doses"])[:60],
        })
    matieres.sort(key=lambda m: m["nom"])

    pf = defaultdict(lambda: {
        "detenteur": None,
        "fournisseurs": set(), "ma": set(), "usages": [],
        "amm": None, "expiration": None, "tox": None,
        "categorie": None, "formulation": None,
    })
    for l in lignes:
        if not l["detenteur"] or not l["produit"]:
            continue
        p = pf[(l["detenteur"], l["produit"])]
        p["detenteur"] = l["detenteur"]
        if l["fournisseur"]:
            p["fournisseurs"].add(l["fournisseur"])
        if l["ma"]:
            p["ma"].add(l["ma"])
        p["amm"] = p["amm"] or l["amm"]
        p["expiration"] = p["expiration"] or l["expiration"]
        p["tox"] = p["tox"] or l["tox"]
        p["categorie"] = p["categorie"] or l["categorie"]
        p["formulation"] = p["formulation"] or l["formulation"]
        usage = {
            "usage": l["usage"], "culture": l["culture"], "cible": l["cible"],
            "dose": l["dose"], "dar": l["dar"], "nbAppl": l["nbAppl"],
        }
        if usage not in p["usages"]:
            p["usages"].append(usage)

    produits = []
    for (det, nom), p in pf.items():
        produits.append({
            "id": slug(f"{det}--{nom}"),
            "detenteur": det,
            "detenteurId": slug(det),
            "nomCommercial": nom,
            "categorie": p["categorie"], "formulation": p["formulation"],
            "tox": p["tox"], "amm": p["amm"], "expiration": p["expiration"],
            "matieresActives": sorted(p["ma"]),
            "matieresActivesIds": [slug(m) for m in sorted(p["ma"])],
            "fournisseurs": sorted(p["fournisseurs"]),
            "usages": p["usages"],
        })
    produits.sort(key=lambda x: (x["detenteur"], x["nomCommercial"]))

    det_agg = defaultdict(lambda: {"produits": 0, "usages": 0, "ma": set(), "categories": set()})
    for pr in produits:
        d = det_agg[pr["detenteur"]]
        d["produits"] += 1
        d["usages"] += len(pr["usages"])
        d["ma"].update(pr["matieresActives"])
        if pr["categorie"]:
            d["categories"].add(pr["categorie"])

    detenteurs = [
        {
            "id": slug(nom),
            "nom": nom,
            "nbProduits": a["produits"],
            "nbUsages": a["usages"],
            "nbMatieresActives": len(a["ma"]),
            "categories": sorted(a["categories"]),
        }
        for nom, a in det_agg.items()
    ]
    detenteurs.sort(key=lambda d: -d["nbProduits"])

    return {
        "meta": {
            "source": "eservice.onssa.gov.ma/IndPesticide.aspx",
            "genere": maj_vers_iso(meta_src.get("maj")),
            "majIndex": meta_src.get("maj"),
            "url": URL,
            "detenteurDefaut": DETENTEUR_DEFAUT,
            "nbDetenteursCouverts": len(detenteurs),
            "nbLignesIndex": len(lignes),
            "nbProduitsIndex": len({l["produit"] for l in lignes if l["produit"]}),
            "nbDetenteurs": len({l["detenteur"] for l in lignes if l["detenteur"]}),
            "nbFiches": meta_src.get("nbFiches"),
            "avertissement": (
                "Index ONSSA importé depuis l'e-service public IndPesticide.aspx "
                f"(MAJ {meta_src.get('maj') or '?'}). Le pays des fournisseurs est inféré "
                "par mots-clés (paysInfere=true) et doit être vérifié avant tout "
                "engagement commercial. Aucun prix ne figure dans la source."
            ),
        },
        "fournisseurs": fournisseurs,
        "matieres": matieres,
        "detenteurs": detenteurs,
        "portefeuille": produits,
    }


def self_test():
    echantillon = Path("/tmp/curl-fiche.html")
    if not echantillon.exists():
        sys.exit("self-test : /tmp/curl-fiche.html absent")
    fiche = parse_fiche(echantillon.read_text(encoding="utf-8", errors="replace"))
    assert fiche and fiche["nomCommercial"] == "HERBIDIM", fiche
    assert fiche["detenteur"] == "LAKORALE"
    assert fiche["amm"] == "F04-8-003"
    assert fiche["expiration"] == "2034-01-18"
    assert fiche["matieres"] == [{"nom": "Cléthodime", "teneur": "240 g/l"}]
    assert fiche["usages"][0]["culture"] == "Betterave à sucre"
    assert fiche["usages"][0]["dose"] == "0,5 l/ha"
    print("self-test OK", fiche["nomCommercial"], fiche["amm"], fiche["usages"][0]["dar"])


def scraper(workers: int, limite: int | None, depuis_cache: bool) -> tuple[list[dict], str | None, int]:
    workdir = Path("/tmp/onssa-scrape")
    workdir.mkdir(parents=True, exist_ok=True)
    cache = charger_cache(CACHE)
    print(f"cache {len(cache)} fiches")

    if depuis_cache and cache:
        return list(cache.values()), None, len(cache)

    print("-> session liste Nom commercial")
    _, _, maj, produits = session_liste(workdir, "main")
    print(f"  MAJ {maj} · {len(produits)} produits")
    if limite:
        produits = produits[:limite]

    restants = [(i, n) for i, n in produits if i not in cache]
    print(f"  à télécharger {len(restants)} (déjà en cache {len(produits) - len(restants)})")
    if not restants:
        return [cache[i] for i, _ in produits if i in cache], maj, len(produits)

    n_w = max(1, min(workers, len(restants)))
    tranches = [restants[i::n_w] for i in range(n_w)]
    q: Queue = Queue()
    procs = []
    for i, taches in enumerate(tranches):
        if not taches:
            continue
        p = Process(target=worker, args=(f"w{i}", taches, q, str(workdir)), daemon=True)
        p.start()
        procs.append(p)
        time.sleep(2)

    recus = 0
    cibles = len(restants)
    finis = 0
    CACHE.parent.mkdir(parents=True, exist_ok=True)
    with CACHE.open("a", encoding="utf-8") as fh:
        while finis < len(procs):
            msg = q.get()
            if msg.get("fatal"):
                print("  FATAL", msg)
                finis += 1
                continue
            if msg.get("done"):
                finis += 1
                print(f"  worker {msg['done']} terminé")
                continue
            recus += 1
            fiche = msg.get("fiche")
            if fiche:
                cache[msg["idx"]] = fiche
                fh.write(json.dumps({"idx": msg["idx"], "nom": msg["nom"], "fiche": fiche}, ensure_ascii=False) + "\n")
                fh.flush()
            else:
                print(f"  échec {msg.get('idx')} {msg.get('nom')}: {msg.get('err')}")
            if recus % 25 == 0 or recus == cibles:
                print(f"  {recus}/{cibles} fiches")

    for p in procs:
        p.join()

    fiches = []
    manquants = []
    for idx, nom in produits:
        f = cache.get(idx)
        if f:
            fiches.append(f)
        else:
            manquants.append(nom)
    if manquants:
        print(f"  manquants {len(manquants)} : {manquants[:12]}")
    return fiches, maj, len(produits)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--workers", type=int, default=3)
    ap.add_argument("--limit", type=int, default=None)
    ap.add_argument("--depuis-cache", action="store_true")
    ap.add_argument("--self-test", action="store_true")
    args = ap.parse_args()
    if args.self_test:
        self_test()
        return

    fiches, maj, nb_liste = scraper(args.workers, args.limit, args.depuis_cache)
    if not fiches:
        sys.exit("aucune fiche importée")

    lignes = []
    for f in fiches:
        lignes.extend(lignes_depuis_fiche(f))

    payload = construire(lignes, {"maj": maj, "nbFiches": len(fiches), "nbListe": nb_liste})
    cible = SORTIE if not args.limit else Path("/tmp/onssa-sample.json")
    cible.parent.mkdir(parents=True, exist_ok=True)
    cible.write_text(json.dumps(payload, ensure_ascii=False, indent=1), encoding="utf-8")
    m = payload["meta"]
    print(f"OK -> {cible}")
    print(f"  source     : {m['source']} · MAJ {m.get('majIndex')}")
    print(f"  index      : {m['nbLignesIndex']} lignes / {m['nbProduitsIndex']} produits / {m['nbDetenteurs']} détenteurs")
    print(f"  matieres   : {len(payload['matieres'])}")
    print(f"  detenteurs : {len(payload['detenteurs'])}")
    for d in payload["detenteurs"][:5]:
        print(f"     {d['nbProduits']:4} produits  {d['nom']}")


if __name__ == "__main__":
    main()
