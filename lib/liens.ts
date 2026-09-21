import { apparierApvma, constituantParNom, type ConstituantApvma } from "./apvma";
import { MATIERES } from "./data";
import { base, molecules } from "./formulation";
import type { MatiereActive } from "./types";

// ────────────────────────────────────────────────────────────────────────────
// RETROUVER LA FICHE D'UNE MOLÉCULE À PARTIR DE SON NOM
//
// Les écrans citent des molécules sous des graphies différentes — « 2,4-D » ici,
// « 2,4-D -sel d'amine » là, « Azoxystrobin » côté registre étranger. Ce module
// ramène chacune à une ligne d'index, ou à rien.
//
// ⚠️ ON PRÉFÈRE LA LIGNE PURE. Cliquer sur « azoxystrobine » doit ouvrir la
// fiche de l'azoxystrobine seule, pas celle du mélange où elle apparaît. À
// pureté égale, la ligne qui porte le plus de produits gagne : c'est la plus
// représentative.
//
// ⚠️ AUCUN LIEN ONSSA INVENTÉ. Un nom absent de l'index marocain ne produit
// pas de fiche /matieres — les molécules de la sentinelle, absentes du Maroc
// par définition, n'ont pas d'AMM et ne doivent pas faire croire le contraire.
// Elles peuvent en revanche ouvrir la fiche PUBCRIS, qui ne dit rien du Maroc.
// ────────────────────────────────────────────────────────────────────────────

