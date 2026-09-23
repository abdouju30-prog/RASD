import Link from "next/link";
import { MATIERES } from "@/lib/corpus";
import { contient } from "@/lib/texte";

export const metadata = { title: "Spectre" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const q = (await searchParams).q ?? "";
  const lignes = MATIERES.filter((m) =>
    contient([m.nom, m.categorie ?? "", ...m.cultures, ...m.cibles].join(" "), q)
  ).sort((a, b) => a.nom.localeCompare(b.nom, "fr"));

  return (
    <div className="grid gap-4">
      <h1 className="text-3xl">Spectre des matières actives</h1>
      <form className="flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Matière, culture ou cible"
          className="w-full rounded border border-[var(--line)] bg-[var(--surface)] px-3 py-2"
        />
        <button className="rounded bg-[var(--accent)] px-3 py-2 text-[var(--accent-fg)]">Filtrer</button>
      </form>
      <p className="text-sm text-[var(--muted)]">{lignes.length} matière(s)</p>
      <div className="overflow-x-auto">
        <table className="table-bpe">
          <thead>
            <tr>
              <th>Matière active</th>
              <th>Catégorie</th>
              <th>Cultures</th>
              <th>Cibles</th>
              <th>Lignes</th>
            </tr>
          </thead>
          <tbody>
            {lignes.map((m) => (
              <tr key={m.id}>
                <td>
                  <Link href={`/spectre/${m.id}`}>{m.nom}</Link>
                </td>
                <td>{m.categorie ?? "—"}</td>
                <td>{m.cultures.length}</td>
                <td>{m.cibles.length}</td>
                <td>{m.nbLignes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
