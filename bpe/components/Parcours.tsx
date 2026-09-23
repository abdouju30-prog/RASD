"use client";

import { useRouter } from "next/navigation";
import { FormulaireEssai } from "./FormulaireEssai";
import { Schema } from "./Schema";
import type { Choix } from "./RechercheListe";
import { ETAPES, QUESTIONS, questionParId, type Etape } from "@/lib/procedures";
import type { GroupeCible, Precedent } from "@/lib/essai";

export function Parcours({
  etape,
  question,
  cultureId,
  cultureNom,
  cible,
  matiereIds,
  matiereNoms,
  melanges,
  precedents,
  cultures,
  cibles,
  groupes,
  matieres,
}: {
  etape: Etape;
  question: string;
  cultureId: string;
  cultureNom: string;
  cible: string;
  matiereIds: string[];
  matiereNoms: string[];
  melanges: string[];
  precedents: Precedent[];
  cultures: Choix[];
  cibles: string[];
  groupes: GroupeCible[];
  matieres: Choix[];
}) {
  const router = useRouter();
  const index = Math.max(0, ETAPES.findIndex((e) => e.id === etape.id));
  const suivante = ETAPES[index + 1];
  const precedente = ETAPES[index - 1];
  const choix = questionParId(question);

  function href(idEtape: string, q = question) {
    const params = new URLSearchParams();
    params.set("etape", idEtape);
    if (q) params.set("question", q);
    if (cultureId) params.set("culture", cultureId);
    if (cible) params.set("cible", cible);
    for (const id of matiereIds) params.append("m", id);
    return `/procedures?${params}`;
  }

  function bilanHref() {
    const params = new URLSearchParams();
    if (question) params.set("question", question);
    if (cultureId) params.set("culture", cultureId);
    if (cible) params.set("cible", cible);
    for (const id of matiereIds) params.append("m", id);
    const s = params.toString();
    return s ? `/rapport?${s}` : "/rapport";
  }

  const peutContinuer = etape.id !== "question" || (Boolean(choix) && Boolean(cultureId));
  const sansCuve = etape.id === "melange" && matiereIds.length < 2;

  return (
    <article className="grid max-w-3xl gap-4">
      <ol className="jalons">
        {ETAPES.map((e, i) => (
          <li key={e.id} className={i === index ? "jalon-cours" : i < index ? "jalon-fait" : ""}>
            {i < index ? (
              <a href={href(e.id)}>{i + 1}</a>
            ) : (
              <span>{i + 1}</span>
            )}
          </li>
        ))}
      </ol>
      <h1 className="text-3xl">
        {index + 1}. {etape.titre}
      </h1>
      {etape.schemas.map((id) => (
        <Schema key={id} id={id} />
      ))}
      <p>{sansCuve ? "Pas de mélange en cuve." : etape.texte}</p>
      {etape.id === "question" && (
        <>
          <div className="choix-question">
            {QUESTIONS.map((q) => (
              <button
                key={q.id}
                type="button"
                aria-pressed={question === q.id}
                onClick={() => router.push(href(etape.id, q.id))}
              >
                {q.label}
              </button>
            ))}
          </div>
          <FormulaireEssai
            cultures={cultures}
            cibles={cibles}
            groupes={groupes}
            matieres={matieres}
            culture={cultureId}
            cible={cible}
            matiereIds={matiereIds}
            base="/procedures"
            extra={{ etape: "question", question }}
            masquerSubmit
          />
        </>
      )}
      {etape.id !== "question" && (
        <p className="text-sm">
          {[cultureNom, cible, choix?.label, matiereNoms.join(", ")].filter(Boolean).join(" · ") || "Culture non choisie"}
        </p>
      )}
      {etape.id === "doses" && precedents.length > 0 && (
        <table className="table-feuille">
          <thead>
            <tr>
              <th>Matière</th>
              <th>Dose index</th>
              <th>DAR index</th>
            </tr>
          </thead>
          <tbody>
            {precedents.map((p) => (
              <tr key={p.matiere + p.doses}>
                <td>{p.matiere || "—"}</td>
                <td>{p.doses}</td>
                <td>{p.dar}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {etape.id === "melange" && melanges.length > 0 && (
        <p className="text-sm">Déjà formulé : {melanges.join(" ; ")}. Cuve à part.</p>
      )}
      <div className="suite">
        {precedente && (
          <a className="bouton-second" href={href(precedente.id)}>
            Retour
          </a>
        )}
        {suivante &&
          (peutContinuer ? (
            <a className="bouton" href={href(suivante.id)}>
              Valider
            </a>
          ) : (
            <span className="bouton bouton-off">Valider</span>
          ))}
        {!suivante && (
          <a className="bouton" href={bilanHref()}>
            Valider et ouvrir le bilan
          </a>
        )}
      </div>
    </article>
  );
}
