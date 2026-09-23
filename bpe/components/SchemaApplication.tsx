"use client";

import type { ApplicationSaisie } from "@/lib/application";

export function SchemaApplication({
  doses,
  saisie,
  onSaisie,
  onDoses,
}: {
  doses: string[];
  saisie: ApplicationSaisie;
  onSaisie: (saisie: ApplicationSaisie) => void;
  onDoses: (doses: string[]) => void;
}) {
  const lignes = doses.length ? doses : [""];

  function champ(cle: keyof ApplicationSaisie, etiquette: string) {
    return (
      <label className="grid gap-1">
        <span className="etiquette">{etiquette}</span>
        <input value={saisie[cle]} onChange={(e) => onSaisie({ ...saisie, [cle]: e.target.value })} />
      </label>
    );
  }

  return (
    <div className="schema grid gap-3">
      {lignes.map((dose, i) => (
        <label key={i} className="grid gap-1">
          <span className="etiquette">Dose du jour {lignes.length > 1 ? i + 1 : ""}</span>
          <input
            value={dose}
            onChange={(e) => {
              const suivant = [...lignes];
              suivant[i] = e.target.value;
              onDoses(suivant);
            }}
          />
        </label>
      ))}
      <div className="saisies">
        {champ("volumePrevu", "Volume prévu L/ha")}
        {champ("volumeReel", "Volume réel L/ha")}
        {champ("buses", "Buses")}
        {champ("heure", "Heure")}
        {champ("temperature", "Température °C")}
        {champ("vent", "Vent")}
        {champ("ecart", "Écart")}
      </div>
    </div>
  );
}
