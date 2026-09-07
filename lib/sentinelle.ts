import sentinelleFile from "../data/sentinelle.json";

// ────────────────────────────────────────────────────────────────────────────
// SENTINELLE — CE QU'ON POURRAIT HOMOLOGUER LE PREMIER AU MAROC
//
// Le radar défend le portefeuille. Celui-ci fait l'inverse : il cherche
// l'exclusivité. Une matière active homologuée à l'étranger et absente de
// l'index marocain est une première homologation possible, et la première
// homologation EST l'exclusivité — le suivant devra constituer son propre
// dossier complet, faute de lettre d'accès du premier déposant.
//
// ⚠️ CE QUE CETTE LISTE NE DIT PAS : LE BREVET.
// Aucun registre ouvert ne publie l'état des brevets. Une molécule récente de
// Syngenta, Bayer, BASF ou Corteva est protégée par brevet ET par la protection
// des données : personne ne la fabriquera pour vous, et son inventeur
// l'homologuera lui-même au Maroc. Guetter les lancements des majors ne donne
// donc AUCUNE piste d'approvisionnement — c'est du renseignement de
// concurrence, ce qui est utile et n'est pas la même chose.
//
// LE SEUL SIGNAL FIABLE QU'UNE MOLÉCULE EST DEVENUE ACCESSIBLE :
//
//     quelqu'un d'autre que son inventeur en fabrique le technique,
//     et l'a déclaré à un régulateur exigeant.
//
// Le registre brésilien publie exactement cela, fabricant par fabricant, avec
// le pays. Une usine chinoise ou indienne déclarée sur une molécule est la
// preuve, PAR LES FAITS, que sa fabrication générique a lieu. C'est le
// classement retenu ici, et il ne repose sur aucune supposition.
//
// ET LA CORÉE APPORTE LA DATE — donc la veille que vous cherchiez vraiment.
// Le registre coréen date chaque homologation au jour et se régénère chaque
// jour : on y voit ENTRER les molécules, y compris celles que les majors
// viennent de lancer. Une molécule entrée récemment en Corée et sans aucun
// fabricant générique au Brésil est exactement une nouveauté sous brevet :
// à surveiller, pas à sourcer. Le jour où un fabricant chinois ou indien
// apparaîtra au registre brésilien, elle basculera d'elle-même dans les
// candidates à saisir — sans que personne ait à y penser.
//
// ⚠️ ET IL NE SUFFIT PAS. Une molécule fabriquée par dix usines chinoises peut
// rester couverte par un brevet au Maroc. La liberté d'exploitation se vérifie
// auprès d'un conseil en propriété industrielle, jamais dans un registre
// sanitaire.
// ────────────────────────────────────────────────────────────────────────────

export interface FabricantSentinelle {
  nom: string;
  pays: string | null;
  /** Pays où le sourcing générique est compétitif — fait déclaré au registre. */
  coutFaible: boolean;
}

export interface StatutFrance {
  nom: string;
  etat: string | null;
  nbProduitsAutorises: number;
  nbProduitsRetires: number;
  dernierRetrait: string | null;
}

export interface StatutAustralie {
  nom: string;
  statut: string;
  nbProduitsAgricoles: number;
  matiereActiveApprouvee: boolean;
}

/** Ce que le registre coréen sait d'une molécule — et lui seul : la date. */
export interface PresenceCoree {
  nom: string;
  nbHomologations: number;
  /** Produits fabriqués en Corée — pas matières actives synthétisées. */
  nbFabrique: number;
  nbImporte: number;
  /** Première homologation coréenne : la date d'entrée de la molécule. */
  premiere: string | null;
  derniere: string | null;
  nbSocietes: number;
}

