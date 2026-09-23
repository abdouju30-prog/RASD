import Link from "next/link";
import { CULTURES } from "@/lib/corpus";
import { contient } from "@/lib/texte";

export const metadata = { title: "Cultures" };

const ORIGINE: Record<string, string> = {
  homologa: "Homologa",
  "ajout-bpe": "Ajout BPE",
  "non-rattache": "Non rattaché",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; origine?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q ?? "";
  const origine = sp.origine ?? "";
  const lignes = CULTURES.filter((c) => contient(c.nom, q) && (!origine || c.originePerimetres === origine));

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
        <select
          name="origine"
          defaultValue={origine}
          className="rounded border border-[var(--line)] bg-[var(--surface)] px-3 py-2"
        >
          <option value="">Tous les rattachements</option>
          <option value="homologa">Mot-clé Homologa</option>
          <option value="ajout-bpe">Ajout BPE</option>
          <option value="non-rattache">Non rattaché</option>
        </select>
        <button className="rounded bg-[var(--accent)] px-3 py-2 text-[var(--accent-fg)]">Filtrer</button>
      </form>
      <p className="text-sm text-[var(--muted)]">{lignes.length} culture(s)</p>
      <table className="table-bpe">
        <thead>
          <tr>
            <th>Culture</th>
            <th>Matières</th>
            <th>Périmètre BPE</th>
            <th>Origine</th>
          </tr>
        </thead>
        <tbody>
          {lignes.map((c) => (
            <tr key={c.id}>
              <td data-label="Culture">
                <Link href={`/cultures/${c.id}`}>{c.nom}</Link>
              </td>
              <td data-label="Matières">{c.nbMatieres}</td>
              <td data-label="Périmètre">{c.perimetres.join(" · ") || "—"}</td>
              <td data-label="Origine">{ORIGINE[c.originePerimetres]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
