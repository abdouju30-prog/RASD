"use client";

import { useRouter } from "next/navigation";
import { QUESTIONS } from "@/lib/procedures";
import type { GroupeCible } from "@/lib/essai";
import { RechercheListe, type Choix } from "./RechercheListe";

export function SchemaQuestion({
  question,
  cultureId,
  cible,
  matiereIds,
  cultures,
  groupes,
  matieres,
  plan = "",
}: {
  question: string;
  cultureId: string;
  cible: string;
  matiereIds: string[];
  cultures: Choix[];
  groupes: GroupeCible[];
  matieres: Choix[];
  plan?: string;
}) {
  const router = useRouter();
  const slots = [0, 1, 2].map((i) => matiereIds[i] ?? "");
  const cibles: Choix[] = groupes.flatMap((g) =>
    g.noms.map((nom) => ({
      value: nom,
      label: groupes.length > 1 ? `${nom} · ${g.titre}` : nom,
    }))
  );

  function aller(next: { culture?: string; cible?: string; m?: string[]; question?: string }) {
    const q = new URLSearchParams();
    q.set("etape", "question");
    const questionId = next.question ?? question;
    if (questionId) q.set("question", questionId);
    const culture = next.culture ?? cultureId;
    if (culture) q.set("culture", culture);
    const cibleSuivante = next.culture && next.culture !== cultureId ? "" : (next.cible ?? cible);
    if (cibleSuivante) q.set("cible", cibleSuivante);
    const ids = next.culture && next.culture !== cultureId ? [] : (next.m ?? matiereIds);
    for (const id of ids) {
      if (id) q.append("m", id);
    }
    if (plan) q.set("plan", plan);
    router.push(`/procedures?${q}`);
  }

  return (
    <figure className="schema">
      <div className="chaine">
        <div>
          <strong>1. Culture</strong>
          <RechercheListe
            name="culture"
            choix={cultures}
            value={cultureId}
            placeholder="Écrire, les propositions s'affichent"
            onChoisir={(id) => aller({ culture: id })}
          />
        </div>
        <div>
          <strong>2. Cible</strong>
          <RechercheListe
            name="cible"
            choix={cibles}
            value={cible}
            placeholder={cultureId ? "Écrire, les propositions s'affichent" : "Culture d'abord"}
            onChoisir={(nom) => aller({ cible: nom })}
          />
        </div>
        <div>
          <strong>3. Question</strong>
          <div className="choix-question">
            {QUESTIONS.map((q) => (
              <button
                key={q.id}
                type="button"
                aria-pressed={question === q.id}
                onClick={() => aller({ question: q.id })}
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <p className="ordre-alpha">Ordre alphabétique. Aucun classement d&apos;efficacité.</p>
      <div className="chaine">
        {slots.map((id, i) => (
          <div key={i}>
            <strong>{i === 0 ? "Matière" : `Matière ${i + 1}`}</strong>
            <RechercheListe
              name="m"
              choix={matieres}
              value={id}
              placeholder="Écrire, les propositions s'affichent"
              onChoisir={(suivant) => {
                const m = [...slots];
                m[i] = suivant;
                aller({ m });
              }}
            />
          </div>
        ))}
      </div>
    </figure>
  );
}
