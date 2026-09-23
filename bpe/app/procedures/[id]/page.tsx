import Link from "next/link";
import { notFound } from "next/navigation";
import { PROCEDURES, procedureParId } from "@/lib/procedures";

export function generateStaticParams() {
  return PROCEDURES.map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const p = procedureParId((await params).id);
  return { title: p?.titre ?? "Procédure" };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const p = procedureParId((await params).id);
  if (!p) notFound();
  return (
    <article className="grid max-w-2xl gap-4">
      <p>
        <Link href="/procedures">Procédures</Link>
      </p>
      <h1 className="text-3xl">{p.titre}</h1>
      <p className="text-[var(--muted)]">{p.resume}</p>
      <ol className="grid gap-4">
        {p.etapes.map((e, i) => (
          <li key={e.titre}>
            <h2 className="text-xl">
              {i + 1}. {e.titre}
            </h2>
            <p className="mt-1 text-sm leading-6">{e.texte}</p>
          </li>
        ))}
      </ol>
    </article>
  );
}
