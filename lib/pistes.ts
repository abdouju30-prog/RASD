import { CONSTITUANTS_APVMA, META_APVMA, apparierApvma } from "./apvma";
import type { SocieteApvma } from "./apvma";
import { FOURNISSEURS, MATIERES } from "./data";

// ────────────────────────────────────────────────────────────────────────────
// PISTES FOURNISSEUR HORS INDEX ONSSA
//
// L'index marocain ne nomme que les sociétés qui fournissent DÉJÀ un détenteur
// au Maroc. Pour trouver un fabricant que personne n'a encore fait entrer, il
// faut un registre étranger qui publie le détenteur de chaque homologation.
//
// Le registre PUBCRIS (Australie) le fait : chaque produit enregistré porte le
// nom de la société qui le détient. On en tire, matière active par matière
// active, la liste des sociétés ayant passé un régulateur exigeant — dont une
// partie sont des génériqueurs indiens et chinois absents du Maroc.
//
// ⚠️ CE QUE CETTE LISTE N'EST PAS.
// Une homologation australienne ne vaut rien devant l'ONSSA : elle ne raccourcit
// aucun délai, ne remplace aucune étude, et n'ouvre pas la voie « me-too » —
// seul un fournisseur déjà référencé à l'index marocain l'ouvre. Ce que ces
// sociétés apportent est industriel : elles fabriquent la molécule, elles ont
// constitué un dossier réglementaire complet ailleurs, et elles sont joignables.
// Le dossier marocain reste entièrement à monter.
//
// ⚠️ Le rattachement à l'index ONSSA se fait sur le NOM, jamais sur un
// identifiant : « absente de l'index » veut dire « absente sous ce nom-là ».
// Une filiale portant un autre nom peut très bien y figurer — d'où la catégorie
// intermédiaire « homonyme », qui signale une parenté probable à vérifier
// plutôt que de trancher à la place de l'utilisateur.
// ────────────────────────────────────────────────────────────────────────────

export type { SocieteApvma };

export type LienOnssa =
  | "referencee" // même société, déjà à l'index marocain
  | "homonyme" // nom proche : même groupe probable, à vérifier
  | "absente"; // aucun rapprochement possible

export interface Piste extends SocieteApvma {
  id: string;
  lien: LienOnssa;
  /** Nom du fournisseur ONSSA rapproché, pour que le lien reste vérifiable. */
  fournisseurOnssa: string | null;
}

// ── Normalisation des raisons sociales ──────────────────────────────────────
// Deux registres n'écrivent jamais une société de la même façon. On ramène le
// nom à ses mots porteurs d'identité, en retirant ceux qui n'en portent aucune.

// Forme juridique : aucune identité. « SHARDA CROPCHEM LIMITED » et « SHARDA
// CROPCHEM LTD » sont la même société.
const MOTS_JURIDIQUES = new Set(
  ("PTY LTD LTDA LIMITED CO COMPANY INC CORP CORPORATION PVT PRIVATE PTE GMBH " +
    "MBH KG AG SA SAS SARL SRL SPRL SL SAU NV BV BVBA AS APS OY AB SPA PLC LLC " +
    "LLP DOO SRO OOO ZAO PJSC JSC BHD SDN GROUP GROUPE HOLDING"
  ).split(" ")
);

// Mots de métier : ils comptent pour distinguer deux raisons sociales entières,
// mais ne peuvent JAMAIS à eux seuls rapprocher deux sociétés. Sans cette
// distinction, « ZHEJIANG HEBEN PESTICIDE » se rattacherait à « INDIA PESTICIDE
// LTD » sur le seul mot « pesticide ».
const MOTS_METIER = new Set(
  ("INTERNATIONAL INTL INDUSTRIE INDUSTRY INDUSTRIAL CHEMICAL CHEMFERT " +
    "AGROCHEMICAL AGROCHEM AGRO AGRI AGRICULTURE AGRICULTURAL AGROSCIENCE " +
    "SCIENCE CROPSCIENCE CROP TECHNOLOGY TECHNOLOGIE TECH BIOTECH BIOSCIENCE " +
    "BIOTECHNOLOGY BIOCHEMICAL BIO SOLUTION PRODUCT PESTICIDE PROTECTION PLANT " +
    "UNION PHARMACEUTICAL LABORATORY LABORATORIE CENTRE CENTER ENVIRONMENTAL " +
    "TRADING TRADE IMP EXP"
  ).split(" ")
);

