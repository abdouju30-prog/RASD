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
import { LIBELLE_TYPE_ONSSA, TEXTES_ONSSA, estRecent } from "./onssa-reglementation";
import {
  META_ONSSA_LISTES,
  RESTRICTIONS_HORS_INDEX,
  RETIREES_HORS_INDEX,
  hrefOnssa,
  restreintePourMatiere,
  retireePourMatiere,
} from "./onssa-listes";
import {
  filtrerEmplois,
  hrefUsages,
  inventaireCibles,
  inventaireCultures,
  matieresCouvrant,
  resoudreEmploi,
  type FiltreUsage,
} from "./usages";

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
// ISO, sous-chaîne, radical, une lettre d'écart — puis propose une correction
// quand rien d'ancré ne match. Une coquille ne doit pas vider la barre. Le
// type de chaque résultat reste visible.
// ────────────────────────────────────────────────────────────────────────────

export type TypeEntree =
  | "matiere"
  | "culture"
  | "cible"
  | "usage"
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
  | "produit_expire"
  | "nouveaute"
  | "retiree"
  | "restriction";

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
  culture: "Culture",
  cible: "Maladie / ravageur",
  usage: "Usage homologué",
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
  nouveaute: "Nouveauté ONSSA",
  retiree: "Retirée ONSSA",
  restriction: "Restriction ONSSA",
};

/**
 * Ordre de préférence à correspondance égale. Ce qui sert la décision passe
 * devant ce qui documente : on cherche presque toujours une molécule ou un
 * produit, rarement une usine.
 */
