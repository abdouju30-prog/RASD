import { Factory } from "lucide-react";
import type { FabricantsTurcs as Donnees } from "@/lib/bku";

// Le registre turc distingue İMAL (fabriqué en Turquie) d'İTHAL (importé).
// L'affichage garde la distinction : une société qui n'a que des İTHAL est un
// importateur, et la confondre avec un fabricant fausserait la consultation.

function Table({ soc }: { soc: Donnees["fabricants"] }) {
  return (
    <table className="tbl">
      <thead>
        <tr>
          <th>Société</th>
          <th style={{ textAlign: "right" }}>İMAL</th>
          <th style={{ textAlign: "right" }}>M.A. fabriquées</th>
          <th>Adresse</th>
        </tr>
      </thead>
      <tbody>
        {soc.map((s) => (
          <tr key={s.id}>
            <td style={{ fontSize: 13, fontWeight: 500 }}>{s.nom}</td>
            <td className="mono" style={{ fontSize: 13, textAlign: "right" }}>{s.nbImal}</td>
            <td className="mono" style={{ fontSize: 13, textAlign: "right" }}>
              {s.matieresImal.length}
            </td>
            <td style={{ fontSize: 11.5, color: "var(--muted)", maxWidth: 300 }}>
              {s.adresse ?? "—"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function FabricantsTurcs({
  d,
  attribution,
  max = 12,
}: {
  d: Donnees | null;
  attribution: string;
  max?: number;
}) {
  return (
    <div className="card" style={{ padding: "18px 20px" }}>
      <div className="h-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Factory size={14} /> Fabricants turcs — registre BKÜ
      </div>

      {!d ? (
        <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "9px 0 0" }}>
          Non appariée au registre turc.
        </p>
      ) : (
        <>
          <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "6px 0 14px", lineHeight: 1.55 }}>
            <strong style={{ color: "var(--fg)" }}>{d.fabricants.length}</strong> société(s)
            fabriquent en Turquie sous <span className="mono">{d.matiere.noms.join(" · ")}</span>
            {d.importateurs.length > 0 && <>, {d.importateurs.length} se contentent d&apos;importer</>}.
          </p>

          {d.fabricants.length > 0 && <Table soc={d.fabricants.slice(0, max)} />}
          {d.fabricants.length > max && (
            <p style={{ fontSize: 11.5, color: "var(--muted-2)", marginTop: 8 }}>
              {d.fabricants.length - max} autres.
            </p>
          )}
        </>
      )}

      <p style={{ fontSize: 11.5, color: "var(--muted-2)", marginTop: 12, lineHeight: 1.55 }}>
        {attribution} · İMAL = fabriqué en Turquie, pas nécessairement la synthèse de la matière
        active. N&apos;ouvre aucun droit devant l&apos;ONSSA.
      </p>
    </div>
  );
}
