import { MATIERES, getMatiere } from "./data";
import { detailRisque, fmtDate } from "./logic";
import { candidat } from "./sourcing";
import {
  CHECKLIST_ONSSA,
  TOUS_ITEMS,
  type ItemChecklist,
  type Responsable,
  type SectionChecklist,
} from "./checklist-onssa";
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
// USINE À DOSSIERS — adossée à l'Annexe 3-B de l'ONSSA
//
// Le dossier produit suit ligne à ligne le formulaire officiel (92 lignes,
// 2 parties, 11 sections). Pour chaque ligne, l'outil dit :
//   • qui détient la donnée (fournisseur / laboratoire / détenteur)
//   • si une accréditation BPL est exigée
//   • si la ligne est allégeable par référence à une homologation marocaine
//   • ce que l'index ONSSA permet déjà de pré-remplir
//
// ⚠️ L'outil ne produit PAS les études elles-mêmes. Elles appartiennent au
// fournisseur de la matière active ou relèvent d'un laboratoire accrédité.
// Le dossier est prêt à être *constitué*, pas à être *déposé*.
// ────────────────────────────────────────────────────────────────────────────

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
 * active. Chacun est un précédent opposable — même dose, même DAR, déjà
 * acceptés par l'ONSSA chez un autre détenteur.
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

/** Contenu pré-rempli d'une ligne, tiré de l'index ONSSA. */
function preremplir(
  item: ItemChecklist,
  ma: MatiereActive,
  produit: ProduitPortefeuille | null,
  fournisseur: Fournisseur | null
): string | undefined {
  switch (item.prerempli) {
    case "produit":
      return produit?.nomCommercial;
    case "categorie":
      return ma.categorie ?? produit?.categorie ?? undefined;
    case "formulation":
      return produit?.formulation ?? undefined;
    case "composition":
      return ma.nom;
    case "fournisseur":
      return fournisseur?.nom ?? produit?.fournisseurs.join(", ");
    case "usages": {
      const c = ma.cultures.slice(0, 8).join(", ");
      return c ? `${ma.cultures.length} cultures homologuées au Maroc : ${c}${ma.cultures.length > 8 ? "…" : ""}` : undefined;
    }
    case "cibles": {
      const c = ma.cibles.slice(0, 8).join(", ");
      const n = ma.cibles.length;
      return c ? `${n} cible${n > 1 ? "s" : ""} homologuée${n > 1 ? "s" : ""} : ${c}${n > 8 ? "…" : ""}` : undefined;
    }
    case "doses": {
      // Dédoublonner : l'index contient des variantes d'espacement de la même
      // dose (« 75 g/hl » / « 75g/hl »), qui ne sont pas des doses distinctes.
      const vues = new Set<string>();
      const d: string[] = [];
      for (const e of ma.referentielDoses) {
        const p = parseReferentiel(e);
        if (!p.dose) continue;
        const cle = `${p.usage}|${p.dose.replace(/\s+/g, "").toLowerCase()}`;
        if (vues.has(cle)) continue;
        vues.add(cle);
        d.push(`${p.usage} → ${p.dose}`);
        if (d.length === 3) break;
      }
      return d.length
        ? `Doses déjà acceptées : ${d.join(" ; ")}${vues.size > 3 ? "…" : ""}`
        : undefined;
    }
    case "dar": {
      // Ne garder que les DAR numériques : l'index utilise « - » et
      // « non requis » comme absence de délai, ce ne sont pas des valeurs.
      const dars = [
        ...new Set(
          ma.referentielDoses
            .map((e) => parseReferentiel(e).dar)
            .filter((x) => x && /^\d+$/.test(x.trim()))
            .map((x) => Number(x))
        ),
      ].sort((a, b) => a - b);
      if (!dars.length) return undefined;
      return `DAR déjà acceptés au Maroc : ${dars.slice(0, 8).join(", ")} jours`;
    }
    case "applications":
      return produit?.usages.some((u) => u.nbAppl)
        ? `Nombre d'applications au dossier existant : ${[
            ...new Set(produit.usages.map((u) => u.nbAppl).filter(Boolean)),
          ].join(", ")}`
        : undefined;
    default:
      return undefined;
  }
}

