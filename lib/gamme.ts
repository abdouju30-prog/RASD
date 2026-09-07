import { DETENTEURS, MATIERES, PRODUITS, detenteurParId, produitsDe } from "./data";
import { fabricantsBresiliens } from "./bresil";
import { fabricantsChinois, usines as usinesChinoises } from "./icama";
import { fabricantsCoreens } from "./coree";
import { fabricantsRusses } from "./russie";
import { fabricantsTurcs } from "./bku";
import { base, molecules } from "./formulation";
import type { Detenteur, FicheAnses, MatiereActive } from "./types";

// ────────────────────────────────────────────────────────────────────────────
// TROUS DE GAMME — ce qui manque à une société, et où le prendre
//
// « Gamme complète » n'est pas une opinion ici : c'est ce que le marché
// marocain homologue déjà. Une molécule portée par onze sociétés et quarante
// produits a une demande PROUVÉE — si vous ne l'avez pas, c'est un trou, pas
// un choix. L'index ONSSA dit tout cela ; personne n'a besoin de l'estimer.
//
// Le classement croise quatre faits, aucun jugement :
//     le poids de la molécule au marché        (produits, détenteurs)
//     les usages qu'elle ouvrirait             (couples culture/cible neufs)
//     sa sourçabilité                          (me-too, puis usines étrangères)
//     son statut ANSES                         (l'ONSSA s'y aligne)
//
// ⚠️ UNE MOLÉCULE EN RETRAIT N'EST JAMAIS RECOMMANDÉE. L'ONSSA suit l'ANSES :
// combler un trou avec une molécule que la France retire, c'est acheter un
// dossier condamné. Elles sont exclues, pas rétrogradées.
//
// ⚠️ CE MODULE NE CONNAÎT NI PRIX, NI VOLUME, NI STRATÉGIE. Il dit ce que le
// marché porte et que vous n'avez pas. Le reste est une décision commerciale.
//
// ⚠️ LES MÉLANGES COMPTENT POUR CHACUN DE LEURS COMPOSANTS. L'index nomme des
// formulations : 212 de ses 653 lignes sont des mélanges, et son champ
// « molecule » ne retient que le PREMIER composant. S'y fier faisait
// disparaître 46 matières actives — dont le flufénacet, le MCPA, le pyroxsulame
// et l'halauxifène-méthyl, tous vendus au Maroc à l'intérieur d'un mélange.
// L'écran les annonçait comme des trous de gamme alors qu'un concurrent les
// vend déjà. On découpe donc le nom de la formulation, comme le fait la
// sentinelle.
//
// ⚠️ LES SELS ET ESTERS SONT REGROUPÉS SOUS LEUR ACIDE, ICI SEULEMENT. Le
// 2,4-D existe à l'index sous cinq graphies — acide, sel d'amine, sel de
// diméthylamine, ester isoctylique, ester 2-éthylhexylique — soit 37 produits
// éclatés en cinq molécules apparemment mineures. Pour une question de gamme
// (« ai-je une offre 2,4-D ? ») c'est une seule matière active. Pour un dossier
// ONSSA ce sont cinq identités distinctes : ce regroupement ne sort JAMAIS de
// ce module, et la clé chimique partagée n'y touche pas.
// ────────────────────────────────────────────────────────────────────────────

export interface SourceGamme {
  registre: string;
  n: number;
  /** Ce que ce registre prouve — une pastille, pas une phrase. */
  portee: string;
}

export interface Manque {
  molecule: string;
  /** Ligne d'index la plus lourde — c'est elle qui porte le lien de sourcing. */
  id: string;
  categorie: string;
  /** Produits du marché marocain portant cette molécule. */
  nbProduits: number;
  nbDetenteurs: number;
  cultures: string[];
  /** Couples culture/cible que le détenteur ne couvre par rien aujourd'hui. */
  usagesNeufs: string[];
  anses: FicheAnses | null;
  /** Fournisseurs déjà référencés à l'ONSSA — la voie me-too. */
  meToo: string[];
  sources: SourceGamme[];
  nbUsines: number;
  score: number;
}

