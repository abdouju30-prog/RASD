// ────────────────────────────────────────────────────────────────────────────
// NORMALISATION DE TEXTE — source unique, partagée par les modules lib/*.
//
// La même chaîne (NFKD → suppression des diacritiques → minuscules → réduction
// des suites non alphanumériques) était réécrite à l'identique dans plusieurs
// modules. Elle est centralisée ici. Les rares variantes de comportement sont
// exposées par options, sans perte :
//   • turc     : mappe İ/ı du registre BKÜ turc avant NFKD (sinon « İ » ne se
//                réduit pas correctement).
//   • collapse : réduit toute suite non alphanumérique en un espace (défaut).
//                À passer à false pour ne garder que le strip diacritiques +
//                minuscules (recherche plein texte qui conserve la ponctuation).
// ────────────────────────────────────────────────────────────────────────────

export function normaliser(
  s: string,
  opts: { turc?: boolean; collapse?: boolean } = {}
): string {
  const { turc = false, collapse = true } = opts;
  let t = s;
  if (turc) t = t.replace(/İ/g, "I").replace(/ı/g, "i");
  t = t
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (collapse) t = t.replace(/[^a-z0-9]+/g, " ");
  return t.trim();
}
