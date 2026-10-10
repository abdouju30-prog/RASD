import journalFile from "../data/onssa-journal.json";
import usinesFile from "../data/icama-nouveautes.json";
import { TEXTES_ONSSA, dateAffichee } from "./onssa-reglementation";
import { MATIERES_ICAMA, anglaisDe } from "./icama";

// ────────────────────────────────────────────────────────────────────────────
// Actualités du mois : tout ce que les relevés ont constaté, regroupé par mois.
//
//   index ONSSA       data/onssa-journal.json (nouveaux, sortis, échéances, usages)
//   textes ONSSA      data/onssa-reglementation.json (date de mise en ligne)
//   usines chinoises  data/icama-nouveautes.json
//
// Rien n'est rédigé à la main : chaque ligne renvoie à un relevé daté.
// ────────────────────────────────────────────────────────────────────────────

export interface EvenementIndex {
  date: string;
  type: "nouveau" | "sorti" | "échéance" | "usages" | "renommé";
  produit: string;
  nomCommercial: string;
  detenteurId: string;
  detenteur: string;
  matieres: string[];
  detail: string;
  reserve?: string;
}

export const JOURNAL: EvenementIndex[] = journalFile.evenements as EvenementIndex[];

/** Historique d'un produit de l'index, le plus récent d'abord. */
export function historiqueProduit(id: string): EvenementIndex[] {
  return JOURNAL.filter((e) => e.produit === id);
}

export interface Mois {
  cle: string; // AAAA-MM
  libelle: string; // « octobre 2026 »
  index: EvenementIndex[];
  textes: typeof TEXTES_ONSSA;
  usines: { date: string; molecule: string; nom: string; usine: boolean }[];
}

const NOMS_MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août",
  "septembre", "octobre", "novembre", "décembre"];

function libelleMois(cle: string): string {
  const [a, m] = cle.split("-");
  return `${NOMS_MOIS[Number(m) - 1]} ${a}`;
}

export function actualitesParMois(nbMois = 6): Mois[] {
  const parMois = new Map<string, Mois>();
  const mois = (date: string) => {
    const cle = date.slice(0, 7);
    let m = parMois.get(cle);
    if (!m) {
      m = { cle, libelle: libelleMois(cle), index: [], textes: [], usines: [] };
      parMois.set(cle, m);
    }
    return m;
  };
  for (const e of JOURNAL) mois(e.date).index.push(e);
  for (const t of TEXTES_ONSSA) {
    const d = dateAffichee(t);
    if (d) mois(d).textes.push(t);
  }
  for (const u of usinesFile.evenements as { date: string; iso: string; societe: string; usine: boolean }[]) {
    const s = MATIERES_ICAMA.find((m) => m.iso === u.iso)?.societes.find((x) => x.nom === u.societe);
    mois(u.date).usines.push({
      date: u.date,
      molecule: u.iso.charAt(0) + u.iso.slice(1).toLowerCase(),
      nom: anglaisDe(u.societe)?.nomAnglais || s?.glose || s?.latin || u.societe,
      usine: u.usine,
    });
  }
  return [...parMois.values()].sort((a, b) => b.cle.localeCompare(a.cle)).slice(0, nbMois);
}

/** Texte prêt à publier (LinkedIn, courriel) pour un mois. */
export function texteAPublier(m: Mois): string {
  const nouveaux = m.index.filter((e) => e.type === "nouveau");
  const sortis = m.index.filter((e) => e.type === "sorti");
  const echeances = m.index.filter((e) => e.type === "échéance");
  const usages = m.index.filter((e) => e.type === "usages");
  const renommes = m.index.filter((e) => e.type === "renommé");
  const l: string[] = [`Homologations phytosanitaires au Maroc — ${m.libelle}`, ""];
  const liste = (es: EvenementIndex[]) =>
    es.slice(0, 8).map((e) => `${e.nomCommercial} (${e.detenteur}${e.matieres[0] ? `, ${e.matieres[0]}` : ""})`).join(" ; ") +
    (es.length > 8 ? ` … et ${es.length - 8} autres` : "");
  if (nouveaux.length) l.push(`• ${nouveaux.length} nouveau(x) produit(s) à l'index ONSSA : ${liste(nouveaux)}`);
  if (sortis.length) l.push(`• ${sortis.length} produit(s) sorti(s) de l'index : ${liste(sortis)}`);
  if (echeances.length) l.push(`• ${echeances.length} échéance(s) d'AMM modifiée(s) : ${liste(echeances)}`);
  if (renommes.length) l.push(`• ${renommes.length} changement(s) de nom commercial : ${renommes.map((e) => e.detail).join(" ; ")}`);
  if (usages.length) l.push(`• ${usages.length} produit(s) dont les usages ont changé : ${liste(usages)}`);
  if (m.textes.length) l.push(`• ${m.textes.length} texte(s) publié(s) par l'ONSSA : ${m.textes.slice(0, 3).map((t) => t.titre).join(" ; ")}`);
  if (m.usines.length) l.push(`• ${m.usines.length} nouvelle(s) homologation(s) de matière technique en Chine (ICAMA)`);
  l.push("", "Sources : index phytosanitaire ONSSA (IndPesticide), textes ONSSA, registre chinois ICAMA.");
  return l.join("\n");
}
