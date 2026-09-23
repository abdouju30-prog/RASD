import { MATIERES, MELANGES, cultureParIdDe, cultureParNomDe, matiereParIdDe } from "./corpus";
import type { Culture, Emploi, Matiere, Melange } from "./types";

export interface GroupeCible {
  titre: string;
  noms: string[];
}

export interface EssaiPret {
  culture?: Culture;
  cible: string;
  matieres: Matiere[];
  choixMatieres: Matiere[];
  cibles: string[];
  groupesCibles: GroupeCible[];
  emplois: Emploi[];
  melanges: Melange[];
}

function nomsLies(nom: string): string[] {
  const parent = nom.split(":")[0].trim();
  if (parent !== nom && cultureParNomDe(parent)) return [nom, parent];
  return [nom];
}

function titreCourt(nom: string): string {
  const partie = nom.split(":")[1];
  return (partie ?? nom).trim();
}

export function idsDe(m: string | string[] | undefined): string[] {
  const brut = Array.isArray(m) ? m : m ? [m] : [];
  return [...new Set(brut.filter(Boolean))].slice(0, 3);
}

export function parametresEssai(cultureId: string, cible: string, matiereIds: string[]): string {
  const q = new URLSearchParams();
  if (cultureId) q.set("culture", cultureId);
  if (cible) q.set("cible", cible);
  for (const id of matiereIds) {
    if (id) q.append("m", id);
  }
  return q.toString();
}

export function preparerEssai(sp: {
  culture?: string;
  cible?: string;
  m?: string | string[];
}): EssaiPret {
  const culture = sp.culture ? cultureParIdDe(sp.culture) : undefined;
  const cible = (sp.cible ?? "").trim();
  const matieres = idsDe(sp.m)
    .map((id) => matiereParIdDe(id))
    .filter((x) => x !== undefined);
  const lies = culture ? nomsLies(culture.nom) : [];
  const choixMatieres = culture
    ? MATIERES.filter((m) => lies.some((nom) => m.cultures.includes(nom)))
    : MATIERES;
  const groupesCibles: GroupeCible[] = lies.map((nom) => {
    const noms = [
      ...new Set(
        choixMatieres
          .flatMap((m) => m.emplois.filter((e) => e.culture === nom).map((e) => e.cible))
          .filter(Boolean)
      ),
    ].sort((a, b) => a.localeCompare(b, "fr"));
    return { titre: titreCourt(nom), noms };
  }).filter((g) => g.noms.length > 0);
  const cibles = [...new Set(groupesCibles.flatMap((g) => g.noms))];

  const emplois: Emploi[] = [];
  const vus = new Set<string>();
  const sources = matieres.length ? matieres : culture ? choixMatieres : [];
  for (const m of sources) {
    for (const e of m.emplois) {
      if (lies.length && !lies.includes(e.culture)) continue;
      if (cible && e.cible !== cible) continue;
      const k = `${e.culture}/${e.cible}/${e.doses.join("|")}/${e.dar.join("|")}`;
      if (vus.has(k)) continue;
      vus.add(k);
      emplois.push(e);
    }
  }

  const melanges =
    matieres.length >= 2
      ? MELANGES.filter((mix) => matieres.every((m) => mix.composantIds.includes(m.id)))
      : [];

  return { culture, cible, matieres, choixMatieres, cibles, groupesCibles, emplois, melanges };
}

export interface Precedent {
  matiere: string;
  doses: string;
  dar: string;
}

export function precedentsDe(essai: EssaiPret): Precedent[] {
  if (!essai.matieres.length) {
    return essai.emplois.slice(0, 6).map((e) => ({
      matiere: "",
      doses: e.doses.join(" · ") || "—",
      dar: e.dar.join(" · ") || "—",
    }));
  }
  return essai.matieres.map((m) => {
    const lies = essai.culture ? nomsLies(essai.culture.nom) : [];
    const lignes = m.emplois.filter((e) => {
      if (lies.length && !lies.includes(e.culture)) return false;
      if (essai.cible && e.cible !== essai.cible) return false;
      return true;
    });
    const doses = [...new Set(lignes.flatMap((e) => e.doses))].filter(Boolean);
    const dar = [...new Set(lignes.flatMap((e) => e.dar))].filter(Boolean);
    return {
      matiere: m.nom,
      doses: doses.join(" · ") || "aucun emploi dans l'extrait",
      dar: dar.join(" · ") || "—",
    };
  });
}
