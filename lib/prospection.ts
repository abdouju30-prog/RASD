import configFile from "../data/prospection-config.json";
import journalFile from "../data/prospection.json";
import ueFile from "../data/ue-exclusivites.json";
import { DETENTEURS, MATIERES, detenteurParId, produitsDe } from "./data";
import type { FicheAnses } from "./types";
import { molecules } from "./formulation";
import { gamme, type Manque } from "./gamme";
import { ANNUAIRE, dansRegion, type Fabricant } from "./annuaire";
import { contactSociete, lienLinkedIn } from "./contacts-societes";
import { contactDe } from "./contact";
import { conformite, isoDe } from "./conformite";
import { REGISTRES_OUVERTS } from "./registres-ouverts";
import { ANNUAIRE_PISTES } from "./pistes";
import { USINES_TURQUES } from "./bku";
import { cleFabricant } from "./cle";
import type { Detenteur } from "./types";

// ────────────────────────────────────────────────────────────────────────────
// AGENT DE PROSPECTION — un nouveau fournisseur potentiel par jour.
//
// Trois questions, dans cet ordre :
//
// 1. QUELLES MOLÉCULES ? Celles qui manquent RÉELLEMENT au portefeuille :
//      • les trous de gamme (lib/gamme.ts) — le marché marocain les porte déjà,
//        le détenteur non : la demande est prouvée ;
//      • les molécules approuvées en UE qu'AUCUN détenteur marocain ne porte
//        encore — premier arrivé.
//    Chacune doit être homologuée dans au moins un pays de l'OCDE (UE, France,
//    Canada, Australie, Turquie, Colombie). Une molécule retirée par l'ANSES
//    n'entre jamais (gamme.ts l'exclut déjà) ; une molécule non approuvée en UE
//    n'entre que si le Maroc la porte, et perd des points.
//
// 2. LESQUELLES SORTENT DE L'EXCLUSIVITÉ DES GRANDS GROUPES ? Deux signaux,
//    aucun n'est une preuve :
//      • fin de protection des données UE ESTIMÉE (approbation + 10 ans,
//        règl. 1107/2009 art. 59) tombée récemment ou imminente ;
//      • au Maroc, la molécule n'est fournie QUE par des majors (Syngenta,
//        Bayer, BASF, Corteva, FMC…) alors que des génériqueurs la fabriquent
//        déjà ailleurs.
//    Le brevet de molécule et son certificat complémentaire (SPC) ne sont pas
//    lus ici : la tâche quotidienne les vérifie sur le web et note sa source.
//
// 3. QUI ÉCRIRE ? Un fabricant de l'annuaire mondial (4 000+ sociétés, tous
//    registres réunis) qui fabrique une ou plusieurs de ces molécules, n'est
//    pas une major, ne fournit pas déjà le détenteur et n'a jamais été
//    contacté par l'agent. Le message part en ANGLAIS, en brouillon : rien
//    n'est envoyé sans relecture.
//
// ⚠️ La condition OCDE porte sur la MOLÉCULE, pas sur l'usine : un génériqueur
// chinois ou indien est un fournisseur légitime d'une molécule homologuée en UE.
// ⚠️ Aucun prix, aucun volume : le classement dit où chercher, pas quoi acheter.
// ────────────────────────────────────────────────────────────────────────────

// ── Réglages et journal ─────────────────────────────────────────────────────

export interface ConfigProspection {
  detenteur: string;
  societe: string;
  paysSociete: string;
  langue: string;
  signature: string[];
  parJour: number;
  horaire: string;
  relanceApresJours: number;
  fenetreExclusivite: { anneesAvant: number; moisApres: number };
  /** Thème de chaque jour, à tour de rôle : la journée N prend rotation[N % longueur]. */
  rotation: Theme[];
  /** Adresse d'envoi : le bouton « Envoyer avec Gmail » ouvre ce compte-là. */
  emailEnvoi: string;
  /** Sociétés écartées une fois pour toutes par l'utilisateur. */
  exclus: string[];
  majors: string[];
}

export const CONFIG = configFile as unknown as ConfigProspection;

export type StatutProspect = "à envoyer" | "envoyé" | "relancé" | "réponse" | "en discussion" | "écarté";
export const STATUTS: StatutProspect[] = ["à envoyer", "envoyé", "relancé", "réponse", "en discussion", "écarté"];

