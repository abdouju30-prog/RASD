import ephyFile from "../data/ephy.json";
import type { FicheAnses, StatutAnses } from "./types";

// ────────────────────────────────────────────────────────────────────────────
// CONNECTEUR E-PHY (Anses) — statut français d'une matière active.
//
// L'ONSSA s'aligne sur l'ANSES : le statut français anticipe le statut
// marocain. Ce module apparie les matières actives de l'index ONSSA (en
// français, avec teneur : « Difénoconazole(250 g/l) ») aux substances du
// catalogue E-Phy (nom ISO anglais + variantes françaises).
//
// Le statut retenu croise deux informations qui ne disent pas la même chose :
//   • l'inscription au règlement  — la substance peut-elle encore être
//     autorisée en France ?
//   • l'état du parc de produits  — reste-t-il des produits autorisés ?
//
// Une substance inscrite dont plus aucun produit n'est autorisé signale un
// retrait commercial, pas un retrait réglementaire : le module les distingue.
// ────────────────────────────────────────────────────────────────────────────

export interface SubstanceEphy {
  id: string;
  nom: string;
  cas: string | null;
  etat: string | null; // INSCRITE | NON_INSCRITE | AUTRE_CAS
  variantes: string[];
  nbProduitsAutorises: number;
  nbProduitsRetires: number;
  dernierRetrait: string | null;
}

export interface ChangementEphy {
  id: string;
  nom: string;
  type: "statut" | "nouvelle" | "disparue";
  avant: string | null;
  apres: string | null;
  dernierRetrait?: string | null;
}

interface FichierEphy {
  meta: {
    source: string;
    url: string;
    licence: string;
    attribution: string;
    majDonnees: string | null;
    genere: string;
    nbSubstances: number;
    nbProduitsPPP: number;
    avertissement: string;
  };
  diff?: {
    premiereImport: boolean;
    nbChangements: number;
    dateComparaison?: string | null;
    changements: ChangementEphy[];
  };
  substances: SubstanceEphy[];
}

const EPHY = ephyFile as unknown as FichierEphy;

export const META_EPHY = EPHY.meta;
export const SUBSTANCES_EPHY = EPHY.substances;

import { normaliser as norm } from "./texte";

/**
 * Retire la teneur et les qualificatifs de sel pour ne garder que la molécule.
 * « Glyphosate -sel d'isopropylamine(360 g/l) » -> « glyphosate »
 * « Cuivre - oxychlorure de cuivre(50%) »       -> « cuivre »
 */
