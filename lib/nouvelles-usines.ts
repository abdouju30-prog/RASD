import fichier from "../data/icama-nouveautes.json";
import { matieresDuPortefeuille } from "./data";
import { MATIERES_ICAMA, anglaisDe, fabricantsChinois } from "./icama";

// ────────────────────────────────────────────────────────────────────────────
// Nouvelles usines chinoises sur les molécules du portefeuille.
//
// Le journal (data/icama-nouveautes.json) est tenu par
// scripts/_icama_nouveautes.py à chaque relevé ICAMA (le 1er et le 16 du mois).
// Ici, seul le filtre par détenteur : une usine nouvelle sur une molécule que
// la société ne vend pas n'est pas une alerte pour elle.
// ────────────────────────────────────────────────────────────────────────────

interface Evenement {
  date: string;
  iso: string;
  societe: string;
  usine: boolean;
}

export interface NouvelleUsine extends Evenement {
  /** Nom lisible : anglais s'il est connu, sinon glose française ou pinyin. */
  nomLisible: string;
  region: string | null;
  molecule: string;
}

const EVENEMENTS = (fichier.evenements ?? []) as Evenement[];

function molecule(iso: string): string {
  return iso.charAt(0) + iso.slice(1).toLowerCase();
}

export function nouvellesUsines(detenteurId: string, jours = 60): NouvelleUsine[] {
  const isos = new Set(
    matieresDuPortefeuille(detenteurId)
      .map((m) => fabricantsChinois(m.nom)?.iso)
      .filter((x): x is string => Boolean(x))
  );
  const limite = new Date(Date.now() - jours * 86_400_000).toISOString().slice(0, 10);
  return EVENEMENTS.filter((e) => e.date >= limite && isos.has(e.iso)).map((e) => {
    const s = MATIERES_ICAMA.find((m) => m.iso === e.iso)?.societes.find((x) => x.nom === e.societe);
    return {
      ...e,
      nomLisible: anglaisDe(e.societe)?.nomAnglais || s?.glose || s?.latin || e.societe,
      region: s?.region ?? null,
      molecule: molecule(e.iso),
    };
  });
}
