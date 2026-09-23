import Link from "next/link";
import { CULTURES } from "@/lib/corpus";
import { contient } from "@/lib/texte";

export const metadata = { title: "Cultures" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const q = (await searchParams).q ?? "";
  const lignes = CULTURES.filter((c) => contient(c.nom, q));

  return (
    <div className="grid gap-4">
      <h1 className="text-3xl">Cultures</h1>
      <form className="barre">
        <input
          name="q"
          defaultValue={q}
          placeholder="Culture"
          className="rounded border border-[var(--line)] bg-[var(--surface)] px-3 py-2"
        />
        <button className="rounded bg-[var(--accent)] px-3 py-2 text-[var(--accent-fg)]">Filtrer</button>
      </form>
      <p className="text-sm text-[var(--muted)]">{lignes.length} culture(s)</p>
      <table className="table-bpe">
        <thead>
          <tr>
            <th>Culture</th>
            <th>Matières</th>
          </tr>
        </thead>
        <tbody>
          {lignes.map((c) => (
            <tr key={c.id}>
              <td data-label="Culture">
                <Link href={`/cultures/${c.id}`}>{c.nom}</Link>
              </td>
              <td data-label="Matières">{c.nbMatieres}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