/** Convertit une ligne de checklist en pièce de dossier. */
function enPiece(
  item: ItemChecklist,
  section: SectionChecklist,
  partie: "I" | "II",
  voie: VoieReglementaire,
  ma: MatiereActive,
  produit: ProduitPortefeuille | null,
  fournisseur: Fournisseur | null
): PieceDossier {
  const allege = voie === "me_too" && item.allegeable;
  const rempli = preremplir(item, ma, produit, fournisseur);

  const notes: string[] = [];
  if (rempli) notes.push(`Pré-rempli depuis l'index ONSSA — ${rempli}`);
  if (allege) {
    notes.push(
      `Allégeable : ${ma.nbHomologations} AMM existent au Maroc sur ${ma.molecule}. Réclamer au fournisseur son dossier déjà accepté, ou déposer par référence.`
    );
  }
  if (item.glp) notes.push("Étude BPL — laboratoire accrédité obligatoire.");
  if (item.aide) notes.push(item.aide);

  return {
    rubrique: `${partie}.${section.code}.${item.code.split(".").slice(1).join(".") || item.code} — ${item.libelle}`,
    code: item.code,
    partie,
    section: section.titre,
    libelle: item.libelle,
    statut: "manquante",
    poids: item.glp ? 2 : 1,
    responsable: item.responsable,
    glp: item.glp,
    allegeable: allege,
    prerempli: notes.length ? notes.join(" ") : undefined,
    source: allege ? "Index ONSSA — précédent réglementaire" : undefined,
  };
}

function objections(ma: MatiereActive, voie: VoieReglementaire, type: TypeDossier): string[] {
  const out: string[] = [];
  const f = ma.fiche;

  if (f) {
    if (f.anses?.statut === "retirée" || f.anses?.statut === "en_retrait") {
      out.push(
        "⚠️ Matière active retirée en France. L'ONSSA s'alignant sur l'ANSES, l'instruction d'un dossier sur cette molécule est très exposée : un refus ou un retrait en cours d'instruction est probable. À ne pas engager sans arbitrage."
      );
    }
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
        "Partie I section 3 (toxicologie) : justification renforcée exigée — profil cancérogène suspecté sur la matière active."
      );
    }
    if (f.drapeaux.includes("Perturbateur endocrinien")) {
      out.push(
        "Perturbation endocrinienne : dossier d'évaluation spécifique à joindre ; volet le plus fréquemment opposé."
      );
    }
    if (f.drapeaux.includes("Toxique abeilles")) {
      out.push(
        "Partie I section 7 (étiquetage) : mentions abeilles obligatoires, et évaluation du risque pollinisateurs attendue."
      );
    }
    if (f.drapeaux.includes("Contaminant eaux souterraines")) {
      out.push(
        "Molécule mobile : étude de lixiviation attendue, risque de contamination des nappes à documenter."
      );
    }
    if (f.drapeaux.includes("Métal lourd - accumulation sols")) {
      out.push("Accumulation dans les sols : plafond de dose annuelle susceptible d'être imposé.");
    }
  } else {
    out.push(
      "Statut réglementaire non renseigné dans l'outil : à documenter avant dépôt (fiche d'expertise manquante)."
    );
  }

  out.push(
    "Partie I section 6 (dossier biologique) : essais d'efficacité en conditions marocaines requis — minimum 2 saisons et 2 régions. Jamais allégeable, c'est le poste le plus long."
  );
  out.push(
    "Partie II ligne 1.9 (impuretés pertinentes) : point de refus fréquent — le profil d'impuretés doit être équivalent à celui de la source de référence."
  );

  if (voie === "me_too") {
    out.push(
      "Recevabilité de la référence : l'ONSSA vérifiera l'équivalence au produit déjà homologué (même matière active, même teneur, formulation comparable). Tout écart de formulation bascule le dossier en complet."
    );
  }
  if (type === "renouvellement") {
    out.push(
      "Renouvellement : historique de commercialisation et données de pharmacovigilance phytosanitaire à joindre."
    );
  }
  return out;
}

export interface OptionsDossier {
  /** Détenteur pour lequel le dossier est monté. */
  detenteurId?: string;
  type?: TypeDossier;
  fournisseur?: Fournisseur | null;
  produit?: ProduitPortefeuille | null;
  produitNom?: string;
  origine?: string;
}

