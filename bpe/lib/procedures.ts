export type SchemaId =
  | "question"
  | "dispositif"
  | "application"
  | "notations"
  | "cuve"
  | "bocal"
  | "doses"
  | "feuille";

export interface Etape {
  id: string;
  titre: string;
  texte: string;
  schemas: SchemaId[];
}

export const ORDRE_CUVE = [
  "Eau, aux trois quarts du volume prévu",
  "Correcteur ou conditionneur d'eau, s'il est prévu",
  "Sachets hydrosolubles, s'il y en a",
  "Formulations solides : WP, WG, SG",
  "Suspensions : SC, CS, OD",
  "Émulsions : EC, EW",
  "Adjuvants",
  "Compléter en eau sous agitation",
];

export const QUESTIONS = [
  { id: "efficacite", label: "Efficacité" },
  { id: "selectivite", label: "Sélectivité" },
  { id: "les-deux", label: "Les deux" },
] as const;

export const ETAPES: Etape[] = [
  {
    id: "question",
    titre: "Question",
    texte: "Une culture, une cible, une question.",
    schemas: ["question"],
  },
  {
    id: "dispositif",
    titre: "Dispositif",
    texte: "4 blocs. T0, R si une référence existe, E1, E2. Numéro de parcelle dans chaque case.",
    schemas: ["dispositif"],
  },
  {
    id: "doses",
    titre: "Doses",
    texte: "Recopier dose et DAR d'index. Écrire la dose appliquée au champ.",
    schemas: ["doses"],
  },
  {
    id: "melange",
    titre: "Cuve",
    texte: "Cet ordre. Bocal 15 min, eau du site. Instable : ne pas appliquer.",
    schemas: ["cuve", "bocal"],
  },
  {
    id: "application",
    titre: "Application",
    texte: "Dose, volume, buses, météo, écart.",
    schemas: ["application"],
  },
  {
    id: "notations",
    titre: "Notations",
    texte: "J0, J+n, récolte. Note brute et symptôme.",
    schemas: ["notations"],
  },
];

export const ANCIENNES: Record<string, string> = {
  cadrage: "question",
  protocole: "dispositif",
  selectivite: "doses",
  melange: "melange",
  tracabilite: "notations",
};

export function etapeParId(id: string | undefined): Etape {
  return ETAPES.find((e) => e.id === id) ?? ETAPES[0];
}

export function questionParId(id: string | undefined): (typeof QUESTIONS)[number] | undefined {
  return QUESTIONS.find((q) => q.id === id);
}

export function enonceQuestion(opts: {
  question?: string;
  culture?: string;
  cible?: string;
  matieres: string[];
}): string {
  const culture = opts.culture || "cette culture";
  const cible = opts.cible || "cette cible";
  const produits = opts.matieres.filter(Boolean);
  const produit = produits.length ? produits.join(" et ") : "le produit";
  const deProduit = /^[aeiouéèêàh]/i.test(produit) ? `d'${produit}` : `de ${produit}`;
  const plusieurs = produits.length > 1;
  if (opts.question === "efficacite") {
    return plusieurs
      ? `Chaque produit (${produit}) est jugé seul contre le témoin non traité, pour ${cible} sur ${culture}. Aucun n'est plus efficace qu'un autre avant l'essai.`
      : `Efficacité ${deProduit} : baisse de ${cible} sur ${culture}, mesurée seulement contre le témoin non traité (T0).`;
  }
  if (opts.question === "selectivite") {
    return `Sélectivité ${deProduit} sur ${culture} : le résultat est le symptôme observé, pas un taux.`;
  }
  if (opts.question === "les-deux") {
    return `${produit} : réduction de ${cible} sur ${culture} contre le témoin non traité, et symptôme éventuel sur la culture.`;
  }
  return "";
}
