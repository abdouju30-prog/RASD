import { FOURNISSEURS } from "./data";
import { ANNUAIRE_PISTES } from "./pistes";
import { ETABLISSEMENTS } from "./epa";
import { USINES_TURQUES } from "./bku";
import { USINES_CHINE } from "./icama";
import { SOCIETES_CATALOGUE_RU } from "./russie";
import { USINES_BRESIL } from "./bresil";
import { SOCIETES_COREE, etiquette } from "./coree";
import { ocde, type FicheOcde } from "./ocde";

// ────────────────────────────────────────────────────────────────────────────
// RECENSEMENT PAR PAYS — le même gisement, lu par nationalité
//
// ⚠️ CE QUE CE MODULE RÉPARE. L'écran fournisseurs filtrait par pays, mais
// seulement l'index ONSSA : les autres registres restaient hors du filtre.
// Lu par ce filtre, l'outil paraissait vide sur l'Inde — vingt-quatre
// fournisseurs — alors qu'il en connaissait plus de trois cents, assis dans le
// registre de l'EPA que personne ne pouvait interroger par nationalité.
//
// Le principe qui tient tout l'outil vaut ici aussi : ON N'A PAS BESOIN DU
// REGISTRE D'UN PAYS POUR TROUVER SES FABRICANTS. Tout registre ouvert qui
// nomme ses titulaires nomme des sociétés du monde entier. L'Inde ne publie
// rien d'exploitable ; l'Inde est pourtant partout ailleurs.
//
// ⚠️ CE QUE CE MODULE NE DIT PAS. Le pays vient d'une inférence sur la raison
// sociale, sauf pour l'EPA qui le déclare et pour la Chine, la Turquie, la
// Russie et la Corée où le registre lui-même situe la société. Un comptage par pays est
// donc un ordre de grandeur, pas un état civil — chaque ligne garde la marque
// de son registre pour qu'on puisse remonter à la source.
// ────────────────────────────────────────────────────────────────────────────

export type Registre =
  | "onssa" | "australie" | "epa" | "chine" | "turquie" | "russie" | "bresil"
  | "coree";

export const LIBELLE_REGISTRE: Record<Registre, string> = {
  onssa: "Index ONSSA",
  australie: "Registre australien",
  epa: "Registre EPA",
  chine: "Registre chinois",
  turquie: "Registre turc",
  russie: "Catalogue russe",
  bresil: "Registre brésilien",
  coree: "Registre coréen",
};

/** Ce que chaque registre prouve — à ne jamais gommer en agrégeant. */
export const PORTEE_REGISTRE: Record<Registre, string> = {
  onssa: "Déjà référencé au Maroc — ouvre la voie me-too",
  australie: "Détient une homologation australienne",
  epa: "Site de production déclaré à l'EPA américaine",
  chine: "Homologation chinoise de technique, licence de production",
  turquie: "Fabrique en Turquie (mention İMAL)",
  russie: "Détient une homologation russe",
  bresil: "Fabrique le technique, site déclaré au dossier brésilien",
  coree: "Détient une homologation coréenne — titulaire, non usine de synthèse",
};

export interface EntreePays {
  id: string;
  nom: string;
  pays: string;
  registre: Registre;
  /** Ce que ce registre dit précisément de cette société. */
  detail: string;
  /** Seul l'index ONSSA ouvre le dossier par référence. */
  meToo: boolean;
  /** Le pays est-il déclaré par le registre, ou déduit du nom ? */
  paysFiable: boolean;
  href: string | null;
}

