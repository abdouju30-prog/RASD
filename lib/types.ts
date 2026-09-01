// ────────────────────────────────────────────────────────────────────────────
// Deux origines de données, à ne jamais confondre :
//
//  • IMPORTÉ  — index ONSSA + portefeuille détenteur, extraits de l'Excel
//               client par scripts/import_onssa.py. Fiable, daté, reproductible.
//  • EXPERTISE — statuts réglementaires UE / voisins, drapeaux de danger.
//               Saisis à la main dans lib/reglementaire.ts, à valider contre la
//               EU Pesticides Database avant tout usage opérationnel.
//
// Le chiffre d'affaires n'est PAS dans la source : il est optionnel partout et
// se renseigne dans data/ca.json. Sans lui, l'exposition est mesurée en
// produits / usages / homologations.
// ────────────────────────────────────────────────────────────────────────────

export type StatutUE = "approuvée" | "en_réexamen" | "non_renouvelée" | "retirée" | "inconnu";
export type StatutMaroc = "homologuée" | "en_cours" | "non_homologuée" | "retirée";
export type NiveauRisque = "faible" | "modéré" | "élevé" | "critique";
export type StatutVoisin = "autorisée" | "restreinte" | "interdite";

// ── Couche IMPORTÉE ─────────────────────────────────────────────────────────

export interface Fournisseur {
  id: string;
  nom: string;
  pays: string | null;
  paysInfere: boolean;
  paysFiable: boolean; // false = déduit d'un suffixe juridique seul
  coutFaible: boolean; // pays de sourcing générique compétitif
  multinationale: boolean;
  nbLignesMaroc: number;
  nbMatieresActives: number;
}

/** Agrégat marché d'une matière active, tel que présent à l'index ONSSA. */
export interface MatiereMarche {
  id: string;
  nom: string; // « Abamectine(1,8%) »
  molecule: string; // « Abamectine »
  categorie: string | null;
  detenteurs: string[];
  fournisseurs: string[];
  usages: string[]; // « Tomate / Thrips »
  cultures: string[];
  cibles: string[];
  produits: string[];
  nbHomologations: number;
  /** « usage :: dose :: DAR » — précédent réglementaire opposable à l'ONSSA. */
  referentielDoses: string[];
}

export interface UsageProduit {
  usage: string | null;
  culture: string | null;
  cible: string | null;
  dose: string | null;
  dar: string | null;
  nbAppl: string | null;
}

export interface ProduitPortefeuille {
  id: string;
  nomCommercial: string;
  categorie: string | null;
  formulation: string | null;
  tox: string | null; // tableau toxicologique ONSSA (A/B/C/D)
  amm: string | null;
  expiration: string | null; // ISO
  matieresActives: string[]; // noms complets
  matieresActivesIds: string[];
  fournisseurs: string[];
  usages: UsageProduit[];
  caAnnuel?: number | null; // MAD — optionnel, hors source
}

export interface IndexONSSA {
  meta: {
    source: string;
    genere: string;
    detenteur: string;
    nbLignesIndex: number;
    nbProduitsIndex: number;
    nbDetenteurs: number;
    avertissement: string;
  };
  fournisseurs: Fournisseur[];
  matieres: MatiereMarche[];
  portefeuille: ProduitPortefeuille[];
}

// ── Couche EXPERTISE ────────────────────────────────────────────────────────

/** Fiche réglementaire saisie à la main, rattachée à une molécule. */
export interface FicheReglementaire {
  molecule: string; // clé de rattachement, ex. « Abamectine »
  famille: string;
  modeAction: string;
  statutUE: StatutUE;
  echeanceUE?: string;
  statutMaroc: StatutMaroc;
  statutVoisins: { pays: string; statut: StatutVoisin }[];
  drapeaux: string[];
  note?: string;
  /** Source et date de la vérification — vide = non vérifié. */
  verifie?: { source: string; date: string };
}

/** Matière active vue par l'application : marché importé + fiche d'expertise. */
export interface MatiereActive extends MatiereMarche {
  fiche: FicheReglementaire | null;
  produitsDetenteur: ProduitPortefeuille[];
}

// ── Sourcing / prospection ──────────────────────────────────────────────────

export type VoieReglementaire =
  | "me_too" // M.A. déjà homologuée au Maroc : dossier allégé par référence
  | "nouvelle_substance"; // absente de l'index : dossier complet

export interface CandidatSourcing {
  id: string;
  nom: string;
  molecule: string;
  categorie: string | null;
  cibles: string[];
  cultures: string[];
  usages: string[];
  detenteurs: string[];
  nbDetenteurs: number;
  nbUsages: number;
  nbCultures: number;
  nbHomologations: number;
  fournisseurs: Fournisseur[];
  fournisseursCoutFaible: Fournisseur[];
  paysSourcing: string[];
  voie: VoieReglementaire;
  /** Détail du score, affiché tel quel dans l'UI pour être auditable. */
  score: number;
  facteurs: { libelle: string; points: number }[];
  /** Risque réglementaire de la molécule, si une fiche existe. */
  risque: NiveauRisque | null;
  scoreRisque: number | null;
}

// ── Dossiers ────────────────────────────────────────────────────────────────

export type StatutPiece = "manquante" | "en_cours" | "présente" | "validée";

export interface PieceDossier {
  rubrique: string;
  statut: StatutPiece;
  poids: number;
  /** Qui doit fournir la pièce. */
  responsable?: "fournisseur" | "phytobeht" | "laboratoire";
  /** Contenu pré-rempli déduit de l'index (précédent réglementaire). */
  prerempli?: string;
  source?: string;
}

export type TypeDossier = "nouvelle_homologation" | "renouvellement" | "extension_usage";
export type StatutDossier =
  | "brouillon"
  | "en_constitution"
  | "déposé"
  | "en_instruction"
  | "accordé"
  | "refusé";

export interface Dossier {
  id: string;
  produitNom: string;
  matiereActiveId: string;
  type: TypeDossier;
  statut: StatutDossier;
  pieces: PieceDossier[];
  dateCible?: string;
  origine?: string;
}

/** Dossier généré à la volée depuis une matière active + un fournisseur. */
export interface DossierGenere extends Dossier {
  voie: VoieReglementaire;
  fournisseur: Fournisseur | null;
  usagesVises: { usage: string; dose: string; dar: string; precedent: string }[];
  objections: string[];
  aFournirParFournisseur: string[];
}

export interface Alternative {
  nom: string;
  molecule: string;
  categorie: string | null;
  risque: NiveauRisque | null;
  rationale: string;
}
