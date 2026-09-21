import { MATIERES, PRODUITS } from "./data";
import { molecules, sansTeneurs } from "./formulation";
import { idMatiere } from "./liens";
import type { MatiereActive } from "./types";

// ────────────────────────────────────────────────────────────────────────────
// LE SPECTRE D'UNE MATIÈRE ACTIVE — toutes ses cultures, tous ses parasites
//
// La fiche d'une matière active montrait les usages du seul détenteur courant.
// C'était la mauvaise question : ce qu'on veut savoir, c'est SUR QUOI CETTE
// MOLÉCULE EST HOMOLOGUÉE AU MAROC, tous détenteurs confondus — c'est cela, son
// spectre d'emploi, et c'est cela qu'on compare entre deux molécules.
//
// ⚠️ AUCUN REGISTRE NE PUBLIE DE TAUX D'EFFICACITÉ.
// Ni l'ONSSA, ni l'ANSES, ni l'APVMA, ni le registre coréen, ni le brésilien.
// Les pourcentages d'efficacité viennent des essais biologiques du dossier
// d'homologation, qui sont confidentiels. Cet outil n'en invente aucun.
//
// CE QUE L'HOMOLOGATION PROUVE À LA PLACE, et ce n'est pas rien : une autorité
// n'homologue un usage qu'après examen des essais d'efficacité, de sélectivité
// et de phytotoxicité. « Homologué sur tomate contre le mildiou à 0,6 kg/ha,
// DAR 21 jours » EST l'énoncé réglementaire de l'efficacité. La dose et le DAR
// sont, eux, publiés et opposables — c'est le référentiel qui sert à défendre
// un usage revendiqué devant l'ONSSA.
//
// Un taux mesuré n'entre ici que par data/efficacite.json, saisi à la main
// depuis vos propres essais ou la fiche technique d'un fournisseur, avec sa
// source et sa date. Déclaratif, et affiché comme tel.
// ────────────────────────────────────────────────────────────────────────────

export interface Emploi {
  culture: string;
  cible: string;
  /** Doses relevées à l'index — plusieurs quand les produits diffèrent. */
  doses: string[];
  /** Délais avant récolte, en jours, tels qu'écrits à l'index. */
  dar: string[];
  nbApplications: string[];
  /** Produits marocains qui portent cet usage. */
  produits: string[];
  detenteurs: string[];
}

export interface Spectre {
  molecules: string[];
  emplois: Emploi[];
  cultures: string[];
  cibles: string[];
  nbProduits: number;
  nbDetenteurs: number;
  /** Emplois du détenteur courant — ce qu'il revendique déjà. */
  vosEmplois: Set<string>;
}

const cle = (culture: string, cible: string) => `${culture} / ${cible}`;

/**
 * Tous les emplois homologués au Maroc pour les molécules d'une ligne d'index.
 *
 * On part des molécules, pas de la ligne : une matière active vendue en mélange
 * est homologuée sur des usages que la ligne pure ne porte pas, et ce sont bien
 * des usages de la molécule.
 */
export function spectreDe(ma: MatiereActive, detenteurId: string): Spectre {
  const cibles = new Set(molecules(ma.nom, ma.molecule));

  const lignes = new Set<string>();
  for (const l of MATIERES) {
    if (molecules(l.nom, l.molecule).some((m) => cibles.has(m))) lignes.add(l.id);
  }

  const par = new Map<string, Emploi>();
  const produits = new Set<string>();
  const detenteurs = new Set<string>();
  const vosEmplois = new Set<string>();

  for (const p of PRODUITS) {
    if (!p.matieresActivesIds.some((id) => lignes.has(id))) continue;
    produits.add(p.nomCommercial);
    detenteurs.add(p.detenteur);

    for (const u of p.usages) {
      if (!u.culture || !u.cible) continue;
      const k = cle(u.culture, u.cible);
      if (p.detenteurId === detenteurId) vosEmplois.add(k);

      const e =
        par.get(k) ??
        ({
          culture: u.culture,
          cible: u.cible,
          doses: [],
          dar: [],
          nbApplications: [],
          produits: [],
          detenteurs: [],
        } as Emploi);

      // Les doses reviennent écrites de plusieurs façons — « 50 cc/hl » et
      // « 50cc/hl ». On garde chaque libellé tel quel : l'index fait foi, et
      // normaliser une dose serait la réécrire.
      const pousser = (l: string[], v: string | null) => {
        const x = (v ?? "").trim();
        if (x && !l.includes(x)) l.push(x);
      };
      pousser(e.doses, u.dose);
      pousser(e.dar, u.dar);
      pousser(e.nbApplications, u.nbAppl);
      if (!e.produits.includes(p.nomCommercial)) e.produits.push(p.nomCommercial);
      if (!e.detenteurs.includes(p.detenteur)) e.detenteurs.push(p.detenteur);
      par.set(k, e);
    }
  }

  const emplois = [...par.values()].sort(
    (a, b) =>
      b.produits.length - a.produits.length ||
      a.culture.localeCompare(b.culture, "fr") ||
      a.cible.localeCompare(b.cible, "fr")
  );

  return {
    molecules: [...cibles].sort(),
    emplois,
    cultures: [...new Set(emplois.map((e) => e.culture))].sort((a, b) => a.localeCompare(b, "fr")),
    cibles: [...new Set(emplois.map((e) => e.cible))].sort((a, b) => a.localeCompare(b, "fr")),
    nbProduits: produits.size,
    nbDetenteurs: detenteurs.size,
    vosEmplois,
  };
}

