import apvmaFile from "../data/apvma.json";
import type { StatutAnses } from "./types";

// ────────────────────────────────────────────────────────────────────────────
// APVMA — registre PUBCRIS (Australie)
//
// À quoi ça sert, et à quoi ça ne sert PAS.
//
// L'APVMA ne gouverne pas l'ONSSA. Contrairement à l'ANSES, son avis n'annonce
// rien du statut marocain, et rien ici n'entre dans le score de risque.
//
// Elle apporte ce qui manquait : un point de comparaison hors référentiel
// européen. L'Australie est un régulateur exigeant, sur un climat et des
// cultures plus proches du Maroc que ceux de l'Europe du Nord. Confronter les
// deux statuts produit un argument, dans un sens comme dans l'autre.
//
// ⚠️ LIMITE STRUCTURELLE de la source, à ne jamais perdre de vue :
// PUBCRIS est un registre de ce qui EST enregistré, pas un historique. Sur
// 18 658 produits, 36 seulement portent une date d'expiration passée. Donc
// « absente d'Australie » ne veut PAS dire « retirée d'Australie » : la
// molécule peut n'y avoir jamais été homologuée. Seul « autorisée » est une
// information solide, et c'est justement celle qui porte l'argument utile.
// ────────────────────────────────────────────────────────────────────────────

export type StatutApvma = "autorisée" | "absente" | "vétérinaire seulement";

/** Société détenant une homologation australienne. Pays inféré du nom. */
export interface SocieteApvma {
  nom: string;
  pays: string | null;
  paysFiable: boolean;
  coutFaible: boolean;
  multinationale: boolean;
  /** Entité australienne d'un groupe étranger — « SHARDA AUSTRALIA PTY LTD ». */
  filialeLocale: boolean;
  nbProduits: number;
}

export interface ConstituantApvma {
  id: string;
  code: string;
  nom: string;
  famille: string | null;
  statut: StatutApvma;
  nbProduitsAgricoles: number;
  nbProduitsEchus: number;
  matiereActiveApprouvee: boolean;
  derniereExpiration: string | null;
  /**
   * Sociétés détenant une homologation agricole australienne active sur ce
   * constituant. C'est le seul registre ouvert de l'outil qui nomme le
   * détenteur produit par produit — donc la seule source de fournisseurs
   * qu'on n'a pas déjà par l'index marocain. Exploité par lib/pistes.ts.
   */
  societes: SocieteApvma[];
}

interface FichierApvma {
  meta: {
    source: string;
    url: string;
    licence: string;
    attribution: string;
    majDonnees: string | null;
    genere: string;
    nbConstituants: number;
    nbProduitsAgricoles: number;
    avertissement: string;
  };
  constituants: ConstituantApvma[];
}

const APVMA = apvmaFile as unknown as FichierApvma;

export const META_APVMA = APVMA.meta;
export const CONSTITUANTS_APVMA = APVMA.constituants;

