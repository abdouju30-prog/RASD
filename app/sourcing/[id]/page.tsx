import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Globe2, FileText, TriangleAlert, Building2 } from "lucide-react";
import { RiskBadge } from "@/components/RiskBadge";
import { candidatParId, candidats } from "@/lib/sourcing";
import { getMatiere } from "@/lib/data";
import { ficheFournisseur } from "@/lib/packs-fournisseur";
import { FicheAgrements, PastillesPacks } from "@/components/PacksFournisseur";

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

  return (
    <>
      <Link
        href="/sourcing"
        style={{ color: "var(--muted)", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6 }}
      >
        <ArrowLeft size={14} /> Prospection
      </Link>

      <div style={{ display: "flex", justifyContent: "space-between", gap: 20, margin: "16px 0 6px" }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>{c.nom}</h1>
        <div style={{ textAlign: "right" }}>
          <div className="mono" style={{ fontSize: 30, fontWeight: 600, color: "var(--accent)", lineHeight: 1 }}>
            {c.score}
          </div>
          <div className="eyebrow" style={{ marginTop: 5 }}>score d&apos;attractivité</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 22 }}>
        <span className="pill">{c.categorie ?? "—"}</span>
        <span className="pill">{c.nbHomologations} AMM au Maroc</span>
        <span className="pill">{c.nbDetenteurs} détenteur(s)</span>
        {c.risque ? (
          <RiskBadge niveau={c.risque} score={c.scoreRisque ?? undefined} />
        ) : (
          <span
            className="pill"
            style={{
              color: "var(--mod)",
              borderColor: "color-mix(in srgb, var(--mod) 45%, transparent)",
              background: "color-mix(in srgb, var(--mod) 12%, transparent)",
            }}
          >
            <span className="dot" style={{ background: "var(--mod)" }} />
            risque non évalué
          </span>
        )}
        <span
          className="pill"
          style={{
            color: "var(--accent)",
            borderColor: "color-mix(in srgb, var(--accent) 45%, transparent)",
            background: "color-mix(in srgb, var(--accent) 12%, transparent)",
          }}
        >
          voie me-too
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 16, alignItems: "start" }}>
        <div style={{ display: "grid", gap: 16 }}>
          <div className="card" style={{ padding: "18px 20px" }}>
            <div className="h-title">Décomposition du score</div>
            <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "6px 0 14px" }}>
              Chaque facteur est affiché pour que le classement soit discutable, pas subi.
            </p>
            <div style={{ display: "grid", gap: 8 }}>
              {c.facteurs.map((f) => (
                <div
                  key={f.libelle}
                  style={{ display: "flex", justifyContent: "space-between", gap: 14, fontSize: 13.5 }}
                >
                  <span style={{ color: "var(--muted)" }}>{f.libelle}</span>
                  <span
                    className="mono"
                    style={{ color: f.points > 0 ? "var(--low)" : "var(--crit)", fontWeight: 600 }}
                  >
                    {f.points > 0 ? "+" : ""}
                    {f.points}
                  </span>
                </div>
              ))}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  borderTop: "1px solid var(--border)",
                  paddingTop: 10,
                  marginTop: 4,
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                <span>Total</span>
                <span className="mono" style={{ color: "var(--accent)" }}>{c.score}</span>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: "18px 20px" }}>
            <div className="h-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Building2 size={14} /> Fournisseurs référencés à l&apos;ONSSA
            </div>
            <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "6px 0 14px", lineHeight: 1.6 }}>
              Ces sociétés fournissent déjà cette matière active à des détenteurs marocains : leur
              dossier technique a donc déjà passé l&apos;ONSSA. C&apos;est la liste à consulter en premier.
            </p>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Fournisseur</th>
                  <th>Pays</th>
                  <th>Réf. Maroc</th>
                  <th>Profil</th>
                  <th>Agréments déclarés</th>
                </tr>
              </thead>
              <tbody>
                {c.fournisseurs.map((f) => (
                  <tr key={f.id}>
                    <td style={{ fontSize: 13 }}>{f.nom}</td>
                    <td style={{ fontSize: 13, color: "var(--muted)" }}>
                      {f.pays ?? "à préciser"}
                      {f.pays && !f.paysFiable && (
                        <span style={{ color: "var(--mod)", fontSize: 11 }}> ?</span>
                      )}
                    </td>
                    <td className="mono" style={{ fontSize: 13 }}>{f.nbLignesMaroc}</td>
                    <td>
                      {f.coutFaible ? (
                        <span
                          className="pill"
                          style={{
                            color: "var(--accent)",
                            borderColor: "color-mix(in srgb, var(--accent) 40%, transparent)",
                            background: "color-mix(in srgb, var(--accent) 11%, transparent)",
                          }}
                        >
                          générique
                        </span>
                      ) : f.multinationale ? (
                        <span className="pill">multinationale</span>
                      ) : (
                        <span className="pill">autre</span>
                      )}
                    </td>
                    <td>
                      <PastillesPacks packs={ficheFournisseur(f.id)?.packs ?? []} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ fontSize: 11.5, color: "var(--muted-2)", marginTop: 12, lineHeight: 1.5 }}>
              Le pays est déduit du nom de la société ; « ? » signale une déduction faite sur le seul
              suffixe juridique. À confirmer avant toute prise de contact.
            </p>
          </div>

          <div className="card" style={{ padding: "18px 20px" }}>
            <div className="h-title">Usages homologués au Maroc — {c.nbUsages}</div>
            <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "6px 0 14px" }}>
              Chacun est un précédent : dose et DAR déjà acceptés par l&apos;ONSSA chez un autre détenteur.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {c.usages.slice(0, 40).map((u) => (
                <span key={u} className="pill" style={{ fontWeight: 500, fontSize: 11.5 }}>
                  {u}
                </span>
              ))}
              {c.usages.length > 40 && (
                <span className="pill" style={{ fontWeight: 500 }}>+{c.usages.length - 40}</span>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          <div
            className="card"
            style={{
              padding: "18px 20px",
              borderColor: "color-mix(in srgb, var(--accent) 35%, transparent)",
              background: "color-mix(in srgb, var(--accent) 7%, transparent)",
            }}
          >
            <div className="h-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <FileText size={14} color="var(--accent)" /> Passer au dossier
            </div>
            <p style={{ fontSize: 13, color: "var(--muted)", margin: "9px 0 14px", lineHeight: 1.6 }}>
              Génère la structure du dossier ONSSA pré-rempli : rubriques, répartition des
              responsabilités, usages revendicables et objections prévisibles.
            </p>
            <Link href={`/dossiers/generer/${c.id}`} className="link-accent" style={{ fontSize: 14 }}>
              Générer le dossier →
            </Link>
          </div>

          {(() => {
            const avecFiche = c.fournisseurs
              .map((f) => ficheFournisseur(f.id))
              .filter((f): f is NonNullable<typeof f> => Boolean(f));
            return avecFiche.map((f) => <FicheAgrements key={f.nom} fiche={f} />);
          })()}

          <div className="card" style={{ padding: "18px 20px" }}>
            <div className="h-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Globe2 size={14} /> Concurrence en place
            </div>
            <div style={{ display: "grid", gap: 7, marginTop: 12 }}>
              {c.detenteurs.map((d) => (
                <div key={d} style={{ fontSize: 13, color: "var(--muted)" }}>
                  {d}
                </div>
              ))}
              {c.detenteurs.length === 0 && (
                <div style={{ fontSize: 13, color: "var(--accent)" }}>
                  Aucun détenteur — marché entièrement ouvert.
                </div>
              )}
            </div>
          </div>

          {!ma.fiche && (
            <div
              className="card"
              style={{
                padding: "18px 20px",
                borderColor: "color-mix(in srgb, var(--mod) 38%, transparent)",
                background: "color-mix(in srgb, var(--mod) 7%, transparent)",
              }}
            >
              <div className="h-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <TriangleAlert size={14} color="var(--mod)" /> Statut réglementaire inconnu
              </div>
              <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 11, lineHeight: 1.65 }}>
                Aucune fiche vérifiée pour cette molécule : son statut d&apos;approbation UE n&apos;est
                pas renseigné, et le filtre de risque ne s&apos;y est donc pas appliqué. Une molécule
                attractive commercialement peut être interdite en UE — le vérifier sur la EU Pesticides
                Database <strong style={{ color: "var(--fg)" }}>avant</strong> de consulter un
                fournisseur, puis compléter <span className="mono">lib/reglementaire.ts</span>.
              </p>
            </div>
          )}

          {ma.fiche && (
            <div className="card" style={{ padding: "18px 20px" }}>
              <div className="h-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <TriangleAlert size={14} color="var(--mod)" /> Profil réglementaire
              </div>
              <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 11, lineHeight: 1.6 }}>
                <div>
                  Statut UE :{" "}
                  <strong style={{ color: "var(--fg)" }}>
                    {ma.fiche.statutUE.replace(/_/g, " ")}
                  </strong>
                </div>
                {ma.fiche.drapeaux.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                    {ma.fiche.drapeaux.map((d) => (
                      <span key={d} className="pill" style={{ fontWeight: 500, fontSize: 11.5 }}>
                        {d}
                      </span>
                    ))}
                  </div>
                )}
                {ma.fiche.note && <p style={{ marginTop: 11 }}>{ma.fiche.note}</p>}
              </div>
              <Link
                href={`/matieres/${ma.id}`}
                className="link-accent"
                style={{ fontSize: 13, display: "inline-block", marginTop: 12 }}
              >
                Fiche complète →
              </Link>
            </div>
          )}

          <div className="card" style={{ padding: "18px 20px" }}>
            <div className="h-title">Cultures couvertes — {c.nbCultures}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
              {c.cultures.slice(0, 30).map((cu) => (
                <span key={cu} className="pill" style={{ fontWeight: 500, fontSize: 11.5 }}>
                  {cu}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
