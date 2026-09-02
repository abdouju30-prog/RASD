import { Factory } from "lucide-react";
import { titulaires, usines, type MatiereIcama } from "@/lib/icama";

// Le registre chinois distingue deux droits que rien d'autre ne distingue :
// vendre la matière active technique, et la fabriquer. L'affichage garde la
// distinction — la confondre ferait passer un négociant pour une usine.

function Table({ soc, usine }: { soc: ReturnType<typeof usines>; usine: boolean }) {
  return (
    <table className="tbl">
      <thead>
        <tr>
          <th>Société</th>
          <th style={{ textAlign: "right" }}>Homolog. TC</th>
          <th style={{ textAlign: "right" }}>Teneur max</th>
          <th>Validité</th>
          <th>{usine ? "Licence de production" : "Licence"}</th>
        </tr>
      </thead>
      <tbody>
        {soc.map((s) => (
          <tr key={s.nom}>
            <td style={{ fontSize: 13 }}>{s.nom}</td>
            <td className="mono" style={{ fontSize: 13, textAlign: "right" }}>{s.nbHomologations}</td>
            <td className="mono" style={{ fontSize: 13, textAlign: "right" }}>{s.teneurMax ?? "—"}</td>
            <td className="mono" style={{ fontSize: 12.5, color: "var(--muted)" }}>
              {s.expirationMax ?? "—"}
            </td>
            <td style={{ fontSize: 11.5 }}>
              {s.licenceProduction ? (
                <span className="mono" style={{ color: "var(--low)" }}>{s.licenceProduction}</span>
              ) : (
                <span style={{ color: "var(--mod)" }}>aucune au registre</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function FabricantsChinois({
  m,
  attribution,
  max = 15,
}: {
  m: MatiereIcama | null;
  attribution: string;
  /** Plafond d'affichage : le glyphosate compte plus de 100 détenteurs. */
  max?: number;
}) {
  const u = m ? usines(m) : [];
  const t = m ? titulaires(m) : [];

  return (
    <div className="card" style={{ padding: "18px 20px" }}>
      <div className="h-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Factory size={14} /> Fabricants chinois — registre ICAMA
      </div>

      {!m ? (
        <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "9px 0 0", lineHeight: 1.6 }}>
          Aucune homologation chinoise de matière active technique relevée pour cette molécule —
          soit elle n&apos;y est pas produite, soit elle n&apos;a pas pu être appariée au registre.
        </p>
      ) : (
        <>
          <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "6px 0 14px", lineHeight: 1.6 }}>
            <strong style={{ color: "var(--fg)" }}>{m.societes.length} sociétés</strong> détiennent une
            homologation chinoise de matière active technique (原药) sur{" "}
            <span className="mono">{m.nomsChinois.join(" · ")}</span>. Parmi elles,{" "}
            <strong style={{ color: "var(--fg)" }}>{u.length}</strong> détiennent aussi une licence de
            production : ce sont des usines, pas des intermédiaires.
          </p>

          {u.length > 0 && (
            <>
              <div className="eyebrow" style={{ marginBottom: 6 }}>
                Usines — homologation TC et licence de production
              </div>
              <Table soc={u.slice(0, max)} usine />
              {u.length > max && (
                <p style={{ fontSize: 11.5, color: "var(--muted-2)", marginTop: 8 }}>
                  {u.length - max} autres au-delà des {max} premières.
                </p>
              )}
            </>
          )}

          {t.length > 0 && (
            <>
              <div className="eyebrow" style={{ margin: "16px 0 6px" }}>
                Titulaires sans licence de production au registre — à qualifier
              </div>
              <Table soc={t.slice(0, 6)} usine={false} />
              {t.length > 6 && (
                <p style={{ fontSize: 11.5, color: "var(--muted-2)", marginTop: 8 }}>
                  {t.length - 6} autres.
                </p>
              )}
            </>
          )}
        </>
      )}

      <p style={{ fontSize: 11.5, color: "var(--muted-2)", marginTop: 12, lineHeight: 1.55 }}>
        Source <span className="mono">{attribution}</span>. Une homologation chinoise n&apos;ouvre
        aucun droit devant l&apos;ONSSA : ni voie me-too, ni étude en moins. Elle établit qu&apos;une
        société est autorisée à vendre la matière active technique en Chine, et la licence
        qu&apos;elle est autorisée à la fabriquer. Ni prix, ni capacité, ni audit qualité —
        l&apos;échantillon et le certificat d&apos;analyse restent à demander.
      </p>
    </div>
  );
}
