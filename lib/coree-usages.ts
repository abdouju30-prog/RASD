import fichier from "../data/coree-usages.json";
import { apparierApvma } from "./apvma";

// ────────────────────────────────────────────────────────────────────────────
// USAGES CORÉENS — sur quoi la molécule est employée ailleurs
//
// 30 954 couples culture × ravageur, contre 7 000 environ à l'index marocain.
// Pour une matière active, c'est la liste des usages qu'un autre régulateur a
// jugés justifiés — donc de ceux qu'on pourrait revendiquer ici, à condition de
// les étayer.
//
// ⚠️ AUCUNE VALEUR RÉGLEMENTAIRE AU MAROC. Un usage coréen ne se revendique pas
// devant l'ONSSA : il faut ses propres essais d'efficacité sur les conditions
// marocaines. Ce que ce tableau donne, c'est la LISTE DES PISTES — et le fait
// qu'un régulateur exigeant les a acceptées ailleurs.
//
// ⚠️ LA TRADUCTION PORTE SON NIVEAU, ET LE CORÉEN RESTE. « exact » quand le
// terme entier a été lu et traduit à la main, « composé » quand il est
// reconstruit à partir de morphèmes agronomiques, « brut » quand il ne l'est
// pas. Un nom de ravageur faux oriente un traitement : l'écran affiche toujours
// l'original, qui seul fait foi.
//
// ⚠️ FICHIER LOURD, CHARGÉ À PART. 9 Mo : seule la fiche d'une matière active
// l'importe. Les autres écrans lisent lib/coree.ts, qui reste léger.
// ────────────────────────────────────────────────────────────────────────────

export type NiveauTraduction = "exact" | "compose" | "brut";

export interface UsageCoreen {
  culture: string;
  cultureKo: string;
  cultureNiveau: NiveauTraduction;
  cible: string;
  cibleKo: string;
  cibleNiveau: NiveauTraduction;
  nbProduits: number;
  /** Dilution — le registre coréen raisonne ainsi, pas en dose par hectare. */
  dilutions: string[];
  doses: string[];
  /** Stade ou délai avant récolte, traduit : « 3 j avant récolte ». */
  delais: string[];
  applications: string[];
  methodes: string[];
}

export interface MatiereUsages {
  matiere: string;
  iso: string | null;
  nbUsages: number;
  cultures: string[];
  cibles: string[];
  usages: UsageCoreen[];
}

interface Fichier {
  meta: {
    source: string;
    attribution: string;
    genere: string;
    nbUsages: number;
    partTraduite: number;
    avertissement: string;
  };
  matieres: MatiereUsages[];
}

const F = fichier as unknown as Fichier;

export const META_USAGES_COREE = F.meta;

const PAR_ISO = new Map<string, MatiereUsages>();
const PAR_NOM = new Map<string, MatiereUsages>();
for (const m of F.matieres) {
  PAR_NOM.set(m.matiere.toUpperCase(), m);
  if (m.iso) {
    const e = PAR_ISO.get(m.iso);
    // Une même matière ISO peut arriver sous deux graphies coréennes : on garde
    // celle qui porte le plus d'usages.
    if (!e || m.nbUsages > e.nbUsages) PAR_ISO.set(m.iso, m);
  }
}

/** Usages coréens d'une matière active de l'index marocain. */
export function usagesCoreens(nomONSSA: string): MatiereUsages | null {
  const c = apparierApvma(nomONSSA);
  if (c && PAR_ISO.has(c.nom)) return PAR_ISO.get(c.nom) ?? null;
  return PAR_NOM.get(nomONSSA.toUpperCase()) ?? null;
}

/** Usages qui portent sur une culture absente du spectre marocain. */
export function usagesNouveaux(
  m: MatiereUsages,
  culturesMaroc: string[]
): UsageCoreen[] {
  const connues = new Set(culturesMaroc.map((c) => c.toLowerCase()));
  return m.usages.filter((u) => !connues.has(u.culture.toLowerCase()));
}

export const STATS_USAGES_COREE = {
  nbUsages: META_USAGES_COREE.nbUsages,
  partTraduite: META_USAGES_COREE.partTraduite,
  nbMatieres: F.matieres.length,
  attribution: META_USAGES_COREE.attribution,
  avertissement: META_USAGES_COREE.avertissement,
};