export interface Prospect {
  id: string;
  /** Jour de préparation, AAAA-MM-JJ (Casablanca). */
  date: string;
  fournisseur: string;
  cle: string;
  pays: string;
  molecules: string[];
  motifs: string[];
  email: string | null;
  site: string | null;
  objet: string;
  message: string;
  statut: StatutProspect;
  /** Identifiant du brouillon Gmail, s'il a été créé. */
  brouillonGmail?: string | null;
  envoyeLe?: string | null;
  reponseLe?: string | null;
  relances?: string[];
  /** Ce que la tâche quotidienne a vérifié sur le web (brevet, site, e-mail), avec sources. */
  verification?: { exclusivite?: string; sources?: string[] };
  notes?: string;
}

export const JOURNAL: Prospect[] = (journalFile as unknown as { prospects: Prospect[] }).prospects;

// ── Clés de molécule ────────────────────────────────────────────────────────

/** « Acétamipride(20%) », « ACETAMIPRID », « Abamectin (aka avermectin) » -> « acetamiprid », « abamectin ». */
export function cleMolecule(nom: string): string {
  return nom
    .split(/\s*\(/)[0]
    .normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/\b(present as|aka)\b.*$/, "")
    .replace(/[^a-z0-9]/g, "")
    .replace(/e$/, "");
}

// ── Base UE complète ────────────────────────────────────────────────────────

export interface SubstanceUE {
  nom: string;
  cas: string[];
  statut: string | null;
  categorie: string | null;
  approbation: string | null;
  expiration: string | null;
  finProtectionEstimee: string | null;
  rms: string | null;
  substitution: boolean;
  faibleRisque: boolean;
}

const UE = ueFile as unknown as { meta: { genere: string; nbSubstances: number }; substances: SubstanceUE[] };
export const META_UE = UE.meta;
const UE_PAR_CLE = new Map<string, SubstanceUE>();
for (const s of UE.substances) {
  const k = cleMolecule(s.nom);
  const deja = UE_PAR_CLE.get(k);
  if (k && (!deja || (deja.statut !== "Approved" && s.statut === "Approved"))) UE_PAR_CLE.set(k, s);
}

const CATEGORIES_UE: Record<string, string> = {
  FU: "Fongicide", IN: "Insecticide", HB: "Herbicide", AC: "Acaricide", NE: "Nématicide",
  PG: "Régulateur de croissance", BA: "Bactéricide", MO: "Molluscicide",
};
function categorieUE(c: string | null): string {
  const codes = (c ?? "").match(/\b[A-Z]{2}\b/g) ?? [];
  return codes.map((x) => CATEGORIES_UE[x]).filter(Boolean).join(", ") || "Autre";
}

// ── Ce que le Maroc porte déjà ──────────────────────────────────────────────

const CLES_MAROC = new Set<string>();
const CAS_MAROC = new Set<string>();
for (const ma of MATIERES) {
  for (const m of molecules(ma.nom, ma.molecule)) CLES_MAROC.add(cleMolecule(m));
  const iso = isoDe(ma.nom);
  if (iso) CLES_MAROC.add(cleMolecule(iso));
  for (const c of conformite(ma.nom).ue?.cas ?? []) CAS_MAROC.add(c);
}

/** Présente à l'index ONSSA sous ce nom, un nom voisin (sel, ester) ou ce CAS. */
function auMaroc(s: SubstanceUE): boolean {
  const k = cleMolecule(s.nom);
  if (CLES_MAROC.has(k) || s.cas.some((c) => CAS_MAROC.has(c))) return true;
  if (k.length < 6) return false;
  for (const m of CLES_MAROC) if (m.length >= 6 && (m.startsWith(k) || k.startsWith(m))) return true;
  return false;
}

// ── Homologations OCDE, molécule par molécule ───────────────────────────────

const OCDE_PAR_CLE = new Map<string, Set<string>>();
function noterOcde(nom: string, pays: string) {
  const k = cleMolecule(nom);
  if (!k) return;
  const s = OCDE_PAR_CLE.get(k) ?? new Set<string>();
  s.add(pays);
  OCDE_PAR_CLE.set(k, s);
}
for (const s of UE.substances) if (s.statut === "Approved") noterOcde(s.nom, "Union européenne");
for (const r of REGISTRES_OUVERTS) {
  if (!["canada", "colombie"].includes(r.id)) continue;
  for (const soc of r.societes) for (const m of soc.matieres) noterOcde(m, r.pays);
}
for (const p of ANNUAIRE_PISTES) for (const m of p.matieres) noterOcde(m, "Australie");
for (const u of USINES_TURQUES) for (const m of u.matieresImal) noterOcde(m, "Turquie");

