#!/usr/bin/env python3
"""Build a read-only BPE corpus from Homologa JSON. Never writes back to Homologa."""

from __future__ import annotations

import json
import re
import sys
import unicodedata
from collections import Counter
from pathlib import Path

# Homologa family map (lib/onssa-eservice.ts). Keywords stay aligned with that file.
FAMILLES_HOMOLOGA = [
    (
        "Cultures fruitières",
        [
            "pommier", "poirier", "agrume", "olivier", "vigne", "abricotier", "pêcher",
            "prunier", "amandier", "figuier", "grenadier", "cerisier", "arboricult", "fruit",
            "bananier", "avocatier", "palmier",
        ],
    ),
    (
        "Cultures légumières et plantes aromatiques et médicinales",
        [
            "tomate", "pomme de terre", "melon", "pastèque", "courgette", "poivron",
            "piment", "concombre", "haricot", "petit pois", "oignon", "carotte", "salade",
            "laitue", "fraisier", "aubergine", "chou", "menthe", "légum", "maraîch",
        ],
    ),
    (
        "Grandes cultures",
        [
            "blé", "orge", "maïs", "riz", "betterave", "tournesol", "colza", "luzerne",
            "céréale", "légumineuse", "fève", "pois chiche", "lentille",
        ],
    ),
    ("Cultures ornementales", ["rosier", "ornement", "gazon", "fleur"]),
    ("Traitement des semences", ["semence"]),
    ("Désinfection des sols", ["sol"]),
    (
        "Traitement des produits récoltés (entreposage)",
        ["entrepos", "stock", "récolt", "denrée"],
    ),
]

# Added by BPE, applied only when Homologa's keyword map misses the crop.
# Perimeter names are the ONSSA BPE labels, so an organism's coverage can be
# compared. Origin is stored as "ajout-bpe" and shown as such in the app.
FAMILLES_AJOUTS = [
    (
        "Cultures fruitières",
        [
            "cognassier", "framboisier", "myrtillier", "mûrier", "murier", "nectarinier",
            "néflier", "neflier", "kaki", "pistachier", "caroubier", "figue de barbarie",
            "groseillier",
        ],
    ),
    ("Cultures tropicales", ["manguier", "ananas", "papayer", "litchi", "goyavier", "tropical"]),
    (
        "Cultures légumières et plantes aromatiques et médicinales",
        [
            "ail", "aneth", "artichaut", "asperge", "basilic", "brocoli", "ciboulette",
            "coriandre", "cornichon", "courge", "cucurbit", "céleri", "celeri", "estragon",
            "fenouil", "mâche", "mache", "navet", "persil", "radis", "roquette", "scarole",
            "échalote", "echalote", "épinard", "epinard", "chicorée", "chicoree", "verveine",
            "marjolaine", "romarin", "aromatique", "potiron", "patate douce", "caprier",
        ],
    ),
    (
        "Grandes cultures",
        [
            "avoine", "triticale", "féverole", "feverole", "arachide", "cotonnier",
            "canne à sucre", "canne a sucre", "fourrage", "oléagineux", "oleagineux",
        ],
    ),
    ("Cultures ornementales", ["floral"]),
    ("Milieu forestier", ["forestier", "eucalyptus", "pin ", "cèdre", "cedre"]),
    (
        "Zones non cultivées (excepté les arbres forestiers)",
        ["non cultiv", "jachère", "jachere", "infest", "parcours"],
    ),
    (
        "Production de matériel végétal de multiplication",
        ["pépinière", "pepiniere", "greffon", "porte-greffe", "porte greffe"],
    ),
    (
        "Traitement des produits récoltés (entreposage)",
        [
            "pommes", "prune", "pêche", "peche", "pruneaux", "figues séchées", "roses séchées", "caroubes",
            "épices", "epices", "pellets", "tourteaux",
        ],
    ),
]


def sans_teneurs(nom: str) -> str:
    out = []
    profondeur = 0
    for c in nom:
        if c == "(":
            profondeur += 1
        elif c == ")":
            if profondeur > 0:
                profondeur -= 1
            else:
                out.append(" ")
        elif profondeur == 0:
            out.append(c)
    return "".join(out)


def base(nom: str) -> str:
    nom = re.sub(r"\s*-\s*(sels?|esters?)\b.*$", "", nom, flags=re.I)
    nom = re.sub(r"\s*-\s*(2-éthylhexyl|éthylhexyl|isoctylique)\b.*$", "", nom, flags=re.I)
    return nom.strip()


