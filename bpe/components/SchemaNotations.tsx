"use client";

import { codesANoter } from "@/lib/dispositif";
import {
  ECHELLE_PLANTE,
  GESTES,
  SOMMES,
  SYMPTOMES,
  lectureEfficacite,
  roleMoment,
  type Notation,
} from "@/lib/notations";

export function SchemaNotations({
  lignes,
  onChange,
  culture,
  cible,
  produit,
  plan,
}: {
  lignes: Notation[];
  onChange: (lignes: Notation[]) => void;
  culture: string;
  cible: string;
  produit: string;
  plan: string;
}) {
  const modalites = codesANoter(plan);
  const nomCible = cible || "la cible";
  const nomProduit = produit || "le produit";
  const nomCulture = culture || "la culture";

  function maj(index: number, patch: Partial<Notation>) {
    onChange(lignes.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  function noter(index: number, code: string, valeur: string) {
    const notes = { ...lignes[index].notes, [code]: valeur };
    maj(index, { notes });
  }

  return (
    <div className="grid gap-3">
      <section className="schema">
        <h2>Évaluer l&apos;efficacité</h2>
        <p className="enonce">
          {nomProduit} réduit {nomCible} sur {nomCulture} seulement si la somme de la parcelle traitée est plus basse que
          celle du témoin non traité (T0). Même jour, même organe, même nombre de plantes.
        </p>
        <ol className="guide">
          {GESTES.map((geste) => (
            <li key={geste}>{geste.replace("la cible", nomCible)}</li>
          ))}
        </ol>
        <p className="etiquette">Note d&apos;une plante</p>
        <ul className="echelle">
          {ECHELLE_PLANTE.map((palier) => (
            <li key={palier.note}>
              <strong>{palier.note}</strong> {palier.sens}
            </li>
          ))}
        </ul>
        <p>Somme des 10 plantes dans la case : 0, 10, 30, 50, 70 ou 100, ou un autre nombre.</p>
      </section>

      {lignes.map((l, i) => (
        <section key={i} className="schema grid gap-2">
          <label className="grid gap-1">
            <span className="etiquette">Moment</span>
            <input value={l.moment} onChange={(e) => maj(i, { moment: e.target.value })} />
          </label>
          <p>{roleMoment(l.moment)}</p>
          <div className="saisies">
            <label className="grid gap-1">
              <span className="etiquette">Date</span>
              <input value={l.date} onChange={(e) => maj(i, { date: e.target.value })} />
            </label>
            <label className="grid gap-1">
              <span className="etiquette">Stade</span>
              <input value={l.stade} onChange={(e) => maj(i, { stade: e.target.value })} />
            </label>
          </div>
          {modalites.map((code) => (
            <div key={code} className="grid gap-1">
              <label className="grid gap-1">
                <span className="etiquette">
                  {code === "T0"
                    ? "T0 témoin non traité, somme"
                    : code === "R"
                      ? "R référence, somme"
                      : `${code} produit, somme de ${nomCible}`}
                </span>
                <input value={l.notes[code] ?? ""} onChange={(e) => noter(i, code, e.target.value)} />
              </label>
              <div className="choix-champ">
                {SOMMES.map((somme) => (
                  <button
                    key={somme.valeur}
                    type="button"
                    aria-pressed={(l.notes[code] ?? "") === somme.valeur}
                    onClick={() => noter(i, code, somme.valeur)}
                  >
                    {somme.valeur} {somme.sens}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <p className="enonce">{lectureEfficacite(l.notes, nomCible)}</p>
          <div className="grid gap-1">
            <label className="grid gap-1">
              <span className="etiquette">Sélectivité, symptôme sur {nomCulture}</span>
              <input value={l.selectivite} onChange={(e) => maj(i, { selectivite: e.target.value })} />
            </label>
            <div className="choix-champ">
              {SYMPTOMES.map((symptome) => (
                <button
                  key={symptome}
                  type="button"
                  aria-pressed={l.selectivite === symptome}
                  onClick={() => maj(i, { selectivite: symptome })}
                >
                  {symptome}
                </button>
              ))}
            </div>
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
        onClick={() => onChange([...lignes, { moment: "J+", date: "", stade: "", notes: {}, selectivite: "" }])}
      >
        Ajouter une date
      </button>
    </div>
  );
}