export interface CaseCouverture {
  categorie: string;
  vous: number;
  marche: number;
}

export interface LigneCulture {
  culture: string;
  marche: number;
  vous: number;
  cases: CaseCouverture[];
}

export interface Gamme {
  detenteur: Detenteur;
  nbMolecules: number;
  nbMoleculesMarche: number;
  categories: { categorie: string; vous: number; marche: number; manques: number }[];
  cultures: LigneCulture[];
  manques: Manque[];
}

/** Catégories retenues au tableau de couverture — les autres restent au détail. */
const CATEGORIES = [
  "Fongicide",
  "Insecticide",
  "Herbicide",
  "Acaricide",
  "Nématicide",
  "Régulateur de croissance",
];

/** Une catégorie composée compte pour chacune de ses parties. */
function categoriesDe(brut: string | null): string[] {
  if (!brut) return [];
  const t = brut.toLowerCase();
  const out = CATEGORIES.filter((c) => t.includes(c.toLowerCase()));
  return out.length ? out : [];
}

function categorie(brut: string | null): string {
  return categoriesDe(brut)[0] ?? brut ?? "Autre";
}

// ── Le marché, molécule par molécule ────────────────────────────────────────

interface Molecule {
  molecule: string;
  lignes: MatiereActive[];
  id: string;
  categorie: string;
  nbProduits: number;
  detenteurs: Set<string>;
  cultures: Set<string>;
  usages: Set<string>;
  anses: FicheAnses | null;
}

/**
 * Ligne de référence d'une molécule.
 *
 * ⚠️ LA LIGNE PURE PASSE AVANT LA LIGNE LOURDE. Les registres étrangers
 * s'interrogent par nom de substance : « Mandipropamide(250 g/kg) » trouve son
 * correspondant, « Mandipropamide(250) / Cymoxanil(180) » beaucoup moins. À
 * pureté égale, la ligne qui porte le plus de produits gagne — c'est la plus
 * représentative du marché.
 */
function ligneRef(lignes: MatiereActive[]): MatiereActive {
  return [...lignes].sort((a, b) => {
    const pa = a.nom.includes("/") ? 1 : 0;
    const pb = b.nom.includes("/") ? 1 : 0;
    return pa - pb || b.produits.length - a.produits.length;
  })[0];
}

function construireMarche(): Map<string, Molecule> {
  const parNom = new Map<string, MatiereActive[]>();
  for (const ma of MATIERES) {
    for (const nom of molecules(ma.nom, ma.molecule)) {
      if (!nom) continue;
      const l = parNom.get(nom) ?? [];
      l.push(ma);
      parNom.set(nom, l);
    }
  }

  const m = new Map<string, Molecule>();
  for (const [nom, lignes] of parNom) {
    const ref = ligneRef(lignes);
    const detenteurs = new Set<string>();
    const cultures = new Set<string>();
    const usages = new Set<string>();
    const produitsVus = new Set<string>();
    let anses: FicheAnses | null = null;
    for (const ma of lignes) {
      for (const nom of ma.produits) produitsVus.add(nom);
      for (const d of ma.detenteurs) detenteurs.add(d);
      for (const c of ma.cultures) cultures.add(c);
      for (const u of ma.usages) usages.add(u);
      anses = anses ?? ma.anses;
    }
    m.set(nom, {
      molecule: nom,
      lignes,
      id: ref.id,
      // ⚠️ LA CATÉGORIE VIENT DE LA LIGNE DE RÉFÉRENCE, PAS DE LA PREMIÈRE
      // RENCONTRÉE. Une seule ligne piège de deltaméthrine est classée
      // « Attractif » : prise en tête, elle faisait passer l'insecticide le
      // plus vendu du marché pour un attractif.
      categorie: categorie(ref.categorie),
      nbProduits: produitsVus.size,
      detenteurs,
      cultures,
      usages,
      anses,
    });
  }
  return m;
}

