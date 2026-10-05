import Link from "next/link";
import { notFound } from "next/navigation";
import { Emplois } from "@/components/Emplois";
import { MELANGES, melangeParIdDe } from "@/lib/corpus";
import { ORDRE_CUVE } from "@/lib/procedures";

export function generateStaticParams() {
  return MELANGES.map((m) => ({ id: m.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const m = melangeParIdDe((await params).id);
  return { title: m ? m.composants.join(" + ") : "Mélange" };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const m = melangeParIdDe((await params).id);
  if (!m) notFound();
  const essai = `/essai?${m.composantIds.map((id) => `m=${id}`).join("&")}`;

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-sm text-[var(--muted)]">{m.categorie ?? "Catégorie non renseignée"}</p>
        <h1 className="text-3xl">{m.composants.join(" + ")}</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Association formulée · {m.nbLignes} ligne(s) · {m.cultures.length} culture(s)
        </p>
      </div>
      <ul className="flex flex-wrap gap-2 text-sm">
        {m.composants.map((nom, i) => (
          <li key={m.composantIds[i]}>
            <Link href={`/spectre/${m.composantIds[i]}`}>{nom}</Link>
          </li>
        ))}
      </ul>
      <p>
        <Link href={essai}>Préparer un essai avec ces composants</Link>
      </p>
      <section>
        <h2 className="mb-2 text-2xl">Emplois de l&apos;association</h2>
        <Emplois lignes={m.emplois} />
      </section>
      <section className="rounded border border-[var(--line)] bg-[var(--surface)] p-4">
        <h2 className="text-xl">Si l&apos;essai mélange en cuve</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Cette fiche constate une formulation déjà à l&apos;index. Elle ne décrit pas une bouillie.
          Ordre de préparation, à valider en bocal :
        </p>
        <ol className="mt-2 list-decimal pl-5 text-sm">
          {ORDRE_CUVE.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ol>
        <p className="mt-2 text-sm">
          <Link href="/procedures/melange">Procédure complète</Link>
        </p>
      </section>
    </div>
  );
}