/** Emplois regroupés par culture — la lecture qu'attend un agronome. */
export function parCulture(s: Spectre): { culture: string; emplois: Emploi[] }[] {
  const par = new Map<string, Emploi[]>();
  for (const e of s.emplois) {
    const l = par.get(e.culture) ?? [];
    l.push(e);
    par.set(e.culture, l);
  }
  return [...par.entries()]
    .map(([culture, emplois]) => ({ culture, emplois }))
    .sort((a, b) => b.emplois.length - a.emplois.length || a.culture.localeCompare(b.culture, "fr"));
}

/** Emplois regroupés par parasite — la lecture qu'attend un commercial. */
export function parCible(s: Spectre): { cible: string; emplois: Emploi[] }[] {
  const par = new Map<string, Emploi[]>();
  for (const e of s.emplois) {
    const l = par.get(e.cible) ?? [];
    l.push(e);
    par.set(e.cible, l);
  }
  return [...par.entries()]
    .map(([cible, emplois]) => ({ cible, emplois }))
    .sort((a, b) => b.emplois.length - a.emplois.length || a.cible.localeCompare(b.cible, "fr"));
}

// ────────────────────────────────────────────────────────────────────────────
// FILTRE TRANSVERSE — matière × culture × maladie
//
// La barre de recherche répondait « où est X ». Elle doit aussi répondre
// « qu'est-ce qui est homologué sur cette culture, contre cette maladie ».
// Les catalogues et le filtre vivent ici, pas dans la recherche : indexer
// chaque culture comme alias de chaque matière ferait exploser l'index, et
// « tomate puceron » ne matcherait aucune entrée (AND sur un seul libellé).
// ────────────────────────────────────────────────────────────────────────────

export interface CatalogueUsage {
  libelle: string;
  n: string;
  nbEmplois: number;
  nbMatieres: number;
}

export interface FiltreUsage {
  culture: string | null;
  cible: string | null;
  matiere: MatiereActive | null;
}

export interface EmploiFiltre extends Emploi {
  matiere: string;
  matiereId: string | null;
}

