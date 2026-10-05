export interface ApplicationSaisie {
  volumePrevu: string;
  volumeReel: string;
  buses: string;
  heure: string;
  temperature: string;
  vent: string;
  ecart: string;
}

export const CHOIX_APPLICATION: Record<keyof ApplicationSaisie, string[]> = {
  volumePrevu: ["200", "300", "400", "500", "800", "1000", "1500", "2000"],
  volumeReel: ["200", "300", "400", "500", "800", "1000", "1500", "2000"],
  buses: ["110-02", "110-03", "110-04", "Anti-dérive", "Cône creux", "Miroir"],
  heure: ["6 h", "7 h", "8 h", "9 h", "16 h", "17 h", "18 h"],
  temperature: ["15", "18", "20", "22", "24", "26", "28", "30"],
  vent: ["Calme", "Faible, < 2 m/s", "2–3 m/s", "Fort, > 3 m/s"],
  ecart: ["Aucun", "Dose", "Volume", "Buses", "Heure", "Météo", "Stade", "Matériel"],
};

export const APPLICATION_VIDE: ApplicationSaisie = {
  volumePrevu: "",
  volumeReel: "",
  buses: "",
  heure: "",
  temperature: "",
  vent: "",
  ecart: "",
};

const CLES = [
  ["vp", "volumePrevu"],
  ["vr", "volumeReel"],
  ["bu", "buses"],
  ["he", "heure"],
  ["te", "temperature"],
  ["ve", "vent"],
  ["ec", "ecart"],
] as const;

export function lireApplication(sp: Record<string, string | string[] | undefined>): ApplicationSaisie {
  const saisie = { ...APPLICATION_VIDE };
  for (const [cle, champ] of CLES) {
    const brut = sp[cle];
    saisie[champ] = Array.isArray(brut) ? (brut[0] ?? "") : (brut ?? "");
  }
  return saisie;
}

export function ecrireApplication(q: URLSearchParams, saisie: ApplicationSaisie) {
  for (const [cle, champ] of CLES) {
    if (saisie[champ]) q.set(cle, saisie[champ]);
  }
}
