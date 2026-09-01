import { ansesPour } from "./ephy";
import type { FicheReglementaire } from "./types";

// ────────────────────────────────────────────────────────────────────────────
// COUCHE EXPERTISE — saisie à la main, distincte de l'index ONSSA importé.
//
// Source des statuts UE : Pesticide Properties Database (PPDB), AERU,
// University of Hertfordshire — https://sitem.herts.ac.uk/aeru/ppdb/
// Consultée le 2026-09-01.
//
// ⚠️ RÉSERVE IMPORTANTE — à répéter au client :
// La PPDB reflète la date d'expiration inscrite au règlement d'approbation.
// La Commission européenne prolonge très fréquemment ces dates par règlement
// d'exécution lorsque l'évaluation de renouvellement n'est pas terminée. Une
// échéance dépassée ci-dessous signifie donc « à recouper d'urgence contre la
// EU Pesticides Database », PAS « substance interdite ».
//
// Le statut Maroc vient de l'index ONSSA (présence d'une homologation), pas
// d'ici : toute molécule présente à l'index est « homologuée » par construction.
// ────────────────────────────────────────────────────────────────────────────

const SRC = { source: "PPDB / AERU Univ. Hertfordshire", date: "2026-09-01" };

export const FICHES: FicheReglementaire[] = [
  {
    molecule: "Abamectine",
    famille: "Avermectines",
    modeAction: "Insecticide-acaricide, modulateur des canaux chlorure (IRAC 6)",
    statutUE: "approuvée",
    echeanceUE: "2038-03-31",
    statutMaroc: "homologuée",
    statutVoisins: [{ pays: "UE", statut: "autorisée" }],
    drapeaux: ["Toxique abeilles", "Neurotoxique", "Effets reproduction"],
    note: "Approbation UE longue (2038). Toxicité abeilles extrême (contact 0,001 µg/abeille) : mentions de protection des pollinisateurs incontournables au dossier.",
    verifie: SRC,
  },
  {
    molecule: "Alpha-cyperméthrine",
    famille: "Pyréthrinoïdes",
    modeAction: "Insecticide de contact et d'ingestion, modulateur des canaux sodium (IRAC 3A)",
    statutUE: "non_renouvelée",
    statutMaroc: "homologuée",
    statutVoisins: [{ pays: "UE", statut: "interdite" }],
    drapeaux: ["Perturbateur endocrinien", "Toxique abeilles"],
    note: "NON approuvée en UE (approbation expirée). Perturbateur endocrinien confirmé au sens OMS. Molécule à substituer en priorité.",
    verifie: SRC,
  },
  {
    molecule: "Azoxystrobine",
    famille: "Strobilurines",
    modeAction: "Fongicide systémique, inhibiteur de la respiration mitochondriale (FRAC 11)",
    statutUE: "approuvée",
    echeanceUE: "2027-05-31",
    statutMaroc: "homologuée",
    statutVoisins: [{ pays: "UE", statut: "autorisée" }],
    drapeaux: ["Persistance environnementale"],
    note: "Approuvée UE. Effets mineurs sur la reproduction. Renouvellement à surveiller à l'approche de mai 2027.",
    verifie: SRC,
  },
  {
    molecule: "Bentazone",
    famille: "Benzothiadiazinones",
    modeAction: "Herbicide de contact, inhibiteur du photosystème II (HRAC C3)",
    statutUE: "approuvée",
    echeanceUE: "2027-10-31",
    statutMaroc: "homologuée",
    statutVoisins: [{ pays: "UE", statut: "autorisée" }],
    drapeaux: ["Contaminant eaux souterraines"],
    note: "Approuvée UE. Forte mobilité (solubilité 7112 mg/l, faible rétention sol) : contaminant potentiel des nappes — volet devenir dans l'environnement à soigner.",
    verifie: SRC,
  },
  {
    molecule: "Clodinafop-propargyl",
    famille: "Aryloxyphénoxypropionates (FOPs)",
    modeAction: "Herbicide graminicide, inhibiteur de l'ACCase (HRAC A)",
    statutUE: "approuvée",
    echeanceUE: "2027-07-31",
    statutMaroc: "homologuée",
    statutVoisins: [{ pays: "UE", statut: "autorisée" }],
    drapeaux: ["Classé cancérogène suspecté", "Neurotoxique", "Effets reproduction"],
    note: "Approuvée UE jusqu'en 2027. US EPA : « likely to be human carcinogen ». Volet toxicologie sensible.",
    verifie: SRC,
  },
  {
    molecule: "Cuivre - oxychlorure de cuivre",
    famille: "Composés cuivriques",
    modeAction: "Fongicide-bactéricide de contact multisite (FRAC M01)",
    statutUE: "approuvée",
    echeanceUE: "2029-06-30",
    statutMaroc: "homologuée",
    statutVoisins: [{ pays: "UE", statut: "restreinte" }],
    drapeaux: [
      "Candidate substitution",
      "Métal lourd - accumulation sols",
      "Effets reproduction",
    ],
    note: "Candidate à la substitution UE (2 critères PBT). Le cuivre ne se dégrade pas : accumulation dans les sols, doses annuelles plafonnées en UE. Pression réglementaire croissante malgré l'approbation.",
    verifie: SRC,
  },
  {
    molecule: "Cuivre - sulfate de cuivre",
    famille: "Composés cuivriques",
    modeAction: "Fongicide-bactéricide de contact multisite (FRAC M01)",
    statutUE: "inconnu",
    statutMaroc: "homologuée",
    statutVoisins: [],
    drapeaux: ["Métal lourd - accumulation sols"],
    note: "Fiche non vérifiée. Profil supposé proche de l'oxychlorure de cuivre — à confirmer sur la EU Pesticides Database.",
  },
  {
    molecule: "Cyperméthrine",
    famille: "Pyréthrinoïdes",
    modeAction: "Insecticide de contact et d'ingestion, modulateur des canaux sodium (IRAC 3A)",
    statutUE: "approuvée",
    echeanceUE: "2029-01-31",
    statutMaroc: "homologuée",
    statutVoisins: [{ pays: "UE", statut: "restreinte" }],
    drapeaux: ["Candidate substitution", "Perturbateur endocrinien", "Toxique abeilles"],
    note: "Approuvée jusqu'en 2029 mais candidate à la substitution (isomères non actifs) et perturbateur endocrinien confirmé OMS. Forte toxicité aquatique.",
    verifie: SRC,
  },
  {
    molecule: "2,4-D -sel d'amine",
    famille: "Acides phénoxycarboxyliques",
    modeAction: "Herbicide hormonal, auxine de synthèse (HRAC O)",
    statutUE: "approuvée",
    echeanceUE: "2030-12-31",
    statutMaroc: "homologuée",
    statutVoisins: [{ pays: "UE", statut: "autorisée" }],
    drapeaux: ["Perturbateur endocrinien", "Classé cancérogène suspecté"],
    note: "Approuvée UE jusqu'en 2030. Perturbateur endocrinien confirmé OMS ; CIRC groupe 2B. Risque de dérive sur cultures sensibles à documenter.",
    verifie: SRC,
  },
  {
    molecule: "Dicamba -sel dimethylamine [DMA]",
    famille: "Acides benzoïques",
    modeAction: "Herbicide hormonal, auxine de synthèse (HRAC O)",
    statutUE: "approuvée",
    echeanceUE: "2027-03-31",
    statutMaroc: "homologuée",
    statutVoisins: [{ pays: "UE", statut: "autorisée" }],
    drapeaux: ["Classé cancérogène suspecté", "Effets reproduction"],
    note: "Approuvée UE jusqu'en mars 2027. Carcinome parafolliculaire thyroïdien observé chez le rat mâle. Volatilité et dérive : sujet récurrent d'instruction.",
    verifie: SRC,
  },
  {
    molecule: "Difénoconazole",
    famille: "Triazoles",
    modeAction: "Fongicide systémique, inhibiteur de la déméthylation (FRAC 3)",
    statutUE: "approuvée",
    echeanceUE: "2026-03-15",
    statutMaroc: "homologuée",
    statutVoisins: [{ pays: "UE", statut: "restreinte" }],
    drapeaux: ["Candidate substitution", "Perturbateur endocrinien"],
    note: "Échéance d'approbation PPDB au 15/03/2026 — DÉPASSÉE : vérifier en urgence l'existence d'un règlement d'exécution de prolongation. Candidate à la substitution + perturbateur endocrinien confirmé OMS.",
    verifie: SRC,
  },
  {
    molecule: "Emamectin benzoate",
    famille: "Avermectines",
    modeAction: "Insecticide, modulateur des canaux chlorure (IRAC 6)",
    statutUE: "approuvée",
    echeanceUE: "2026-11-15",
    statutMaroc: "homologuée",
    statutVoisins: [{ pays: "UE", statut: "autorisée" }],
    drapeaux: ["Toxique abeilles"],
    note: "Échéance UE au 15/11/2026 — moins de 3 mois. Toxicité abeilles très élevée (contact 0,0036 µg/abeille).",
    verifie: SRC,
  },
  {
    molecule: "Fosétyl-Aluminium",
    famille: "Phosphonates",
    modeAction: "Fongicide systémique ascendant et descendant (FRAC P07)",
    statutUE: "approuvée",
    echeanceUE: "2026-10-31",
    statutMaroc: "homologuée",
    statutVoisins: [{ pays: "UE", statut: "autorisée" }],
    drapeaux: ["Effets reproduction"],
    note: "Échéance UE au 31/10/2026 — moins de 2 mois. Trois produits du portefeuille reposent sur cette molécule.",
    verifie: SRC,
  },
  {
    molecule: "Fluroxypyr",
    famille: "Pyridines carboxyliques",
    modeAction: "Herbicide hormonal, auxine de synthèse (HRAC O)",
    statutUE: "approuvée",
    echeanceUE: "2027-02-15",
    statutMaroc: "homologuée",
    statutVoisins: [{ pays: "UE", statut: "autorisée" }],
    drapeaux: ["Neurotoxique"],
    note: "Approuvée UE jusqu'en février 2027. Profil toxicologique globalement favorable.",
    verifie: SRC,
  },
  {
    molecule: "Glyphosate",
    famille: "Glycines substituées",
    modeAction: "Herbicide systémique total, inhibiteur de l'EPSPS (HRAC G)",
    statutUE: "approuvée",
    echeanceUE: "2033-12-15",
    statutMaroc: "homologuée",
    statutVoisins: [{ pays: "UE", statut: "autorisée" }],
    drapeaux: ["Sous pression sociétale", "Classé cancérogène suspecté"],
    note: "Renouvelée UE jusqu'au 15/12/2033. CIRC groupe 2A, contesté par EFSA et US EPA. Risque réglementaire faible à moyen terme mais exposition médiatique forte.",
    verifie: SRC,
  },
  {
    molecule: "Glyphosate -sel d'isopropylamine",
    famille: "Glycines substituées",
    modeAction: "Herbicide systémique total, inhibiteur de l'EPSPS (HRAC G)",
    statutUE: "approuvée",
    echeanceUE: "2033-12-15",
    statutMaroc: "homologuée",
    statutVoisins: [{ pays: "UE", statut: "autorisée" }],
    drapeaux: ["Sous pression sociétale", "Classé cancérogène suspecté"],
    note: "Sel d'isopropylamine du glyphosate — suit le statut de la molécule mère (approuvée jusqu'au 15/12/2033).",
    verifie: SRC,
  },
  {
    molecule: "Huile minérale paraffinique",
    famille: "Huiles minérales",
    modeAction: "Insecticide physique (asphyxie), action mécanique",
    statutUE: "inconnu",
    statutMaroc: "homologuée",
    statutVoisins: [],
    drapeaux: [],
    note: "Fiche non vérifiée. Substance à faible risque a priori — à confirmer sur la EU Pesticides Database.",
  },
  {
    molecule: "Imidaclopride",
    famille: "Néonicotinoïdes",
    modeAction: "Insecticide systémique, agoniste des récepteurs nicotiniques (IRAC 4A)",
    statutUE: "non_renouvelée",
    statutMaroc: "homologuée",
    statutVoisins: [{ pays: "UE", statut: "interdite" }],
    drapeaux: ["Néonicotinoïde", "Toxique abeilles", "Effets reproduction"],
    note: "NON approuvée en UE (approbation expirée). Toxicité abeilles extrême (0,0037 µg/abeille). Molécule à substituer en priorité — exposition export en cas de LMR abaissée.",
    verifie: SRC,
  },
  {
    molecule: "Lambda cyhalothrine",
    famille: "Pyréthrinoïdes",
    modeAction: "Insecticide de contact et d'ingestion, modulateur des canaux sodium (IRAC 3A)",
    statutUE: "approuvée",
    echeanceUE: "2026-08-31",
    statutMaroc: "homologuée",
    statutVoisins: [{ pays: "UE", statut: "restreinte" }],
    drapeaux: ["Candidate substitution", "Toxique abeilles"],
    note: "Échéance d'approbation PPDB au 31/08/2026 — DÉPASSÉE : vérifier en urgence l'existence d'un règlement de prolongation. Candidate à la substitution (2 critères PBT, faible ADI/ARfD/AOEL).",
    verifie: SRC,
  },
  {
    molecule: "Métalaxyl",
    famille: "Phénylamides",
    modeAction: "Fongicide systémique, inhibiteur de l'ARN polymérase (FRAC 4)",
    statutUE: "approuvée",
    echeanceUE: "2026-09-30",
    statutMaroc: "homologuée",
    statutVoisins: [{ pays: "UE", statut: "autorisée" }],
    drapeaux: ["Candidate substitution"],
    note: "Échéance UE au 30/09/2026 — moins d'un mois. Candidate à la substitution pour les isomères non actifs. Toxicité chronique mammifères élevée (hépatotoxique).",
    verifie: SRC,
  },
  {
    molecule: "Oxyfluorfène",
    famille: "Éthers diphényliques",
    modeAction: "Herbicide de contact, inhibiteur de la PPO (HRAC E)",
    statutUE: "approuvée",
    echeanceUE: "2027-05-31",
    statutMaroc: "homologuée",
    statutVoisins: [{ pays: "UE", statut: "restreinte" }],
    drapeaux: ["Candidate substitution", "Classé cancérogène suspecté"],
    note: "Approuvée jusqu'en mai 2027 mais candidate à la substitution (2 critères PBT) et cancérogène suspecté (CLP). Renouvellement incertain — anticiper une alternative.",
    verifie: SRC,
  },
  {
    molecule: "Pyriméthanil",
    famille: "Anilinopyrimidines",
    modeAction: "Fongicide, inhibiteur de la biosynthèse de la méthionine (FRAC 9)",
    statutUE: "approuvée",
    echeanceUE: "2026-06-30",
    statutMaroc: "homologuée",
    statutVoisins: [{ pays: "UE", statut: "autorisée" }],
    drapeaux: ["Classé cancérogène suspecté", "Effets reproduction"],
    note: "Échéance d'approbation PPDB au 30/06/2026 — DÉPASSÉE : vérifier l'existence d'un règlement de prolongation. Cancérogène possible.",
    verifie: SRC,
  },
  {
    molecule: "Soufre",
    famille: "Inorganiques",
    modeAction: "Fongicide-acaricide de contact multisite (FRAC M02)",
    statutUE: "inconnu",
    statutMaroc: "homologuée",
    statutVoisins: [],
    drapeaux: [],
    note: "Fiche non vérifiée. Substance de base à faible risque a priori — à confirmer sur la EU Pesticides Database.",
  },
];

