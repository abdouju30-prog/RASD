import { getMatiere } from "./data";
import { candidatParId } from "./sourcing";
import { TOUS_ITEMS, type ItemLocalise } from "./checklist-onssa";
import { PACKS } from "./packs-fournisseur";
import { pistesPour, type Piste } from "./pistes";
import { fabricantsChinois, licenceLisible, usines as usinesChinoises, type SocieteChinoise } from "./icama";
import { fabricantsTurcs, type SocieteTurque } from "./bku";
import { fabricantsRusses, type SocieteRusse } from "./russie";
import { etiquetteRusse } from "./cyrillique";
import { fabricantsBresiliens, type UsineBresil } from "./bresil";
import {
  etiquette as etiquetteCoree,
  fabricantsCoreens,
  type SocieteCoreenne,
} from "./coree";
import { usinesDe, type UsinesSociete } from "./epa";
import { organismesPour, type EssaisPourCulture } from "./onssa-eservice";
import type { CandidatSourcing, Fournisseur, MatiereActive } from "./types";

// ────────────────────────────────────────────────────────────────────────────
// FICHE DE CONSULTATION FOURNISSEUR
//
// L'outil savait dire quelle matière active viser et qui la fabrique. Il ne
// disait pas quoi faire ensuite. Cette fiche comble le pas suivant : passer
// d'une liste de sociétés à une consultation qu'on peut envoyer.
//
// L'ordre est délibéré, et il est contraire à l'instinct :
//
//   1. le verrou réglementaire — une molécule retirée en France ne se source pas
//   2. la ROUTE — me-too ou dossier complet, c'est elle qui décide de tout
//   3. la liste courte, tirée des quatre registres
//   4. le questionnaire technique, AVANT toute demande de prix
//   5. les essais d'efficacité — qui peut les faire, sur quelles cultures
//
// ⚠️ POURQUOI LE PRIX VIENT EN DERNIER. Un fournisseur moins cher qui ne
// détient pas les études coûte l'étude manquante, sans commune mesure avec
// l'écart de prix au kilo. Le prix n'arbitre qu'entre des candidats déjà tous
// recevables au regard de l'Annexe 3-B.
//
// ⚠️ AUCUN PRIX N'EST CALCULÉ NI SUGGÉRÉ. Aucun registre public n'en publie.
// La fiche fournit le cadre qui rend les devis comparables — teneur, Incoterm,
// coût rendu par kilo de pur — et laisse la saisie à qui consulte.
// ────────────────────────────────────────────────────────────────────────────

export type Route = "me_too" | "dossier_complet" | "bloque";

export interface Etape {
  cle: Route;
  titre: string;
  lecture: string;
}

const ROUTES: Record<Route, Etape> = {
  bloque: {
    cle: "bloque",
    titre: "Ne pas consulter",
    lecture:
      "Retirée en France. L'ONSSA s'alignant sur l'ANSES, le dossier serait condamné d'avance.",
  },
  me_too: {
    cle: "me_too",
    titre: "Voie me-too — consultation restreinte",
    lecture:
      "Des fournisseurs sont déjà référencés à l'ONSSA : leur dossier a passé l'administration marocaine, le vôtre s'y réfère. À consulter en premier, même plus cher.",
  },
  dossier_complet: {
    cle: "dossier_complet",
    titre: "Dossier complet — consultation large",
    lecture:
      "Aucun fournisseur de l'index ne porte cette matière active : dossier à constituer intégralement. Le fournisseur fournira l'essentiel des études — consulter large.",
  },
};

// ── Liste courte, les quatre couches ────────────────────────────────────────

export type Origine =
  | "onssa" | "australie" | "chine" | "turquie" | "russie" | "bresil" | "coree"
  | "usine";

