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
  titre: string;
  texte: string;
  schema?: SchemaId;
}

export interface Procedure {
  id: string;
  titre: string;
  resume: string;
  etapes: Etape[];
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

export const PROCEDURES: Procedure[] = [
  {
    id: "cadrage",
    titre: "Cadrer un essai",
    resume: "Fixer la culture, la cible et la question avant de lire le spectre.",
    etapes: [
      {
        titre: "La question",
        texte:
          "Une culture, un bioagresseur, une matière active ou un mélange. L'essai répond à une question : efficacité, sélectivité, ou les deux.",
        schema: "question",
      },
      {
        titre: "Ce que le spectre apporte",
        texte:
          "Il montre les emplois déjà à l'index : culture, cible, dose, DAR. C'est un précédent pour écrire le protocole. Ce n'est pas une autorisation.",
      },
      {
        titre: "Ce que BPE ne fait pas",
        texte:
          "Il ne choisit pas de laboratoire, ne dépose pas de dossier et ne modifie pas Homologa.",
      },
    ],
  },
  {
    id: "protocole",
    titre: "Protocole d'essai",
    resume: "Grille minimale pour écrire un protocole avant la première application.",
    etapes: [
      {
        titre: "Objectif",
        texte:
          "Un objectif principal : efficacité, sélectivité, ou les deux. La culture, le bioagresseur et le stade (BBCH ou équivalent) sont nommés. Le spectre de l'index sert à choisir un couple culture / cible déjà instruit au Maroc.",
      },
      {
        titre: "Dispositif",
        texte:
          "Blocs randomisés, répétitions, parcelle utile séparée des bordures. Témoin non traité pour lire l'efficacité. Produit de référence lorsqu'un emploi homologué existe déjà sur le même couple : la dose et le DAR de l'index sont le précédent, pas la modalité imposée.",
        schema: "dispositif",
      },
      {
        titre: "Application",
        texte:
          "Dose, volume de bouillie, matériel, buses, conditions météo, heure. Écarts notés le jour même. Ces repères structurent le protocole ; ils ne retranscrivent pas un article ONSSA.",
        schema: "application",
      },
      {
        titre: "Notations",
        texte:
          "État initial, puis notations calées sur la cinétique du bioagresseur. Sélectivité et symptômes sur la culture, pas seulement le ravageur ou la maladie.",
        schema: "notations",
      },
    ],
  },
  {
    id: "melange",
    titre: "Mélange de matières actives",
    resume: "Distinguer une association déjà formulée d'un mélange en cuve, et tester la compatibilité physique.",
    etapes: [
      {
        titre: "Deux objets différents",
        texte:
          "Une association formulée est un produit qui contient déjà plusieurs matières actives : l'index en recense, avec cultures, cibles, doses et DAR. Un mélange en cuve est préparé dans le pulvérisateur à partir de produits séparés. La présence des molécules, séparément ou ensemble, n'autorise pas le mélange en cuve.",
      },
      {
        titre: "Ce que l'index prouve",
        texte:
          "Si BPE trouve une association dont tous les composants choisis font partie, c'est un précédent de formulation déjà à l'index. Sinon, aucun mélange formulé de ces matières actives n'est dans l'extrait. L'essai peut quand même les comparer, chacune dans sa modalité, ou étudier un mélange — après compatibilité physique.",
      },
      {
        titre: "Ordre d'introduction",
        texte:
          "Repère de préparation, à valider par l'essai en bocal et par les étiquettes : " +
          ORDRE_CUVE.join(" ; ") +
          ". L'agitation ne s'arrête pas. Ce n'est pas une règle ONSSA.",
        schema: "cuve",
      },
      {
        titre: "Essai en bocal",
        texte:
          "Mêmes proportions que la bouillie prévue, avec l'eau du site. Observer au moins 15 minutes : crémage, floculat, précipité, échauffement, séparation. S'il y a une instabilité, ne pas appliquer cette bouillie sur l'essai. Le bocal ne dit rien de la sélectivité ni des résidus.",
        schema: "bocal",
      },
    ],
  },
  {
    id: "selectivite",
    titre: "Efficacité, sélectivité, doses",
    resume: "Lire le spectre comme un précédent réglementaire, sans inventer de taux d'efficacité.",
    etapes: [
      {
        titre: "Ce qui est publié",
        texte:
          "Culture, cible, dose et DAR. Plusieurs doses coexistent quand les lignes de l'index diffèrent : elles sont toutes montrées, aucune n'est choisie à la place d'une autre.",
        schema: "doses",
      },
      {
        titre: "Ce qui n'est pas publié",
        texte:
          "Aucun taux d'efficacité. Ni l'ONSSA ni Homologa n'en fournissent dans cet extrait. BPE n'en calcule pas. Un pourcentage ne peut venir que d'un essai ou d'une fiche dont la source et la date sont conservées hors de cet outil.",
      },
      {
        titre: "DAR",
        texte:
          "Le délai avant récolte d'un emploi homologué est un précédent pour le protocole. Il n'autorise pas une récolte commerciale à l'issue d'un essai.",
      },
    ],
  },
  {
    id: "tracabilite",
    titre: "Traçabilité et rapport",
    resume: "Tenir les faits d'essai séparés de l'interprétation, et séparés de l'index.",
    etapes: [
      {
        titre: "Avant l'application",
        texte:
          "Protocole daté, modalités figées, lots identifiés, certificats des produits d'essai. Une modification après coup est un écart, pas une réécriture.",
      },
      {
        titre: "Pendant",
        texte:
          "Données brutes, météo, volume réellement épandu, stade observé, photos rattachées à la parcelle, la modalité, la répétition et la date.",
      },
      {
        titre: "Rapport",
        texte:
          "Les faits observés, puis l'interprétation. Le spectre Homologa peut être cité comme précédent de dose et de DAR, avec la date de l'extrait. Il ne remplace pas les résultats de l'essai.",
        schema: "feuille",
      },
    ],
  },
];

export function procedureParId(id: string): Procedure | undefined {
  return PROCEDURES.find((p) => p.id === id);
}
