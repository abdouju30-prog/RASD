import { FOURNISSEURS, MATIERES, fournisseurParNom, matieresDe } from "./data";
import { detailRisque } from "./logic";
import type { CandidatSourcing, Fournisseur, MatiereActive, VoieReglementaire } from "./types";

// ────────────────────────────────────────────────────────────────────────────
// PROSPECTION DE MATIÈRES ACTIVES À IMPORTER
//
// Principe : une matière active vaut la peine d'être importée quand elle réunit
// quatre conditions, toutes lisibles dans l'index ONSSA :
//
//   1. Marché large      — beaucoup d'usages et de cultures homologués
//   2. Concurrence faible— peu de détenteurs d'AMM sur cette M.A. au Maroc
//   3. Sourcing possible — au moins un fournisseur générique (Inde, Chine,
//                          Russie, Mexique, Colombie, Turquie…) DÉJÀ référencé
//                          à l'ONSSA sur cette M.A.
//   4. Avenir dégagé     — toujours autorisée en France. L'ONSSA s'alignant sur
//                          l'ANSES, une molécule retirée en France est écartée
//                          d'office : le dossier serait condamné d'avance.
//
// La condition 3 est la plus importante et la moins évidente : un fournisseur
// déjà référencé à l'ONSSA a, par définition, déjà constitué le dossier
// technique accepté par l'administration marocaine pour cette matière active.
// C'est ce qui transforme une homologation de 3 ans en dossier « me-too ».
//
// ⚠️ AUCUN PRIX ne figure dans l'index ONSSA. Le module ne classe donc pas par
// prix mais par *accessibilité* : nombre de fournisseurs génériques en
// concurrence sur la molécule. Les prix réels se saisissent après consultation.
// ────────────────────────────────────────────────────────────────────────────

export const PAYS_CIBLES = [
  "Inde",
  "Chine",
  "Russie",
  "Mexique",
  "Colombie",
  "Turquie",
  "Brésil",
  "Taïwan",
  "Chili",
  "Jordanie",
  "Singapour",
] as const;

export interface FiltresSourcing {
  /** Ne garder que les M.A. ayant au plus ce nombre de détenteurs au Maroc. */
  maxDetenteurs?: number;
  /** Ne garder que les M.A. sourçables depuis l'un de ces pays. */
  pays?: string[];
  /** Catégorie ONSSA (Insecticide, Fongicide, Herbicide…). */
  categorie?: string | null;
  /** Exclure les molécules dont le risque réglementaire dépasse ce score.
   *  Indépendant du retrait ANSES, qui écarte la cible quel que soit le score. */
  risqueMax?: number;
  /** Exclure les M.A. déjà présentes au portefeuille de ce détenteur. */
  detenteurId?: string;
}

function fournisseursDe(ma: MatiereActive): Fournisseur[] {
  return ma.fournisseurs
    .map((n) => fournisseurParNom(n))
    .filter((f): f is Fournisseur => Boolean(f));
}

/**
 * La voie réglementaire découle d'un seul fait : la molécule est-elle déjà
 * homologuée au Maroc ? Toute M.A. présente à l'index l'est par construction,
 * ce qui ouvre la voie « me-too » (dossier par référence, bien plus court).
 * Une molécule absente de l'index relèverait d'une homologation complète —
 * l'index ne permet pas de les énumérer, elles se prospectent hors outil.
 */
function voieDe(ma: MatiereActive): VoieReglementaire {
  return ma.nbHomologations > 0 ? "me_too" : "nouvelle_substance";
}

