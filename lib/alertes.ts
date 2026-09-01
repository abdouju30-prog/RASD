import { MATIERES_PORTEFEUILLE, PORTEFEUILLE, getMatiere } from "./data";
import { detailRisque, etatAMM, fmtDate, moisAvant } from "./logic";
import type { MatiereActive, NiveauRisque, ProduitPortefeuille } from "./types";

// ────────────────────────────────────────────────────────────────────────────
// Les alertes ne sont PAS un flux stocké : elles sont recalculées à chaque
// affichage à partir de l'index ONSSA (dates d'AMM) et des fiches vérifiées
// (statuts UE). Il n'y a donc rien à persister, aucun cron à faire tourner, et
// aucun risque d'afficher un état périmé.
//
// La veille reste une opération humaine : mettre à jour lib/reglementaire.ts
// puis réimporter l'index quand l'ONSSA publie une nouvelle version.
// ────────────────────────────────────────────────────────────────────────────

export type TypeAlerte =
  | "amm_expiree"
  | "amm_echeance"
  | "ue_non_renouvelee"
  | "ue_echeance_depassee"
  | "ue_echeance_proche"
  | "candidate_substitution";

export interface Alerte {
  id: string;
  type: TypeAlerte;
  niveau: NiveauRisque;
  titre: string;
  detail: string;
  matiere: MatiereActive | null;
  produits: ProduitPortefeuille[];
  usages: number;
  action: string;
  echeance: string | null;
}

const NIV: Record<TypeAlerte, NiveauRisque> = {
  amm_expiree: "critique",
  ue_non_renouvelee: "critique",
  ue_echeance_depassee: "élevé",
  amm_echeance: "élevé",
  ue_echeance_proche: "modéré",
  candidate_substitution: "modéré",
};

const ORDRE: Record<NiveauRisque, number> = { critique: 0, élevé: 1, modéré: 2, faible: 3 };

function nbUsages(prods: ProduitPortefeuille[]): number {
  return prods.reduce((s, p) => s + p.usages.length, 0);
}

function produitsDe(ma: MatiereActive): ProduitPortefeuille[] {
  return ma.produitsDetenteur;
}

