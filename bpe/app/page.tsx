import Link from "next/link";
import { CULTURES, MATIERES, MELANGES, ORGANISMES, CORPUS } from "@/lib/corpus";
import { PROCEDURES } from "@/lib/procedures";

export default function Page() {
  const ajouts = CULTURES.filter((c) => c.originePerimetres === "ajout-bpe").length;
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-4xl">BPE</h1>
        <p className="mt-2 max-w-2xl text-[var(--muted)]">
          Préparer un essai à partir du spectre des cultures et des matières actives,
          des mélanges déjà formulés, et des organismes agréés. Les procédures et les
          rattachements de cultures manquants sont ajoutés ici. Homologa reste intact.
        </p>
      </div>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          [MATIERES.length, "Matières actives", "/spectre"],
          [CULTURES.length, "Cultures", "/cultures"],
          [MELANGES.length, "Mélanges formulés", "/melanges"],
          [ORGANISMES.length, "Organismes BPE", "/organismes"],
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
            Culture, cible, une à trois matières actives. Précédents de dose, mélange
            formulé ou non, organismes dont le périmètre couvre.
          </p>
        </Link>
        <Link href="/procedures/melange" className="rounded border border-[var(--line)] bg-[var(--surface)] p-4 no-underline">
          <h2 className="text-xl text-[var(--ink)]">Mélanger</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Association déjà à l&apos;index, ou mélange en cuve à tester en bocal.
            {` ${PROCEDURES.length} procédures, ${ajouts} cultures rattachées en plus.`}
          </p>
        </Link>
      </section>
      <p className="text-sm text-[var(--muted)]">
        Index du {CORPUS.meta.genereIndex ?? "—"} · registre BPE {CORPUS.meta.majBpe ?? "—"}
      </p>
    </div>
  );
}
