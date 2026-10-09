import { MATIERES, getMatiere } from "./data";
import { detailRisque, niveauRisque } from "./logic";
import type { MatiereActive, NiveauRisque } from "./types";

// ────────────────────────────────────────────────────────────────────────────
// SUBSTITUTION — par quoi remplacer une matière active menacée
//
// L'outil savait dire qu'une molécule est en danger. Il ne disait pas par quoi
// la remplacer, sinon sur la fiche de cette molécule prise une par une.
//
// ⚠️ POURQUOI LA VERSION PRÉCÉDENTE NE TROUVAIT RIEN.
// Elle exigeait **deux cibles communes**. Or la colonne « cible » de l'index
// ONSSA est inégalement remplie : beaucoup de matières n'en portent qu'une, et
// certaines aucune. Résultat mesuré : 49 des 80 matières à risque ≥ 55 ne
// recevaient aucune proposition — dont l'alpha-cyperméthrine et l'imidaclopride,
// les deux plus critiques du portefeuille.
//
// La comparaison se fait donc sur trois plans, du plus précis au plus large, et
// le premier qui donne un recouvrement l'emporte :
//   1. cibles traitées   — l'organisme nuisible, ce qui compte vraiment
//   2. usages homologués — à défaut de cible renseignée
//   3. cultures couvertes — dernier filet
//
// ⚠️ Un remplaçant doit être STRICTEMENT moins menacé que le remplacé, et pas
// seulement sous un seuil : remplacer une molécule à 100 par une à 74 n'est pas
// une substitution, c'est un report de problème.
// ────────────────────────────────────────────────────────────────────────────

/** Sur quel plan le recouvrement a été établi. */
export type BaseComparaison = "cibles" | "usages" | "cultures";

export interface Alternative {
  id: string;
  nom: string;
  molecule: string;
  categorie: string | null;
  risque: NiveauRisque | null;
  scoreRisque: number | null;
  /** Plan sur lequel le recouvrement a été trouvé. */
  base: BaseComparaison;
  /** Nombre d'éléments communs sur ce plan. */
  recouvrement: number;
  nbHomologations: number;
  nbDetenteurs: number;
  /**
   * Le remplaçant appartient-il à la même famille chimique que le remplacé ?
   *
   * Remplacer un pyréthrinoïde par un autre pyréthrinoïde reste une
   * substitution recevable, mais elle ne diversifie ni le mode d'action ni
   * l'exposition réglementaire : si la famille est sous pression, le
   * remplaçant suivra. À dire, pas à cacher.
   */
  memeFamille: boolean;
  /** Ce qui justifie la proposition, en clair. */
  motif: string;
}

const LIBELLE_BASE: Record<BaseComparaison, string> = {
  cibles: "cible(s) en commun",
  usages: "usage(s) en commun",
  cultures: "culture(s) en commun",
};

/**
 * Famille de la molécule, sels et variantes réunis.
 *
 * L'index nomme séparément « Glyphosate », « Glyphosate -sel
 * d'isopropylamine », et cinq formes de cuivre. Proposés côte à côte, ils
 * occupent cinq lignes pour une seule réponse agronomique. Le séparateur est
 * toujours une espace suivie d'un tiret — « Alpha-cyperméthrine » n'en a pas,
 * et reste donc intacte.
 *
 * L'index écrit aussi une même substance de plusieurs façons : accents et
 * finales (« Dimethomorph » / « Diméthomorphe »), ou en anglais (« Paraffin
 * oil » / « Huile minérale paraffinique »). La clé ignore accents, casse,
 * ponctuation et « e » final ; les équivalences de langue passent par une
 * table EXPLICITE — jamais de rapprochement flou entre deux substances.
 */
const SYNONYMES: Record<string, string> = {
  paraffinoil: "huiledeparaffin",
  huilemineraleparaffiniqu: "huiledeparaffin",
  carboxylicacidspotassiumsalts: "selsdepotassiumdacidegras",
  acidegrassousformedeselsdepotassium: "selsdepotassiumdacidegras",
  gibberellicacid: "acidegibberelliqu",
  naphthaleneaceticacid: "acidealphanaphtylacetiqu",
  naphthaleneacetamid: "alphanaphtylacetamid",
  "6benzyladenin": "benzyladenin",
  mesosulfuronmethyl: "mesosulfuron",
  iodosulfuromethylsodium: "iodosulfuronmethylsodium",
};

function famille(molecule: string): string {
  const cle = molecule
    .split(/\s+-/)[0]
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .replace(/e$/, "");
  return SYNONYMES[cle] ?? cle;
}

function communs(a: string[], b: Set<string>): number {
  let n = 0;
  for (const x of a) if (b.has(x)) n++;
  return n;
}