function moleculeNue(nom: string): string {
  const base = nom.split(/[([]/)[0];
  const sansSel = base.split(/\s+-\s*(?:sel|sels)\b/i)[0];
  return norm(sansSel.replace(/\s*-\s*$/, ""));
}

function nbProduits(s: SubstanceEphy): number {
  return s.nbProduitsAutorises + s.nbProduitsRetires;
}

// Index des clés d'appariement -> substance.
//
// E-Phy contient parfois plusieurs lignes pour une même molécule, dont des
// doublons administratifs sans aucun produit rattaché (« Fosetyl-Al » à côté
// de « Fosetyl », qui porte les 89 produits réels). En cas de collision, on
// retient la ligne qui porte des produits : c'est elle qui décrit le marché.
const PAR_CLE = new Map<string, SubstanceEphy>();
for (const s of SUBSTANCES_EPHY) {
  for (const c of [s.nom, ...s.variantes].map((x) => norm(x)).filter(Boolean)) {
    const actuel = PAR_CLE.get(c);
    if (!actuel || nbProduits(s) > nbProduits(actuel)) PAR_CLE.set(c, s);
  }
}

export interface Appariement {
  substance: SubstanceEphy;
  /** Comment la correspondance a été établie — affiché pour être vérifiable. */
  methode: "exact" | "molecule" | "prefixe";
}

/**
 * Apparie un nom de matière active ONSSA à une substance E-Phy.
 * Trois passes, de la plus sûre à la plus permissive. Rien de flou au-delà :
 * mieux vaut « inconnu » qu'un mauvais rattachement sur un sujet réglementaire.
 */
export function apparier(nomONSSA: string): Appariement | null {
  const complet = norm(nomONSSA.split(/[([]/)[0]);
  const exact = PAR_CLE.get(complet);
  if (exact) return { substance: exact, methode: "exact" };

  const nue = moleculeNue(nomONSSA);
  if (nue && nue !== complet) {
    const m = PAR_CLE.get(nue);
    if (m) return { substance: m, methode: "molecule" };
  }

  // Préfixe : « Fosétyl-Aluminium » vs la variante E-Phy « fosétyl d'aluminium ».
  // Exigence d'au moins 6 caractères pour éviter les collisions courtes.
  //
  // Le classement met la présence de produits AVANT la longueur de la clé :
  // sans cela, « Fosétyl-Aluminium » s'apparie à la ligne vide « Fosetyl-Al »
  // (clé plus longue) au lieu de « Fosetyl », qui porte les produits réels —
  // et la molécule ressort à tort comme sans produit autorisé en France.
  const cible = nue || complet;
  if (cible.length < 6) return null;

  const candidats: { cle: string; s: SubstanceEphy }[] = [];
  for (const [cle, s] of PAR_CLE) {
    if (cle.length < 6) continue;
    if (cible.startsWith(cle) || cle.startsWith(cible)) candidats.push({ cle, s });
  }

  // Dernier recours : tolérer les variantes d'orthographe y/i, fréquentes en
  // nomenclature chimique entre le français et l'ISO anglais — l'ONSSA écrit
  // « Pyrimicarbe », E-Phy « Pirimicarb ». Cette passe vient APRÈS les autres :
  // elle ne peut donc jamais supplanter un appariement exact.
  if (candidats.length === 0) {
    const pivot = cible.replace(/y/g, "i");
    for (const [cle, s] of PAR_CLE) {
      if (cle.length < 6) continue;
      const k = cle.replace(/y/g, "i");
      if (pivot.startsWith(k) || k.startsWith(pivot)) candidats.push({ cle, s });
    }
  }

  if (candidats.length === 0) return null;

  candidats.sort((a, b) => {
    const pa = nbProduits(a.s) > 0 ? 1 : 0;
    const pb = nbProduits(b.s) > 0 ? 1 : 0;
    if (pa !== pb) return pb - pa; // une ligne portant des produits d'abord
    return b.cle.length - a.cle.length; // puis la clé la plus spécifique
  });
  return { substance: candidats[0].s, methode: "prefixe" };
}

/** Traduit une substance E-Phy en statut ANSES exploitable par le radar. */
export function statutDe(s: SubstanceEphy): FicheAnses {
  const nonInscrite = s.etat === "NON_INSCRITE";
  const aucunProduit = s.nbProduitsAutorises === 0;
  const aEuDesProduits = s.nbProduitsRetires > 0;

  let statut: StatutAnses;
  let precision: string;

  if (nonInscrite) {
    statut = "retirée";
    precision = aucunProduit
      ? `Substance non inscrite au règlement et plus aucun produit autorisé en France${
          aEuDesProduits ? ` (${s.nbProduitsRetires} produits retirés)` : ""
        }.`
      : `Substance non inscrite au règlement, mais ${s.nbProduitsAutorises} produit(s) encore autorisé(s) — probable écoulement de stocks.`;
  } else if (aucunProduit && aEuDesProduits) {
    // Retrait commercial : la substance reste inscrite mais n'est plus portée
    // par aucun produit français. Signal réel, mais plus faible qu'un retrait
    // réglementaire — l'ONSSA ne suit pas mécaniquement un retrait commercial.
    statut = "en_retrait";
    precision = `Substance toujours inscrite au règlement, mais aucun produit autorisé en France : ${s.nbProduitsRetires} produit(s) retiré(s). Retrait commercial, pas réglementaire.`;
  } else if (s.nbProduitsAutorises > 0) {
    statut = "autorisée";
    precision = `${s.nbProduitsAutorises} produit(s) autorisé(s) en France${
      s.nbProduitsRetires ? `, ${s.nbProduitsRetires} retiré(s)` : ""
    }.`;
  } else {
    // Inscrite, aucun produit ni autorisé ni retiré : substance jamais mise sur
    // le marché français. Ne rien conclure.
    statut = "inconnu";
    precision = "Substance inscrite mais aucun produit phytopharmaceutique français rattaché.";
  }

  return {
    statut,
    dateRetrait: s.dernierRetrait ?? undefined,
    deduit: false,
    source: `${META_EPHY.source} (${META_EPHY.majDonnees ?? "date inconnue"}) — ${s.nom}${
      s.cas ? `, CAS ${s.cas}` : ""
    }. ${precision}`,
  };
}

/** Statut ANSES d'une matière active de l'index ONSSA, si appariable. */
export function ansesPour(nomONSSA: string): (FicheAnses & { methode: string; substance: string }) | null {
  const a = apparier(nomONSSA);
  if (!a) return null;
  return { ...statutDe(a.substance), methode: a.methode, substance: a.substance.nom };
}

export const STATS_EPHY = {
  nbSubstances: SUBSTANCES_EPHY.length,
  nbNonInscrites: SUBSTANCES_EPHY.filter((s) => s.etat === "NON_INSCRITE").length,
  nbInscrites: SUBSTANCES_EPHY.filter((s) => s.etat === "INSCRITE").length,
  maj: META_EPHY.majDonnees,
  attribution: META_EPHY.attribution,
};

/** Changements de statut relevés lors du dernier import. */
export const CHANGEMENTS_EPHY: ChangementEphy[] = EPHY.diff?.changements ?? [];
export const NB_CHANGEMENTS_EPHY = EPHY.diff?.nbChangements ?? 0;

// ── Fraîcheur des données ───────────────────────────────────────────────────
// L'Anses republie E-Phy chaque nuit de mardi à mercredi. Au-delà de deux
// publications manquées, l'outil doit le dire plutôt que d'afficher un statut
// périmé avec l'assurance d'une donnée à jour.

export type Fraicheur = "à jour" | "à rafraîchir" | "périmée" | "inconnue";

export function fraicheurEphy(ref = new Date()): {
  etat: Fraicheur;
  jours: number | null;
  maj: string | null;
} {
  const maj = META_EPHY.majDonnees;
  if (!maj) return { etat: "inconnue", jours: null, maj: null };
  const d = new Date(maj);
  if (Number.isNaN(d.getTime())) return { etat: "inconnue", jours: null, maj };
  const jours = Math.floor((ref.getTime() - d.getTime()) / 86_400_000);
  const etat: Fraicheur = jours <= 10 ? "à jour" : jours <= 21 ? "à rafraîchir" : "périmée";
  return { etat, jours, maj };
}
