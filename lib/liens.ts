import { MATIERES } from "./data";
import { base, molecules } from "./formulation";

// ────────────────────────────────────────────────────────────────────────────
// RETROUVER LA FICHE D'UNE MOLÉCULE À PARTIR DE SON NOM
//
// Les écrans citent des molécules sous des graphies différentes — « 2,4-D » ici,
// « 2,4-D -sel d'amine » là, « Azoxystrobin » côté registre étranger. Ce module
// ramène chacune à une ligne d'index, ou à rien.
//
// ⚠️ ON PRÉFÈRE LA LIGNE PURE. Cliquer sur « azoxystrobine » doit ouvrir la
// fiche de l'azoxystrobine seule, pas celle du mélange où elle apparaît. À
// pureté égale, la ligne qui porte le plus de produits gagne : c'est la plus
// représentative.
//
// ⚠️ AUCUN LIEN INVENTÉ. Un nom qui ne correspond à aucune ligne ne produit
// pas de lien — les molécules de la sentinelle, absentes du Maroc par
// définition, n'ont pas de fiche et ne doivent pas faire croire le contraire.
// ────────────────────────────────────────────────────────────────────────────

function normaliser(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Radicaux des mots d'un nom : le « e » final tombe, comme dans lib/requete.ts. */
function radicaux(s: string): string[] {
  return normaliser(s)
    .split(" ")
    .filter((m) => m.length >= 4)
    .map((m) => m.replace(/e$/, ""));
}

/** Le nom entier, réduit — « Emamectin benzoate » -> « emamectin benzoat ». */
function radical(s: string): string {
  return radicaux(s).join(" ");
}

const INDEX = new Map<string, string>();
const PAR_RADICAL = new Map<string, string>();

(() => {
  // Chaque molécule pointe vers la meilleure ligne qui la porte.
  const par = new Map<string, { id: string; pure: boolean; nb: number }>();
  for (const ma of MATIERES) {
    const comp = molecules(ma.nom, ma.molecule);
    const pure = comp.length === 1;
    for (const mol of comp) {
      const cle = normaliser(mol);
      const actuel = par.get(cle);
      const mieux =
        !actuel ||
        (pure && !actuel.pure) ||
        (pure === actuel.pure && ma.produits.length > actuel.nb);
      if (mieux) par.set(cle, { id: ma.id, pure, nb: ma.produits.length });
    }
  }
  for (const [cle, v] of par) {
    INDEX.set(cle, v.id);
    // ⚠️ CHAQUE MOT EST INDEXÉ, PAS SEULEMENT LE NOM ENTIER. L'index écrit
    // « Emamectin benzoate » ; on tape « emamectine ». Sans le mot seul, le
    // rapprochement échouait sur toute une famille de sels et d'esters.
    const r = radical(cle);
    if (r && !PAR_RADICAL.has(r)) PAR_RADICAL.set(r, v.id);
    for (const mot of radicaux(cle)) {
      if (!PAR_RADICAL.has(mot)) PAR_RADICAL.set(mot, v.id);
    }
  }
})();

/**
 * Identifiant de la fiche d'une molécule, ou null.
 *
 * Trois passes, de la plus sûre à la plus permissive : le nom tel quel, le nom
 * débarrassé de son sel ou de son ester, puis le radical — qui réunit
 * « emamectine » et « Emamectin benzoate ».
 */
export function idMatiere(nom: string | null | undefined): string | null {
  const n = (nom ?? "").trim();
  if (n.length < 3) return null;
  return (
    INDEX.get(normaliser(n)) ??
    INDEX.get(normaliser(base(n))) ??
    PAR_RADICAL.get(radical(n)) ??
    // Dernier recours : un mot unique, s'il suffit à désigner la molécule.
    (radicaux(n).length === 1 ? PAR_RADICAL.get(radicaux(n)[0]) ?? null : null) ??
    null
  );
}

/** La molécule est-elle homologuée au Maroc ? */
export function auMaroc(nom: string | null | undefined): boolean {
  return idMatiere(nom) !== null;
}
