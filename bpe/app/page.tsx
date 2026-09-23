import Link from "next/link";
import { CULTURES, MATIERES, MELANGES, CORPUS } from "@/lib/corpus";

export default function Page() {
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-4xl">BPE</h1>
        <p className="mt-2 max-w-2xl text-[var(--muted)]">
          Spectre des cultures et des matières actives, mélanges formulés, et préparation
          d&apos;un essai. Homologa reste intact.
        </p>
      </div>
      <dl className="grid grid-cols-3 gap-3">
        {[
          [MATIERES.length, "Matières", "/spectre"],
          [CULTURES.length, "Cultures", "/cultures"],
          [MELANGES.length, "Mélanges", "/melanges"],
        ].map(([n, label, href]) => (
          <Link
            key={String(href)}
            href={String(href)}
            className="rounded border border-[var(--line)] bg-[var(--surface)] p-3 no-underline"
          >
            <dt className="text-sm text-[var(--muted)]">{label}</dt>
            <dd className="text-2xl text-[var(--ink)]">{n}</dd>
          </Link>
        ))}
      </dl>
      <section className="grid gap-3 sm:grid-cols-2">
        <Link href="/essai" className="rounded border border-[var(--accent)] bg-[var(--fond)] p-4 no-underline">
          <h2 className="text-xl text-[var(--ink)]">Préparer un essai</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Culture, cible, une à trois matières actives. Précédents de dose et mélange
            formulé, s&apos;il existe.
          </p>
        </Link>
        <Link href="/procedures" className="rounded border border-[var(--line)] bg-[var(--surface)] p-4 no-underline">
          <h2 className="text-xl text-[var(--ink)]">Parcours</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Une étape à la fois. La validation ouvre la suivante, jusqu&apos;au bilan.
          </p>
        </Link>
      </section>
      <p className="text-sm text-[var(--muted)]">
        Index du {CORPUS.meta.genereIndex ?? "—"}
      </p>
    </div>
  );
}
