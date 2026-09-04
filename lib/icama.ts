import icamaFile from "../data/icama.json";
import { apparierApvma } from "./apvma";

// ────────────────────────────────────────────────────────────────────────────
// ICAMA — registre chinois des matières actives techniques
//
// Ce que ça répond, et que rien d'autre dans l'outil ne répond : **quelles
// usines chinoises fabriquent cette matière active ?**
//
// L'index ONSSA ne connaît que les fournisseurs déjà entrés au Maroc. Le
// registre australien nomme les détenteurs d'homologations là-bas. L'ICAMA,
// lui, publie les homologations de matière active TECHNIQUE (原药) — c'est-à-
// dire le maillon amont, celui qu'on achète pour formuler.
//
// Deux registres croisés, et le croisement est l'information :
//   • homologation TC  -> la société est autorisée à vendre la substance
//   • licence de production -> la société est autorisée à la FABRIQUER
// Qui a les deux est une usine. Qui n'a que la première peut n'être qu'un
// titulaire — négociant, ou groupe qui fait produire ailleurs.
//
// ⚠️ AUCUNE VALEUR RÉGLEMENTAIRE AU MAROC. Une homologation chinoise n'ouvre
// pas la voie me-too, n'abrège aucun délai, ne remplace aucune étude de
// l'Annexe 3-B. Seul un fournisseur déjà référencé à l'index marocain le fait.
// Et une licence n'est pas un audit : ni prix, ni capacité, ni qualité.
//
// ⚠️ Le pont français -> chinois passe par le nom ISO anglais, via
// `apparierApvma`. Un échec d'appariement APVMA fait donc échouer l'ICAMA :
// c'est voulu, une seule règle de rapprochement pour tout l'outil.
// ────────────────────────────────────────────────────────────────────────────

export interface SocieteChinoise {
  /** Raison sociale en caractères han — ce que dit le registre, et qui fait foi. */
  nom: string;
  /**
   * Pinyin segmenté : « Shandong Weifang Runfeng Huagong Gufen Youxiangongsi ».
   * C'est ce qui se recopie dans un moteur de recherche ou se dicte au
   * téléphone. Le pinyin transcrit les sons — il ne retrouve pas la marque
   * déposée, « 润丰 » donnant « Runfeng » là où la société se présente à
   * l'international sous « Rainbow ».
   */
  latin: string | null;
  /** Lecture courte : marque en pinyin, qualificatifs traduits en français. */
  glose: string | null;
  /** Province ou région : elle décide du port d'embarquement, donc du fret. */
  region: string | null;
  /** Numéro de licence de production, ou null : titulaire sans usine connue. */
  licenceProduction: string | null;
  nbHomologations: number;
  /** Teneur la plus élevée homologuée — 95 %, 98 %… */
  teneurMax: string | null;
  expirationMax: string | null;
}

export interface MatiereIcama {
  iso: string;
  nomsChinois: string[];
  nbHomologationsTC: number;
  societes: SocieteChinoise[];
}

interface FichierIcama {
  meta: {
    source: string;
    url: string;
    attribution: string;
    genere: string;
    nbMatieres: number;
    nbSocietes: number;
    nbFabricants: number;
    nbLicencesProduction: number;
    nomsIsoInterroges: number;
    avertissement: string;
  };
  matieres: MatiereIcama[];
  licences: { entreprise: string; licence: string; expiration: string | null; perimetre: string | null }[];
}

const ICAMA = icamaFile as unknown as FichierIcama;

export const META_ICAMA = ICAMA.meta;
export const MATIERES_ICAMA = ICAMA.matieres;

const PAR_ISO = new Map(MATIERES_ICAMA.map((m) => [m.iso, m]));

/**
 * Fabricants chinois d'une matière active de l'index ONSSA.
 * Passe par le nom ISO anglais : « Abamectine(1,8%) » -> ABAMECTIN -> 阿维菌素.
 */
