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

/**
 * Statut ANSES (France, catalogue E-Phy).
 *
 * L'ONSSA s'aligne sur l'ANSES : le retrait d'une matière active en France
 * anticipe son retrait au Maroc. C'est donc le signal le plus prédictif dont
 * dispose l'outil — plus que le statut UE, qui est en amont et plus lent.
 */
export type StatutAnses = "autorisée" | "en_retrait" | "retirée" | "inconnu";

export interface FicheAnses {
  statut: StatutAnses;
  /** Date de la décision de retrait, si connue. */
  dateRetrait?: string;
  /** Fin de la période d'écoulement des stocks, si connue. */
  finEcoulement?: string;
  /**
   * true = statut déduit d'une règle, pas lu dans E-Phy.
   * Une substance non approuvée en UE ne peut être autorisée dans aucun État
   * membre : le retrait ANSES en découle nécessairement.
   */
  deduit?: boolean;
  source?: string;
}

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

export interface Detenteur {
  id: string;
  nom: string;
  nbProduits: number;
  nbUsages: number;
  nbMatieresActives: number;
  categories: string[];
}

export interface ProduitPortefeuille {
  id: string;
  /** Un même nom commercial peut exister chez deux détenteurs. */
  detenteur: string;
  detenteurId: string;
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
    detenteurDefaut: string;
    nbDetenteursCouverts: number;
    nbLignesIndex: number;
    nbProduitsIndex: number;
    nbDetenteurs: number;
    avertissement: string;
  };
  fournisseurs: Fournisseur[];
  matieres: MatiereMarche[];
  detenteurs: Detenteur[];
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
  /** Statut France / ANSES — signal de tête pour anticiper l'ONSSA. */
  anses?: FicheAnses;
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
  /**
   * Statut France, lu dans E-Phy pour TOUTE matière active appariable — pas
   * seulement celles disposant d'une fiche d'expertise. C'est ce qui donne au
   * radar et à la prospection une couverture réglementaire quasi complète.
   */
  anses: FicheAnses | null;
  /** Substance E-Phy appariée et méthode d'appariement, pour vérification. */
  ansesAppariement: { substance: string; methode: string } | null;
  /** Produits du détenteur COURANT portant cette matière active. */
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
  /** Risque réglementaire de la molécule, si évaluable. */
  risque: NiveauRisque | null;
  scoreRisque: number | null;
  /** Statut France lu dans E-Phy — gouverne l'ONSSA. */
  statutAnses: StatutAnses | null;
  /** Retirée en France : disqualifie la cible quel que soit son score. */
  ansesRetiree: boolean;
}

// ── Dossiers ────────────────────────────────────────────────────────────────

export type StatutPiece = "manquante" | "en_cours" | "présente" | "validée";

export interface PieceDossier {
  /** Libellé complet, préfixé du code Annexe 3-B. */
  rubrique: string;
  /** Code de la ligne au formulaire ONSSA, ex. « 2.8.1 ». */
  code?: string;
  /** Partie du formulaire : I (préparation commerciale) ou II (matière active). */
  partie?: "I" | "II";
  /** Titre de la section du formulaire. */
  section?: string;
  /** Libellé seul, sans code. */
  libelle?: string;
  statut: StatutPiece;
  poids: number;
  /** Qui doit fournir la pièce. */
  responsable?: "fournisseur" | "phytobeht" | "laboratoire";
  /** Le formulaire exige un laboratoire accrédité BPL pour cette ligne. */
  glp?: boolean;
  /** Reprenable par référence à une homologation marocaine existante. */
  allegeable?: boolean;
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