function ocdeDe(cles: string[], ansesAutorisee: boolean): string[] {
  const s = new Set<string>();
  for (const k of cles) for (const p of OCDE_PAR_CLE.get(k) ?? []) s.add(p);
  if (ansesAutorisee) s.add("France");
  return [...s].sort((a, b) => a.localeCompare(b, "fr"));
}

// ── Fabricants, molécule par molécule ───────────────────────────────────────

function estMajor(nom: string): boolean {
  const n = nom.toLowerCase();
  return CONFIG.majors.some((m) => n.includes(m));
}

/** Nom lisible dans un e-mail anglais : pas de katakana, de sinogrammes ni de cyrillique. */
function nomLatin(nom: string): boolean {
  return /[a-z]/i.test(nom) && !/[Ѐ-ӿ぀-ヿㇰ-ㇿｦ-ﾟ一-鿿]/.test(nom);
}

const FABRICANTS_PAR_CLE = new Map<string, Fabricant[]>();
for (const f of ANNUAIRE) {
  if (!nomLatin(f.nom)) continue;
  for (const m of f.molecules) {
    const k = cleMolecule(m);
    if (!k) continue;
    const l = FABRICANTS_PAR_CLE.get(k) ?? [];
    l.push(f);
    FABRICANTS_PAR_CLE.set(k, l);
  }
}

function generiquesDe(cles: string[]): Fabricant[] {
  const vu = new Map<string, Fabricant>();
  for (const k of cles) for (const f of FABRICANTS_PAR_CLE.get(k) ?? []) if (!estMajor(f.nom)) vu.set(f.cle, f);
  return [...vu.values()];
}

// ── 1 et 2 : les molécules cibles ───────────────────────────────────────────

export type Motif =
  | "trou de gamme"
  | "absente du Maroc"
  | "sortie d'exclusivité"
  | "majors seules au Maroc"
  | "au portefeuille : fournisseur unique"
  | "au portefeuille : fourni par une major";

/** Les trois familles que la rotation fait alterner. */
export type Theme = "manques" | "exclusivite" | "portefeuille";
export const LIBELLE_THEME: Record<Theme, string> = {
  manques: "molécules qui manquent au portefeuille",
  exclusivite: "molécules qui sortent de l'exclusivité des majors",
  portefeuille: "deuxième source pour des molécules déjà au portefeuille",
};

function themeDe(m: CibleMolecule): Theme {
  if (m.motifs.includes("sortie d'exclusivité")) return "exclusivite";
  if (m.motifs.some((x) => x.startsWith("au portefeuille"))) return "portefeuille";
  return "manques";
}

export interface CibleMolecule {
  molecule: string;
  /** Nom ISO anglais quand on le connaît — c'est celui du message. */
  nomAnglais: string;
  cles: string[];
  categorie: string;
  motifs: Motif[];
  /** Produits et détenteurs au Maroc (0 si absente). */
  nbProduitsMaroc: number;
  nbDetenteursMaroc: number;
  /** Fournisseurs déjà référencés à l'ONSSA pour cette molécule. */
  fournisseursMaroc: string[];
  ue: Pick<SubstanceUE, "statut" | "approbation" | "finProtectionEstimee" | "substitution"> | null;
  ocde: string[];
  nbGeneriques: number;
  score: number;
  /** Une phrase, faits seulement. */
  pourquoi: string;
}

function dansFenetre(fin: string | null, aujourdhui: Date): boolean {
  if (!fin) return false;
  const d = new Date(fin);
  const debut = new Date(aujourdhui);
  debut.setFullYear(debut.getFullYear() - CONFIG.fenetreExclusivite.anneesAvant);
  const finFenetre = new Date(aujourdhui);
  finFenetre.setMonth(finFenetre.getMonth() + CONFIG.fenetreExclusivite.moisApres);
  return d >= debut && d <= finFenetre;
}

function annee(iso: string | null | undefined): string {
  return iso ? iso.slice(0, 4) : "?";
}

