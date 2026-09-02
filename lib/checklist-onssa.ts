// ────────────────────────────────────────────────────────────────────────────
// CHECKLIST ONSSA — Annexe 3-B
// « Requirements registration Morocco » pour une spécialité commerciale (SC).
//
// Transcription fidèle du formulaire officiel : 2 parties, 11 sections,
// 92 lignes. Les libellés sont conservés dans la langue du formulaire pour que
// le dossier produit ici se superpose exactement à la grille de l'ONSSA.
//
// Trois attributs ajoutés par l'outil, qui ne figurent pas au formulaire :
//   • glp         — le formulaire exige un laboratoire accrédité BPL
//   • responsable — qui détient la donnée en pratique
//   • allegeable  — la voie « me-too » permet-elle de s'appuyer sur un dossier
//                   déjà accepté par l'ONSSA pour cette matière active ?
//
// Règle d'allègement retenue : tout ce qui décrit LA MATIÈRE ACTIVE (partie II)
// et les propriétés intrinsèques de la préparation issues du fournisseur
// (partie I, sections 2 à 4) est reprenable par référence. Tout ce qui décrit
// VOTRE produit sur VOTRE marché — usages visés, essais Maroc, étiquetage —
// ne l'est jamais.
// ────────────────────────────────────────────────────────────────────────────

export type Responsable = "fournisseur" | "phytobeht" | "laboratoire";

/** Champ de l'index ONSSA qui pré-remplit la ligne, s'il en existe un. */
export type SourcePrerempli =
  | "usages"
  | "cibles"
  | "doses"
  | "dar"
  | "applications"
  | "formulation"
  | "composition"
  | "fournisseur"
  | "categorie"
  | "produit";

export interface ItemChecklist {
  code: string;
  libelle: string;
  glp: boolean;
  responsable: Responsable;
  allegeable: boolean;
  prerempli?: SourcePrerempli;
  aide?: string;
}

export interface SectionChecklist {
  code: string;
  titre: string;
  note?: string;
  items: ItemChecklist[];
}

export interface PartieChecklist {
  code: "I" | "II";
  titre: string;
  sections: SectionChecklist[];
}

const F: Responsable = "fournisseur";
const P: Responsable = "phytobeht";
const L: Responsable = "laboratoire";

