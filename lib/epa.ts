import epaFile from "../data/epa.json";
import { FOURNISSEURS } from "./data";
import { ANNUAIRE_PISTES } from "./pistes";
import { IndexNoms } from "./noms";

// ────────────────────────────────────────────────────────────────────────────
// EPA — registre des établissements producteurs
//
// Ce que ça apporte, et que ni l'Australie ni la Chine n'apportaient : des
// USINES, localisées, dans tous les pays à la fois.
//
// Pour qu'un pesticide entre aux États-Unis, le SITE qui le produit doit être
// enregistré auprès de l'EPA et reçoit un numéro d'établissement, porté sur
// l'étiquette de chaque bidon. Le registre publie donc la liste mondiale des
// sites de production, avec leur adresse et leur pays — 7 285 hors États-Unis,
// dont 328 en Inde et une centaine en Turquie. C'est le seul moyen trouvé
// d'atteindre ces pays sans dépendre de leurs registres nationaux, fermés
// (Inde, Russie) ou muets sur le titulaire.
//
// ⚠️ AUCUNE MATIÈRE ACTIVE. Le registre dit qui produit et où, jamais quoi.
// Il ne répond donc pas à « qui fabrique l'abamectine en Inde » — c'est un
// annuaire, pas un appariement. L'apport se fait dans l'autre sens : en
// rapprochant ces sites des sociétés déjà connues, un titulaire devient un
// producteur avéré, avec une usine et une ville.
//
// ⚠️ Aucune valeur réglementaire au Maroc, et un enregistrement d'établissement
// n'atteste d'aucune conformité — l'EPA le précise elle-même : il identifie un
// lieu de production, rien de plus.
// ────────────────────────────────────────────────────────────────────────────

export interface Etablissement {
  numero: string;
  etablissement: string | null;
  adresse: string | null;
  ville: string | null;
  region: string | null;
  codePays: string;
  pays: string;
  /** false = code ISO3 non traduit, affiché tel quel plutôt qu'inventé. */
  paysConnu: boolean;
  societe: string | null;
  /** Pays où le sourcing générique est compétitif. */
  sourcing: boolean;
}

interface FichierEpa {
  meta: {
    source: string;
    url: string;
    licence: string;
    attribution: string;
    genere: string;
    nbTotal: number;
    nbEtrangers: number;
    nbSourcing: number;
    nbPays: number;
    avertissement: string;
  };
  parPays: { pays: string; n: number }[];
  etablissements: Etablissement[];
}

const EPA = epaFile as unknown as FichierEpa;

export const META_EPA = EPA.meta;
export const ETABLISSEMENTS: Etablissement[] = EPA.etablissements;
export const EPA_PAR_PAYS = EPA.parPays;

// ── Rapprochement société -> usines ─────────────────────────────────────────
// Contrairement au registre chinois, les raisons sociales sont ici en alphabet
// latin : le rapprochement avec l'index ONSSA et avec les pistes australiennes
// est donc possible, avec la même règle que partout ailleurs (lib/noms.ts).

const INDEX_EPA = new IndexNoms(
  ETABLISSEMENTS.map((e) => ({ nom: e.etablissement ?? "", valeur: e })),
  3 // un groupe exploite souvent plusieurs sites sous le même nom
);

/** Regroupe les sites d'une même raison sociale. */
function memesSites(nom: string): Etablissement[] {
  return ETABLISSEMENTS.filter((e) => e.etablissement === nom);
}

export type LienUsine = "exact" | "probable";

export interface UsinesSociete {
  lien: LienUsine;
  /** Nom tel qu'il figure au registre EPA — pour que le lien soit vérifiable. */
  nomEpa: string;
  sites: Etablissement[];
  pays: string[];
}

const CACHE = new Map<string, UsinesSociete | null>();

/**
 * Usines enregistrées à l'EPA au nom d'une société.
 *
 * Deux niveaux, jamais confondus : correspondance exacte de la raison sociale,
 * ou parenté probable sur un mot porteur rare. Le nom EPA retenu est toujours
 * affiché, pour que l'utilisateur puisse contredire le rapprochement.
 */
export function usinesDe(nomSociete: string): UsinesSociete | null {
  if (CACHE.has(nomSociete)) return CACHE.get(nomSociete) ?? null;

  let r: UsinesSociete | null = null;
  const exact = INDEX_EPA.exact(nomSociete);
  if (exact?.etablissement) {
    const sites = memesSites(exact.etablissement);
    r = {
      lien: "exact",
      nomEpa: exact.etablissement,
      sites,
      pays: [...new Set(sites.map((s) => s.pays))],
    };
  } else {
    const proches = INDEX_EPA.proches(nomSociete, 1);
    const p = proches[0];
    if (p?.etablissement) {
      const sites = memesSites(p.etablissement);
      r = {
        lien: "probable",
        nomEpa: p.etablissement,
        sites,
        pays: [...new Set(sites.map((s) => s.pays))],
      };
    }
  }

  CACHE.set(nomSociete, r);
  return r;
}

// ── Ce que le registre apporte à l'index marocain ───────────────────────────

export interface FournisseurUsine {
  id: string;
  nom: string;
  paysIndex: string | null;
  usines: UsinesSociete;
}