def composants(nom: str, repli: str | None = None) -> list[str]:
    parts = []
    for x in sans_teneurs(nom).split("/"):
        x = re.sub(r"^[-–,;\s]+", "", x.strip())
        x = re.sub(r"[-–,;\s]+$", "", x)
        if len(x) >= 4:
            parts.append(x)
    uniques = list(dict.fromkeys(parts))
    if uniques:
        return uniques
    r = (repli or nom).strip()
    return [r] if r else []


def molecules(nom: str, repli: str | None = None) -> list[str]:
    return list(dict.fromkeys(b for c in composants(nom, repli) if (b := base(c))))


def slug(s: str) -> str:
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = s.lower()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return (s[:80] or "x")


def perimetres_de(culture: str) -> tuple[list[str], str]:
    bas = culture.lower()
    hits = [nom for nom, mots in FAMILLES_HOMOLOGA if any(m in bas for m in mots)]
    if hits:
        return hits, "homologa"
    ajouts = [nom for nom, mots in FAMILLES_AJOUTS if any(m in bas for m in mots)]
    if ajouts:
        return ajouts, "ajout-bpe"
    return [], "non-rattache"


def parse_dose(ligne: str) -> tuple[str, str, str, str] | None:
    parts = [p.strip() for p in ligne.split(" :: ")]
    if len(parts) < 3 or not parts[0]:
        return None
    usage, dose, dar = parts[0], parts[1], " :: ".join(parts[2:]).strip()
    if " / " in usage:
        culture, cible = usage.split(" / ", 1)
    else:
        culture, cible = usage, ""
    culture, cible = culture.strip(), cible.strip()
    if not culture:
        return None
    return culture, cible, dose, dar


def pousser(lst: list[str], valeur: str, plafond: int = 12) -> None:
    v = valeur.strip()
    if v and v not in lst and len(lst) < plafond:
        lst.append(v)


class Agg:
    def __init__(self) -> None:
        self.emplois: dict[tuple[str, str], dict] = {}
        self.categories: Counter[str] = Counter()
        self.nb = 0

    def ajouter(self, categorie: str | None, doses: list[str]) -> None:
        self.nb += 1
        if categorie:
            self.categories[categorie] += 1
        for ligne in doses:
            parsed = parse_dose(ligne)
            if not parsed:
                continue
            culture, cible, dose, dar = parsed
            cle = (culture, cible)
            e = self.emplois.get(cle)
            if e is None:
                e = {"culture": culture, "cible": cible, "doses": [], "dar": []}
                self.emplois[cle] = e
            pousser(e["doses"], dose)
            pousser(e["dar"], dar)

    def categorie(self) -> str | None:
        if not self.categories:
            return None
        return self.categories.most_common(1)[0][0]

    def emplois_tries(self) -> list[dict]:
        return sorted(
            self.emplois.values(),
            key=lambda e: (-len(e["doses"]), e["culture"].lower(), e["cible"].lower()),
        )


