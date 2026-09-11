import { DETENTEURS, FOURNISSEURS, MATIERES, PRODUITS } from "./data";
import { ANNUAIRE_PISTES } from "./pistes";
import { USINES_CHINE } from "./icama";
import { USINES_TURQUES } from "./bku";
import { PRODUCTEURS_RUSSES } from "./russie";
import { PRODUCTEURS_COREENS, etiquette as etiquetteCoree } from "./coree";
import { USINES_BRESIL } from "./bresil";
import { USINES_SOURCING } from "./epa";
import { ORGANISMES_BPE, SOCIETES_AGREEES, PRODUITS_EXPIRES } from "./onssa-eservice";

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
// une requête, le serveur renvoie douze résultats.
//
// ⚠️ La recherche ne cherche PAS à deviner. Elle classe par qualité de
// correspondance — début du libellé, puis début d'un mot, puis n'importe où —
// et laisse le type de chaque résultat visible. Un fournisseur et une usine
// homonymes restent deux lignes distinctes.
// ────────────────────────────────────────────────────────────────────────────

export type TypeEntree =
  | "matiere"
  | "produit"
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
  detenteur: 2,
  fournisseur: 3,
  societe_agreee: 4,
  piste: 5,
  usine_epa: 6,
  usine_chine: 7,
  usine_turquie: 7,
  producteur_russe: 7,
  producteur_coreen: 7,
  usine_bresil: 5,
  organisme_bpe: 8,
  produit_expire: 9,
};

import { normaliser } from "./texte";

interface Indexee extends Entree {
  cle: string;
  /** Positions de début de mot, pour distinguer « meth » de « diméth ». */
  mots: string[];
}

function construire(): Indexee[] {
  const out: Entree[] = [];

  for (const m of MATIERES) {
    out.push({
      id: `ma-${m.id}`,
      libelle: m.nom,
      detail: [m.categorie, `${m.nbHomologations} AMM`, `${m.detenteurs.length} détenteur(s)`]
        .filter(Boolean)
        .join(" · "),
      type: "matiere",
      href: `/matieres/${m.id}`,
      poids: m.nbHomologations,
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
      href: `/fournisseurs?q=${encodeURIComponent(p.nom)}`,
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
      libelle: s.latin,
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
    return { ...e, cle, mots: cle.split(" ").filter(Boolean) };
  });
}

const INDEX = construire();

export const NB_ENTREES = INDEX.length;

export interface Resultat extends Entree {
  /** 0 = début du libellé, 1 = début d'un mot, 2 = ailleurs. */
  qualite: 0 | 1 | 2;
}

/**
 * Douze suggestions au plus, classées par qualité de correspondance.
 *
 * Le classement est explicite plutôt que pondéré : une saisie qui commence un
 * libellé passe avant une qui commence un mot, qui passe avant une trouvée au
 * milieu. À qualité égale, c'est le type puis le volume qui départagent.
 */
export function chercher(q: string, limite = 12): Resultat[] {
  const n = normaliser(q);
  if (n.length < 2) return [];

  // `cle` et `mots` servent au tri et au dédoublonnage, mais ne sortent pas :
  // le type public reste Resultat.
  const trouves: (Indexee & { qualite: 0 | 1 | 2 })[] = [];
  for (const e of INDEX) {
    let qualite: 0 | 1 | 2;
    if (e.cle.startsWith(n)) qualite = 0;
    else if (e.mots.some((m) => m.startsWith(n))) qualite = 1;
    else if (e.cle.includes(n)) qualite = 2;
    else continue;
    trouves.push({ ...e, qualite });
  }

  trouves.sort(
    (a, b) =>
      a.qualite - b.qualite ||
      RANG[a.type] - RANG[b.type] ||
      b.poids - a.poids ||
      a.libelle.localeCompare(b.libelle)
  );

  // Un même nom peut exister dans plusieurs registres — une société est à la
  // fois fournisseur ONSSA et usine EPA. On garde la première occurrence, qui
  // est la mieux classée, plutôt que d'empiler des doublons.
  const vus = new Set<string>();
  const out: Resultat[] = [];
  for (const { cle, mots: _m, ...r } of trouves) {
    const k = `${cle}|${r.type}`;
    if (vus.has(k)) continue;
    vus.add(k);
    out.push(r);
    if (out.length >= limite) break;
  }
  return out;
}
