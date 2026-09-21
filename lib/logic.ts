import { CA_RENSEIGNE, matieresDuPortefeuille, produitsDe, usagesDetenteur } from "./data";
import { restreintePourMatiere, retireePourMatiere } from "./onssa-listes";
import type { MatiereActive, NiveauRisque, ProduitPortefeuille } from "./types";

/** Date de référence du système. Recalculée à chaque rendu. */
export function aujourdhui(): Date {
  return new Date();
}

export function moisAvant(dateISO?: string | null, ref = aujourdhui()): number | null {
  if (!dateISO) return null;
  const d = new Date(dateISO);
  if (Number.isNaN(d.getTime())) return null;
  return Math.round((d.getTime() - ref.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
}

export function joursAvant(dateISO?: string | null, ref = aujourdhui()): number | null {
  if (!dateISO) return null;
  const d = new Date(dateISO);
  if (Number.isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - ref.getTime()) / (1000 * 60 * 60 * 24));
}

export function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// ── Risque réglementaire ────────────────────────────────────────────────────
// Heuristique volontairement lisible : chaque signal ajoute des points, la
// contribution de chacun est affichée dans l'interface pour être auditable.
// Retourne null quand aucune fiche vérifiée n'existe : on n'invente pas un
// score sur une molécule dont le statut UE est inconnu.

export interface DetailRisque {
  score: number;
  niveau: NiveauRisque;
  facteurs: { libelle: string; points: number }[];
}

export function detailRisque(ma: MatiereActive): DetailRisque | null {
  const f = ma.fiche;
  const anses = ma.anses;
  const ansesConnu = anses && anses.statut !== "inconnu";
  const retraitOnssa = retireePourMatiere(ma);
  const restrictionOnssa = restreintePourMatiere(ma);

  // Liste officielle des retraits : plus récente que l'index. Si les deux
  // se contredisent, on ne corrige pas l'index — on note 100.
  if (retraitOnssa) {
    return {
      score: 100,
      niveau: "critique",
      facteurs: [
        {
          libelle: retraitOnssa.dateRetrait
            ? `Retirée ONSSA depuis le ${fmtDate(retraitOnssa.dateRetrait)} — encore à l'index`
            : "Retirée ONSSA — encore à l'index",
          points: 100,
        },
      ],
    };
  }

  // Un statut ANSES connu suffit à évaluer le risque, même sans fiche UE :
  // c'est le signal qui gouverne l'ONSSA. Il est lu dans E-Phy pour toute
  // molécule appariable, donc pour la quasi-totalité de l'index.
  if (!ansesConnu && (!f || f.statutUE === "inconnu") && !restrictionOnssa) return null;

  const fa: { libelle: string; points: number }[] = [];
  const add = (libelle: string, points: number) => {
    if (points > 0) fa.push({ libelle, points });
  };

  if (restrictionOnssa) {
    add(
      restrictionOnssa.dateRestriction
        ? `Restriction d'usage ONSSA (${fmtDate(restrictionOnssa.dateRestriction)})`
        : "Restriction d'usage ONSSA",
      40
    );
  }

  if (f?.statutMaroc === "retirée") {
    return {
      score: 100,
      niveau: "critique",
      facteurs: [{ libelle: "Retirée au Maroc", points: 100 }],
    };
  }

  // Signal de tête : l'ONSSA s'aligne sur l'ANSES. Un retrait français
  // annonce le retrait marocain, il pèse donc plus lourd que le statut UE.
  if (anses?.statut === "retirée") {
    add(
      anses.deduit
        ? "Retrait ANSES déduit (non approuvée UE) — retrait ONSSA attendu"
        : "Plus autorisée en France (E-Phy) — retrait ONSSA attendu",
      55
    );
  } else if (anses?.statut === "en_retrait") {
    // Retrait commercial : la substance reste inscrite mais aucun produit
    // français n'est autorisé. Signal réel, mais l'ONSSA ne suit pas
    // mécaniquement un retrait commercial — pondération plus basse.
    add("Aucun produit autorisé en France (retrait commercial)", 30);
  }

  if (!f) {
    const score0 = Math.min(100, fa.reduce((s, x) => s + x.points, 0));
    return { score: score0, niveau: niveauRisque(score0), facteurs: fa };
  }

  if (f.statutUE === "retirée") add("Approbation UE retirée", 45);
  else if (f.statutUE === "non_renouvelée") add("Approbation UE non renouvelée", 42);
  else if (f.statutUE === "en_réexamen") add("En réexamen UE", 22);

  if (f.statutUE === "approuvée") {
    const m = moisAvant(f.echeanceUE);
    if (m !== null) {
      if (m < 0) add(`Échéance UE dépassée (${fmtDate(f.echeanceUE)}) — à recouper`, 30);
      else if (m <= 6) add(`Échéance UE dans ${m} mois`, 20);
      else if (m <= 12) add(`Échéance UE dans ${m} mois`, 14);
      else if (m <= 24) add(`Échéance UE dans ${m} mois`, 8);
    }
  }

  const interdits = f.statutVoisins.filter((v) => v.statut === "interdite").length;
  const restreints = f.statutVoisins.filter((v) => v.statut === "restreinte").length;
  add(`${interdits} marché(s) de référence interdisant`, interdits * 12);
  add(`${restreints} marché(s) de référence restreignant`, restreints * 6);

  const P: Record<string, number> = {
    "Perturbateur endocrinien": 14,
    "Candidate substitution": 12,
    "Classé cancérogène suspecté": 12,
    "Neurotoxique": 8,
    "Néonicotinoïde": 8,
    "Sous pression sociétale": 10,
    "Toxique abeilles": 6,
    "Métal lourd - accumulation sols": 6,
    "Contaminant eaux souterraines": 6,
    "Effets reproduction": 5,
    "Persistance environnementale": 4,
  };
  for (const d of f.drapeaux) add(d, P[d] ?? 4);

  const score = Math.min(100, fa.reduce((s, x) => s + x.points, 0));
  return { score, niveau: niveauRisque(score), facteurs: fa.sort((a, b) => b.points - a.points) };
}

export function scoreRisque(ma: MatiereActive): number | null {
  return detailRisque(ma)?.score ?? null;
}

export function niveauRisque(score: number): NiveauRisque {
  if (score >= 75) return "critique";
  if (score >= 55) return "élevé";
  if (score >= 30) return "modéré";
  return "faible";
}

export function riskColorVar(n: NiveauRisque | null): string {
  return n === "critique"
    ? "var(--crit)"
    : n === "élevé"
    ? "var(--high)"
    : n === "modéré"
    ? "var(--mod)"
    : n === "faible"
    ? "var(--low)"
    : "var(--muted)";
}

// ── Exposition du portefeuille ──────────────────────────────────────────────
// L'index ONSSA ne contient aucun chiffre d'affaires. L'exposition se mesure
// donc en produits / usages / homologations. Le CA n'entre en jeu que s'il a
// été saisi dans data/ca.json.

export interface Exposition {
  produits: number;
  usages: number;
  ca: number | null;
  pctCA: number | null;
}

/**
 * `ma` doit provenir de matieresDe(detenteurId) : son champ produitsDetenteur
 * est alors déjà limité au détenteur, et l'exposition se lit directement.
 */
export function exposition(ma: MatiereActive, detenteurId: string): Exposition {
  const prods = ma.produitsDetenteur;
  const ca = prods.reduce<number | null>((s, p) => {
    if (p.caAnnuel == null) return s;
    return (s ?? 0) + p.caAnnuel;
  }, null);
  const total = caTotal(detenteurId);
  return {
    produits: prods.length,
    usages: prods.reduce((s, p) => s + p.usages.length, 0),
    ca,
    pctCA: ca != null && total ? Math.round((ca / total) * 100) : null,
  };
}

export function caTotal(detenteurId: string): number {
  return produitsDe(detenteurId).reduce((s, p) => s + (p.caAnnuel ?? 0), 0);
}

export function usagesTotal(detenteurId: string): number {
  return produitsDe(detenteurId).reduce((s, p) => s + p.usages.length, 0);
}

export function fmtMAD(v: number): string {
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1).replace(".", ",") + " M";
  if (v >= 1000) return Math.round(v / 1000) + " k";
  return String(v);
}

