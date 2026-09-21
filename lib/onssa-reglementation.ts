import fichier from "../data/onssa-reglementation.json";
import { fmtDate } from "./logic";

// ────────────────────────────────────────────────────────────────────────────
// TEXTES ONSSA — ce que l'Office publie, pas ce qu'il homologué.
//
// L'index Excel dit quels produits ont une AMM. Cette source dit autre
// chose : les avis, listes et textes que l'ONSSA met en ligne sur
// eservice.onssa.gov.ma/Reglementation_N.aspx (et la consolidation
// www.onssa.gov.ma). Un décret d'application, une liste de revendeurs,
// un avis de réexamen : c'est ça qu'il faut avoir lu la semaine où ça sort.
//
// L'index des matières actives n'est PAS ici. Il vient d'IndPesticide.aspx.
// ────────────────────────────────────────────────────────────────────────────

export type TypeTexteOnssa =
  | "loi"
  | "decret"
  | "arrete"
  | "circulaire"
  | "procedure"
  | "referentiel"
  | "avis"
  | "note"
  | "liste"
  | "decision"
  | "autre";

export interface TexteOnssa {
  id: string;
  titre: string;
  type: TypeTexteOnssa;
  date: string | null;
  url: string | null;
  source: string | null;
  sources: string[];
  langue: string;
  dateMiseEnLigne: string | null;
  nouveau: boolean;
  misAJour: boolean;
  premiereVue: string | null;
}

interface Fichier {
  meta: {
    source: string;
    url: string;
    urlConsolidée: string;
    attribution: string;
    genere: string;
    nbTextes: number;
    nbNouveaux: number;
    nbMisAJour: number;
    avertissement: string;
    majEservice: string | null;
    majWww: string | null;
    sourcesJointes: string[];
  };
  textes: TexteOnssa[];
}

const F = fichier as unknown as Fichier;

export const META_ONSSA_TEXTES = F.meta;
export const TEXTES_ONSSA: TexteOnssa[] = F.textes;

export const LIBELLE_TYPE_ONSSA: Record<TypeTexteOnssa, string> = {
  loi: "Loi",
  decret: "Décret",
  arrete: "Arrêté",
  circulaire: "Circulaire",
  procedure: "Procédure",
  referentiel: "Référentiel",
  avis: "Avis",
  note: "Note",
  liste: "Liste",
  decision: "Décision",
  autre: "Texte",
};

const JOURS_RECENT = 21;

function parseIso(s: string | null | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s.length === 10 ? `${s}T12:00:00` : s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Date la plus parlante : mise en ligne e-service, sinon date d'édiction. */
export function dateAffichee(t: TexteOnssa): string | null {
  return t.dateMiseEnLigne || t.date;
}

export function estRecent(t: TexteOnssa, aujourd: Date = new Date()): boolean {
  if (t.nouveau || t.misAJour) return true;
  const d = parseIso(dateAffichee(t));
  if (!d) return false;
  const ms = aujourd.getTime() - d.getTime();
  return ms >= 0 && ms <= JOURS_RECENT * 24 * 60 * 60 * 1000;
}

export const TEXTES_NOUVEAUX = TEXTES_ONSSA.filter((t) => t.nouveau || t.misAJour);
export const TEXTES_RECENTS = TEXTES_ONSSA.filter((t) => estRecent(t));

export function fraicheurOnssaTextes(aujourd: Date = new Date()) {
  const releve = parseIso(META_ONSSA_TEXTES.genere?.slice(0, 10));
  if (!releve) return { etat: "inconnue" as const, jours: null as number | null };
  const jours = Math.floor((aujourd.getTime() - releve.getTime()) / (24 * 60 * 60 * 1000));
  const etat = jours <= 10 ? ("à jour" as const) : jours <= 21 ? ("à rafraîchir" as const) : ("périmée" as const);
  return { etat, jours };
}

export const STATS_ONSSA_TEXTES = {
  attribution: META_ONSSA_TEXTES.attribution,
  url: META_ONSSA_TEXTES.url,
  urlConsolidée: META_ONSSA_TEXTES.urlConsolidée,
  nbTextes: META_ONSSA_TEXTES.nbTextes,
  nbNouveaux: META_ONSSA_TEXTES.nbNouveaux,
  nbMisAJour: META_ONSSA_TEXTES.nbMisAJour,
  nbRecents: TEXTES_RECENTS.length,
  releve: META_ONSSA_TEXTES.genere?.slice(0, 10) ?? null,
  releveFmt: META_ONSSA_TEXTES.genere ? fmtDate(META_ONSSA_TEXTES.genere.slice(0, 10)) : "—",
};
