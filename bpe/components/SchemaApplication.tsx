"use client";

import type { ApplicationSaisie } from "@/lib/application";

export function SchemaApplication({
  doses,
  saisie,
  onSaisie,
}: {
  doses: string[];
  saisie: ApplicationSaisie;
  onSaisie: (saisie: ApplicationSaisie) => void;
}) {
  const dose = doses.map((d) => d.trim()).filter(Boolean).join(" · ");

  function champ(cle: keyof ApplicationSaisie, etiquette: string, placeholder: string) {
    return (
      <label className="grid gap-1">
        <span className="etiquette">{etiquette}</span>
        <input
          value={saisie[cle]}
          placeholder={placeholder}
          onChange={(e) => onSaisie({ ...saisie, [cle]: e.target.value })}
        />
      </label>
    );
  }

  return (
    <div className="schema grid gap-3">
      <div>
        <p className="etiquette">Dose du jour</p>
        <p className="case-mod">{dose || "à saisir à l'étape Doses"}</p>
      </div>
      <div className="saisies">
        {champ("volumePrevu", "Volume prévu L/ha", "ex. 400")}
        {champ("volumeReel", "Volume réel L/ha", "mesuré")}
        {champ("buses", "Buses", "type et débit")}
        {champ("heure", "Heure", "ex. 07:30")}
        {champ("temperature", "Température", "°C")}
        {champ("vent", "Vent", "calme, faible…")}
        {champ("ecart", "Écart", "rien, ou le décrire")}
      </div>
    </div>
  );
}