function norm(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** « Glyphosate -sel d'isopropylamine(360 g/l) » -> « glyphosate ». */
function moleculeNue(nom: string): string {
  const base = nom.split(/[([]/)[0];
  const sansSel = base.split(/\s+-\s*(?:sel|sels)\b/i)[0];
  return norm(sansSel.replace(/\s*-\s*$/, ""));
}

function poids(c: ConstituantApvma): number {
  return c.nbProduitsAgricoles + c.nbProduitsEchus;
}

/**
 * Alias explicites : nom ONSSA -> nom exact du constituant PUBCRIS.
 *
 * L'APVMA nomme les substances minérales par périphrase (« COPPER PRESENT AS
 * COPPER OXYCHLORIDE »), là où l'ONSSA écrit « Cuivre - oxychlorure de
 * cuivre ». Aucune règle de normalisation ne rapproche les deux.
 *
 * Ces cas se traitent par table plutôt que par appariement approximatif, et
 * c'est délibéré : « METSULFURON-METHYL » contient la chaîne « SULFUR » sans
 * avoir le moindre rapport avec le soufre. Un rapprochement flou produirait
 * ici des erreurs de fond, sur un sujet réglementaire.
 */
const ALIAS: Record<string, string> = {
  "cuivre oxychlorure de cuivre": "COPPER PRESENT AS COPPER OXYCHLORIDE",
  "cuivre sulfate de cuivre": "COPPER PRESENT AS COPPER SULFATE PENTAHYDRATE",
  "cuivre hydroxyde de cuivre": "COPPER PRESENT AS CUPRIC HYDROXIDE",
  soufre: "SULPHUR",
  "huile minerale paraffinique": "PARAFFIN OIL",
  "huile de paraffine": "PARAFFIN OIL",
};

// Index d'appariement. En cas de collision, la ligne portant des produits
// agricoles l'emporte : c'est elle qui décrit le marché réel.
const PAR_CLE = new Map<string, ConstituantApvma>();
const PAR_ID = new Map<string, ConstituantApvma>();
for (const c of CONSTITUANTS_APVMA) {
  PAR_ID.set(c.id, c);
  const cle = norm(c.nom);
  if (!cle) continue;
  const actuel = PAR_CLE.get(cle);
  if (!actuel || poids(c) > poids(actuel)) PAR_CLE.set(cle, c);
}

export function constituantParId(id: string): ConstituantApvma | undefined {
  return PAR_ID.get(id);
}

/** Constituant PUBCRIS par nom ISO anglais, ou null. */
export function constituantParNom(nom: string): ConstituantApvma | null {
  const c = PAR_CLE.get(norm(nom));
  return c ?? null;
}

/**
 * Apparie un nom de matière active ONSSA (français, avec teneur) à un
 * constituant APVMA (nom ISO anglais). Même stratégie que pour E-Phy :
 * exact, molécule nue, préfixe, puis tolérance y/i en dernier recours.
 */
export function apparierApvma(nomONSSA: string): ConstituantApvma | null {
  const complet = norm(nomONSSA.split(/[([]/)[0]);

  // Les alias priment : ils traitent les cas qu'aucune règle ne rapproche.
  const alias = ALIAS[complet];
  if (alias) {
    const c = PAR_CLE.get(norm(alias));
    if (c) return c;
  }

  const exact = PAR_CLE.get(complet);
  if (exact) return exact;

  const nue = moleculeNue(nomONSSA);
  if (nue && nue !== complet) {
    const a2 = ALIAS[nue];
    if (a2) {
      const c = PAR_CLE.get(norm(a2));
      if (c) return c;
    }
    const m = PAR_CLE.get(nue);
    if (m) return m;
  }

  const cible = nue || complet;
  if (cible.length < 6) return null;

  const candidats: { cle: string; c: ConstituantApvma }[] = [];
  for (const [cle, c] of PAR_CLE) {
    if (cle.length < 6) continue;
    if (cible.startsWith(cle) || cle.startsWith(cible)) candidats.push({ cle, c });
  }
  if (candidats.length === 0) {
    const pivot = cible.replace(/y/g, "i");
    for (const [cle, c] of PAR_CLE) {
      if (cle.length < 6) continue;
      const k = cle.replace(/y/g, "i");
      if (pivot.startsWith(k) || k.startsWith(pivot)) candidats.push({ cle, c });
    }
  }
  if (candidats.length === 0) return null;

  candidats.sort((a, b) => {
    const pa = poids(a.c) > 0 ? 1 : 0;
    const pb = poids(b.c) > 0 ? 1 : 0;
    if (pa !== pb) return pb - pa;
    return b.cle.length - a.cle.length;
  });
  return candidats[0].c;
}

// ── Convergence France / Australie ──────────────────────────────────────────

export type Convergence =
  | "divergence" // retirée en France, toujours autorisée en Australie
  | "convergence" // dégradée des deux côtés
  | "double_confirmation" // autorisée des deux côtés
  | "indéterminée";

export interface LectureCroisee {
  constituant: ConstituantApvma | null;
  convergence: Convergence;
  titre: string;
  lecture: string;
}

/**
 * Confronte le statut français au statut australien.
 *
 * Le cas qui vaut le détour est la DIVERGENCE : une molécule retirée en France
 * mais toujours largement utilisée en Australie. Elle donne un argument
 * défendable devant l'ONSSA — à instruire, jamais à invoquer tel quel.
 */
export function lectureCroisee(
  nomONSSA: string,
  statutFrance: StatutAnses | null | undefined
): LectureCroisee {
  const c = apparierApvma(nomONSSA);

  if (!c) {
    return {
      constituant: null,
      convergence: "indéterminée",
      titre: "Non appariée au registre australien",
      lecture:
        "Aucun constituant PUBCRIS n'a pu être rattaché à cette matière active. Pas de recoupement possible.",
    };
  }

  const degradeeFrance = statutFrance === "retirée" || statutFrance === "en_retrait";
  const autoriseeAu = c.statut === "autorisée";

  if (degradeeFrance && autoriseeAu) {
    return {
      constituant: c,
      convergence: "divergence",
      titre: "Divergence France / Australie",
      lecture: `Plus autorisée en France, mais ${c.nbProduitsAgricoles} produit(s) agricole(s) restent enregistrés en Australie. Le motif du retrait européen n'est peut-être pas transposable au contexte marocain — climat, cultures, pression sur les nappes. C'est un argument à instruire pour défendre un maintien devant l'ONSSA, pas une conclusion.`,
    };
  }

  if (degradeeFrance && !autoriseeAu) {
    return {
      constituant: c,
      convergence: "convergence",
      titre: "Aucun contre-argument australien",
      lecture:
        c.statut === "vétérinaire seulement"
          ? "Plus autorisée en France. En Australie, la substance n'existe qu'en usage vétérinaire — aucun appui pour un maintien phytosanitaire."
          : "Plus autorisée en France, et aucun produit agricole enregistré en Australie. Attention : PUBCRIS ne conserve pas l'historique, cette absence peut signifier « jamais homologuée » plutôt que « retirée ». Aucun contre-argument, mais pas une preuve de retrait consensuel.",
    };
  }

  if (autoriseeAu) {
    return {
      constituant: c,
      convergence: "double_confirmation",
      titre: "Autorisée en Australie",
      lecture: `${c.nbProduitsAgricoles} produit(s) agricole(s) enregistrés. Statut français non dégradé : les deux référentiels concordent.`,
    };
  }

  return {
    constituant: c,
    convergence: "indéterminée",
    titre:
      c.statut === "vétérinaire seulement"
        ? "Usage vétérinaire seulement en Australie"
        : "Absente de l'agriculture australienne",
    lecture:
      "Aucun produit agricole enregistré en Australie aujourd'hui. PUBCRIS ne conservant pas l'historique, on ne peut pas distinguer un retrait d'une absence d'homologation.",
  };
}

/**
 * Fraîcheur du registre australien. L'APVMA republie chaque semaine ; au-delà
 * de trois publications manquées, le statut affiché peut ne plus refléter la
 * réalité et l'outil doit le dire.
 */
export function fraicheurApvma(ref = new Date()): {
  etat: "à jour" | "à rafraîchir" | "périmée" | "inconnue";
  jours: number | null;
  maj: string | null;
} {
  const maj = META_APVMA.majDonnees;
  if (!maj) return { etat: "inconnue", jours: null, maj: null };
  const d = new Date(maj);
  if (Number.isNaN(d.getTime())) return { etat: "inconnue", jours: null, maj };
  const jours = Math.floor((ref.getTime() - d.getTime()) / 86_400_000);
  return {
    etat: jours <= 10 ? "à jour" : jours <= 24 ? "à rafraîchir" : "périmée",
    jours,
    maj,
  };
}

export const STATS_APVMA = {
  nbConstituants: CONSTITUANTS_APVMA.length,
  nbAutorisees: CONSTITUANTS_APVMA.filter((c) => c.statut === "autorisée").length,
  maj: META_APVMA.majDonnees,
  attribution: META_APVMA.attribution,
  licence: META_APVMA.licence,
};
