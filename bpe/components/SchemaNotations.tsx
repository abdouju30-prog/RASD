"use client";

import { useState } from "react";
import { codesANoter } from "@/lib/dispositif";
import {
  AJOUTS_JOURS,
  ECHELLE_PLANTE,
  GESTES,
  SOMMES,
  STADES,
  SYMPTOMES,
  afficherDate,
  appliquerDates,
  insererDelai,
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
  const [autreJour, setAutreJour] = useState("");
  const modalites = codesANoter(plan);
  const nomCible = cible || "la cible";
  const nomProduit = produit || "le produit";
  const nomCulture = culture || "la culture";
  const darJours = joursDar(dar);
  const index = Math.min(actif, Math.max(0, lignes.length - 1));
  const ligne = lignes[index];

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

  function ajouter(jours: number) {
    if (!Number.isInteger(jours) || jours < 1 || jours > 120) return;
    const moment = `J+${jours}`;
    const existe = lignes.findIndex((l) => l.moment === moment);
    if (existe >= 0) {
      setActif(existe);
      return;
    }
    poser(insererDelai(lignes, jours), moment);
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
        <p className="etiquette">Notations</p>
        <div className="choix-champ">
          {lignes.map((l, i) => (
            <button key={l.moment} type="button" aria-pressed={i === index} onClick={() => setActif(i)}>
              {l.moment}
              {l.date ? ` ${afficherDate(l.date)}` : ""}
            </button>
          ))}
        </div>
        <p className="etiquette">Ajouter une notation après le traitement</p>
        <div className="choix-champ">
          {AJOUTS_JOURS.map((jours) => {
            const moment = `J+${jours}`;
            const existe = lignes.some((l) => l.moment === moment);
            return (
              <button key={jours} type="button" aria-pressed={existe} onClick={() => ajouter(jours)}>
                {jours} j
              </button>
            );
          })}
        </div>
        <div className="ligne-champ">
          <label className="ligne-champ">
            <span className="etiquette">Autre délai, jours</span>
            <input
              inputMode="numeric"
              value={autreJour}
              onChange={(e) => setAutreJour(e.target.value.replace(/\D/g, "").slice(0, 3))}
            />
          </label>
          <button type="button" className="bouton-second" disabled={!autreJour} onClick={() => ajouter(Number(autreJour))}>
            Ajouter
          </button>
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
