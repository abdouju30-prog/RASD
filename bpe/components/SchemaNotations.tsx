"use client";

import type { Notation } from "@/lib/notations";

export function SchemaNotations({
  lignes,
  onChange,
}: {
  lignes: Notation[];
  onChange: (lignes: Notation[]) => void;
}) {
  function maj(index: number, champ: keyof Notation, valeur: string) {
    onChange(lignes.map((l, i) => (i === index ? { ...l, [champ]: valeur } : l)));
  }

  return (
    <div className="grid gap-3">
      {lignes.map((l, i) => (
        <section key={i} className="schema grid gap-2">
          <label className="grid gap-1">
            <span className="etiquette">Moment</span>
            <input value={l.moment} onChange={(e) => maj(i, "moment", e.target.value)} />
          </label>
          <div className="saisies">
            <label className="grid gap-1">
              <span className="etiquette">Date</span>
              <input value={l.date} onChange={(e) => maj(i, "date", e.target.value)} />
            </label>
            <label className="grid gap-1">
              <span className="etiquette">Stade</span>
              <input value={l.stade} onChange={(e) => maj(i, "stade", e.target.value)} />
            </label>
            <label className="grid gap-1">
              <span className="etiquette">Efficacité, note brute</span>
              <input value={l.efficacite} onChange={(e) => maj(i, "efficacite", e.target.value)} />
            </label>
            <label className="grid gap-1">
              <span className="etiquette">Sélectivité, symptôme</span>
              <input value={l.selectivite} onChange={(e) => maj(i, "selectivite", e.target.value)} />
            </label>
          </div>
          <button
            type="button"
            className="lien-retirer"
            disabled={lignes.length <= 1}
            onClick={() => onChange(lignes.filter((_, j) => j !== i))}
          >
            Retirer
          </button>
        </section>
      ))}
      <button
        type="button"
        className="bouton-second"
        disabled={lignes.length >= 8}
        onClick={() => onChange([...lignes, { moment: "J+", date: "", stade: "", efficacite: "", selectivite: "" }])}
      >
        Ajouter une date
      </button>
    </div>
  );
}
