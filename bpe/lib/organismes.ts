import { cultureParNomDe, ORGANISMES } from "./corpus";
import type { Echeance, Organisme } from "./types";

export function lireDate(fr: string | null | undefined): Date | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(fr ?? "");
  if (!m) return null;
  const d = new Date(`${m[3]}-${m[2]}-${m[1]}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function echeanceDe(expiration: string | null | undefined, ref = new Date()): Echeance {
  const d = lireDate(expiration);
  if (!d) return "inconnue";
  const jours = (d.getTime() - Date.UTC(ref.getFullYear(), ref.getMonth(), ref.getDate())) / 86_400_000;
  if (jours < 0) return "expire";
  if (jours < 365) return "proche";
  return "valide";
}

export const LIBELLE_ECHEANCE: Record<Echeance, string> = {
  expire: "Expiré",
  proche: "Échéance < 1 an",
  valide: "Couvert",
  inconnue: "Date illisible",
};

export interface CouvertureEssais {
  perimetres: string[];
  /** True when no crop mapped to an ONSSA perimeter. The list is unfiltered. */
  indetermine: boolean;
  origines: string[];
  organismes: Organisme[];
}

/** Organisms whose agreement covers every perimeter implied by the crops. */
export function organismesPour(cultures: string[]): CouvertureEssais {
  const origines = new Set<string>();
  const perimetres: string[] = [];
  let reconnu = false;
  for (const nom of cultures) {
    const c = cultureParNomDe(nom);
    if (!c || c.perimetres.length === 0) continue;
    reconnu = true;
    origines.add(c.originePerimetres);
    for (const p of c.perimetres) {
      if (!perimetres.includes(p)) perimetres.push(p);
    }
  }
  if (!reconnu) {
    return { perimetres: [], indetermine: true, origines: [], organismes: ORGANISMES };
  }
  return {
    perimetres,
    indetermine: false,
    origines: [...origines],
    organismes: ORGANISMES.filter((o) => perimetres.every((p) => o.couverture.includes(p))),
  };
}
