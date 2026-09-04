import russieFile from "../data/russie.json";
import { apparierApvma } from "./apvma";
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
  /** Matières actives de l'index marocain, sous leur nom ISO anglais. */
  matieres: string[];
  /** Les mêmes telles que le catalogue les écrit — pour pouvoir vérifier. */
  matieresRusses: string[];
  produits: string[];
}

export interface MatiereRusse {
  /** Nom ISO anglais — la clé commune à tous les registres étrangers. */
  iso: string;
  /** En-têtes du catalogue qui correspondent, sels et formes compris. */
  nomsRusses: string[];
  nbHomologations: number;
  societes: string[];
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
    nbMatieres: number;
    nbMatieresIndex: number;
    avertissement: string;
  };
  societes: SocieteRusse[];
  matieres: MatiereRusse[];
}

const FICHIER = russieFile as unknown as FichierRussie;

export const META_RUSSIE = FICHIER.meta;
export const SOCIETES_CATALOGUE_RU: SocieteRusse[] = FICHIER.societes;
export const MATIERES_RUSSES: MatiereRusse[] = FICHIER.matieres;

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

// ── Le pont matière active -> détenteurs russes ─────────────────────────────
//
// C'est ce qui manquait : le catalogue liait des sociétés à des produits, et
// l'outil raisonne par matière active. Le pont passe par le nom ISO anglais,
// comme pour la Chine et la Turquie — une seule règle de rapprochement dans
// tout l'outil, `apparierApvma`, jamais réimplémentée ici.
//
// ⚠️ CÔTÉ RUSSE, LE RAPPROCHEMENT EST FAIT À L'IMPORT, par égalité de clé
// phonétique et non par similarité : le russe transcrit la nomenclature
// chimique de façon régulière (к↔c, ц↔ts, х↔kh/ch, ф↔f/ph, г↔h, le -e final
// tombe), ce qui permet une réduction déterministe des deux côtés. Une
// collision entre deux noms ISO ferait échouer l'import plutôt que produire un
// rapprochement douteux.

const PAR_ISO = new Map(MATIERES_RUSSES.map((m) => [m.iso, m]));
const PAR_NOM = new Map(SOCIETES_CATALOGUE_RU.map((s) => [s.nom, s]));

/** Entrée du catalogue russe correspondant à une matière active de l'index. */
export function matiereRusse(nomONSSA: string): MatiereRusse | null {
  const c = apparierApvma(nomONSSA);
  return c ? PAR_ISO.get(c.nom) ?? null : null;
}

export interface FabricantsRusses {
  matiere: MatiereRusse;
  /** Détenteurs immatriculés en Russie — le gisement propre au pays. */
  russes: SocieteRusse[];
  /** Sociétés étrangères homologuées en Russie sur la même matière active. */
  etrangers: SocieteRusse[];
}

/**
 * Qui détient une homologation russe sur cette matière active.
 *
 * Les deux listes sont séparées et le restent : une société russe est une
 * piste de sourcing nouvelle, une société étrangère homologuée en Russie est
 * le plus souvent déjà connue par ailleurs — et c'est justement ce qui rend sa
 * présence ici informative plutôt que redondante.
 */
export function fabricantsRusses(nomONSSA: string): FabricantsRusses | null {
  const m = matiereRusse(nomONSSA);
  if (!m) return null;
  const russes: SocieteRusse[] = [];
  const etrangers: SocieteRusse[] = [];
  for (const nom of m.societes) {
    const s = PAR_NOM.get(nom);
    if (!s) continue;
    (s.etrangere ? etrangers : russes).push(s);
  }
  const parVolume = (a: SocieteRusse, b: SocieteRusse) =>
    b.matieres.length - a.matieres.length || b.nbHomologations - a.nbHomologations;
  russes.sort(parVolume);
  etrangers.sort(parVolume);
  return { matiere: m, russes, etrangers };
}

/** Matières actives de l'index marocain présentes au catalogue russe. */
export const NB_MATIERES_COUVERTES = MATIERES_RUSSES.length;
