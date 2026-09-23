import fichier from "../data/registres-ouverts.json";

export interface SocieteRegistre {
  nom: string;
  nb: number;
  matieres: string[];
}

export interface RegistreOuvert {
  id: string;
  pays: string;
  autorite: string;
  url: string;
  page: string;
  nomme: string;
  avertissement: string;
  nbProduits: number;
  nbSocietes: number;
  societes: SocieteRegistre[];
}

interface Fichier {
  meta: { genere: string; releve: string; avertissement: string };
  registres: RegistreOuvert[];
}

const DATA = fichier as Fichier;

export const META_REGISTRES_OUVERTS = DATA.meta;
export const REGISTRES_OUVERTS: RegistreOuvert[] = DATA.registres;

export function registreOuvert(id: string): RegistreOuvert | null {
  return REGISTRES_OUVERTS.find((r) => r.id === id) ?? null;
}

function norm(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function radical(s: string): string {
  return s.length >= 5 ? s.replace(/e$/, "") : s;
}

function matiereProche(matiere: string, cibles: string[]): boolean {
  const x = norm(matiere);
  if (x.length < 3) return false;
  return cibles.some((c) => {
    if (x.includes(c) || c.includes(x)) return true;
    const rx = radical(x);
    const rc = radical(c);
    return rx.length >= 5 && (x.includes(rc) || c.includes(rx));
  });
}

/** Sociétés du registre. Une matière active filtre les lignes qui la portent. */
export function societesDuRegistre(
  id: string,
  q: string | null,
  molecules: string[] = []
): SocieteRegistre[] {
  const r = registreOuvert(id);
  if (!r) return [];
  const cibles = (molecules.length ? molecules : [])
    .map(norm)
    .filter((s) => s.length >= 3);
  if (cibles.length) {
    return r.societes.filter((s) => s.matieres.some((m) => matiereProche(m, cibles)));
  }
  const n = norm(q ?? "");
  if (!n) return r.societes;
  return r.societes.filter((s) => norm(s.nom).includes(n));
}
