// ────────────────────────────────────────────────────────────────────────────
// LES CONTRAINTES D'IMPORTATION — ce que la réglementation impose, point final
//
// Tout le reste de l'outil cherche des occasions. Cet écran-ci ne cherche rien :
// il énonce ce qui est OBLIGATOIRE, et qu'aucune trouvaille de sourcing ne peut
// contourner. Deux règles gouvernent tout le travail de prospection :
//
//   1. IMPORTER UNE MATIÈRE ACTIVE EXIGE UN AGRÉMENT DE FABRICATION. Sans lui,
//      la meilleure usine chinoise du monde ne sert à rien : la marchandise
//      n'entre pas.
//   2. ACHETER PAR UN NÉGOCIANT EXIGE LA LETTRE DE FOURNITURE DU FABRICANT.
//      C'est la pièce qu'il faut demander DÈS la consultation, pas au port.
//
// ⚠️ CE MODULE EST UNE TRANSCRIPTION, PAS UNE INTERPRÉTATION. Chaque ligne
// porte l'article dont elle vient. Les délais sont ceux du texte ; ils ne
// préjugent pas du temps réel de traitement, que l'ONSSA ne publie pas.
//
// ⚠️ IL NE REMPLACE PAS LE TEXTE. Un dossier se monte sur le code de procédures
// lui-même, dont l'URL figure ci-dessous. Le tableau sert à savoir quoi
// préparer et quand, pas à être opposé à un inspecteur.
//
// SOURCE : ONSSA — « Code de procédures du contrôle à l'importation des
// pesticides à usage agricole, matières fertilisantes et supports de cultures »,
// référence CP 08/DCPV/15, version B du 22 février 2018. Relevé le 9 septembre
// 2026 sur eservice.onssa.gov.ma.
// ────────────────────────────────────────────────────────────────────────────

export const SOURCE_IMPORT = {
  titre:
    "Code de procédures du contrôle à l'importation des pesticides à usage agricole, matières fertilisantes et supports de cultures",
  reference: "CP 08/DCPV/15, version B — 22 février 2018",
  url: "https://eservice.onssa.gov.ma/Docs/Code%20de%20proc%C3%A9dures%2008%20DCPV%2015-CODE%20DE%20PROCEDURES-Version%20B%20-%2022-02-2018-28-02-2018%2015-06-34.pdf",
  releve: "2026-09-09",
};

/** Ce que l'on importe — les pièces ne sont pas les mêmes. */
export type Objet = "produit" | "matiere_active" | "echantillon";

export const LIBELLE_OBJET: Record<Objet, string> = {
  produit: "Produit formulé",
  matiere_active: "Matière active",
  echantillon: "Échantillon d'essai",
};

export interface Contrainte {
  id: string;
  /** Ce que la règle impose, en une phrase. */
  regle: string;
  objets: Objet[];
  /** Une barrière : sans cela, l'opération est impossible, pas seulement retardée. */
  barriere: boolean;
  /** L'article ou la section d'où vient la règle. */
  article: string;
  /** Ce que ça implique concrètement, quand ce n'est pas évident. */
  consequence?: string;
}

