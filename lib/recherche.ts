import { DETENTEURS, FOURNISSEURS, MATIERES, PRODUITS } from "./data";
import { ANNUAIRE_PISTES } from "./pistes";
import { USINES_CHINE } from "./icama";
import { USINES_TURQUES } from "./bku";
import { PRODUCTEURS_RUSSES } from "./russie";
import { etiquetteRusse } from "./cyrillique";
import { PRODUCTEURS_COREENS, etiquette as etiquetteCoree } from "./coree";
import { USINES_BRESIL } from "./bresil";
import { USINES_SOURCING } from "./epa";
import { ORGANISMES_BPE, SOCIETES_AGREEES, PRODUITS_EXPIRES } from "./onssa-eservice";
import { CONSTITUANTS_APVMA, apparierApvma } from "./apvma";
import { molecules, sansTeneurs } from "./formulation";
import { idMatiere } from "./liens";

// ────────────────────────────────────────────────────────────────────────────
// RECHERCHE TRANSVERSE
//
// Sept registres cohabitent maintenant dans l'outil, et rien ne permettait de
// retrouver une société ou une molécule sans savoir d'avance dans lequel elle
// se trouve. Cette recherche répond à « où est X », pas à « que sait-on de X ».
//
// L'index vit côté SERVEUR et n'est jamais envoyé au navigateur. Il pèse plus
// de dix mille entrées : les expédier à chaque page alourdirait le chargement
// pour une fonction que l'on n'utilise pas à chaque visite. Le client envoie
// une requête, le serveur renvoie seize suggestions.
//
// Elle classe par qualité de correspondance — début du libellé, mot, alias
// ISO, sous-chaîne, radical — puis propose une correction de frappe bornée
// quand rien d'ancré ne match. Le type de chaque résultat reste visible.
// ────────────────────────────────────────────────────────────────────────────

export type TypeEntree =
  | "matiere"
  | "produit"
  | "constituant"
  | "fournisseur"
  | "detenteur"
  | "piste"
  | "usine_chine"
  | "usine_turquie"
  | "producteur_russe"
  | "producteur_coreen"
  | "usine_bresil"
  | "usine_epa"
  | "societe_agreee"
  | "organisme_bpe"
  | "produit_expire";

export interface Entree {
  id: string;
  libelle: string;
  /** Contexte affiché sous le libellé — pays, catégorie, détenteur… */
  detail: string;
  type: TypeEntree;
  /** Destination, ou null pour une entrée sans page dédiée. */
  href: string | null;
  /** Départage deux correspondances de même qualité : volume, importance. */
  poids: number;
}

export const LIBELLE_TYPE: Record<TypeEntree, string> = {
  matiere: "Matière active",
  produit: "Produit",
  constituant: "PUBCRIS hors index",
  fournisseur: "Fournisseur ONSSA",
  detenteur: "Détenteur",
  piste: "Piste australienne",
  usine_chine: "Usine chinoise",
  usine_turquie: "Usine turque",
  producteur_russe: "Producteur russe",
  producteur_coreen: "Société coréenne",
  usine_bresil: "Usine (registre brésilien)",
  usine_epa: "Usine (registre EPA)",
  societe_agreee: "Société agréée ONSSA",
  organisme_bpe: "Organisme d'essai BPE",
  produit_expire: "Produit expiré",
};

/**
 * Ordre de préférence à correspondance égale. Ce qui sert la décision passe
 * devant ce qui documente : on cherche presque toujours une molécule ou un
 * produit, rarement une usine.
 */
const RANG: Record<TypeEntree, number> = {
  matiere: 0,
  produit: 1,
  constituant: 2,
  detenteur: 3,
  fournisseur: 4,
  societe_agreee: 5,
  piste: 6,
  usine_epa: 7,
  usine_chine: 8,
  usine_turquie: 8,
  producteur_russe: 8,
  producteur_coreen: 8,
  usine_bresil: 6,
  organisme_bpe: 9,
  produit_expire: 10,
};