// ── Alignement ANSES → ONSSA ────────────────────────────────────────────────
//
// L'ONSSA s'aligne sur l'ANSES : une matière active retirée en France finit par
// être retirée au Maroc. Le statut ANSES est donc le signal le plus prédictif
// dont dispose l'outil.
//
// Deux façons de le renseigner :
//   1. Lu dans le catalogue E-Phy (à brancher — voir scripts/import_ephy.py)
//   2. DÉDUIT, quand la fiche ne le porte pas : une substance non approuvée au
//      niveau UE ne peut être autorisée dans aucun État membre, donc pas en
//      France non plus. Le retrait ANSES en découle nécessairement.
//
// La déduction est signalée (`deduit: true`) pour ne jamais la faire passer
// pour une lecture de source.

function avecAnses(f: FicheReglementaire): FicheReglementaire {
  if (f.anses) return f;

  // 1. Lecture du catalogue E-Phy — source de référence.
  const lu = ansesPour(f.molecule);
  if (lu && lu.statut !== "inconnu") {
    return { ...f, anses: { statut: lu.statut, dateRetrait: lu.dateRetrait, deduit: false, source: lu.source } };
  }

  // 2. À défaut, déduction : une substance non approuvée en UE ne peut être
  //    autorisée dans aucun État membre, donc pas en France.
  if (f.statutUE === "non_renouvelée" || f.statutUE === "retirée") {
    return {
      ...f,
      anses: {
        statut: "retirée",
        deduit: true,
        source: "Déduit — substance non approuvée en UE, donc non autorisable en France",
      },
    };
  }
  return { ...f, anses: { statut: "inconnu" } };
}