/**
 * Matières actives pouvant remplacer celle-ci, les plus proches d'abord.
 *
 * Le remplaçant doit partager la même catégorie ONSSA — un fongicide ne
 * remplace pas un herbicide — et couvrir au moins un élément commun.
 */
export function alternatives(maId: string, limite = 5): Alternative[] {
  const ma = getMatiere(maId);
  if (!ma) return [];

  const r = detailRisque(ma);
  const scoreRemplace = r?.score ?? null;
  const familleChimique = ma.fiche?.famille ?? null;

  const cibles = new Set(ma.cibles);
  const usages = new Set(ma.usages);
  const cultures = new Set(ma.cultures);

  const out: Alternative[] = [];
  for (const m of MATIERES) {
    if (m.id === ma.id) continue;
    if (m.categorie !== ma.categorie) continue;
    // Une variante de concentration de la même molécule n'est pas une
    // alternative : c'est le même problème réglementaire.
    if (famille(m.molecule) === famille(ma.molecule)) continue;

    // Retirée en France : l'ONSSA suivra, la proposer serait un contresens.
    if (m.anses?.statut === "retirée") continue;

    const rc = detailRisque(m);
    const score = rc?.score ?? null;
    // Strictement mieux que le remplacé, et pas elle-même signalée.
    if (score !== null) {
      if (score >= 55) continue;
      if (scoreRemplace !== null && score >= scoreRemplace) continue;
    }

    const nc = communs(m.cibles, cibles);
    const nu = communs(m.usages, usages);
    const nk = communs(m.cultures, cultures);

    let base: BaseComparaison;
    let recouvrement: number;
    if (nc > 0) {
      base = "cibles";
      recouvrement = nc;
    } else if (nu > 0) {
      base = "usages";
      recouvrement = nu;
    } else if (nk > 0) {
      base = "cultures";
      recouvrement = nk;
    } else {
      continue;
    }

    out.push({
      id: m.id,
      nom: m.nom,
      molecule: m.molecule,
      categorie: m.categorie,
      risque: rc?.niveau ?? (score === null ? null : niveauRisque(score)),
      scoreRisque: score,
      base,
      recouvrement,
      nbHomologations: m.nbHomologations,
      nbDetenteurs: m.detenteurs.length,
      memeFamille: Boolean(
        familleChimique && m.fiche?.famille && m.fiche.famille === familleChimique
      ),
      motif: `${recouvrement} ${LIBELLE_BASE[base]} · ${m.nbHomologations} AMM · ${m.detenteurs.length} détenteur(s)`,
    });
  }

  // Un même remplaçant existe souvent à plusieurs concentrations à l'index.
  // Sans dédoublonnage, la liste affichait « Cyperméthrine, Cyperméthrine ».
  const rang: Record<BaseComparaison, number> = { cibles: 0, usages: 1, cultures: 2 };
  out.sort(
    (a, b) =>
      rang[a.base] - rang[b.base] ||
      b.recouvrement - a.recouvrement ||
      Number(a.memeFamille) - Number(b.memeFamille) ||
      b.nbHomologations - a.nbHomologations ||
      (a.scoreRisque ?? 999) - (b.scoreRisque ?? 999)
  );

  // Une famille ne compte qu'une fois, représentée par sa variante la plus
  // disponible au Maroc — c'est celle-là qu'on ira chercher.
  const vues = new Set<string>();
  const uniques: Alternative[] = [];
  for (const a of out) {
    const f = famille(a.molecule);
    if (vues.has(f)) continue;
    vues.add(f);
    uniques.push(a);
    if (uniques.length >= limite) break;
  }
  return uniques;
}

// ── Vue d'ensemble : ce qu'il faut remplacer, et par quoi ───────────────────

export interface LigneSubstitution {
  matiere: MatiereActive;
  score: number;
  niveau: NiveauRisque;
  /** Produits du détenteur courant portant cette matière active. */
  nbProduits: number;
  nbUsages: number;
  alternatives: Alternative[];
}

/**
 * Toutes les matières actives menacées d'un portefeuille, avec leurs
 * remplaçants. C'est la vue qui manquait : le risque et la sortie de risque
 * dans le même écran, sans avoir à ouvrir chaque molécule.
 */
export function planSubstitution(matieres: MatiereActive[], seuil = 55): LigneSubstitution[] {
  const out: LigneSubstitution[] = [];
  for (const ma of matieres) {
    const r = detailRisque(ma);
    if (!r || r.score < seuil) continue;
    out.push({
      matiere: ma,
      score: r.score,
      niveau: r.niveau,
      nbProduits: ma.produitsDetenteur.length,
      nbUsages: ma.produitsDetenteur.reduce((s, p) => s + p.usages.length, 0),
      alternatives: alternatives(ma.id),
    });
  }
  return out.sort((a, b) => b.score - a.score || b.nbUsages - a.nbUsages);
}
