import { Users } from "lucide-react";
import { LiensMatieres } from "@/components/LienMatiere";
import { fmtDate } from "@/lib/logic";
import type { Concurrent, Marche } from "@/lib/concurrents";

// ────────────────────────────────────────────────────────────────────────────
// LES CONCURRENTS SUR UNE MATIÈRE ACTIVE
//
// ⚠️ LE FOURNISSEUR DU CONCURRENT EST VOTRE PISTE. C'est la colonne qui vaut le
// détour : une société déjà référencée à l'ONSSA sur cette molécule a fait
// accepter son dossier technique par l'administration marocaine, et peut vous
// vendre la même matière. C'est la voie me-too, lue depuis le marché.
// ────────────────────────────────────────────────────────────────────────────

const TON_ETAT: Record<string, string> = {
  expirée: "var(--crit)",
  critique: "var(--crit)",
  proche: "var(--high)",
  valide: "var(--low)",
  inconnue: "var(--muted-2)",
};

function Ligne({ c }: { c: Concurrent }) {
  return (
    <tr>
      <td style={{ fontWeight: 500 }}>
        {c.nom}
        {c.cestVous && (
          <span
            className="pill"
            style={{
              fontSize: 9.5,
              marginLeft: 6,
              color: "var(--accent)",
              borderColor: "color-mix(in srgb, var(--accent) 45%, transparent)",
              background: "var(--accent-fond)",
            }}
          >
            vous
          </span>
        )}
      </td>
      <td className="mono" style={{ textAlign: "right", fontWeight: 600 }}>{c.produits.length}</td>
      <td style={{ fontSize: 12 }}>
        {c.produits.slice(0, 3).map((p) => (
          <div key={p.id} style={{ display: "flex", gap: 6, alignItems: "baseline" }}>
            <span>{p.nomCommercial}</span>
            {p.associees.length > 0 && (
              <span style={{ color: "var(--muted-2)", fontSize: 11 }}>
                + <LiensMatieres noms={p.associees} separateur=" + " max={2} />
              </span>
            )}
            <span
              className="mono"
              style={{ fontSize: 10.5, color: TON_ETAT[p.etat] ?? "var(--muted-2)" }}
              title={`AMM ${p.amm ?? "—"} · ${p.etat}`}
            >
              {p.expiration ? fmtDate(p.expiration) : "—"}
            </span>
          </div>
        ))}
        {c.produits.length > 3 && (
          <span className="mono" style={{ color: "var(--muted-2)", fontSize: 11 }}>
            +{c.produits.length - 3} autres
          </span>
        )}
      </td>
      <td style={{ fontSize: 11.5, color: "var(--muted)", maxWidth: 230 }}>
        {c.fournisseurs.slice(0, 2).join(" · ") || "—"}
        {c.fournisseurs.length > 2 && (
          <span className="mono" style={{ color: "var(--muted-2)" }}> +{c.fournisseurs.length - 2}</span>
        )}
      </td>
      <td style={{ fontSize: 11.5, color: "var(--muted)", maxWidth: 170 }}>
        {c.cultures.slice(0, 3).join(" · ")}
        {c.cultures.length > 3 && (
          <span className="mono" style={{ color: "var(--muted-2)" }}> +{c.cultures.length - 3}</span>
        )}
      </td>
    </tr>
  );
}

export function Concurrents({ m, max = 12 }: { m: Marche; max?: number }) {
  const liste = m.vous ? [m.vous, ...m.concurrents] : m.concurrents;
  if (liste.length === 0) return null;

  return (
    <div className="card" style={{ padding: "18px 20px" }}>
      <div className="h-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Users size={14} /> Qui la vend au Maroc — {m.nbDetenteurs} société(s), {m.nbProduits}{" "}
        produit(s)
      </div>

      <table className="tbl" style={{ marginTop: 12 }}>
        <thead>
          <tr>
            <th>Détenteur</th>
            <th style={{ textAlign: "right" }}>Prod.</th>
            <th>Produits · associations · échéance</th>
            <th>Se fournit chez</th>
            <th>Cultures</th>
          </tr>
        </thead>
        <tbody>
          {liste.slice(0, max).map((c) => (
            <Ligne key={c.nom} c={c} />
          ))}
        </tbody>
      </table>
      {liste.length > max && (
        <p style={{ fontSize: 11.5, color: "var(--muted-2)", marginTop: 8 }}>
          {liste.length - max} autres.
        </p>
      )}

      <p style={{ fontSize: 11.5, color: "var(--muted-2)", marginTop: 11, lineHeight: 1.55 }}>
        <strong>« Se fournit chez » est votre piste :</strong> ces{" "}
        {m.fournisseurs.length} fournisseur(s) ont déjà fait accepter un dossier technique par
        l&apos;ONSSA sur cette molécule. Ni prix ni part de marché — l&apos;index dit qui détient
        quoi, pas qui vend combien.
      </p>
    </div>
  );
}
