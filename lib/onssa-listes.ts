import fichier from "../data/onssa-listes.json";
import { MATIERES } from "./data";
import { molecules } from "./formulation";

// ────────────────────────────────────────────────────────────────────────────
// LISTES ONSSA QUI CHANGENT UNE DÉCISION
//
// Deux PDF, pas le journal des avis. Le journal dit « il s'est passé quelque
// chose ». Ces listes disent QUOI, sur QUELLE molécule, à QUELLE date :
//
//   • substances retirées / interdites au Maroc
//   • substances encore homologuées, mais sous restriction d'usage
//
// ⚠️ ON NE CRÉE PAS D'AMM. Une molécule retirée n'entre pas dans l'index.
// Si l'Excel la porte encore, c'est une incohérence à signaler, pas à
// corriger en silence. Une restriction s'affiche sur la fiche déjà connue.
//
// L'appariement est STRICT (nom normalisé, composants de la ligne). Pas de
// radical à un mot : « cyperméthrine » ne doit pas hériter du retrait de
// « béta-cyperméthrine ».
// ────────────────────────────────────────────────────────────────────────────

export interface SubstanceRetiree {
  nom: string;
  cas: string;
  dateRetrait: string | null;
}

export interface SubstanceRestreinte {
  nom: string;
  cas: string;
  dateRestriction: string | null;
  condition: string;
}

interface Fichier {
  meta: {
    source: string;
    attribution: string;
    genere: string;
    urlRetirees: string | null;
    urlRestrictions: string | null;
    majRetirees: string | null;
    majRestrictions: string | null;
    nbRetirees: number;
    nbRestrictions: number;
    avertissement: string;
  };
  retirees: SubstanceRetiree[];
  restrictions: SubstanceRestreinte[];
}

const F = fichier as unknown as Fichier;

export const META_ONSSA_LISTES = F.meta;
export const SUBSTANCES_RETIREES = F.retirees;
export const SUBSTANCES_RESTREINTES = F.restrictions;

function normaliser(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function clesNom(nom: string): string[] {
  const n = normaliser(nom);
  if (!n) return [];
  const r = n.replace(/e$/, "");
  return r && r !== n ? [n, r] : [n];
}

function parNom<T extends { nom: string }>(xs: T[]): Map<string, T> {
  const m = new Map<string, T>();
  for (const x of xs) {
    for (const k of clesNom(x.nom)) {
      if (!m.has(k)) m.set(k, x);
    }
  }
  return m;
}

const RETIREE_PAR_NOM = parNom(SUBSTANCES_RETIREES);
const RESTREINTE_PAR_NOM = parNom(SUBSTANCES_RESTREINTES);

function pourMatiere<T>(ma: { nom: string; molecule: string }, table: Map<string, T>): T | null {
  const vus = new Set<string>();
  for (const brut of [ma.molecule, ma.nom, ...molecules(ma.nom, ma.molecule)]) {
    for (const k of clesNom(brut)) {
      if (vus.has(k)) continue;
      vus.add(k);
      const hit = table.get(k);
      if (hit) return hit;
    }
  }
  return null;
}

const MATIERE_PAR_ID = new Map(MATIERES.map((m) => [m.id, m]));

export function retireePourMatiere(ma: { nom: string; molecule: string }): SubstanceRetiree | null {
  return pourMatiere(ma, RETIREE_PAR_NOM);
}

export function restreintePourMatiere(ma: { nom: string; molecule: string }): SubstanceRestreinte | null {
  return pourMatiere(ma, RESTREINTE_PAR_NOM);
}

export function retireeParId(id: string): SubstanceRetiree | null {
  const ma = MATIERE_PAR_ID.get(id);
  return ma ? retireePourMatiere(ma) : null;
}

export function restreinteParId(id: string): SubstanceRestreinte | null {
  const ma = MATIERE_PAR_ID.get(id);
  return ma ? restreintePourMatiere(ma) : null;
}

export function retireeParNom(nom: string): SubstanceRetiree | null {
  for (const k of clesNom(nom)) {
    const hit = RETIREE_PAR_NOM.get(k);
    if (hit) return hit;
  }
  return null;
}

export function restreinteParNom(nom: string): SubstanceRestreinte | null {
  for (const k of clesNom(nom)) {
    const hit = RESTREINTE_PAR_NOM.get(k);
    if (hit) return hit;
  }
  return null;
}

/** L'index Excel porte encore une molécule que la liste ONSSA dit retirée. */
export function collisionsRetrait(): { ma: (typeof MATIERES)[number]; liste: SubstanceRetiree }[] {
  const out: { ma: (typeof MATIERES)[number]; liste: SubstanceRetiree }[] = [];
  const vu = new Set<string>();
  for (const ma of MATIERES) {
    const liste = retireePourMatiere(ma);
    if (!liste || vu.has(liste.nom)) continue;
    vu.add(liste.nom);
    out.push({ ma, liste });
  }
  return out;
}

const RETIREES_DANS_INDEX = new Set(collisionsRetrait().map((c) => c.liste.nom));

export const RETIREES_HORS_INDEX = SUBSTANCES_RETIREES.filter((r) => !RETIREES_DANS_INDEX.has(r.nom));

export const NB_COLLISIONS_RETRAIT = RETIREES_DANS_INDEX.size;

const RESTRICTIONS_DANS_INDEX = new Set<string>();
for (const ma of MATIERES) {
  const r = restreintePourMatiere(ma);
  if (r) RESTRICTIONS_DANS_INDEX.add(r.nom);
}
export const NB_RESTRICTIONS_INDEX = RESTRICTIONS_DANS_INDEX.size;
export const RESTRICTIONS_HORS_INDEX = SUBSTANCES_RESTREINTES.filter((r) => !RESTRICTIONS_DANS_INDEX.has(r.nom));

export function hrefOnssa(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return encodeURI(url);
  } catch {
    return url;
  }
}
