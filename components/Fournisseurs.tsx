import Link from "next/link";
import { Building2, ArrowRight } from "lucide-react";
import { LIBELLE_ORIGINE, type Candidat, type Etape, type Origine } from "@/lib/consultation";

// ────────────────────────────────────────────────────────────────────────────
// QUI FOURNIT CETTE MATIÈRE ACTIVE
//
// ⚠️ CE QUE CE BLOC RÉPARE. La recherche mène à la fiche d'une matière active,
// et cette fiche ne portait aucun chemin vers ses fournisseurs : ni vers la
// prospection, ni vers la consultation. Les deux écrans existaient, ils
// n'étaient atteignables que depuis la liste de prospection — laquelle ne
// montre que les quarante meilleures cibles. Chercher une molécule précise
// menait donc à un cul-de-sac.
//
// L'ordre reprend celui de la fiche de consultation, et il est délibéré : les
// sociétés déjà référencées à l'ONSSA passent devant, même moins avantageuses.
// Leur dossier technique a été accepté par l'administration marocaine, ce qui
// ouvre la voie me-too — le seul raccourci réglementaire qui existe.
// ────────────────────────────────────────────────────────────────────────────

const ORDRE: Origine[] = [
  "bresil", "australie", "turquie", "chine", "coree", "russie", "usine",
];

export function QuiLaFournit({
  maId,
  route,
  meToo,
  autres,
}: {
  maId: string;
  route: Etape;
  meToo: Candidat[];
  autres: Candidat[];
}) {
  const bloque = route.cle === "bloque";
  const parOrigine = ORDRE.map((o) => ({ origine: o, liste: autres.filter((a) => a.origine === o) }))
    .filter((g) => g.liste.length > 0);

  return (
    <div className="card" style={{ padding: "18px 20px" }}>
      <div className="h-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Building2 size={14} /> Qui la fournit — {meToo.length + autres.length}
      </div>

      <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "8px 0 0", lineHeight: 1.6 }}>
        {route.lecture}
      </p>

      {meToo.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>
            Référencés à l&apos;ONSSA — voie me-too
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th>Fournisseur</th>
                <th>Pays</th>
                <th>Profil</th>
                <th style={{ textAlign: "right" }}>Lignes au Maroc</th>
              </tr>
            </thead>
            <tbody>
              {meToo.map((f) => (
                <tr key={f.id}>
                  <td style={{ fontWeight: 500 }}>{f.nom}</td>
                  <td style={{ color: "var(--muted)" }}>{f.pays ?? "à préciser"}</td>
                  <td>
                    <span
                      className="pill"
                      style={{
                        fontSize: 10,
                        color: "var(--accent)",
                        borderColor: "color-mix(in srgb, var(--accent) 40%, transparent)",
                        background: "var(--accent-fond)",
                      }}
                    >
                      me-too
                    </span>
                  </td>
                  <td className="mono" style={{ textAlign: "right" }}>
                    {f.lignesMaroc ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {meToo.length === 0 && (
        <p style={{ fontSize: 12.5, color: "var(--mod)", margin: "14px 0 0", lineHeight: 1.6 }}>
          Aucun fournisseur de l&apos;index ONSSA ne porte cette matière active : pas de voie me-too,
          le dossier technique est à constituer intégralement.
        </p>
      )}

      {parOrigine.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>
            Fabricants hors index — à qualifier
          </div>
          <div style={{ display: "grid", gap: 9 }}>
            {parOrigine.map((g) => (
              <div key={g.origine} style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
                <span
                  className="mono"
                  style={{ fontSize: 13, fontWeight: 600, color: "var(--info)", minWidth: 26 }}
                >
                  {g.liste.length}
                </span>
                <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.55 }}>
                  <span style={{ color: "var(--fg)" }}>{LIBELLE_ORIGINE[g.origine]}</span> —{" "}
                  {g.liste.slice(0, 3).map((x) => x.nom).join(" · ")}
                  {g.liste.length > 3 && (
                    <span className="mono" style={{ color: "var(--muted-2)" }}>
                      {" "}
                      +{g.liste.length - 3}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {parOrigine.length === 0 && meToo.length === 0 && (
        <p style={{ fontSize: 12.5, color: "var(--muted-2)", margin: "10px 0 0", lineHeight: 1.6 }}>
          Aucun registre consulté ne nomme de fabricant sur cette molécule.
        </p>
      )}

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 18,
          borderTop: "1px solid var(--border)",
          marginTop: 18,
          paddingTop: 14,
        }}
      >
        <Link
          href={`/sourcing/${maId}`}
          className="link-accent"
          style={{ fontSize: 13.5, display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          Tous les fabricants, registre par registre <ArrowRight size={13} />
        </Link>
        {!bloque && (
          <Link
            href={`/consultation/${maId}`}
            className="link-accent"
            style={{ fontSize: 13.5, display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            Préparer la consultation <ArrowRight size={13} />
          </Link>
        )}
      </div>
    </div>
  );
}
