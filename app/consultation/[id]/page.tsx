import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Ban, ShieldCheck } from "lucide-react";
import {
  LIBELLE_ORIGINE,
  consultation,
  type Candidat,
} from "@/lib/consultation";
import { candidats } from "@/lib/sourcing";

export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  return candidats({ maxDetenteurs: 8 })
    .slice(0, 40)
    .map((c) => ({ id: c.id }));
}

function Origine({ c }: { c: Candidat }) {
  const couleur = c.meToo ? "var(--low)" : "var(--info)";
  return (
    <span
      className="pill"
      style={{
        fontSize: 10,
        color: couleur,
        borderColor: `color-mix(in srgb, ${couleur} 42%, transparent)`,
        background: `color-mix(in srgb, ${couleur} 10%, transparent)`,
      }}
    >
      {LIBELLE_ORIGINE[c.origine]}
    </span>
  );
}

function LigneCandidat({ c }: { c: Candidat }) {
  return (
    <tr>
      <td style={{ fontWeight: 500 }}>{c.nom}</td>
      <td style={{ color: "var(--muted)", fontSize: 13 }}>{c.pays ?? "à préciser"}</td>
      <td>
        <Origine c={c} />
      </td>
      <td style={{ fontSize: 12.5, color: "var(--muted)", maxWidth: 420, lineHeight: 1.45 }}>
        {c.motif}
      </td>
    </tr>
  );
}

function TableCandidats({ rows }: { rows: Candidat[] }) {
  return (
    <table className="tbl">
      <thead>
        <tr>
          <th>Société</th>
          <th>Pays</th>
          <th>Registre</th>
          <th>Motif</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((x) => (
          <LigneCandidat key={x.id} c={x} />
        ))}
      </tbody>
    </table>
  );
}

export default async function ConsultationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = consultation(id);
  if (!c) notFound();

  const bloque = c.route.cle === "bloque";
  const q = encodeURIComponent(c.matiere.molecule || c.matiere.nom);

  return (
    <>
      <Link
        href={`/matieres/${id}`}
        style={{ color: "var(--muted)", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6 }}
      >
        <ArrowLeft size={14} /> Matière
      </Link>

      <div className="fil" style={{ marginTop: 10 }}>Fournisseur · Consultation</div>
      <h1>Consulter — {c.matiere.nom}</h1>
      <p className="chapeau" style={{ marginBottom: 14 }}>
        {c.route.titre}. Le prix vient en dernier.
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
        <Link
          href={`/dossiers/generer/${id}`}
          className="pill"
          style={{ fontWeight: 600, color: "var(--accent-fg)", background: "var(--accent)", borderColor: "var(--accent)" }}
        >
          Dossier 3-B
        </Link>
        <Link href={`/fournisseurs?q=${q}`} className="pill" style={{ fontWeight: 500 }}>
          Fournisseurs
        </Link>
      </div>

      <div
        className="card"
        style={{
          padding: "14px 18px",
          marginBottom: 16,
          display: "flex",
          gap: 12,
          alignItems: "flex-start",
          borderColor: bloque
            ? "color-mix(in srgb, var(--crit) 42%, transparent)"
            : "color-mix(in srgb, var(--accent) 35%, transparent)",
          background: bloque
            ? "color-mix(in srgb, var(--crit) 7%, transparent)"
            : "color-mix(in srgb, var(--accent) 6%, transparent)",
        }}
      >
        {bloque ? (
          <Ban size={18} color="var(--crit)" style={{ flexShrink: 0, marginTop: 2 }} />
        ) : (
          <ShieldCheck size={18} color="var(--accent)" style={{ flexShrink: 0, marginTop: 2 }} />
        )}
        <div>
          <div className="h-title">{c.route.titre}</div>
          <p style={{ fontSize: 13, color: "var(--muted)", margin: "7px 0 0", lineHeight: 1.65, maxWidth: "82ch" }}>
            {c.route.lecture}
          </p>
        </div>
      </div>

      {c.meToo.length > 0 && (
        <div className="bloc" style={{ marginBottom: 16 }}>
          <div className="titre">
            <span>Me-too — à consulter en premier</span>
            <span className="mono">{c.meToo.length}</span>
          </div>
          <TableCandidats rows={c.meToo} />
        </div>
      )}

      <div className="bloc" style={{ marginBottom: 16 }}>
        <div className="titre">
          <span>{c.meToo.length > 0 ? "Autres pistes" : "Pistes à qualifier"}</span>
          <span className="mono">{c.autres.length}</span>
        </div>
        {c.autres.length > 0 ? (
          <TableCandidats rows={c.autres} />
        ) : (
          <p style={{ fontSize: 13, color: "var(--muted)", padding: "12px 0" }}>
            Aucune piste au-delà de l&apos;index marocain pour cette matière active.
          </p>
        )}
      </div>
    </>
  );
}
