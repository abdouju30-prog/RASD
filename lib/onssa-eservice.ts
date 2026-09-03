import fichier from "../data/onssa-eservice.json";
import { DETENTEURS, FOURNISSEURS, MATIERES } from "./data";
import { IndexNoms, slug } from "./noms";

// ────────────────────────────────────────────────────────────────────────────
// REGISTRES PUBLICS DE L'ONSSA
//
// Tout ce que l'outil savait du Maroc venait d'un export Excel figé. L'ONSSA
// publie elle-même trois registres tenus à jour, et ils changent la nature de
// deux réponses :
//
//   • SOCIÉTÉS AGRÉÉES — qui a le droit d'importer et de distribuer au Maroc,
//     avec numéro d'agrément, ingénieur responsable et coordonnées. C'est
//     l'annuaire par lequel on lance une consultation.
//
//   • ORGANISMES BPE — qui peut réaliser les essais d'efficacité de l'Annexe
//     3-B, et sur quelles cultures. Le périmètre compte autant que l'agrément :
//     un organisme agréé pour les légumes ne couvre pas l'arboriculture.
//
//   • PRODUITS EXPIRÉS — les homologations marocaines arrivées à terme. C'est
//     un FAIT marocain, là où le reste de la veille est une PRÉDICTION tirée du
//     statut français. Les deux ne se confondent pas et ne s'affichent pas
//     ensemble.
// ────────────────────────────────────────────────────────────────────────────

export interface SocieteAgreee {
  nom: string | null;
  siege: string | null;
  rc: string | null;
  telephone: string | null;
  fax: string | null;
  emails: string[];
  agrement: { numero: string | null; date: string | null; expiration?: string | null };
  activite: string | null;
  local: string | null;
  ingenieur: string | null;
}

export interface OrganismeBpe extends SocieteAgreee {
  /** Périmètres de cultures couverts par l'agrément BPE. */
  couverture: string[];
  couvertureNonReconnue: string | null;
}

export interface ProduitExpire {
  produit: string | null;
  fournisseur: string | null;
  detenteur: string | null;
  matieresActives: string | null;
  expiration: string | null;
  amm: string | null;
}

interface Fichier {
  meta: {
    source: string;
    url: string;
    attribution: string;
    genere: string;
    majSocietes: string | null;
    majBpe: string | null;
    majExpires: string | null;
    nbSocietes: number;
    nbBpe: number;
    nbExpires: number;
    avertissement: string;
  };
  societesAgreees: SocieteAgreee[];
  organismesBpe: OrganismeBpe[];
  produitsExpires: ProduitExpire[];
}

const F = fichier as unknown as Fichier;

export const META_ESERVICE = F.meta;
export const SOCIETES_AGREEES = F.societesAgreees;
export const ORGANISMES_BPE = F.organismesBpe;
export const PRODUITS_EXPIRES = F.produitsExpires;

// ── Qui, parmi les détenteurs de l'index, est agréé ? ───────────────────────

const INDEX_AGREEES = new IndexNoms(
  SOCIETES_AGREEES.map((s) => ({ nom: s.nom ?? "", valeur: s }))
);

/** Agrément ONSSA d'une société, par son nom. */
export function agrementDe(nom: string): SocieteAgreee | null {
  return INDEX_AGREEES.exact(nom) ?? INDEX_AGREEES.proches(nom, 1)[0] ?? null;
}

/**
 * Détenteurs de l'index retrouvés au registre des agréments.
 *
 * L'écart n'est pas une anomalie : l'index recense les détenteurs d'AMM, le
 * registre les sociétés autorisées à importer et distribuer. Une société peut
 * détenir une homologation sans exercer elle-même la distribution.
 */
export const DETENTEURS_AGREES = DETENTEURS.map((d) => ({
  ...d,
  agrement: agrementDe(d.nom),
})).filter((d) => d.agrement);

// ── Organismes d'essai, par culture ─────────────────────────────────────────

/**
 * Organismes BPE couvrant une culture donnée.
 *
 * Le rapprochement se fait par mot-clé sur les grandes familles de l'ONSSA :
 * le registre raisonne en « Cultures fruitières », l'index en « Pommier » ou
 * « Agrumes ». La correspondance est explicite plutôt que devinée — une
 * culture non rattachée renvoie la liste complète, à charge de vérifier.
 */
