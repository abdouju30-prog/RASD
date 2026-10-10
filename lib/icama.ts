import icamaFile from "../data/icama.json";
import anglaisFile from "../data/icama-anglais.json";
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

/**
 * Nom collable dans un moteur de recherche.
 *
 * La glose (« Yifan — biotechnologies, SARL ») n'existe nulle part : ni au
 * registre, ni sur le site de la société. Le pinyin reprend chaque caractère
 * du nom han ; collé dans Google, il retrouve l'usine. Le han reste l'identité.
 */
// Abréviation de province portée par chaque licence : 农药生许（鲁）0013 = licence
// de production de pesticides, Shandong, n° 0013.
const PROVINCE_ABREGEE: Record<string, string> = {
  京: "Pékin", 津: "Tianjin", 冀: "Hebei", 晋: "Shanxi", 蒙: "Mongolie-Intérieure",
  辽: "Liaoning", 吉: "Jilin", 黑: "Heilongjiang", 沪: "Shanghai", 苏: "Jiangsu",
  浙: "Zhejiang", 皖: "Anhui", 闽: "Fujian", 赣: "Jiangxi", 鲁: "Shandong",
  豫: "Henan", 鄂: "Hubei", 湘: "Hunan", 粤: "Guangdong", 桂: "Guangxi",
  琼: "Hainan", 渝: "Chongqing", 川: "Sichuan", 黔: "Guizhou", 滇: "Yunnan",
  藏: "Tibet", 陕: "Shaanxi", 甘: "Gansu", 青: "Qinghai", 宁: "Ningxia", 新: "Xinjiang",
};

/** « 农药生许（鲁）0013 » -> « Lic. Shandong n° 0013 » ; l'original si la forme est inattendue. */
export function licenceLisible(licence: string | null): string | null {
  if (!licence) return null;
  const m = licence.match(/[（(]\s*(\S)\s*[)）]\s*([0-9A-Za-z-]+)/);
  if (!m) return licence;
  const province = PROVINCE_ABREGEE[m[1]];
  return province ? `Lic. ${province} n° ${m[2]}` : `Lic. n° ${m[2]}`;
}

// ── Nom anglais ─────────────────────────────────────────────────────────────
// scripts/_noms_anglais.py retrouve la raison sociale anglaise d'une usine dans
// les registres brésilien, américain, australien et marocain : « confirmé » par
// les mots de marque, « probable » par la ville et le catalogue de molécules.

export interface NomAnglais {
  nomAnglais: string;
  niveau: "confirmé" | "probable";
  regle: string;
  /** Registres étrangers où la société figure déjà. */
  registres: string[];
}

const ANGLAIS = (anglaisFile.usines ?? {}) as Record<string, NomAnglais>;
export const STATS_ANGLAIS = anglaisFile.meta;

export function anglaisDe(nom: string): NomAnglais | null {
  return ANGLAIS[nom] ?? null;
}

export function nomCherchable(s: { nom: string; latin: string | null }): string {
  return ANGLAIS[s.nom]?.nomAnglais || s.latin?.trim() || s.nom;
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
 * L'ICAMA écrit les raisons sociales en caractères chinois, l'index marocain
 * en alphabet latin. Le rapprochement passe par data/icama-anglais.json
 * (voir anglaisDe) : partiel et prudent — une usine sans nom anglais n'est
 * pas absente des autres registres, elle n'y a pas été reconnue.
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
