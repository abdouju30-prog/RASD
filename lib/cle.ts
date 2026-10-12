// Clé d'une raison sociale : sans accents, ponctuation ni forme sociale.
// « Nufarm S.A.S. » et « NUFARM SAS » donnent la même clé « nufarm ».

export const FORMES = new Set(["co", "ltd", "limited", "inc", "incorporated", "corp", "corporation", "company",
  "sa", "sas", "s", "a", "ltda", "gmbh", "ag", "bv", "nv", "pvt", "private", "pty", "plc", "llc", "srl",
  "spa", "kg", "jsc", "ooo", "zao", "oao", "pjsc", "the", "and", "de", "cv", "sl", "sac", "sae", "kft",
  "sro", "as", "ab", "oy", "lda", "cia", "cie", "et", "eirl", "sdn", "bhd", "tbk", "pte"]);

export function cleFabricant(nom: string): string {
  const mots = nom
    .normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/\(.*?\)/g, " ").replace(/[^a-z0-9]+/g, " ").trim().split(" ")
    .filter((m) => m && !FORMES.has(m));
  return mots.join(" ");
}
