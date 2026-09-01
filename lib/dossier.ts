import { MATIERES, getMatiere } from "./data";
import { detailRisque, fmtDate } from "./logic";
import { candidat } from "./sourcing";
import type {
  Dossier,
  DossierGenere,
  Fournisseur,
  MatiereActive,
  PieceDossier,
  ProduitPortefeuille,
  TypeDossier,
  VoieReglementaire,
} from "./types";

// ────────────────────────────────────────────────────────────────────────────
// USINE À DOSSIERS
//
// Ce module produit un dossier ONSSA *pré-rempli* : la structure des rubriques,
// la répartition des responsabilités, les usages revendiqués avec leur
// précédent réglementaire, et les objections prévisibles.
//
// ⚠️ Il ne produit PAS un dossier prêt à déposer au sens administratif : les
// études techniques (toxicologie, écotoxicologie, résidus, méthodes d'analyse)
// sont la propriété du fournisseur de la matière active et doivent être
// obtenues auprès de lui. L'outil dit précisément lesquelles réclamer, et ce
// qui est déjà acquis par référence à une homologation marocaine existante.
// ────────────────────────────────────────────────────────────────────────────

interface Rubrique {
  rubrique: string;
  poids: number;
  responsable: PieceDossier["responsable"];
  /** La voie « me-too » permet-elle de s'appuyer sur le dossier existant ? */
  allegeableParReference: boolean;
}

const RUBRIQUES: Rubrique[] = [
  { rubrique: "Identité & propriétés physico-chimiques", poids: 1, responsable: "fournisseur", allegeableParReference: true },
  { rubrique: "Méthodes d'analyse", poids: 1, responsable: "fournisseur", allegeableParReference: true },
  { rubrique: "Toxicologie (mammifères)", poids: 2, responsable: "fournisseur", allegeableParReference: true },
  { rubrique: "Résidus & LMR", poids: 1.5, responsable: "laboratoire", allegeableParReference: true },
  { rubrique: "Devenir dans l'environnement", poids: 1, responsable: "fournisseur", allegeableParReference: true },
  { rubrique: "Écotoxicologie", poids: 1, responsable: "fournisseur", allegeableParReference: true },
  { rubrique: "Efficacité biologique (essais Maroc)", poids: 2, responsable: "laboratoire", allegeableParReference: false },
  { rubrique: "Classification & étiquetage", poids: 1, responsable: "phytobeht", allegeableParReference: false },
];

/** Ordres de grandeur d'instruction — à confirmer auprès de l'ONSSA. */
export const DELAIS_INDICATIFS: Record<TypeDossier, string> = {
  extension_usage: "6 à 12 mois",
  renouvellement: "6 à 12 mois",
  nouvelle_homologation: "12 à 24 mois par référence · 24 à 36 mois pour une substance nouvelle",
};

function parseReferentiel(entree: string) {
  const [usage = "", dose = "", dar = ""] = entree.split(" :: ");
  return { usage: usage.trim(), dose: dose.trim(), dar: dar.trim() };
}

/**
 * Usages revendicables : ceux déjà homologués au Maroc sur cette matière
 * active. Chacun constitue un précédent opposable — même dose, même DAR,
 * déjà accepté par l'ONSSA chez un autre détenteur.
 */
function usagesRevendicables(ma: MatiereActive, limite = 25) {
  return ma.referentielDoses.slice(0, limite).map((e) => {
    const { usage, dose, dar } = parseReferentiel(e);
    return {
      usage,
      dose,
      dar: dar || "—",
      precedent: `Homologué au Maroc — ${ma.nbHomologations} AMM sur ${ma.molecule}`,
    };
  });
}

function objections(ma: MatiereActive, voie: VoieReglementaire, type: TypeDossier): string[] {
  const out: string[] = [];
  const f = ma.fiche;

  if (f) {
    if (f.statutUE === "non_renouvelée" || f.statutUE === "retirée") {
      out.push(
        `Statut UE : approbation ${f.statutUE === "retirée" ? "retirée" : "non renouvelée"} — l'ONSSA peut opposer l'évolution du référentiel européen. Argumentaire de maintien à préparer (absence d'alternative, conditions d'usage marocaines).`
      );
    }
    if (f.drapeaux.includes("Candidate substitution")) {
      out.push(
        "Candidate à la substitution UE : justifier l'absence d'alternative moins préoccupante pour les usages visés."
      );
    }
    if (f.drapeaux.some((d) => d.startsWith("CMR") || d.includes("cancérogène"))) {
      out.push(
        "Volet toxicologie : justification renforcée exigée — profil cancérogène suspecté sur la matière active."
      );
    }
    if (f.drapeaux.includes("Perturbateur endocrinien")) {
      out.push(
        "Perturbation endocrinienne : dossier d'évaluation spécifique à joindre ; volet le plus fréquemment opposé."
      );
    }
    if (f.drapeaux.includes("Toxique abeilles")) {
      out.push(
        "Écotoxicologie : évaluation du risque pollinisateurs et mentions abeilles obligatoires à l'étiquetage."
      );
    }
    if (f.drapeaux.includes("Contaminant eaux souterraines")) {
      out.push(
        "Devenir dans l'environnement : étude de lixiviation attendue — molécule mobile, risque de contamination des nappes."
      );
    }
    if (f.drapeaux.includes("Métal lourd - accumulation sols")) {
      out.push("Accumulation dans les sols : plafond de dose annuelle susceptible d'être imposé.");
    }
  } else {
    out.push(
      "Statut réglementaire UE non renseigné dans l'outil : à documenter avant dépôt (fiche d'expertise manquante)."
    );
  }

  out.push(
    "Efficacité biologique : essais en conditions marocaines requis — compter au minimum 2 saisons et 2 régions."
  );

  if (voie === "me_too") {
    out.push(
      `Recevabilité de la référence : l'ONSSA vérifiera que le produit est équivalent à une spécialité déjà homologuée (même matière active, même teneur, formulation comparable). Écart de formulation = dossier complet.`
    );
  }
  if (type === "renouvellement") {
    out.push(
      "Renouvellement : historique de commercialisation et données de pharmacovigilance phytosanitaire à joindre."
    );
  }
  return out;
}

