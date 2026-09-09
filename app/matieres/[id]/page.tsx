import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText, TriangleAlert, Globe } from "lucide-react";
import { RiskBadge } from "@/components/RiskBadge";
import { StatusPill } from "@/components/StatusPill";
import { getMatiere } from "@/lib/data";
import { detenteurActuel } from "@/lib/detenteur";
import { detailRisque, etatAMM, exposition, fmtDate } from "@/lib/logic";
import { alternatives } from "@/lib/substitution";
import { TableAlternatives } from "@/components/Alternatives";
import { QuiLaFournit } from "@/components/Fournisseurs";
import { consultation } from "@/lib/consultation";
import { lectureCroisee, STATS_APVMA } from "@/lib/apvma";
import { partenairesDe } from "@/lib/melanges";
import { Partenaires } from "@/components/Partenaires";
import { marcheDe } from "@/lib/concurrents";
import { Concurrents } from "@/components/Concurrents";
import { spectreDe } from "@/lib/usages";
import { Usages } from "@/components/Usages";
import { usagesCoreens } from "@/lib/coree-usages";
import { UsagesCoree } from "@/components/UsagesCoree";

// Le contenu dépend du détenteur choisi, qui est lu dans un cookie : la page
// ne peut donc pas être pré-générée.
export const dynamic = "force-dynamic";

export default async function MatierePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = await detenteurActuel();
  const ma = getMatiere(id, d.id);
  if (!ma) notFound();

  const risque = detailRisque(ma);
  const expo = exposition(ma, d.id);
  const alts = alternatives(ma.id);
  // Les fournisseurs de la molécule, tous registres confondus. La fiche de
  // consultation les assemble déjà : la fiche de matière active en montre le
  // résumé plutôt que d'en refaire le calcul.
  const cons = consultation(ma.id);
  const spectre = spectreDe(ma, d.id);
  const f = ma.fiche;
  const au = lectureCroisee(ma.nom, ma.anses?.statut);

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
          <h1>{ma.nom}</h1>
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

          <div className="card" style={{ padding: "18px 20px" }}>
            <div className="h-title">Par quoi la remplacer — {alts.length}</div>
            {alts.length > 0 ? (
              <div style={{ marginTop: 12 }}>
                <TableAlternatives alts={alts} />
              </div>
            ) : (
              <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "9px 0 0", lineHeight: 1.6 }}>
                Aucune matière active de la même catégorie ne couvre une cible, un usage ou une
                culture en commun avec un risque réglementaire plus faible.
              </p>
            )}
          </div>

          {cons && (
            <QuiLaFournit
              maId={ma.id}
              route={cons.route}
              meToo={cons.meToo}
              autres={cons.autres}
            />
          )}

          <Usages s={spectre} />

          <UsagesCoree m={usagesCoreens(ma.nom)} culturesMaroc={spectre.cultures} />

          <Concurrents m={marcheDe(ma, d.id)} />

          <Partenaires liste={partenairesDe(ma)} />
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          {f && (
            <div className="card" style={{ padding: "18px 20px" }}>
              <div className="h-title">Statut réglementaire</div>
              <div style={{ display: "grid", gap: 11, marginTop: 13, fontSize: 13.5 }}>
                <Ligne
                  label="France · ANSES"
                  value={
                    f.anses && f.anses.statut !== "inconnu" ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <StatusPill value={f.anses.statut === "retirée" ? "retirée" : "en_cours"} />
                        {f.anses.deduit && (
                          <span style={{ fontSize: 10.5, color: "var(--muted-2)" }}>déduit</span>
                        )}
                      </span>
                    ) : (
                      <span style={{ color: "var(--muted-2)", fontSize: 12.5 }}>non renseigné</span>
                    )
                  }
                />
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

          <div
            className="card"
            style={{
              padding: "18px 20px",
              borderColor:
                au.convergence === "divergence"
                  ? "color-mix(in srgb, var(--info) 40%, transparent)"
                  : "var(--border)",
            }}
          >
            <div className="h-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Globe size={14} color={au.convergence === "divergence" ? "var(--info)" : "var(--muted-2)"} />
              Recoupement Australie
            </div>
            <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 11 }}>{au.titre}</div>
            <p style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.6, margin: "6px 0 0" }}>
              {au.lecture}
            </p>
            {au.constituant && (
              <div style={{ fontSize: 11.5, color: "var(--muted-2)", marginTop: 10 }}>
                Apparié à <span className="mono">{au.constituant.nom}</span>
                {au.constituant.famille ? ` · ${au.constituant.famille}` : ""}
              </div>
            )}
            <p style={{ fontSize: 11, color: "var(--muted-2)", marginTop: 10, lineHeight: 1.5 }}>
              {STATS_APVMA.attribution} · {STATS_APVMA.licence}. L&apos;APVMA ne gouverne pas
              l&apos;ONSSA : ce statut ne pèse pas dans le score de risque, il sert d&apos;argument.
            </p>
          </div>

          <div className="card" style={{ padding: "18px 20px" }}>
            <div className="h-title">Position marché</div>
            <div style={{ display: "grid", gap: 11, marginTop: 13, fontSize: 13.5 }}>
              <Ligne label="AMM au Maroc" value={<span className="mono">{ma.nbHomologations}</span>} />
              <Ligne label="Détenteurs" value={<span className="mono">{ma.detenteurs.length}</span>} />
              <Ligne label="Usages homologués" value={<span className="mono">{ma.usages.length}</span>} />
              <Ligne label="Cultures" value={<span className="mono">{ma.cultures.length}</span>} />
            </div>
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
