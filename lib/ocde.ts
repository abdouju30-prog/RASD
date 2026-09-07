// ────────────────────────────────────────────────────────────────────────────
// L'OCDE, LUE COMME UNE CARTE DE FOURNISSEURS
//
// L'OCDE ne publie aucun annuaire d'usines. Elle sert ici à deux choses, et il
// faut les tenir séparées parce qu'elles n'ont pas la même valeur.
//
// 1. QUALIFIER UN FOURNISSEUR — l'Acceptation Mutuelle des Données.
//    La Décision OCDE/LEGAL/0194 (12 mai 1981, modifiée le 6 septembre 2019)
//    dispose que les données produites selon les Lignes directrices et les
//    Bonnes Pratiques de Laboratoire de l'OCDE dans un pays MEMBRE sont
//    acceptées par les autres. Sept pays non membres y ont adhéré depuis, dont
//    l'Inde et le Brésil. C'est ce qui donne sa portée internationale au
//    certificat BPL exigé par l'Annexe 3-B de l'ONSSA : les études d'un
//    fournisseur d'un pays adhérent relèvent d'un programme national de
//    vérification, lui-même soumis à l'examen des pairs.
//
//    ⚠️ LE MAROC N'EST NI MEMBRE NI ADHÉRENT. L'AMD ne lie donc pas l'ONSSA.
//    C'est un argument à faire valoir dans un dossier, pas un droit opposable —
//    exactement comme le recoupement australien. Ne jamais le présenter comme
//    une dispense d'étude.
//
// 2. TROUVER DES FOURNISSEURS — la liste des registres à ouvrir.
//    C'est l'usage le plus rentable, et il ne doit rien à l'AMD. Le principe
//    qui tient l'outil vaut ici : ON N'A PAS BESOIN DU REGISTRE D'UN PAYS POUR
//    TROUVER SES FABRICANTS. Chaque registre national ouvert nomme des sociétés
//    du monde entier — le brésilien nomme 338 lignes indiennes, celui de l'EPA
//    situe des usines chinoises. La liste OCDE est donc, avant tout, la liste
//    des administrations qui ont pris l'habitude de publier. Le prochain
//    gisement est là, pas dans le pays qu'on cherche.
//
// SOURCE : oecd.org/en/about/members-partners.html et la fiche d'adhérence de
// legalinstruments.oecd.org/en/instruments/OECD-LEGAL-0194, relevées le
// 7 septembre 2026. Les dates d'adhésion des non-membres sont celles publiées
// par l'OCDE ; aucune date d'adhésion de membre n'est portée ici, la source
// consultée ne les donnant pas.
// ────────────────────────────────────────────────────────────────────────────

export type LienOcde = "membre" | "adherent" | "candidat" | "partenaire";

export interface FicheOcde {
  pays: string;
  lien: LienOcde;
  /** Adhère au système d'Acceptation Mutuelle des Données. */
  amd: boolean;
  /** Date d'adhésion à l'AMD, pour les non-membres qui y ont adhéré à part. */
  amdDepuis: string | null;
  /** Le Conseil a ouvert une discussion d'adhésion avec ce pays. */
  candidat: boolean;
  /** Partenaire clé : participe aux travaux sans être membre. */
  partenaireCle: boolean;
}

export const LIBELLE_LIEN: Record<LienOcde, string> = {
  membre: "Membre de l'OCDE",
  adherent: "Adhérent à l'AMD",
  candidat: "Candidat à l'adhésion",
  partenaire: "Partenaire clé",
};

export const PORTEE_LIEN: Record<LienOcde, string> = {
  membre:
    "Les études BPL faites dans ce pays sont acceptées par tous les autres adhérents à l'AMD.",
  adherent:
    "Non membre, mais adhérent de plein exercice à l'Acceptation Mutuelle des Données : ses études BPL ont la même portée internationale.",
  candidat:
    "Discussion d'adhésion ouverte par le Conseil de l'OCDE. Sans effet à ce jour sur l'acceptation des données.",
  partenaire:
    "Participe aux travaux de l'OCDE sans en être membre. Sans effet sur l'acceptation des données.",
};

