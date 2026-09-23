export interface Etape {
  titre: string;
  texte: string;
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
    titre: "Cadrer un essai BPE",
    resume: "Vérifier l'agrément, le périmètre de cultures et l'échéance avant de commander un essai.",
    etapes: [
      {
        titre: "Ce que BPE désigne ici",
        texte:
          "Les bonnes pratiques d'expérimentation : l'organisme qui conduit l'essai d'efficacité doit être agréé, et l'agrément doit couvrir la famille de cultures concernée. Un agrément légumes ne couvre pas l'arboriculture.",
      },
      {
        titre: "D'où vient la liste",
        texte:
          "Les organismes et leurs périmètres sont le registre public ONSSA déjà repris dans Homologa, recopié tel quel. Homologa n'est pas modifié. La date de mise à jour du registre est affichée dans Sources. L'attestation d'agrément fait foi, pas cet écran.",
      },
      {
        titre: "Avant de commander",
        texte:
          "Contrôler le numéro, la date, l'expiration et la couverture. Un agrément expiré ou à moins d'un an est signalé. Confirmer auprès de l'organisme que le périmètre couvre bien la culture de l'essai, surtout si BPE a rattaché la culture par un ajout.",
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
      },
      {
        titre: "Application",
        texte:
          "Dose, volume de bouillie, matériel, buses, conditions météo, heure. Écarts notés le jour même. Ces repères structurent le protocole ; ils ne retranscrivent pas un article ONSSA.",
      },
      {
        titre: "Notations",
        texte:
          "État initial, puis notations calées sur la cinétique du bioagresseur. Sélectivité et symptômes sur la culture, pas seulement le ravageur ou la maladie.",
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
      },
      {
        titre: "Essai en bocal",
        texte:
          "Mêmes proportions que la bouillie prévue, avec l'eau du site. Observer au moins 15 minutes : crémage, floculat, précipité, échauffement, séparation. S'il y a une instabilité, ne pas appliquer cette bouillie sur l'essai. Le bocal ne dit rien de la sélectivité ni des résidus.",
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
      },
    ],
  },
  {
    id: "organisme",
    titre: "Choisir l'organisme",
    resume: "Filtrer le registre par périmètre, puis vérifier l'attestation.",
    etapes: [
      {
        titre: "Filtre",
        texte:
          "Pour une culture rattachée, BPE ne propose que les organismes dont la couverture contient chaque périmètre retenu. Si la culture n'est pas rattachée (adjuvant, « toutes cultures »), la liste complète s'affiche et doit être triée à la main.",
      },
      {
        titre: "Ajouts BPE",
        texte:
          "Certaines cultures absentes du mot-clé Homologa sont rattachées ici (framboisier vers les cultures fruitières, épinard vers les légumes, etc.). L'écran le dit. Ce rattachement est une aide, pas une décision ONSSA.",
      },
      {
        titre: "Contact",
        texte:
          "Siège, téléphone et courriels sont ceux du registre public. Ils servent à demander un devis d'essai, pas à conclure que l'organisme est disponible.",
      },
    ],
  },
];

export function procedureParId(id: string): Procedure | undefined {
  return PROCEDURES.find((p) => p.id === id);
}
