import Link from "next/link";
import { Globe2 } from "lucide-react";
import { LIBELLE_REGISTRE, PORTEE_REGISTRE, type FichePays as Fiche } from "@/lib/pays";

// ────────────────────────────────────────────────────────────────────────────
// FICHE PAYS — ce que l'outil connaît d'un pays, registre par registre
//
// Le comptage total ne vaut que si l'on voit d'où viennent les lignes : une
// société référencée à l'ONSSA et une usine déclarée à l'EPA ne se valent pas.
// Chaque ligne garde donc l'étiquette de son registre, et la portée de ce
// registre est rappelée dans la légende.
// ────────────────────────────────────────────────────────────────────────────

const TON: Record<string, string> = {
  onssa: "var(--accent)",
  epa: "var(--info)",
  chine: "var(--info)",
  turquie: "var(--info)",
  russie: "var(--info)",
  australie: "var(--info)",
};

export function BlocPays({ fiche, limite = 60 }: { fiche: Fiche; limite?: number }) {
  return (
    <div className="card" style={{ padding: "18px 20px" }}>
      <div className="h-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Globe2 size={14} /> {fiche.pays} — {fiche.total} sociétés
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 13 }}>
        {fiche.parRegistre.map((r) => (
          <span
            key={r.registre}
            className="pill"
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: TON[r.registre],
              borderColor: `color-mix(in srgb, ${TON[r.registre]} 40%, transparent)`,
              background: `color-mix(in srgb, ${TON[r.registre]} 8%, transparent)`,
            }}
            title={PORTEE_REGISTRE[r.registre]}
          >
            {LIBELLE_REGISTRE[r.registre]} <span className="mono">{r.nb}</span>
          </span>
        ))}
      </div>

      {fiche.meToo > 0 ? (
        <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "13px 0 0", lineHeight: 1.6 }}>
          <strong style={{ color: "var(--accent)" }}>{fiche.meToo}</strong> de ces sociétés sont
          déjà référencées à l&apos;ONSSA : elles seules ouvrent la voie me-too. Les autres sont
          des pistes à qualifier.
        </p>
      ) : (
        <p style={{ fontSize: 12.5, color: "var(--mod)", margin: "13px 0 0", lineHeight: 1.6 }}>
          Aucune société de ce pays n&apos;est référencée à l&apos;index ONSSA : pas de voie
          me-too, tout dossier serait à constituer intégralement.
        </p>
      )}

      <table className="tbl" style={{ marginTop: 14 }}>
        <thead>
          <tr>
            <th>Société</th>
            <th>Registre</th>
            <th>Ce que le registre en dit</th>
          </tr>
        </thead>
        <tbody>
          {fiche.entrees.slice(0, limite).map((e) => (
            <tr key={e.id}>
              <td style={{ fontWeight: 500 }}>
                {e.href ? (
                  <Link href={e.href} className="link-accent">
                    {e.nom}
                  </Link>
                ) : (
                  e.nom
                )}
                {!e.paysFiable && (
                  <span
                    style={{ color: "var(--mod)", fontSize: 11 }}
                    title="Pays déduit de la raison sociale, non déclaré par le registre"
                  >
                    {" "}
                    ?
                  </span>
                )}
              </td>
              <td>
                <span
                  className="pill"
                  style={{
                    fontSize: 10,
                    color: TON[e.registre],
                    borderColor: `color-mix(in srgb, ${TON[e.registre]} 38%, transparent)`,
                  }}
                >
                  {LIBELLE_REGISTRE[e.registre]}
                </span>
              </td>
              <td style={{ fontSize: 12, color: "var(--muted)" }}>{e.detail}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {fiche.entrees.length > limite && (
        <p style={{ fontSize: 11.5, color: "var(--muted-2)", marginTop: 10 }}>
          {fiche.entrees.length - limite} autres au-delà des {limite} premières.
        </p>
      )}
    </div>
  );
}
