// ────────────────────────────────────────────────────────────────────────────
// RAPPROCHEMENT DES RAISONS SOCIALES
//
// Trois registres nomment les mêmes fabricants de trois façons différentes :
// l'index ONSSA, le registre australien, le registre des établissements de
// l'EPA. Une seule règle de rapprochement pour les trois — une deuxième
// implémentation dériverait de la première sans qu'on s'en aperçoive.
//
// Le principe : distinguer ce qui identifie une société de ce qui la situe ou
// la décrit. « SHARDA CROPCHEM LIMITED » et « SHARDA CROPCHEM LTD » sont la
// même société ; « ZHEJIANG HEBEN PESTICIDE » et « INDIA PESTICIDE LTD » ne le
// sont pas, bien qu'elles partagent un mot.
// ────────────────────────────────────────────────────────────────────────────

/** Forme juridique : aucune identité. Retirée de la clé comme des mots-clés. */
const MOTS_JURIDIQUES = new Set(
  ("PTY LTD LTDA LIMITED CO COMPANY INC CORP CORPORATION PVT PRIVATE PTE GMBH " +
    "MBH KG AG SA SAS SARL SRL SPRL SL SAU NV BV BVBA AS APS OY AB SPA PLC LLC " +
    "LLP DOO SRO OOO ZAO PJSC JSC BHD SDN GROUP GROUPE HOLDING AS SANAYI TICARET " +
    "TIC SAN ANONIM SIRKETI STI"
  ).split(" ")
);

/**
 * Mots de métier : ils comptent pour distinguer deux raisons sociales entières,
 * mais ne peuvent JAMAIS à eux seuls rapprocher deux sociétés. Sans cette
 * distinction, « ZHEJIANG HEBEN PESTICIDE » se rattacherait à « INDIA PESTICIDE
 * LTD » sur le seul mot « pesticide ».
 */
const MOTS_METIER = new Set(
  ("INTERNATIONAL INTL INDUSTRIE INDUSTRY INDUSTRIAL CHEMICAL CHEMFERT " +
    "AGROCHEMICAL AGROCHEM AGRO AGRI AGRICULTURE AGRICULTURAL AGROSCIENCE " +
    "SCIENCE CROPSCIENCE CROP TECHNOLOGY TECHNOLOGIE TECH BIOTECH BIOSCIENCE " +
    "BIOTECHNOLOGY BIOCHEMICAL BIO SOLUTION PRODUCT PESTICIDE PROTECTION PLANT " +
    "UNION PHARMACEUTICAL LABORATORY LABORATORIE CENTRE CENTER ENVIRONMENTAL " +
    "TRADING TRADE IMP EXP EXPORT IMPORT MANUFACTURING TARIM ILACLARI KIMYA " +
    // « RASAYAN » veut dire « chimie » en hindi : sans cela, ANUPAM RASAYAN se
    // rattache à KRISHI RASAYAN, deux sociétés indiennes sans lien.
    "RASAYAN UDYOG STOCK JOINT ALLIED VENTURE ENTERPRISE ORGANIC SPECIALITY " +
    "SPECIALTY FINE LIFESCIENCE LIFE GENERIC NATIONAL GENERAL"
  ).split(" ")
);

/**
 * Toponymes : ils situent, ils n'identifient pas. « SHANDONG » est partagé par
 * des dizaines de sociétés chinoises sans lien entre elles — s'en servir pour
 * rapprocher deux noms produirait des faux positifs en série. Ils restent
 * pourtant dans la clé exacte, où ils distinguent utilement deux entités.
 */
