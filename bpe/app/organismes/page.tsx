import { OrganismesListe } from "@/components/OrganismesListe";
import { CORPUS, ORGANISMES, PERIMETRES } from "@/lib/corpus";

export const metadata = { title: "Organismes" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ perimetre?: string }>;
}) {
  const perimetre = (await searchParams).perimetre ?? "";
  const lignes = ORGANISMES.filter((o) => !perimetre || o.couverture.includes(perimetre)).sort((a, b) =>
    (a.nom ?? "").localeCompare(b.nom ?? "", "fr")
  );

  return (
    <div className="grid gap-4">
      <h1 className="text-3xl">Organismes agréés BPE</h1>
      <p className="text-sm text-[var(--muted)]">
        Registre public, mise à jour {CORPUS.meta.majBpe ?? "—"}. {CORPUS.meta.attributionBpe}
      </p>
      <form className="barre">
        <select
          name="perimetre"
          defaultValue={perimetre}
          className="rounded border border-[var(--line)] bg-[var(--surface)] px-3 py-2"
        >
          <option value="">Tous les périmètres</option>
          {PERIMETRES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <button className="rounded bg-[var(--accent)] px-3 py-2 text-[var(--accent-fg)]">Filtrer</button>
      </form>
      <p className="text-sm text-[var(--muted)]">{lignes.length} organisme(s)</p>
      <OrganismesListe organismes={lignes} />
    </div>
  );
}
