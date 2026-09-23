"use client";

import { useState } from "react";
import { codesANoter } from "@/lib/dispositif";
import {
  DELAIS,
  ECHELLE_PLANTE,
  GESTES,
  SOMMES,
  STADES,
  SYMPTOMES,
  afficherDate,
  appliquerDates,
  joursDar,
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
  dar,
  traitement,
  onTraitement,
}: {
  lignes: Notation[];
  onChange: (lignes: Notation[]) => void;
  culture: string;
  cible: string;
  produit: string;
  plan: string;
  dar: string[];
  traitement: string;
  onTraitement: (jour: string) => void;
}) {
  const [actif, setActif] = useState(0);
  const modalites = codesANoter(plan);
  const nomCible = cible || "la cible";
  const nomProduit = produit || "le produit";
  const nomCulture = culture || "la culture";
  const darJours = joursDar(dar);
  const index = Math.min(actif, Math.max(0, lignes.length - 1));
  const ligne = lignes[index];
  const connus = new Set(DELAIS.map((d) => d.moment));

  function poser(suivantes: Notation[], moment?: string) {
    const dates = appliquerDates(suivantes, traitement, darJours);
    onChange(dates);
    if (moment) {
      const i = dates.findIndex((l) => l.moment === moment);
      if (i >= 0) setActif(i);
    }
  }

  function maj(patch: Partial<Notation>) {
    onChange(lignes.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  function noter(code: string, valeur: string) {
    maj({ notes: { ...ligne.notes, [code]: valeur } });
  }

  function choisirDelai(moment: string) {
    const existe = lignes.findIndex((l) => l.moment === moment);
    if (existe >= 0) {
      setActif(existe);
      return;
    }
    poser([...lignes, { moment, date: "", stade: "", notes: {}, selectivite: "" }], moment);
  }

  if (!ligne) return null;

  return (
    <div className="grid gap-3">
      <section className="schema grid gap-2">
        <p className="enonce">
          {nomProduit} réduit {nomCible} sur {nomCulture} si la somme est plus basse que T0. Dix plantes, même organe,
          pas de pourcentage.
        </p>
        <label className="grid gap-1">
          <span className="etiquette">Date du traitement</span>
          <input
            type="date"
            value={traitement}
            onChange={(e) => {
              const jour = e.target.value;
              onTraitement(jour);
              onChange(appliquerDates(lignes, jour, darJours));
            }}
          />
        </label>
        <p className="etiquette">Délais de notation</p>
        <div className="choix-champ">
          {DELAIS.map((delai) => {
            const i = lignes.findIndex((l) => l.moment === delai.moment);
            return (
              <button
                key={delai.moment}
                type="button"
                className={i >= 0 && i !== index ? "choix-present" : ""}
                aria-pressed={i === index}
                onClick={() => choisirDelai(delai.moment)}
              >
                {delai.moment}
                {delai.jours === null && darJours !== null ? ` J+${darJours}` : ""}
              </button>
            );
          })}
          {lignes
            .filter((l) => !connus.has(l.moment))
            .map((l) => (
              <button key={l.moment} type="button" aria-pressed={l === ligne} onClick={() => choisirDelai(l.moment)}>
                {l.moment}
              </button>
            ))}
        </div>
        <p>
          {dar.length
            ? `Délai avant récolte d'index : ${dar.join(" · ")}.${darJours !== null ? ` La récolte se note à J+${darJours}.` : ""}`
            : "Aucun délai avant récolte dans l'index pour ce choix."}
        </p>
      </section>

      <section className="schema grid gap-2">
        <h2>
          {ligne.moment}
          {ligne.date ? ` · ${afficherDate(ligne.date)}` : ""}
        </h2>
        <p>{roleMoment(ligne.moment)}</p>
        <label className="grid gap-1">
          <span className="etiquette">Stade</span>
          <input value={ligne.stade} onChange={(e) => maj({ stade: e.target.value })} />
        </label>
        <div className="choix-champ">
          {STADES.map((stade) => (
            <button key={stade} type="button" aria-pressed={ligne.stade === stade} onClick={() => maj({ stade })}>
              {stade}
            </button>
          ))}
        </div>
        {modalites.map((code) => (
          <div key={code} className="grid gap-1">
            <span className="etiquette">
              {code === "T0" ? "T0 témoin" : code === "R" ? "R référence" : `${code} ${nomCible}`} : {ligne.notes[code] || "—"}
            </span>
            <div className="choix-champ">
              {SOMMES.map((somme) => (
                <button
                  key={somme.valeur}
                  type="button"
                  aria-pressed={(ligne.notes[code] ?? "") === somme.valeur}
                  onClick={() => noter(code, somme.valeur)}
                >
                  {somme.valeur} {somme.sens}
                </button>
              ))}
            </div>
          </div>
        ))}
        <p className="enonce">{lectureEfficacite(ligne.notes, nomCible)}</p>
        <span className="etiquette">Sélectivité sur {nomCulture} : {ligne.selectivite || "—"}</span>
        <div className="choix-champ">
          {SYMPTOMES.map((symptome) => (
            <button
              key={symptome}
              type="button"
              aria-pressed={ligne.selectivite === symptome}
              onClick={() => maj({ selectivite: symptome })}
            >
              {symptome}
            </button>
          ))}
        </div>
        {index > 0 && (
          <button
            type="button"
            className="bouton-second"
            onClick={() => maj({ notes: { ...lignes[index - 1].notes }, selectivite: lignes[index - 1].selectivite })}
          >
            Reprendre les sommes de {lignes[index - 1].moment}
          </button>
        )}
        <button
          type="button"
          className="lien-retirer"
          disabled={lignes.length <= 1}
          onClick={() => {
            onChange(lignes.filter((_, i) => i !== index));
            setActif(Math.max(0, index - 1));
          }}
        >
          Retirer {ligne.moment}
        </button>
      </section>

      <details>
        <summary>Comment noter les 10 plantes</summary>
        <ol className="guide">
          {GESTES.map((geste) => (
            <li key={geste}>{geste.replace("la cible", nomCible)}</li>
          ))}
        </ol>
        <ul className="echelle">
          {ECHELLE_PLANTE.map((palier) => (
            <li key={palier.note}>
              <strong>{palier.note}</strong> {palier.sens}
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