const TOPONYMES = new Set(
  ("AUSTRALIA AUSTRALASIA INDIA CHINA CHINE SINGAPORE EUROPE EUROPEAN FRANCE " +
    "ESPANA SPAIN DEUTSCHLAND GERMANY USA NETHERLANDS BENELUX ITALIA IBERICA " +
    "BRASIL MEXICO MAROC AFRICA ASIA ASIATIC NANJING SHANDONG NINGBO JIANGSU " +
    "ZHEJIANG HEBEI ANHUI SHANGHAI BEIJING SICHUAN HUBEI HUNAN JIANGXI " +
    "GUANGDONG WEIFANG NANTONG RUDONG LESHAN CHENGWU ZHENJIANG JIANGNAN " +
    "SHENZHEN QINGDAO TIANJIN GUANGZHOU TURKIYE TURKEY ISTANBUL IZMIR ADANA " +
    "GEBZE KOCAELI GUJARAT MUMBAI DELHI HYDERABAD BHARUCH VAPI ANKARA"
  ).split(" ")
);

/** « INDUSTRIES » et « INDUSTRIE » désignent la même chose des deux côtés. */
function singulier(t: string): string {
  return t.length >= 5 && t.endsWith("S") ? t.slice(0, -1) : t;
}

/** Mots porteurs de sens : forme juridique retirée, pluriels au singulier. */
export function mots(nom: string): string[] {
  return nom
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter((t) => t.length > 1)
    .map(singulier)
    .filter((t) => !MOTS_JURIDIQUES.has(t));
}

/**
 * Clé d'identité. Pour une filiale locale, le toponyme du pays d'accueil est
 * retiré : c'est le groupe qu'on cherche à reconnaître, pas l'entité locale.
 */
export function cle(nom: string, filiale = false): string {
  const t = mots(nom);
  return (filiale ? t.filter((m) => m !== "AUSTRALIA" && m !== "AUSTRALASIA") : t).join(" ");
}

export function slug(nom: string): string {
  return nom
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 70);
}

/** Un mot de métier ou un toponyme ne peut jamais rapprocher deux sociétés. */
export function motPorteur(m: string): boolean {
  return m.length >= 4 && !MOTS_METIER.has(m) && !TOPONYMES.has(m);
}

/**
 * Index de rapprochement sur une population de noms.
 *
 * Deux niveaux, jamais confondus à l'affichage :
 *   • clé identique      -> même société
 *   • mot porteur rare   -> parenté probable, à vérifier
 *
 * La rareté se mesure sur la population elle-même plutôt qu'elle ne se devine :
 * un mot porté par trois sociétés ou plus est un mot de métier, pas une marque.
 */
export class IndexNoms<T> {
  private parCle = new Map<string, T>();
  private parMot = new Map<string, T[]>();

  constructor(entrees: { nom: string; valeur: T }[], private seuilRarete = 2) {
    for (const { nom, valeur } of entrees) {
      // La clé exacte accepte tous les noms, y compris les sigles courts :
      // « UPL LIMITED » et « GSP CROP SCIENCE » n'ont aucun mot porteur au sens
      // ci-dessous, mais leur clé complète les identifie parfaitement.
      const k = cle(nom);
      if (k && !this.parCle.has(k)) this.parCle.set(k, valeur);

      // Le rapprochement flou, lui, n'indexe QUE les mots porteurs. Un nom fait
      // uniquement de mots de métier — « Joint Stock Company », tel quel à
      // l'index ONSSA — n'y entre donc pas, et ne peut rapprocher personne.
      for (const m of new Set(mots(nom))) {
        if (!motPorteur(m)) continue;
        const l = this.parMot.get(m) ?? [];
        l.push(valeur);
        this.parMot.set(m, l);
      }
    }
  }

  /** Correspondance exacte sur la clé d'identité. */
  exact(nom: string, filiale = false): T | null {
    const k = cle(nom, filiale);
    return (k && this.parCle.get(k)) || null;
  }

  /** Sociétés partageant un mot porteur rare — parenté probable, à vérifier. */
  proches(nom: string, limite = 4): T[] {
    const out: T[] = [];
    const vus = new Set<T>();
    for (const m of mots(nom)) {
      if (!motPorteur(m)) continue;
      const l = this.parMot.get(m);
      if (!l || l.length > this.seuilRarete) continue;
      for (const v of l) {
        if (vus.has(v)) continue;
        vus.add(v);
        out.push(v);
        if (out.length >= limite) return out;
      }
    }
    return out;
  }
}