export interface CandidateBrute {
  /** Clé chimique — l'identité stable d'une molécule entre deux registres. */
  cle: string;
  /** Nom sous lequel la molécule a été rencontrée la première fois. */
  nom: string;
  nomPt: string | null;
  coree: PresenceCoree | null;
  iso: string | null;
  groupeChimique: string | null;
  teneurMax: number | null;
  nbHomologationsBr: number;
  fabricants: FabricantSentinelle[];
  titulaires: string[];
  france: StatutFrance | null;
  australie: StatutAustralie | null;
  premiereVue: string;
  nouvelle: boolean;
}

interface FichierSentinelle {
  meta: {
    source: string;
    genere: string;
    dernierReleve: string;
    premierReleve: boolean;
    nbCandidates: number;
    nbEcarteesIndexMaroc: number;
    nbNouvelles: number;
    nbAvecStatutFrancais: number;
    nbAvecStatutAustralien: number;
    nbVuesAuBresil: number;
    nbVuesEnCoree: number;
    avertissement: string;
  };
  candidates: CandidateBrute[];
}

const FICHIER = sentinelleFile as unknown as FichierSentinelle;
export const META_SENTINELLE = FICHIER.meta;

/**
 * L'accessibilité d'une molécule, lue sur ses fabricants déclarés.
 *
 * `ouverte`  au moins une usine dans un pays de sourcing générique — c'est
 *            là qu'il y a quelque chose à acheter ;
 * `bridee`   des fabricants, mais tous dans des pays à coût élevé : souvent
 *            l'inventeur et ses sous-traitants, donc pas encore générique ;
 * `fermee`   aucun fabricant déclaré : rien à sourcer aujourd'hui.
 */
export type Acces = "ouverte" | "bridee" | "fermee";

export const LIBELLE_ACCES: Record<Acces, string> = {
  ouverte: "Fabrication générique attestée",
  bridee: "Fabricants déclarés, aucun générique",
  fermee: "Aucun fabricant déclaré",
};

/**
 * Ce que le statut français impose. L'ONSSA s'aligne sur l'ANSES : une
 * molécule retirée en France n'est pas une occasion, c'est un dossier qui sera
 * rattrapé. Et une molécule que l'ANSES ignore n'a pas de trajectoire connue.
 */
export type Feu = "vert" | "orange" | "rouge" | "inconnu";

export const LIBELLE_FEU: Record<Feu, string> = {
  vert: "Autorisée en France",
  orange: "Inscrite, sans produit autorisé en France",
  rouge: "Retirée en France",
  inconnu: "Inconnue d'E-Phy",
};

export interface Candidate extends CandidateBrute {
  /** Ce qu'on écrit : le nom ISO s'il existe, sinon le nom de rencontre. */
  libelle: string;
  /** Date d'entrée en Corée, ou null si la molécule n'y est pas homologuée. */
  entreeCoree: string | null;
  acces: Acces;
  feu: Feu;
  nbGeneriques: number;
  paysGeneriques: string[];
  /** Note de tri. Jamais affichée comme un score de valeur : c'est un ordre. */
  rang: number;
}

function acces(c: CandidateBrute): Acces {
  if (c.fabricants.length === 0) return "fermee";
  return c.fabricants.some((f) => f.coutFaible) ? "ouverte" : "bridee";
}

function feu(c: CandidateBrute): Feu {
  if (!c.france) return "inconnu";
  if (c.france.nbProduitsAutorises > 0) return "vert";
  // Aucun produit autorisé et un retrait daté : la France a tourné la page.
  if (c.france.dernierRetrait) return "rouge";
  return "orange";
}

// Le classement dit une seule chose : par quoi commencer. Il met en tête ce
// qui est à la fois sourçable et sûr, et repousse ce que la France a retiré —
// une molécule rouge reste consultable, elle ne remonte jamais.
const POIDS_FEU: Record<Feu, number> = { vert: 40, orange: 8, inconnu: 4, rouge: -60 };

