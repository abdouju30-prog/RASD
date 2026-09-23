"use client";

import type { Precedent } from "@/lib/essai";

export function SchemaDoses({
  lignes,
  appliquees,
  onAppliquee,
}: {
  lignes: Precedent[];
  appliquees: string[];
  onAppliquee: (index: number, valeur: string) => void;
}) {
  const utiles = lignes.filter((l) => l.matiere);
  if (!utiles.length) {
    return <p>Choisir une matière à l&apos;étape Question.</p>;
  }
  return (
    <div className="grid gap-3">
      {utiles.map((l, i) => (
        <section key={l.matiere} className="schema">
          <h2 className="text-xl">{l.matiere}</h2>
          <div className="deux-col">
            <div>
              <p className="etiquette">Dose d&apos;index</p>
              {l.choixDoses.length ? (
                l.choixDoses.map((dose) => (
                  <button key={dose} type="button" className="bouton-second dose-prop" onClick={() => onAppliquee(i, dose)}>
                    {dose}
                  </button>
                ))
              ) : (
                <p className="case-mod">aucun emploi</p>
              )}
              <p className="etiquette">DAR d&apos;index</p>
              <p className="case-mod">{l.choixDar.length ? l.choixDar.join(" · ") : "—"}</p>
            </div>
            <label className="grid gap-1">
              <span className="etiquette">Dose appliquée</span>
              <input
                value={appliquees[i] ?? ""}
                placeholder="Écrire la dose du jour"
                onChange={(e) => onAppliquee(i, e.target.value)}
              />
            </label>
          </div>
        </section>
      ))}
    </div>
  );
}