export interface Candidat {
  id: string;
  nom: string;
  origine: Origine;
  pays: string | null;
  /** Ce qui, dans les registres, justifie de l'inscrire à la liste. */
  motif: string;
  /**
   * Nombre de lignes au Maroc, pour les seuls fournisseurs de l'index.
   * C'est ce qui sépare un acteur installé d'une société à une référence —
   * null partout ailleurs, aucun autre registre ne mesure la même chose.
   */
  lignesMaroc: number | null;
  /** Usines EPA retrouvées à ce nom, quand le nom est en alphabet latin. */
  usines: UsinesSociete | null;
  /**
   * Adresse postale, quand un registre la publie.
   *
   * ⚠️ DEUX REGISTRES SEULEMENT EN PUBLIENT : l'EPA américaine, qui déclare
   * l'adresse de chaque établissement, et le registre turc. L'index ONSSA, le
   * registre chinois et le catalogue russe n'en portent aucune — dire « adresse
   * non publiée » vaut mieux que laisser une case vide qu'on prendrait pour un
   * oubli de saisie.
   */
  adresse: string | null;
  /** true = ouvre la voie me-too. Le seul avantage réglementaire qui existe. */
  meToo: boolean;
}

/** Adresse du premier site EPA connu, formatée pour un courrier. */
function adresseEpa(u: UsinesSociete | null): string | null {
  const site = u?.sites?.[0];
  if (!site) return null;
  return [site.adresse, site.ville, site.region, site.pays].filter(Boolean).join(", ") || null;
}

function depuisOnssa(f: Fournisseur): Candidat {
  const u = usinesDe(f.nom);
  return {
    id: `onssa-${f.id}`,
    nom: f.nom,
    origine: "onssa",
    pays: f.pays,
    motif: `${f.nbLignesMaroc} ligne(s) au Maroc sur cette matière active`,
    lignesMaroc: f.nbLignesMaroc,
    usines: u,
    adresse: adresseEpa(u),
    meToo: true,
  };
}

function depuisAustralie(p: Piste): Candidat {
  const u = usinesDe(p.nom);
  return {
    id: `au-${p.id}`,
    nom: p.nom,
    origine: "australie",
    pays: p.pays,
    motif:
      p.lien === "homonyme"
        ? `${p.nbProduits} produit(s) · nom proche de « ${p.fournisseurOnssa} », à vérifier`
        : `${p.nbProduits} produit(s) homologué(s)`,
    lignesMaroc: null,
    usines: u,
    adresse: adresseEpa(u),
    meToo: false,
  };
}

function depuisBresil(u: UsineBresil): Candidat {
  return {
    id: `br-${u.id}`,
    nom: u.nom,
    origine: "bresil",
    pays: u.pays ?? u.paysBrut,
    motif: `${u.nbHomologations} technique(s) homologué(s) au Brésil · ${u.matieres.length} M.A. de l'index`,
    lignesMaroc: null,
    // Le seul registre qui nomme l'atelier plutôt que la seule société.
    adresse: u.sites.length ? `${u.sites.join(" · ")}, ${u.pays ?? u.paysBrut ?? ""}`.trim() : null,
    usines: usinesDe(u.nom),
    meToo: false,
  };
}

function depuisCoree(s: SocieteCoreenne): Candidat {
  return {
    id: `kr-${s.cle}`,
    // Le nom latin devant, le hangul derrière : c'est le premier qui se recopie
    // dans un courriel de consultation, le second qui permet de vérifier.
    nom: s.commercial ? `${s.commercial} — ${s.nom}` : `${etiquetteCoree(s)} (romanisé) — ${s.nom}`,
    origine: "coree",
    pays: "Corée du Sud",
    motif: `${s.nbHomologations} homologation(s) en Corée · ${s.matieres.length} M.A. de l'index`,
    lignesMaroc: null,
    // Le registre coréen ne publie pas l'adresse du titulaire.
    adresse: null,
    // Les raisons sociales coréennes ne se rapprochent pas de l'alphabet latin.
    usines: null,
    meToo: false,
  };
}

function depuisRussie(s: SocieteRusse): Candidat {
  return {
    // ⚠️ Le nom latin passe devant : une raison sociale en cyrillique ne se
    // cherche pas depuis un clavier latin. Le nom d'origine suit, car c'est
    // lui qui figure au catalogue et lui seul qui permet de vérifier.
    id: `ru-${s.cle}`,
    nom: etiquetteRusse(s),
    origine: "russie",
    pays: s.pays,
    motif: `${s.nom} · ${s.nbHomologations} homologation(s) en Russie · ${s.matieres.length} M.A. de l'index`,
    lignesMaroc: null,
    // Le catalogue russe ne publie aucune adresse.
    adresse: null,
    usines: null,
    meToo: false,
  };
}

