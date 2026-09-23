import corpus from "@/data/corpus.json";
import type { Corpus, Culture, Matiere, Melange } from "./types";

export const CORPUS = corpus as Corpus;

export const MATIERES: Matiere[] = CORPUS.matieres;
export const MELANGES: Melange[] = CORPUS.melanges;
export const CULTURES: Culture[] = CORPUS.cultures;

const matiereParId = new Map(MATIERES.map((m) => [m.id, m]));
const melangeParId = new Map(MELANGES.map((m) => [m.id, m]));
const cultureParId = new Map(CULTURES.map((c) => [c.id, c]));
const cultureParNom = new Map(CULTURES.map((c) => [c.nom, c]));

export function matiereParIdDe(id: string): Matiere | undefined {
  return matiereParId.get(id);
}

export function melangeParIdDe(id: string): Melange | undefined {
  return melangeParId.get(id);
}

export function cultureParIdDe(id: string): Culture | undefined {
  return cultureParId.get(id);
}

export function cultureParNomDe(nom: string): Culture | undefined {
  return cultureParNom.get(nom);
}

export function melangesDe(matiereId: string): Melange[] {
  return MELANGES.filter((m) => m.composantIds.includes(matiereId));
}