export const CA_DISPONIBLE = CA_RENSEIGNE;

// ── AMM ─────────────────────────────────────────────────────────────────────

export type EtatAMM = "expirée" | "critique" | "proche" | "valide" | "inconnue";

export function etatAMM(p: ProduitPortefeuille): { etat: EtatAMM; mois: number | null } {
  const m = moisAvant(p.expiration);
  if (m === null) return { etat: "inconnue", mois: null };
  if (m < 0) return { etat: "expirée", mois: m };
  if (m <= 6) return { etat: "critique", mois: m };
  if (m <= 18) return { etat: "proche", mois: m };
  return { etat: "valide", mois: m };
}

export function ammExpirees(detenteurId: string): ProduitPortefeuille[] {
  return produitsDe(detenteurId).filter((p) => etatAMM(p).etat === "expirée").sort(
    (a, b) => (a.expiration ?? "").localeCompare(b.expiration ?? "")
  );
}

export function ammEcheance(detenteurId: string, moisMax = 18): ProduitPortefeuille[] {
  return produitsDe(detenteurId).filter((p) => {
    const { etat, mois } = etatAMM(p);
    return (etat === "critique" || etat === "proche") && mois !== null && mois <= moisMax;
  }).sort((a, b) => (a.expiration ?? "").localeCompare(b.expiration ?? ""));
}

// ── Classements ─────────────────────────────────────────────────────────────

export interface MatiereClassee {
  ma: MatiereActive;
  risque: DetailRisque | null;
  expo: Exposition;
}

export function portefeuilleClasse(detenteurId: string): MatiereClassee[] {
  return matieresDuPortefeuille(detenteurId).map((ma) => ({
    ma,
    risque: detailRisque(ma),
    expo: exposition(ma, detenteurId),
  })).sort((a, b) => {
    const sa = a.risque?.score ?? -1;
    const sb = b.risque?.score ?? -1;
    if (sb !== sa) return sb - sa;
    return b.expo.usages - a.expo.usages;
  });
}