function entrees(): EntreePays[] {
  const out: EntreePays[] = [];

  for (const f of FOURNISSEURS) {
    if (!f.pays) continue;
    out.push({
      id: `onssa-${f.id}`,
      nom: f.nom,
      registre: "onssa",
      detail: `${f.nbLignesMaroc} ligne(s) au Maroc · ${f.nbMatieresActives} M.A.`,
      meToo: true,
      paysFiable: f.paysFiable,
      href: `/fournisseurs?q=${encodeURIComponent(f.nom)}`,
      pays: f.pays,
    });
  }

  for (const p of ANNUAIRE_PISTES) {
    if (!p.pays || p.lien === "referencee") continue;
    out.push({
      id: `au-${p.id}`,
      nom: p.nom,
      registre: "australie",
      detail: `${p.matieres.length} M.A. en Australie · ${p.matieresMaroc.length} aussi au Maroc`,
      meToo: false,
      paysFiable: p.paysFiable,
      href: `/fournisseurs?q=${encodeURIComponent(p.nom)}`,
      pays: p.pays,
    });
  }

  // ⚠️ ON PART DE TOUS LES ÉTABLISSEMENTS, pas de `USINES_SOURCING`. Cette
  // liste-là est restreinte aux pays de sourcing générique : l'Australie, le
  // Canada ou le Japon en sont exclus par construction, et un recensement par
  // pays qui les ignore ment sur ce que l'outil sait. Les sites sont regroupés
  // par société pour compter des fournisseurs, pas des adresses.
  const parSociete = new Map<string, { nom: string; pays: string; villes: string[]; n: number }>();
  for (const e of ETABLISSEMENTS) {
    const nom = e.societe ?? e.etablissement;
    // Quelques lignes du registre EPA portent un tiret ou un blanc en guise de
    // raison sociale. Une entrée sans nom n'est pas un fournisseur.
    if (!nom || !e.pays || !/[A-Za-z0-9]/.test(nom)) continue;
    const k = `${nom}|${e.pays}`;
    const v = parSociete.get(k) ?? { nom, pays: e.pays, villes: [], n: 0 };
    v.n += 1;
    if (e.ville && !v.villes.includes(e.ville)) v.villes.push(e.ville);
    parSociete.set(k, v);
  }
  for (const [k, v] of parSociete) {
    out.push({
      id: `epa-${k}`,
      nom: v.nom,
      registre: "epa",
      detail: [`${v.n} site(s)`, v.villes.slice(0, 2).join(", ")].filter(Boolean).join(" · "),
      meToo: false,
      // L'EPA déclare le pays de l'établissement : c'est une donnée, pas une
      // déduction sur la raison sociale.
      paysFiable: true,
      href: `/fournisseurs?q=${encodeURIComponent(v.nom)}`,
      pays: v.pays,
    });
  }

  // ⚠️ Le registre brésilien est le seul à déclarer un FABRICANT de technique
  // avec son site : ses lignes ne se confondent pas avec des détenteurs
  // d'homologation, et c'est pourquoi il passe en tête du classement.
  for (const u of USINES_BRESIL) {
    const pays = u.pays ?? u.paysBrut;
    if (!pays) continue;
    out.push({
      id: `br-${u.id}`,
      nom: u.nom,
      registre: "bresil",
      detail: [u.sites.slice(0, 2).join(" · "), `${u.matieres.length} M.A. de l'index`]
        .filter(Boolean)
        .join(" · "),
      meToo: false,
      paysFiable: Boolean(u.pays),
      href: `/fournisseurs?q=${encodeURIComponent(u.nom)}`,
      pays,
    });
  }

  // ⚠️ LES FILIALES DE GROUPES ÉTRANGERS SONT EXCLUES. « Syngenta Korea » est
  // coréenne au registre et ne l'est pas au sourcing : la compter gonflerait le
  // recensement coréen de sociétés qu'on connaît déjà sous leur maison mère.
  for (const s of SOCIETES_COREE) {
    if (s.groupe) continue;
    out.push({
      id: `kr-${s.cle}`,
      nom: s.commercial ? `${s.commercial} (${s.nom})` : etiquette(s),
      registre: "coree",
      detail: `${s.nbHomologations} homologation(s) · ${s.nbFabrique} produit(s) fabriqué(s) en Corée`,
      meToo: false,
      paysFiable: true,
      href: `/fournisseurs?q=${encodeURIComponent(s.commercial ?? s.nom)}`,
      pays: "Corée du Sud",
    });
  }

  for (const u of USINES_CHINE) {
    out.push({
      id: `cn-${u.nom}`,
      nom: u.glose ? `${u.glose} — ${u.nom}` : u.nom,
      registre: "chine",
      detail: `${u.matieres.length} M.A. de l'index · licence ${u.licenceProduction}`,
      meToo: false,
      paysFiable: true,
      href: `/fournisseurs?q=${encodeURIComponent(u.nom)}`,
      pays: "Chine",
    });
  }

  for (const u of USINES_TURQUES) {
    if (!u.nom) continue;
    out.push({
      id: `tr-${u.id}`,
      nom: u.nom,
      registre: "turquie",
      detail: `${u.nbImal} homologation(s) İMAL · ${u.matieresImal.length} M.A.`,
      meToo: false,
      paysFiable: true,
      href: `/fournisseurs?q=${encodeURIComponent(u.nom)}`,
      pays: "Turquie",
    });
  }

  for (const s of SOCIETES_CATALOGUE_RU) {
    if (!s.pays) continue;
    out.push({
      id: `ru-${s.cle}`,
      nom: s.identifie ? `${s.latin} (${s.nom})` : s.nom,
      registre: "russie",
      detail: `${s.nbHomologations} homologation(s) en Russie`,
      meToo: false,
      paysFiable: s.paysFiable,
      href: null,
      pays: s.pays,
    });
  }

  return out;
}

