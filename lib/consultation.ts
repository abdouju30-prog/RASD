import { getMatiere } from "./data";
import { candidatParId } from "./sourcing";
import { TOUS_ITEMS, type ItemLocalise } from "./checklist-onssa";
import { PACKS } from "./packs-fournisseur";
import { pistesPour, type Piste } from "./pistes";
import { fabricantsChinois, usines as usinesChinoises, type SocieteChinoise } from "./icama";
import { fabricantsTurcs, type SocieteTurque } from "./bku";
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

export type Origine = "onssa" | "australie" | "chine" | "turquie" | "usine";

export interface Candidat {
  id: string;
  nom: string;
  origine: Origine;
  pays: string | null;
  /** Ce qui, dans les registres, justifie de l'inscrire à la liste. */
  motif: string;
  /** Usines EPA retrouvées à ce nom, quand le nom est en alphabet latin. */
  usines: UsinesSociete | null;
  /** true = ouvre la voie me-too. Le seul avantage réglementaire qui existe. */
  meToo: boolean;
}

function depuisOnssa(f: Fournisseur): Candidat {
  return {
    id: `onssa-${f.id}`,
    nom: f.nom,
    origine: "onssa",
    pays: f.pays,
    motif: `${f.nbLignesMaroc} ligne(s) au Maroc sur cette matière active`,
    usines: usinesDe(f.nom),
    meToo: true,
  };
}

function depuisAustralie(p: Piste): Candidat {
  return {
    id: `au-${p.id}`,
    nom: p.nom,
    origine: "australie",
    pays: p.pays,
    motif:
      p.lien === "homonyme"
        ? `${p.nbProduits} produit(s) · nom proche de « ${p.fournisseurOnssa} », à vérifier`
        : `${p.nbProduits} produit(s) homologué(s)`,
    usines: usinesDe(p.nom),
    meToo: false,
  };
}

function depuisChine(s: SocieteChinoise): Candidat {
  return {
    id: `cn-${s.nom}`,
    nom: s.nom,
    origine: "chine",
    pays: "Chine",
    motif: `Technique${s.teneurMax ? ` ${s.teneurMax}` : ""} · licence ${s.licenceProduction}`,
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
    for (const s of tr.fabricants.slice(0, 8)) {
      const n = (s.nom ?? "").toUpperCase();
      if (!n || vus.has(n)) continue;
      vus.add(n);
      autres.push(depuisTurquie(s));
    }
  }

  const cn = fabricantsChinois(ma.nom);
  if (cn) {
    for (const s of usinesChinoises(cn).slice(0, 12)) {
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
  usine: "registre EPA",
};
