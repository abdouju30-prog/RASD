import fichier from "../data/ephy-usages.json";
import { apparierApvma } from "./apvma";
import { molecules } from "./formulation";
import type { MatiereActive } from "./types";

// ────────────────────────────────────────────────────────────────────────────
// LES USAGES FRANÇAIS (E-Phy) À CÔTÉ DES ENREGISTREMENTS ONSSA
//
// /usages ne montrait que l'index marocain. Pour une maladie, une culture ou
// une matière active, on veut aussi ce que la France autorise : c'est le
// statut de référence de l'ONSSA et une source d'idées de produits.
//
// ⚠️ LA FRANCE N'EST PAS LE MAROC. Un usage E-Phy n'est jamais présenté comme
// une homologation marocaine : il a son propre bloc, sa propre source (Anses,
// licence ouverte) et son propre vocabulaire — « Mildiou(s) », « Cucurbitacées
// à peau comestible » — qui n'est pas celui de l'ONSSA. Le rapprochement se
// fait sur le texte, pas sur une table d'équivalence : mieux vaut un usage
// manquant qu'un usage faussement rapproché.
// ────────────────────────────────────────────────────────────────────────────

export interface UsageFrance {
  p: string; a: string; t: string; s: string; f: string;
  c: string; tr: string; k: string; d: string; dar: string; n: string;
  e: "autorise" | "retrait";
}

const USAGES = (fichier as { usages: UsageFrance[] }).usages;
export const ATTRIBUTION_EPHY = (fichier as { attribution: string }).attribution;

function norm(s: string): string {
  return s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/** « mancozèbe » -> « mancozeb » : le e final tombe, comme ailleurs dans l'outil. */
function radical(s: string): string {
  return norm(s).replace(/e$/, "");
}

const INDEX = USAGES.map((u) => ({ u, c: norm(u.c), k: norm(u.k), s: norm(u.s), t: norm(u.t) }));

export interface FiltreFrance {
  culture: string | null;
  cible: string | null;
  matiere: MatiereActive | null;
  societe: string | null;
  statut: "tous" | "vigueur" | "expire";
}

/** Noms sous lesquels la France connaît la matière : français, ISO anglais. */
function nomsMatiere(m: MatiereActive): string[] {
  const noms = new Set<string>();
  for (const mol of molecules(m.nom, m.molecule)) {
    const base = mol.split(/\s+-\s+/)[0];
    for (const n of [mol, base]) if (radical(n).length >= 4) noms.add(radical(n));
    const iso = apparierApvma(mol);
    if (iso && radical(iso.nom).length >= 4) noms.add(radical(iso.nom));
  }
  return [...noms];
}

export function usagesFrance(
  f: FiltreFrance,
  max = 120
): { total: number; lignes: UsageFrance[]; nbProduits: number } {
  const cu = f.culture ? norm(f.culture) : null;
  const ci = f.cible ? norm(f.cible) : null;
  const so = f.societe ? norm(f.societe) : null;
  const mats = f.matiere ? nomsMatiere(f.matiere) : null;
  if (mats && mats.length === 0) return { total: 0, lignes: [], nbProduits: 0 };

  const trouves = INDEX.filter((x) => {
    if (cu && !x.c.includes(cu)) return false;
    if (ci && !x.k.includes(ci)) return false;
    if (so && !x.t.includes(so)) return false;
    if (mats && !mats.some((m) => x.s.includes(m))) return false;
    if (f.statut === "vigueur" && x.u.e !== "autorise") return false;
    if (f.statut === "expire" && x.u.e !== "retrait") return false;
    return true;
  }).map((x) => x.u);

  trouves.sort((a, b) => a.p.localeCompare(b.p, "fr") || a.c.localeCompare(b.c, "fr"));
  return {
    total: trouves.length,
    lignes: trouves.slice(0, max),
    nbProduits: new Set(trouves.map((u) => u.a)).size,
  };
}