const FICHES_COMPLETES: FicheReglementaire[] = FICHES.map(avecAnses);

const PAR_MOLECULE = new Map(FICHES_COMPLETES.map((f) => [norm(f.molecule), f]));

function norm(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Rattache une matière active de l'index ONSSA (« Abamectine(1,8%) ») à sa
 * fiche d'expertise. Essaie le nom exact, puis le préfixe le plus long.
 */
export function ficheDe(nomOuMolecule: string): FicheReglementaire | null {
  const base = norm(nomOuMolecule.split(/[([]/)[0].replace(/-$/, ""));
  const exact = PAR_MOLECULE.get(base);
  if (exact) return exact;
  let best: FicheReglementaire | null = null;
  for (const [cle, f] of PAR_MOLECULE) {
    if ((base.startsWith(cle) || cle.startsWith(base)) && (!best || cle.length > norm(best.molecule).length)) {
      best = f;
    }
  }
  return best;
}

export const COUVERTURE = {
  nbFiches: FICHES_COMPLETES.length,
  nbVerifiees: FICHES_COMPLETES.filter((f) => f.verifie).length,
  nbAnsesRenseigne: FICHES_COMPLETES.filter((f) => f.anses && f.anses.statut !== "inconnu").length,
  nbAnsesDeduit: FICHES_COMPLETES.filter((f) => f.anses?.deduit).length,
  source: SRC.source,
  date: SRC.date,
  sourceAnses: "Catalogue E-Phy — Anses (non branché : statuts déduits ou saisis)",
};