export const CHECKLIST_ONSSA: PartieChecklist[] = [
  {
    code: "I",
    titre: "Requirements relevant to commercial preparations",
    sections: [
      {
        code: "1",
        titre: "Identity of the commercial preparation",
        items: [
          { code: "1.1", libelle: "Trade name", glp: false, responsable: P, allegeable: false, prerempli: "produit", aide: "Nom commercial déposé — propre au détenteur, jamais repris d'un dossier existant." },
          { code: "1.2", libelle: "Applicant", glp: false, responsable: P, allegeable: false },
          { code: "1.3", libelle: "Supplier", glp: false, responsable: P, allegeable: false, prerempli: "fournisseur" },
          { code: "1.4", libelle: "Formulator", glp: false, responsable: F, allegeable: true },
          { code: "1.5", libelle: "Manufacturer of the active ingredient(s)", glp: false, responsable: F, allegeable: true },
          { code: "1.6", libelle: "Composition of the commercial preparation", glp: false, responsable: F, allegeable: true, prerempli: "composition" },
          { code: "1.7", libelle: "Category", glp: false, responsable: P, allegeable: false, prerempli: "categorie" },
          { code: "1.8", libelle: "Formulation", glp: false, responsable: F, allegeable: true, prerempli: "formulation" },
          { code: "1.9", libelle: "Safety data sheet", glp: false, responsable: F, allegeable: true, aide: "FDS du fournisseur, à traduire et adapter à la réglementation marocaine." },
          { code: "1.10", libelle: "Information on registrations in other countries", glp: false, responsable: F, allegeable: true, aide: "Argument fort : joindre les homologations obtenues ailleurs par le fournisseur." },
        ],
      },
      {
        code: "2",
        titre: "Physical-chemical and technical properties",
        note: "Section entièrement BPL — laboratoire accrédité obligatoire.",
        items: [
          { code: "2.1", libelle: "Aspect", glp: true, responsable: F, allegeable: true },
          { code: "2.2", libelle: "Explosive and oxidizing properties", glp: true, responsable: F, allegeable: true },
          { code: "2.3", libelle: "Flammability / flashpoint", glp: true, responsable: F, allegeable: true },
          { code: "2.4", libelle: "Acidity/alkalinity and pH value", glp: true, responsable: F, allegeable: true },
          { code: "2.5", libelle: "Viscosity and surface tension", glp: true, responsable: F, allegeable: true },
          { code: "2.6", libelle: "Relative density and bulk density", glp: true, responsable: F, allegeable: true },
          { code: "2.7", libelle: "Stability during storage and shelf life", glp: true, responsable: F, allegeable: true },
          { code: "2.8", libelle: "Technical characteristics of the commercial preparation", glp: true, responsable: F, allegeable: true },
          { code: "2.8.1", libelle: "Wettability", glp: true, responsable: F, allegeable: true },
          { code: "2.8.2", libelle: "Formation of a persistent foam", glp: true, responsable: F, allegeable: true },
          { code: "2.8.3", libelle: "Holding in suspension, spontaneity and stability of dispersion", glp: true, responsable: F, allegeable: true },
          { code: "2.8.4", libelle: "Degree of dissolution and stability of dilution", glp: true, responsable: F, allegeable: true },
          { code: "2.8.5", libelle: "Particle size distribution", glp: true, responsable: F, allegeable: true },
          { code: "2.8.6", libelle: "Ability to emulsify and emulsion stability", glp: true, responsable: F, allegeable: true },
          { code: "2.8.7", libelle: "Ability to flow, discharge and processing dust", glp: true, responsable: F, allegeable: true },
          { code: "2.9", libelle: "Physical and chemical compatibility with other products", glp: true, responsable: F, allegeable: true },
          { code: "2.10", libelle: "Adherence and distribution to seeds", glp: true, responsable: F, allegeable: true, aide: "Sans objet hors traitement de semences — le préciser plutôt que laisser vide." },
          { code: "2.11", libelle: "Corrosive power", glp: true, responsable: F, allegeable: true },
        ],
      },
      {
        code: "3",
        titre: "Toxicological studies",
        note: "Section entièrement BPL — laboratoire accrédité obligatoire.",
        items: [
          { code: "3.1", libelle: "Acute toxicity", glp: true, responsable: F, allegeable: true },
          { code: "3.1.1", libelle: "Oral toxicity", glp: true, responsable: F, allegeable: true },
          { code: "3.1.2", libelle: "Dermal toxicity", glp: true, responsable: F, allegeable: true },
          { code: "3.1.3", libelle: "Inhalation toxicity", glp: true, responsable: F, allegeable: true },
          { code: "3.1.4", libelle: "Skin irritation", glp: true, responsable: F, allegeable: true },
          { code: "3.1.5", libelle: "Eye irritation", glp: true, responsable: F, allegeable: true },
          { code: "3.1.6", libelle: "Sensitization", glp: true, responsable: F, allegeable: true },
          { code: "3.2", libelle: "Data on exposure", glp: true, responsable: F, allegeable: true },
          { code: "3.2.1", libelle: "Estimation of operator exposure", glp: true, responsable: F, allegeable: true },
          { code: "3.2.2", libelle: "Estimate of exposure of bystanders and residents", glp: true, responsable: F, allegeable: true },
          { code: "3.2.3", libelle: "Estimation of exposure of workers", glp: true, responsable: F, allegeable: true },
          { code: "3.3", libelle: "Dermal absorption", glp: true, responsable: F, allegeable: true },
        ],
      },
      {
        code: "4",
        titre: "Methods of analysis",
        items: [
          { code: "4.1", libelle: "Methods of analysis for determining the composition of the commercial preparation", glp: false, responsable: F, allegeable: true },
        ],
      },
      {
        code: "5",
        titre: "Data related to the application",
        note: "Section propre à votre demande — c'est ici que se joue le périmètre commercial.",
        items: [
          { code: "5.1", libelle: "Areas of use", glp: false, responsable: P, allegeable: false, prerempli: "usages" },
          { code: "5.2", libelle: "Effects on pests", glp: false, responsable: P, allegeable: false, prerempli: "cibles" },
          { code: "5.3", libelle: "Application methods", glp: false, responsable: P, allegeable: false },
          { code: "5.4", libelle: "Application rates", glp: false, responsable: P, allegeable: false, prerempli: "doses" },
          { code: "5.5", libelle: "Number and interval of/between applications", glp: false, responsable: P, allegeable: false, prerempli: "applications" },
          { code: "5.6", libelle: "Necessary waiting times", glp: false, responsable: P, allegeable: false, prerempli: "dar" },
          { code: "5.7", libelle: "Recommended precautions", glp: false, responsable: P, allegeable: false },
        ],
      },
      {
        code: "6",
        titre: "Data on efficacy and selectivity",
        note: "Jamais allégeable : essais en conditions marocaines exigés quelle que soit la voie.",
        items: [
          { code: "6.1", libelle: "Biological file", glp: false, responsable: L, allegeable: false, aide: "Compter au minimum 2 saisons et 2 régions. C'est le poste le plus long du dossier — le lancer en premier." },
        ],
      },
      {
        code: "7",
        titre: "Classification and labeling",
        items: [
          { code: "7.1", libelle: "Classification and labeling", glp: false, responsable: P, allegeable: false, aide: "Étiquetage conforme à la réglementation marocaine — mentions de danger, DAR, protection de l'applicateur." },
        ],
      },
    ],
  },
  {
    code: "II",
    titre: "Requirements related to the active ingredient(s)",
    sections: [
      {
        code: "1",
        titre: "Identity of the active ingredient(s)",
        items: [
          { code: "1.1", libelle: "Manufacturer", glp: false, responsable: F, allegeable: true },
          { code: "1.2", libelle: "ISO common name", glp: false, responsable: F, allegeable: true },
          { code: "1.3", libelle: "CAS and CIPAC number", glp: false, responsable: F, allegeable: true },
          { code: "1.4", libelle: "Chemical name", glp: false, responsable: F, allegeable: true },
          { code: "1.5", libelle: "Molecular and structural formula, molar mass", glp: false, responsable: F, allegeable: true },
          { code: "1.6", libelle: "Specification of purity of the active substance", glp: false, responsable: F, allegeable: true },
          { code: "1.7", libelle: "Identity of co-formulants", glp: false, responsable: F, allegeable: true },
          { code: "1.8", libelle: "Identity of significant impurities", glp: false, responsable: F, allegeable: true },
          { code: "1.9", libelle: "Identity of relevant impurities", glp: false, responsable: F, allegeable: true, aide: "Point de refus fréquent : le profil d'impuretés doit être équivalent à celui de la source de référence." },
          { code: "1.10", libelle: "Analytical profile of batches", glp: false, responsable: F, allegeable: true },
        ],
      },
      {
        code: "2",
        titre: "Physical-chemical properties",
        note: "Section entièrement BPL — laboratoire accrédité obligatoire.",
        items: [
          { code: "2.1", libelle: "Melting point and boiling point", glp: true, responsable: F, allegeable: true },
          { code: "2.2", libelle: "Relative density", glp: true, responsable: F, allegeable: true },
          { code: "2.3", libelle: "Vapor pressure and volatility", glp: true, responsable: F, allegeable: true },
          { code: "2.4", libelle: "Aspect", glp: true, responsable: F, allegeable: true },
          { code: "2.5", libelle: "Spectra", glp: true, responsable: F, allegeable: true },
          { code: "2.6", libelle: "Solubility in water", glp: true, responsable: F, allegeable: true },
          { code: "2.7", libelle: "Solubility in organic solvents", glp: true, responsable: F, allegeable: true },
          { code: "2.8", libelle: "N-octanol/water partition coefficient", glp: true, responsable: F, allegeable: true },
          { code: "2.9", libelle: "Dissociation in water", glp: true, responsable: F, allegeable: true },
          { code: "2.10", libelle: "Inflammability", glp: true, responsable: F, allegeable: true },
          { code: "2.11", libelle: "Flashpoint", glp: true, responsable: F, allegeable: true },
          { code: "2.12", libelle: "Explosive properties", glp: true, responsable: F, allegeable: true },
          { code: "2.13", libelle: "Surface tension", glp: true, responsable: F, allegeable: true },
          { code: "2.14", libelle: "Oxidizing properties", glp: true, responsable: F, allegeable: true },
          { code: "2.15", libelle: "pH", glp: true, responsable: F, allegeable: true },
        ],
      },
      {
        code: "3",
        titre: "Methods of analysis",
        items: [
          { code: "3.1", libelle: "Analytical methods of the technical active ingredient", glp: false, responsable: F, allegeable: true },
          { code: "3.2", libelle: "Residue analysis methods", glp: false, responsable: L, allegeable: true, aide: "Méthode résidus à valider pour les cultures marocaines visées." },
        ],
      },
      {
        code: "4",
        titre: "Classification and labeling",
        items: [
          { code: "4.1", libelle: "Classification and labeling", glp: false, responsable: F, allegeable: true },
        ],
      },
    ],
  },
];

