import { FOURNISSEURS, MATIERES } from "./data";
import { molecules } from "./formulation";
import { fabricantsBresiliens, type UsineBresil } from "./bresil";
import { USINES_CHINE, type UsineChinoise } from "./icama";
import { fabricantsCoreens, type SocieteCoreenne } from "./coree";
import { PRODUCTEURS_RUSSES, type SocieteRusse } from "./russie";
import { USINES_TURQUES, fabricantsTurcs, type UsineTurque } from "./bku";
import { apparierApvma } from "./apvma";
import { usinesDe } from "./epa";
import type { MatiereActive } from "./types";

// ────────────────────────────────────────────────────────────────────────────
// UNE RECHERCHE QUI COMPREND UNE MATIÈRE ACTIVE
//
// Taper « emamectine » dans l'écran fournisseurs ne donnait rien : le filtre ne
// comparait qu'à des raisons sociales. Or c'est la question qu'on se pose le
// plus souvent — QUI PEUT ME FOURNIR CETTE MOLÉCULE — et l'outil avait la
// réponse dans six registres sans jamais la relier à la barre de recherche.
//
// Ce module tranche la question une fois pour toutes : une requête est-elle un
// nom de matière active, ou autre chose ? Chaque écran s'en sert ensuite à sa
// façon — les fournisseurs qui la portent, les produits qui la contiennent,
// les associations où elle entre.
//
// ⚠️ LA RECONNAISSANCE EST TEXTUELLE, PAS CHIMIQUE. On cherche la requête dans
// les noms de molécules de l'index, sans passer par la clé chimique : celle-ci
// sert à rapprocher deux registres, pas à interpréter ce qu'un humain tape.
// Une requête qui ne ressemble à aucune molécule reste un filtre de texte,
// et c'est très bien ainsi.
// ────────────────────────────────────────────────────────────────────────────

import { normaliser as normaliserBase } from "./texte";

// Filtre plein texte : on conserve la ponctuation (pas de réduction alphanum).
const normaliser = (s: string) => normaliserBase(s, { collapse: false });

/**
 * Mots d'un nom, chacun ramené à son radical.
 *
 * ⚠️ LE « E » FINAL TOMBE. L'index écrit « Emamectin benzoate » en anglais et
 * « Azoxystrobine » en français : chercher « emamectine » ne trouvait rien,
 * alors que c'est exactement le mot qu'on tape. Retirer le e final des deux
 * côtés réunit les deux graphies.
 *
 * ⚠️ CE N'EST PAS LA CLÉ CHIMIQUE. Celle-ci rapproche deux registres et engage
 * une identité réglementaire ; ceci interprète ce qu'un humain tape dans une
 * barre de recherche. Les deux ne doivent jamais être confondues.
 */
function radicaux(s: string): string[] {
  return normaliser(s)
    .split(/[^a-z0-9]+/)
    .filter((m) => m.length >= 3)
    .map((m) => m.replace(/e$/, ""));
}

/**
 * Ce que l'outil sait fournir sur une matière active, registre par registre.
 *
 * ⚠️ ON REND LES SOCIÉTÉS, PAS DES COMPTEURS. Un écran qui ne reçoit qu'un
 * nombre doit refiltrer lui-même la liste complète pour retrouver lesquelles —
 * et chaque écran le referait à sa façon, donc mal. La sélection se fait ici,
 * une fois.
 */
export interface Gisement {
  /** Fournisseurs de l'index ONSSA qui la portent — la voie me-too. */
  fournisseursOnssa: string[];
  bresil: UsineBresil[];
  chine: UsineChinoise[];
  coree: SocieteCoreenne[];
  turquie: UsineTurque[];
  russie: SocieteRusse[];
  /** Sites EPA retrouvés au nom des fournisseurs ONSSA. */
  sitesEpa: number;
}

export interface Requete {
  /** Le texte tapé, tel quel. */
  texte: string;
  /** Molécules de l'index dont le nom contient la requête. */
  molecules: string[];
  /** Lignes d'index qui contiennent au moins une de ces molécules. */
  matieres: MatiereActive[];
  /** La requête désigne-t-elle une matière active de l'index ? */
  estMatiere: boolean;
  gisement: Gisement;
}

/** Toutes les molécules de l'index, mélanges décomposés. */
const MOLECULES: {
  nom: string;
  cle: string;
  mots: string[];
  lignes: MatiereActive[];
}[] = (() => {
  const par = new Map<string, MatiereActive[]>();
  for (const ma of MATIERES) {
    for (const mol of molecules(ma.nom, ma.molecule)) {
      const l = par.get(mol) ?? [];
      l.push(ma);
      par.set(mol, l);
    }
  }
  return [...par.entries()]
    .map(([nom, lignes]) => ({ nom, cle: normaliser(nom), mots: radicaux(nom), lignes }))
    .sort((a, b) => b.lignes.length - a.lignes.length);
})();

/** Ajoute sans doublon, la clé étant le nom qui fait foi au registre. */
function ajouter<T>(cible: Map<string, T>, cle: string, valeur: T) {
  if (!cible.has(cle)) cible.set(cle, valeur);
}