function enrichir(c: CandidateBrute): Candidate {
  const gen = c.fabricants.filter((f) => f.coutFaible);
  const pays = [...new Set(gen.map((f) => f.pays).filter((p): p is string => Boolean(p)))].sort();
  return {
    ...c,
    libelle: c.iso ?? c.nom,
    entreeCoree: c.coree?.premiere ?? null,
    acces: acces(c),
    feu: feu(c),
    nbGeneriques: gen.length,
    paysGeneriques: pays,
    rang:
      POIDS_FEU[feu(c)] +
      Math.min(gen.length, 12) * 4 +
      Math.min(c.nbHomologationsBr, 20) +
      (c.australie ? 4 : 0) +
      (c.iso ? 3 : 0),
  };
}

export const CANDIDATES: Candidate[] = FICHIER.candidates
  .map(enrichir)
  .sort((a, b) => b.rang - a.rang || a.libelle.localeCompare(b.libelle, "fr"));

/** Les seules qui valent un appel : sourçables ET pas retirées en France. */
export const A_SAISIR = CANDIDATES.filter((c) => c.acces === "ouverte" && c.feu === "vert");

/** Sourçables, mais sans trajectoire réglementaire française connue. */
export const A_VERIFIER = CANDIDATES.filter(
  (c) => c.acces === "ouverte" && (c.feu === "orange" || c.feu === "inconnu")
);

/** Le piège : sourçable et retirée en France. Montrée pour être écartée. */
export const A_ECARTER = CANDIDATES.filter((c) => c.acces === "ouverte" && c.feu === "rouge");

/** Nouveautés du dernier relevé — la notification, sans rien à faire tourner. */
export const NOUVELLES = CANDIDATES.filter((c) => c.nouvelle);

/**
 * Fenêtre au-delà de laquelle une homologation coréenne n'est plus une
 * nouveauté. Trois ans : c'est le temps qu'il faut à une molécule pour se
 * diffuser d'un premier registre aux autres, et bien moins que la durée d'un
 * brevet — une molécule entrée il y a trois ans n'a donc rien perdu de sa
 * protection, seulement de son caractère de nouvelle.
 */
const FENETRE_NOUVEAUTE_ANS = 3;

const SEUIL_RECENT = (() => {
  const d = new Date(META_SENTINELLE.dernierReleve);
  d.setFullYear(d.getFullYear() - FENETRE_NOUVEAUTE_ANS);
  return d.toISOString().slice(0, 10);
})();

/**
 * LA VEILLE DES LANCEMENTS — ce que vous vouliez guetter chez les majors.
 *
 * Molécules entrées récemment au registre coréen et dont AUCUN fabricant
 * générique n'est déclaré au Brésil. C'est la signature d'une molécule encore
 * verrouillée par son inventeur : renseignement de concurrence, pas piste
 * d'achat. Elles restent suivies, et basculeront d'elles-mêmes dans « à
 * saisir » le jour où une usine chinoise ou indienne apparaîtra sur elles.
 */
export const A_SURVEILLER = CANDIDATES.filter(
  (c) => c.acces !== "ouverte" && c.entreeCoree !== null && c.entreeCoree >= SEUIL_RECENT
).sort((a, b) => (b.entreeCoree ?? "").localeCompare(a.entreeCoree ?? ""));

export const STATS_SENTINELLE = {
  nbCandidates: CANDIDATES.length,
  nbASaisir: A_SAISIR.length,
  nbAVerifier: A_VERIFIER.length,
  nbAEcarter: A_ECARTER.length,
  nbNouvelles: NOUVELLES.length,
  nbASurveiller: A_SURVEILLER.length,
  nbVuesAuBresil: META_SENTINELLE.nbVuesAuBresil,
  nbVuesEnCoree: META_SENTINELLE.nbVuesEnCoree,
  fenetreNouveaute: FENETRE_NOUVEAUTE_ANS,
  nbEcartees: META_SENTINELLE.nbEcarteesIndexMaroc,
  premierReleve: META_SENTINELLE.premierReleve,
  dernierReleve: META_SENTINELLE.dernierReleve,
  source: META_SENTINELLE.source,
  avertissement: META_SENTINELLE.avertissement,
};
