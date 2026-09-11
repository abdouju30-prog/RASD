import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { getMatiere } from "@/lib/data";
import { genererDossier, statsDossier } from "@/lib/dossier";
import type { TypeDossier } from "@/lib/types";

export const dynamic = "force-dynamic";

const LIBELLE_RESP: Record<string, string> = {
  fournisseur: "Fournisseur",
  laboratoire: "Laboratoire",
  phytobeht: "Détenteur",
};

const LIBELLE_TYPE: Record<TypeDossier, string> = {
  nouvelle_homologation: "nouvelle homologation",
  renouvellement: "renouvellement",
  extension_usage: "extension d'usage",
};

export default async function GenererPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ type?: string; produit?: string; origine?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const ma = getMatiere(id);
  if (!ma) notFound();

  const type = (sp.type as TypeDossier) ?? "nouvelle_homologation";
  const d = genererDossier(id, {
    type,
    produitNom: sp.produit,
    origine:
      sp.origine === "substitution"
        ? "Radar — substitution d'une matière active à risque"
        : sp.origine === "prospection"
        ? "Prospection — nouvelle matière active à importer"
        : undefined,
  });
  if (!d) notFound();

  const st = statsDossier(d);
  const ansesKo = ma.fiche?.anses?.statut === "retirée" || ma.fiche?.anses?.statut === "en_retrait";
  const q = encodeURIComponent(ma.molecule || ma.nom);
  const aProduire = d.pieces
    .filter((p) => !p.allegeable)
    .sort((a, b) => Number(!!b.glp) - Number(!!a.glp) || (a.code ?? "").localeCompare(b.code ?? "", "fr"));

  return (
    <>
      <Link
        href="/dossiers"
        style={{ color: "var(--muted)", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6 }}
      >
        <ArrowLeft size={14} /> Dossiers
      </Link>

      <div className="fil" style={{ marginTop: 10 }}>Dossier · 3-B</div>
      <h1>{d.produitNom}</h1>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "8px 0 14px" }}>
        <span className="pill">{ma.nom}</span>
        <span className="pill">{LIBELLE_TYPE[type]}</span>
        <span className="pill" style={{ fontWeight: 500 }}>
          voie {d.voie === "me_too" ? "me-too" : "substance nouvelle"}
        </span>
        {d.fournisseur && (
          <span className="pill">{d.fournisseur.nom}</span>
        )}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
        <Link href={`/consultation/${id}`} className="pill" style={{ fontWeight: 500 }}>
          Consulter
        </Link>
        <Link href={`/fournisseurs?q=${q}`} className="pill" style={{ fontWeight: 500 }}>
          Fournisseurs
        </Link>
        <Link href={`/matieres/${id}`} className="pill" style={{ fontWeight: 500 }}>
          Matière
        </Link>
      </div>

      {ansesKo && (
        <div
          className="card"
          style={{
            padding: "14px 18px",
            marginBottom: 16,
            display: "flex",
            gap: 12,
            alignItems: "flex-start",
            borderColor: "color-mix(in srgb, var(--crit) 45%, transparent)",
            background: "color-mix(in srgb, var(--crit) 9%, transparent)",
          }}
        >
          <ShieldAlert size={18} color="var(--crit)" style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.65 }}>
            <strong style={{ color: "var(--fg)" }}>Matière retirée en France — dossier déconseillé.</strong>{" "}
            L&apos;ONSSA s&apos;alignant sur l&apos;ANSES, engager un dossier expose à un refus.
          </div>
        </div>
      )}

      <div className="bloc" style={{ marginBottom: 16 }}>
        <div className="titre">
          <span>À produire</span>
          <span className="mono">{st.nbNonAllegeables}</span>
        </div>
        <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "0 0 10px", lineHeight: 1.55 }}>
          {st.nbLignes} lignes · {st.nbAllegeables} allégeables par référence · {st.nbGLP} études BPL
        </p>
        {aProduire.length > 0 ? (
          <table className="tbl">
            <thead>
              <tr>
                <th>Ligne</th>
                <th>Donnée</th>
                <th>Qui</th>
                <th>BPL</th>
              </tr>
            </thead>
            <tbody>
              {aProduire.map((p) => (
                <tr key={p.code ?? p.rubrique}>
                  <td className="mono" style={{ fontSize: 12.5, color: "var(--muted)" }}>
                    {p.code ?? "—"}
                  </td>
                  <td style={{ fontSize: 13 }}>
                    {p.libelle ?? p.rubrique}
                    {p.prerempli && (
                      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>{p.prerempli}</div>
                    )}
                  </td>
                  <td style={{ fontSize: 12.5, color: "var(--muted)" }}>
                    {LIBELLE_RESP[p.responsable ?? "phytobeht"]}
                  </td>
                  <td>
                    {p.glp ? (
                      <span className="pill" style={{ fontSize: 10.5, fontWeight: 500 }}>BPL</span>
                    ) : (
                      <span style={{ color: "var(--muted)" }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ fontSize: 13, color: "var(--muted)", padding: "12px 0" }}>
            Toutes les lignes sont allégeables par référence.
          </p>
        )}
      </div>
    </>
  );
}
