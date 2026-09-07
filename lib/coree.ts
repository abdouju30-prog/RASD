import coreeFile from "../data/coree.json";
import { apparierApvma } from "./apvma";

// ────────────────────────────────────────────────────────────────────────────
// REGISTRE CORÉEN — 농약안전정보시스템 (PSIS), Rural Development Administration
//
// La Corée du Sud est membre de l'OCDE ET un pays de production générique
// réelle. La combinaison est rare — la Turquie mise à part, les membres de
// l'OCDE présents dans l'outil formulent plus qu'ils ne synthétisent.
//
// CE QUE CE REGISTRE APPORTE ET QUE LES AUTRES N'APPORTENT PAS : LA DATE.
// Le catalogue russe est daté de 2022 ; le registre brésilien ne publie pas de
// date d'entrée ; l'ICAMA donne des expirations, pas des arrivées. Ici chaque
// homologation porte son jour, et l'export est régénéré quotidiennement. C'est
// la seule source de l'outil où l'on VOIT ENTRER une molécule — donc la seule
// qui donne une veille de nouveautés sur un registre de l'OCDE.
//
// ⚠️ « FABRIQUÉ EN CORÉE » NE VEUT PAS DIRE « MATIÈRE ACTIVE SYNTHÉTISÉE ».
// Le registre distingue 제조 (produit fabriqué) de 수입 (produit importé). Un
// formulateur coréen peut fabriquer son produit à partir d'un technique chinois
// importé. Ce registre nomme LE TITULAIRE de l'homologation, comme
// l'australien — il ne nomme pas l'usine de synthèse, comme le brésilien.
//
// ⚠️ LA FILIALE N'EST PAS LE GROUPE. « Syngenta Korea » détient des
// homologations coréennes ; ce n'est pas une piste de sourcing générique, c'est
// l'antenne locale d'un inventeur. Les seize filiales repérées sont marquées.
//
// ⚠️ AUCUNE VALEUR RÉGLEMENTAIRE AU MAROC : ni voie me-too, ni étude en moins.
// La Corée adhère à l'AMD par son adhésion à l'OCDE — un argument dans un
// dossier, pas un droit opposable à l'ONSSA, qui n'y adhère pas.
// ────────────────────────────────────────────────────────────────────────────

export interface SocieteCoreenne {
  cle: string;
  /** Raison sociale telle que le registre l'écrit, en hangul — elle fait foi. */
  nom: string;
  /** Romanisation révisée, calculée : une poignée pour chercher. */
  latin: string | null;
  /** Nom commercial relevé à la main, quand il l'a été. */
  commercial: string | null;
  /** Groupe étranger dont cette entité est la filiale, le cas échéant. */
  groupe: string | null;
  formes: string[];
  nbHomologations: number;
  /** Produits fabriqués en Corée — pas matières actives synthétisées. */
  nbFabrique: number;
  nbImporte: number;
  nbMatieres: number;
  /** Matières actives de l'index marocain, en nom ISO. */
  matieres: string[];
  premiere: string | null;
  derniere: string | null;
}

export interface MatiereCoreenne {
  iso: string;
  nomsCoreens: string[];
  nbHomologations: number;
  nbFabrique: number;
  nbImporte: number;
  /** Première homologation coréenne connue — l'entrée de la molécule. */
  premiere: string | null;
  derniere: string | null;
  societes: string[];
}

/** Matière active homologuée en Corée et absente de l'index marocain. */
export interface HorsIndexCoreen {
  nom: string;
  iso: string | null;
  nbHomologations: number;
  nbFabrique: number;
  nbImporte: number;
  premiere: string | null;
  derniere: string | null;
  societes: string[];
}

interface FichierCoree {
  meta: {
    source: string;
    url: string;
    attribution: string;
    genere: string;
    derniereHomologation: string | null;
    nbLignesUsage: number;
    nbHomologations: number;
    nbSocietes: number;
    nbFiliales: number;
    nbMatieres: number;
    nbMatieresIndex: number;
    nbNomsIso: number;
    nbHorsIndex: number;
    nbFabrique: number;
    nbImporte: number;
    avertissement: string;
  };
  matieres: MatiereCoreenne[];
  horsIndex: HorsIndexCoreen[];
  societes: SocieteCoreenne[];
}

const FICHIER = coreeFile as unknown as FichierCoree;

export const META_COREE = FICHIER.meta;
export const MATIERES_COREE: MatiereCoreenne[] = FICHIER.matieres;
export const HORS_INDEX_COREE: HorsIndexCoreen[] = FICHIER.horsIndex;
export const SOCIETES_COREE: SocieteCoreenne[] = FICHIER.societes;

/** Les sociétés proprement coréennes — les filiales de groupes en sont exclues. */
export const PRODUCTEURS_COREENS = SOCIETES_COREE.filter((s) => !s.groupe);
export const FILIALES_EN_COREE = SOCIETES_COREE.filter((s) => s.groupe);

const PAR_ISO = new Map(MATIERES_COREE.map((m) => [m.iso, m]));
const PAR_CLE = new Map(SOCIETES_COREE.map((s) => [s.cle, s]));

/** Entrée du registre coréen correspondant à une matière active de l'index. */
export function matiereCoreenne(nomONSSA: string): MatiereCoreenne | null {
  const c = apparierApvma(nomONSSA);
  return c ? PAR_ISO.get(c.nom) ?? null : null;
}

export interface FabricantsCoreens {
  matiere: MatiereCoreenne;
  societes: SocieteCoreenne[];
  filiales: SocieteCoreenne[];
}

/**
 * Sociétés coréennes détenant une homologation sur cette matière active.
 *
 * Classées par polyvalence : une société qui porte quarante de vos matières
 * actives est un interlocuteur, une société qui n'en porte qu'une est un
 * détenteur. Les filiales de groupes étrangers sont mises à part — elles ne
 * sont pas des pistes de sourcing.
 */
export function fabricantsCoreens(nomONSSA: string): FabricantsCoreens | null {
  const m = matiereCoreenne(nomONSSA);
  if (!m) return null;
  const toutes = m.societes
    .map((c) => PAR_CLE.get(c))
    .filter((s): s is SocieteCoreenne => Boolean(s))
    .sort((a, b) => b.matieres.length - a.matieres.length || b.nbHomologations - a.nbHomologations);
  return {
    matiere: m,
    societes: toutes.filter((s) => !s.groupe),
    filiales: toutes.filter((s) => s.groupe),
  };
}

/** Étiquette lisible d'une société : le commercial s'il est connu, sinon le latin. */
export function etiquette(s: SocieteCoreenne): string {
  return s.commercial ?? s.latin ?? s.nom;
}

export const STATS_COREE = {
  nbHomologations: META_COREE.nbHomologations,
  nbSocietes: META_COREE.nbSocietes,
  nbProducteurs: PRODUCTEURS_COREENS.length,
  nbFiliales: META_COREE.nbFiliales,
  nbMatieres: META_COREE.nbMatieres,
  nbMatieresIndex: META_COREE.nbMatieresIndex,
  nbNomsIso: META_COREE.nbNomsIso,
  nbHorsIndex: META_COREE.nbHorsIndex,
  nbFabrique: META_COREE.nbFabrique,
  nbImporte: META_COREE.nbImporte,
  derniereHomologation: META_COREE.derniereHomologation,
  attribution: META_COREE.attribution,
  avertissement: META_COREE.avertissement,
  source: META_COREE.source,
  url: META_COREE.url,
};
