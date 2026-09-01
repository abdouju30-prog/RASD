import indexONSSA from "../data/onssa.json";
import caFile from "../data/ca.json";
import { ficheDe } from "./reglementaire";
import { ansesPour } from "./ephy";
import type {
  FicheAnses,
  Fournisseur,
  IndexONSSA,
  MatiereActive,
  MatiereMarche,
  ProduitPortefeuille,
} from "./types";

// ────────────────────────────────────────────────────────────────────────────
// Source unique de vérité : data/onssa.json, produit par
//     python scripts/import_onssa.py "<FICHIERS PHYTO.xlsx>"
// Rien n'est saisi en dur ici. Le chiffre d'affaires, absent de la source,
// vient de data/ca.json et reste optionnel.
// ────────────────────────────────────────────────────────────────────────────

const IDX = indexONSSA as unknown as IndexONSSA;

export const META = IDX.meta;
export const FOURNISSEURS: Fournisseur[] = IDX.fournisseurs;

const CA: Record<string, number> = (caFile.ca ?? {}) as Record<string, number>;

export const PORTEFEUILLE: ProduitPortefeuille[] = IDX.portefeuille.map((p) => ({
  ...p,
  caAnnuel: CA[p.id] ?? null,
}));

const FOURNISSEUR_PAR_NOM = new Map(FOURNISSEURS.map((f) => [f.nom, f]));
export function fournisseurParNom(nom: string): Fournisseur | undefined {
  return FOURNISSEUR_PAR_NOM.get(nom);
}

const PRODUITS_PAR_MA = new Map<string, ProduitPortefeuille[]>();
for (const p of PORTEFEUILLE) {
  for (const id of p.matieresActivesIds) {
    const l = PRODUITS_PAR_MA.get(id) ?? [];
    l.push(p);
    PRODUITS_PAR_MA.set(id, l);
  }
}

/**
 * Toutes les matières actives de l'index ONSSA, enrichies de :
 *  • leur fiche d'expertise (statut UE), quand elle existe — 23 molécules ;
 *  • leur statut ANSES lu dans E-Phy, pour toute molécule appariable.
 *
 * L'appariement E-Phy se fait sur le nom complet ONSSA plutôt que sur la
 * molécule de la fiche : il couvre ainsi l'index entier, pas seulement le
 * périmètre déjà documenté à la main.
 */
export const MATIERES: MatiereActive[] = IDX.matieres.map((m: MatiereMarche) => {
  const fiche = ficheDe(m.nom);
  const lu = ansesPour(m.nom);
  const anses: FicheAnses | null =
    lu && lu.statut !== "inconnu"
      ? { statut: lu.statut, dateRetrait: lu.dateRetrait, deduit: false, source: lu.source }
      : fiche?.anses && fiche.anses.statut !== "inconnu"
      ? fiche.anses
      : null;
  return {
    ...m,
    fiche,
    anses,
    ansesAppariement: lu ? { substance: lu.substance, methode: lu.methode } : null,
    produitsDetenteur: PRODUITS_PAR_MA.get(m.id) ?? [],
  };
});

const MATIERE_PAR_ID = new Map(MATIERES.map((m) => [m.id, m]));
export function getMatiere(id: string): MatiereActive | undefined {
  return MATIERE_PAR_ID.get(id);
}

/** Les seules matières actives que le détenteur exploite réellement. */
export const MATIERES_PORTEFEUILLE: MatiereActive[] = MATIERES.filter(
  (m) => m.produitsDetenteur.length > 0
).sort((a, b) => a.nom.localeCompare(b.nom, "fr"));

export const PRODUIT_PAR_ID = new Map(PORTEFEUILLE.map((p) => [p.id, p]));

/** Nombre d'usages détenus par le portefeuille pour une matière active. */
export function usagesDetenteur(maId: string): number {
  return (PRODUITS_PAR_MA.get(maId) ?? []).reduce((s, p) => s + p.usages.length, 0);
}

export const CA_RENSEIGNE = Object.keys(CA).length > 0;
export const CA_EXERCICE = caFile.exercice as string | null;