export const CONTRAINTES: Contrainte[] = [
  {
    id: "homologation-prealable",
    regle:
      "Tout produit utilisé, vendu ou importé doit être préalablement homologué et répondre aux conditions de son homologation, notamment de qualité, d'étiquetage et d'emballage.",
    objets: ["produit"],
    barriere: true,
    article: "§ III-A",
  },
  {
    id: "agrement-fabrication",
    regle:
      "L'importation des matières actives n'est autorisée qu'aux sociétés préalablement agréées pour la fabrication des pesticides à usage agricole.",
    objets: ["matiere_active"],
    barriere: true,
    article: "§ III-B",
    consequence:
      "Sans agrément de fabrication, aucune des usines identifiées par l'outil n'est atteignable en direct : il faut passer par un formulateur agréé.",
  },
  {
    id: "lettre-fourniture",
    regle:
      "Lorsque le fournisseur n'est pas le fabricant, la lettre de fourniture de la matière active délivrée par le fabricant au profit du fournisseur est exigée.",
    objets: ["matiere_active"],
    barriere: true,
    article: "§ III-B, étape 1",
    consequence:
      "À demander dès la consultation, pas au port : un négociant qui ne peut pas la produire ne peut pas vous livrer.",
  },
  {
    id: "pieces-produit",
    regle:
      "Dossier produit : déclaration unitaire en douane (DUM), facture commerciale du fournisseur, document de transport (connaissement, CMR ou LTA), et copie de l'attestation d'homologation ou d'autorisation de vente actualisée.",
    objets: ["produit"],
    barriere: false,
    article: "§ III-A, étape 1",
  },
  {
    id: "pieces-matiere",
    regle:
      "Dossier matière active : DUM, facture, document de transport, autorisation d'importation de la matière active, agrément de fabrication, et lettre de fourniture le cas échéant.",
    objets: ["matiere_active"],
    barriere: false,
    article: "§ III-B, étape 1",
  },
  {
    id: "autorisation-echantillon",
    regle:
      "L'importation d'échantillons de pesticides pour essais exige l'original de l'autorisation d'importation d'échantillons.",
    objets: ["echantillon"],
    barriere: true,
    article: "§ III-A, étape 1",
    consequence:
      "C'est la pièce qui conditionne les essais d'efficacité — donc le calendrier de tout dossier d'homologation.",
  },
  {
    id: "trois-controles",
    regle:
      "Le produit formulé subit trois contrôles : documentaire, identité et physique, puis analytique en laboratoire accrédité par l'ONSSA.",
    objets: ["produit"],
    barriere: false,
    article: "§ III-A",
  },
  {
    id: "deux-controles",
    regle:
      "La matière active ne subit que deux contrôles : documentaire, puis identité et physique. Pas de contrôle analytique.",
    objets: ["matiere_active"],
    barriere: false,
    article: "§ III-B",
    consequence:
      "La qualité du technique n'est donc pas vérifiée à la frontière : elle se contrôle au contrat et à la réception.",
  },
  {
    id: "etiquetage-produit",
    regle:
      "Onze mentions obligatoires sur l'étiquette d'un produit destiné à la vente directe, dont le numéro d'homologation, le nom du fournisseur, les teneurs, les usages autorisés avec DAR, la classification toxicologique, la date de production et le numéro de lot.",
    objets: ["produit"],
    barriere: false,
    article: "§ III-A, étape 3",
  },
  {
    id: "etiquetage-matiere",
    regle:
      "Sept mentions obligatoires sur l'emballage d'une matière active, dont le nom et l'adresse du fabricant, la classification toxicologique, la date de production et le numéro de lot.",
    objets: ["matiere_active"],
    barriere: false,
    article: "§ III-B, étape 3",
    consequence:
      "« Nom et adresse du fabricant » : l'étiquette doit désigner l'usine, pas le négociant.",
  },
  {
    id: "conformite-autorisation",
    regle:
      "Les informations du dossier doivent être conformes à celles qui figurent sur l'autorisation d'importation.",
    objets: ["produit", "matiere_active"],
    barriere: false,
    article: "§ III-B, étape 2",
    consequence:
      "Changer d'usine en cours de route sans modifier l'autorisation bloque la marchandise.",
  },
  {
    id: "prelevement",
    regle:
      "Le prélèvement se fait en trois échantillons : un au laboratoire, un à l'importateur, un gardé comme témoin.",
    objets: ["produit"],
    barriere: false,
    article: "§ III-A, étape 4",
  },
  {
    id: "redevance",
    regle:
      "Le contrôle à l'importation est soumis au paiement d'une redevance, fixée par décision conjointe des ministres de l'Agriculture et des Finances.",
    objets: ["produit", "matiere_active"],
    barriere: false,
    article: "§ I",
  },
];

