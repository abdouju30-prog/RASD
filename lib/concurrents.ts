import { DETENTEURS, MATIERES, PRODUITS } from "./data";
import { molecules } from "./formulation";
import { etatAMM } from "./logic";
import type { MatiereActive } from "./types";

type EtatAMM = ReturnType<typeof etatAMM>["etat"];

// ────────────────────────────────────────────────────────────────────────────
// QUI VEND DÉJÀ CETTE MATIÈRE ACTIVE AU MAROC
//
// L'écran d'une matière active disait tout du produit et rien du marché : on
// pouvait lire l'échéance d'une AMM sans savoir que onze sociétés vendent la
// même molécule. Or c'est la première question commerciale — qui est en face,
// avec quoi, et jusqu'à quand.
//
// TROIS CHOSES QUI NE SE CONFONDENT PAS :
//   le détenteur   il porte l'AMM, c'est lui le concurrent ;
//   le fournisseur il vend la matière active au détenteur — il peut vous la
//                  vendre aussi, et c'est là qu'est la voie me-too ;
//   le produit     le nom commercial, qui est ce que voit l'agriculteur.
//
// ⚠️ LES MÉLANGES COMPTENT. Un concurrent qui vend la molécule à l'intérieur
// d'une association est un concurrent : ne lire que le premier composant d'une
// formulation en aurait caché 46.
//
// ⚠️ NI PRIX, NI PART DE MARCHÉ. L'index dit qui détient quoi, pas qui vend
// combien. Un détenteur à un produit peut peser plus qu'un détenteur à six.
// ────────────────────────────────────────────────────────────────────────────

export interface ProduitConcurrent {
  id: string;
  nomCommercial: string;
  formulation: string | null;
  amm: string | null;
  expiration: string | null;
  /** État de l'AMM et mois restants, tels que les calcule lib/logic. */
  etat: EtatAMM;
  moisRestants: number | null;
  /** Les autres matières actives du produit — ce qui fait l'association. */
  associees: string[];
  fournisseurs: string[];
  nbUsages: number;
}

export interface Concurrent {
  detenteurId: string;
  nom: string;
  produits: ProduitConcurrent[];
  /** Fournisseurs par lesquels il s'approvisionne, d'après l'index. */
  fournisseurs: string[];
  cultures: string[];
  /** Échéance la plus proche parmi ses AMM sur cette molécule. */
  prochaineEcheance: string | null;
  /** true pour le détenteur courant — il n'est pas son propre concurrent. */
  cestVous: boolean;
}

export interface Marche {
  molecules: string[];
  nbProduits: number;
  nbDetenteurs: number;
  concurrents: Concurrent[];
  /** Tous les fournisseurs qui alimentent ce marché — la liste à consulter. */
  fournisseurs: string[];
  vous: Concurrent | null;
}

const NOM_DETENTEUR = new Map(DETENTEURS.map((d) => [d.nom, d.id]));

/**
 * Le marché marocain d'une matière active, vu depuis un détenteur.
 *
 * On part des molécules de la ligne demandée, puis on ramasse tous les produits
 * de l'index qui contiennent au moins l'une d'elles — mélanges compris.
 */
export function marcheDe(ma: MatiereActive, detenteurId: string): Marche {
  const cibles = new Set(molecules(ma.nom, ma.molecule));

  // Les identifiants de lignes d'index qui portent l'une des molécules.
  const lignes = new Set<string>();
  for (const l of MATIERES) {
    if (molecules(l.nom, l.molecule).some((m) => cibles.has(m))) lignes.add(l.id);
  }

  const par = new Map<string, Concurrent>();
  const tousFournisseurs = new Set<string>();
  let nbProduits = 0;

  for (const p of PRODUITS) {
    if (!p.matieresActivesIds.some((id) => lignes.has(id))) continue;
    nbProduits += 1;

    // Les matières associées : celles du produit qui ne sont pas la cible.
    const associees = new Set<string>();
    for (const id of p.matieresActivesIds) {
      const l = MATIERES.find((x) => x.id === id);
      if (!l) continue;
      for (const m of molecules(l.nom, l.molecule)) if (!cibles.has(m)) associees.add(m);
    }

    const c =
      par.get(p.detenteur) ??
      ({
        detenteurId: p.detenteurId,
        nom: p.detenteur,
        produits: [],
        fournisseurs: [],
        cultures: [],
        prochaineEcheance: null,
        cestVous: p.detenteurId === detenteurId,
      } as Concurrent);

    c.produits.push({
      id: p.id,
      nomCommercial: p.nomCommercial,
      formulation: p.formulation,
      amm: p.amm,
      expiration: p.expiration,
      ...(() => { const e = etatAMM(p); return { etat: e.etat, moisRestants: e.mois }; })(),
      associees: [...associees].sort(),
      fournisseurs: p.fournisseurs,
      nbUsages: p.usages.length,
    });
    for (const f of p.fournisseurs) {
      if (!c.fournisseurs.includes(f)) c.fournisseurs.push(f);
      tousFournisseurs.add(f);
    }
    for (const u of p.usages) {
      if (u.culture && !c.cultures.includes(u.culture)) c.cultures.push(u.culture);
    }
    par.set(p.detenteur, c);
  }

  for (const c of par.values()) {
    const dates = c.produits.map((p) => p.expiration).filter((d): d is string => Boolean(d));
    c.prochaineEcheance = dates.length ? dates.sort()[0] : null;
    c.produits.sort((a, b) => a.nomCommercial.localeCompare(b.nomCommercial, "fr"));
    c.fournisseurs.sort();
    c.cultures.sort();
    // Un identifiant fiable même quand l'index n'en donne pas.
    c.detenteurId = c.detenteurId || NOM_DETENTEUR.get(c.nom) || "";
  }

  const tous = [...par.values()].sort(
    (a, b) =>
      Number(b.cestVous) - Number(a.cestVous) ||
      b.produits.length - a.produits.length ||
      a.nom.localeCompare(b.nom, "fr")
  );

  return {
    molecules: [...cibles].sort(),
    nbProduits,
    nbDetenteurs: tous.length,
    concurrents: tous.filter((c) => !c.cestVous),
    fournisseurs: [...tousFournisseurs].sort(),
    vous: tous.find((c) => c.cestVous) ?? null,
  };
}
