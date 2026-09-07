import { MATIERES, produitsDe } from "./data";
import { molecules } from "./formulation";
import { apparierApvma } from "./apvma";
import { MELANGES_COREE, type MelangeCoreen } from "./coree";
import type { MatiereActive } from "./types";

// ────────────────────────────────────────────────────────────────────────────
// LES ASSOCIATIONS — ce que le marché vend réellement
//
// Le marché ne s'achète pas en molécules, il se vend en mélanges : 212 des 653
// lignes de l'index sont des associations, et la plus vendue du Maroc —
// azoxystrobine + difénoconazole — pèse 24 produits chez 19 sociétés. Une
// analyse molécule par molécule passe donc à côté de ce qui se vend.
//
// TROIS LECTURES, ET ELLES NE DISENT PAS LA MÊME CHOSE :
//
//   1. LES ASSOCIATIONS DU MAROC — qui les détient, sur quelles cultures.
//   2. LES PARTENAIRES D'UNE MOLÉCULE — avec quoi elle se formule ici. Pour une
//      matière active qu'on tient déjà, c'est la liste des produits qu'on
//      pourrait en tirer sans changer de fournisseur de base.
//   3. LES ASSOCIATIONS HOMOLOGUÉES EN CORÉE ET ABSENTES DU MAROC — 1 035 sur
//      1 059. Celles dont TOUS les composants sont déjà homologués au Maroc
//      sont les moins chères à déposer : chaque composant a une voie me-too,
//      et le mélange est une AMM neuve, donc un produit différencié.
//
// ⚠️ LE RAPPROCHEMENT PASSE PAR LE NOM ISO, comme partout ailleurs dans
// l'outil : `apparierApvma` traduit le nom français de l'index en nom ISO
// anglais, que le registre coréen écrit déjà. Un composant qui ne s'apparie
// pas rend l'association incomparable — elle est alors écartée, pas devinée.
//
// ⚠️ UNE ASSOCIATION HOMOLOGUÉE AILLEURS N'EST PAS UNE AUTORISATION DE MÉLANGE.
// L'ONSSA instruit chaque mélange pour lui-même : le précédent étranger est un
// argument de recevabilité, pas un droit. Et un mélange n'est pas une addition
// de deux dossiers — il demande ses propres études de toxicité et de résidus.
// ────────────────────────────────────────────────────────────────────────────

export interface Association {
  cle: string;
  composants: string[];
  /** Noms ISO des composants, quand l'appariement a réussi. */
  iso: (string | null)[];
  nbProduits: number;
  produits: string[];
  detenteurs: string[];
  fournisseurs: string[];
  cultures: string[];
  cibles: string[];
  categorie: string;
  /** Ligne d'index la plus lourde — porte le lien. */
  id: string;
}

/**
 * Nom ISO d'une matière active, normalisé.
 *
 * ⚠️ EN MAJUSCULES. PUBCRIS écrit « AZOXYSTROBIN », le registre coréen écrit
 * « Azoxystrobin » : comparés tels quels, aucun des 1 059 mélanges coréens ne
 * retrouvait son équivalent marocain et l'écran annonçait 1 059 pistes toutes
 * neuves. La casse n'est pas une identité.
 */
function isoDe(nom: string): string | null {
  const c = apparierApvma(nom);
  return c ? c.nom.toUpperCase() : null;
}

/** Nom ISO tel qu'un registre étranger l'écrit, ramené à la même forme. */
function isoBrut(nom: string): string {
  return nom.trim().toUpperCase();
}

function construire(): Association[] {
  const par = new Map<string, {
    composants: string[];
    lignes: MatiereActive[];
    produits: Set<string>;
    detenteurs: Set<string>;
    fournisseurs: Set<string>;
    cultures: Set<string>;
    cibles: Set<string>;
    categories: Set<string>;
  }>();

  for (const ma of MATIERES) {
    const comp = molecules(ma.nom, ma.molecule).sort();
    if (comp.length < 2) continue;
    const cle = comp.join(" + ");
    const v = par.get(cle) ?? {
      composants: comp,
      lignes: [],
      produits: new Set<string>(),
      detenteurs: new Set<string>(),
      fournisseurs: new Set<string>(),
      cultures: new Set<string>(),
      cibles: new Set<string>(),
      categories: new Set<string>(),
    };
    v.lignes.push(ma);
    for (const p of ma.produits) v.produits.add(p);
    for (const d of ma.detenteurs) v.detenteurs.add(d);
    for (const f of ma.fournisseurs) v.fournisseurs.add(f);
    for (const c of ma.cultures) v.cultures.add(c);
    for (const c of ma.cibles) v.cibles.add(c);
    if (ma.categorie) v.categories.add(ma.categorie);
    par.set(cle, v);
  }

  return [...par.entries()]
    .map(([cle, v]) => ({
      cle,
      composants: v.composants,
      iso: v.composants.map(isoDe),
      nbProduits: v.produits.size,
      produits: [...v.produits].sort(),
      detenteurs: [...v.detenteurs].sort(),
      fournisseurs: [...v.fournisseurs].sort(),
      cultures: [...v.cultures].sort(),
      cibles: [...v.cibles].sort(),
      categorie: [...v.categories][0] ?? "—",
      id: [...v.lignes].sort((a, b) => b.produits.length - a.produits.length)[0].id,
    }))
    .sort((a, b) => b.nbProduits - a.nbProduits || b.detenteurs.length - a.detenteurs.length);
}

export const ASSOCIATIONS: Association[] = construire();

// ── Partenaires de formulation ──────────────────────────────────────────────

export interface Partenaire {
  molecule: string;
  /** Produits marocains où les deux molécules sont ensemble. */
  nbProduits: number;
  associations: string[];
}