/**
 * Nom ISO d'une ligne d'index.
 *
 * C'est le pivot de tout l'outil : les annuaires chinois, turc et russe
 * repèrent leurs matières actives par nom ISO anglais. `apparierApvma` est la
 * seule et unique règle de traduction — on ne la réécrit pas ici.
 */
function isoDe(nom: string): string | null {
  return apparierApvma(nom)?.nom ?? null;
}

function gisementDe(molecules: typeof MOLECULES): Gisement {
  const fournisseurs = new Set<string>();
  const br = new Map<string, UsineBresil>();
  const kr = new Map<string, SocieteCoreenne>();
  const iso = new Set<string>();
  const idsTurcs = new Set<number | string>();

  for (const mol of molecules) {
    for (const ma of mol.lignes) for (const f of ma.fournisseurs) fournisseurs.add(f);

    // ⚠️ UNE SEULE INTERROGATION PAR MOLÉCULE. Une molécule revient sur
    // plusieurs lignes de l'index : interroger ligne à ligne comptait
    // l'azoxystrobine quatorze fois et annonçait 819 usines chinoises pour 65.
    // La ligne PURE est préférée à un mélange : elle s'apparie mieux.
    const ref = [...mol.lignes].sort((a, b) => {
      const pa = a.nom.includes("/") ? 1 : 0;
      const pb = b.nom.includes("/") ? 1 : 0;
      return pa - pb || b.produits.length - a.produits.length;
    })[0];
    if (!ref) continue;

    const n = isoDe(ref.nom);
    if (n) iso.add(n);
    for (const u of fabricantsBresiliens(ref.nom)?.usines ?? []) ajouter(br, u.id, u);
    for (const u of fabricantsCoreens(ref.nom)?.societes ?? []) ajouter(kr, u.cle, u);
    // ⚠️ LA TURQUIE NOMME SES MATIÈRES EN TURC. Son annuaire ne se filtre donc
    // pas sur un nom ISO : c'est `fabricantsTurcs` qui fait la traduction, et
    // on ne garde que les identifiants qu'il rend.
    for (const u of fabricantsTurcs(ref.nom)?.fabricants ?? []) idsTurcs.add(u.id);
  }

  // Les trois annuaires ci-dessous portent déjà, pour chaque société, les
  // matières actives de l'index qu'elle couvre — en nom ISO. On les lit, on ne
  // les réinterroge pas : c'est la même donnée, déjà rapprochée.
  const chine = USINES_CHINE.filter((u) => u.matieres.some((m) => iso.has(m)));
  const russie = PRODUCTEURS_RUSSES.filter((s) => s.matieres.some((m) => iso.has(m)));
  const turquie = USINES_TURQUES.filter((u) => idsTurcs.has(u.id));

  let epa = 0;
  for (const f of fournisseurs) epa += usinesDe(f)?.sites.length ?? 0;

  return {
    fournisseursOnssa: [...fournisseurs].sort(),
    bresil: [...br.values()],
    chine,
    coree: [...kr.values()],
    turquie,
    russie,
    sitesEpa: epa,
  };
}

/**
 * Interprète une requête libre.
 *
 * Retourne null pour une requête vide ou d'un seul caractère — en dessous de
 * deux lettres, tout ressemble à tout.
 */
export function resoudre(q: string | undefined | null): Requete | null {
  const texte = (q ?? "").trim();
  if (texte.length < 2) return null;
  const cle = normaliser(texte);

  // Trois passes, de la plus sûre à la plus permissive — jamais au-delà.
  //   1. égalité stricte : « soufre » ne doit pas ramener « Soufre micronisé » ;
  //   2. sous-chaîne : « strobine » ramène les strobilurines ;
  //   3. radicaux : « emamectine » retrouve « Emamectin benzoate ».
  const mots = radicaux(texte);
  const exact = MOLECULES.filter((m) => m.cle === cle);
  const sousChaine = exact.length ? exact : MOLECULES.filter((m) => m.cle.includes(cle));
  const trouvees =
    sousChaine.length || mots.length === 0
      ? sousChaine
      : MOLECULES.filter((m) => mots.every((r) => m.mots.some((x) => x.startsWith(r))));

  const lignes = new Map<string, MatiereActive>();
  for (const m of trouvees) for (const l of m.lignes) lignes.set(l.id, l);
  const matieres = [...lignes.values()];

  return {
    texte,
    molecules: trouvees.map((m) => m.nom),
    matieres,
    estMatiere: matieres.length > 0,
    gisement: gisementDe(trouvees),
  };
}

/** Le fournisseur porte-t-il l'une des matières actives de la requête ? */
export function porteLaMatiere(r: Requete | null, nomFournisseur: string): boolean {
  return r ? r.gisement.fournisseursOnssa.includes(nomFournisseur) : false;
}

/** Total des pistes étrangères — ce qu'il y a à qualifier au-delà de l'index. */
export function nbEtranger(g: Gisement): number {
  return (
    g.bresil.length + g.chine.length + g.coree.length + g.turquie.length + g.russie.length
  );
}

export const NB_MOLECULES_INDEX = MOLECULES.length;

/** Suggestions pour une requête qui ne tombe sur rien — les plus vendues d'abord. */
export function suggestions(n = 8): string[] {
  return MOLECULES.slice(0, n).map((m) => m.nom);
}