function normaliser(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function compact(s: string): string {
  return s.replace(/ /g, "");
}

/** Le « e » final tombe, comme dans lib/requete.ts : emamectine ↔ emamectin. */
function radical(s: string): string {
  return s.replace(/e$/, "");
}

function aliasDe(...xs: (string | null | undefined)[]): string[] {
  const out: string[] = [];
  const vu = new Set<string>();
  for (const x of xs) {
    const n = normaliser(x ?? "");
    if (!n || vu.has(n)) continue;
    vu.add(n);
    out.push(n);
  }
  return out;
}

interface Indexee extends Entree {
  cle: string;
  /** Positions de début de mot, pour distinguer « meth » de « diméth ». */
  mots: string[];
  /** Graphies secondaires : molécule nue, ISO anglais, AMM. */
  alias: string[];
}

function construire(): Indexee[] {
  const out: (Entree & { alias?: string[] })[] = [];

  for (const m of MATIERES) {
    const extras: string[] = [m.molecule];
    for (const mol of molecules(m.nom, m.molecule)) {
      extras.push(mol);
      const iso = apparierApvma(mol);
      if (iso) extras.push(iso.nom);
    }
    out.push({
      id: `ma-${m.id}`,
      libelle: m.nom,
      detail: [m.categorie, `${m.nbHomologations} AMM`, `${m.detenteurs.length} détenteur(s)`]
        .filter(Boolean)
        .join(" · "),
      type: "matiere",
      href: `/matieres/${m.id}`,
      poids: m.nbHomologations,
      alias: aliasDe(...extras),
    });
  }

  for (const p of PRODUITS) {
    out.push({
      id: `pr-${p.id}`,
      libelle: p.nomCommercial,
      detail: [p.detenteur, p.categorie, p.matieresActives.join(" + ")]
        .filter(Boolean)
        .join(" · "),
      type: "produit",
      href: `/produits?q=${encodeURIComponent(p.nomCommercial)}`,
      poids: p.usages.length,
      alias: aliasDe(
        ...p.matieresActives,
        p.amm,
        ...p.matieresActives.flatMap((ma) => {
          const iso = apparierApvma(ma);
          return iso ? [iso.nom] : [];
        })
      ),
    });
  }

  // Molécules PUBCRIS sans ligne ONSSA : mancozèbe, chlorpyrifos… On ne les
  // invente pas au Maroc — la fiche dit « absente de l'index ». Sans elles,
  // la barre répondait « aucun résultat » pour une substance pourtant connue
  // de l'outil.
  for (const c of CONSTITUANTS_APVMA) {
    if (c.nbProduitsAgricoles < 1) continue;
    if (idMatiere(c.nom)) continue;
    out.push({
      id: `au-${c.id}`,
      libelle: c.nom,
      detail: [`Australie · ${c.statut}`, `${c.nbProduitsAgricoles} produit(s) PUBCRIS`, "absente de l'index ONSSA"].join(
        " · "
      ),
      type: "constituant",
      href: `/constituants/${encodeURIComponent(c.id)}`,
      poids: c.nbProduitsAgricoles,
    });
  }

  for (const d of DETENTEURS) {
    out.push({
      id: `de-${d.id}`,
      libelle: d.nom,
      detail: `${d.nbProduits} produits · ${d.nbMatieresActives} matières actives`,
      type: "detenteur",
      // Choisir un détenteur, ce n'est pas ouvrir une page : c'est changer de
      // société, ce dont dépendent tous les compteurs du ruban.
      href: `/detenteur/${d.id}`,
      poids: d.nbProduits * 3,
    });
  }

  for (const f of FOURNISSEURS) {
    out.push({
      id: `fo-${f.id}`,
      libelle: f.nom,
      detail: [f.pays ?? "pays à préciser", `${f.nbMatieresActives} M.A. fournies`].join(" · "),
      type: "fournisseur",
      href: `/fournisseurs?q=${encodeURIComponent(f.nom)}`,
      poids: f.nbLignesMaroc,
    });
  }

  for (const p of ANNUAIRE_PISTES) {
    if (p.lien === "referencee") continue; // déjà présent comme fournisseur
    out.push({
      id: `pi-${p.id}`,
      libelle: p.nom,
      detail: [p.pays ?? "pays à préciser", `${p.matieres.length} M.A. en Australie`].join(" · "),
      type: "piste",
      href: `/fournisseurs/piste/${p.id}`,
      poids: p.matieresMaroc.length,
    });
  }

  // ⚠️ MÊME RAISON QUE POUR LE RUSSE : la normalisation ne garde que [a-z0-9],
  // et un nom en caractères han s'y réduisait à la chaîne vide. Les usines
  // chinoises étaient donc introuvables par cette recherche. Le libellé porte
  // le pinyin, les caractères d'origine passent en détail.
  for (const u of USINES_CHINE) {
    out.push({
      id: `cn-${u.nom}`,
      libelle: u.latin ?? u.nom,
      detail: `Chine${u.region ? ` · ${u.region}` : ""} · ${u.nom} · ${u.matieres.length} M.A. de l'index`,
      type: "usine_chine",
      href: `/fournisseurs?q=${encodeURIComponent(u.nom)}`,
      poids: u.matieres.length,
      alias: aliasDe(u.nom, u.glose, u.latin),
    });
  }

  for (const u of USINES_TURQUES) {
    if (!u.nom) continue;
    out.push({
      id: `tr-${u.id}`,
      libelle: u.nom,
      detail: `Turquie · ${u.matieresMaroc.length} M.A. de l'index · ${u.nbImal} İMAL`,
      type: "usine_turquie",
      href: `/fournisseurs?q=${encodeURIComponent(u.nom)}`,
      poids: u.matieresMaroc.length,
    });
  }

  // ⚠️ INDEXÉS SUR LA TRANSLITTÉRATION, pas sur le nom d'origine. La
  // normalisation de cette recherche ne garde que [a-z0-9] : un nom cyrillique
  // s'y réduirait à la chaîne vide et la société serait introuvable. Le
  // libellé porte donc le latin, et le cyrillique passe en détail — visible,
  // mais pas ce sur quoi on tape.
  for (const s of PRODUCTEURS_RUSSES) {
    out.push({
      id: `ru-${s.cle}`,
      libelle: etiquetteRusse(s),
      detail: `Russie · ${s.nom} · ${s.nbHomologations} homologation(s)`,
      type: "producteur_russe",
      href: `/fournisseurs?pays=${encodeURIComponent("Russie")}`,
      poids: s.nbHomologations,
    });
  }

  // ⚠️ MÊME RAISON QUE POUR LE RUSSE ET LE CHINOIS : un nom en hangul se
  // réduit à la chaîne vide et la société serait introuvable. Le libellé porte
  // la romanisation ou le nom commercial, le hangul passe en détail.
  for (const s of PRODUCTEURS_COREENS) {
    out.push({
      id: `kr-${s.cle}`,
      libelle: etiquetteCoree(s),
      detail: `Corée du Sud · ${s.nom} · ${s.nbHomologations} homologation(s)`,
      type: "producteur_coreen",
      href: `/fournisseurs?pays=${encodeURIComponent("Corée du Sud")}`,
      poids: s.matieres.length * 2,
    });
  }

  for (const u of USINES_BRESIL) {
    out.push({
      id: `br-${u.id}`,
      libelle: u.nom,
      detail: [u.pays ?? u.paysBrut, u.sites.slice(0, 2).join(" · "),
               `${u.matieres.length} M.A. fabriquées`].filter(Boolean).join(" · "),
      type: "usine_bresil",
      href: `/fournisseurs?q=${encodeURIComponent(u.nom)}`,
      poids: u.matieres.length * 2,
    });
  }

  for (const u of USINES_SOURCING) {
    out.push({
      id: `ep-${u.id}`,
      libelle: u.nom,
      detail: [u.pays, u.villes.slice(0, 2).join(", "), `${u.nbSites} site(s)`]
        .filter(Boolean)
        .join(" · "),
      type: "usine_epa",
      href: `/fournisseurs?q=${encodeURIComponent(u.nom)}`,
      poids: u.nbSites,
    });
  }

  // Une société agréée est le plus souvent un détenteur de l'index : quand
  // c'est le cas, la sélectionner bascule sur son portefeuille. Sinon elle
  // reste informative — l'agrément existe, mais l'index ne la connaît pas.
  const detenteurParNom = new Map(DETENTEURS.map((d) => [normaliser(d.nom), d.id]));
  for (const s of SOCIETES_AGREEES) {
    if (!s.nom) continue;
    const idDet = detenteurParNom.get(normaliser(s.nom));
    out.push({
      id: `ag-${s.nom}`,
      libelle: s.nom,
      detail: [s.activite, `agrément ${s.agrement.numero ?? "?"}`].filter(Boolean).join(" · "),
      type: "societe_agreee",
      href: idDet ? `/detenteur/${idDet}` : null,
      poids: 1,
    });
  }

  for (const o of ORGANISMES_BPE) {
    if (!o.nom) continue;
    out.push({
      id: `bpe-${o.nom}`,
      libelle: o.nom,
      detail: `Essais BPE · ${o.couverture.length} périmètre(s) · ${o.agrement.numero ?? ""}`,
      type: "organisme_bpe",
      href: null,
      poids: o.couverture.length,
    });
  }

  for (const p of PRODUITS_EXPIRES) {
    if (!p.produit) continue;
    out.push({
      id: `ex-${p.amm ?? p.produit}`,
      libelle: p.produit,
      detail: [p.detenteur, p.matieresActives, `expiré le ${p.expiration}`]
        .filter(Boolean)
        .join(" · "),
      type: "produit_expire",
      href: null,
      poids: 0,
    });
  }

  return out.map((e) => {
    const cle = normaliser(e.libelle);
    const alias = (e.alias ?? []).filter((a) => a !== cle);
    const mots = [...new Set([cle, ...alias].flatMap((s) => s.split(" ").filter(Boolean)))];
    return { ...e, alias, cle, mots };
  });
}

const INDEX = construire();

export const NB_ENTREES = INDEX.length;

/**
 * Dictionnaire des molécules (français + ISO) pour corriger une frappe.
 * On ne floute PAS les 10 000 raisons sociales : trop de faux positifs.
 */
const DICTIONNAIRE: { n: string; affiche: string }[] = [];
(() => {
  const vu = new Set<string>();
  const push = (brut: string, affiche: string) => {
    const n = normaliser(brut);
    if (n.length < 4 || vu.has(n)) return;
    vu.add(n);
    DICTIONNAIRE.push({ n, affiche });
  };
  for (const m of MATIERES) {
    for (const mol of molecules(m.nom, m.molecule)) {
      push(mol, mol);
      const iso = apparierApvma(mol);
      if (iso) push(iso.nom, mol);
    }
  }
  for (const c of CONSTITUANTS_APVMA) {
    if (c.nbProduitsAgricoles < 1) continue;
    if (idMatiere(c.nom)) continue;
    if (normaliser(c.nom).split(" ").length > 3) continue;
    push(c.nom, c.nom);
  }
})();

export interface Resultat extends Entree {
  /** 0 = préfixe du libellé ou d'un alias, 1 = mot, 2 = contenu, 3 = radical. */
  qualite: 0 | 1 | 2 | 3;
}

export interface Interpretation {
  resultats: Resultat[];
  /** Proposition quand la saisie ne matche pas mais s'en rapproche (« tubécunazole » → Tébuconazole). */
  correction: string | null;
}

function plafondDistance(len: number): number {
  if (len >= 12) return 3;
  if (len >= 8) return 2;
  if (len >= 5) return 1;
  return 0;
}

/** Damerau-Levenshtein, avec sortie anticipée au-delà de `max`. */
function distance(a: string, b: string, max: number): number {
  if (a === b) return 0;
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > max) return max + 1;
  let prev2: number[] = [];
  let prev: number[] = Array.from({ length: lb + 1 }, (_, j) => j);
  for (let i = 1; i <= la; i++) {
    const cur: number[] = new Array(lb + 1);
    cur[0] = i;
    let ligneMin = i;
    for (let j = 1; j <= lb; j++) {
      const cout = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cout);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        v = Math.min(v, prev2[j - 2] + 1);
      }
      cur[j] = v;
      if (v < ligneMin) ligneMin = v;
    }
    if (ligneMin > max) return max + 1;
    prev2 = prev;
    prev = cur;
  }
  return prev[lb];
}

