"use client";

import { useState } from "react";
import { codesANoter } from "@/lib/dispositif";
import {
  ECHELLE_PLANTE,
  GESTES,
  SOMMES,
  STADES,
  SYMPTOMES,
  afficherDate,
  appliquerDates,
  insererDelai,
  joursDar,
  joursDuMoment,
  lectureEfficacite,
  notationRemplie,
  rangMoment,
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
  const premierVide = lignes.findIndex((l) => !notationRemplie(l));
  const [actif, setActif] = useState(premierVide >= 0 ? premierVide : 0);
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
  const notee = notationRemplie(ligne);
  const courant = joursDuMoment(ligne.moment) ?? -1;
  const suite = [14, 7, 10, 21, 28].filter(
    (jours) => jours > courant && !lignes.some((l) => l.moment === `J+${jours}`),
  );
  const recolte = lignes.findIndex((l) => /^récolte$|^recolte$/i.test(l.moment.trim()));

  function ajouterRecolte() {
    if (recolte >= 0) {
      setActif(recolte);
      return;
    }
    const suivantes = [...lignes, { moment: "Récolte", date: "", stade: "", notes: {}, selectivite: "" }].sort(
      (a, b) => rangMoment(a.moment) - rangMoment(b.moment),
    );
    poser(suivantes, "Récolte");
  }

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
        {lignes.some((l, i) => i !== index && notationRemplie(l)) && (
          <div className="choix-champ">
            {lignes.map((l, i) =>
              i === index || !notationRemplie(l) ? null : (
                <button key={l.moment} type="button" onClick={() => setActif(i)}>
                  {l.moment} noté{l.date ? ` ${afficherDate(l.date)}` : ""}
                </button>
              ),
            )}
          </div>
        )}
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

      {notee ? (
        <section className="schema grid gap-2">
          <p className="enonce">
            {ligne.moment} est noté. Plus tard, note J+14 ou un autre délai. Les sommes de {ligne.moment} restent.
          </p>
          <div className="choix-champ">
            {suite.map((jours) => (
              <button
                key={jours}
                type="button"
                className={jours === 14 ? "bouton" : "bouton-second"}
                onClick={() => ajouter(jours)}
              >
                Noter J+{jours}
              </button>
            ))}
            {recolte < 0 && (
              <button type="button" className="bouton-second" onClick={ajouterRecolte}>
                Noter la récolte
              </button>
            )}
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
              Noter J+{autreJour || "…"}
            </button>
          </div>
        </section>
      ) : (
        <p>
          {ligne.moment === "J0"
            ? "Note J0 maintenant. J+14, et les dates d'après, viendront ensuite."
            : `Note ${ligne.moment} maintenant. Les dates d'après viendront ensuite.`}
        </p>
      )}

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