// Toponymes : ils situent, ils n'identifient pas. « SHANDONG » est partagé par
// des dizaines de sociétés chinoises sans lien entre elles — s'en servir pour
// rapprocher deux noms produirait des faux positifs en série. Ils restent
// pourtant dans la clé exacte, où ils distinguent utilement deux entités.
const TOPONYMES = new Set(
  ("AUSTRALIA AUSTRALASIA INDIA CHINA CHINE SINGAPORE EUROPE EUROPEAN FRANCE " +
    "ESPANA SPAIN DEUTSCHLAND GERMANY USA NETHERLANDS BENELUX ITALIA IBERICA " +
    "BRASIL MEXICO MAROC AFRICA ASIA ASIATIC NANJING SHANDONG NINGBO JIANGSU " +
    "ZHEJIANG HEBEI ANHUI SHANGHAI BEIJING SICHUAN HUBEI HUNAN JIANGXI " +
    "GUANGDONG WEIFANG NANTONG RUDONG LESHAN CHENGWU ZHENJIANG JIANGNAN " +
    "SHENZHEN QINGDAO TIANJIN GUANGZHOU"
  ).split(" ")
);

/** « INDUSTRIES » et « INDUSTRIE » désignent la même chose des deux côtés. */
function singulier(t: string): string {
  return t.length >= 5 && t.endsWith("S") ? t.slice(0, -1) : t;
}

/** Mots porteurs de sens : forme juridique retirée, pluriels ramenés au singulier. */
function mots(nom: string): string[] {
  return nom
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter((t) => t.length > 1)
    .map(singulier)
    .filter((t) => !MOTS_JURIDIQUES.has(t));
}

/**
 * Clé d'identité. Pour une filiale australienne, le toponyme « AUSTRALIA » est
 * retiré : c'est le groupe qu'on cherche à reconnaître, pas l'entité locale.
 */
function cle(nom: string, filiale = false): string {
  const t = mots(nom);
  return (filiale ? t.filter((m) => m !== "AUSTRALIA" && m !== "AUSTRALASIA") : t).join(" ");
}

function slug(nom: string): string {
  return nom
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 70);
}

// ── Index de l'ONSSA ────────────────────────────────────────────────────────

const ONSSA_PAR_CLE = new Map<string, string>();
const ONSSA_PAR_MOT = new Map<string, string[]>();

for (const f of FOURNISSEURS) {
  const k = cle(f.nom);
  if (k && !ONSSA_PAR_CLE.has(k)) ONSSA_PAR_CLE.set(k, f.nom);
  for (const m of new Set(mots(f.nom))) {
    const l = ONSSA_PAR_MOT.get(m) ?? [];
    l.push(f.nom);
    ONSSA_PAR_MOT.set(m, l);
  }
}

/**
 * Un mot n'est distinctif que s'il désigne peu de sociétés. Le seuil se mesure
 * sur l'index lui-même plutôt qu'il ne se devine : un mot porté par trois
 * fournisseurs ou plus est un mot de métier, pas une marque.
 */
function motDistinctif(m: string): boolean {
  if (m.length < 4 || MOTS_METIER.has(m) || TOPONYMES.has(m)) return false;
  const l = ONSSA_PAR_MOT.get(m);
  return Boolean(l && l.length <= 2);
}

function rapprocher(
  nom: string,
  filiale: boolean
): { lien: LienOnssa; fournisseurOnssa: string | null } {
  const k = cle(nom, filiale);
  const exact = k ? ONSSA_PAR_CLE.get(k) : undefined;
  if (exact) return { lien: "referencee", fournisseurOnssa: exact };

  for (const m of mots(nom)) {
    if (!motDistinctif(m)) continue;
    const l = ONSSA_PAR_MOT.get(m);
    if (l && l.length) return { lien: "homonyme", fournisseurOnssa: l[0] };
  }
  return { lien: "absente", fournisseurOnssa: null };
}

