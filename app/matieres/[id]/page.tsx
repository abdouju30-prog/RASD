import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText, TriangleAlert } from "lucide-react";
import { RiskBadge } from "@/components/RiskBadge";
import { StatusPill } from "@/components/StatusPill";
import { MATIERES_PORTEFEUILLE, getMatiere } from "@/lib/data";
import { detailRisque, etatAMM, exposition, fmtDate } from "@/lib/logic";
import { alternativesPour } from "@/lib/dossier";
import { candidat } from "@/lib/sourcing";

export async function generateStaticParams() {
  return MATIERES_PORTEFEUILLE.map((m) => ({ id: m.id }));
}

export default async function MatierePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ma = getMatiere(id);
  if (!ma) notFound();

  const risque = detailRisque(ma);
  const expo = exposition(ma);
  const alts = alternativesPour(ma.id);
  const c = candidat(ma);
  const f = ma.fiche;

  return (
    <>
      <Link
        href="/matieres"
        style={{ color: "var(--muted)", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6 }}
      >
        <ArrowLeft size={14} /> Matières actives
      </Link>

      <div style={{ display: "flex", justifyContent: "space-between", gap: 20, margin: "16px 0 8px" }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>{ma.nom}</h1>
          <div style={{ color: "var(--muted)", fontSize: 13.5, marginTop: 6 }}>
            {f ? `${f.famille} · ${f.modeAction}` : ma.categorie ?? "—"}
          </div>
        </div>
        {risque && <RiskBadge niveau={risque.niveau} score={risque.score} />}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 16, alignItems: "start", marginTop: 22 }}>
        <div style={{ display: "grid", gap: 16 }}>
          {risque ? (
            <div className="card" style={{ padding: "18px 20px" }}>
              <div className="h-title">Décomposition du risque</div>
              <div style={{ display: "grid", gap: 8, marginTop: 14 }}>
                {risque.facteurs.map((x) => (
                  <div
                    key={x.libelle}
                    style={{ display: "flex", justifyContent: "space-between", gap: 14, fontSize: 13.5 }}
                  >
                    <span style={{ color: "var(--muted)" }}>{x.libelle}</span>
                    <span className="mono" style={{ color: "var(--high)", fontWeight: 600 }}>
                      +{x.points}
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
                    fontWeight: 600,
                  }}
                >
                  <span>Score</span>
                  <span className="mono">{risque.score} / 100</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="card" style={{ padding: "18px 20px" }}>
              <div className="h-title">Risque non évalué</div>
              <p style={{ fontSize: 13.5, color: "var(--muted)", marginTop: 10, lineHeight: 1.6 }}>
                Aucune fiche réglementaire vérifiée pour cette molécule. Le score n&apos;est pas calculé —
                l&apos;outil préfère afficher une absence plutôt qu&apos;une estimation. Compléter{" "}
                <span className="mono">lib/reglementaire.ts</span> pour l&apos;activer.
              </p>
            </div>
          )}

          <div className="card" style={{ padding: "18px 20px" }}>
            <div className="h-title">Vos produits — {expo.produits}</div>
            <table className="tbl" style={{ marginTop: 10 }}>
              <thead>
                <tr>
                  <th>Produit</th>
                  <th>AMM</th>
                  <th>Expiration</th>
                  <th>Usages</th>
                  <th>Fournisseur</th>
                </tr>
              </thead>
              <tbody>
                {ma.produitsDetenteur.map((p) => {
                  const e = etatAMM(p);
                  return (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 500 }}>{p.nomCommercial}</td>
                      <td className="mono" style={{ fontSize: 12.5, color: "var(--muted)" }}>
                        {p.amm ?? "—"}
                      </td>
                      <td>
                        <span
                          className="mono"
                          style={{
                            fontSize: 13,
                            color:
                              e.etat === "expirée"
                                ? "var(--crit)"
                                : e.etat === "critique"
                                ? "var(--high)"
                                : "var(--muted)",
                          }}
                        >
                          {fmtDate(p.expiration)}
                        </span>
                      </td>
                      <td className="mono">{p.usages.length}</td>
                      <td style={{ fontSize: 12.5, color: "var(--muted)" }}>
                        {p.fournisseurs.join(", ")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {alts.length > 0 && (
            <div className="card" style={{ padding: "18px 20px" }}>
              <div className="h-title">Alternatives homologables</div>
              <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "6px 0 12px" }}>
                Même catégorie, cibles communes, risque réglementaire plus faible — toutes déjà
                homologuées au Maroc.
              </p>
              <div style={{ display: "grid", gap: 10 }}>
                {alts.map((a) => (
                  <Link
                    key={a.id}
                    href={`/sourcing/${a.id}`}
                    className="card"
                    style={{ padding: "12px 14px", background: "var(--card-2)", display: "block" }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                      <span style={{ fontWeight: 600, fontSize: 13.5 }}>{a.nom}</span>
                      {a.risque && <RiskBadge niveau={a.risque} />}
                    </div>
                    <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 6 }}>
                      {a.rationale}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          {f && (
            <div className="card" style={{ padding: "18px 20px" }}>
              <div className="h-title">Statut réglementaire</div>
              <div style={{ display: "grid", gap: 11, marginTop: 13, fontSize: 13.5 }}>
                <Ligne label="Union européenne" value={<StatusPill value={f.statutUE} />} />
                {f.echeanceUE && (
                  <Ligne
                    label="Échéance UE"
                    value={<span className="mono">{fmtDate(f.echeanceUE)}</span>}
                  />
                )}
                <Ligne label="Maroc" value={<StatusPill value={f.statutMaroc} />} />
                {f.statutVoisins.map((v) => (
                  <Ligne key={v.pays} label={v.pays} value={<StatusPill value={v.statut} />} />
                ))}
              </div>
              {f.drapeaux.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 14 }}>
                  {f.drapeaux.map((d) => (
                    <span key={d} className="pill" style={{ fontWeight: 500, fontSize: 11.5 }}>
                      {d}
                    </span>
                  ))}
                </div>
              )}
              {f.note && (
                <p style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 14, lineHeight: 1.6 }}>
                  {f.note}
                </p>
              )}
              {f.verifie && (
                <p style={{ fontSize: 11, color: "var(--muted-2)", marginTop: 12, lineHeight: 1.5 }}>
                  Source : {f.verifie.source}, consultée le {fmtDate(f.verifie.date)}.
                </p>
              )}
            </div>
          )}

          <div className="card" style={{ padding: "18px 20px" }}>
            <div className="h-title">Position marché</div>
            <div style={{ display: "grid", gap: 11, marginTop: 13, fontSize: 13.5 }}>
              <Ligne label="AMM au Maroc" value={<span className="mono">{ma.nbHomologations}</span>} />
              <Ligne label="Détenteurs" value={<span className="mono">{ma.detenteurs.length}</span>} />
              <Ligne label="Usages homologués" value={<span className="mono">{ma.usages.length}</span>} />
              <Ligne label="Cultures" value={<span className="mono">{ma.cultures.length}</span>} />
              <Ligne
                label="Fournisseurs génériques"
                value={<span className="mono">{c.fournisseursCoutFaible.length}</span>}
              />
            </div>
            {c.paysSourcing.length > 0 && (
              <p style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 12 }}>
                Sourçable depuis : {c.paysSourcing.join(", ")}
              </p>
            )}
          </div>

          <div
            className="card"
            style={{
              padding: "18px 20px",
              borderColor: "color-mix(in srgb, var(--accent) 35%, transparent)",
              background: "color-mix(in srgb, var(--accent) 7%, transparent)",
            }}
          >
            <div className="h-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <FileText size={14} color="var(--accent)" /> Dossier
            </div>
            <p style={{ fontSize: 13, color: "var(--muted)", margin: "9px 0 13px", lineHeight: 1.6 }}>
              Générer le dossier ONSSA pré-rempli pour cette matière active.
            </p>
            <Link href={`/dossiers/generer/${ma.id}`} className="link-accent" style={{ fontSize: 14 }}>
              Générer le dossier →
            </Link>
          </div>

          {!f && (
            <div className="card" style={{ padding: "16px 18px", display: "flex", gap: 10 }}>
              <TriangleAlert size={16} color="var(--mod)" style={{ flexShrink: 0, marginTop: 1 }} />
              <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.6 }}>
                Angle mort : statut UE inconnu. À documenter avant toute décision commerciale sur cette
                molécule.
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function Ligne({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
      <span style={{ color: "var(--muted)" }}>{label}</span>
      {value}
    </div>
  );
}