const PAR_ID = new Map(MATIERES.map((m) => [m.id, m]));
const MARCHE = construireMarche();

// ── Sourcing : on ne recompte rien, on interroge les registres déjà lus ─────

const PORTEE: Record<string, string> = {
  Brésil: "usines de synthèse déclarées",
  Chine: "usines sous licence de production",
  Corée: "sociétés détentrices",
  Turquie: "fabrication locale (İMAL)",
  Russie: "sociétés détentrices",
};

function sourcesDe(nomIndex: string): { sources: SourceGamme[]; nbUsines: number } {
  const br = fabricantsBresiliens(nomIndex);
  const cn = fabricantsChinois(nomIndex);
  const kr = fabricantsCoreens(nomIndex);
  const tr = fabricantsTurcs(nomIndex);
  const ru = fabricantsRusses(nomIndex);

  const brutes: [string, number][] = [
    ["Brésil", br?.usines.length ?? 0],
    ["Chine", cn ? usinesChinoises(cn).length : 0],
    ["Corée", kr?.societes.length ?? 0],
    ["Turquie", tr?.fabricants.length ?? 0],
    ["Russie", ru?.russes.length ?? 0],
  ];
  const sources = brutes
    .filter(([, n]) => n > 0)
    .map(([registre, n]) => ({ registre, n, portee: PORTEE[registre] }));

  // ⚠️ SEULS LE BRÉSIL ET LA CHINE COMPTENT COMME USINES. Les trois autres
  // registres nomment des détenteurs d'homologation, pas des synthétiseurs :
  // les additionner ferait passer un distributeur pour une capacité.
  const nbUsines = (br?.usines.length ?? 0) + (cn ? usinesChinoises(cn).length : 0);
  return { sources, nbUsines };
}

// ── Le calcul, par détenteur ────────────────────────────────────────────────

const POIDS_ANSES: Record<string, number> = { autorisée: 10, inconnu: 0 };

function score(m: Omit<Manque, "score">): number {
  return (
    Math.min(m.nbProduits, 20) +
    Math.min(m.usagesNeufs.length, 12) * 2 +
    (m.meToo.length > 0 ? 25 : Math.min(m.nbUsines, 10) * 2) +
    (POIDS_ANSES[m.anses?.statut ?? "inconnu"] ?? 0)
  );
}

const CACHE = new Map<string, Gamme>();