function corriger(n: string): string | null {
  const max = plafondDistance(n.length);
  if (max === 0) return null;
  let best: { affiche: string; d: number; n: string } | null = null;
  for (const t of DICTIONNAIRE) {
    if (t.n[0] !== n[0]) continue;
    if (Math.abs(t.n.length - n.length) > max) continue;
    const d = distance(n, t.n, max);
    if (d === 0 || d > max) continue;
    if (!best || d < best.d || (d === best.d && t.n.length < best.n.length)) {
      best = { affiche: t.affiche, d, n: t.n };
    }
  }
  return best?.affiche ?? null;
}

/** « emamectine » ↔ « emamectin », pas « chlorpyriphos » ↔ le mot « chlor ». */
function radicauxCompatibles(a: string, b: string): boolean {
  const ra = radical(a);
  const rb = radical(b);
  if (ra.length < 4 || rb.length < 4) return false;
  if (ra === rb) return true;
  if (ra.startsWith(rb) || rb.startsWith(ra)) return Math.abs(ra.length - rb.length) <= 2;
  return false;
}

function qualiteDe(e: Indexee, n: string): 0 | 1 | 2 | 3 | null {
  if (e.cle.startsWith(n) || e.alias.some((a) => a.startsWith(n))) return 0;
  if (e.mots.some((m) => m.startsWith(n))) return 1;
  if (e.cle.includes(n) || e.alias.some((a) => a.includes(n))) return 2;
  const c = compact(n);
  if (c.length >= 3 && (compact(e.cle).includes(c) || e.alias.some((a) => compact(a).includes(c)))) {
    return 2;
  }
  if (n.length >= 4) {
    if (
      e.mots.some((m) => radicauxCompatibles(m, n)) ||
      e.alias.some((a) => radicauxCompatibles(a, n) || radicauxCompatibles(compact(a), n))
    ) {
      return 3;
    }
  }
  return null;
}

