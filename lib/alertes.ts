import { getMatiere, matieresDuPortefeuille, produitsDe } from "./data";
import { etatAMM, fmtDate, moisAvant } from "./logic";
import { restreintePourMatiere, retireePourMatiere } from "./onssa-listes";
import type { MatiereActive, NiveauRisque, ProduitPortefeuille } from "./types";

// ────────────────────────────────────────────────────────────────────────────
// Les alertes ne sont PAS un flux stocké : elles sont recalculées à chaque
// affichage à partir de l'index ONSSA (dates d'AMM), des fiches vérifiées
// (statuts UE) et des listes officielles de retraits / restrictions. Il n'y
// a donc rien à persister. Une molécule encore à l'Excel alors que l'ONSSA
// la dit retirée est une incohérence de source, pas une AMM inventée.
//
// La veille reste une opération humaine : réimporter l'index quand l'ONSSA
// publie une nouvelle version Excel, et relire les PDF via le cron du jeudi.
// ────────────────────────────────────────────────────────────────────────────

export type TypeAlerte =
  | "onssa_retrait"
  | "anses_retrait"
  | "amm_expiree"
  | "amm_echeance"
  | "ue_non_renouvelee"
  | "ue_echeance_depassee"
  | "ue_echeance_proche"
  | "onssa_restriction"
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
  onssa_retrait: "critique",
  anses_retrait: "critique",
  amm_expiree: "critique",
  ue_non_renouvelee: "critique",
  onssa_restriction: "élevé",
  ue_echeance_depassee: "élevé",
  amm_echeance: "élevé",
  ue_echeance_proche: "modéré",
  candidate_substitution: "modéré",
};

const ORDRE: Record<NiveauRisque, number> = { critique: 0, élevé: 1, modéré: 2, faible: 3 };

/**
 * Priorité de type, à niveau de gravité égal. Un retrait ONSSA déjà publié
 * passe devant le signal ANSES : c'est la décision marocaine, pas l'anticipation.
 */
const ORDRE_TYPE: Record<TypeAlerte, number> = {
  onssa_retrait: 0,
  anses_retrait: 1,
  amm_expiree: 2,
  ue_non_renouvelee: 3,
  onssa_restriction: 4,
  ue_echeance_depassee: 5,
  amm_echeance: 6,
  ue_echeance_proche: 7,
  candidate_substitution: 8,
};

function nbUsages(prods: ProduitPortefeuille[]): number {
  return prods.reduce((s, p) => s + p.usages.length, 0);
}

/** Produits du détenteur courant portant cette matière active. */
function produitsPortant(ma: MatiereActive): ProduitPortefeuille[] {
  return ma.produitsDetenteur;
}

function grouperPortefeuille<T extends { nom: string }>(
  detenteurId: string,
  signal: (ma: MatiereActive) => T | null
): { liste: T; ma: MatiereActive; produits: ProduitPortefeuille[] }[] {
  const map = new Map<string, { liste: T; mas: MatiereActive[]; produits: ProduitPortefeuille[] }>();
  for (const ma of matieresDuPortefeuille(detenteurId)) {
    const liste = signal(ma);
    if (!liste) continue;
    let g = map.get(liste.nom);
    if (!g) {
      g = { liste, mas: [], produits: [] };
      map.set(liste.nom, g);
    }
    g.mas.push(ma);
    g.produits.push(...produitsPortant(ma));
  }
  const out: { liste: T; ma: MatiereActive; produits: ProduitPortefeuille[] }[] = [];
  for (const g of map.values()) {
    const vu = new Set<string>();
    const produits = g.produits.filter((p) => {
      if (vu.has(p.id)) return false;
      vu.add(p.id);
      return true;
    });
    const ma = [...g.mas].sort((a, b) => b.produitsDetenteur.length - a.produitsDetenteur.length)[0];
    if (!ma) continue;
    out.push({ liste: g.liste, ma, produits });
  }
  return out;
}

