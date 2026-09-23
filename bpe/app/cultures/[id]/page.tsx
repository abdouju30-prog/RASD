import Link from "next/link";
import { notFound } from "next/navigation";
import { CULTURES, MATIERES, cultureParIdDe } from "@/lib/corpus";
import { joindre } from "@/lib/texte";

export function generateStaticParams() {
  return CULTURES.map((c) => ({ id: c.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const c = cultureParIdDe((await params).id);
  return { title: c?.nom ?? "Culture" };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const c = cultureParIdDe((await params).id);
  if (!c) notFound();
  const matieres = MATIERES.filter((m) => m.cultures.includes(c.nom)).sort((a, b) =>
    a.nom.localeCompare(b.nom, "fr")
  );

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl">{c.nom}</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">{matieres.length} matière(s) active(s)</p>
      </div>
      <p>
        <Link href={`/essai?culture=${c.id}`}>Préparer un essai sur cette culture</Link>
      </p>
      <section>
        <h2 className="mb-2 text-2xl">Matières actives</h2>
        <table className="table-bpe">
          <thead>
            <tr>
              <th>Matière</th>
              <th>Cibles sur cette culture</th>
              <th>Doses</th>
            </tr>
          </thead>
          <tbody>
            {matieres.map((m) => {
              const emplois = m.emplois.filter((e) => e.culture === c.nom);
              return (
                <tr key={m.id}>
                  <td data-label="Matière">
                    <Link href={`/spectre/${m.id}`}>{m.nom}</Link>
                  </td>
                  <td data-label="Cibles">{emplois.map((e) => e.cible || "—").join(", ")}</td>
                  <td data-label="Doses">{joindre(emplois.flatMap((e) => e.doses))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}