export function fabricantsChinois(nomONSSA: string): MatiereIcama | null {
  const c = apparierApvma(nomONSSA);
  if (!c) return null;
  return PAR_ISO.get(c.nom) ?? null;
}

/** Usines confirmées : homologation TC **et** licence de production. */
export function usines(m: MatiereIcama): SocieteChinoise[] {
  return m.societes.filter((s) => s.licenceProduction);
}

/** Titulaires sans licence de production connue — à qualifier avant contact. */
export function titulaires(m: MatiereIcama): SocieteChinoise[] {
  return m.societes.filter((s) => !s.licenceProduction);
}

const TOUTES = new Set<string>();
for (const m of MATIERES_ICAMA) for (const s of m.societes) TOUTES.add(s.nom);

export const STATS_ICAMA = {
  nbMatieres: MATIERES_ICAMA.length,
  nbSocietes: TOUTES.size,
  nbFabricants: META_ICAMA.nbFabricants,
  nbLicences: META_ICAMA.nbLicencesProduction,
  attribution: META_ICAMA.attribution,
  genere: META_ICAMA.genere,
};

/**
 * Fraîcheur du relevé. L'ICAMA n'a pas de rythme de publication annoncé et le
 * relevé se fait par interrogation du formulaire : on ne peut donc pas parler
 * de « retard » comme pour E-Phy, seulement d'ancienneté.
 */
export function fraicheurIcama(ref = new Date()): { jours: number | null; date: string | null } {
  const d = new Date(META_ICAMA.genere);
  if (Number.isNaN(d.getTime())) return { jours: null, date: null };
  return {
    jours: Math.floor((ref.getTime() - d.getTime()) / 86_400_000),
    date: META_ICAMA.genere.slice(0, 10),
  };
}

// ── Annuaire des usines ─────────────────────────────────────────────────────

export interface UsineChinoise {
  nom: string;
  /** Pinyin segmenté — la forme cherchable et dictable. */
  latin: string | null;
  /** Lecture courte : marque en pinyin, qualificatifs traduits. */
  glose: string | null;
  /** Province ou région, quand le nom la porte. */
  region: string | null;
  licenceProduction: string | null;
  /** Matières actives de l'index marocain qu'elle produit, en nom ISO. */
  matieres: string[];
  nbHomologations: number;
}

/**
 * Sociétés chinoises classées par couverture de l'index marocain.
 *
 * ⚠️ Aucun rapprochement avec l'index ONSSA n'est possible ici, et il ne faut
 * pas faire semblant : l'ICAMA écrit les raisons sociales en caractères
 * chinois, l'index marocain en alphabet latin. « SHANDONG WEIFANG RAINBOW
 * CHEMICALS CO.,LTD » et 山东潍坊润丰化工股份有限公司 sont la même société,
 * mais aucune règle automatique ne peut l'établir. Un rapprochement demanderait
 * une table de correspondance saisie à la main.
 */
function construireUsines(): UsineChinoise[] {
  const par = new Map<string, UsineChinoise>();
  for (const m of MATIERES_ICAMA) {
    for (const s of m.societes) {
      const e =
        par.get(s.nom) ??
        ({
          nom: s.nom,
          latin: s.latin,
          glose: s.glose,
          region: s.region,
          licenceProduction: s.licenceProduction,
          matieres: [],
          nbHomologations: 0,
        } as UsineChinoise);
      e.matieres.push(m.iso);
      e.nbHomologations += s.nbHomologations;
      par.set(s.nom, e);
    }
  }
  return [...par.values()].sort(
    (a, b) => b.matieres.length - a.matieres.length || b.nbHomologations - a.nbHomologations
  );
}

export const ANNUAIRE_CHINE: UsineChinoise[] = construireUsines();

/** Usines confirmées, les plus polyvalentes d'abord — la liste d'un déplacement. */
export const USINES_CHINE: UsineChinoise[] = ANNUAIRE_CHINE.filter((u) => u.licenceProduction);