export function candidat(ma: MatiereActive): CandidatSourcing {
  const fournisseurs = fournisseursDe(ma);
  const coutFaible = fournisseurs.filter((f) => f.coutFaible);
  const risque = detailRisque(ma);

  const facteurs: { libelle: string; points: number }[] = [];
  const add = (libelle: string, points: number) => {
    if (points !== 0) facteurs.push({ libelle, points: Math.round(points * 10) / 10 });
  };

  const nbUsages = ma.usages.length;
  const nbCultures = ma.cultures.length;
  const nbDetenteurs = ma.detenteurs.length;

  add(`${nbUsages} usages homologués`, nbUsages * 2);
  add(`${nbCultures} cultures couvertes`, nbCultures);
  add(`${ma.nbHomologations} homologations sur le marché`, ma.nbHomologations * 0.5);
  add(`${nbDetenteurs} détenteur(s) déjà en place`, -nbDetenteurs * 3);

  if (coutFaible.length >= 1) {
    add(`Fournisseur générique référencé ONSSA (${coutFaible[0].pays})`, 15);
  }
  if (coutFaible.length >= 2) {
    add(`${coutFaible.length} fournisseurs génériques en concurrence`, 8);
  }
  if (coutFaible.length === 0 && fournisseurs.some((f) => f.multinationale)) {
    add("Aucun générique — fournisseurs multinationaux uniquement", -12);
  }
  if (fournisseurs.length === 0) {
    add("Aucun fournisseur identifié à l'index", -8);
  }

  if (ma.anses?.statut === "retirée") {
    add("Retirée en France — l'ONSSA suivra", -50);
  } else if (ma.anses?.statut === "en_retrait") {
    add("Aucun produit autorisé en France", -20);
  } else if (ma.anses?.statut === "autorisée") {
    add("Toujours autorisée en France", 6);
  }

  if (risque) {
    if (risque.niveau === "critique") add("Molécule en risque réglementaire critique", -40);
    else if (risque.niveau === "élevé") add("Molécule en risque réglementaire élevé", -25);
    else if (risque.niveau === "modéré") add("Molécule en risque réglementaire modéré", -8);
  }

  const score = Math.round(facteurs.reduce((s, f) => s + f.points, 0));

  return {
    id: ma.id,
    nom: ma.nom,
    molecule: ma.molecule,
    categorie: ma.categorie,
    cibles: ma.cibles,
    cultures: ma.cultures,
    usages: ma.usages,
    detenteurs: ma.detenteurs,
    nbDetenteurs,
    nbUsages,
    nbCultures,
    nbHomologations: ma.nbHomologations,
    fournisseurs,
    fournisseursCoutFaible: coutFaible,
    paysSourcing: [...new Set(coutFaible.map((f) => f.pays).filter((p): p is string => Boolean(p)))],
    voie: voieDe(ma),
    score,
    facteurs: facteurs.sort((a, b) => Math.abs(b.points) - Math.abs(a.points)),
    risque: risque?.niveau ?? null,
    scoreRisque: risque?.score ?? null,
    statutAnses: ma.anses?.statut ?? null,
    ansesRetiree: ma.anses?.statut === "retirée",
  };
}

export function candidats(f: FiltresSourcing = {}): CandidatSourcing[] {
  const { maxDetenteurs = 3, pays, categorie, risqueMax = 55, detenteurId } = f;

  const base = detenteurId ? matieresDe(detenteurId) : MATIERES;

  return base.filter((ma) => {
    if (detenteurId && ma.produitsDetenteur.length > 0) return false;
    if (ma.detenteurs.length > maxDetenteurs) return false;
    if (categorie && ma.categorie !== categorie) return false;
    return true;
  })
    .map(candidat)
    .filter((c) => {
      if (c.fournisseursCoutFaible.length === 0) return false;
      if (pays && pays.length && !c.paysSourcing.some((p) => pays.includes(p))) return false;
      // Disqualification catégorique, pas affaire de seuil : l'ONSSA s'alignant
      // sur l'ANSES, importer une molécule déjà retirée en France revient à
      // monter un dossier condamné d'avance.
      if (c.ansesRetiree) return false;
      if (c.scoreRisque !== null && c.scoreRisque > risqueMax) return false;
      return true;
    })
    .sort((a, b) => b.score - a.score);
}

export function candidatParId(id: string): CandidatSourcing | null {
  const ma = MATIERES.find((m) => m.id === id);
  return ma ? candidat(ma) : null;
}

export function categoriesDisponibles(): string[] {
  return [...new Set(MATIERES.map((m) => m.categorie).filter((c): c is string => Boolean(c)))].sort();
}

export function statsSourcing() {
  const generiques = FOURNISSEURS.filter((f) => f.coutFaible);
  const parPays = new Map<string, number>();
  for (const f of generiques) {
    if (f.pays) parPays.set(f.pays, (parPays.get(f.pays) ?? 0) + 1);
  }
  return {
    nbFournisseurs: FOURNISSEURS.length,
    nbGeneriques: generiques.length,
    parPays: [...parPays.entries()].sort((a, b) => b[1] - a[1]),
    nbPaysInconnus: FOURNISSEURS.filter((f) => !f.pays).length,
  };
}

/** Fournisseurs génériques d'un pays donné, les plus référencés d'abord. */
export function fournisseursDuPays(pays: string): Fournisseur[] {
  return FOURNISSEURS.filter((f) => f.pays === pays).sort(
    (a, b) => b.nbLignesMaroc - a.nbLignesMaroc
  );
}
