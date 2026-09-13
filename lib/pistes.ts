import { CONSTITUANTS_APVMA, META_APVMA, apparierApvma } from "./apvma";
import type { SocieteApvma } from "./apvma";
import { FOURNISSEURS, MATIERES } from "./data";
import { IndexNoms, slug } from "./noms";

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

// ── Rapprochement avec l'index ONSSA ────────────────────────────────────────
// La règle de normalisation vit dans lib/noms.ts et sert aussi au registre de
// l'EPA : une seule règle pour tout l'outil.

const INDEX_ONSSA = new IndexNoms(FOURNISSEURS.map((f) => ({ nom: f.nom, valeur: f.nom })));

function rapprocher(
  nom: string,
  filiale: boolean
): { lien: LienOnssa; fournisseurOnssa: string | null } {
  const exact = INDEX_ONSSA.exact(nom, filiale);
  if (exact) return { lien: "referencee", fournisseurOnssa: exact };

  const proches = INDEX_ONSSA.proches(nom, 1);
  if (proches.length) return { lien: "homonyme", fournisseurOnssa: proches[0] };

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

const PISTE_PAR_ID = new Map(ANNUAIRE_PISTES.map((p) => [p.id, p]));

export function pisteParId(id: string): PisteGlobale | undefined {
  return PISTE_PAR_ID.get(id);
}

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