function normaliser(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function eqMot(a: string, b: string): boolean {
  const x = a.length >= 4 ? a.replace(/s$/, "") : a;
  const y = b.length >= 4 ? b.replace(/s$/, "") : b;
  return x === y;
}

/** « Tomate » retient aussi « Tomate (plein champ) » ; l'inverse non. */
function compatible(valeur: string, voulu: string): boolean {
  if (valeur === voulu) return true;
  const a = normaliser(valeur);
  const b = normaliser(voulu);
  return a === b || a.startsWith(b + " ");
}

const MOTS_VIDES = new Set([
  "contre",
  "sur",
  "et",
  "de",
  "du",
  "des",
  "la",
  "le",
  "les",
  "au",
  "aux",
  "en",
  "pour",
  "d",
  "l",
  "a",
]);

function indexOfSeq(slots: (string | null)[], needle: string[]): number {
  const n = needle.length;
  if (n === 0) return -1;
  outer: for (let i = 0; i <= slots.length - n; i++) {
    for (let j = 0; j < n; j++) {
      const s = slots[i + j];
      if (s == null || !eqMot(s, needle[j])) continue outer;
    }
    return i;
  }
  return -1;
}

function consommer(slots: (string | null)[], start: number, len: number) {
  for (let i = 0; i < len; i++) slots[start + i] = null;
}

interface CatalogueInterne extends CatalogueUsage {
  emplois: Set<string>;
  matieres: Set<string>;
}

function construireCatalogue(kind: "culture" | "cible"): CatalogueUsage[] {
  const par = new Map<string, CatalogueInterne>();
  for (const m of MATIERES) {
    const mols = molecules(m.nom, m.molecule);
    const etiquette = mols[0] || m.molecule || m.nom;
    const valeurs = kind === "culture" ? m.cultures : m.cibles;
    for (const v of valeurs) {
      const n = normaliser(v);
      if (!n) continue;
      const e =
        par.get(n) ??
        ({
          libelle: v,
          n,
          nbEmplois: 0,
          nbMatieres: 0,
          emplois: new Set<string>(),
          matieres: new Set<string>(),
        } as CatalogueInterne);
      if (v.length > e.libelle.length) e.libelle = v;
      e.matieres.add(etiquette);
      for (const u of m.usages) {
        const i = u.indexOf(" / ");
        const cu = i < 0 ? u : u.slice(0, i);
        const ci = i < 0 ? "" : u.slice(i + 3);
        if (kind === "culture" ? cu === v : ci === v) e.emplois.add(u);
      }
      par.set(n, e);
    }
  }
  return [...par.values()]
    .map((c) => ({
      libelle: c.libelle,
      n: c.n,
      nbEmplois: Math.max(c.emplois.size, 1),
      nbMatieres: c.matieres.size,
    }))
    .sort((a, b) => b.nbEmplois - a.nbEmplois || a.libelle.localeCompare(b.libelle, "fr"));
}

let _cultures: CatalogueUsage[] | null = null;
let _cibles: CatalogueUsage[] | null = null;

export function inventaireCultures(): CatalogueUsage[] {
  return (_cultures ??= construireCatalogue("culture"));
}

export function inventaireCibles(): CatalogueUsage[] {
  return (_cibles ??= construireCatalogue("cible"));
}

interface MolCatalog {
  libelle: string;
  n: string;
  mots: string[];
  ma: MatiereActive;
}

let _mols: MolCatalog[] | null = null;

function inventaireMolecules(): MolCatalog[] {
  if (_mols) return _mols;
  const par = new Map<string, MolCatalog>();
  for (const m of MATIERES) {
    for (const mol of molecules(m.nom, m.molecule)) {
      const n = normaliser(mol);
      if (n.length < 4) continue;
      const id = idMatiere(mol);
      const ma = (id ? MATIERES.find((x) => x.id === id) : undefined) ?? m;
      const mix = sansTeneurs(ma.nom).includes("/");
      const prev = par.get(n);
      const prevMix = prev ? sansTeneurs(prev.ma.nom).includes("/") : true;
      if (!prev || (prevMix && !mix) || (prevMix === mix && ma.nbHomologations > prev.ma.nbHomologations)) {
        par.set(n, { libelle: mol, n, mots: n.split(" ").filter(Boolean), ma });
      }
    }
  }
  _mols = [...par.values()].sort((a, b) => b.n.length - a.n.length);
  return _mols;
}

function plusLong(
  cat: { libelle: string; n: string }[],
  slots: (string | null)[]
): { libelle: string; n: string; start: number; len: number } | null {
  let best: { libelle: string; n: string; start: number; len: number; score: number } | null = null;
  for (const c of cat) {
    const nt = c.n.split(" ").filter(Boolean);
    if (nt.length === 0 || c.n.replace(/ /g, "").length < 3) continue;
    const start = indexOfSeq(slots, nt);
    if (start < 0) continue;
    const score = c.n.length * 10 + nt.length;
    if (!best || score > best.score) best = { libelle: c.libelle, n: c.n, start, len: nt.length, score };
  }
  return best;
}

function prefixUnique(
  cat: { libelle: string; n: string }[],
  token: string
): { libelle: string; n: string } | null {
  if (token.length < 3 || MOTS_VIDES.has(token)) return null;
  const hits = cat.filter((c) => c.n === token || c.n.startsWith(token + " ") || c.n.split(" ")[0].startsWith(token));
  if (hits.length === 1) return hits[0];
  const exact = hits.filter((c) => c.n === token || eqMot(c.n, token));
  return exact.length === 1 ? exact[0] : null;
}

function chevauche(
  a: { start: number; len: number },
  b: { start: number; len: number }
): boolean {
  return a.start < b.start + b.len && b.start < a.start + a.len;
}

/**
 * Découpe une saisie en culture, parasite et matière active — y compris
 * quand les trois sont tapés dans la même barre (« imidaclopride tomate puceron »).
 */
export function resoudreEmploi(q: string): FiltreUsage {
  const tokens = normaliser(q).split(" ").filter(Boolean);
  const slots: (string | null)[] = [...tokens];
  const cultures = inventaireCultures();
  const cibles = inventaireCibles();

  const c = plusLong(cultures, slots);
  const k = plusLong(cibles, slots);

  let culture: string | null = null;
  let cible: string | null = null;

  if (c && k && chevauche(c, k)) {
    if (c.n.length >= k.n.length) {
      culture = c.libelle;
      consommer(slots, c.start, c.len);
      const k2 = plusLong(cibles, slots);
      if (k2) {
        cible = k2.libelle;
        consommer(slots, k2.start, k2.len);
      }
    } else {
      cible = k.libelle;
      consommer(slots, k.start, k.len);
      const c2 = plusLong(cultures, slots);
      if (c2) {
        culture = c2.libelle;
        consommer(slots, c2.start, c2.len);
      }
    }
  } else {
    if (c) {
      culture = c.libelle;
      consommer(slots, c.start, c.len);
    }
    if (k) {
      cible = k.libelle;
      consommer(slots, k.start, k.len);
    }
  }

  if (!culture) {
    for (let i = 0; i < slots.length; i++) {
      const t = slots[i];
      if (!t) continue;
      const hit = prefixUnique(cultures, t);
      if (hit) {
        culture = hit.libelle;
        slots[i] = null;
        break;
      }
    }
  }
  if (!cible) {
    for (let i = 0; i < slots.length; i++) {
      const t = slots[i];
      if (!t) continue;
      const hit = prefixUnique(cibles, t);
      if (hit) {
        cible = hit.libelle;
        slots[i] = null;
        break;
      }
    }
  }

  let matiere: MatiereActive | null = null;
  const mols = inventaireMolecules();
  const m = plusLong(mols, slots);
  if (m) {
    const hit = mols.find((x) => x.n === m.n);
    matiere = hit?.ma ?? null;
    consommer(slots, m.start, m.len);
  } else {
    for (let i = 0; i < slots.length; i++) {
      const t = slots[i];
      if (!t || t.length < 4) continue;
      const hits = mols.filter((x) => x.n === t || x.n.startsWith(t) || x.mots.some((w) => w.startsWith(t)));
      const uniques = [...new Map(hits.map((h) => [h.ma.id, h])).values()];
      if (uniques.length === 1) {
        matiere = uniques[0].ma;
        slots[i] = null;
        break;
      }
    }
  }

  return { culture, cible, matiere };
}

export function resoudreCulture(s: string): string | null {
  const n = (s ?? "").trim();
  if (!n) return null;
  const cat = inventaireCultures();
  const exact = cat.find((c) => c.libelle === n);
  if (exact) return exact.libelle;
  return resoudreEmploi(n).culture;
}

export function resoudreCible(s: string): string | null {
  const n = (s ?? "").trim();
  if (!n) return null;
  const cat = inventaireCibles();
  const exact = cat.find((c) => c.libelle === n);
  if (exact) return exact.libelle;
  return resoudreEmploi(n).cible;
}

export function hrefUsages(f: {
  culture?: string | null;
  cible?: string | null;
  molecule?: string | null;
}): string {
  const p = new URLSearchParams();
  if (f.culture) p.set("culture", f.culture);
  if (f.cible) p.set("cible", f.cible);
  if (f.molecule) p.set("molecule", f.molecule);
  const q = p.toString();
  return q ? `/usages?${q}` : "/usages";
}

function prefererPure(a: MatiereActive, b: MatiereActive): MatiereActive {
  const am = sansTeneurs(a.nom).includes("/");
  const bm = sansTeneurs(b.nom).includes("/");
  if (am !== bm) return am ? b : a;
  return a.nbHomologations >= b.nbHomologations ? a : b;
}

/** Matières dont le spectre couvre le filtre — sans y coller chaque culture en alias. */
export function matieresCouvrant(f: FiltreUsage): MatiereActive[] {
  const mols = f.matiere ? new Set(molecules(f.matiere.nom, f.matiere.molecule)) : null;
  const par = new Map<string, MatiereActive>();
  for (const m of MATIERES) {
    const propres = molecules(m.nom, m.molecule);
    if (mols && !propres.some((x) => mols.has(x))) continue;
    if (f.culture && !m.cultures.some((c) => compatible(c, f.culture!))) continue;
    if (f.cible && !m.cibles.some((c) => compatible(c, f.cible!))) continue;
    const k = propres.map((x) => normaliser(x)).sort().join("|") || m.id;
    const prev = par.get(k);
    par.set(k, prev ? prefererPure(prev, m) : m);
  }
  return [...par.values()].sort(
    (a, b) => b.nbHomologations - a.nbHomologations || a.nom.localeCompare(b.nom, "fr")
  );
}

function pousser(l: string[], v: string | null) {
  const x = (v ?? "").trim();
  if (x && !l.includes(x)) l.push(x);
}

function libelleMatiere(ma: MatiereActive | undefined, repli: string): string {
  if (!ma) return repli;
  const mols = molecules(ma.nom, ma.molecule);
  return mols[0] || ma.molecule || ma.nom;
}

/**
 * Usages homologués au Maroc qui collent au filtre. Une ligne par
 * molécule × culture × parasite, doses et DAR tels qu'à l'index.
 */
export function filtrerEmplois(f: FiltreUsage): {
  emplois: EmploiFiltre[];
  nbProduits: number;
  nbDetenteurs: number;
  nbMatieres: number;
} {
  const molsFiltre = f.matiere ? new Set(molecules(f.matiere.nom, f.matiere.molecule)) : null;
  const lignes = molsFiltre
    ? new Set(
        MATIERES.filter((l) => molecules(l.nom, l.molecule).some((m) => molsFiltre.has(m))).map((l) => l.id)
      )
    : null;

  const parMa = new Map(MATIERES.map((m) => [m.id, m]));
  const par = new Map<string, EmploiFiltre>();
  const produits = new Set<string>();
  const detenteurs = new Set<string>();
  const matieres = new Set<string>();

  for (const p of PRODUITS) {
    if (lignes && !p.matieresActivesIds.some((id) => lignes.has(id))) continue;

    for (const u of p.usages) {
      if (!u.culture || !u.cible) continue;
      if (f.culture && !compatible(u.culture, f.culture)) continue;
      if (f.cible && !compatible(u.cible, f.cible)) continue;

      const ids = p.matieresActivesIds.length ? p.matieresActivesIds : [""];
      const vues = new Set<string>();
      for (const maId of ids) {
        if (lignes && maId && !lignes.has(maId)) continue;
        const ma = maId ? parMa.get(maId) : undefined;
        const propres = ma ? molecules(ma.nom, ma.molecule) : [];
        const retenues = molsFiltre ? propres.filter((x) => molsFiltre.has(x)) : propres;
        const etiquettes = retenues.length ? retenues : propres.length ? propres : [p.matieresActives[0] ?? p.nomCommercial];
        for (const et of etiquettes) {
          if (vues.has(et)) continue;
          vues.add(et);
          const idCanon = idMatiere(et);
          const fiche = idCanon ? parMa.get(idCanon) : ma;
          const lib = libelleMatiere(fiche, et);
          const k = `${lib}|${u.culture}|${u.cible}`;
          const e =
            par.get(k) ??
            ({
              matiere: lib,
              matiereId: fiche?.id ?? idCanon,
              culture: u.culture,
              cible: u.cible,
              doses: [],
              dar: [],
              nbApplications: [],
              produits: [],
              detenteurs: [],
            } as EmploiFiltre);
          pousser(e.doses, u.dose);
          pousser(e.dar, u.dar);
          pousser(e.nbApplications, u.nbAppl);
          if (!e.produits.includes(p.nomCommercial)) e.produits.push(p.nomCommercial);
          if (!e.detenteurs.includes(p.detenteur)) e.detenteurs.push(p.detenteur);
          par.set(k, e);
          matieres.add(lib);
        }
      }
      produits.add(p.nomCommercial);
      detenteurs.add(p.detenteur);
    }
  }

  const emplois = [...par.values()].sort(
    (a, b) =>
      a.culture.localeCompare(b.culture, "fr") ||
      a.cible.localeCompare(b.cible, "fr") ||
      a.matiere.localeCompare(b.matiere, "fr")
  );

  return {
    emplois,
    nbProduits: produits.size,
    nbDetenteurs: detenteurs.size,
    nbMatieres: matieres.size,
  };
}
