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
    pays: "Corée du Sud",
    autorite: "RDA — 농약안전정보시스템 (PSIS)",
    url: "https://psis.rda.go.kr/psis/agc/res/agchmRegistStusLst.ps?menuId=PS00263",
    etat: "integre",
    nomme: "Le titulaire d'homologation, son rôle (fabriqué / importé) et LA DATE",
    constat:
      "Le seul registre de l'outil daté au jour et régénéré quotidiennement : on y voit entrer les molécules. Membre de l'OCDE et pays de production générique réelle — la combinaison est rare.",
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
    autorite: "CIB&RC — PPQS",
    url: "https://www.ppqs.gov.in/divisions/cib-rc/registered-products",
    etat: "ferme",
    nomme: "La liste des pesticides enregistrés au 30 octobre 2025",
    constat:
      "Page officielle trouvée. 403 le 23 septembre 2026, et cibrc.gov.in ne se résout plus. " +
      "L'Inde adhère à l'AMD depuis le 3 mars 2011. Aucune société n'est recopiée depuis un registre étranger.",
  },
  {
    pays: "Canada",
    autorite: "Santé Canada — ARLA, PPID",
    url: "https://open.canada.ca/data/en/dataset/e10b0d6e-04ac-4014-a64a-666c3874bbe0",
    etat: "integre",
    nomme: "Le titulaire et les matières actives des produits en homologation pleine",
    constat: "Extrait CSV du 23 septembre 2026 : 7 764 produits en homologation pleine, 670 titulaires. Le Canada formule, il ne synthétise pas.",
  },
  {
    pays: "Colombie",
    autorite: "ICA — registres nationaux",
    url: "https://www.ica.gov.co/getattachment/Areas/Agricola/Servicios/Regulacion-y-Control-de-Plaguicidas-Quimicos/PUBLICACION-BD_RN-RF-4.pdf.aspx?lang=es-CO",
    etat: "atteignable",
    nomme: "Produit, entreprise, ingrédient actif, concentration, cultures",
    constat: "PDF public, 178 pages (23 septembre 2026). Les cellules sont coupées : les sociétés ne sont pas extraites pour éviter des noms tronqués.",
  },
  {
    pays: "Argentine",
    autorite: "SENASA — Registro Nacional de Terapéutica Vegetal",
    url: "https://aps2.senasa.gov.ar/vademecum/app/publico",
    etat: "integre",
    nomme: "Les plantes de formulation, et le vadémécum des produits inscrits",
    constat: "203 établissements lus dans le tableur officiel des plantes élaboratrices (23 septembre 2026). Les produits inscrits restent dans le vadémécum en ligne.",
  },
  {
    pays: "Mexique",
    autorite: "COFEPRIS — consulta de registros",
    url: "https://siipris03.cofepris.gob.mx/Resoluciones/Consultas/ConWebRegPlaguicida.asp",
    etat: "atteignable",
    nomme: "Le registre sanitaire, par société, nom commercial ou numéro",
    constat: "Consultation unitaire trouvée le 23 septembre 2026. Pas de fichier ouvert : aucune ligne extraite.",
  },
  {
    pays: "Malaisie",
    autorite: "Lembaga Racun Makhluk Perosak",
    url: "http://www.portal.doa.gov.my/racunberdaftar/",
    etat: "integre",
    nomme: "Produit, n° LRMP, matière active, titulaire, date d'expiration",
    constat: "Liste gazettée lue le 23 septembre 2026 : 3 550 produits, 190 titulaires. Mise à jour mensuelle.",
  },
  {
    pays: "Thaïlande",
    autorite: "DOA — licences de substances dangereuses",
    url: "https://www.doa.go.th/ard/?page_id=3030",
    etat: "atteignable",
    nomme: "Les licences agricoles (วัตถุอันตราย)",
    constat: "Page des licences ouverte le 23 septembre 2026. Le gestionnaire de fichiers ne publie pas de tableur : aucune ligne extraite.",
  },
  {
    pays: "Nouvelle-Zélande",
    autorite: "MPI — ACVM Register",
    url: "https://eatsafe.nzfsa.govt.nz/web/public/acvm-register",
    etat: "atteignable",
    nomme: "Le titulaire et le nom commercial des produits ACVM",
    constat: "Registre en ligne, mise à jour affichée au 26 août 2026. Pas d'export ouvert : aucune ligne extraite.",
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
    url: "https://www.nda.gov.za/index.php/publication/616-registered-products",
    etat: "integre",
    nomme: "Les spécialités restreintes : produit, n°, matière active, société",
    constat: "Le domaine a changé (nda.gov.za). Tableur des remèdes restreints lu le 23 septembre 2026 : 201 lignes, 52 sociétés. La liste complète n'est pas un fichier.",
  },
  {
    pays: "Japon",
    autorite: "FAMIC — 農薬登録情報",
    url: "https://www.acis.famic.go.jp/ddata/index.htm",
    etat: "integre",
    nomme: "Le titulaire et la matière active du fichier de base",
    constat: "登録基本部 du 10 septembre 2026 : 6 284 homologations, 159 titulaires. Matières en katakana.",
  },
  {
    pays: "Chili",
    autorite: "SAG — plaguicidas autorizados",
    url: "https://www.sag.gob.cl/ambitos-de-accion/listado-de-plaguicidas-autorizados-prohibidos-restringidos-y-cancelados-etiquetas-y-hds",
    etat: "atteignable",
    nomme: "Autorisés, restreints, annulés, et étiquettes",
    constat: "Page trouvée le 23 septembre 2026, en maintenance. Le rapport complet est un Power BI, sans planilla téléchargée.",
  },
  {
    pays: "Union européenne",
    autorite: "ECHA — article 95",
    url: "https://echa.europa.eu/regulations/biocidal-products-regulation/approved-suppliers",
    etat: "integre",
    nomme: "Le fournisseur de substance ou de produit biocide",
    constat: "Liste du 20 février 2026 : 406 sociétés, 1 020 inscriptions. Biocide, pas phytosanitaire. Le portail répond 403 en accès direct ; le PDF officiel a été lu.",
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
