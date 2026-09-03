import bkuFile from "../data/bku.json";
import { apparierApvma } from "./apvma";
import { FOURNISSEURS, MATIERES } from "./data";
import { IndexNoms } from "./noms";

// ────────────────────────────────────────────────────────────────────────────
// BKÜ — registre turc des produits de protection des plantes
//
// La Turquie est un pays de sourcing proche du Maroc — climat, cultures,
// logistique — et son registre publie ce que l'Inde et la Russie refusent : le
// titulaire de chaque homologation, avec son adresse.
//
// Elle apporte surtout la distinction que le registre chinois apporte pour la
// Chine, et que ni l'Australie ni l'EPA ne donnent : chaque produit porte la
// mention **İMAL** (fabriqué en Turquie) ou **İTHAL** (importé). Une société
// qui n'a que des İTHAL est un importateur, quel que soit le nombre de ses
// homologations.
//
// ⚠️ Aucune valeur réglementaire au Maroc : ni voie me-too, ni étude en moins.
// Et « İMAL » désigne une fabrication en Turquie, pas nécessairement la
// synthèse de la matière active — une formulation locale à partir d'un
// technique importé porte la même mention.
//
// ⚠️ Le pont français -> turc passe par le nom ISO anglais, via `apparierApvma`,
// comme pour la Chine : une seule règle de rapprochement dans tout l'outil.
// ────────────────────────────────────────────────────────────────────────────

export interface SocieteTurque {
  id: number;
  nom: string | null;
  adresse: string | null;
  nbProduits: number;
  nbImal: number;
  nbIthal: number;
  matieres: string[];
  /** Matières actives que la société fabrique en Turquie. */
  matieresImal: string[];
  /** true dès une homologation İMAL — sinon la société n'est qu'importatrice. */
  fabricant: boolean;
}

export interface MatiereTurque {
  cle: string;
  nom: string;
  societes: string[];
  societesImal: string[];
}

interface FichierBku {
  meta: {
    source: string;
    url: string;
    attribution: string;
    genere: string;
    nbProduits: number;
    nbSocietes: number;
    nbFabricants: number;
    nbMatieres: number;
    nbImal: number;
    nbIthal: number;
    avertissement: string;
  };
  societes: SocieteTurque[];
  matieres: MatiereTurque[];
}

const BKU = bkuFile as unknown as FichierBku;

export const META_BKU = BKU.meta;
export const SOCIETES_TURQUES = BKU.societes;
export const MATIERES_TURQUES = BKU.matieres;

