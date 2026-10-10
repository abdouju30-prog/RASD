import { FOURNISSEURS, MATIERES } from "./data";
import { TOUTES_ENTREES, type Registre } from "./pays";
import { REGISTRES_OUVERTS } from "./registres-ouverts";
import { USINES_BRESIL } from "./bresil";
import { USINES_CHINE, anglaisDe } from "./icama";
import { USINES_TURQUES } from "./bku";
import { ANNUAIRE_PISTES } from "./pistes";
import { PRODUCTEURS_RUSSES } from "./russie";

// ────────────────────────────────────────────────────────────────────────────
// ANNUAIRE MONDIAL DES FABRICANTS — une société, une ligne, tous ses registres.
//
// Le recensement par pays (lib/pays.ts) liste une entrée par registre ; ici la
// même société, vue au Brésil, à l'EPA et en Australie, devient UNE ligne qui
// porte ses trois registres. S'y ajoutent les registres ouverts (Canada,
// Colombie, Nouvelle-Zélande, Argentine, Japon, Malaisie, Afrique du Sud, UE).
//
// ⚠️ Le rapprochement se fait sur la raison sociale normalisée (formes
// juridiques et ponctuation retirées). Deux écritures trop différentes d'une
// même société restent deux lignes : on préfère un doublon à une fusion fausse.
// ⚠️ Le pays d'un titulaire de registre ouvert sans nationalité lisible est
// celui du registre, marqué « présumé » : souvent une filiale ou un distributeur.
// ⚠️ L'EPA liste aussi des fabricants d'emballages et d'appareils : une société
// vue seulement à l'EPA n'entre que si sa raison sociale dit une activité
// agrochimique.
// ────────────────────────────────────────────────────────────────────────────

export interface Fabricant {
  cle: string;
  nom: string;
  pays: string;
  /** Pays lu dans un registre ou déduit de façon sûre ; false = présumé. */
  paysFiable: boolean;
  region: Region;
  registres: string[];
  /** Déjà fournisseur d'un produit homologué au Maroc. */
  meToo: boolean;
  molecules: string[];
}

export type Region =
  | "OCDE" | "Amérique latine" | "Chine" | "Inde" | "Russie et CEI" | "Asie (autres)"
  | "Europe hors OCDE" | "Afrique et Moyen-Orient" | "Autres";

export const REGIONS: Region[] = ["OCDE", "Amérique latine", "Chine", "Inde", "Russie et CEI",
  "Asie (autres)", "Europe hors OCDE", "Afrique et Moyen-Orient", "Autres"];

// Membres de l'OCDE (38). Mexique, Chili, Colombie et Costa Rica sont aussi en Amérique latine :
// le filtre « Amérique latine » les reprend.
const OCDE = new Set(["Australie", "Autriche", "Belgique", "Canada", "Chili", "Colombie", "Costa Rica",
  "Tchéquie", "Danemark", "Estonie", "Finlande", "France", "Allemagne", "Grèce", "Hongrie", "Islande",
  "Irlande", "Israël", "Italie", "Japon", "Corée du Sud", "Lettonie", "Lituanie", "Luxembourg", "Mexique",
  "Pays-Bas", "Nouvelle-Zélande", "Norvège", "Pologne", "Portugal", "Slovaquie", "Slovénie", "Espagne",
  "Suède", "Suisse", "Turquie", "Royaume-Uni", "États-Unis"]);
const AMERIQUE_LATINE = new Set(["Brésil", "Argentine", "Mexique", "Colombie", "Chili", "Pérou", "Uruguay",
  "Paraguay", "Bolivie", "Équateur", "Venezuela", "Costa Rica", "Guatemala", "Honduras", "Salvador",
  "Nicaragua", "Panama", "République dominicaine", "Cuba", "Porto Rico", "Trinité-et-Tobago", "Barbade"]);
const CEI = new Set(["Russie", "Biélorussie", "Kazakhstan", "Ukraine", "Ouzbékistan", "Arménie", "Kirghizistan"]);
const ASIE = new Set(["Japon", "Corée du Sud", "Taïwan", "Hong Kong", "Viêt Nam", "Thaïlande", "Malaisie",
  "Singapour", "Indonésie", "Philippines", "Bangladesh", "Pakistan", "Sri Lanka", "Cambodge"]);
const AFRIQUE_MO = new Set(["Afrique du Sud", "Maroc", "Égypte", "Kenya", "Tunisie", "Jordanie", "Israël",
  "Émirats arabes unis", "Arabie saoudite", "Rwanda", "Tanzanie", "Seychelles", "Iran"]);