export interface Delai {
  id: string;
  quoi: string;
  duree: string;
  /** Ce qui arrive si on le laisse passer. */
  sanction: string;
  article: string;
}

export const DELAIS: Delai[] = [
  {
    id: "doc",
    quoi: "Régulariser une non-conformité documentaire",
    duree: "8 jours ouvrables",
    sanction: "Extensible de 10 jours ouvrables sur demande dûment motivée.",
    article: "§ III-A, étape 2",
  },
  {
    id: "physique",
    quoi: "Régulariser une non-conformité d'identité, d'étiquetage ou d'emballage",
    duree: "30 jours",
    sanction:
      "Passé ce délai, la marchandise est déclarée non admise et un certificat de non-admission est délivré.",
    article: "§ III-A, étape 3",
  },
  {
    id: "prelevement",
    quoi: "Contester la méthode de prélèvement",
    duree: "2 jours ouvrables",
    sanction: "Passé ce délai, aucune contestation n'est recevable.",
    article: "§ III-A, étape 4",
  },
  {
    id: "seconde-analyse",
    quoi: "Demander une seconde analyse après non-conformité analytique",
    duree: "8 jours ouvrables",
    sanction: "En cas de confirmation, la marchandise est déclarée non admise.",
    article: "§ III-C, étape 4",
  },
  {
    id: "temoin",
    quoi: "Récupérer les échantillons témoins après une décision de non-admission",
    duree: "2 ans",
    sanction: "Au-delà, ils cessent d'être conservés par le service de contrôle.",
    article: "§ III-A, étape 4",
  },
];

/** Les textes qui fondent tout cela — cités, pas résumés. */
export const TEXTES = [
  {
    ref: "Loi n° 42-95",
    objet:
      "Contrôle et organisation du commerce des produits pesticides à usage agricole (dahir n° 1.97.01 du 21 janvier 1997, modifiée et complétée)",
  },
  {
    ref: "Décret n° 2-99-105 du 5 mai 1999",
    objet: "Homologation des pesticides à usage agricole",
  },
  {
    ref: "Décret n° 2-99-106 du 5 mai 1999",
    objet:
      "Exercice des activités d'importation, de fabrication et de commercialisation des pesticides à usage agricole",
  },
  {
    ref: "Décret n° 2-01-1343 du 17 septembre 2001",
    objet: "Commission des pesticides à usage agricole",
  },
  {
    ref: "Dahir du 2 décembre 1922",
    objet: "Importation, commerce, détention et usage des substances vénéneuses",
  },
  {
    ref: "Loi n° 25-08",
    objet: "Création de l'ONSSA (dahir n° 1-09-20 du 18 février 2009)",
  },
  {
    ref: "Loi n° 13-83",
    objet: "Répression des fraudes sur les marchandises (dahir n° 1.83.108 du 5 octobre 1984)",
  },
];

/**
 * Durées de validité, telles que publiées par l'ONSSA.
 *
 * ⚠️ CE N'EST PAS UN DÉLAI D'INSTRUCTION. L'ONSSA ne publie pas le temps qu'il
 * met à instruire un dossier : ces durées sont celles de l'acte une fois obtenu.
 */
export const VALIDITES = [
  {
    acte: "Attestation d'homologation",
    duree: "10 ans",
    suite: "Renouvelable 10 ans après réexamen, à la demande du requérant.",
  },
  {
    acte: "Autorisation de vente",
    duree: "4 ans",
    suite: "Prorogeable de 2 ans au maximum.",
  },
];

export const STATS_IMPORT = {
  nbContraintes: CONTRAINTES.length,
  nbBarrieres: CONTRAINTES.filter((c) => c.barriere).length,
  nbDelais: DELAIS.length,
  nbTextes: TEXTES.length,
};

/** Contraintes qui s'appliquent à ce qu'on importe. */
export function contraintesDe(objet: Objet): Contrainte[] {
  return CONTRAINTES.filter((c) => c.objets.includes(objet));
}
