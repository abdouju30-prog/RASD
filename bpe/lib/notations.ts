export interface Notation {
  moment: string;
  date: string;
  stade: string;
  notes: Record<string, string>;
  selectivite: string;
}

export const NOTATIONS_DEFAUT: Notation[] = [
  { moment: "J0", date: "", stade: "", notes: {}, selectivite: "" },
  { moment: "J+n", date: "", stade: "", notes: {}, selectivite: "" },
  { moment: "Récolte", date: "", stade: "", notes: {}, selectivite: "" },
];

export const ECHELLE_PLANTE = [
  { note: "0", sens: "rien" },
  { note: "1", sens: "1 ou 2 taches, ou 1 individu" },
  { note: "3", sens: "quelques feuilles ou fruits" },
  { note: "5", sens: "environ la moitié de l'organe" },
  { note: "7", sens: "la plus grande partie, la plante tient" },
  { note: "10", sens: "organe ou plante détruit" },
];

export const SOMMES = [
  { valeur: "0", sens: "absente" },
  { valeur: "10", sens: "traces" },
  { valeur: "30", sens: "faible" },
  { valeur: "50", sens: "moitié" },
  { valeur: "70", sens: "forte" },
  { valeur: "100", sens: "détruite" },
];

export const SYMPTOMES = ["Aucun", "Chlorose", "Brûlure", "Tache", "Déformation", "Retard", "Destruction"];

export const GESTES = [
  "Laisse une rangée de bord. Ne note pas les plantes du bord.",
  "Prends 10 plantes au hasard. Regarde le même organe sur chacune, celui qui porte la cible.",
  "Donne à chaque plante une note de 0 à 10. Additionne. Écris la somme, de 0 à 100.",
  "Commence par le témoin non traité (T0), puis chaque modalité, le même jour.",
  "Si T0 = 0, la cible est absente : n'écris pas d'efficacité, reviens plus tard.",
  "Le produit réduit la cible seulement si sa somme est plus basse que T0. Écris les deux sommes. Pas de pourcentage.",
];

export function roleMoment(moment: string): string {
  const nom = moment.trim().toLowerCase();
  if (nom === "j0") return "Avant le traitement. Les sommes des parcelles doivent être proches.";
  if (nom.startsWith("j+")) return "Après le traitement. Même organe. Les mêmes 10 plantes si elles sont marquées.";
  if (nom.startsWith("récolte") || nom.startsWith("recolte")) return "Sur l'organe récolté. Le symptôme du produit sur la culture se note à part.";
  return "Même méthode que les autres dates.";
}

export function lireNombre(valeur: string): number | null {
  const n = Number(valeur.trim().replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function lectureEfficacite(notes: Record<string, string>, cible: string): string {
  const nom = cible || "la cible";
  const t0 = lireNombre(notes.T0 ?? "");
  if (t0 === null) return "Note d'abord T0, avec la somme des 10 plantes.";
  if (t0 === 0) return `T0 = 0 : ${nom} est absente. Pas d'efficacité ce jour.`;
  const autres = Object.entries(notes).filter(([code, valeur]) => code !== "T0" && valeur.trim());
  if (!autres.length) return "Note chaque modalité avec la même somme.";
  return autres
    .map(([code, valeur]) => {
      const n = lireNombre(valeur);
      if (n === null) return `${code} : écris un nombre`;
      if (n < t0) return `${code} ${n} < T0 ${t0} : ${nom} plus basse`;
      if (n === t0) return `${code} ${n} = T0 : pas de baisse`;
      return `${code} ${n} > T0 ${t0} : ${nom} plus haute`;
    })
    .join(" · ");
}

function notesDe(brut: unknown, efficacite: unknown): Record<string, string> {
  const source = brut && typeof brut === "object" ? (brut as Record<string, unknown>) : {};
  const notes: Record<string, string> = {};
  for (const [code, valeur] of Object.entries(source)) {
    notes[code] = String(valeur ?? "");
  }
  if (!Object.values(notes).some((v) => v.trim()) && efficacite) notes.E1 = String(efficacite);
  return notes;
}

export function lireNotations(sp: { nt?: string | string[] }): Notation[] {
  const brut = Array.isArray(sp.nt) ? sp.nt[0] : sp.nt;
  if (!brut) return NOTATIONS_DEFAUT.map((l) => ({ ...l, notes: {} }));
  try {
    const lignes = JSON.parse(brut) as Array<Partial<Notation> & { efficacite?: string }>;
    if (!Array.isArray(lignes) || lignes.length === 0) return NOTATIONS_DEFAUT.map((l) => ({ ...l, notes: {} }));
    return lignes.slice(0, 8).map((l) => ({
      moment: String(l.moment ?? ""),
      date: String(l.date ?? ""),
      stade: String(l.stade ?? ""),
      notes: notesDe(l.notes, l.efficacite),
      selectivite: String(l.selectivite ?? ""),
    }));
  } catch {
    return NOTATIONS_DEFAUT.map((l) => ({ ...l, notes: {} }));
  }
}

export function ecrireNotations(q: URLSearchParams, lignes: Notation[]) {
  const code = JSON.stringify(lignes);
  if (code !== JSON.stringify(NOTATIONS_DEFAUT)) q.set("nt", code);
}
