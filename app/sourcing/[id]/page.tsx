import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { RiskBadge } from "@/components/RiskBadge";
import { candidatParId, candidats, estFenetreMaroc } from "@/lib/sourcing";
import { getMatiere } from "@/lib/data";
import { nbEtranger, resoudre } from "@/lib/requete";

export async function generateStaticParams() {
  return candidats({ maxDetenteurs: 8 })
    .slice(0, 60)
    .map((c) => ({ id: c.id }));
}

export default async function CandidatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = candidatParId(id);
  const ma = getMatiere(id);
  if (!c || !ma) notFound();

  const q = encodeURIComponent(ma.molecule || ma.nom);
  const req = resoudre(ma.molecule || ma.nom);
  const g = req?.estMatiere ? req.gisement : null;
  const pastilles: { nom: string; n: number; source: string }[] = g
    ? [
        { nom: "ONSSA", n: g.fournisseursOnssa.length, source: "onssa" },
        { nom: "Brésil", n: g.bresil.length, source: "bresil" },
        { nom: "Chine", n: g.chineTc.length, source: "chine" },
        { nom: "Turquie", n: g.turquie.length, source: "turquie" },
        { nom: "EPA", n: g.sitesEpa, source: "epa" },
        { nom: "Corée", n: g.coree.length, source: "coree" },
        { nom: "Russie", n: g.russie.length, source: "russie" },
        { nom: "Australie", n: g.apvma.length, source: "apvma" },
      ]
    : [];

  return (
    <>
      <Link
        href="/sourcing"
        style={{ color: "var(--muted)", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6 }}
      >
        <ArrowLeft size={14} /> Cibles
      </Link>

      <div className="fil" style={{ marginTop: 10 }}>Alternative · Cible</div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start" }}>
        <div>
          <h1>{c.nom}</h1>
          <div style={{ color: "var(--muted)", fontSize: 13.5, marginTop: 6 }}>
            {c.categorie ?? "—"} · {c.nbHomologations} AMM · {c.nbDetenteurs} détenteur(s)
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="mono" style={{ fontSize: 28, fontWeight: 600, color: "var(--accent)", lineHeight: 1 }}>
            {c.score}
          </div>
          <div className="eyebrow" style={{ marginTop: 5 }}>attractivité</div>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "14px 0 18px", alignItems: "center" }}>
        {c.risque ? (
          <RiskBadge niveau={c.risque} score={c.scoreRisque ?? undefined} />
        ) : (
          <span className="pill" style={{ color: "var(--mod)" }}>risque non évalué</span>
        )}
        {estFenetreMaroc(c) && (
          <span
            className="pill"
            style={{
              fontWeight: 500,
              color: "var(--high)",
              borderColor: "color-mix(in srgb, var(--high) 40%, transparent)",
            }}
            title="Pas un retrait ANSES : une part de marché peut encore tenir au Maroc."
          >
            fenêtre Maroc
          </span>
        )}
        <span className="pill" style={{ fontWeight: 500 }}>
          voie {c.voie === "me_too" ? "me-too" : "substance nouvelle"}
        </span>
        {ma.fiche?.anses && ma.fiche.anses.statut !== "inconnu" && (
          <span className="pill" style={{ fontWeight: 500 }}>
            ANSES · {ma.fiche.anses.statut.replace(/_/g, " ")}
          </span>
        )}
        {ma.fiche && (
          <span className="pill" style={{ fontWeight: 500 }}>
            UE · {ma.fiche.statutUE.replace(/_/g, " ")}
          </span>
        )}
      </div>

      {estFenetreMaroc(c) && (
        <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 14px", maxWidth: 640 }}>
          Risque élevé, pas un retrait ANSES. Avec {c.nbDetenteurs} détenteur
          {c.nbDetenteurs > 1 ? "s" : ""}, une part de marché peut encore tenir au Maroc le temps
          du dossier.
          {c.statutAnses === "en_retrait"
            ? " Attention : retrait commercial en France (aucun produit E-Phy autorisé) — à qualifier."
            : ""}
        </p>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
        <Link
          href={`/dossiers/generer/${c.id}`}
          className="pill"
          style={{ fontWeight: 600, color: "var(--accent-fg)", background: "var(--accent)", borderColor: "var(--accent)" }}
        >
          Dossier 3-B
        </Link>
        <Link href={`/consultation/${c.id}`} className="pill" style={{ fontWeight: 500 }}>
          Consulter
        </Link>
        <Link href={`/fournisseurs?q=${q}`} className="pill" style={{ fontWeight: 500 }}>
          Fournisseurs
          {g && nbEtranger(g) > 0 && (
            <span className="mono" style={{ marginLeft: 6, opacity: 0.7 }}>{nbEtranger(g)}</span>
          )}
        </Link>
        <Link href={`/matieres/${ma.id}`} className="pill" style={{ fontWeight: 500 }}>
          Matière
        </Link>
      </div>

      {c.facteurs.length > 0 && (
        <div className="card" style={{ padding: "14px 18px", marginBottom: 16 }}>
          <div className="h-title">Score {c.score}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 18px", marginTop: 10, fontSize: 13 }}>
            {c.facteurs.map((f) => (
              <span key={f.libelle} style={{ color: "var(--muted)" }}>
                {f.libelle}{" "}
                <span
                  className="mono"
                  style={{ color: f.points > 0 ? "var(--low)" : "var(--crit)", fontWeight: 600 }}
                >
                  {f.points > 0 ? "+" : ""}
                  {f.points}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="bloc" style={{ marginBottom: 16 }}>
        <div className="titre">
          <span>Fournisseurs ONSSA — me-too</span>
          <span className="mono">{c.fournisseurs.length}</span>
        </div>
        {c.fournisseurs.length > 0 ? (
          <table className="tbl">
            <thead>
              <tr>
                <th>Fournisseur</th>
                <th>Pays</th>
                <th style={{ textAlign: "right" }}>Lignes Maroc</th>
              </tr>
            </thead>
            <tbody>
              {c.fournisseurs.map((f) => (
                <tr key={f.id}>
                  <td style={{ fontWeight: 500 }}>{f.nom}</td>
                  <td style={{ color: "var(--muted)" }}>{f.pays ?? "à préciser"}</td>
                  <td className="mono" style={{ textAlign: "right" }}>{f.nbLignesMaroc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ fontSize: 13, color: "var(--muted)", padding: "12px 0" }}>
            Aucun fournisseur ONSSA pour cette molécule.
          </p>
        )}
      </div>

      {pastilles.some((p) => p.n > 0) && (
        <div style={{ marginBottom: 18 }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>Sources étrangères — ouvrir le registre</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {pastilles
              .filter((p) => p.n > 0)
              .map((p) => (
                <Link
                  key={p.source}
                  href={`/fournisseurs?q=${q}&source=${p.source}`}
                  className="pill"
                  style={{ fontWeight: 500 }}
                >
                  {p.nom}{" "}
                  <span className="mono" style={{ opacity: 0.7 }}>{p.n}</span>
                </Link>
              ))}
          </div>
        </div>
      )}
    </>
  );
}