function depuisManque(m: Manque, aujourdhui: Date): CibleMolecule | null {
  const iso = isoDe(m.molecule);
  const cles = [...new Set([cleMolecule(m.molecule), iso ? cleMolecule(iso) : ""].filter(Boolean))];
  const ue = cles.map((k) => UE_PAR_CLE.get(k)).find(Boolean) ?? null;
  const ocde = ocdeDe(cles, m.anses?.statut === "autorisée");
  if (!ocde.length) return null;

  // Au Maroc, la sortie d'exclusivité se lit chez les fournisseurs : tant que
  // seules les majors fournissent la molécule, l'exclusivité tient ICI ; si des
  // génériqueurs la fabriquent déjà ailleurs, elle est en train de tomber.
  // La date UE n'entre pas dans ce motif : pour une molécule ancienne, l'API
  // publie souvent la date du RENOUVELLEMENT, pas celle de la première approbation.
  const motifs: Motif[] = ["trou de gamme"];
  const majorsSeules = m.meToo.length > 0 && m.meToo.every(estMajor);
  const generiques = generiquesDe(cles);
  if (majorsSeules) motifs.push("majors seules au Maroc");
  if (majorsSeules && generiques.length) motifs.push("sortie d'exclusivité");

  let score = 20 + Math.min(m.nbProduits, 20) * 2 + Math.min(m.nbDetenteurs, 10) * 3 + m.usagesNeufs.length * 0.2;
  if (motifs.includes("sortie d'exclusivité")) score += 45;
  score += ocde.length * 3 + Math.min(generiques.length, 10) * 2;
  if (!generiques.length) score -= 15;
  if (ue?.substitution) score -= 10;
  if (ue && ue.statut !== "Approved") score -= 20;

  const morceaux = [
    `${m.nbProduits} produits chez ${m.nbDetenteurs} détenteurs au Maroc, absente de votre portefeuille`,
    ue?.approbation ? `approbation UE en vigueur depuis ${annee(ue.approbation)}` : null,
    majorsSeules ? `fournie au Maroc par ${m.meToo.join(", ")} seulement` : null,
    `${generiques.length} génériqueur(s) repéré(s) dans les registres`,
  ];
  return {
    molecule: m.molecule,
    nomAnglais: iso ? titre(iso) : m.molecule,
    cles,
    categorie: m.categorie,
    motifs,
    nbProduitsMaroc: m.nbProduits,
    nbDetenteursMaroc: m.nbDetenteurs,
    fournisseursMaroc: m.meToo,
    ue: ue ? { statut: ue.statut, approbation: ue.approbation, finProtectionEstimee: ue.finProtectionEstimee, substitution: ue.substitution } : null,
    ocde,
    nbGeneriques: generiques.length,
    score: Math.round(score),
    pourquoi: morceaux.filter(Boolean).join(" ; ") + ".",
  };
}

function depuisUE(s: SubstanceUE, aujourdhui: Date): CibleMolecule | null {
  if (s.statut !== "Approved" || !s.approbation || s.faibleRisque) return null;
  const categorie = categorieUE(s.categorie);
  if (categorie === "Autre") return null;
  if (auMaroc(s)) return null;
  const cles = [cleMolecule(s.nom)];
  const generiques = generiquesDe(cles);
  // Sans aucun génériqueur repéré, la molécule est encore tenue par son inventeur.
  if (!generiques.length) return null;

  const motifs: Motif[] = ["absente du Maroc"];
  const sortie = dansFenetre(s.finProtectionEstimee, aujourdhui);
  if (sortie) motifs.push("sortie d'exclusivité");
  const ocde = ocdeDe(cles, false);

  let score = 15 + ocde.length * 3 + Math.min(generiques.length, 10) * 3;
  if (sortie) score += 25;
  if (s.substitution) score -= 10;

  return {
    molecule: titre(s.nom),
    nomAnglais: titre(s.nom),
    cles,
    categorie,
    motifs,
    nbProduitsMaroc: 0,
    nbDetenteursMaroc: 0,
    fournisseursMaroc: [],
    ue: { statut: s.statut, approbation: s.approbation, finProtectionEstimee: s.finProtectionEstimee, substitution: s.substitution },
    ocde,
    nbGeneriques: generiques.length,
    score: Math.round(score),
    pourquoi:
      `Aucun produit homologué au Maroc ; approbation UE en vigueur depuis ${annee(s.approbation)} ` +
      `(si c'est la première : protection des données jusqu'en ${annee(s.finProtectionEstimee)}, à confirmer) ; ` +
      `${generiques.length} génériqueur(s) repéré(s) dans les registres.`,
  };
}

