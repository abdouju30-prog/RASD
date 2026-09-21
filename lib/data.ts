import indexONSSA from "../data/onssa.json";
import caFile from "../data/ca.json";
import { ficheDe } from "./reglementaire";
import { ansesPour } from "./ephy";
import type {
  Detenteur,
  FicheAnses,
  Fournisseur,
  IndexONSSA,
  MatiereActive,
  MatiereMarche,
  ProduitPortefeuille,
} from "./types";

// ────────────────────────────────────────────────────────────────────────────
// Source unique de vérité : data/onssa.json, produit par
//     python scripts/import_onssa_indpesticide.py
// (Excel FICHIERS PHYTO.xlsx via import_onssa.py reste un secours hors ligne.)
//
// L'outil couvre les 75 détenteurs de l'index, pas un seul. Tout ce qui dépend
// du détenteur est donc une FONCTION de son identifiant, pas une constante :
// le détenteur courant est choisi à l'écran et lu par requête.
//
// Le chiffre d'affaires, absent de la source, reste optionnel (data/ca.json).
// ────────────────────────────────────────────────────────────────────────────

const IDX = indexONSSA as unknown as IndexONSSA;

export const META = IDX.meta;
export const FOURNISSEURS: Fournisseur[] = IDX.fournisseurs;
export const DETENTEURS: Detenteur[] = IDX.detenteurs;

const CA: Record<string, number> = (caFile.ca ?? {}) as Record<string, number>;

/** Les 1 413 produits de l'index, tous détenteurs confondus. */
export const PRODUITS: ProduitPortefeuille[] = IDX.portefeuille.map((p) => ({
  ...p,
  caAnnuel: CA[p.id] ?? null,
}));

const FOURNISSEUR_PAR_NOM = new Map(FOURNISSEURS.map((f) => [f.nom, f]));
export function fournisseurParNom(nom: string): Fournisseur | undefined {
  return FOURNISSEUR_PAR_NOM.get(nom);
}

const DETENTEUR_PAR_ID = new Map(DETENTEURS.map((d) => [d.id, d]));

/** Détenteur par identifiant, ou celui par défaut si l'identifiant est inconnu. */
export function detenteurParId(id: string | undefined | null): Detenteur {
  if (id) {
    const d = DETENTEUR_PAR_ID.get(id);
    if (d) return d;
  }
  return (
    DETENTEURS.find((d) => d.nom === META.detenteurDefaut) ?? DETENTEURS[0]
  );
}

// ── Index par détenteur ─────────────────────────────────────────────────────

const PRODUITS_PAR_DETENTEUR = new Map<string, ProduitPortefeuille[]>();
for (const p of PRODUITS) {
  const l = PRODUITS_PAR_DETENTEUR.get(p.detenteurId) ?? [];
  l.push(p);
  PRODUITS_PAR_DETENTEUR.set(p.detenteurId, l);
}

export function produitsDe(detenteurId: string): ProduitPortefeuille[] {
  return PRODUITS_PAR_DETENTEUR.get(detenteurId) ?? [];
}

// ── Matières actives ────────────────────────────────────────────────────────
//
// La partie coûteuse — fiche d'expertise et appariement E-Phy — ne dépend pas
// du détenteur : elle est calculée une fois, au chargement du module. Seul le
// rattachement aux produits est refait par détenteur, et mis en cache.

const MATIERES_BASE = IDX.matieres.map((m: MatiereMarche) => {
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
  };
});

/** Toutes les matières actives de l'index, sans rattachement à un détenteur. */
export const MATIERES: MatiereActive[] = MATIERES_BASE.map((m) => ({
  ...m,
  produitsDetenteur: [],
}));

const MATIERE_PAR_ID = new Map(MATIERES.map((m) => [m.id, m]));

const CACHE_MATIERES = new Map<string, MatiereActive[]>();

/** Matières actives vues depuis un détenteur : produitsDetenteur est rempli. */
export function matieresDe(detenteurId: string): MatiereActive[] {
  const cache = CACHE_MATIERES.get(detenteurId);
  if (cache) return cache;

  const parMa = new Map<string, ProduitPortefeuille[]>();
  for (const p of produitsDe(detenteurId)) {
    for (const id of p.matieresActivesIds) {
      const l = parMa.get(id) ?? [];
      l.push(p);
      parMa.set(id, l);
    }
  }
  const out = MATIERES_BASE.map((m) => ({
    ...m,
    produitsDetenteur: parMa.get(m.id) ?? [],
  }));
  CACHE_MATIERES.set(detenteurId, out);
  return out;
}

/** Matière active enrichie du rattachement au détenteur courant. */
export function getMatiere(id: string, detenteurId?: string): MatiereActive | undefined {
  if (!detenteurId) return MATIERE_PAR_ID.get(id);
  return matieresDe(detenteurId).find((m) => m.id === id);
}

/** Les seules matières actives que le détenteur exploite réellement. */
export function matieresDuPortefeuille(detenteurId: string): MatiereActive[] {
  return matieresDe(detenteurId)
    .filter((m) => m.produitsDetenteur.length > 0)
    .sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
}

/** Nombre d'usages détenus par un détenteur pour une matière active. */
export function usagesDetenteur(maId: string, detenteurId: string): number {
  const m = matieresDe(detenteurId).find((x) => x.id === maId);
  return (m?.produitsDetenteur ?? []).reduce((s, p) => s + p.usages.length, 0);
}

export const CA_RENSEIGNE = Object.keys(CA).length > 0;
export const CA_EXERCICE = caFile.exercice as string | null;