function penaliteMelange(libelle: string): number {
  return sansTeneurs(libelle).includes("/") ? 1 : 0;
}

function classer(trouves: (Indexee & { qualite: 0 | 1 | 2 | 3 })[], limite: number): Resultat[] {
  trouves.sort(
    (a, b) =>
      a.qualite - b.qualite ||
      (RANG[a.type] ?? 9) - (RANG[b.type] ?? 9) ||
      penaliteMelange(a.libelle) - penaliteMelange(b.libelle) ||
      b.poids - a.poids ||
      a.libelle.localeCompare(b.libelle)
  );
  const vus = new Set<string>();
  const out: Resultat[] = [];
  for (const e of trouves) {
    const k = `${e.cle}|${e.type}`;
    if (vus.has(k)) continue;
    vus.add(k);
    out.push({
      id: e.id,
      libelle: e.libelle,
      detail: e.detail,
      type: e.type,
      href: e.href,
      poids: e.poids,
      qualite: e.qualite,
    });
    if (out.length >= limite) break;
  }
  return out;
}

function matcher(n: string): (Indexee & { qualite: 0 | 1 | 2 | 3 })[] {
  const trouves: (Indexee & { qualite: 0 | 1 | 2 | 3 })[] = [];
  for (const e of INDEX) {
    const q = qualiteDe(e, n);
    if (q === null) continue;
    trouves.push({ ...e, qualite: q });
  }
  return trouves;
}

/**
 * Seize suggestions au plus, classées par qualité puis par type (matière
 * avant produit). Au-delà du préfixe : radical, graphie ISO, constituants
 * PUBCRIS hors index, et correction de frappe (« tubécunazole »).
 */
export function interpreter(q: string, limite = 16): Interpretation {
  const n = normaliser(q);
  if (n.length < 2) return { resultats: [], correction: null };

  const directs = matcher(n);
  const ancre = directs.some((d) => d.qualite <= 1);
  if (ancre) return { resultats: classer(directs, limite), correction: null };

  const correction = corriger(n);
  if (correction) {
    const via = matcher(normaliser(correction));
    if (via.length) return { resultats: classer(via, limite), correction };
  }
  return { resultats: classer(directs, limite), correction: null };
}

export function chercher(q: string, limite = 16): Resultat[] {
  return interpreter(q, limite).resultats;
}
