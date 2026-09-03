import { Factory, MapPin } from "lucide-react";
import type { UsineSourcing, UsinesSociete } from "@/lib/epa";

// Le registre de l'EPA nomme des sites de production, pas des titulaires.
// Deux précautions gouvernent cet affichage :
//   • le rapprochement se fait sur le nom, donc le nom EPA retenu est montré ;
//   • le registre couvre aussi les « devices », donc rien n'est présenté comme
//     usine phytosanitaire sans une corroboration explicite.

/** Ligne compacte sous un nom de fournisseur : où il produit, d'après l'EPA. */
export function SiteProduction({ u }: { u: UsinesSociete | null }) {
  if (!u) return null;
  const villes = [...new Set(u.sites.map((s) => s.ville).filter(Boolean))].slice(0, 2);
  return (
    <div
      style={{ fontSize: 11, color: "var(--muted-2)", marginTop: 3, lineHeight: 1.4 }}
      title={
        u.lien === "exact"
          ? `Raison sociale identique au registre EPA : ${u.nomEpa}`
          : `Parenté probable, à vérifier — le registre EPA nomme « ${u.nomEpa} »`
      }
    >
      <MapPin size={10} style={{ display: "inline", verticalAlign: -1, marginRight: 3 }} />
      {u.sites.length} site{u.sites.length > 1 ? "s" : ""} · {u.pays.join(", ")}
      {villes.length > 0 && <> · {villes.join(", ")}</>}
      {u.lien === "probable" && <span style={{ color: "var(--mod)" }}> · à vérifier</span>}
    </div>
  );
}

export function TableUsines({ usines }: { usines: UsineSourcing[] }) {
  return (
    <table className="tbl">
      <thead>
        <tr>
          <th>Société</th>
          <th>Pays</th>
          <th style={{ textAlign: "right" }}>Sites</th>
          <th>Villes</th>
          <th>Recoupement</th>
        </tr>
      </thead>
      <tbody>
        {usines.map((u) => (
          <tr key={u.id}>
            <td style={{ fontWeight: 500 }}>{u.nom}</td>
            <td style={{ color: "var(--muted)" }}>{u.pays}</td>
            <td className="mono" style={{ textAlign: "right" }}>{u.nbSites}</td>
            <td style={{ fontSize: 11.5, color: "var(--muted)", maxWidth: 260 }}>
              {u.villes.slice(0, 3).join(" · ") || "—"}
            </td>
            <td style={{ fontSize: 11.5 }}>
              {u.lienOnssa ? (
                <>
                  <span
                    className="pill"
                    style={{
                      fontSize: 10,
                      color: u.lienOnssa === "exact" ? "var(--low)" : "var(--mod)",
                      borderColor: `color-mix(in srgb, ${u.lienOnssa === "exact" ? "var(--low)" : "var(--mod)"} 42%, transparent)`,
                      background: `color-mix(in srgb, ${u.lienOnssa === "exact" ? "var(--low)" : "var(--mod)"} 10%, transparent)`,
                    }}
                  >
                    {u.lienOnssa === "exact" ? "à l'index ONSSA" : "groupe probable"}
                  </span>
                  <div style={{ color: "var(--muted-2)", fontSize: 11, marginTop: 3 }}>
                    {u.fournisseurOnssa}
                  </div>
                </>
              ) : u.corroboreeApvma ? (
                <span
                  className="pill"
                  style={{
                    fontSize: 10,
                    color: "var(--accent)",
                    borderColor: "color-mix(in srgb, var(--accent) 42%, transparent)",
                    background: "var(--accent-fond)",
                  }}
                  title="Détient aussi une homologation australienne : acteur phytosanitaire avéré."
                >
                  homologuée en Australie
                </span>
              ) : (
                <span style={{ color: "var(--muted-2)" }}>aucun</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function ReserveEpa({ attribution }: { attribution: string }) {
  return (
    <p style={{ fontSize: 11.5, color: "var(--muted-2)", marginTop: 12, lineHeight: 1.55 }}>
      {attribution} · dit <strong style={{ color: "var(--muted)" }}>qui produit et où, jamais
      quoi</strong>. N&apos;atteste d&apos;aucune conformité.
    </p>
  );
}

export function EnteteUsines({ titre, nb }: { titre: string; nb: number }) {
  return (
    <span className="h-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <Factory size={14} color="var(--info)" /> {titre}
      <span className="mono" style={{ color: "var(--muted-2)", fontWeight: 400 }}>{nb}</span>
    </span>
  );
}