/** Génère un dossier ONSSA pré-rempli pour une matière active donnée. */
export function genererDossier(maId: string, opts: OptionsDossier = {}): DossierGenere | null {
  const ma = getMatiere(maId, opts.detenteurId);
  if (!ma) return null;

  const c = candidat(ma);
  const voie = c.voie;
  const type = opts.type ?? "nouvelle_homologation";
  const produit = opts.produit ?? ma.produitsDetenteur[0] ?? null;
  const fournisseur =
    opts.fournisseur ?? c.fournisseursCoutFaible[0] ?? c.fournisseurs[0] ?? null;

  const pieces: PieceDossier[] = [];
  for (const partie of CHECKLIST_ONSSA) {
    for (const section of partie.sections) {
      for (const item of section.items) {
        pieces.push(enPiece(item, section, partie.code, voie, ma, produit, fournisseur));
      }
    }
  }

  return {
    id: `GEN-${ma.id}`,
    produitNom: opts.produitNom ?? produit?.nomCommercial ?? `${ma.molecule} — projet`,
    matiereActiveId: ma.id,
    type,
    statut: "brouillon",
    origine: opts.origine ?? "Généré depuis la prospection",
    pieces,
    voie,
    fournisseur,
    usagesVises: usagesRevendicables(ma),
    objections: objections(ma, voie, type),
    aFournirParFournisseur: pieces
      .filter((x) => x.responsable === "fournisseur")
      .map((x) => x.libelle ?? x.rubrique),
  };
}

/** Dossier de renouvellement pour un produit du portefeuille dont l'AMM expire. */
export function genererRenouvellement(p: ProduitPortefeuille): DossierGenere | null {
  const maId = p.matieresActivesIds[0];
  if (!maId) return null;
  return genererDossier(maId, {
    type: "renouvellement",
    produit: p,
    produitNom: p.nomCommercial,
    origine: `AMM ${p.amm ?? "—"} — échéance ${fmtDate(p.expiration)}`,
  });
}

/** Charge de travail : répartition des lignes par responsable. */
export function chargeParResponsable(d: Dossier): [Responsable | "non attribué", number][] {
  const m = new Map<Responsable | "non attribué", number>();
  for (const p of d.pieces) {
    const k = (p.responsable ?? "non attribué") as Responsable | "non attribué";
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

/** Part du dossier allégeable par référence, pondérée par la charge des lignes. */
export function partAllegeable(d: DossierGenere): number {
  const total = d.pieces.reduce((s, p) => s + p.poids, 0);
  const allege = d.pieces.filter((p) => p.allegeable).reduce((s, p) => s + p.poids, 0);
  return total ? Math.round((allege / total) * 100) : 0;
}

export interface StatsDossier {
  nbLignes: number;
  nbGLP: number;
  nbAllegeables: number;
  nbNonAllegeables: number;
}

export function statsDossier(d: DossierGenere): StatsDossier {
  return {
    nbLignes: d.pieces.length,
    nbGLP: d.pieces.filter((p) => p.glp).length,
    nbAllegeables: d.pieces.filter((p) => p.allegeable).length,
    nbNonAllegeables: d.pieces.filter((p) => !p.allegeable).length,
  };
}

/** Regroupe les pièces par partie puis par section, pour l'affichage. */
export function parSection(d: DossierGenere) {
  const parties = new Map<string, Map<string, PieceDossier[]>>();
  for (const p of d.pieces) {
    const cle = p.partie ?? "I";
    if (!parties.has(cle)) parties.set(cle, new Map());
    const sections = parties.get(cle)!;
    const s = p.section ?? "—";
    if (!sections.has(s)) sections.set(s, []);
    sections.get(s)!.push(p);
  }
  return [...parties.entries()].map(([partie, sections]) => ({
    partie,
    titre: CHECKLIST_ONSSA.find((x) => x.code === partie)?.titre ?? "",
    sections: [...sections.entries()].map(([titre, pieces]) => ({ titre, pieces })),
  }));
}

export const NB_LIGNES_CHECKLIST = TOUS_ITEMS.length;

// La recherche de remplaçants vit dans lib/substitution.ts : elle sert au
// radar, au plan de dossiers et à la fiche d'une matière, pas seulement ici.