function depuisChine(s: SocieteChinoise): Candidat {
  return {
    id: `cn-${s.nom}`,
    // En alphabet latin : c'est ce qui se recopie dans un courriel de consultation.
    nom: s.glose || s.latin || s.nom,
    origine: "chine",
    pays: s.region ? `Chine (${s.region})` : "Chine",
    motif: `Technique${s.teneurMax ? ` ${s.teneurMax}` : ""} · ${licenceLisible(s.licenceProduction) ?? "licence non publiée"}`,
    lignesMaroc: null,
    // Le registre chinois ne publie pas d'adresse ; la région, si.
    adresse: s.region ? `${s.region}, Chine` : null,
    // Les raisons sociales chinoises ne se rapprochent pas de l'alphabet latin.
    usines: null,
    meToo: false,
  };
}

function depuisTurquie(s: SocieteTurque): Candidat {
  return {
    id: `tr-${s.id}`,
    nom: s.nom ?? "",
    origine: "turquie",
    pays: "Turquie",
    motif: `${s.nbImal} homologation(s) fabriquée(s) en Turquie · ${s.matieresImal.length} M.A.`,
    lignesMaroc: null,
    adresse: s.adresse,
    // Raisons sociales en alphabet latin : le registre EPA est interrogeable.
    usines: usinesDe(s.nom ?? ""),
    meToo: false,
  };
}

// ── Questionnaire technique ─────────────────────────────────────────────────

export interface Question extends ItemLocalise {
  /** Paquet d'études commercial qui couvre la ligne, si l'un le couvre. */
  pack: string | null;
}

/**
 * Les lignes de l'Annexe 3-B qui incombent au FOURNISSEUR.
 *
 * C'est exactement ce qu'il faut lui demander, et rien d'autre : les lignes qui
 * relèvent du détenteur ou d'un laboratoire marocain n'ont pas à figurer dans
 * une consultation. Le nom du paquet commercial est rappelé quand il existe —
 * les brochures indiennes et chinoises parlent en « 6 Pack Acute Tox », pas en
 * numéros de section marocains.
 */
function questionnaire(): Question[] {
  const parLigne = new Map<string, string>();
  for (const p of PACKS) {
    for (const c of p.couvre) {
      for (const code of c.codes) parLigne.set(`${c.partie}.${code}`, p.libelleBrochure);
    }
  }
  return TOUS_ITEMS.filter((i) => i.responsable === "fournisseur").map((i) => ({
    ...i,
    pack: parLigne.get(i.cle) ?? null,
  }));
}

export const QUESTIONNAIRE: Question[] = questionnaire();

/**
 * Exigences que l'Annexe 3-B ne formule pas comme des lignes, mais sans
 * lesquelles un fournisseur ne sert à rien. Ce sont elles qui éliminent le plus
 * de candidats, et elles se demandent AVANT le prix.
 */
export const EXIGENCES_PREALABLES = [
  {
    titre: "Lettre d'accès",
    detail:
      "Autorisation écrite pour que l'ONSSA s'appuie sur son dossier. Beaucoup la refusent ou la facturent à part : à obtenir avant toute négociation.",
  },
  {
    titre: "Analyse 5 lots sous BPL",
    detail:
      "Teneur et impuretés sur cinq lots. Établit la constance de la production.",
  },
  {
    titre: "Profil d'impuretés, impuretés pertinentes nommées",
    detail:
      "La comparaison d'équivalence se joue là : bonne teneur mais autre profil, autre substance.",
  },
  {
    titre: "Spécification FAO/WHO, ou justification de l'écart",
    detail:
      "Référence internationale. Un écart doit être expliqué et documenté.",
  },
  {
    titre: "Certificats BPL des laboratoires",
    detail:
      "Les certificats des laboratoires, pas l'affirmation que les études existent.",
  },
];

/** Ce qu'il faut imposer pour que deux devis soient comparables. */
export const CADRE_DEVIS = [
  ["Teneur du technique", "95 %, 97 %, 98 % — à figer, sinon vous comparez des choses différentes"],
  ["Incoterm unique", "CIF Casablanca pour tout le monde ; un FOB Shanghai ne se compare pas à un CIF"],
  ["Quantité annuelle", "prévisionnelle, avec paliers de remise"],
  ["Conditionnement", "fûts, big-bags, palettisation"],
  ["Délai et validité", "délai de production et durée de validité de l'offre"],
  ["Conditions de paiement", "acompte, L/C, délai"],
];

