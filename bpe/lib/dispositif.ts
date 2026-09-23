export interface SchemaEssai {
  id: string;
  titre: string;
  blocs: string[][];
}

export const SCHEMAS: SchemaEssai[] = [
  {
    id: "complet",
    titre: "Témoin, référence, 2 modalités",
    blocs: [
      ["T0", "E1", "R", "E2"],
      ["E2", "T0", "E1", "R"],
      ["R", "E2", "T0", "E1"],
      ["E1", "R", "E2", "T0"],
    ],
  },
  {
    id: "sans-reference",
    titre: "Témoin et 2 modalités",
    blocs: [
      ["T0", "E1", "E2"],
      ["E2", "T0", "E1"],
      ["E1", "E2", "T0"],
      ["T0", "E2", "E1"],
    ],
  },
  {
    id: "une-modalite",
    titre: "Témoin et 1 modalité",
    blocs: [
      ["T0", "E1"],
      ["E1", "T0"],
      ["T0", "E1"],
      ["E1", "T0"],
    ],
  },
];

export const CODES = ["T0", "R", "E1", "E2", "E3"];

export const EXPLICATIONS: { code: string; texte: string }[] = [
  { code: "Bloc", texte: "Une répétition. Les modalités y sont réparties." },
  { code: "Parcelle", texte: "Une case. Le numéro de parcelle s'écrit au champ." },
  { code: "T0", texte: "Témoin non traité. Il sert à lire l'efficacité." },
  { code: "R", texte: "Référence, seulement si un emploi existe déjà." },
  { code: "E1", texte: "Première modalité d'essai." },
  { code: "E2", texte: "Deuxième modalité d'essai." },
  { code: "E3", texte: "Modalité ajoutée dans une case." },
];

export function coderPlan(blocs: string[][]): string {
  return blocs.map((ligne) => ligne.join(".")).join("|");
}

export function decoderPlan(plan: string | undefined): string[][] {
  const blocs = (plan ?? "")
    .split("|")
    .map((ligne) => ligne.split(".").filter((code) => CODES.includes(code)))
    .filter((ligne) => ligne.length > 0)
    .slice(0, 8);
  return blocs.length ? blocs : SCHEMAS[0].blocs.map((ligne) => [...ligne]);
}

export function codesANoter(plan: string | undefined): string[] {
  const presents = new Set(decoderPlan(plan).flat());
  const ordre = ["T0", "E1", "E2", "E3", "R"];
  const codes = ordre.filter((code) => presents.has(code));
  return codes.length ? codes : ["T0", "E1"];
}

export function schemaDuPlan(blocs: string[][]): string {
  const code = coderPlan(blocs);
  return SCHEMAS.find((s) => coderPlan(s.blocs) === code)?.id ?? "";
}

export function ajouterBloc(blocs: string[][]): string[][] {
  if (blocs.length >= 8) return blocs;
  const largeur = blocs[0]?.length ?? 2;
  const source = blocs[blocs.length - 1] ?? ["T0", "E1"];
  const ligne =
    source.length === largeur
      ? [...source.slice(1), source[0]]
      : Array.from({ length: largeur }, (_, i) => source[i] ?? "T0");
  return [...blocs, ligne];
}

export function retirerBloc(blocs: string[][], index: number): string[][] {
  if (blocs.length <= 1) return blocs;
  return blocs.filter((_, i) => i !== index);
}

export function modifierCase(blocs: string[][], bloc: number, parcelle: number, code: string): string[][] {
  if (!CODES.includes(code)) return blocs;
  return blocs.map((ligne, i) => (i === bloc ? ligne.map((c, j) => (j === parcelle ? code : c)) : ligne));
}