const QUALIFIEES = new Map<string, Piste>();

function qualifier(s: SocieteApvma): Piste {
  const vu = QUALIFIEES.get(s.nom);
  if (vu) return { ...vu, nbProduits: s.nbProduits };
  const p: Piste = { ...s, id: slug(s.nom), ...rapprocher(s.nom, s.filialeLocale) };
  QUALIFIEES.set(s.nom, p);
  return p;
}

// ── Pistes d'une matière active ─────────────────────────────────────────────

export interface PistesMatiere {
  /** Un constituant PUBCRIS a-t-il pu être apparié à cette matière active ? */
  apparie: boolean;
  nomAustralien: string | null;
  toutes: Piste[];
  /** Génériqueurs (Inde, Chine, Turquie…) absents de l'index marocain. */
  nouvelles: Piste[];
}

export function pistesPour(nomONSSA: string): PistesMatiere {
  const c = apparierApvma(nomONSSA);
  if (!c) return { apparie: false, nomAustralien: null, toutes: [], nouvelles: [] };

  const toutes = [...(c.societes ?? [])]
    .map(qualifier)
    .sort((a, b) => b.nbProduits - a.nbProduits);

  return {
    apparie: true,
    nomAustralien: c.nom,
    toutes,
    nouvelles: toutes.filter(
      (p) => p.coutFaible && !p.multinationale && p.lien !== "referencee"
    ),
  };
}

// ── Annuaire global ─────────────────────────────────────────────────────────

export interface PisteGlobale extends Piste {
  /** Matières actives détenues en Australie, sous leur nom PUBCRIS. */
  matieres: string[];
  /** Celles homologuées aussi au Maroc — le terrain commun, et le seul utile. */
  matieresMaroc: string[];
  nbProduitsAu: number;
}

/** Noms PUBCRIS des matières actives présentes à l'index marocain. */
const APVMA_AU_MAROC = new Set<string>();
for (const m of MATIERES) {
  const c = apparierApvma(m.nom);
  if (c) APVMA_AU_MAROC.add(c.nom);
}

function construireAnnuaire(): PisteGlobale[] {
  const par = new Map<string, PisteGlobale>();

  for (const c of CONSTITUANTS_APVMA) {
    for (const s of c.societes ?? []) {
      const q = qualifier(s);
      const e =
        par.get(q.nom) ??
        ({ ...q, matieres: [], matieresMaroc: [], nbProduitsAu: 0 } as PisteGlobale);
      e.matieres.push(c.nom);
      if (APVMA_AU_MAROC.has(c.nom)) e.matieresMaroc.push(c.nom);
      e.nbProduitsAu += s.nbProduits;
      par.set(q.nom, e);
    }
  }

  return [...par.values()].sort(
    (a, b) =>
      b.matieresMaroc.length - a.matieresMaroc.length ||
      b.matieres.length - a.matieres.length
  );
}

export const ANNUAIRE_PISTES: PisteGlobale[] = construireAnnuaire();

/** Génériqueurs absents de l'index marocain — le cœur de la prospection. */
export const PISTES_NOUVELLES: PisteGlobale[] = ANNUAIRE_PISTES.filter(
  (p) => p.coutFaible && !p.multinationale && p.lien !== "referencee"
);

export const STATS_PISTES = {
  nbSocietes: ANNUAIRE_PISTES.length,
  nbGeneriques: ANNUAIRE_PISTES.filter((p) => p.coutFaible && !p.multinationale).length,
  nbNouvelles: PISTES_NOUVELLES.length,
  nbAbsentes: PISTES_NOUVELLES.filter((p) => p.lien === "absente").length,
  nbHomonymes: PISTES_NOUVELLES.filter((p) => p.lien === "homonyme").length,
  nbPays: new Set(PISTES_NOUVELLES.map((p) => p.pays).filter(Boolean)).size,
  source: META_APVMA.attribution,
};