/**
 * Fournisseurs de l'index ONSSA dont on a retrouvé le site de production.
 *
 * C'est le vrai gain du registre : l'index dit qu'une société fournit une
 * matière active au Maroc, il ne dit pas si elle la fabrique. Un numéro
 * d'établissement EPA le dit, et donne la ville.
 */
function construireFournisseursUsines(): FournisseurUsine[] {
  const out: FournisseurUsine[] = [];
  for (const f of FOURNISSEURS) {
    const u = usinesDe(f.nom);
    if (u) out.push({ id: f.id, nom: f.nom, paysIndex: f.pays, usines: u });
  }
  return out.sort(
    (a, b) => b.usines.sites.length - a.usines.sites.length || a.nom.localeCompare(b.nom)
  );
}

export const FOURNISSEURS_AVEC_USINE: FournisseurUsine[] = construireFournisseursUsines();

/** Usines des pays de sourcing, groupées par société. */
export interface UsineSourcing {
  id: string;
  nom: string;
  pays: string;
  nbSites: number;
  villes: string[];
  /** Nom du fournisseur ONSSA rapproché, s'il y en a un. */
  fournisseurOnssa: string | null;
  /** Niveau du rapprochement — à ne jamais gommer à l'affichage. */
  lienOnssa: LienUsine | null;
  /**
   * La société détient-elle aussi une homologation australienne ?
   *
   * Sert à trier le bruit. Le registre de l'EPA couvre les pesticides ET les
   * « devices » : on y trouve, à côté des usines phytosanitaires, des
   * fabricants de cosmétiques, d'emballages ou de désinfectants. Le registre ne
   * porte aucune colonne permettant de les distinguer, et deviner d'après la
   * raison sociale serait arbitraire. Une présence au registre australien, elle,
   * établit sans ambiguïté qu'il s'agit d'un acteur phytosanitaire.
   */
  corroboreeApvma: boolean;
}

const INDEX_ONSSA = new IndexNoms(FOURNISSEURS.map((f) => ({ nom: f.nom, valeur: f.nom })));
const INDEX_APVMA = new IndexNoms(ANNUAIRE_PISTES.map((p) => ({ nom: p.nom, valeur: p.nom })));

function rattacher(nom: string): { fournisseurOnssa: string | null; lienOnssa: LienUsine | null } {
  const exact = INDEX_ONSSA.exact(nom);
  if (exact) return { fournisseurOnssa: exact, lienOnssa: "exact" };
  const proche = INDEX_ONSSA.proches(nom, 1)[0];
  if (proche) return { fournisseurOnssa: proche, lienOnssa: "probable" };
  return { fournisseurOnssa: null, lienOnssa: null };
}

function construireUsinesSourcing(): UsineSourcing[] {
  const par = new Map<string, UsineSourcing>();
  for (const e of ETABLISSEMENTS) {
    if (!e.sourcing || !e.etablissement) continue;
    const cle = `${e.etablissement}|${e.codePays}`;
    const u =
      par.get(cle) ??
      ({
        // La clé de regroupement fait l'identifiant : elle est unique par
        // construction, là où un slug écrase la ponctuation et la casse —
        // « CO., LTD. » et « CO, LTD » y devenaient le même identifiant.
        id: cle,
        nom: e.etablissement,
        pays: e.pays,
        nbSites: 0,
        villes: [],
        // Correspondance EXACTE seulement : corroborer, c'est affirmer que
        // c'est la même société. Un rapprochement flou faisait ici passer des
        // fabricants d'éclairage et de textile pour des usines phytosanitaires.
        corroboreeApvma: Boolean(INDEX_APVMA.exact(e.etablissement)),
        ...rattacher(e.etablissement),
      } as UsineSourcing);
    u.nbSites += 1;
    if (e.ville && !u.villes.includes(e.ville)) u.villes.push(e.ville);
    par.set(cle, u);
  }
  // Les correspondances exactes d'abord, puis les parentés probables, puis les
  // usines qu'aucun fournisseur de l'index ne recouvre — ce sont ces dernières
  // qui constituent la prospection.
  const rang = (u: UsineSourcing) =>
    u.lienOnssa === "exact" ? 0 : u.lienOnssa ? 1 : u.corroboreeApvma ? 2 : 3;
  return [...par.values()].sort(
    (a, b) => rang(a) - rang(b) || b.nbSites - a.nbSites || a.nom.localeCompare(b.nom)
  );
}

export const USINES_SOURCING: UsineSourcing[] = construireUsinesSourcing();

export const STATS_EPA = {
  nbTotal: META_EPA.nbTotal,
  nbEtrangers: META_EPA.nbEtrangers,
  nbSourcing: META_EPA.nbSourcing,
  nbPays: META_EPA.nbPays,
  nbFournisseursAvecUsine: FOURNISSEURS_AVEC_USINE.length,
  nbSocietesSourcing: USINES_SOURCING.length,
  nbCorroborees: USINES_SOURCING.filter((u) => u.corroboreeApvma || u.lienOnssa).length,
  attribution: META_EPA.attribution,
  genere: META_EPA.genere,
};