const RANG: Record<TypeEntree, number> = {
  usage: 0,
  culture: 0,
  cible: 0,
  matiere: 0,
  produit: 1,
  retiree: 2,
  restriction: 2,
  constituant: 2,
  detenteur: 3,
  fournisseur: 4,
  societe_agreee: 5,
  piste: 6,
  nouveaute: 3,
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

function aliasPays(pays: string | null | undefined, ...plus: (string | null | undefined)[]): string[] {
  const extra: Record<string, string[]> = {
    inde: ["india"],
    chine: ["china"],
    allemagne: ["germany"],
    "etats unis": ["usa"],
    "coree du sud": ["korea", "coree"],
    turquie: ["turkey"],
    bresil: ["brazil"],
    russie: ["russia"],
  };
  const n = normaliser(pays ?? "");
  return aliasDe(pays, ...(extra[n] ?? []), ...plus);
}

/** Suffixes juridiques : indexés en préfixe exact, jamais floutés. */
const SUFFIXE_JURIDIQUE = new Set([
  "ltd",
  "limited",
  "sa",
  "sas",
  "ag",
  "gmbh",
  "inc",
  "llc",
  "llp",
  "plc",
  "pvt",
  "pty",
  "co",
  "company",
  "corp",
  "corporation",
  "bv",
  "sl",
  "srl",
  "spa",
  "sarl",
  "ltda",
  "nv",
  "kg",
  "pte",
  "sdn",
  "bhd",
  "the",
  "and",
  "of",
  "de",
  "du",
  "des",
  "et",
  "la",
  "le",
  "les",
]);

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
    const retrait = retireePourMatiere(m);
    const restriction = restreintePourMatiere(m);
    out.push({
      id: `ma-${m.id}`,
      libelle: m.nom,
      detail: [
        m.categorie,
        `${m.nbHomologations} AMM`,
        `${m.detenteurs.length} détenteur(s)`,
        retrait
          ? "retirée ONSSA — incohérence index"
          : restriction
            ? "restriction d'usage ONSSA"
            : "",
      ]
        .filter(Boolean)
        .join(" · "),
      type: "matiere",
      href: `/matieres/${m.id}`,
      poids: m.nbHomologations,
      alias: aliasDe(...extras),
    });
  }

  // Substances de la liste officielle absentes de l'Excel : on ne leur invente
  // pas de fiche /matieres. Le clic ouvre le PDF ONSSA.
  const hrefRetirees = hrefOnssa(META_ONSSA_LISTES.urlRetirees);
  for (const r of RETIREES_HORS_INDEX) {
    const iso = apparierApvma(r.nom);
    out.push({
      id: `rt-${normaliser(r.nom).replace(/ /g, "-")}`,
      libelle: r.nom,
      detail: [
        "ONSSA",
        r.dateRetrait ? `retirée depuis le ${r.dateRetrait.split("-").reverse().join("/")}` : "retirée",
        "absente de l'index Excel",
      ].join(" · "),
      type: "retiree",
      href: hrefRetirees,
      poids: 10_000,
      alias: aliasDe(r.nom, iso?.nom),
    });
  }

  const hrefRestrictions = hrefOnssa(META_ONSSA_LISTES.urlRestrictions);
  for (const r of RESTRICTIONS_HORS_INDEX) {
    const iso = apparierApvma(r.nom);
    out.push({
      id: `rs-${normaliser(r.nom).replace(/ /g, "-")}`,
      libelle: r.nom,
      detail: [
        "ONSSA",
        r.dateRestriction ? `restriction depuis le ${r.dateRestriction.split("-").reverse().join("/")}` : "restriction d'usage",
        r.condition.slice(0, 120),
        "absente de l'index Excel",
      ]
        .filter(Boolean)
        .join(" · "),
      type: "restriction",
      href: hrefRestrictions,
      poids: 9_000,
      alias: aliasDe(r.nom, iso?.nom),
    });
  }

  for (const c of inventaireCultures()) {
    out.push({
      id: `cu-${c.n.replace(/ /g, "-").slice(0, 80)}`,
      libelle: c.libelle,
      detail: `${c.nbEmplois} usage(s) homologué(s) · ${c.nbMatieres} matière(s)`,
      type: "culture",
      href: hrefUsages({ culture: c.libelle }),
      poids: c.nbEmplois,
      alias: aliasDe(c.libelle),
    });
  }

  for (const c of inventaireCibles()) {
    out.push({
      id: `ci-${c.n.replace(/ /g, "-").slice(0, 80)}`,
      libelle: c.libelle,
      detail: `${c.nbEmplois} usage(s) homologué(s) · ${c.nbMatieres} matière(s)`,
      type: "cible",
      href: hrefUsages({ cible: c.libelle }),
      poids: c.nbEmplois,
      alias: aliasDe(c.libelle),
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
      alias: aliasPays(f.pays),
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
      alias: aliasPays(p.pays),
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
      alias: aliasPays("Chine", u.nom, u.glose, u.latin, u.region),
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
      alias: aliasPays("Turquie"),
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
      alias: aliasPays("Russie", s.nom),
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
      alias: aliasPays("Corée du Sud", s.nom),
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
      alias: aliasPays(u.pays, u.paysBrut),
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
      alias: aliasPays(u.pays, ...u.villes.slice(0, 2)),
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

  // Avis, listes, décrets : une catégorie à part, pas l'index des AMM.
  // « revendeurs », « avis », « liste » doivent tomber dessus.
  for (const t of TEXTES_ONSSA) {
    if (!t.titre) continue;
    const cat = LIBELLE_TYPE_ONSSA[t.type] ?? t.type;
    out.push({
      id: `tx-${t.id}`,
      libelle: t.titre,
      detail: [cat, t.dateMiseEnLigne || t.date, t.source].filter(Boolean).join(" · "),
      type: "nouveaute",
      href: t.url || `/veille#texte-${t.id}`,
      poids: t.nouveau ? 400 : t.misAJour ? 300 : estRecent(t) ? 200 : 40,
      alias: aliasDe(cat, "nouveaute", "nouveautes"),
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
 * Dictionnaire pour corriger une frappe : molécules d'abord (prio 0), puis
 * les mots distinctifs des sociétés (prio 1). Une lettre d'écart suffit ;
 * on ne floute pas les suffixes juridiques.
 */
const DICTIONNAIRE: { n: string; affiche: string; prio: number }[] = [];
(() => {
  const vu = new Set<string>();
  const push = (brut: string, affiche: string, prio: number) => {
    const n = normaliser(brut);
    if (n.length < 4 || vu.has(n) || SUFFIXE_JURIDIQUE.has(n)) return;
    vu.add(n);
    DICTIONNAIRE.push({ n, affiche, prio });
  };
  for (const m of MATIERES) {
    for (const mol of molecules(m.nom, m.molecule)) {
      push(mol, mol, 0);
      const iso = apparierApvma(mol);
      if (iso) push(iso.nom, mol, 0);
    }
  }
  for (const r of RETIREES_HORS_INDEX) {
    push(r.nom, r.nom, 0);
    const iso = apparierApvma(r.nom);
    if (iso) push(iso.nom, r.nom, 0);
  }
  for (const r of RESTRICTIONS_HORS_INDEX) {
    push(r.nom, r.nom, 0);
    const iso = apparierApvma(r.nom);
    if (iso) push(iso.nom, r.nom, 0);
  }
  for (const c of CONSTITUANTS_APVMA) {
    if (c.nbProduitsAgricoles < 1) continue;
    if (idMatiere(c.nom)) continue;
    if (normaliser(c.nom).split(" ").length > 3) continue;
    push(c.nom, c.nom, 0);
  }
  for (const c of inventaireCultures()) push(c.libelle, c.libelle, 2);
  for (const c of inventaireCibles()) push(c.libelle, c.libelle, 2);
  const SOCIETE = new Set<TypeEntree>([
    "fournisseur",
    "detenteur",
    "piste",
    "usine_chine",
    "usine_turquie",
    "producteur_russe",
    "producteur_coreen",
    "usine_bresil",
    "usine_epa",
    "societe_agreee",
  ]);
  const titrer = (s: string) => s.replace(/\b[a-z]/g, (c) => c.toUpperCase());
  for (const e of INDEX) {
    if (!SOCIETE.has(e.type)) continue;
    for (const mot of e.mots) {
      if (mot.length < 5 || /^\d+$/.test(mot)) continue;
      push(mot, titrer(mot), 1);
    }
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
  const cap = n.length >= 4 ? Math.max(plafondDistance(n.length), 1) : plafondDistance(n.length);
  if (cap === 0) return null;
  let best: { affiche: string; d: number; n: string; prio: number } | null = null;
  for (const t of DICTIONNAIRE) {
    if (Math.abs(t.n.length - n.length) > cap) continue;
    const dmax =
      t.prio === 1 ? (t.n[0] === n[0] ? 1 : 0) : t.n[0] === n[0] ? cap : 1;
    if (dmax === 0) continue;
    if (Math.abs(t.n.length - n.length) > dmax) continue;
    const d = distance(n, t.n, dmax);
    if (d === 0 || d > dmax) continue;
    if (
      !best ||
      d < best.d ||
      (d === best.d && t.prio < best.prio) ||
      (d === best.d && t.prio === best.prio && t.n.length < best.n.length)
    ) {
      best = { affiche: t.affiche, d, n: t.n, prio: t.prio };
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

/** Une lettre d'écart sur un mot : gebuconazole, syngnta, cropchm. */
function uneLettre(t: string, m: string, initiale: boolean): boolean {
  if (t.length < 4 || m.length < 4) return false;
  if (SUFFIXE_JURIDIQUE.has(m) || SUFFIXE_JURIDIQUE.has(t)) return false;
  if (/^\d+$/.test(m) || /^\d+$/.test(t)) return false;
  if (Math.abs(t.length - m.length) > 1) return false;
  if (initiale && t[0] !== m[0]) return false;
  return distance(t, m, 1) === 1;
}

function qualiteSimple(e: Indexee, n: string): 0 | 1 | 2 | 3 | null {
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
    if (e.mots.some((m) => uneLettre(n, m, e.type !== "matiere" && e.type !== "constituant"))) {
      return 3;
    }
  }
  return null;
}

function qualiteDe(e: Indexee, n: string): 0 | 1 | 2 | 3 | null {
  const parts = n.split(" ").filter((p) => p.length >= 2);
  if (parts.length <= 1) return qualiteSimple(e, n);
  let worst: 0 | 1 | 2 | 3 = 0;
  for (const p of parts) {
    const q = qualiteSimple(e, p);
    if (q === null) return null;
    if (q > worst) worst = q;
  }
  return worst;
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

function moleculeFiltre(f: FiltreUsage): string | null {
  if (!f.matiere) return null;
  return molecules(f.matiere.nom, f.matiere.molecule)[0] || f.matiere.molecule || f.matiere.nom;
}

function indexeeManuelle(e: Entree, qualite: 0 | 1 | 2 | 3): Indexee & { qualite: 0 | 1 | 2 | 3 } {
  const cle = normaliser(e.libelle);
  return { ...e, cle, alias: [], mots: cle.split(" ").filter(Boolean), qualite };
}

/** Culture × maladie (et matière, si tapée) : une ligne d'usage + les matières qui couvrent. */
function extrasEmploi(f: FiltreUsage, limite: number): (Indexee & { qualite: 0 | 1 | 2 | 3 })[] {
  if (!f.culture && !f.cible) return [];

  const extra: (Indexee & { qualite: 0 | 1 | 2 | 3 })[] = [];
  const molecule = moleculeFiltre(f);
  const combo = Boolean((f.culture && f.cible) || molecule);
  const couvrant = matieresCouvrant(f);
  const stats = filtrerEmplois(f);
  const detail = `${stats.emplois.length} usage(s) · ${stats.nbMatieres} matière(s) · dose et DAR`;

  if (combo) {
    const bits: string[] = [];
    if (molecule) bits.push(molecule);
    if (f.culture && f.cible) bits.push(`${f.culture} × ${f.cible}`);
    else if (f.culture) bits.push(f.culture);
    else if (f.cible) bits.push(f.cible);
    extra.push(
      indexeeManuelle(
        {
          id: `us-${normaliser(bits.join(" ")).replace(/ /g, "-").slice(0, 80)}`,
          libelle: bits.join(" — "),
          detail,
          type: "usage",
          href: hrefUsages({ culture: f.culture, cible: f.cible, molecule }),
          poids: 90_000 + couvrant.length,
        },
        0
      )
    );
  }

  if (f.culture) {
    extra.push(
      indexeeManuelle(
        {
          id: `cu-${normaliser(f.culture).replace(/ /g, "-").slice(0, 80)}`,
          libelle: f.culture,
          detail,
          type: "culture",
          href: hrefUsages({ culture: f.culture, molecule }),
          poids: combo ? 40_000 : 90_000,
        },
        0
      )
    );
  }

  if (f.cible) {
    extra.push(
      indexeeManuelle(
        {
          id: `ci-${normaliser(f.cible).replace(/ /g, "-").slice(0, 80)}`,
          libelle: f.cible,
          detail,
          type: "cible",
          href: hrefUsages({ cible: f.cible, molecule }),
          poids: combo ? 39_000 : 90_000,
        },
        0
      )
    );
  }

  if (!f.matiere) {
    const plafond = Math.max(3, limite - extra.length - 1);
    for (const m of couvrant.slice(0, plafond)) {
      extra.push(
        indexeeManuelle(
          {
            id: `ma-${m.id}`,
            libelle: m.nom,
            detail: ["Homologuée", f.culture, f.cible ? `contre ${f.cible}` : "", `${m.nbHomologations} AMM`]
              .filter(Boolean)
              .join(" · "),
            type: "matiere",
            href: `/matieres/${m.id}`,
            poids: m.nbHomologations,
          },
          1
        )
      );
    }
  }

  return extra;
}

/**
 * Seize suggestions au plus, classées par qualité puis par type (matière
 * avant produit). Une lettre d'écart, un mot de raison sociale ou un pays
 * suffisent : on facilite, on ne vise pas l'identité.
 *
 * Matière, culture et maladie se croisent : « tomate puceron » n'est le
 * libellé d'aucune entrée, on injecte l'usage homologué correspondant.
 */
export function interpreter(q: string, limite = 16): Interpretation {
  const n = normaliser(q);
  if (n.length < 2) return { resultats: [], correction: null };

  const emploi = resoudreEmploi(q);
  const extras = extrasEmploi(emploi, limite);

  let directs = matcher(n);
  if (emploi.matiere && (emploi.culture || emploi.cible)) {
    const molN = normaliser(moleculeFiltre(emploi) ?? "");
    if (molN.length >= 2) directs = [...directs, ...matcher(molN)];
  }
  if (emploi.culture && (emploi.cible || emploi.matiere)) {
    directs = [...directs, ...matcher(normaliser(emploi.culture)).filter((e) => e.type === "culture")];
  }
  if (emploi.cible && (emploi.culture || emploi.matiere)) {
    directs = [...directs, ...matcher(normaliser(emploi.cible)).filter((e) => e.type === "cible")];
  }

  const fusion = [...extras, ...directs];
  const ancre = fusion.some((d) => d.qualite <= 1);
  if (ancre) return { resultats: classer(fusion, limite), correction: null };

  const correction = corriger(n);
  if (correction) {
    const via = matcher(normaliser(correction));
    if (via.length) return { resultats: classer([...extras, ...via], limite), correction };
  }
  return { resultats: classer(fusion, limite), correction: null };
}

export function chercher(q: string, limite = 16): Resultat[] {
  return interpreter(q, limite).resultats;
}
