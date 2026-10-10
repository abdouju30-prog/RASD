import lmrFile from "../data/lmr-ue.json";
import normesFile from "../data/normes.json";
import substancesFile from "../data/substances-ue.json";
import moaFile from "../data/modes-action.json";
import afriqueFile from "../data/afrique.json";
import { apparierApvma } from "./apvma";

// ────────────────────────────────────────────────────────────────────────────
// Export et conformité d'une matière active.
//
// Quatre fichiers, tous rapprochés par le nom ISO anglais (le même pont que
// l'Australie et la Chine, apparierApvma) :
//   data/substances-ue.json  statut, échéance, CAS, DJA, ARfD — API DG SANTE
//   data/modes-action.json   groupes FRAC / IRAC / HRAC
//   data/normes.json         Fairtrade, Rainforest Alliance, bio UE, conventions
//   data/lmr-ue.json         LMR européennes des cultures marocaines
// Une matière sans nom ISO, ou absente d'une source, n'affiche rien pour elle :
// l'absence est dite, jamais comblée.
// ────────────────────────────────────────────────────────────────────────────

export interface SubstanceUE {
  nomUE: string;
  cas: string[];
  statut: string | null;
  approbation: string | null;
  expiration: string | null;
  categorie: string | null;
  dja: string | null;
  arfd: string | null;
}

export interface Normes {
  fairtrade?: string;
  rainforest?: string;
  bio?: string;
  rotterdam?: boolean;
  stockholm?: boolean;
}

export interface GroupeMoa {
  groupe: string;
  libelle: string | null;
  ancien?: string | null;
  famille?: string | null;
}

interface ValeurLmr {
  v: string | null;
  lq: boolean;
  date: string | null;
  reglement: string | null;
}

export interface LigneLmr {
  culture: string;
  produitUE: string;
  actuel: ValeurLmr | null;
  futur: ValeurLmr | null;
}

const SUBSTANCES = substancesFile.substances as Record<string, SubstanceUE>;
const NORMES = normesFile.substances as Record<string, Normes>;
const MOA = moaFile.matieres as Record<string, Partial<Record<"FRAC" | "IRAC" | "HRAC", GroupeMoa>>>;
const LMR = lmrFile as unknown as {
  produits: Record<string, { nom: string }>;
  cultures: Record<string, string[]>;
  residus: Record<string, { residuUE: string; lmr: Record<string, { actuel?: ValeurLmr; futur?: ValeurLmr }> }>;
};

export const META_CONFORMITE = {
  lmr: lmrFile.meta,
  normes: normesFile.meta,
  substances: substancesFile.meta,
  moa: moaFile.meta,
};

// Homologations voisines (data/afrique.json) : clé = molécule de l'index marocain.
const AFRIQUE = afriqueFile.matieres as Record<string, { tunisie?: { n: number; restriction?: string }; sahel?: { n: number } }>;
export const META_AFRIQUE = afriqueFile.meta;

export function voisins(molecule: string) {
  return AFRIQUE[molecule.split(/\s+-/)[0].trim()] ?? null;
}

export function isoDe(nomMatiere: string): string | null {
  return apparierApvma(nomMatiere)?.nom ?? null;
}

export function conformite(nomMatiere: string) {
  const iso = isoDe(nomMatiere);
  return {
    iso,
    ue: iso ? SUBSTANCES[iso] ?? null : null,
    normes: iso ? NORMES[iso] ?? null : null,
    moa: iso ? MOA[iso] ?? null : null,
    residuUE: iso ? LMR.residus[iso]?.residuUE ?? null : null,
  };
}

/** LMR européennes des cultures marocaines où la matière est homologuée. */
export function lmrCultures(nomMatiere: string, cultures: string[]): LigneLmr[] {
  const iso = isoDe(nomMatiere);
  const r = iso ? LMR.residus[iso] : undefined;
  const out: LigneLmr[] = [];
  for (const culture of cultures) {
    for (const code of LMR.cultures[culture] ?? []) {
      const case_ = r?.lmr[code];
      out.push({
        culture,
        produitUE: LMR.produits[code]?.nom ?? code,
        actuel: case_?.actuel ?? null,
        futur: case_?.futur ?? null,
      });
    }
  }
  return out;
}

/** Libellé court d'un groupe de mode d'action : « FRAC 3 — DMI ». */
export function libelleMoa(moa: ReturnType<typeof conformite>["moa"]): string[] {
  if (!moa) return [];
  return (Object.entries(moa) as [string, GroupeMoa][]).map(([systeme, g]) =>
    `${systeme} ${g.groupe}${g.libelle ? ` — ${g.libelle.replace(/\s*-\s*fungicides?$/i, "")}` : ""}`
  );
}