const PARTENAIRES = new Map<string, Map<string, { n: number; cles: Set<string> }>>();
for (const a of ASSOCIATIONS) {
  for (const x of a.composants) {
    const m = PARTENAIRES.get(x) ?? new Map();
    for (const y of a.composants) {
      if (y === x) continue;
      const v = m.get(y) ?? { n: 0, cles: new Set<string>() };
      v.n += a.nbProduits;
      v.cles.add(a.cle);
      m.set(y, v);
    }
    PARTENAIRES.set(x, m);
  }
}

/** Molécules avec lesquelles celle-ci est formulée au Maroc, les plus vendues d'abord. */
export function partenaires(molecule: string): Partenaire[] {
  const m = PARTENAIRES.get(molecule);
  if (!m) return [];
  return [...m.entries()]
    .map(([mol, v]) => ({ molecule: mol, nbProduits: v.n, associations: [...v.cles].sort() }))
    .sort((a, b) => b.nbProduits - a.nbProduits || a.molecule.localeCompare(b.molecule, "fr"));
}

/** Partenaires d'une ligne d'index, tous composants confondus. */
export function partenairesDe(ma: MatiereActive): Partenaire[] {
  const vus = new Map<string, Partenaire>();
  const propres = new Set(molecules(ma.nom, ma.molecule));
  for (const mol of propres) {
    for (const p of partenaires(mol)) {
      if (propres.has(p.molecule)) continue;
      const e = vus.get(p.molecule);
      if (e) e.nbProduits += p.nbProduits;
      else vus.set(p.molecule, { ...p });
    }
  }
  return [...vus.values()].sort((a, b) => b.nbProduits - a.nbProduits);
}

// ── Associations coréennes absentes du Maroc ────────────────────────────────

export interface ComposantPiste {
  iso: string;
  /** Nom marocain, si la molécule est homologuée au Maroc. */
  auMaroc: string | null;
  nbProduits: number;
}

export interface PisteAssociation extends MelangeCoreen {
  composantsSitues: ComposantPiste[];
  nbAuMaroc: number;
  /** Tous les composants sont déjà homologués au Maroc — le dépôt le moins cher. */
  toutAuMaroc: boolean;
}

// Index des molécules marocaines, par nom ISO. Une molécule sans appariement
// ISO reste invisible ici : c'est assumé, on ne devine pas une identité.
const MAROC_PAR_ISO = new Map<string, { nom: string; produits: Set<string> }>();
for (const ma of MATIERES) {
  for (const mol of molecules(ma.nom, ma.molecule)) {
    const iso = isoDe(mol);
    if (!iso) continue;
    const v = MAROC_PAR_ISO.get(iso) ?? { nom: mol, produits: new Set<string>() };
    for (const p of ma.produits) v.produits.add(p);
    MAROC_PAR_ISO.set(iso, v);
  }
}

const CLES_MAROC = new Set(
  ASSOCIATIONS.filter((a) => a.iso.every(Boolean)).map((a) =>
    [...(a.iso as string[])].sort().join("|")
  )
);

function situer(m: MelangeCoreen): PisteAssociation {
  const composantsSitues = m.composants.map((iso) => {
    const v = MAROC_PAR_ISO.get(isoBrut(iso));
    return { iso, auMaroc: v?.nom ?? null, nbProduits: v?.produits.size ?? 0 };
  });
  const nbAuMaroc = composantsSitues.filter((c) => c.auMaroc).length;
  return {
    ...m,
    composantsSitues,
    nbAuMaroc,
    toutAuMaroc: nbAuMaroc === m.composants.length,
  };
}

/** Associations coréennes qui n'existent pas à l'index marocain. */
export const PISTES_ASSOCIATIONS: PisteAssociation[] = MELANGES_COREE.filter(
  (m) => !CLES_MAROC.has([...m.composants.map(isoBrut)].sort().join("|"))
)
  .map(situer)
  // Le classement dit par quoi commencer : d'abord celles dont tout est déjà
  // homologué au Maroc — chaque composant y a une voie me-too — puis celles
  // que le marché coréen porte le plus.
  .sort(
    (a, b) =>
      Number(b.toutAuMaroc) - Number(a.toutAuMaroc) ||
      b.nbAuMaroc - a.nbAuMaroc ||
      b.nbSocietes - a.nbSocietes ||
      b.nbHomologations - a.nbHomologations
  );

/** Les plus faciles : rien à sourcer qui ne soit déjà au Maroc. */
export const PISTES_PRETES = PISTES_ASSOCIATIONS.filter((p) => p.toutAuMaroc);

// ── Vue par détenteur ───────────────────────────────────────────────────────

export interface GammeAssociations {
  tenues: Association[];
  manquantes: Association[];
}

const CACHE = new Map<string, GammeAssociations>();

export function associationsDe(detenteurId: string): GammeAssociations {
  const c = CACHE.get(detenteurId);
  if (c) return c;
  const noms = new Set(produitsDe(detenteurId).map((p) => p.nomCommercial));
  const tenues = ASSOCIATIONS.filter((a) => a.produits.some((p) => noms.has(p)));
  const cles = new Set(tenues.map((a) => a.cle));
  const g = {
    tenues,
    manquantes: ASSOCIATIONS.filter((a) => !cles.has(a.cle) && a.nbProduits >= 2),
  };
  CACHE.set(detenteurId, g);
  return g;
}

export const STATS_MELANGES = {
  nbAssociations: ASSOCIATIONS.length,
  nbLignesMelange: MATIERES.filter((m) => molecules(m.nom, m.molecule).length >= 2).length,
  nbLignes: MATIERES.length,
  nbCoreennes: MELANGES_COREE.length,
  nbPistes: PISTES_ASSOCIATIONS.length,
  nbPretes: PISTES_PRETES.length,
};
