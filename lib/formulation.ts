// ────────────────────────────────────────────────────────────────────────────
// LIRE UNE FORMULATION — la règle unique de découpage
//
// L'index ONSSA ne nomme pas des molécules, il nomme des formulations :
//
//     « Mandipropamide(250 g/kg) / Cymoxanil(180 g/kg) »
//     « Azoxystrobine(7.3%w/w (90.4 g/l)) / Folpel(39.1%w/w(484 g/l)) »
//
// 212 de ses 653 lignes sont des mélanges. Toute analyse qui lit le champ
// « molecule » — lequel ne retient que le PREMIER composant — perd 46 matières
// actives, dont le flufénacet, le MCPA et le pyroxsulame. D'où ce module :
// une seule règle, appelée par la gamme comme par les mélanges.
//
// ⚠️ LES PARENTHÈSES S'IMBRIQUENT. Une expression régulière naïve
// « \([^)]*\) » s'arrête à la première fermante et laisse traîner un « ) »
// orphelin : l'association « Azoxystrobine + Folpel » sortait sous
// « Azoxystrobine ) + Folpel ) ». On dépile donc avec un compteur.
//
// ⚠️ LA TENEUR CONTIENT UN « / ». « 90.4 g/l » : découper avant d'avoir retiré
// les teneurs inventerait une matière active « l ».
// ────────────────────────────────────────────────────────────────────────────

/** Retire tout ce qui est entre parenthèses, à quelque profondeur que ce soit. */
export function sansTeneurs(nom: string): string {
  let out = "";
  let profondeur = 0;
  for (const c of nom) {
    if (c === "(") profondeur += 1;
    else if (c === ")") {
      // Une fermante sans ouvrante : l'index en contient. On l'efface.
      if (profondeur > 0) profondeur -= 1;
      else out += " ";
    } else if (profondeur === 0) out += c;
  }
  return out;
}

/**
 * Matières actives d'une ligne d'index.
 *
 *     « Mandipropamide(250 g/kg) / Cymoxanil(180 g/kg) »
 *         -> ["Mandipropamide", "Cymoxanil"]
 *
 * `repli` sert quand le découpage ne donne rien d'exploitable — le champ
 * « molecule » de l'index, qui vaut mieux que rien.
 */
export function composants(nom: string, repli?: string): string[] {
  const parts = sansTeneurs(nom)
    .split("/")
    .map((x) => x.trim().replace(/^[-–,;\s]+/, "").replace(/[-–,;\s]+$/, ""))
    .filter((x) => x.length >= 4);
  const uniques = [...new Set(parts)];
  if (uniques.length) return uniques;
  const r = (repli ?? nom).trim();
  return r ? [r] : [];
}

/**
 * Nom commercial d'une matière active : le sel ou l'ester tombe.
 *
 *     « 2,4-D -sel d'amine »        -> « 2,4-D »
 *     « 2,4-D -ester isoctylique »  -> « 2,4-D »
 *
 * ⚠️ REGROUPEMENT COMMERCIAL, JAMAIS RÉGLEMENTAIRE. Le 2,4-D existe à l'index
 * sous cinq graphies, soit 39 produits éclatés en cinq molécules apparemment
 * mineures. Pour savoir si une société a une offre 2,4-D, c'en est une seule ;
 * pour un dossier ONSSA, ce sont cinq identités distinctes. Cette fonction ne
 * sert donc qu'aux écrans d'analyse — jamais à un appariement de registre, où
 * seule la clé chimique de scripts/_chimie.py fait foi.
 */
export function base(nom: string): string {
  return nom
    .replace(/\s*-\s*(sels?|esters?)\b.*$/i, "")
    .replace(/\s*-\s*(2-éthylhexyl|éthylhexyl|isoctylique)\b.*$/i, "")
    .trim();
}

/** Matières actives d'une ligne, sels regroupés — la lecture d'analyse. */
export function molecules(nom: string, repli?: string): string[] {
  return [...new Set(composants(nom, repli).map(base).filter(Boolean))];
}
