import Link from "next/link";
import { notFound } from "next/navigation";
import { Emplois } from "@/components/Emplois";
import { MATIERES, cultureParNomDe, matiereParIdDe, melangesDe } from "@/lib/corpus";

export function generateStaticParams() {
  return MATIERES.map((m) => ({ id: m.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const m = matiereParIdDe((await params).id);
  return { title: m?.nom ?? "Matière active" };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const m = matiereParIdDe((await params).id);
  if (!m) notFound();
  const melanges = melangesDe(m.id);

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-sm text-[var(--muted)]">{m.categorie ?? "Catégorie non renseignée"}</p>
        <h1 className="text-3xl">{m.nom}</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {m.nbLignes} ligne(s) d&apos;index · {m.cultures.length} culture(s) · {m.cibles.length} cible(s)
        </p>
      </div>
      <p>
        <Link href={`/essai?m=${m.id}`}>Préparer un essai avec cette matière</Link>
      </p>
      <section>
        <h2 className="mb-2 text-2xl">Emplois</h2>
        <Emplois lignes={m.emplois} />
      </section>
      <section>
        <h2 className="mb-2 text-2xl">Cultures</h2>
        <ul className="flex flex-wrap gap-2 text-sm">
          {m.cultures.map((nom) => {
            const c = cultureParNomDe(nom);
            return (
              <li key={nom}>
                {c ? <Link href={`/cultures/${c.id}`}>{nom}</Link> : nom}
              </li>
            );
          })}
        </ul>
      </section>
      <section>
        <h2 className="mb-2 text-2xl">Mélanges formulés</h2>
        {melanges.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">Aucune association formulée dans l&apos;extrait.</p>
        ) : (
          <ul className="grid gap-1 text-sm">
            {melanges.map((x) => (
              <li key={x.id}>
                <Link href={`/melanges/${x.id}`}>{x.composants.join(" + ")}</Link>
                <span className="text-[var(--muted)]"> · {x.nbLignes} ligne(s)</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
