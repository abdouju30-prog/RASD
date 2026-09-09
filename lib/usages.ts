import { MATIERES, PRODUITS } from "./data";
import { molecules } from "./formulation";
import type { MatiereActive } from "./types";

// ────────────────────────────────────────────────────────────────────────────
// LE SPECTRE D'UNE MATIÈRE ACTIVE — toutes ses cultures, tous ses parasites
//
// La fiche d'une matière active montrait les usages du seul détenteur courant.
// C'était la mauvaise question : ce qu'on veut savoir, c'est SUR QUOI CETTE
// MOLÉCULE EST HOMOLOGUÉE AU MAROC, tous détenteurs confondus — c'est cela, son
// spectre d'emploi, et c'est cela qu'on compare entre deux molécules.
//
// ⚠️ AUCUN REGISTRE NE PUBLIE DE TAUX D'EFFICACITÉ.
// Ni l'ONSSA, ni l'ANSES, ni l'APVMA, ni le registre coréen, ni le brésilien.
// Les pourcentages d'efficacité viennent des essais biologiques du dossier
// d'homologation, qui sont confidentiels. Cet outil n'en invente aucun.
//
// CE QUE L'HOMOLOGATION PROUVE À LA PLACE, et ce n'est pas rien : une autorité
// n'homologue un usage qu'après examen des essais d'efficacité, de sélectivité
// et de phytotoxicité. « Homologué sur tomate contre le mildiou à 0,6 kg/ha,
// DAR 21 jours » EST l'énoncé réglementaire de l'efficacité. La dose et le DAR
// sont, eux, publiés et opposables — c'est le référentiel qui sert à défendre
// un usage revendiqué devant l'ONSSA.
//
// Un taux mesuré n'entre ici que par data/efficacite.json, saisi à la main
// depuis vos propres essais ou la fiche technique d'un fournisseur, avec sa
// source et sa date. Déclaratif, et affiché comme tel.
// ────────────────────────────────────────────────────────────────────────────

export interface Emploi {
  culture: string;
  cible: string;
  /** Doses relevées à l'index — plusieurs quand les produits diffèrent. */
  doses: string[];
  /** Délais avant récolte, en jours, tels qu'écrits à l'index. */
  dar: string[];
  nbApplications: string[];
  /** Produits marocains qui portent cet usage. */
  produits: string[];
  detenteurs: string[];
}

export interface Spectre {
  molecules: string[];
  emplois: Emploi[];
  cultures: string[];
  cibles: string[];
  nbProduits: number;
  nbDetenteurs: number;
  /** Emplois du détenteur courant — ce qu'il revendique déjà. */
  vosEmplois: Set<string>;
}

const cle = (culture: string, cible: string) => `${culture} / ${cible}`;

/**
 * Tous les emplois homologués au Maroc pour les molécules d'une ligne d'index.
 *
 * On part des molécules, pas de la ligne : une matière active vendue en mélange
 * est homologuée sur des usages que la ligne pure ne porte pas, et ce sont bien
 * des usages de la molécule.
 */
export function spectreDe(ma: MatiereActive, detenteurId: string): Spectre {
  const cibles = new Set(molecules(ma.nom, ma.molecule));

  const lignes = new Set<string>();
  for (const l of MATIERES) {
    if (molecules(l.nom, l.molecule).some((m) => cibles.has(m))) lignes.add(l.id);
  }

  const par = new Map<string, Emploi>();
  const produits = new Set<string>();
  const detenteurs = new Set<string>();
  const vosEmplois = new Set<string>();

  for (const p of PRODUITS) {
    if (!p.matieresActivesIds.some((id) => lignes.has(id))) continue;
    produits.add(p.nomCommercial);
    detenteurs.add(p.detenteur);

    for (const u of p.usages) {
      if (!u.culture || !u.cible) continue;
      const k = cle(u.culture, u.cible);
      if (p.detenteurId === detenteurId) vosEmplois.add(k);

      const e =
        par.get(k) ??
        ({
          culture: u.culture,
          cible: u.cible,
          doses: [],
          dar: [],
          nbApplications: [],
          produits: [],
          detenteurs: [],
        } as Emploi);

      // Les doses reviennent écrites de plusieurs façons — « 50 cc/hl » et
      // « 50cc/hl ». On garde chaque libellé tel quel : l'index fait foi, et
      // normaliser une dose serait la réécrire.
      const pousser = (l: string[], v: string | null) => {
        const x = (v ?? "").trim();
        if (x && !l.includes(x)) l.push(x);
      };
      pousser(e.doses, u.dose);
      pousser(e.dar, u.dar);
      pousser(e.nbApplications, u.nbAppl);
      if (!e.produits.includes(p.nomCommercial)) e.produits.push(p.nomCommercial);
      if (!e.detenteurs.includes(p.detenteur)) e.detenteurs.push(p.detenteur);
      par.set(k, e);
    }
  }

  const emplois = [...par.values()].sort(
    (a, b) =>
      b.produits.length - a.produits.length ||
      a.culture.localeCompare(b.culture, "fr") ||
      a.cible.localeCompare(b.cible, "fr")
  );

  return {
    molecules: [...cibles].sort(),
    emplois,
    cultures: [...new Set(emplois.map((e) => e.culture))].sort((a, b) => a.localeCompare(b, "fr")),
    cibles: [...new Set(emplois.map((e) => e.cible))].sort((a, b) => a.localeCompare(b, "fr")),
    nbProduits: produits.size,
    nbDetenteurs: detenteurs.size,
    vosEmplois,
  };
}

/** Emplois regroupés par culture — la lecture qu'attend un agronome. */
export function parCulture(s: Spectre): { culture: string; emplois: Emploi[] }[] {
  const par = new Map<string, Emploi[]>();
  for (const e of s.emplois) {
    const l = par.get(e.culture) ?? [];
    l.push(e);
    par.set(e.culture, l);
  }
  return [...par.entries()]
    .map(([culture, emplois]) => ({ culture, emplois }))
    .sort((a, b) => b.emplois.length - a.emplois.length || a.culture.localeCompare(b.culture, "fr"));
}

/** Emplois regroupés par parasite — la lecture qu'attend un commercial. */
export function parCible(s: Spectre): { cible: string; emplois: Emploi[] }[] {
  const par = new Map<string, Emploi[]>();
  for (const e of s.emplois) {
    const l = par.get(e.cible) ?? [];
    l.push(e);
    par.set(e.cible, l);
  }
  return [...par.entries()]
    .map(([cible, emplois]) => ({ cible, emplois }))
    .sort((a, b) => b.emplois.length - a.emplois.length || a.cible.localeCompare(b.cible, "fr"));
}