/**
 * Le seul calcul qui décide, écrit en toutes lettres plutôt que codé : les
 * termes qui pèsent le plus — les études manquantes — ne sont pas dans l'outil.
 */
export const FORMULE_COUT =
  "(prix × 100 / teneur) + fret + assurance + droits + frais de port + coût amorti des études que ce fournisseur ne fournit pas";

// ── Assemblage ──────────────────────────────────────────────────────────────

export interface Consultation {
  matiere: MatiereActive;
  candidat: CandidatSourcing;
  route: Etape;
  /** Fournisseurs ouvrant la voie me-too — à consulter en premier. */
  meToo: Candidat[];
  /** Les autres pistes, tous registres confondus. */
  autres: Candidat[];
  essais: EssaisPourCulture;
  nbLignesFournisseur: number;
  nbLignesGlp: number;
}

export function consultation(maId: string): Consultation | null {
  const ma = getMatiere(maId);
  const c = candidatParId(maId);
  if (!ma || !c) return null;

  const bloque = ma.anses?.statut === "retirée";
  const meToo = c.fournisseurs.map(depuisOnssa);

  const vus = new Set(meToo.map((x) => x.nom.toUpperCase()));
  const autres: Candidat[] = [];

  for (const p of pistesPour(ma.nom).nouvelles) {
    if (vus.has(p.nom.toUpperCase())) continue;
    vus.add(p.nom.toUpperCase());
    autres.push(depuisAustralie(p));
  }

  const tr = fabricantsTurcs(ma.nom);
  if (tr) {
    for (const s of tr.fabricants) {
      const n = (s.nom ?? "").toUpperCase();
      if (!n || vus.has(n)) continue;
      vus.add(n);
      autres.push(depuisTurquie(s));
    }
  }

  // ⚠️ LE BRÉSIL PASSE EN PREMIER parmi les registres étrangers : c'est le seul
  // qui déclare le fabricant du technique, avec son site. Les autres nomment
  // des détenteurs d'homologation, ce qui n'est pas la même chose.
  const br = fabricantsBresiliens(ma.nom);
  if (br) {
    for (const u of br.usines.slice(0, 10)) {
      const n = u.nom.toUpperCase();
      if (vus.has(n)) continue;
      vus.add(n);
      autres.push(depuisBresil(u));
    }
  }

  const ru = fabricantsRusses(ma.nom);
  if (ru) {
    for (const s of ru.russes.slice(0, 8)) {
      const n = s.nom.toUpperCase();
      if (vus.has(n)) continue;
      vus.add(n);
      autres.push(depuisRussie(s));
    }
  }

  // La Corée après la Russie : elle nomme des titulaires, non des usines de
  // synthèse — mais c'est un membre de l'OCDE qui produit du générique, et le
  // seul registre de l'outil daté au jour. Les filiales de groupes étrangers
  // sont écartées : ce ne sont pas des pistes de sourcing.
  const kr = fabricantsCoreens(ma.nom);
  if (kr) {
    for (const s of kr.societes.slice(0, 8)) {
      const n = s.nom.toUpperCase();
      if (vus.has(n)) continue;
      vus.add(n);
      autres.push(depuisCoree(s));
    }
  }

  const cn = fabricantsChinois(ma.nom);
  if (cn) {
    for (const s of usinesChinoises(cn)) {
      if (vus.has(s.nom.toUpperCase())) continue;
      vus.add(s.nom.toUpperCase());
      autres.push(depuisChine(s));
    }
  }

  return {
    matiere: ma,
    candidat: c,
    route: bloque ? ROUTES.bloque : meToo.length > 0 ? ROUTES.me_too : ROUTES.dossier_complet,
    meToo,
    autres,
    essais: organismesPour(ma.cultures),
    nbLignesFournisseur: QUESTIONNAIRE.length,
    nbLignesGlp: QUESTIONNAIRE.filter((q) => q.glp).length,
  };
}

export const LIBELLE_ORIGINE: Record<Origine, string> = {
  onssa: "index ONSSA",
  australie: "registre australien",
  chine: "registre chinois",
  turquie: "registre turc",
  russie: "catalogue russe",
  bresil: "registre brésilien",
  coree: "registre coréen",
  usine: "registre EPA",
};