function normaliser(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Radicaux des mots d'un nom : le « e » final tombe, comme dans lib/requete.ts. */
function radicaux(s: string): string[] {
  return normaliser(s)
    .split(" ")
    .filter((m) => m.length >= 4)
    .map((m) => m.replace(/e$/, ""));
}

/** Le nom entier, réduit — « Emamectin benzoate » -> « emamectin benzoat ». */
function radical(s: string): string {
  return radicaux(s).join(" ");
}

type Rang = { id: string; pure: boolean; primaire: boolean; nb: number };

function rangMieux(actuel: Rang | undefined, candidat: Rang): boolean {
  if (!actuel) return true;
  if (candidat.pure !== actuel.pure) return candidat.pure;
  if (candidat.primaire !== actuel.primaire) return candidat.primaire;
  return candidat.nb > actuel.nb;
}

const INDEX = new Map<string, string>();
const PAR_RADICAL = new Map<string, string>();

(() => {
  // Chaque molécule pointe vers la meilleure ligne qui la porte.
  const par = new Map<string, Rang>();
  for (const ma of MATIERES) {
    const comp = molecules(ma.nom, ma.molecule);
    const pure = comp.length === 1;
    for (const mol of comp) {
      const cle = normaliser(mol);
      const candidat: Rang = {
        id: ma.id,
        pure,
        primaire: normaliser(comp[0]) === cle,
        nb: ma.produits.length,
      };
      if (rangMieux(par.get(cle), candidat)) par.set(cle, candidat);
    }
  }
  for (const [cle, v] of par) {
    INDEX.set(cle, v.id);
    // ⚠️ CHAQUE MOT EST INDEXÉ, PAS SEULEMENT LE NOM ENTIER. L'index écrit
    // « Emamectin benzoate » ; on tape « emamectine ». Sans le mot seul, le
    // rapprochement échouait sur toute une famille de sels et d'esters.
    const r = radical(cle);
    if (r && !PAR_RADICAL.has(r)) PAR_RADICAL.set(r, v.id);
    for (const mot of radicaux(cle)) {
      if (!PAR_RADICAL.has(mot)) PAR_RADICAL.set(mot, v.id);
    }
  }
})();

/**
 * Inverse de `apparierApvma` : nom PUBCRIS / ISO anglais -> ligne ONSSA.
 *
 * « PIRIMICARB » ne partage aucun radical avec « Pyrimicarbe » ; « SULPHUR »
 * aucun avec « Soufre ». Sans cette table, le terrain commun australien
 * restait du texte mort. On n'invente rien : on retourne le pont déjà établi
 * dans l'autre sens. On apparie composant par composant — un mélange
 * Aclonifène / Diflufénican ne doit pas voler l'identité du diflufénican.
 */
const APVMA_VERS_ONSSA = new Map<string, string>();
(() => {
  const par = new Map<string, Rang>();
  for (const ma of MATIERES) {
    const comp = molecules(ma.nom, ma.molecule);
    const pure = comp.length === 1;
    for (const mol of comp) {
      const c = apparierApvma(mol);
      if (!c) continue;
      const cle = normaliser(c.nom);
      const candidat: Rang = {
        id: ma.id,
        pure,
        primaire: normaliser(comp[0]) === normaliser(mol),
        nb: ma.produits.length,
      };
      if (rangMieux(par.get(cle), candidat)) par.set(cle, candidat);
    }
  }
  for (const [cle, v] of par) APVMA_VERS_ONSSA.set(cle, v.id);
})();

const MATIERE_PAR_ID = new Map(MATIERES.map((m) => [m.id, m]));

/** Nom à afficher : le composant qui correspond, pas le premier d'un mélange. */
function libellePour(nom: string, ma: MatiereActive): string {
  const comps = molecules(ma.nom, ma.molecule);
  if (comps.length === 0) return ma.molecule || nom;
  if (comps.length === 1) return comps[0];
  const n = normaliser(nom);
  const r = radical(nom);
  for (const c of comps) {
    if (normaliser(c) === n || radical(c) === r) return c;
  }
  const iso = constituantParNom(nom);
  if (iso) {
    for (const c of comps) {
      const ap = apparierApvma(c);
      if (ap && normaliser(ap.nom) === normaliser(iso.nom)) return c;
    }
  }
  return comps[0];
}

/**
 * Identifiant de la fiche d'une molécule, ou null.
 *
 * Quatre passes, de la plus sûre à la plus permissive : le nom tel quel, le nom
 * débarrassé de son sel ou de son ester, le radical — qui réunit « emamectine »
 * et « Emamectin benzoate » — puis l'inverse du pont APVMA, pour les graphies
 * ISO que le radical ne rattrape pas (« PIRIMICARB », « SULPHUR »).
 */
export function idMatiere(nom: string | null | undefined): string | null {
  const n = (nom ?? "").trim();
  if (n.length < 3) return null;
  return (
    INDEX.get(normaliser(n)) ??
    INDEX.get(normaliser(base(n))) ??
    PAR_RADICAL.get(radical(n)) ??
    // Dernier recours : un mot unique, s'il suffit à désigner la molécule.
    (radicaux(n).length === 1 ? PAR_RADICAL.get(radicaux(n)[0]) ?? null : null) ??
    APVMA_VERS_ONSSA.get(normaliser(n)) ??
    null
  );
}

/** La molécule est-elle homologuée au Maroc ? */
export function auMaroc(nom: string | null | undefined): boolean {
  return idMatiere(nom) !== null;
}

export interface FicheNom {
  /** Ligne d'index ONSSA, si la molécule y figure. */
  id: string | null;
  /** Libellé à afficher : français d'index, sinon le nom fourni. */
  libelle: string;
  /** Fiche qu'on sait tenir : /matieres, /constituants, ou rien. */
  href: string | null;
  /** Infobulle : ISO, statut AU, ANSES, AMM Maroc. */
  titre: string;
  constituant: ConstituantApvma | null;
  matiere: MatiereActive | null;
}

/**
 * Ce qu'il faut pour rendre un nom de matière cliquable, avec de l'information.
 *
 * Le tableau fournisseur australien cite des ISO anglais. Sans cette fonction,
 * l'utilisateur voyait « ABAMECTIN » en texte mort. On lui rend le nom
 * français, le statut des deux côtés, et un lien qui mène quelque part.
 */
export function ficheNom(nom: string): FicheNom {
  const id = idMatiere(nom);
  const matiere = (id && MATIERE_PAR_ID.get(id)) || null;
  const constituant = constituantParNom(nom) ?? (matiere ? apparierApvma(matiere.nom) : null);
  const libelle = matiere ? libellePour(nom, matiere) : nom;
  const bits: string[] = [];
  if (constituant && constituant.nom.toLowerCase() !== libelle.toLowerCase()) {
    bits.push(constituant.nom);
  }
  if (constituant) {
    bits.push(`Australie ${constituant.statut}`);
    bits.push(`${constituant.nbProduitsAgricoles} produit(s) PUBCRIS`);
  }
  if (matiere?.anses && matiere.anses.statut !== "inconnu") {
    bits.push(`ANSES ${matiere.anses.statut.replace(/_/g, " ")}`);
  }
  if (matiere) bits.push(`${matiere.nbHomologations} AMM Maroc`);
  if (matiere?.categorie) bits.push(matiere.categorie);
  const href = id ? `/matieres/${id}` : constituant ? `/constituants/${constituant.id}` : null;
  return {
    id,
    libelle,
    href,
    titre: bits.join(" · ") || libelle,
    constituant,
    matiere,
  };
}