// Codes ISO restés bruts dans le registre EPA.
const ISO_PAYS: Record<string, string> = {
  KHM: "Cambodge", DOM: "République dominicaine", PAN: "Panama", KEN: "Kenya", SLV: "Salvador",
  VEN: "Venezuela", HND: "Honduras", ISL: "Islande", TTO: "Trinité-et-Tobago", ANT: "Antilles néerlandaises",
  BLR: "Biélorussie", BOL: "Bolivie", BRB: "Barbade", FJI: "Fidji", KAZ: "Kazakhstan", MCO: "Monaco",
  NIC: "Nicaragua", PNG: "Papouasie-Nouvelle-Guinée", RWA: "Rwanda", SYC: "Seychelles", TZA: "Tanzanie",
  XKX: "Kosovo", "INDONÉSIA": "Indonésie",
};

// Siège des grands groupes : le registre EPA donne le pays du SITE (BASF Corporation
// en Afrique du Sud), un registre ouvert celui de la FILIALE (Nufarm SAS en France).
// Pour un groupe connu, le pays affiché est celui du siège.
const SIEGES: [RegExp, string][] = [
  [/\bbayer\b/i, "Allemagne"], [/\bbasf\b/i, "Allemagne"], [/\bsyngenta\b/i, "Suisse"],
  [/\b(corteva|dow agro|dupont|du pont)\b/i, "États-Unis"], [/\bfmc\b/i, "États-Unis"],
  [/\badama\b|makhteshim|\bagan\b/i, "Israël"], [/\bupl\b|united phosphorus/i, "Inde"],
  [/\bnufarm\b/i, "Australie"], [/\bsumitomo\b/i, "Japon"], [/\bnissan chemical\b/i, "Japon"],
  [/\bsipcam\b/i, "Italie"], [/\bisagro\b/i, "Italie"], [/\bgowan\b/i, "États-Unis"],
  [/\bamvac\b|american vanguard/i, "États-Unis"], [/\bcheminova\b/i, "Danemark"],
  [/\barysta\b/i, "Japon"], [/\bascenza\b/i, "Portugal"], [/\bajinomoto\b/i, "Japon"],
];

function siege(nom: string): string | null {
  for (const [re, pays] of SIEGES) if (re.test(nom)) return pays;
  return null;
}

export function region(pays: string): Region {
  if (pays === "Chine" || pays === "Hong Kong") return "Chine";
  if (pays === "Inde") return "Inde";
  if (CEI.has(pays)) return "Russie et CEI";
  if (AMERIQUE_LATINE.has(pays) && !OCDE.has(pays)) return "Amérique latine";
  if (OCDE.has(pays)) return "OCDE";
  if (ASIE.has(pays)) return "Asie (autres)";
  if (AFRIQUE_MO.has(pays)) return "Afrique et Moyen-Orient";
  if (["Bulgarie", "Roumanie", "Croatie", "Serbie", "Kosovo", "Monaco", "Antilles néerlandaises"].includes(pays))
    return "Europe hors OCDE";
  return "Autres";
}

/** Un fabricant est-il dans la région choisie ? (l'OCDE latino-américaine compte dans les deux) */
export function dansRegion(f: Fabricant, r: Region): boolean {
  if (r === "Amérique latine") return AMERIQUE_LATINE.has(f.pays);
  if (r === "OCDE") return OCDE.has(f.pays);
  return f.region === r;
}

