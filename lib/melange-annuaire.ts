import { ANNUAIRE, type Fabricant } from "./annuaire";
import { ASSOCIATIONS, type Association } from "./melanges";
import { MELANGES_COREE, type MelangeCoreen } from "./coree";
import { constituantParNom } from "./apvma";
import { idMatiere } from "./liens";
import { PRODUITS } from "./data";
import { molecules } from "./formulation";
import type { ProduitPortefeuille } from "./types";

// ────────────────────────────────────────────────────────────────────────────
// UN MÉLANGE DE L'ANNUAIRE EST UNE ENTRÉE, PAS DEUX MOLÉCULES
//
// Les registres étrangers écrivent un mélange comme une seule chaîne :
// « Azoxystrobin Difenoconazole 200 G/L » (Colombie), « 2,4-D Picloram 240 G/L »,
// « Emamectin Benzoate Thiamethoxam 50 G/Kg ». Cliquer sur « Azoxystrobin »
// ouvrait la fiche d'une seule matière : l'utilisateur voulait celle du mélange.
//
// ⚠️ ON NE DÉCOUPE QUE CE QU'ON SAIT NOMMER. Chaque mot (ou groupe de mots —
// « Emamectin Benzoate » est UNE molécule) doit se rattacher à une fiche de
// l'outil. Un seul mot inconnu et l'entrée reste une chaîne entière : mieux
// vaut un texte non cliquable qu'un mélange inventé.
// ────────────────────────────────────────────────────────────────────────────

const TENEUR = /\s*:?\s*\d+(?:[.,]\d+)?\s*(?:%|g\s*\/\s*(?:l|kg)\b|ml\s*\/\s*l\b|w\s*\/\s*[vw]\b).*$/i;

function sansTeneur(s: string): string {
  return s.replace(TENEUR, "").replace(/[\s:;,.-]+$/, "").trim();
}

function connu(nom: string): boolean {
  return idMatiere(nom) !== null || constituantParNom(nom) !== null;
}

/** Composants d'une entrée de l'annuaire ; un seul élément si ce n'est pas un mélange sûr. */
export function decouperMelange(entree: string): string[] {
  const brut = sansTeneur(entree);
  if (!brut) return [entree];

  // Séparateurs explicites : « A + B », « A / B », « A, B », « A y B », « A and B ».
  const morceaux = brut
    .split(/\s*[+/;]\s*|\s+(?:y|and|et|e)\s+|\s*,\s+(?=[A-Za-zÀ-ÿ])/i)
    .map((m) => sansTeneur(m))
    .filter(Boolean);
  if (morceaux.length >= 2) {
    return morceaux.every(connu) ? morceaux : [entree];
  }

  // Pas de séparateur : les molécules se suivent. Plus long groupe de mots d'abord.
  const mots = brut.split(/\s+/);
  if (mots.length < 2) return [entree];
  const trouves: string[] = [];
  let i = 0;
  while (i < mots.length) {
    let pris = 0;
    for (let j = mots.length; j > i; j--) {
      if (connu(mots.slice(i, j).join(" "))) {
        trouves.push(mots.slice(i, j).join(" "));
        pris = j - i;
        break;
      }
    }
    if (!pris) return [entree];
    i += pris;
  }
  return trouves.length >= 2 ? trouves : [entree];
}

/** Clé d'identité d'un ensemble de molécules : insensible à l'ordre, à la langue et à la casse. */
export function cleComposants(comps: string[]): string {
  return comps
    .map((c) => idMatiere(c) ?? constituantParNom(c)?.id ?? c.toLowerCase())
    .sort()
    .join("|");
}

export const SEP_URL = "|";

export function hrefMelange(comps: string[]): string {
  return `/melange?c=${encodeURIComponent(comps.join(SEP_URL))}`;
}

export interface FicheMelange {
  composants: string[];
  /** Produits ONSSA qui contiennent exactement ces matières actives. */
  produits: ProduitPortefeuille[];
  maroc: Association | null;
  coree: MelangeCoreen | null;
  fabricants: Fabricant[];
}

// L'index ONSSA liste une ligne par matière active : un mélange se retrouve par
// ses PRODUITS — ceux dont l'ensemble des matières actives est exactement celui-ci.
let PRODUITS_PAR_CLE: Map<string, ProduitPortefeuille[]> | null = null;

function produitsParCle(): Map<string, ProduitPortefeuille[]> {
  if (PRODUITS_PAR_CLE) return PRODUITS_PAR_CLE;
  PRODUITS_PAR_CLE = new Map();
  for (const p of PRODUITS) {
    const comps = [...new Set(p.matieresActives.flatMap((n) => molecules(n)))];
    if (comps.length < 2) continue;
    const cle = cleComposants(comps);
    const l = PRODUITS_PAR_CLE.get(cle) ?? [];
    l.push(p);
    PRODUITS_PAR_CLE.set(cle, l);
  }
  return PRODUITS_PAR_CLE;
}

let PAR_CLE_MAROC: Map<string, Association> | null = null;
let PAR_CLE_COREE: Map<string, MelangeCoreen> | null = null;

export function ficheMelange(composants: string[]): FicheMelange {
  PAR_CLE_MAROC ??= new Map(ASSOCIATIONS.map((a) => [cleComposants(a.composants), a]));
  PAR_CLE_COREE ??= new Map(MELANGES_COREE.map((m) => [cleComposants(m.composants), m]));
  const cle = cleComposants(composants);
  const fabricants = ANNUAIRE.filter((f) =>
    f.molecules.some((m) => {
      const c = decouperMelange(m);
      return c.length >= 2 && cleComposants(c) === cle;
    })
  );
  return {
    composants,
    produits: produitsParCle().get(cle) ?? [],
    maroc: PAR_CLE_MAROC.get(cle) ?? null,
    coree: PAR_CLE_COREE.get(cle) ?? null,
    fabricants,
  };
}
