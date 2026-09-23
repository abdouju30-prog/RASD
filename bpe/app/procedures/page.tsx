import Link from "next/link";
import { PROCEDURES } from "@/lib/procedures";

export const metadata = { title: "Procédures" };

export default function Page() {
  return (
    <div className="grid gap-4">
      <h1 className="text-3xl">Procédures</h1>
      <p className="max-w-2xl text-sm text-[var(--muted)]">
        Grille de travail ajoutée par BPE. Ce n&apos;est pas une transcription du formulaire ONSSA,
        et ce n&apos;est pas une modification d&apos;Homologa.
      </p>
      <ul className="grid gap-3">
        {PROCEDURES.map((p) => (
          <li key={p.id}>
            <Link href={`/procedures/${p.id}`} className="block rounded border border-[var(--line)] bg-[var(--surface)] p-4 no-underline">
              <span className="text-xl text-[var(--ink)]">{p.titre}</span>
              <span className="mt-1 block text-sm text-[var(--muted)]">{p.resume}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
