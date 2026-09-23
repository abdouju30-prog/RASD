import { joindre } from "@/lib/texte";
import type { Emploi } from "@/lib/types";

export function Emplois({ lignes }: { lignes: Emploi[] }) {
  if (lignes.length === 0) {
    return <p className="text-sm text-[var(--muted)]">Aucun emploi dans l&apos;extrait.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="table-bpe">
        <thead>
          <tr>
            <th>Culture</th>
            <th>Cible</th>
            <th>Doses</th>
            <th>DAR</th>
          </tr>
        </thead>
        <tbody>
          {lignes.map((e) => (
            <tr key={`${e.culture}/${e.cible}`}>
              <td data-label="Culture">{e.culture}</td>
              <td data-label="Cible">{e.cible || "—"}</td>
              <td data-label="Doses">{joindre(e.doses)}</td>
              <td data-label="DAR">{joindre(e.dar)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
