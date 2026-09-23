"use client";

import { useRouter } from "next/navigation";
import { FormEvent } from "react";

/** Reloads the trial as soon as a field changes, so targets are not an empty list. */
export function FormulaireEssai({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  function aller(form: HTMLFormElement) {
    const data = new FormData(form);
    const q = new URLSearchParams();
    for (const [cle, valeur] of data.entries()) {
      if (typeof valeur === "string" && valeur) q.append(cle, valeur);
    }
    const s = q.toString();
    router.push(s ? `/essai?${s}#grille` : "/essai");
  }

  function onChange(e: FormEvent<HTMLFormElement>) {
    const cibleEvenement = e.target;
    if (!(cibleEvenement instanceof HTMLSelectElement)) return;
    const form = cibleEvenement.form;
    if (!form) return;
    if (cibleEvenement.name === "culture") {
      const champCible = form.elements.namedItem("cible");
      if (champCible instanceof HTMLSelectElement) champCible.value = "";
      form.querySelectorAll<HTMLSelectElement>('select[name="m"]').forEach((s) => {
        s.value = "";
      });
    }
    aller(form);
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    aller(e.currentTarget);
  }

  return (
    <form className="grid gap-3 rounded border border-[var(--line)] bg-[var(--surface)] p-4" onChange={onChange} onSubmit={onSubmit}>
      {children}
    </form>
  );
}