const FAMILLES: { perimetre: string; cultures: string[] }[] = [
  {
    perimetre: "Cultures fruitières",
    cultures: ["pommier", "poirier", "agrume", "olivier", "vigne", "abricotier", "pêcher",
      "prunier", "amandier", "figuier", "grenadier", "cerisier", "arboricult", "fruit",
      "bananier", "avocatier", "palmier"],
  },
  {
    perimetre: "Cultures légumières et plantes aromatiques et médicinales",
    cultures: ["tomate", "pomme de terre", "melon", "pastèque", "courgette", "poivron",
      "piment", "concombre", "haricot", "petit pois", "oignon", "carotte", "salade",
      "laitue", "fraisier", "aubergine", "chou", "menthe", "légum", "maraîch"],
  },
  {
    perimetre: "Grandes cultures",
    cultures: ["blé", "orge", "maïs", "riz", "betterave", "tournesol", "colza", "luzerne",
      "céréale", "légumineuse", "fève", "pois chiche", "lentille"],
  },
  { perimetre: "Cultures ornementales", cultures: ["rosier", "ornement", "gazon", "fleur"] },
  { perimetre: "Traitement des semences", cultures: ["semence"] },
  { perimetre: "Désinfection des sols", cultures: ["sol"] },
  {
    perimetre: "Traitement des produits récoltés (entreposage)",
    cultures: ["entrepos", "stock", "récolt", "denrée"],
  },
];

export interface EssaisPourCulture {
  perimetres: string[];
  /** true = aucune famille reconnue, la liste n'est pas filtrée. */
  indetermine: boolean;
  organismes: OrganismeBpe[];
}

export function organismesPour(cultures: string[]): EssaisPourCulture {
  const bas = cultures.map((c) => c.toLowerCase());
  const perimetres = FAMILLES.filter((f) =>
    f.cultures.some((mot) => bas.some((c) => c.includes(mot)))
  ).map((f) => f.perimetre);

  if (perimetres.length === 0) {
    return { perimetres: [], indetermine: true, organismes: ORGANISMES_BPE };
  }
  return {
    perimetres,
    indetermine: false,
    organismes: ORGANISMES_BPE.filter((o) => perimetres.every((p) => o.couverture.includes(p))),
  };
}

/** Agrément BPE expiré ou expirant dans l'année — à vérifier avant de commander. */
export function bpeAEcheance(o: OrganismeBpe, ref = new Date()): "expiré" | "proche" | null {
  const e = o.agrement.expiration;
  if (!e) return null;
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(e);
  if (!m) return null;
  const d = new Date(`${m[3]}-${m[2]}-${m[1]}`);
  const jours = (d.getTime() - ref.getTime()) / 86_400_000;
  return jours < 0 ? "expiré" : jours < 365 ? "proche" : null;
}

// ── Produits expirés : le fait marocain ─────────────────────────────────────

/** Expirations rattachées à une matière active de l'index, les plus récentes d'abord. */
export function expirationsDe(nomMatiere: string): ProduitExpire[] {
  const cle = slug(nomMatiere.split(/[([]/)[0]);
  return PRODUITS_EXPIRES.filter((p) => {
    if (!p.matieresActives) return false;
    return p.matieresActives.split(/[+,;]/).some((m) => slug(m.split(/[([]/)[0]) === cle);
  });
}

const MATIERES_EXPIREES = new Map<string, number>();
for (const p of PRODUITS_EXPIRES) {
  for (const m of (p.matieresActives ?? "").split(/[+,;]/)) {
    const k = slug(m.split(/[([]/)[0]);
    if (k) MATIERES_EXPIREES.set(k, (MATIERES_EXPIREES.get(k) ?? 0) + 1);
  }
}

/** Matières actives de l'index ayant déjà perdu au moins une AMM marocaine. */
export const MATIERES_AVEC_EXPIRATION = MATIERES.filter((m) =>
  MATIERES_EXPIREES.has(slug(m.molecule))
).length;

const INDEX_FOURNISSEURS = new IndexNoms(FOURNISSEURS.map((f) => ({ nom: f.nom, valeur: f })));

/** Fournisseurs de l'index dont un produit marocain a expiré — signal commercial. */
export function fournisseurExpire(nom: string) {
  return INDEX_FOURNISSEURS.exact(nom);
}

export const STATS_ESERVICE = {
  nbSocietes: SOCIETES_AGREEES.length,
  nbBpe: ORGANISMES_BPE.length,
  nbExpires: PRODUITS_EXPIRES.length,
  nbDetenteursAgrees: DETENTEURS_AGREES.length,
  nbMatieresAvecExpiration: MATIERES_AVEC_EXPIRATION,
  majSocietes: META_ESERVICE.majSocietes,
  majExpires: META_ESERVICE.majExpires,
  attribution: META_ESERVICE.attribution,
};