function normaliser(s: string): string {
  return s
    .replace(/İ/g, "I")
    .replace(/ı/g, "i")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const PAR_CLE = new Map(MATIERES_TURQUES.map((m) => [normaliser(m.nom), m]));

/**
 * Alias explicites : nom ISO anglais -> libellé turc.
 *
 * Le registre écrit les substances organiques en nom ISO anglais, mais les
 * minérales en turc : « Kükürt » pour le soufre, « Metalik bakıra eşdeğer
 * bakır oksiklorid » pour l'oxychlorure de cuivre. Aucune règle de
 * normalisation ne rapproche les deux.
 *
 * Table plutôt qu'appariement approximatif, et c'est délibéré : la même
 * précaution qu'ailleurs dans l'outil, où « METSULFURON-METHYL » contient la
 * chaîne « SULFUR » sans avoir de rapport avec le soufre.
 */
const ALIAS: Record<string, string[]> = {
  sulphur: ["Kükürt"],
  sulfur: ["Kükürt"],
  "copper present as copper oxychloride": ["Metalik bakıra eşdeğer bakır oksiklorid"],
  "copper present as cupric hydroxide": ["Metalik bakıra eşdeğer bakır hidroksit"],
  "copper present as copper sulfate pentahydrate": [
    "Metalik bakıra eşdeğer bakır sülfat",
    "Metalik bakıra eşdeğer bazik bakır sülfat",
  ],
  "paraffin oil": ["Mineral Yağ"],
};

/** Une matière turque résolue, éventuellement agrégée depuis plusieurs sels. */
export interface MatiereTurqueResolue extends MatiereTurque {
  /** Libellés turcs réunis — « Glyphosate IPA », « Glyphosate Potasyum Tuzu »… */
  noms: string[];
}

/**
 * Matière active turque correspondant à une matière de l'index ONSSA.
 * Passe par le nom ISO anglais : « Abamectine(1,8%) » -> ABAMECTIN -> Abamectin.
 *
 * Le registre turc ne nomme certaines substances que par leurs sels : il n'y a
 * aucune entrée « Glyphosate », seulement « Glyphosate Isopropylamin Tuzu »,
 * « Glyphosate IPA » et « Glyphosate Potasyum Tuzu ». À défaut de
 * correspondance exacte, on réunit donc les entrées dont le libellé COMMENCE
 * par le nom ISO suivi d'une espace.
 *
 * ⚠️ La limite de mot n'est pas décorative : sans elle, « 2,4-D » happerait
 * « 2,4-DB », qui est un autre herbicide.
 */
export function matiereTurque(nomONSSA: string): MatiereTurqueResolue | null {
  const c = apparierApvma(nomONSSA);
  if (!c) return null;
  const iso = normaliser(c.nom);

  const exact = PAR_CLE.get(iso);
  if (exact) return { ...exact, noms: [exact.nom] };

  // Les alias priment sur le repli par préfixe : ils traitent les cas qu'aucune
  // règle ne rapproche.
  const alias = (ALIAS[iso] ?? [])
    .map((n) => PAR_CLE.get(normaliser(n)))
    .filter((m): m is MatiereTurque => Boolean(m));

  const sels = alias.length
    ? alias
    : MATIERES_TURQUES.filter((m) => normaliser(m.nom).startsWith(iso + " "));
  if (sels.length === 0) return null;

  return {
    cle: iso,
    nom: c.nom,
    noms: sels.map((m) => m.nom),
    societes: [...new Set(sels.flatMap((m) => m.societes))].sort(),
    societesImal: [...new Set(sels.flatMap((m) => m.societesImal))].sort(),
  };
}

const PAR_NOM = new Map(SOCIETES_TURQUES.map((s) => [s.nom ?? "", s]));

export interface FabricantsTurcs {
  matiere: MatiereTurqueResolue;
  /** Sociétés qui la fabriquent en Turquie. */
  fabricants: SocieteTurque[];
  /** Sociétés qui ne font que l'importer. */
  importateurs: SocieteTurque[];
}

export function fabricantsTurcs(nomONSSA: string): FabricantsTurcs | null {
  const m = matiereTurque(nomONSSA);
  if (!m) return null;

  const imal = new Set(m.societesImal);
  const fabricants: SocieteTurque[] = [];
  const importateurs: SocieteTurque[] = [];
  for (const nom of m.societes) {
    const s = PAR_NOM.get(nom);
    if (!s) continue;
    (imal.has(nom) ? fabricants : importateurs).push(s);
  }
  fabricants.sort((a, b) => b.nbImal - a.nbImal);
  importateurs.sort((a, b) => b.nbProduits - a.nbProduits);
  return { matiere: m, fabricants, importateurs };
}

// ── Ce que la Turquie ajoute à l'index marocain ─────────────────────────────
// Les raisons sociales turques sont en alphabet latin : le rapprochement avec
// l'index ONSSA est donc possible, avec la règle commune de lib/noms.ts.

const INDEX_ONSSA = new IndexNoms(FOURNISSEURS.map((f) => ({ nom: f.nom, valeur: f.nom })));

export interface UsineTurque extends SocieteTurque {
  /** Fournisseur ONSSA rapproché, s'il y en a un. */
  fournisseurOnssa: string | null;
  /** Matières actives fabriquées qui sont aussi à l'index marocain. */
  matieresMaroc: string[];
}

/**
 * Matières turques qui correspondent à une matière active de l'index marocain.
 *
 * Le sens de la vérification compte : on part de l'index ONSSA, on le traduit
 * en nom ISO, et on cherche ce nom côté turc. Partir du registre turc
 * reviendrait à qualifier de « marocaine » toute substance qu'il contient.
 */
const TURQUES_AU_MAROC = new Set<string>();
for (const m of MATIERES) {
  const t = matiereTurque(m.nom);
  if (t) for (const n of t.noms) TURQUES_AU_MAROC.add(n);
}

function construire(): UsineTurque[] {
  return SOCIETES_TURQUES.filter((s) => s.fabricant)
    .map((s) => ({
      ...s,
      fournisseurOnssa:
        INDEX_ONSSA.exact(s.nom ?? "") ?? INDEX_ONSSA.proches(s.nom ?? "", 1)[0] ?? null,
      matieresMaroc: s.matieresImal.filter((m) => TURQUES_AU_MAROC.has(m)),
    }))
    .sort(
      (a, b) =>
        b.matieresMaroc.length - a.matieresMaroc.length ||
        b.matieresImal.length - a.matieresImal.length ||
        b.nbImal - a.nbImal
    );
}

export const USINES_TURQUES: UsineTurque[] = construire();

export const STATS_BKU = {
  nbProduits: META_BKU.nbProduits,
  nbSocietes: META_BKU.nbSocietes,
  nbFabricants: META_BKU.nbFabricants,
  nbMatieres: META_BKU.nbMatieres,
  nbImal: META_BKU.nbImal,
  nbIthal: META_BKU.nbIthal,
  nbConnues: USINES_TURQUES.filter((u) => u.fournisseurOnssa).length,
  nbMatieresMaroc: TURQUES_AU_MAROC.size,
  attribution: META_BKU.attribution,
  genere: META_BKU.genere,
};