function pieces(voie: VoieReglementaire, ma: MatiereActive): PieceDossier[] {
  return RUBRIQUES.map((r) => {
    const allege = voie === "me_too" && r.allegeableParReference;
    return {
      rubrique: r.rubrique,
      statut: "manquante" as const,
      poids: r.poids,
      responsable: r.responsable,
      prerempli: allege
        ? `Allégeable : ${ma.nbHomologations} AMM existent au Maroc sur ${ma.molecule}. Demander au fournisseur son dossier technique déjà accepté par l'ONSSA, ou déposer par référence à une spécialité homologuée.`
        : r.rubrique.startsWith("Efficacité")
        ? "Non allégeable : essais d'efficacité en conditions marocaines toujours exigés, quelle que soit la voie."
        : "À produire par le détenteur : étiquetage conforme à la réglementation marocaine, mentions de danger et de protection.",
      source: allege ? "Index ONSSA — précédent réglementaire" : undefined,
    };
  });
}

export interface OptionsDossier {
  type?: TypeDossier;
  fournisseur?: Fournisseur | null;
  produitNom?: string;
  origine?: string;
}

/** Génère un dossier pré-rempli pour une matière active donnée. */
export function genererDossier(maId: string, opts: OptionsDossier = {}): DossierGenere | null {
  const ma = getMatiere(maId);
  if (!ma) return null;

  const c = candidat(ma);
  const voie = c.voie;
  const type = opts.type ?? "nouvelle_homologation";
  const fournisseur =
    opts.fournisseur ?? c.fournisseursCoutFaible[0] ?? c.fournisseurs[0] ?? null;

  const p = pieces(voie, ma);

  return {
    id: `GEN-${ma.id}`,
    produitNom: opts.produitNom ?? `${ma.molecule} — projet`,
    matiereActiveId: ma.id,
    type,
    statut: "brouillon",
    origine: opts.origine ?? "Généré depuis la prospection",
    pieces: p,
    voie,
    fournisseur,
    usagesVises: usagesRevendicables(ma),
    objections: objections(ma, voie, type),
    aFournirParFournisseur: p
      .filter((x) => x.responsable === "fournisseur")
      .map((x) => x.rubrique),
  };
}

/** Dossier de renouvellement pour un produit du portefeuille dont l'AMM expire. */
export function genererRenouvellement(p: ProduitPortefeuille): DossierGenere | null {
  const maId = p.matieresActivesIds[0];
  if (!maId) return null;
  return genererDossier(maId, {
    type: "renouvellement",
    produitNom: p.nomCommercial,
    origine: `AMM ${p.amm ?? "—"} — échéance ${fmtDate(p.expiration)}`,
    fournisseur: null,
  });
}

/** Charge de travail : répartition des rubriques par responsable. */
export function chargeParResponsable(d: Dossier) {
  const m = new Map<string, number>();
  for (const p of d.pieces) {
    const k = p.responsable ?? "non attribué";
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

export function completude(d: Dossier): number {
  const total = d.pieces.reduce((s, p) => s + p.poids, 0);
  if (!total) return 0;
  const acquis = d.pieces.reduce((s, p) => {
    const f =
      p.statut === "validée" ? 1 : p.statut === "présente" ? 0.7 : p.statut === "en_cours" ? 0.35 : 0;
    return s + p.poids * f;
  }, 0);
  return Math.round((acquis / total) * 100);
}

/** Part du dossier allégeable par référence à une homologation existante. */
export function partAllegeable(d: DossierGenere): number {
  const total = d.pieces.reduce((s, p) => s + p.poids, 0);
  const allege = d.pieces
    .filter((p) => p.source === "Index ONSSA — précédent réglementaire")
    .reduce((s, p) => s + p.poids, 0);
  return total ? Math.round((allege / total) * 100) : 0;
}

export function alternativesPour(maId: string, limite = 5) {
  const ma = getMatiere(maId);
  if (!ma) return [];
  const cibles = new Set(ma.cibles);
  return MATIERES.filter((m) => m.id !== ma.id && m.categorie === ma.categorie)
    .map((m) => {
      const communes = m.cibles.filter((c) => cibles.has(c)).length;
      const r = detailRisque(m);
      return { m, communes, r };
    })
    .filter((x) => x.communes >= 2 && (x.r === null || x.r.score < 40))
    .sort((a, b) => b.communes - a.communes)
    .slice(0, limite)
    .map((x) => ({
      id: x.m.id,
      nom: x.m.nom,
      molecule: x.m.molecule,
      categorie: x.m.categorie,
      risque: x.r?.niveau ?? null,
      rationale: `${x.communes} cibles en commun · ${x.m.nbHomologations} AMM au Maroc · ${x.m.detenteurs.length} détenteur(s)`,
    }));
}