const FORMES = new Set(["co", "ltd", "limited", "inc", "incorporated", "corp", "corporation", "company",
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

const AGRO = /chem|agro|agri|pestic|crop|bio|scien|pharm|insectic|herbic|fungic|plant|nong|seed|fertil|kimya|tarim|quimic|veter|garden|hua|yao/i;

const LIBELLE_SOURCE: Record<Registre, string> = {
  onssa: "Maroc", australie: "Australie", epa: "États-Unis (EPA)", chine: "Chine (ICAMA)",
  turquie: "Turquie", russie: "Russie", bresil: "Brésil", coree: "Corée",
};

/** « AZOXYSTROBIN », « Azoxystrobine » : une seule molécule, la première écriture en casse mixte gardée. */
function dedoublonner(mols: string[]): string[] {
  const par = new Map<string, string>();
  for (const m of mols) {
    const k = m.split(/\s*\(/)[0].normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
      .replace(/[^a-z0-9]/g, "").replace(/e$/, "");
    const deja = par.get(k);
    if (!deja || (deja === deja.toUpperCase() && m !== m.toUpperCase())) par.set(k, m);
  }
  return [...par.values()];
}

function construire(): Fabricant[] {
  const par = new Map<string, Fabricant & { _registres: Set<string>; _molecules: Set<string> }>();

  // Molécules connues, par source et par raison sociale.
  const molParNom = new Map<string, string[]>();
  const ajouterMol = (nom: string, mols: string[]) =>
    molParNom.set(cleFabricant(nom), [...(molParNom.get(cleFabricant(nom)) ?? []), ...mols]);
  const molOnssa = new Map<string, Set<string>>();
  for (const m of MATIERES) for (const f of m.fournisseurs) {
    const s = molOnssa.get(f) ?? new Set<string>();
    s.add(m.molecule);
    molOnssa.set(f, s);
  }
  for (const f of FOURNISSEURS) ajouterMol(f.nom, [...(molOnssa.get(f.nom) ?? [])]);
  for (const u of USINES_BRESIL) ajouterMol(u.nom, u.matieres);
  for (const p of ANNUAIRE_PISTES) ajouterMol(p.nom, p.matieres);
  for (const u of USINES_TURQUES) if (u.nom) ajouterMol(u.nom, u.matieresImal);
  for (const s of PRODUCTEURS_RUSSES) ajouterMol(s.latin || s.nom, s.matieres);
  for (const u of USINES_CHINE) ajouterMol(anglaisDe(u.nom)?.nomAnglais || u.glose || u.nom, u.matieres);

  const ajouter = (nom: string, pays: string, fiable: boolean, source: string, meToo: boolean, mols: string[] = []) => {
    pays = ISO_PAYS[pays] ?? pays;
    const s = siege(nom);
    if (s) {
      pays = s;
      fiable = true;
    }
    const cle = cleFabricant(nom);
    if (cle.length < 3) return;
    let f = par.get(cle);
    if (!f) {
      f = { cle, nom, pays, paysFiable: fiable, region: region(pays), registres: [], meToo: false,
        molecules: [], _registres: new Set(), _molecules: new Set() };
      par.set(cle, f);
    } else if (!f.paysFiable && fiable) {
      f.pays = pays; f.paysFiable = true; f.region = region(pays);
    }
    f._registres.add(source);
    f.meToo ||= meToo;
    for (const m of [...mols, ...(molParNom.get(cle) ?? [])]) f._molecules.add(m);
  };

  for (const e of TOUTES_ENTREES) {
    // Les noms chinois s'écrivent en anglais quand on le connaît, pour rejoindre l'EPA et le Brésil.
    let nom = e.nom;
    if (e.registre === "chine") {
      const han = e.id.slice(3);
      const u = USINES_CHINE.find((x) => x.nom === han);
      nom = (u && (anglaisDe(u.nom)?.nomAnglais || u.glose)) || e.nom;
    }
    ajouter(nom, e.pays, e.paysFiable, LIBELLE_SOURCE[e.registre], e.meToo);
  }
  for (const r of REGISTRES_OUVERTS) {
    for (const s of r.societes as { nom: string; matieres: string[]; pays?: string | null; paysFiable?: boolean }[]) {
      const nom = s.nom.replace(/\*+$/, "").trim();
      ajouter(nom, s.pays || (r.id === "echa" ? "Union européenne" : r.pays), Boolean(s.pays && s.paysFiable),
        r.pays === "Union européenne" ? "UE (ECHA)" : r.pays, false, s.matieres);
    }
  }

  return [...par.values()]
    .filter((f) => !(f._registres.size === 1 && f._registres.has("États-Unis (EPA)") && !AGRO.test(f.nom)))
    .map(({ _registres, _molecules, ...f }) => ({
      ...f,
      registres: [..._registres].sort(),
      molecules: dedoublonner([..._molecules]).sort((a, b) => a.localeCompare(b, "fr")),
    }))
    .sort((a, b) => b.registres.length - a.registres.length || b.molecules.length - a.molecules.length || a.nom.localeCompare(b.nom));
}

export const ANNUAIRE: Fabricant[] = construire();

export const STATS_ANNUAIRE = {
  nbFabricants: ANNUAIRE.length,
  nbPays: new Set(ANNUAIRE.map((f) => f.pays)).size,
  parRegion: REGIONS.map((r) => ({ region: r, nb: ANNUAIRE.filter((f) => dansRegion(f, r)).length })),
};