const MEMBRES = [
  "Allemagne", "Australie", "Autriche", "Belgique", "Canada", "Chili",
  "Colombie", "Corée du Sud", "Costa Rica", "Danemark", "Espagne", "Estonie",
  "États-Unis", "Finlande", "France", "Grèce", "Hongrie", "Irlande", "Islande",
  "Israël", "Italie", "Japon", "Lettonie", "Lituanie", "Luxembourg", "Mexique",
  "Norvège", "Nouvelle-Zélande", "Pays-Bas", "Pologne", "Portugal",
  "Royaume-Uni", "Slovaquie", "Slovénie", "Suède", "Suisse", "Tchéquie",
  "Turquie",
];

// Les sept non-membres qui adhèrent de plein exercice à l'AMD, avec la date
// publiée par l'OCDE. Deux d'entre eux — l'Inde et le Brésil — sont les plus
// gros gisements de fournisseurs génériques de l'outil.
const ADHERENTS: [string, string][] = [
  ["Afrique du Sud", "2003-05-05"],
  ["Singapour", "2010-01-08"],
  ["Inde", "2011-03-03"],
  ["Brésil", "2011-03-29"],
  ["Argentine", "2011-09-02"],
  ["Malaisie", "2013-03-29"],
  ["Thaïlande", "2020-08-24"],
];

const CANDIDATS = [
  "Argentine", "Brésil", "Bulgarie", "Croatie", "Indonésie", "Pérou",
  "Roumanie", "Thaïlande",
];

const PARTENAIRES_CLES = [
  "Afrique du Sud", "Brésil", "Chine", "Inde", "Indonésie",
];

function construire(): Map<string, FicheOcde> {
  const m = new Map<string, FicheOcde>();
  const poser = (pays: string, lien: LienOcde): FicheOcde => {
    const existante = m.get(pays);
    if (existante) return existante;
    const neuve: FicheOcde = {
      pays,
      lien,
      amd: false,
      amdDepuis: null,
      candidat: false,
      partenaireCle: false,
    };
    m.set(pays, neuve);
    return neuve;
  };

  // L'ordre compte : le lien le plus fort l'emporte. Le Brésil est à la fois
  // adhérent à l'AMD, candidat à l'adhésion et partenaire clé — c'est
  // l'adhésion à l'AMD qui a un effet sur un dossier, elle passe donc devant.
  for (const p of MEMBRES) poser(p, "membre").amd = true;
  for (const [p, d] of ADHERENTS) {
    const f = poser(p, "adherent");
    f.amd = true;
    f.amdDepuis = d;
  }
  for (const p of CANDIDATS) poser(p, "candidat").candidat = true;
  for (const p of PARTENAIRES_CLES) poser(p, "partenaire").partenaireCle = true;

  return m;
}

const PAR_PAYS = construire();

/** Lien d'un pays avec l'OCDE, ou null s'il n'en a aucun. */
export function ocde(pays: string): FicheOcde | null {
  return PAR_PAYS.get(pays) ?? null;
}

/** Les études BPL de ce pays sont-elles couvertes par l'AMD ? */
export function sousAmd(pays: string): boolean {
  return PAR_PAYS.get(pays)?.amd ?? false;
}

export const FICHES_OCDE: FicheOcde[] = [...PAR_PAYS.values()].sort((a, b) =>
  a.pays.localeCompare(b.pays, "fr")
);

// ────────────────────────────────────────────────────────────────────────────
// LES REGISTRES NATIONAUX, ET CE QU'ILS RÉPONDENT
//
// La carte de prospection. `etat` dit ce qu'on a constaté soi-même, pas ce
// qu'on suppose : « Répond » veut dire que le serveur a renvoyé 200 à la date
// indiquée, RIEN DE PLUS — ni que la donnée est exploitable, ni qu'elle nomme
// des fabricants. C'est toute la différence entre une piste et une source.
// ────────────────────────────────────────────────────────────────────────────

export type EtatRegistre = "integre" | "atteignable" | "ferme" | "inexplore";

export const LIBELLE_ETAT: Record<EtatRegistre, string> = {
  integre: "Intégré",
  atteignable: "Répond",
  ferme: "Fermé",
  inexplore: "À localiser",
};

export interface RegistreNational {
  pays: string;
  autorite: string;
  url: string;
  etat: EtatRegistre;
  /** Ce que le registre nomme — la seule chose qui décide de sa valeur. */
  nomme: string;
  /** Le constat, daté. Jamais une supposition. */
  constat: string;
}

const RELEVE = "relevé le 7 septembre 2026";

