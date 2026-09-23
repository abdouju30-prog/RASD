export interface Notation {
  moment: string;
  date: string;
  stade: string;
  efficacite: string;
  selectivite: string;
}

export const NOTATIONS_DEFAUT: Notation[] = [
  { moment: "J0", date: "", stade: "", efficacite: "", selectivite: "" },
  { moment: "J+n", date: "", stade: "", efficacite: "", selectivite: "" },
  { moment: "Récolte", date: "", stade: "", efficacite: "", selectivite: "" },
];

export function lireNotations(sp: { nt?: string | string[] }): Notation[] {
  const brut = Array.isArray(sp.nt) ? sp.nt[0] : sp.nt;
  if (!brut) return NOTATIONS_DEFAUT.map((l) => ({ ...l }));
  try {
    const lignes = JSON.parse(brut) as Notation[];
    if (!Array.isArray(lignes) || lignes.length === 0) return NOTATIONS_DEFAUT.map((l) => ({ ...l }));
    return lignes.slice(0, 8).map((l) => ({
      moment: String(l.moment ?? ""),
      date: String(l.date ?? ""),
      stade: String(l.stade ?? ""),
      efficacite: String(l.efficacite ?? ""),
      selectivite: String(l.selectivite ?? ""),
    }));
  } catch {
    return NOTATIONS_DEFAUT.map((l) => ({ ...l }));
  }
}

export function ecrireNotations(q: URLSearchParams, lignes: Notation[]) {
  const vide = JSON.stringify(NOTATIONS_DEFAUT);
  const code = JSON.stringify(lignes);
  if (code !== vide) q.set("nt", code);
}