const TOUTES = entrees();

export interface FichePays {
  pays: string;
  total: number;
  parRegistre: { registre: Registre; nb: number }[];
  /** true dès qu'une société du pays est déjà référencée à l'ONSSA. */
  meToo: number;
  entrees: EntreePays[];
  /**
   * Lien du pays avec l'OCDE, ou null s'il n'en a aucun.
   *
   * ⚠️ NE DIT RIEN DU FOURNISSEUR. C'est un fait sur le pays : ses laboratoires
   * relèvent — ou non — d'un programme BPL couvert par l'Acceptation Mutuelle
   * des Données. Une société d'un pays adhérent peut très bien ne produire
   * aucune étude BPL, et le Maroc n'étant pas adhérent, l'ONSSA n'est de toute
   * façon pas tenue par l'AMD.
   */
  ocde: FicheOcde | null;
}

const PAR_PAYS = new Map<string, EntreePays[]>();
for (const e of TOUTES) {
  const l = PAR_PAYS.get(e.pays) ?? [];
  l.push(e);
  PAR_PAYS.set(e.pays, l);
}

// L'ordre dit ce que chaque registre prouve : l'ONSSA ouvre la voie me-too, le
// Brésil nomme un fabricant de technique, l'EPA situe un site, les autres
// attestent d'une homologation.
const RANG: Record<Registre, number> = {
  onssa: 0,
  bresil: 1,
  epa: 2,
  chine: 3,
  turquie: 4,
  coree: 5,
  russie: 6,
  australie: 7,
};

export function fichePays(pays: string): FichePays {
  const l = PAR_PAYS.get(pays) ?? [];
  const compte = new Map<Registre, number>();
  for (const e of l) compte.set(e.registre, (compte.get(e.registre) ?? 0) + 1);
  return {
    pays,
    total: l.length,
    meToo: l.filter((e) => e.meToo).length,
    parRegistre: [...compte.entries()]
      .map(([registre, nb]) => ({ registre, nb }))
      .sort((a, b) => RANG[a.registre] - RANG[b.registre]),
    entrees: [...l].sort(
      (a, b) => RANG[a.registre] - RANG[b.registre] || a.nom.localeCompare(b.nom)
    ),
    ocde: ocde(pays),
  };
}

/** Tous les pays connus, du mieux couvert au moins couvert. */
export const CENSUS_PAYS: FichePays[] = [...PAR_PAYS.keys()]
  .map(fichePays)
  .sort((a, b) => b.total - a.total || a.pays.localeCompare(b.pays));

export const STATS_PAYS = {
  nbPays: CENSUS_PAYS.length,
  nbEntrees: TOUTES.length,
  nbRegistres: 8,
};
