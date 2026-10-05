"use client";

import { CHOIX_APPLICATION, type ApplicationSaisie } from "@/lib/application";

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

  function champ(cle: keyof ApplicationSaisie, etiquette: string, large = false) {
    return (
      <div className={large ? "pleine grid gap-1" : "grid gap-1"}>
        <label className="ligne-champ">
          <span className="etiquette">{etiquette}</span>
          <input value={saisie[cle]} onChange={(e) => onSaisie({ ...saisie, [cle]: e.target.value })} />
        </label>
        <div className="choix-champ">
          {CHOIX_APPLICATION[cle].map((choix) => (
            <button
              key={choix}
              type="button"
              aria-pressed={saisie[cle] === choix}
              onClick={() => onSaisie({ ...saisie, [cle]: choix })}
            >
              {choix}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="schema grid gap-3">
      {lignes.map((dose, i) => (
        <label key={i} className="ligne-champ">
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
      <div className="grille-application">
        {champ("volumePrevu", "Volume prévu L/ha")}
        {champ("volumeReel", "Volume réel L/ha")}
        {champ("buses", "Buses")}
        {champ("heure", "Heure")}
        {champ("temperature", "Température °C")}
        {champ("vent", "Vent", true)}
        {champ("ecart", "Écart", true)}
      </div>
    </div>
  );
}