/**
 * Toutes les lignes du formulaire, chacune portant sa partie.
 *
 * La partie est indispensable : les deux parties réutilisent les mêmes
 * numéros de section. « 1.8 » désigne « Formulation » en partie I et
 * « Identity of significant impurities » en partie II — comparer les codes
 * sans la partie confondrait les deux.
 */
export interface ItemLocalise extends ItemChecklist {
  partie: "I" | "II";
  section: string;
  /** Clé unique dans le formulaire, ex. « II.1.8 ». */
  cle: string;
}

export const TOUS_ITEMS: ItemLocalise[] = CHECKLIST_ONSSA.flatMap((p) =>
  p.sections.flatMap((s) =>
    s.items.map((i) => ({ ...i, partie: p.code, section: s.titre, cle: `${p.code}.${i.code}` }))
  )
);

export const STATS_CHECKLIST = {
  nbItems: TOUS_ITEMS.length,
  nbGLP: TOUS_ITEMS.filter((i) => i.glp).length,
  nbAllegeables: TOUS_ITEMS.filter((i) => i.allegeable).length,
  source: "ONSSA — Annexe 3-B, « Requirements registration Morocco »",
};

/** Rappels imprimés sur le formulaire officiel. */
export const MENTIONS_FORMULAIRE = [
  "Cocher la case correspondante (YES / NON) pour chaque ligne.",
  "* : l'étude doit être réalisée dans un laboratoire accrédité BPL (GLP).",
  "REF. : préciser le numéro de volume, le numéro de page et/ou le numéro d'annexe.",
  "Le formulaire se termine par cachet et date de la société.",
];

/** En-tête du formulaire — champs à renseigner avant dépôt. */
export const ENTETE_FORMULAIRE = [
  "Trade Name",
  "Submission Date",
  "Class (I, F, H, D)",
  "Company",
  "Supplier",
];