export function alertes(detenteurId: string): Alerte[] {
  const out: Alerte[] = [];

  // 0) Listes ONSSA opérationnelles — décision marocaine, pas anticipation.
  for (const g of grouperPortefeuille(detenteurId, retireePourMatiere)) {
    const r = g.liste;
    out.push({
      id: `onssa-ret-${g.ma.id}`,
      type: "onssa_retrait",
      niveau: NIV.onssa_retrait,
      titre: `Retrait ONSSA · ${r.nom}`,
      detail:
        `Liste officielle des substances retirées / interdites au Maroc` +
        (r.dateRetrait ? ` (depuis le ${fmtDate(r.dateRetrait)})` : "") +
        `. L'index Excel porte encore cette molécule : l'AMM affichée n'est pas une preuve d'homologation en vigueur.`,
      matiere: g.ma,
      produits: g.produits,
      usages: nbUsages(g.produits),
      action:
        "Recouper le PDF ONSSA. Ne pas commercialiser sur la foi de l'Excel. Sécuriser une alternative homologable.",
      echeance: r.dateRetrait,
    });
  }

  for (const g of grouperPortefeuille(detenteurId, restreintePourMatiere)) {
    const r = g.liste;
    out.push({
      id: `onssa-rest-${g.ma.id}`,
      type: "onssa_restriction",
      niveau: NIV.onssa_restriction,
      titre: `Restriction d'usage ONSSA · ${r.nom}`,
      detail:
        (r.condition || "Condition d'emploi renforcée.") +
        (r.dateRestriction ? ` Décision à jour au ${fmtDate(r.dateRestriction)}.` : ""),
      matiere: g.ma,
      produits: g.produits,
      usages: nbUsages(g.produits),
      action: "Vérifier que les usages et formulations du portefeuille respectent la restriction.",
      echeance: r.dateRestriction,
    });
  }

  // 1) AMM du portefeuille — expirées puis à échéance.
  for (const p of produitsDe(detenteurId)) {
    const { etat, mois } = etatAMM(p);
    const ma = p.matieresActivesIds.map((i) => getMatiere(i, detenteurId)).find(Boolean) ?? null;

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

  // 2) Statut ANSES et statut UE des matières actives réellement détenues.
  for (const ma of matieresDuPortefeuille(detenteurId)) {
    const f = ma.fiche;
    const prods = produitsPortant(ma);
    if (prods.length === 0) continue;

    // Signal de tête : l'ONSSA s'aligne sur l'ANSES.
    const an = ma.anses;
    if (an?.statut === "retirée" || an?.statut === "en_retrait") {
      const retiree = an.statut === "retirée";
      out.push({
        id: `anses-${ma.id}`,
        type: "anses_retrait",
        niveau: retiree ? "critique" : "élevé",
        titre: `${retiree ? "Plus autorisée" : "Aucun produit autorisé"} en France · ${ma.nom}`,
        detail:
          (an.deduit
            ? "Statut déduit : la substance n'est pas approuvée au niveau UE, elle ne peut donc pas être autorisée en France. "
            : `${an.source ?? ""} `) +
          "L'ONSSA s'alignant sur l'ANSES, le retrait marocain est à considérer comme acquis à terme — c'est le signal le plus en avance dont vous disposez.",
        matiere: ma,
        produits: prods,
        usages: nbUsages(prods),
        action: retiree
          ? "Traiter en priorité absolue : sécuriser une alternative homologable avant l'alignement de l'ONSSA."
          : "Surveiller : retrait commercial en France, pas encore réglementaire. Préparer une alternative.",
        echeance: an.finEcoulement ?? an.dateRetrait ?? null,
      });
    }

    if (!f || f.statutUE === "inconnu") continue;

    if (f.statutUE === "non_renouvelée" || f.statutUE === "retirée") {
      out.push({
        id: `ue-nr-${ma.id}`,
        type: "ue_non_renouvelee",
        niveau: "critique",
        titre: `Approbation UE perdue · ${ma.nom}`,
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
        titre: `Échéance UE dépassée · ${ma.nom}`,
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
        titre: `Échéance UE proche · ${ma.nom}`,
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
        titre: `Candidate à la substitution · ${ma.nom}`,
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
    const n = ORDRE[a.niveau] - ORDRE[b.niveau];
    if (n !== 0) return n;
    const t = ORDRE_TYPE[a.type] - ORDRE_TYPE[b.type];
    if (t !== 0) return t;
    return (a.echeance ?? "9999").localeCompare(b.echeance ?? "9999");
  });
}

export function statsAlertes(detenteurId: string) {
  const a = alertes(detenteurId);
  return {
    total: a.length,
    critiques: a.filter((x) => x.niveau === "critique").length,
    eleves: a.filter((x) => x.niveau === "élevé").length,
    produitsTouches: new Set(a.flatMap((x) => x.produits.map((p) => p.id))).size,
    usagesTouches: a.reduce((s, x) => s + x.usages, 0),
  };
}

/** Matières actives du portefeuille sans aucun statut exploitable (ni UE, ni ANSES). */
export function anglesMorts(detenteurId: string): MatiereActive[] {
  return matieresDuPortefeuille(detenteurId).filter(
    (m) =>
      (!m.anses || m.anses.statut === "inconnu") &&
      (!m.fiche || m.fiche.statutUE === "inconnu")
  );
}