function titre(nom: string): string {
  const n = nom.split(/\s*\(/)[0].trim();
  return n === n.toUpperCase() ? n.charAt(0) + n.slice(1).toLowerCase() : n;
}

// ── Molécules DÉJÀ au portefeuille — lesquelles méritent une deuxième source ──
//
// Tout le portefeuille n'est pas à resourcer. On ne garde que deux cas, lus
// dans l'index ONSSA, où un nouveau fournisseur change vraiment quelque chose :
//   • FOURNISSEUR UNIQUE : tous les produits du détenteur qui portent la
//     molécule viennent d'une seule société — rupture ou hausse de prix sans
//     recours ;
//   • FOURNIE PAR UNE MAJOR alors que des génériqueurs la fabriquent : c'est
//     là que l'écart de prix est le plus grand.
// Une molécule que l'ANSES retire n'est jamais resourcée : on n'investit pas
// dans un dossier condamné. Le poids vient du nombre de produits du détenteur.

const MA_PAR_ID = new Map(MATIERES.map((m) => [m.id, m]));
const MARCHE_PAR_CLE = new Map<string, { produits: Set<string>; detenteurs: Set<string> }>();
for (const ma of MATIERES) {
  for (const m of molecules(ma.nom, ma.molecule)) {
    const k = cleMolecule(m);
    const e = MARCHE_PAR_CLE.get(k) ?? { produits: new Set<string>(), detenteurs: new Set<string>() };
    ma.produits.forEach((x) => e.produits.add(x));
    ma.detenteurs.forEach((x) => e.detenteurs.add(x));
    MARCHE_PAR_CLE.set(k, e);
  }
}

function depuisPortefeuille(detenteurId: string): CibleMolecule[] {
  const parMol = new Map<string, { nom: string; categorie: string; anses: FicheAnses | null; produits: Set<string>; fournisseurs: Set<string> }>();
  for (const p of produitsDe(detenteurId)) {
    for (const id of p.matieresActivesIds) {
      const ma = MA_PAR_ID.get(id);
      if (!ma) continue;
      for (const m of molecules(ma.nom, ma.molecule)) {
        const k = cleMolecule(m);
        if (!k) continue;
        const e = parMol.get(k) ?? { nom: m, categorie: ma.categorie ?? "Autre", anses: ma.anses, produits: new Set<string>(), fournisseurs: new Set<string>() };
        e.produits.add(p.nomCommercial);
        p.fournisseurs.forEach((f) => e.fournisseurs.add(f));
        parMol.set(k, e);
      }
    }
  }

  const out: CibleMolecule[] = [];
  for (const [k, e] of parMol) {
    const st = e.anses?.statut;
    if (st === "retirée" || st === "en_retrait") continue;
    const fournisseurs = [...e.fournisseurs].sort();
    const unique = fournisseurs.length === 1;
    const major = fournisseurs.length > 0 && fournisseurs.every(estMajor);
    if (!unique && !major) continue;

    const iso = isoDe(e.nom);
    const cles = [...new Set([k, iso ? cleMolecule(iso) : ""].filter(Boolean))];
    const actuels = new Set(fournisseurs.map(cleFabricant));
    const generiques = generiquesDe(cles).filter((f) => !actuels.has(f.cle));
    if (generiques.length < 2) continue;
    const ocde = ocdeDe(cles, st === "autorisée");
    if (!ocde.length) continue;
    const ue = cles.map((x) => UE_PAR_CLE.get(x)).find(Boolean) ?? null;

    const motifs: Motif[] = [];
    if (unique) motifs.push("au portefeuille : fournisseur unique");
    if (major) motifs.push("au portefeuille : fourni par une major");
    let score = 25 + Math.min(e.produits.size, 5) * 10 + (major ? 30 : 0) + (unique ? 10 : 0);
    score += ocde.length * 3 + Math.min(generiques.length, 10) * 2;
    if (ue?.substitution) score -= 10;
    const marche = MARCHE_PAR_CLE.get(k);

    out.push({
      molecule: e.nom,
      nomAnglais: iso ? titre(iso) : e.nom,
      cles,
      categorie: e.categorie,
      motifs,
      nbProduitsMaroc: marche?.produits.size ?? 0,
      nbDetenteursMaroc: marche?.detenteurs.size ?? 0,
      fournisseursMaroc: fournisseurs,
      ue: ue ? { statut: ue.statut, approbation: ue.approbation, finProtectionEstimee: ue.finProtectionEstimee, substitution: ue.substitution } : null,
      ocde,
      nbGeneriques: generiques.length,
      score: Math.round(score),
      pourquoi:
        `Déjà au portefeuille (${e.produits.size} produit(s) : ${[...e.produits].slice(0, 3).join(", ")}) ; ` +
        `fournie aujourd'hui par ${fournisseurs.join(", ")}${unique ? " seulement" : ""} ; ` +
        `${generiques.length} autre(s) fabricant(s) pour une deuxième source.`,
    });
  }
  return out;
}

const CACHE_CIBLES = new Map<string, CibleMolecule[]>();

/** Molécules à chercher pour ce détenteur, les plus prometteuses d'abord. */
export function moleculesCibles(detenteurId: string, aujourdhui = new Date()): CibleMolecule[] {
  const cle = `${detenteurId}|${aujourdhui.toISOString().slice(0, 10)}`;
  const c = CACHE_CIBLES.get(cle);
  if (c) return c;
  const out: CibleMolecule[] = [];
  for (const m of gamme(detenteurId).manques) {
    const x = depuisManque(m, aujourdhui);
    if (x) out.push(x);
  }
  const vues = new Set(out.flatMap((x) => x.cles));
  for (const x of depuisPortefeuille(detenteurId)) {
    if (x.cles.some((k) => vues.has(k))) continue;
    out.push(x);
    x.cles.forEach((k) => vues.add(k));
  }
  for (const s of UE.substances) {
    const x = depuisUE(s, aujourdhui);
    if (x && !x.cles.some((k) => vues.has(k))) {
      out.push(x);
      x.cles.forEach((k) => vues.add(k));
    }
  }
  out.sort((a, b) => b.score - a.score || a.molecule.localeCompare(b.molecule, "fr"));
  CACHE_CIBLES.set(cle, out);
  return out;
}

// ── 3 : le fournisseur du jour ──────────────────────────────────────────────

export interface FournisseurSuggere {
  nom: string;
  cle: string;
  pays: string;
  paysFiable: boolean;
  registres: string[];
  /** Déjà fournisseur d'un produit homologué au Maroc (pas du détenteur). */
  dejaAuMaroc: boolean;
  /** Cibles qu'il fabrique, meilleures d'abord (5 au plus). */
  molecules: CibleMolecule[];
  contact: ContactProspect;
  linkedin: string;
  score: number;
  raisons: string[];
}

export interface ContactProspect {
  emails: string[];
  site: string | null;
  telephones: string[];
  /** D'où viennent les coordonnées — site officiel relu, ou fiche fournisseur ONSSA. */
  source: string | null;
}

/** Site officiel relu d'abord ; à défaut, les coordonnées de la fiche fournisseur. */
function contactProspect(nom: string): ContactProspect {
  const s = contactSociete(nom);
  const r = contactDe(nom);
  const emails = s?.emails?.length ? s.emails : r.emails;
  return {
    emails,
    site: s?.site ?? r.site ?? null,
    telephones: s?.telephones?.length ? s.telephones : r.telephones,
    source: s?.emails?.length ? `site officiel, relu le ${s.verifie}` : emails.length ? "fiche fournisseur RASD" : s?.site || r.site ? "site connu, e-mail à trouver" : null,
  };
}

// Un fabricant dont la filiale est elle-même détentrice au Maroc (SHARDA
// CROPCHEM / SHARDA MAROC, RAINBOW / RAINBOW AGROSCIENCES…) vend sous ses
// propres homologations : c'est un concurrent avant d'être un fournisseur.
// Rapprochement sur le mot distinctif de la raison sociale — signal, pas preuve.
const MOTS_COMMUNS = new Set(["agro", "phyto", "united", "capital", "comptoir", "univers", "maghreb", "grain",
  "agri", "green", "maroc", "chimie", "chem", "trade", "seeds", "care", "protect", "plant", "process", "systems",
  "equipments", "technic", "spray", "agricole", "souss", "afrique", "international", "group", "groupe"]);
const MARQUES_DETENTEURS = new Map<string, string>();
for (const d of DETENTEURS) {
  const mot = cleFabricant(d.nom).split(" ").find((m) => m.length >= 4 && !MOTS_COMMUNS.has(m));
  if (mot && !MARQUES_DETENTEURS.has(mot)) MARQUES_DETENTEURS.set(mot, d.nom);
}
function detenteurApparente(cle: string, detenteurNom: string): string | null {
  for (const m of cle.split(" ")) {
    const d = MARQUES_DETENTEURS.get(m);
    if (d && d !== detenteurNom) return d;
  }
  return null;
}

/** Écartée par l'utilisateur : « UPL » écarte UPL LIMITED, UPL EUROPE LTD… */
function estExclu(cle: string): boolean {
  const mots = cle.split(" ");
  return (CONFIG.exclus ?? []).some((e) => {
    const k = cleFabricant(e);
    return !!k && (cle === k || (k.includes(" ") ? cle.includes(k) : mots.includes(k)));
  });
}

/** Clés des sociétés qui fournissent déjà le détenteur : ce ne sont pas de NOUVEAUX fournisseurs. */
function fournisseursActuels(detenteurId: string): Set<string> {
  return new Set(produitsDe(detenteurId).flatMap((p) => p.fournisseurs).map(cleFabricant));
}

const NB_CIBLES_PROSPECTEES = 40;

/** Fournisseurs à contacter, dans l'ordre. Le premier est celui du jour. */
export function fournisseursSuggeres(detenteurId: string, aujourdhui = new Date(), n = 10): FournisseurSuggere[] {
  // Les 40 meilleures, plus les 15 meilleures de chaque thème : un jour
  // « deuxième source » ne doit pas manquer de candidats parce que les trous de
  // gamme, plus lourds, occupent la tête du classement.
  const toutes = moleculesCibles(detenteurId, aujourdhui);
  const cibles = [...new Set([
    ...toutes.slice(0, NB_CIBLES_PROSPECTEES),
    ...(["manques", "exclusivite", "portefeuille"] as Theme[]).flatMap((t) => toutes.filter((m) => themeDe(m) === t).slice(0, 15)),
  ])];
  const exclus = new Set([...fournisseursActuels(detenteurId), ...JOURNAL.map((p) => p.cle)]);

  const parFab = new Map<string, { f: Fabricant; mols: CibleMolecule[] }>();
  for (const c of cibles) {
    for (const f of generiquesDe(c.cles)) {
      if (exclus.has(f.cle) || estExclu(f.cle)) continue;
      const e = parFab.get(f.cle) ?? { f, mols: [] };
      if (!e.mols.includes(c)) e.mols.push(c);
      parFab.set(f.cle, e);
    }
  }

  const nomDetenteur = detenteurParId(detenteurId).nom;
  const out: FournisseurSuggere[] = [];
  for (const { f, mols } of parFab.values()) {
    mols.sort((a, b) => b.score - a.score);
    const top = mols.slice(0, 5);
    const contact = contactProspect(f.nom);
    const ocdeUsine = dansRegion(f, "OCDE");
    let score = top.reduce((s, m, i) => s + m.score / (i + 1), 0) + f.registres.length * 3;
    if (contact.emails.length) score += 15;
    else if (contact.site) score += 5;
    if (f.meToo) score += 10;
    if (ocdeUsine) score += 5;
    if (!f.paysFiable) score -= 5;
    const concurrent = detenteurApparente(f.cle, nomDetenteur);
    if (concurrent) score -= 40;
    // « Huaian Guorui — chimie, SARL » : nom chinois glosé, introuvable tel quel.
    const glose = f.nom.includes(" — ");
    if (glose) score -= 30;
    const raisons = [
      glose ? "nom chinois traduit par RASD : raison sociale anglaise à retrouver" : null,
      concurrent ? `apparenté au détenteur marocain ${concurrent} : concurrent direct, à confirmer` : null,
      `fabrique ${top.map((m) => m.molecule).join(", ")}`,
      `${f.registres.length} registre(s) : ${f.registres.join(", ")}`,
      f.meToo ? "déjà référencé à l'ONSSA pour un autre détenteur (dossier technique connu)" : null,
      contact.source ?? "coordonnées à trouver",
    ].filter(Boolean) as string[];
    out.push({
      nom: f.nom, cle: f.cle, pays: f.pays, paysFiable: f.paysFiable, registres: f.registres,
      dejaAuMaroc: f.meToo, molecules: top, contact, linkedin: lienLinkedIn(f.nom),
      score: Math.round(score), raisons,
    });
  }
  out.sort((a, b) => b.score - a.score || a.nom.localeCompare(b.nom));

  // Le thème du jour fait alterner manques, sorties d'exclusivité et deuxième
  // source : le fournisseur du jour est le mieux classé SUR LES MOLÉCULES DU
  // THÈME, de préférence joignable, et son message s'ouvre sur elles.
  const theme = themeDuJour(aujourdhui);
  const duTheme = (m: CibleMolecule) => themeDe(m) === theme;
  const scoreTheme = (s: FournisseurSuggere) =>
    s.molecules.filter(duTheme).reduce((t, m, i) => t + m.score / (i + 1), 0) +
    (s.contact.emails.length ? 15 : s.contact.site ? 5 : 0) +
    (s.raisons.some((r) => r.startsWith("apparenté")) ? -40 : 0) +
    (s.raisons.some((r) => r.startsWith("nom chinois")) ? -30 : 0);
  const candidats = out.filter((s) => s.molecules.some(duTheme));
  const joignables = candidats.filter((s) => s.contact.emails.length || s.contact.site);
  const meilleur = (joignables.length ? joignables : candidats).sort((a, b) => scoreTheme(b) - scoreTheme(a))[0];
  if (meilleur) {
    out.splice(out.indexOf(meilleur), 1);
    out.unshift(meilleur);
    meilleur.molecules.sort((a, b) => Number(duTheme(b)) - Number(duTheme(a)) || b.score - a.score);
    meilleur.raisons.unshift(`thème du jour : ${LIBELLE_THEME[theme]}`);
  }
  return out.slice(0, n);
}

/** Thème du jour, à tour de rôle selon data/prospection-config.json. */
export function themeDuJour(aujourdhui = new Date()): Theme {
  const r: Theme[] = CONFIG.rotation?.length ? CONFIG.rotation : ["manques", "exclusivite", "portefeuille"];
  const jour = Math.floor(aujourdhui.getTime() / 86_400_000);
  return r[jour % r.length];
}

// ── Le message, en anglais ──────────────────────────────────────────────────

export function messageAnglais(s: FournisseurSuggere, config = CONFIG): { objet: string; corps: string } {
  const mols = s.molecules.map((m) => m.nomAnglais);
  const liste = mols.length > 1 ? `${mols.slice(0, -1).join(", ")} and ${mols[mols.length - 1]}` : mols[0] ?? "your active ingredients";
  const objet = `Sourcing enquiry from Morocco — ${mols.slice(0, 3).join(", ")}`;
  const corps = `Dear ${s.nom} team,

I am writing on behalf of ${config.societe}, a crop protection company registering and distributing plant protection products in ${config.paysSociete}.

We are expanding our portfolio and are looking for a reliable manufacturer of the following active ingredient(s), as technical grade and/or formulated products: ${liste}.

Could you kindly share:
- your product catalogue and the technical specifications (minimum purity, relevant impurities) for these molecules;
- the manufacturing site(s) and your existing registrations, in particular in OECD countries;
- the availability of a technical dossier (5-batch analysis, GLP studies, letter of access) to support a registration with ONSSA, the Moroccan authority;
- indicative prices, MOQ, lead times and Incoterms;
- COA, SDS and TDS samples.

We would be glad to schedule a short call to discuss a possible long-term cooperation.

Best regards,
${config.signature.join("\n")}`;
  return { objet, corps };
}

// ── Le suivi ────────────────────────────────────────────────────────────────

export function detenteurAgent(): Detenteur {
  const d = DETENTEURS.find((x) => x.nom.toUpperCase() === CONFIG.detenteur.toUpperCase());
  return d ?? detenteurParId(null);
}

function joursDepuis(iso: string, aujourdhui: Date): number {
  return Math.floor((aujourdhui.getTime() - new Date(iso).getTime()) / 86_400_000);
}

/** Envoyés (ou relancés) sans réponse depuis plus de N jours. */
export function relancesDues(aujourdhui = new Date()): Prospect[] {
  return JOURNAL.filter((p) => {
    if (p.statut !== "envoyé" && p.statut !== "relancé") return false;
    const dernier = [p.envoyeLe, ...(p.relances ?? [])].filter(Boolean).sort().pop();
    return dernier ? joursDepuis(dernier, aujourdhui) >= CONFIG.relanceApresJours : false;
  });
}

export function statsJournal() {
  const parStatut = Object.fromEntries(STATUTS.map((s) => [s, JOURNAL.filter((p) => p.statut === s).length])) as Record<StatutProspect, number>;
  return { total: JOURNAL.length, parStatut, relancesDues: relancesDues().length };
}
