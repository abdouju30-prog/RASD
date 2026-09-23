"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Schema } from "./Schema";
import { SchemaApplication } from "./SchemaApplication";
import { SchemaCuve } from "./SchemaCuve";
import { SchemaDoses } from "./SchemaDoses";
import { SchemaDispositif } from "./SchemaDispositif";
import { SchemaQuestion } from "./SchemaQuestion";
import type { Choix } from "./RechercheListe";
import { ecrireApplication, type ApplicationSaisie } from "@/lib/application";
import { SCHEMAS, coderPlan } from "@/lib/dispositif";
import { ETAPES, enonceQuestion, questionParId, type Etape } from "@/lib/procedures";
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
  groupes,
  matieres,
  plan,
  appliquees,
  application,
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
  plan: string;
  appliquees: string[];
  application: ApplicationSaisie;
}) {
  const [dosesAppliquees, setDosesAppliquees] = useState(appliquees);
  const [appli, setAppli] = useState(application);
  const router = useRouter();
  const index = Math.max(0, ETAPES.findIndex((e) => e.id === etape.id));
  const planLien = plan || (index >= 1 ? coderPlan(SCHEMAS[0].blocs) : "");
  const suivante = ETAPES[index + 1];
  const precedente = ETAPES[index - 1];
  const choix = questionParId(question);

  function href(idEtape: string, q = question, planForce?: string) {
    const params = new URLSearchParams();
    params.set("etape", idEtape);
    if (q) params.set("question", q);
    if (cultureId) params.set("culture", cultureId);
    if (cible) params.set("cible", cible);
    for (const id of matiereIds) params.append("m", id);
    const choisi = planForce || planLien;
    if (choisi) params.set("plan", choisi);
    for (const dose of dosesAppliquees) params.append("da", dose);
    ecrireApplication(params, appli);
    return `/procedures?${params}`;
  }

  function bilanHref() {
    const params = new URLSearchParams();
    if (question) params.set("question", question);
    if (cultureId) params.set("culture", cultureId);
    if (cible) params.set("cible", cible);
    for (const id of matiereIds) params.append("m", id);
    if (planLien) params.set("plan", planLien);
    for (const dose of dosesAppliquees) params.append("da", dose);
    ecrireApplication(params, appli);
    const s = params.toString();
    return s ? `/rapport?${s}` : "/rapport";
  }

  const enonce = enonceQuestion({ question, culture: cultureNom, cible, matieres: matiereNoms });
  const peutContinuer =
    etape.id !== "question" || (Boolean(choix) && Boolean(cultureId) && Boolean(cible) && matiereIds.length > 0);

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
      {etape.id === "question" ? (
        <SchemaQuestion
          question={question}
          cultureId={cultureId}
          cultureNom={cultureNom}
          cible={cible}
          matiereIds={matiereIds}
          cultures={cultures}
          groupes={groupes}
          matieres={matieres}
          nomsMatieres={matiereNoms}
          plan={plan}
          appliquees={dosesAppliquees}
          application={appli}
        />
      ) : etape.id === "dispositif" ? (
        <SchemaDispositif plan={plan} onPlan={(suivant) => router.push(href(etape.id, question, suivant))} />
      ) : etape.id === "doses" ? (
        <SchemaDoses
          lignes={precedents}
          appliquees={dosesAppliquees}
          onAppliquee={(i, valeur) =>
            setDosesAppliquees((courant) => {
              const suivant = [...courant];
              suivant[i] = valeur;
              return suivant;
            })
          }
        />
      ) : etape.id === "application" ? (
        <SchemaApplication doses={dosesAppliquees} saisie={appli} onSaisie={setAppli} />
      ) : etape.id === "melange" ? (
        <SchemaCuve noms={matiereNoms} melanges={melanges} />
      ) : (
        etape.schemas.map((id) => <Schema key={id} id={id} />)
      )}
      {etape.id !== "question" && etape.id !== "doses" && etape.id !== "melange" && etape.id !== "application" && (
        <p>{etape.texte}</p>
      )}
      {etape.id !== "question" && (
        <p className="text-sm">
          {enonce || [cultureNom, cible, choix?.label, matiereNoms.join(", ")].filter(Boolean).join(" · ") || "Culture non choisie"}
        </p>
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
