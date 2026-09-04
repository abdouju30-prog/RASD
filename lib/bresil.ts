import bresilFile from "../data/bresil.json";
import { apparierApvma } from "./apvma";
import { FOURNISSEURS } from "./data";
import { IndexNoms } from "./noms";

// ────────────────────────────────────────────────────────────────────────────
// AGROFIT — registre brésilien des produits TECHNIQUES
//
// C'est la source la plus utile de l'outil pour le sourcing, et pour une
// raison qu'aucun autre registre ne partage : le Brésil homologue séparément
// le produit technique, et publie POUR CHAQUE HOMOLOGATION LE FABRICANT, SON
// SITE ET SON PAYS.
//
//     Meghmani Organics Ltd. - Unit II - Panoli   <ÍNDIA>   FABRICANTE
//
// Là où le registre chinois donne des raisons sociales en han et où le
// registre national indien reste fermé, celui-ci nomme les deux en alphabet
// latin, rattachés à une matière active précise et à une teneur.
//
// ⚠️ AUCUNE VALEUR RÉGLEMENTAIRE AU MAROC : ni voie me-too, ni étude en moins.
//
// ⚠️ « FABRICANTE » EST UNE DÉCLARATION, PAS UN AUDIT. C'est le fabricant du
// technique déclaré au dossier brésilien. Un fait déclaré à un régulateur
// exigeant vaut mieux qu'une brochure, et ne vaut pas une visite d'usine.
// ────────────────────────────────────────────────────────────────────────────

export interface UsineBresil {
  id: string;
  nom: string;
  /** Pays traduit ; `paysBrut` garde le libellé portugais du registre. */
  pays: string | null;
  paysBrut: string | null;
  /** Sites déclarés — « Unit II - Panoli », « Jhagadia ». */
  sites: string[];
  /** Matières actives de l'index marocain qu'elle fabrique, en nom ISO. */
  matieres: string[];
  matieresPt: string[];
  nbHomologations: number;
  /** Titulaires brésiliens qui s'appuient sur cette usine. */
  titulaires: string[];
}

export interface MatiereBresil {
  iso: string;
  nomsPt: string[];
  nbHomologations: number;
  /**
   * Teneur la plus élevée homologuée, en g/kg ou g/L selon la substance.
   *
   * Aucun autre registre de l'outil ne publie la teneur du technique. C'est
   * la première ligne d'un cahier des charges : comparer deux offres sans
   * figer la teneur revient à comparer des choses différentes.
   */
  teneurMax: number | null;
  usines: string[];
}

interface FichierBresil {
  meta: {
    source: string;
    url: string;
    attribution: string;
    genere: string;
    nbHomologations: number;
    nbUsines: number;
    nbMatieres: number;
    nbMatieresIndex: number;
    parPays: [string, number][];
    avertissement: string;
  };
  matieres: MatiereBresil[];
  usines: UsineBresil[];
}

const FICHIER = bresilFile as unknown as FichierBresil;

export const META_BRESIL = FICHIER.meta;
export const USINES_BRESIL: UsineBresil[] = FICHIER.usines;
export const MATIERES_BRESIL: MatiereBresil[] = FICHIER.matieres;

const PAR_ISO = new Map(MATIERES_BRESIL.map((m) => [m.iso, m]));
const PAR_ID = new Map(USINES_BRESIL.map((u) => [u.id, u]));

/** Entrée du registre brésilien correspondant à une matière active de l'index. */
export function matiereBresil(nomONSSA: string): MatiereBresil | null {
  const c = apparierApvma(nomONSSA);
  return c ? PAR_ISO.get(c.nom) ?? null : null;
}

export interface FabricantsBresil {
  matiere: MatiereBresil;
  usines: UsineBresil[];
}

/**
 * Usines déclarées au Brésil comme fabriquant cette matière active technique.
 *
 * Classées par polyvalence puis par nombre d'homologations : une usine qui
 * fabrique quinze de vos matières actives est un interlocuteur, une usine qui
 * n'en fabrique qu'une est un fournisseur.
 */
export function fabricantsBresiliens(nomONSSA: string): FabricantsBresil | null {
  const m = matiereBresil(nomONSSA);
  if (!m) return null;
  const usines = m.usines
    .map((id) => PAR_ID.get(id))
    .filter((u): u is UsineBresil => Boolean(u))
    .sort(
      (a, b) => b.matieres.length - a.matieres.length || b.nbHomologations - a.nbHomologations
    );
  return { matiere: m, usines };
}

// ── Rapprochement avec l'index ONSSA ────────────────────────────────────────
//
// Les raisons sociales sont ici en alphabet latin : la règle commune de
// lib/noms.ts s'applique, comme pour la Turquie et l'EPA. C'est ce qui permet
// de voir qu'une usine brésilienne est déjà un fournisseur marocain — ou ne
// l'est pas, et devient alors une piste.

const INDEX_ONSSA = new IndexNoms(FOURNISSEURS.map((f) => ({ nom: f.nom, valeur: f.nom })));

export interface UsineBresilSituee extends UsineBresil {
  fournisseurOnssa: string | null;
}

function situer(u: UsineBresil): UsineBresilSituee {
  return {
    ...u,
    fournisseurOnssa: INDEX_ONSSA.exact(u.nom) ?? INDEX_ONSSA.proches(u.nom, 1)[0] ?? null,
  };
}

export const USINES_BRESIL_SITUEES: UsineBresilSituee[] = USINES_BRESIL.map(situer);

/** Usines qui ne sont rattachées à aucun fournisseur de l'index — les pistes. */
export const PISTES_BRESIL = USINES_BRESIL_SITUEES.filter(
  (u) => !u.fournisseurOnssa && u.matieres.length > 0
);

export const STATS_BRESIL = {
  nbHomologations: META_BRESIL.nbHomologations,
  nbUsines: META_BRESIL.nbUsines,
  nbMatieres: META_BRESIL.nbMatieres,
  nbMatieresIndex: META_BRESIL.nbMatieresIndex,
  nbDejaConnues: USINES_BRESIL_SITUEES.filter((u) => u.fournisseurOnssa).length,
  nbPistes: PISTES_BRESIL.length,
  parPays: META_BRESIL.parPays,
  attribution: META_BRESIL.attribution,
  avertissement: META_BRESIL.avertissement,
};
