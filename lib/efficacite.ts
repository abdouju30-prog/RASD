import fichier from "../data/efficacite.json";

// ────────────────────────────────────────────────────────────────────────────
// LES TAUX D'EFFICACITÉ — pourquoi ils se saisissent, et ne se déduisent pas
//
// AUCUN DES NEUF REGISTRES DE L'OUTIL NE PUBLIE DE POURCENTAGE D'EFFICACITÉ.
// Vérifié un par un : ONSSA, E-Phy (Anses), PUBCRIS (Australie), EPA, ICAMA
// (Chine), BKÜ (Turquie), catalogue russe, AGROFIT (Brésil), PSIS (Corée). Tous
// publient l'usage, la dose, le délai avant récolte ; aucun ne publie le taux
// d'abattement mesuré. Ces chiffres vivent dans les rapports d'essais
// biologiques du dossier d'homologation, qui sont couverts par la protection
// des données.
//
// UN TAUX INVENTÉ SERAIT LA PIRE DONNÉE QUE CET OUTIL PUISSE PORTER. Une dose
// fausse se rattrape à la lecture de l'étiquette ; un « 92 % sur Tuta absoluta »
// sorti de nulle part se retrouve dans un argumentaire commercial, puis dans une
// recommandation à un agriculteur. La règle du projet — ne jamais inventer une
// donnée absente de la source — n'a nulle part plus de conséquences qu'ici.
//
// D'OÙ CE FICHIER. Il se remplit à la main, à partir de ce que vous avez le
// droit d'utiliser : vos propres essais, les fiches techniques de vos
// fournisseurs, les rapports d'expérimentation officiels. Chaque ligne porte sa
// source, sa date et son protocole. Rien n'y entre sans provenance.
// ────────────────────────────────────────────────────────────────────────────

export interface Essai {
  /** Molécule, telle qu'elle s'écrit à l'index ONSSA. */
  matiere: string;
  culture: string;
  cible: string;
  /** Taux d'efficacité mesuré, en pourcentage. */
  efficacite: number;
  /** Dose à laquelle il a été mesuré — un taux sans dose ne veut rien dire. */
  dose: string | null;
  /** Jours après traitement au moment de la notation. */
  jours: number | null;
  /** D'où vient le chiffre : essai interne, fiche fournisseur, publication. */
  source: string;
  /** Date du relevé ou de la publication. */
  date: string | null;
  /** Protocole, nombre de répétitions, lieu — ce qui rend le chiffre lisible. */
  protocole: string | null;
}

interface Fichier {
  _lisezmoi: string[];
  essais: Essai[];
}

const F = fichier as unknown as Fichier;

export const ESSAIS: Essai[] = F.essais ?? [];

const PAR_MATIERE = new Map<string, Essai[]>();
for (const e of ESSAIS) {
  const k = e.matiere.toLowerCase();
  const l = PAR_MATIERE.get(k) ?? [];
  l.push(e);
  PAR_MATIERE.set(k, l);
}

/** Essais renseignés pour une molécule, du plus efficace au moins. */
export function essaisDe(molecules: string[]): Essai[] {
  const out: Essai[] = [];
  for (const m of molecules) out.push(...(PAR_MATIERE.get(m.toLowerCase()) ?? []));
  return out.sort((a, b) => b.efficacite - a.efficacite);
}

/** Essai correspondant exactement à un couple culture / cible, s'il existe. */
export function essaiPour(molecules: string[], culture: string, cible: string): Essai | null {
  return (
    essaisDe(molecules).find((e) => e.culture === culture && e.cible === cible) ?? null
  );
}

export const STATS_EFFICACITE = {
  nbEssais: ESSAIS.length,
  nbMatieres: PAR_MATIERE.size,
  nbSources: new Set(ESSAIS.map((e) => e.source)).size,
};
