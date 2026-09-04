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
          <th>Région</th>
          <th style={{ textAlign: "right" }}>Homolog. TC</th>
          <th style={{ textAlign: "right" }}>Teneur max</th>
          <th>Validité</th>
          <th>{usine ? "Licence de production" : "Licence"}</th>
        </tr>
      </thead>
      <tbody>
        {soc.map((s) => (
          <tr key={s.nom}>
            <td>
              {/* ⚠️ Le pinyin passe devant, les caractères han dessous. Une
                  raison sociale en han ne se recopie ni ne se dicte : affichée
                  seule, elle n'apprenait rien. Le nom d'origine reste là, c'est
                  lui qui fait foi. */}
              <div style={{ fontSize: 13, fontWeight: 500 }}>{s.glose ?? s.nom}</div>
              <div style={{ fontSize: 11.5, color: "var(--muted-2)", marginTop: 1 }}>{s.nom}</div>
            </td>
            <td style={{ fontSize: 12, color: "var(--muted)" }}>{s.region ?? "—"}</td>
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
          Aucune homologation chinoise de matière active technique relevée.
        </p>
      ) : (
        <>
          <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "6px 0 14px", lineHeight: 1.55 }}>
            <strong style={{ color: "var(--fg)" }}>{m.societes.length} sociétés</strong> sur{" "}
            <span className="mono">{m.nomsChinois.join(" · ")}</span>, dont{" "}
            <strong style={{ color: "var(--fg)" }}>{u.length}</strong> avec licence de production —
            des usines, pas des intermédiaires.
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
        {attribution} · n&apos;ouvre aucun droit devant l&apos;ONSSA. Ni prix, ni capacité, ni
        audit qualité. Les noms latins sont transcrits du chinois (pinyin) : ils servent à
        chercher et à reconnaître, pas à identifier une société dans un contrat.
      </p>
    </div>
  );
}
