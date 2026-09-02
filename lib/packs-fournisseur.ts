import registre from "../data/fournisseurs-packs.json";
import { TOUS_ITEMS } from "./checklist-onssa";

// ────────────────────────────────────────────────────────────────────────────
// AGRÉMENTS ET PAQUETS D'ÉTUDES DU FOURNISSEUR
//
// Un fournisseur de matière active ne se choisit pas seulement sur le prix et
// le pays : il doit détenir les études qui remplissent le dossier. Les
// fabricants indiens et chinois l'annoncent explicitement dans leurs
// brochures — « GLP Data Available », « 6 Pack Acute Tox », « Phys-Chem »,
// « Eco Tox », « 5 Batch ».
//
// Ces mentions ne sont pas du marketing : chacune correspond à un bloc précis
// de l'Annexe 3-B. Un fournisseur qui les réunit couvre l'essentiel de ce que
// le détenteur ne peut pas produire lui-même.
//
// ⚠️ Ce que l'outil enregistre ici est DÉCLARATIF — ce que le fournisseur
// affirme détenir, avec sa source. Ce n'est pas une vérification. Les études
// doivent être réclamées et lues avant tout engagement.
// ────────────────────────────────────────────────────────────────────────────

export type CodePack = "glp" | "acute_tox_6" | "phys_chem" | "eco_tox" | "batch_5";

export interface Pack {
  code: CodePack;
  libelle: string;
  libelleBrochure: string;
  description: string;
  /** Codes de lignes de l'Annexe 3-B couverts, par partie. */
  couvre: { partie: "I" | "II"; codes: string[] }[];
  /** true = le paquet ne correspond à aucune ligne de l'Annexe 3-B. */
  horsAnnexe3B?: boolean;
}

export const PACKS: Pack[] = [
  {
    code: "glp",
    libelle: "Études BPL",
    libelleBrochure: "GLP Data Available",
    description:
      "Les études sont réalisées en laboratoire accrédité Bonnes Pratiques de Laboratoire. Ce n'est pas un bloc de données mais une qualification : sans elle, aucune des lignes marquées BPL du formulaire n'est recevable.",
    couvre: [],
  },
  {
    code: "acute_tox_6",
    libelle: "Toxicité aiguë — 6 études",
    libelleBrochure: "6 Pack Acute Tox",
    description:
      "Les six études de toxicité aiguë exigées : orale, cutanée, inhalation, irritation cutanée, irritation oculaire, sensibilisation. Correspond exactement à la sous-section 3.1 du formulaire.",
    couvre: [{ partie: "I", codes: ["3.1", "3.1.1", "3.1.2", "3.1.3", "3.1.4", "3.1.5", "3.1.6"] }],
  },
  {
    code: "phys_chem",
    libelle: "Propriétés physico-chimiques",
    libelleBrochure: "Phys - Chem",
    description:
      "Propriétés physico-chimiques et caractéristiques techniques, pour la préparation commerciale comme pour la matière active. C'est le plus gros bloc du formulaire.",
    couvre: [
      {
        partie: "I",
        codes: [
          "2.1", "2.2", "2.3", "2.4", "2.5", "2.6", "2.7", "2.8",
          "2.8.1", "2.8.2", "2.8.3", "2.8.4", "2.8.5", "2.8.6", "2.8.7",
          "2.9", "2.10", "2.11",
        ],
      },
      {
        partie: "II",
        codes: [
          "2.1", "2.2", "2.3", "2.4", "2.5", "2.6", "2.7", "2.8",
          "2.9", "2.10", "2.11", "2.12", "2.13", "2.14", "2.15",
        ],
      },
    ],
  },
  {
    code: "eco_tox",
    libelle: "Écotoxicologie",
    libelleBrochure: "Eco Tox",
    description:
      "Études d'écotoxicologie : organismes aquatiques, abeilles, oiseaux, organismes du sol. L'Annexe 3-B (spécialité commerciale) ne les demande pas — elles relèvent du dossier de la matière active. À réclamer tout de même : l'ONSSA les exige par ailleurs, et elles conditionnent l'étiquetage.",
    couvre: [],
    horsAnnexe3B: true,
  },
  {
    code: "batch_5",
    libelle: "Analyse de 5 lots",
    libelleBrochure: "5 Batch",
    description:
      "Profil analytique sur cinq lots de fabrication, qui établit la constance de la production et le profil d'impuretés. Le volet impuretés est un motif de refus fréquent.",
    couvre: [{ partie: "II", codes: ["1.8", "1.9", "1.10"] }],
  },
];