export const REGISTRES: RegistreNational[] = [
  {
    pays: "Maroc",
    autorite: "ONSSA",
    url: "https://eservice.onssa.gov.ma/",
    etat: "integre",
    nomme: "Le détenteur et le fournisseur de la matière active",
    constat: "Index de référence de l'outil. Seul registre qui ouvre la voie me-too.",
  },
  {
    pays: "Brésil",
    autorite: "MAPA — AGROFIT",
    url: "https://dados.agricultura.gov.br/",
    etat: "integre",
    nomme: "Le fabricant du technique, son site, son pays et la teneur homologuée",
    constat:
      "542 usines, 3 600 déclarations de fabricant. Le seul registre qui nomme l'atelier et publie la pureté.",
  },
  {
    pays: "États-Unis",
    autorite: "US EPA — Pesticide Establishments",
    url: "https://ordspub.epa.gov/",
    etat: "integre",
    nomme: "Le site de production déclaré, avec sa ville et son pays",
    constat: "La plus large couverture géographique de l'outil, toutes nationalités confondues.",
  },
  {
    pays: "Chine",
    autorite: "ICAMA",
    url: "https://www.icama.cn/",
    etat: "integre",
    nomme: "L'homologation de technique et la licence de production",
    constat:
      "496 sociétés, en caractères han translittérés. Partenaire clé de l'OCDE, hors AMD.",
  },
  {
    pays: "Australie",
    autorite: "APVMA — PUBCRIS",
    url: "https://portal.apvma.gov.au/pubcris",
    etat: "integre",
    nomme: "Le détenteur d'homologation, pas le fabricant",
    constat:
      "Utile en recoupement d'identité. L'Australie ne synthétise pas : ce n'est pas un pays de sourcing.",
  },
  {
    pays: "Turquie",
    autorite: "Tarım ve Orman Bakanlığı — BKÜ",
    url: "https://bku.tarimorman.gov.tr/",
    etat: "integre",
    nomme: "La mention İMAL — fabriqué en Turquie",
    constat: "Membre de l'OCDE et pays de coût compétitif : la combinaison est rare.",
  },
  {
    pays: "France",
    autorite: "ANSES — E-Phy",
    url: "https://ephy.anses.fr/",
    etat: "integre",
    nomme: "Le statut réglementaire de la substance, non ses fabricants",
    constat: "Sert la veille de retrait, qui gouverne l'ONSSA. Aucun usage de sourcing.",
  },
  {
    pays: "Russie",
    autorite: "Minselkhoz — Государственный каталог",
    url: "https://mcx.gov.ru/",
    etat: "integre",
    nomme: "Le détenteur d'homologation russe",
    constat:
      "Hors OCDE. Édition 2022, obtenue par miroir régional — le serveur fédéral ne répond pas.",
  },
  {
    pays: "Inde",
    autorite: "CIB&RC",
    url: "https://cibrc.gov.in/",
    etat: "ferme",
    nomme: "Les homologations de technique — inaccessibles",
    constat:
      `403 sur ppqs.gov.in, aucune réponse sur cibrc.gov.in (${RELEVE} et les jours précédents). ` +
      "L'Inde adhère pourtant à l'AMD depuis le 3 mars 2011 : le pays fait circuler ses études, pas son registre. " +
      "327 sociétés indiennes sont dans l'outil, toutes venues de registres étrangers.",
  },
  {
    pays: "Canada",
    autorite: "Santé Canada — ARLA",
    url: "https://pr-rp.hc-sc.gc.ca/pi-ip/index-fra.php",
    etat: "atteignable",
    nomme: "Le titulaire d'homologation — le fabricant reste à vérifier",
    constat: `200 (${RELEVE}). Une seule usine canadienne au registre brésilien : le Canada formule, il ne synthétise pas.`,
  },
  {
    pays: "Corée du Sud",
    autorite: "RDA — PSIS",
    url: "https://psis.rda.go.kr/psis/index.ps",
    etat: "atteignable",
    nomme: "À vérifier",
    constat: `200 (${RELEVE}). Membre de l'OCDE doté d'une industrie générique réelle — le meilleur rapport effort/rendement parmi les registres non ouverts.`,
  },
  {
    pays: "Colombie",
    autorite: "ICA",
    url: "https://www.ica.gov.co/",
    etat: "atteignable",
    nomme: "À vérifier",
    constat: `200 (${RELEVE}). Membre de l'OCDE depuis 2020 et pays de coût compétitif.`,
  },
  {
    pays: "Argentine",
    autorite: "SENASA",
    url: "https://www.argentina.gob.ar/senasa",
    etat: "atteignable",
    nomme: "À vérifier",
    constat: `200 (${RELEVE}). Adhérent à l'AMD depuis le 2 septembre 2011 et candidat à l'adhésion.`,
  },
  {
    pays: "Mexique",
    autorite: "COFEPRIS",
    url: "https://www.gob.mx/cofepris",
    etat: "atteignable",
    nomme: "À vérifier",
    constat: `200 sur le portail (${RELEVE}) ; le registre lui-même reste à localiser.`,
  },
  {
    pays: "Malaisie",
    autorite: "Pesticides Board — DOA",
    url: "https://www.doa.gov.my/",
    etat: "atteignable",
    nomme: "À vérifier",
    constat: `200 (${RELEVE}). Adhérent à l'AMD depuis 2013.`,
  },
  {
    pays: "Thaïlande",
    autorite: "Department of Agriculture",
    url: "https://www.doa.go.th/ard/",
    etat: "atteignable",
    nomme: "À vérifier",
    constat: `200 (${RELEVE}). Adhérent à l'AMD depuis 2020 et candidat à l'adhésion.`,
  },
  {
    pays: "Nouvelle-Zélande",
    autorite: "ACVM Register",
    url: "https://eatsafe.nzfsa.govt.nz/web/public/acvm-register",
    etat: "atteignable",
    nomme: "Le détenteur d'homologation",
    constat: `200 (${RELEVE}). Même profil que l'Australie : peu de synthèse, valeur de recoupement.`,
  },
  {
    pays: "Israël",
    autorite: "PPIS",
    url: "https://www.gov.il/en/departments/plant_protection_and_inspection_services",
    etat: "ferme",
    nomme: "—",
    constat: `403 (${RELEVE}).`,
  },
  {
    pays: "Afrique du Sud",
    autorite: "DALRRD — Act 36 of 1947",
    url: "https://www.dalrrd.gov.za/",
    etat: "ferme",
    nomme: "—",
    constat: `Aucune réponse du serveur (${RELEVE}). Adhérent à l'AMD depuis 2003, le plus ancien des sept.`,
  },
  {
    pays: "Japon",
    autorite: "FAMIC — ACIS",
    url: "https://www.acis.famic.go.jp/",
    etat: "inexplore",
    nomme: "À vérifier",
    constat: `404 sur l'adresse essayée (${RELEVE}) : le registre existe, l'URL est à retrouver.`,
  },
  {
    pays: "Chili",
    autorite: "SAG",
    url: "https://www.sag.gob.cl/",
    etat: "inexplore",
    nomme: "À vérifier",
    constat: `404 sur l'adresse essayée (${RELEVE}).`,
  },
  {
    pays: "Union européenne",
    autorite: "ECHA — art. 95, fournisseurs de substances actives",
    url: "https://echa.europa.eu/fr/information-on-chemicals/active-substance-suppliers",
    etat: "ferme",
    nomme: "Nommément : les fournisseurs agréés d'une substance active biocide",
    constat: `403, sur la page comme sur l'export (${RELEVE}). Ce serait un annuaire de fournisseurs au sens strict — le seul de cette liste — mais il ne couvre que le biocide, pas le phytosanitaire.`,
  },
  {
    pays: "OCDE",
    autorite: "eChemPortal",
    url: "https://www.echemportal.org/echemportal/",
    etat: "atteignable",
    nomme: "Des propriétés de substances, pas des sociétés",
    constat: `200 sur le portail, 500 sur l'API en lecture directe (${RELEVE}). Agrège les registres nationaux de produits chimiques : à évaluer, sans en attendre des usines.`,
  },
];

export const STATS_OCDE = {
  nbMembres: MEMBRES.length,
  nbAdherents: ADHERENTS.length,
  nbCandidats: CANDIDATS.length,
  nbIntegres: REGISTRES.filter((r) => r.etat === "integre").length,
  nbAtteignables: REGISTRES.filter((r) => r.etat === "atteignable").length,
  nbFermes: REGISTRES.filter((r) => r.etat === "ferme").length,
};
