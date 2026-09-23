"use client";

import {
  CODES,
  EXPLICATIONS,
  SCHEMAS,
  ajouterBloc,
  coderPlan,
  decoderPlan,
  modifierCase,
  retirerBloc,
  schemaDuPlan,
} from "@/lib/dispositif";

export function SchemaDispositif({ plan, onPlan }: { plan: string; onPlan: (plan: string) => void }) {
  const blocs = decoderPlan(plan || undefined);
  const actif = schemaDuPlan(blocs);

  function poser(suivant: string[][]) {
    onPlan(coderPlan(suivant));
  }

  const colonnes = Math.max(...blocs.map((l) => l.length), 1);

  return (
    <figure className="schema">
      <div className="choix-question">
        {SCHEMAS.map((s) => (
          <button key={s.id} type="button" aria-pressed={actif === s.id} onClick={() => poser(s.blocs.map((l) => [...l]))}>
            {s.titre}
          </button>
        ))}
      </div>
      <div className="grille-blocs">
        <div className="rangee-bloc" style={{ gridTemplateColumns: `4.6rem repeat(${colonnes}, minmax(0, 1fr))` }}>
          <span />
          {Array.from({ length: colonnes }, (_, i) => (
            <span key={i} className="etiquette">
              parcelle
            </span>
          ))}
        </div>
        {blocs.map((ligne, i) => (
          <div key={i} className="rangee-bloc" style={{ gridTemplateColumns: `4.6rem repeat(${colonnes}, minmax(0, 1fr))` }}>
            <span className="etiquette">
              Bloc {i + 1}
              <button type="button" className="lien-retirer" onClick={() => poser(retirerBloc(blocs, i))} disabled={blocs.length <= 1}>
                Retirer
              </button>
            </span>
            {ligne.map((mod, j) => (
              <select
                key={j}
                className={`case-mod ${mod === "T0" ? "t0" : ""} ${mod === "R" ? "ref" : ""}`}
                value={mod}
                aria-label={`Bloc ${i + 1}, parcelle ${j + 1}`}
                onChange={(e) => poser(modifierCase(blocs, i, j, e.target.value))}
              >
                {CODES.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            ))}
          </div>
        ))}
      </div>
      <button type="button" className="bouton-second" onClick={() => poser(ajouterBloc(blocs))} disabled={blocs.length >= 8}>
        Ajouter un bloc
      </button>
      <ul className="explications">
        {EXPLICATIONS.map((e) => (
          <li key={e.code}>
            <strong>{e.code}</strong> {e.texte}
          </li>
        ))}
      </ul>
    </figure>
  );
}
