import { Factory } from "lucide-react";
import type { FabricantsBresil as Donnees } from "@/lib/bresil";

// ────────────────────────────────────────────────────────────────────────────
// USINES DÉCLARÉES AU REGISTRE BRÉSILIEN
//
// La colonne « Site » est la raison d'être de ce bloc : c'est le seul registre
// de l'outil qui nomme l'atelier — « Unit II - Panoli », « Jhagadia » — et non
// seulement la société. Deux usines d'un même groupe ne se valent pas, et un
// dossier ONSSA nomme un site de fabrication, pas un groupe.
// ────────────────────────────────────────────────────────────────────────────

export function FabricantsBresil({
  d,
  attribution,
  max = 14,
}: {
  d: Donnees | null;
  attribution: string;
  max?: number;
}) {
  return (
    <div className="card" style={{ padding: "18px 20px" }}>
      <div className="h-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Factory size={14} /> Usines de synthèse — registre brésilien
      </div>

      {!d ? (
        <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "9px 0 0", lineHeight: 1.6 }}>
          Aucun produit technique homologué au Brésil sur cette matière active.
        </p>
      ) : (
        <>
          <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "6px 0 14px", lineHeight: 1.55 }}>
            <strong style={{ color: "var(--fg)" }}>{d.usines.length}</strong> usine(s) déclarée(s)
            comme fabriquant <span className="mono">{d.matiere.nomsPt.join(" · ")}</span>
            {d.matiere.teneurMax && (
              <>
                {" "}
                — teneur la plus élevée homologuée :{" "}
                <strong style={{ color: "var(--fg)" }} className="mono">
                  {d.matiere.teneurMax} g/kg
                </strong>
              </>
            )}
            .
          </p>

          <table className="tbl">
            <thead>
              <tr>
                <th>Société</th>
                <th>Site déclaré</th>
                <th>Pays</th>
                <th style={{ textAlign: "right" }}>M.A. de l&apos;index</th>
              </tr>
            </thead>
            <tbody>
              {d.usines.slice(0, max).map((u) => (
                <tr key={u.id}>
                  <td style={{ fontSize: 13, fontWeight: 500 }}>{u.nom}</td>
                  <td style={{ fontSize: 12, color: "var(--muted)", maxWidth: 220 }}>
                    {u.sites.join(" · ") || "—"}
                  </td>
                  <td style={{ fontSize: 12.5, color: "var(--muted)" }}>
                    {u.pays ?? u.paysBrut ?? "—"}
                  </td>
                  <td
                    className="mono"
                    style={{ textAlign: "right", color: "var(--accent)", fontWeight: 600 }}
                  >
                    {u.matieres.length}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {d.usines.length > max && (
            <p style={{ fontSize: 11.5, color: "var(--muted-2)", marginTop: 8 }}>
              {d.usines.length - max} autres au-delà des {max} premières.
            </p>
          )}
        </>
      )}

      <p style={{ fontSize: 11.5, color: "var(--muted-2)", marginTop: 12, lineHeight: 1.55 }}>
        {attribution}. « Fabricante » est le fabricant du technique déclaré au dossier brésilien :
        un fait déclaré à un régulateur exigeant, pas un audit d&apos;usine. N&apos;ouvre aucun
        droit devant l&apos;ONSSA. Ni prix, ni capacité, ni qualité.
      </p>
    </div>
  );
}
