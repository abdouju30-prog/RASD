export interface ApplicationSaisie {
  volumePrevu: string;
  volumeReel: string;
  buses: string;
  heure: string;
  temperature: string;
  vent: string;
  ecart: string;
}

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