def main() -> None:
    if len(sys.argv) != 4:
        raise SystemExit("usage: extraire.py <onssa.json> <onssa-eservice.json> <corpus.json>")
    onssa_path, eservice_path, out_path = map(Path, sys.argv[1:])
    onssa = json.loads(onssa_path.read_text(encoding="utf-8"))
    eservice = json.loads(eservice_path.read_text(encoding="utf-8"))

    matieres: dict[str, dict] = {}
    melanges: dict[tuple[str, ...], dict] = {}

    def id_unique(base_id: str, pris: set[str]) -> str:
        i = base_id
        n = 2
        while i in pris:
            i = f"{base_id}-{n}"
            n += 1
        pris.add(i)
        return i

    ids_pris: set[str] = set()

    for ligne in onssa["matieres"]:
        noms = molecules(ligne.get("nom") or "", ligne.get("molecule") or "")
        if not noms:
            continue
        clefs = []
        for nom in noms:
            key = nom.casefold()
            slot = matieres.get(key)
            if slot is None:
                slot = {
                    "nom": nom,
                    "graphies": Counter([nom]),
                    "agg": Agg(),
                }
                matieres[key] = slot
            else:
                slot["graphies"][nom] += 1
            slot["agg"].ajouter(ligne.get("categorie"), ligne.get("referentielDoses") or [])
            clefs.append(key)
        clefs_u = tuple(sorted(set(clefs)))
        if len(clefs_u) >= 2:
            mix = melanges.get(clefs_u)
            if mix is None:
                mix = {"clefs": clefs_u, "agg": Agg()}
                melanges[clefs_u] = mix
            mix["agg"].ajouter(ligne.get("categorie"), ligne.get("referentielDoses") or [])

    matiere_out = []
    id_par_clef: dict[str, str] = {}
    for key, slot in sorted(matieres.items(), key=lambda kv: kv[1]["graphies"].most_common(1)[0][0].casefold()):
        nom = slot["graphies"].most_common(1)[0][0]
        mid = id_unique(slug(nom), ids_pris)
        id_par_clef[key] = mid
        emplois = slot["agg"].emplois_tries()
        cultures = sorted({e["culture"] for e in emplois}, key=lambda s: s.casefold())
        cibles = sorted({e["cible"] for e in emplois if e["cible"]}, key=lambda s: s.casefold())
        matiere_out.append(
            {
                "id": mid,
                "nom": nom,
                "categorie": slot["agg"].categorie(),
                "cultures": cultures,
                "cibles": cibles,
                "emplois": emplois,
                "nbLignes": slot["agg"].nb,
            }
        )

    mix_ids: set[str] = set()
    melange_out = []
    for mix in melanges.values():
        composants_noms = []
        composant_ids = []
        for key in mix["clefs"]:
            composants_noms.append(next(m["nom"] for m in matiere_out if m["id"] == id_par_clef[key]))
            composant_ids.append(id_par_clef[key])
        ordre = sorted(range(len(composants_noms)), key=lambda i: composants_noms[i].casefold())
        composants_noms = [composants_noms[i] for i in ordre]
        composant_ids = [composant_ids[i] for i in ordre]
        mid = id_unique(slug(" + ".join(composants_noms)), mix_ids)
        emplois = mix["agg"].emplois_tries()
        melange_out.append(
            {
                "id": mid,
                "composants": composants_noms,
                "composantIds": composant_ids,
                "categorie": mix["agg"].categorie(),
                "cultures": sorted({e["culture"] for e in emplois}, key=lambda s: s.casefold()),
                "cibles": sorted({e["cible"] for e in emplois if e["cible"]}, key=lambda s: s.casefold()),
                "emplois": emplois,
                "nbLignes": mix["agg"].nb,
            }
        )
    melange_out.sort(key=lambda m: (-m["nbLignes"], " + ".join(m["composants"]).casefold()))

    cultures_set = sorted(
        {c for m in matiere_out for c in m["cultures"]},
        key=lambda s: s.casefold(),
    )
    culture_ids: set[str] = set()
    cultures_out = []
    for nom in cultures_set:
        pers, origine = perimetres_de(nom)
        cultures_out.append(
            {
                "id": id_unique(slug(nom), culture_ids),
                "nom": nom,
                "perimetres": pers,
                "originePerimetres": origine,
                "nbMatieres": sum(1 for m in matiere_out if nom in m["cultures"]),
            }
        )

    organismes = []
    for o in eservice.get("organismesBpe") or []:
        ag = o.get("agrement") or {}
        organismes.append(
            {
                "nom": o.get("nom"),
                "siege": o.get("siege"),
                "telephone": o.get("telephone"),
                "fax": o.get("fax"),
                "emails": o.get("emails") or [],
                "agrement": {
                    "numero": ag.get("numero"),
                    "date": ag.get("date"),
                    "expiration": ag.get("expiration"),
                },
                "couverture": o.get("couverture") or [],
            }
        )

    meta_o = onssa.get("meta") or {}
    meta_e = eservice.get("meta") or {}
    corpus = {
        "meta": {
            "nom": "BPE",
            "sourceIndex": "Homologa data/onssa.json (lecture seule)",
            "genereIndex": meta_o.get("genere"),
            "sourceBpe": meta_e.get("source"),
            "attributionBpe": meta_e.get("attribution"),
            "majBpe": meta_e.get("majBpe"),
            "avertissement": (
                "Extrait en lecture seule. Homologa n'est pas modifié. "
                "Les noms de produits, détenteurs, fournisseurs et numéros d'AMM "
                "ne sont pas repris. Doses et DAR sont ceux de l'index, comme précédents, "
                "pas comme une autorisation d'essai. Seule l'attestation ONSSA fait foi "
                "pour un agrément BPE."
            ),
        },
        "matieres": matiere_out,
        "melanges": melange_out,
        "cultures": cultures_out,
        "organismes": organismes,
    }
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(corpus, ensure_ascii=False, indent=1), encoding="utf-8")
    print(
        f"matieres={len(matiere_out)} melanges={len(melange_out)} "
        f"cultures={len(cultures_out)} organismes={len(organismes)} "
        f"octets={out_path.stat().st_size}"
    )


if __name__ == "__main__":
    main()