export function alertes(): Alerte[] {
  const out: Alerte[] = [];

  // 1) AMM du portefeuille — expirées puis à échéance.
  for (const p of PORTEFEUILLE) {
    const { etat, mois } = etatAMM(p);
    const ma = p.matieresActivesIds.map(getMatiere).find(Boolean) ?? null;

    if (etat === "expirée") {
      out.push({
        id: `amm-exp-${p.id}`,
        type: "amm_expiree",
        niveau: "critique",
        titre: `AMM expirée · ${p.nomCommercial}`,
        detail:
          `Homologation ${p.amm ?? "—"} échue le ${fmtDate(p.expiration)}` +
          (mois !== null ? ` (il y a ${Math.abs(mois)} mois)` : "") +
          `. La commercialisation n'est plus couverte.`,
        matiere: ma,
        produits: [p],
        usages: p.usages.length,
        action: "Déposer un dossier de renouvellement — ou retirer le produit de la vente.",
        echeance: p.expiration,
      });
    } else if (etat === "critique" || etat === "proche") {
      out.push({
        id: `amm-ech-${p.id}`,
        type: "amm_echeance",
        niveau: etat === "critique" ? "élevé" : "modéré",
        titre: `AMM à échéance · ${p.nomCommercial}`,
        detail: `Homologation ${p.amm ?? "—"} valable jusqu'au ${fmtDate(p.expiration)} — ${mois} mois restants.`,
        matiere: ma,
        produits: [p],
        usages: p.usages.length,
        action:
          (mois ?? 99) <= 6
            ? "Dossier de renouvellement à déposer immédiatement."
            : "Préparer le dossier de renouvellement.",
        echeance: p.expiration,
      });
    }
  }

  // 2) Statut UE des matières actives réellement détenues.
  for (const ma of MATIERES_PORTEFEUILLE) {
    const f = ma.fiche;
    if (!f || f.statutUE === "inconnu") continue;
    const prods = produitsDe(ma);
    if (prods.length === 0) continue;

    if (f.statutUE === "non_renouvelée" || f.statutUE === "retirée") {
      out.push({
        id: `ue-nr-${ma.id}`,
        type: "ue_non_renouvelee",
        niveau: "critique",
        titre: `Approbation UE perdue · ${ma.molecule}`,
        detail: `${f.statutUE === "retirée" ? "Approbation retirée" : "Approbation non renouvelée"} en UE. ${f.note ?? ""}`.trim(),
        matiere: ma,
        produits: prods,
        usages: nbUsages(prods),
        action: "Identifier une alternative homologable et ouvrir un dossier de substitution.",
        echeance: f.echeanceUE ?? null,
      });
      continue;
    }

    const m = moisAvant(f.echeanceUE);
    if (m !== null && m < 0) {
      out.push({
        id: `ue-dep-${ma.id}`,
        type: "ue_echeance_depassee",
        niveau: "élevé",
        titre: `Échéance UE dépassée · ${ma.molecule}`,
        detail: `Date d'expiration d'approbation au ${fmtDate(f.echeanceUE)} selon la PPDB. La Commission prolonge fréquemment ces dates par règlement d'exécution : à recouper contre la EU Pesticides Database avant toute décision.`,
        matiere: ma,
        produits: prods,
        usages: nbUsages(prods),
        action: "Vérifier l'existence d'un règlement de prolongation. Sinon, préparer la substitution.",
        echeance: f.echeanceUE ?? null,
      });
    } else if (m !== null && m <= 12) {
      out.push({
        id: `ue-proche-${ma.id}`,
        type: "ue_echeance_proche",
        niveau: "modéré",
        titre: `Échéance UE proche · ${ma.molecule}`,
        detail: `Approbation UE jusqu'au ${fmtDate(f.echeanceUE)} — ${m} mois. Issue du renouvellement à surveiller.`,
        matiere: ma,
        produits: prods,
        usages: nbUsages(prods),
        action: "Surveiller la décision de renouvellement ; préparer un plan B.",
        echeance: f.echeanceUE ?? null,
      });
    }

    if (f.drapeaux.includes("Candidate substitution") && f.statutUE === "approuvée" && (m === null || m >= 0)) {
      out.push({
        id: `ue-cfs-${ma.id}`,
        type: "candidate_substitution",
        niveau: "modéré",
        titre: `Candidate à la substitution · ${ma.molecule}`,
        detail: `Inscrite sur la liste UE des candidates à la substitution. Les États membres doivent examiner s'il existe une alternative moins préoccupante — signal avancé de retrait.`,
        matiere: ma,
        produits: prods,
        usages: nbUsages(prods),
        action: "Anticiper : sécuriser une alternative avant la pression réglementaire.",
        echeance: f.echeanceUE ?? null,
      });
    }
  }

  return out.sort((a, b) => {
    const d = ORDRE[a.niveau] - ORDRE[b.niveau];
    if (d !== 0) return d;
    return (a.echeance ?? "9999").localeCompare(b.echeance ?? "9999");
  });
}

export function statsAlertes() {
  const a = alertes();
  return {
    total: a.length,
    critiques: a.filter((x) => x.niveau === "critique").length,
    eleves: a.filter((x) => x.niveau === "élevé").length,
    produitsTouches: new Set(a.flatMap((x) => x.produits.map((p) => p.id))).size,
    usagesTouches: a.reduce((s, x) => s + x.usages, 0),
  };
}

/** Matières actives du portefeuille pour lesquelles aucune fiche n'existe. */
export function anglesMorts(): MatiereActive[] {
  return MATIERES_PORTEFEUILLE.filter((m) => !m.fiche || m.fiche.statutUE === "inconnu");
}
