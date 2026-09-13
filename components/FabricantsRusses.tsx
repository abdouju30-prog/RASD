import { Factory } from "lucide-react";
import type { FabricantsRusses as Donnees, SocieteRusse } from "@/lib/russie";
import { NomRusse } from "@/components/NomRusse";

// ────────────────────────────────────────────────────────────────────────────
// DÉTENTEURS RUSSES D'UNE MATIÈRE ACTIVE
//
// Lecture française devant, cyrillique du catalogue dessous. ≈ = transcription
// automatique (chtch, tch, ia) ; sans ≈ = nom lu et vérifié (Bayer, Syngenta).
// ────────────────────────────────────────────────────────────────────────────

function Table({ soc }: { soc: SocieteRusse[] }) {
  return (
    <table className="tbl">
      <thead>
        <tr>
          <th>Société</th>
          <th style={{ textAlign: "right" }}>M.A. de l&apos;index</th>
          <th style={{ textAlign: "right" }}>Homologations</th>
          <th>Pays</th>
        </tr>
      </thead>
      <tbody>
        {soc.map((s) => (
          <tr key={s.cle}>
            <td><NomRusse s={s} /></td>
            <td
              className="mono"
              style={{ textAlign: "right", color: "var(--accent)", fontWeight: 600 }}
            >
              {s.matieres.length}
            </td>
            <td className="mono" style={{ textAlign: "right" }}>{s.nbHomologations}</td>
            <td style={{ fontSize: 12, color: "var(--muted)" }}>
              {s.pays ?? "hors Russie, à préciser"}
              {s.pays && !s.paysFiable && (
                <span style={{ color: "var(--mod)", fontSize: 11 }}> ?</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function FabricantsRusses({
  d,
  attribution,
  edition,
  max = 12,
}: {
  d: Donnees | null;
  attribution: string;
  edition: string | null;
  max?: number;
}) {
  return (
    <div className="card" style={{ padding: "18px 20px" }}>
      <div className="h-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Factory size={14} /> Détenteurs russes — catalogue d&apos;État
      </div>

      {!d ? (
        <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "9px 0 0", lineHeight: 1.55 }}>
          Cette matière active n&apos;est pas au catalogue russe. Ce n&apos;est pas un défaut de
          rapprochement : cinquante-sept des matières actives de votre index n&apos;y figurent tout
          simplement pas.
        </p>
      ) : (
        <>
          <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "6px 0 14px", lineHeight: 1.55 }}>
            <strong style={{ color: "var(--fg)" }}>{d.russes.length}</strong> société(s) russe(s)
            {d.etrangers.length > 0 && <> et {d.etrangers.length} étrangère(s)</>} détiennent une
            homologation sous <span className="mono">{d.matiere.nomsRusses.slice(0, 3).join(" · ")}</span>.
          </p>

          {d.russes.length > 0 && <Table soc={d.russes.slice(0, max)} />}
          {d.russes.length > max && (
            <p style={{ fontSize: 11.5, color: "var(--muted-2)", marginTop: 8 }}>
              {d.russes.length - max} autres sociétés russes.
            </p>
          )}

          {d.etrangers.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div className="eyebrow" style={{ marginBottom: 7 }}>
                Étrangères homologuées en Russie
              </div>
              <Table soc={d.etrangers.slice(0, 6)} />
            </div>
          )}
        </>
      )}

      <p style={{ fontSize: 11.5, color: "var(--muted-2)", marginTop: 12, lineHeight: 1.55 }}>
        <span className="mono">≈</span> lecture française du cyrillique (chtch, tch, ia) : elle
        sert à lire, elle ne vaut pas identification. Les noms sans ≈ ont été lus et
        vérifiés.{" "}
        {attribution}. Détenir une homologation russe ne prouve pas la synthèse de la matière
        active : le titulaire est parfois un distributeur. Édition au {edition ?? "date non lue"} —
        elle sert à identifier des sociétés, pas à établir un statut courant. N&apos;ouvre aucun
        droit devant l&apos;ONSSA.
      </p>
    </div>
  );
}
