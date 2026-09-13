import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Ban, ShieldCheck, FlaskConical } from "lucide-react";
import {
  LIBELLE_ORIGINE,
  QUESTIONNAIRE,
  consultation,
  type Candidat,
} from "@/lib/consultation";
import { bpeAEcheance, STATS_ESERVICE } from "@/lib/onssa-eservice";
import { candidats } from "@/lib/sourcing";
import { contactDe } from "@/lib/contact";
import { ContactCell } from "@/components/Contact";

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
      <td>
        <ContactCell c={contactDe(c.nom, c.id.startsWith("onssa-") ? c.id.slice(6) : undefined)} />
      </td>
      <td style={{ fontSize: 12.5, color: "var(--muted)", maxWidth: 360, lineHeight: 1.45 }}>
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
          <th>Contact</th>
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

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "14px 0 18px" }}>
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

      <div className="bloc" style={{ marginBottom: 16 }}>
        <div className="titre">
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <FlaskConical size={14} /> Questionnaire technique
          </span>
          <span className="mono">
            {c.nbLignesFournisseur} · {c.nbLignesGlp} BPL
          </span>
        </div>
        <p style={{ color: "var(--muted)", fontSize: 12.5, margin: "0 0 12px" }}>
          Lignes de l&apos;Annexe 3-B qui incombent au fournisseur, avec le nom commercial du paquet
          d&apos;études.
        </p>
        <table className="tbl">
          <thead>
            <tr>
              <th style={{ width: 74 }}>Ligne</th>
              <th>Donnée demandée</th>
              <th style={{ width: 58 }}>BPL</th>
              <th style={{ width: 150 }}>Paquet commercial</th>
            </tr>
          </thead>
          <tbody>
            {QUESTIONNAIRE.map((q) => (
              <tr key={q.cle}>
                <td className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>{q.cle}</td>
                <td style={{ fontSize: 13 }}>{q.libelle}</td>
                <td>
                  {q.glp && (
                    <span
                      className="pill"
                      style={{
                        fontSize: 10,
                        color: "var(--mod)",
                        borderColor: "color-mix(in srgb, var(--mod) 42%, transparent)",
                        background: "color-mix(in srgb, var(--mod) 10%, transparent)",
                      }}
                    >
                      BPL
                    </span>
                  )}
                </td>
                <td style={{ fontSize: 11.5, color: "var(--muted)" }}>{q.pack ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bloc" style={{ marginBottom: 16 }}>
        <div className="titre">
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <FlaskConical size={14} /> Essais d&apos;efficacité — organismes BPE
          </span>
          <span className="mono">{c.essais.organismes.length}</span>
        </div>
        <p style={{ color: "var(--muted)", fontSize: 12.5, margin: "0 0 12px", maxWidth: "88ch", lineHeight: 1.6 }}>
          {c.essais.indetermine ? (
            <>
              Les cultures de cette matière active ne se rattachent à aucun périmètre BPE reconnu :
              la liste n&apos;est pas filtrée, à vous de vérifier la couverture au cas par cas.
            </>
          ) : (
            <>
              Périmètre requis :{" "}
              <strong style={{ color: "var(--fg)" }}>{c.essais.perimetres.join(" · ")}</strong>.
              Seuls les organismes qui couvrent tout le périmètre sont listés.
            </>
          )}
        </p>
        {c.essais.organismes.length > 0 ? (
          <table className="tbl">
            <thead>
              <tr>
                <th>Organisme</th>
                <th>Agrément</th>
                <th>Valable jusqu&apos;au</th>
                <th>Contact</th>
              </tr>
            </thead>
            <tbody>
              {c.essais.organismes.map((o) => {
                const ech = bpeAEcheance(o);
                return (
                  <tr key={o.nom ?? ""}>
                    <td style={{ fontWeight: 500 }}>
                      {o.nom}
                      <div style={{ fontSize: 11, color: "var(--muted-2)", marginTop: 3 }}>
                        {o.siege}
                      </div>
                    </td>
                    <td className="mono" style={{ fontSize: 12 }}>{o.agrement.numero}</td>
                    <td className="mono" style={{ fontSize: 12, color: ech ? "var(--mod)" : "var(--muted)" }}>
                      {o.agrement.expiration ?? "—"}
                      {ech && <div style={{ fontSize: 10.5 }}>{ech}</div>}
                    </td>
                    <td style={{ fontSize: 11.5, color: "var(--muted)" }}>
                      {o.telephone}
                      {o.emails.length > 0 && <div>{o.emails[0]}</div>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p style={{ fontSize: 13, color: "var(--muted)", padding: "12px 0" }}>
            Aucun organisme BPE listé pour ce périmètre.
          </p>
        )}
        <p style={{ fontSize: 11.5, color: "var(--muted-2)", marginTop: 12, lineHeight: 1.55 }}>
          {STATS_ESERVICE.attribution} · un agrément expiré en cours d&apos;essai invalide les
          résultats.
        </p>
      </div>
    </>
  );
}
