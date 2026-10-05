import Link from "next/link";
import { MELANGES } from "@/lib/corpus";
import { contient } from "@/lib/texte";

export const metadata = { title: "Mélanges" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const q = (await searchParams).q ?? "";
  const lignes = MELANGES.filter((m) =>
    contient([m.composants.join(" "), m.categorie ?? "", ...m.cultures, ...m.cibles].join(" "), q)
  );

  return (
    <div className="grid gap-4">
      <h1 className="text-3xl">Mélanges formulés</h1>
      <p className="max-w-2xl text-sm text-[var(--muted)]">
        Associations déjà présentes à l&apos;index, pas des mélanges en cuve. Une association
        absente d&apos;ici n&apos;est pas une interdiction : elle n&apos;a pas de précédent formulé
        dans l&apos;extrait.{" "}
        <Link href="/procedures/melange">Procédure de mélange</Link>
      </p>
      <form className="barre">
        <input
          name="q"
          defaultValue={q}
          placeholder="Matière, culture ou cible"
          className="w-full rounded border border-[var(--line)] bg-[var(--surface)] px-3 py-2"
        />
        <button className="rounded bg-[var(--accent)] px-3 py-2 text-[var(--accent-fg)]">Filtrer</button>
      </form>
      <p className="text-sm text-[var(--muted)]">{lignes.length} mélange(s)</p>
      <table className="table-bpe">
        <thead>
          <tr>
            <th>Composants</th>
            <th>Catégorie</th>
            <th>Cultures</th>
            <th>Lignes</th>
          </tr>
        </thead>
        <tbody>
          {lignes.map((m) => (
            <tr key={m.id}>
              <td data-label="Composants">
                <Link href={`/melanges/${m.id}`}>{m.composants.join(" + ")}</Link>
              </td>
              <td data-label="Catégorie">{m.categorie ?? "—"}</td>
              <td data-label="Cultures">{m.cultures.length}</td>
              <td data-label="Lignes">{m.nbLignes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
