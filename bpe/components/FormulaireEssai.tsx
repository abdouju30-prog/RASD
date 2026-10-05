"use client";

import { useRouter } from "next/navigation";
import { ChangeEvent } from "react";
import type { GroupeCible } from "@/lib/essai";
import { RechercheListe, type Choix } from "./RechercheListe";

export function FormulaireEssai({
  cultures,
  cibles,
  groupes = [],
  matieres,
  culture,
  cible,
  matiereIds,
  base = "/essai",
  extra,
  masquerSubmit = false,
}: {
  cultures: Choix[];
  cibles: string[];
  groupes?: GroupeCible[];
  matieres: Choix[];
  culture: string;
  cible: string;
  matiereIds: string[];
  base?: string;
  extra?: Record<string, string>;
  masquerSubmit?: boolean;
}) {
  const router = useRouter();

  function aller(next: { culture?: string; cible?: string; m?: string[] }) {
    const q = new URLSearchParams();
    for (const [cle, valeur] of Object.entries(extra ?? {})) {
      if (valeur) q.set(cle, valeur);
    }
    if (next.culture) q.set("culture", next.culture);
    if (next.cible) q.set("cible", next.cible);
    for (const id of next.m ?? []) {
      if (id) q.append("m", id);
    }
    const s = q.toString();
    const ancre = base === "/essai" ? "#grille" : "";
    router.push(s ? `${base}?${s}${ancre}` : base);
  }

  function onCible(e: ChangeEvent<HTMLSelectElement>) {
    aller({ culture, cible: e.currentTarget.value, m: matiereIds });
  }

  const slots = [0, 1, 2].map((i) => matiereIds[i] ?? "");

  return (
    <form
      className="grid gap-3 rounded border border-[var(--line)] bg-[var(--surface)] p-4"
      onSubmit={(e) => {
        e.preventDefault();
        aller({ culture, cible, m: matiereIds });
      }}
    >
      <label className="grid gap-1 text-sm">
        Culture
        <RechercheListe
          name="culture"
          choix={cultures}
          value={culture}
          placeholder="Écrire une culture"
          onChoisir={(id) => aller({ culture: id })}
        />
      </label>
      <label className="grid gap-1 text-sm">
        Cible{culture ? ` · ${cibles.length}` : ""}
        <select
          name="cible"
          defaultValue={cible}
          key={culture + cible}
          className="rounded border border-[var(--line)] bg-[var(--bg)] px-2 py-2"
          onChange={onCible}
        >
          <option value="">{culture ? "Toutes" : "Choisir une culture"}</option>
          {groupes.length
            ? groupes.map((g) => (
                <optgroup key={g.titre} label={g.titre}>
                  {g.noms.map((c) => (
                    <option key={`${g.titre}/${c}`} value={c}>
                      {c}
                    </option>
                  ))}
                </optgroup>
              ))
            : cibles.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
        </select>
      </label>
      {slots.map((id, i) => (
        <label key={i} className="grid gap-1 text-sm">
          Matière active {i + 1}
          {i === 0 ? "" : " (facultative)"}
          <RechercheListe
            name="m"
            choix={matieres}
            value={id}
            placeholder="Écrire une matière active"
            onChoisir={(suivant) => {
              const m = [...slots];
              m[i] = suivant;
              aller({ culture, cible, m });
            }}
          />
        </label>
      ))}
      {!masquerSubmit && (
        <button className="rounded bg-[var(--accent)] px-3 py-2 text-[var(--accent-fg)] sm:w-fit">Préparer</button>
      )}
    </form>
  );
}