export function gamme(detenteurId: string): Gamme {
  const cache = CACHE.get(detenteurId);
  if (cache) return cache;

  const detenteur = detenteurParId(detenteurId);
  const produits = produitsDe(detenteur.id);

  // Ce que la société tient déjà : molécules, et couples culture/cible.
  const tenues = new Set<string>();
  const usagesTenus = new Set<string>();
  const parCultureVous = new Map<string, Set<string>>();
  for (const p of produits) {
    for (const id of p.matieresActivesIds) {
      const ma = PAR_ID.get(id);
      // Un produit qui contient l'halauxifène-méthyl en second composant tient
      // l'halauxifène-méthyl : c'est ce que le découpage rend visible.
      if (ma) for (const c of molecules(ma.nom, ma.molecule)) tenues.add(c);
    }
    for (const u of p.usages) {
      if (u.culture && u.cible) usagesTenus.add(`${u.culture} / ${u.cible}`);
      if (u.culture) {
        const s = parCultureVous.get(u.culture) ?? new Set<string>();
        s.add(p.id);
        parCultureVous.set(u.culture, s);
      }
    }
  }

  // ── Les trous ────────────────────────────────────────────────────────────
  const manques: Manque[] = [];
  for (const v of MARCHE.values()) {
    if (tenues.has(v.molecule)) continue;
    // Une molécule que la France retire n'est pas une recommandation.
    const st = v.anses?.statut;
    if (st === "retirée" || st === "en_retrait") continue;
    // Une molécule d'un seul produit n'est pas une gamme : c'est une exception.
    if (v.nbProduits < 2) continue;

    const nomIndex = ligneRef(v.lignes).nom;
    const { sources, nbUsines } = sourcesDe(nomIndex);
    const meToo = [...new Set(v.lignes.flatMap((l) => l.fournisseurs))].sort();
    const base = {
      molecule: v.molecule,
      id: v.id,
      categorie: v.categorie,
      nbProduits: v.nbProduits,
      nbDetenteurs: v.detenteurs.size,
      cultures: [...v.cultures].sort(),
      usagesNeufs: [...v.usages].filter((u) => !usagesTenus.has(u)).sort(),
      anses: v.anses,
      meToo,
      sources,
      nbUsines,
    };
    manques.push({ ...base, score: score(base) });
  }
  manques.sort((a, b) => b.score - a.score || b.nbProduits - a.nbProduits);

  // ── Couverture par catégorie ─────────────────────────────────────────────
  const categories = CATEGORIES.map((c) => ({
    categorie: c,
    vous: [...tenues].filter((mol) => MARCHE.get(mol)?.categorie === c).length,
    marche: [...MARCHE.values()].filter((v) => v.categorie === c).length,
    manques: manques.filter((m) => m.categorie === c).length,
  }));

  // ── Couverture par culture ───────────────────────────────────────────────
  // Le marché se compte en produits homologués sur la culture, tous détenteurs
  // confondus : c'est la mesure la plus proche de la demande réelle.
  const parCultureMarche = new Map<string, Map<string, Set<string>>>();
  for (const p of PRODUITS) {
    const cats = categoriesDe(p.categorie);
    for (const u of p.usages) {
      if (!u.culture) continue;
      const m = parCultureMarche.get(u.culture) ?? new Map<string, Set<string>>();
      for (const c of cats.length ? cats : ["Autre"]) {
        const s = m.get(c) ?? new Set<string>();
        s.add(p.id);
        m.set(c, s);
      }
      parCultureMarche.set(u.culture, m);
    }
  }
  const parCultureCatVous = new Map<string, Map<string, Set<string>>>();
  for (const p of produits) {
    const cats = categoriesDe(p.categorie);
    for (const u of p.usages) {
      if (!u.culture) continue;
      const m = parCultureCatVous.get(u.culture) ?? new Map<string, Set<string>>();
      for (const c of cats.length ? cats : ["Autre"]) {
        const s = m.get(c) ?? new Set<string>();
        s.add(p.id);
        m.set(c, s);
      }
      parCultureCatVous.set(u.culture, m);
    }
  }

  const cultures: LigneCulture[] = [...parCultureMarche.entries()]
    .map(([culture, parCat]) => {
      const vousCat = parCultureCatVous.get(culture);
      const cases = CATEGORIES.map((c) => ({
        categorie: c,
        vous: vousCat?.get(c)?.size ?? 0,
        marche: parCat.get(c)?.size ?? 0,
      }));
      return {
        culture,
        marche: new Set([...parCat.values()].flatMap((s) => [...s])).size,
        vous: parCultureVous.get(culture)?.size ?? 0,
        cases,
      };
    })
    .filter((l) => l.marche >= 10)
    .sort((a, b) => b.marche - a.marche);

  const g: Gamme = {
    detenteur,
    nbMolecules: tenues.size,
    nbMoleculesMarche: MARCHE.size,
    categories,
    cultures,
    manques,
  };
  CACHE.set(detenteurId, g);
  return g;
}

/** Comparatif court : où se situe la société parmi les détenteurs de l'index. */
export const RANG_DETENTEURS = [...DETENTEURS].sort(
  (a, b) => b.nbMatieresActives - a.nbMatieresActives
);
