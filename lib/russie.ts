import russieFile from "../data/russie.json";
import { FOURNISSEURS } from "./data";
import { IndexNoms } from "./noms";

// ────────────────────────────────────────────────────────────────────────────
// CATALOGUE D'ÉTAT RUSSE — Государственный каталог пестицидов
//
// La Russie était le trou noir de l'outil : deux sociétés à l'index ONSSA,
// contre vingt-quatre pour l'Inde et la Chine. Le registre fédéral ne répond
// pas depuis l'étranger — d'où le miroir régional, qui sert le même document
// officiel du Minselkhoz.
//
// ⚠️ AUCUNE VALEUR RÉGLEMENTAIRE AU MAROC : ni voie me-too, ni étude en moins.
// Un détenteur d'homologation russe n'est pas nécessairement le fabricant de
// la matière active.
//
// ⚠️ L'ÉDITION EST DATÉE (4 avril 2022). C'est admissible pour ce qu'on lui
// demande — IDENTIFIER DES SOCIÉTÉS, qui ne disparaissent pas en quatre ans —
// et inadmissible pour ce qu'on ne lui demande pas : les échéances et les
// numéros d'homologation ne valent plus comme statut courant. Tout écran qui
// s'en sert affiche la date.
//
// ⚠️ LES NOMS SONT EN CYRILLIQUE, y compris ceux des sociétés étrangères, que
// le catalogue rend phonétiquement — « СИНГЕНТА » pour Syngenta. La
// translittération inverse ne retrouve pas l'orthographe d'origine : elle
// donne un handle pour chercher, pas une identité. Le rapprochement avec
// l'index ONSSA n'est donc tenté QUE sur les sociétés passées par la table
// d'alias de l'importateur, où le nom latin a été lu et vérifié.
// ────────────────────────────────────────────────────────────────────────────

export interface SocieteRusse {
  cle: string;
  /** Raison sociale telle que le catalogue l'écrit, en cyrillique. */
  nom: string;
  /** Nom latin : vérifié si `identifie`, sinon simple translittération. */
  latin: string;
  /** true = le nom latin vient de la table d'alias, il a été lu. */
  identifie: boolean;
  /** Formes juridiques relevées — c'est elles qui disent la nationalité. */
  formes: string[];
  /** Immatriculée hors de Russie. */
  etrangere: boolean;
  pays: string | null;
  paysFiable: boolean;
  nbHomologations: number;
  produits: string[];
}

interface FichierRussie {
  meta: {
    source: string;
    url: string;
    miroir: string;
    edition: string | null;
    attribution: string;
    genere: string;
    nbPages: number;
    nbEntrees: number;
    nbSocietes: number;
    nbRusses: number;
    nbEtrangeres: number;
    nbSansSociete: number;
    parPays: [string, number][];
    avertissement: string;
  };
  societes: SocieteRusse[];
}

const FICHIER = russieFile as unknown as FichierRussie;

export const META_RUSSIE = FICHIER.meta;
export const SOCIETES_CATALOGUE_RU: SocieteRusse[] = FICHIER.societes;

/** Sociétés immatriculées en Russie — le gisement que l'outil ne voyait pas. */
export const PRODUCTEURS_RUSSES: SocieteRusse[] = SOCIETES_CATALOGUE_RU.filter(
  (s) => s.pays === "Russie"
);

/**
 * Sociétés étrangères homologuées en Russie.
 *
 * Elles ne sont pas un sous-produit : le catalogue russe est un registre
 * ouvert de plus, et comme tout registre ouvert il nomme des fabricants du
 * monde entier. C'est ainsi qu'on y trouve des sociétés indiennes et
 * chinoises que l'index marocain ignore.
 */
export const ETRANGERES_EN_RUSSIE: SocieteRusse[] = SOCIETES_CATALOGUE_RU.filter(
  (s) => s.etrangere
);

// ── Rapprochement avec l'index ONSSA ────────────────────────────────────────

const INDEX_ONSSA = new IndexNoms(FOURNISSEURS.map((f) => ({ nom: f.nom, valeur: f.nom })));

export interface SocieteRusseSituee extends SocieteRusse {
  /** Fournisseur ONSSA correspondant, uniquement sur un nom latin vérifié. */
  fournisseurOnssa: string | null;
}

/**
 * ⚠️ Le rapprochement ne s'essaie QUE sur `identifie`. Chercher « Avgust » ou
 * « Yarilo » dans l'index marocain reviendrait à comparer une translittération
 * approximative à une raison sociale : le genre de rapprochement qui produit
 * de faux fournisseurs, et l'outil n'en fait pas.
 */
function situer(s: SocieteRusse): SocieteRusseSituee {
  return {
    ...s,
    fournisseurOnssa: s.identifie ? INDEX_ONSSA.exact(s.latin) : null,
  };
}

export const CATALOGUE_RU_SITUE: SocieteRusseSituee[] = SOCIETES_CATALOGUE_RU.map(situer);

/** Sociétés du catalogue russe déjà connues de l'index marocain. */
export const RU_DEJA_CONNUES = CATALOGUE_RU_SITUE.filter((s) => s.fournisseurOnssa);

export const STATS_RUSSIE = {
  edition: META_RUSSIE.edition,
  nbEntrees: META_RUSSIE.nbEntrees,
  nbSocietes: META_RUSSIE.nbSocietes,
  nbRusses: PRODUCTEURS_RUSSES.length,
  nbEtrangeres: ETRANGERES_EN_RUSSIE.length,
  nbIdentifiees: SOCIETES_CATALOGUE_RU.filter((s) => s.identifie).length,
  nbDejaConnues: RU_DEJA_CONNUES.length,
  parPays: META_RUSSIE.parPays,
  attribution: META_RUSSIE.attribution,
  miroir: META_RUSSIE.miroir,
  avertissement: META_RUSSIE.avertissement,
};