const PAR_CODE = new Map(PACKS.map((p) => [p.code, p]));

export function pack(code: CodePack): Pack | undefined {
  return PAR_CODE.get(code);
}

/** Lignes de l'Annexe 3-B couvertes par un ensemble de paquets. */
export function lignesCouvertes(codes: CodePack[]): Set<string> {
  const out = new Set<string>();
  for (const c of codes) {
    const p = PAR_CODE.get(c);
    if (!p) continue;
    for (const bloc of p.couvre) {
      for (const code of bloc.codes) out.add(`${bloc.partie}.${code}`);
    }
  }
  return out;
}

export interface CouvertureFournisseur {
  /** Lignes du formulaire couvertes par les paquets déclarés. */
  nbCouvertes: number;
  /** Lignes incombant au fournisseur, qu'il déclare couvrir ou non. */
  nbAChargeFournisseur: number;
  /** Part des lignes à sa charge qu'il déclare couvrir. */
  pct: number;
  /** Lignes à sa charge qu'aucun paquet déclaré ne couvre. */
  manquantes: { code: string; libelle: string; glp: boolean }[];
  /** Le fournisseur déclare-t-il travailler en BPL ? */
  bpl: boolean;
  /** Paquets utiles au-delà de l'Annexe 3-B. */
  horsAnnexe: Pack[];
}

/**
 * Confronte les paquets déclarés par un fournisseur aux lignes du formulaire
 * qui lui incombent. Répond à la seule question qui compte avant de le
 * consulter : que devra-t-on produire soi-même s'il n'a que ça ?
 */
export function couverture(codes: CodePack[]): CouvertureFournisseur {
  const couvertes = lignesCouvertes(codes);
  const aCharge = TOUS_ITEMS.filter((i) => i.responsable === "fournisseur");

  // Comparaison sur la clé complète « partie.code » : sans elle, « II.1.8 »
  // (impuretés significatives) validerait à tort « I.1.8 » (formulation).
  const manquantes = aCharge
    .filter((i) => !couvertes.has(i.cle))
    .map((i) => ({ code: i.cle, libelle: i.libelle, glp: i.glp }));

  const nbCouvertes = aCharge.length - manquantes.length;
  return {
    nbCouvertes,
    nbAChargeFournisseur: aCharge.length,
    pct: aCharge.length ? Math.round((nbCouvertes / aCharge.length) * 100) : 0,
    manquantes,
    bpl: codes.includes("glp"),
    horsAnnexe: PACKS.filter((p) => p.horsAnnexe3B && codes.includes(p.code)),
  };
}

// ── Registre des fournisseurs ───────────────────────────────────────────────

export interface FicheFournisseur {
  nom: string;
  pays: string | null;
  referenceOnssa: boolean;
  packs: CodePack[];
  matieresProposees?: string[];
  contact?: {
    adresse?: string;
    telephone?: string;
    email?: string;
    site?: string;
  };
  source: string;
  date: string;
  note?: string;
}

const REGISTRE = (registre.fournisseurs ?? {}) as unknown as Record<string, FicheFournisseur>;

/** Fiche déclarative d'un fournisseur, si elle a été saisie. */
export function ficheFournisseur(id: string): FicheFournisseur | null {
  return REGISTRE[id] ?? null;
}

export const FOURNISSEURS_RENSEIGNES = Object.keys(REGISTRE).length;

export function toutesLesFiches(): (FicheFournisseur & { id: string })[] {
  return Object.entries(REGISTRE).map(([id, f]) => ({ ...f, id }));
}
