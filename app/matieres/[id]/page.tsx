import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { RiskBadge } from "@/components/RiskBadge";
import { getMatiere } from "@/lib/data";
import { detenteurActuel } from "@/lib/detenteur";
import { detailRisque, etatAMM, exposition, fmtDate } from "@/lib/logic";
import { alternatives } from "@/lib/substitution";
import { consultation } from "@/lib/consultation";
import { lectureCroisee } from "@/lib/apvma";
import { resoudre, nbEtranger } from "@/lib/requete";
import { contactDe } from "@/lib/contact";
import { ContactCell } from "@/components/Contact";

export const dynamic = "force-dynamic";

export default async function MatierePage({ params }: { params: Promise<{ id: string }>; }) {
  const { id } = await params;
  const d = await detenteurActuel();
  const ma = getMatiere(id, d.id);
  if (!ma) notFound();

  const risque = detailRisque(ma);
  const expo = exposition(ma, d.id);
  const alts = alternatives(ma.id, 3);
  const cons = consultation(ma.id);
  const f = ma.fiche;
  const au = lectureCroisee(ma.nom, ma.anses?.statut);
  const req = resoudre(ma.molecule);
  const g = req?.estMatiere ? req.gisement : null;
  const q = encodeURIComponent(ma.molecule);

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
        href="/matieres"
        style={{ color: "var(--muted)", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6 }}
      >
        <ArrowLeft size={14} /> Matières
      </Link>

      <div className="fil" style={{ marginTop: 10 }}>Portefeuille · Matière</div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start" }}>
        <div>
          <h1>{ma.nom}</h1>
          <div style={{ color: "var(--muted)", fontSize: 13.5, marginTop: 6 }}>
            {f ? `${f.famille} · ${f.modeAction}` : ma.categorie ?? "—"}
          </div>
        </div>
        {risque && <RiskBadge niveau={risque.niveau} score={risque.score} />}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "14px 0 18px", alignItems: "center" }}>
        {f?.anses && f.anses.statut !== "inconnu" && (
          <span className="pill" style={{ fontWeight: 500 }}>
            ANSES · {f.anses.statut.replace(/_/g, " ")}
          </span>
        )}
        {f && (
          <span className="pill" style={{ fontWeight: 500 }}>
            UE · {f.statutUE.replace(/_/g, " ")}
          </span>
        )}
        {f?.echeanceUE && (
          <span className="pill mono">échéance {fmtDate(f.echeanceUE)}</span>
        )}
        {f && (
          <span className="pill" style={{ fontWeight: 500 }}>
            Maroc · {f.statutMaroc.replace(/_/g, " ")}
          </span>
        )}
        {f?.drapeaux.slice(0, 4).map((x) => (
          <span key={x} className="pill" style={{ fontSize: 11 }}>{x}</span>
        ))}
        {!f && (
          <span className="pill" style={{ color: "var(--mod)" }}>statut UE inconnu</span>
        )}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
        <Link
          href={`/dossiers/generer/${ma.id}`}
          className="pill"
          style={{ fontWeight: 600, color: "var(--accent-fg)", background: "var(--accent)", borderColor: "var(--accent)" }}
        >
          Dossier 3-B
        </Link>
        <Link href={`/consultation/${ma.id}`} className="pill" style={{ fontWeight: 500 }}>
          Consulter
        </Link>
        <Link href={`/fournisseurs?q=${q}`} className="pill" style={{ fontWeight: 500 }}>
          Fournisseurs
          {g && nbEtranger(g) > 0 && (
            <span className="mono" style={{ marginLeft: 6, opacity: 0.7 }}>{nbEtranger(g)}</span>
          )}
        </Link>
      </div>

      {risque && (
        <div className="card" style={{ padding: "14px 18px", marginBottom: 16 }}>
          <div className="h-title">Risque {risque.score} / 100</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 18px", marginTop: 10, fontSize: 13 }}>
            {risque.facteurs.map((x) => (
              <span key={x.libelle} style={{ color: "var(--muted)" }}>
                {x.libelle}{" "}
                <span className="mono" style={{ color: "var(--high)", fontWeight: 600 }}>+{x.points}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="bloc" style={{ marginBottom: 16 }}>
        <div className="titre">
          <span>Vos produits</span>
          <span className="mono">{expo.produits}</span>
        </div>
        <table className="tbl">
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
                  <td className="mono" style={{ fontSize: 12.5, color: "var(--muted)" }}>{p.amm ?? "—"}</td>
                  <td>
                    <span
                      className="mono"
                      style={{
                        fontSize: 13,
                        color:
                          e.etat === "expirée" ? "var(--crit)" : e.etat === "critique" ? "var(--high)" : "var(--muted)",
                      }}
                    >
                      {fmtDate(p.expiration)}
                    </span>
                  </td>
                  <td className="mono">{p.usages.length}</td>
                  <td style={{ fontSize: 12.5, color: "var(--muted)" }}>{p.fournisseurs.join(", ")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {ma.produitsDetenteur.length === 0 && (
          <p style={{ fontSize: 13, color: "var(--muted)", padding: "12px 0" }}>
            Aucun produit de {d.nom} ne porte cette molécule.
          </p>
        )}
      </div>

      <div className="bloc" style={{ marginBottom: 16 }}>
        <div className="titre">
          <span>Fournisseurs ONSSA — me-too</span>
          <span className="mono">{cons?.meToo.length ?? 0}</span>
        </div>
        {cons && cons.meToo.length > 0 ? (
          <table className="tbl">
            <thead>
              <tr>
                <th>Fournisseur</th>
                <th>Pays</th>
                <th>Contact</th>
                <th style={{ textAlign: "right" }}>Lignes Maroc</th>
              </tr>
            </thead>
            <tbody>
              {cons.meToo.map((x) => (
                <tr key={x.id}>
                  <td style={{ fontWeight: 500 }}>{x.nom}</td>
                  <td style={{ color: "var(--muted)" }}>{x.pays ?? "à préciser"}</td>
                  <td>
                    <ContactCell c={contactDe(x.nom, x.id.startsWith("onssa-") ? x.id.slice(6) : undefined)} />
                  </td>
                  <td className="mono" style={{ textAlign: "right" }}>{x.lignesMaroc ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ fontSize: 13, color: "var(--muted)", padding: "12px 0" }}>
            {cons?.route.lecture ?? "Aucun fournisseur ONSSA pour cette molécule."}
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

      {alts.length > 0 && (
        <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 12 }}>
          Remplacer par{" "}
          {alts.map((a, i) => (
            <span key={a.molecule}>
              {i > 0 && ", "}
              <span style={{ color: "var(--fg)", fontWeight: 500 }}>{a.molecule}</span>
            </span>
          ))}
          .
        </p>
      )}

      {au.convergence === "divergence" && (
        <p style={{ fontSize: 12.5, color: "var(--info)", lineHeight: 1.55 }}>
          Recoupement Australie : {au.titre}. {au.lecture}
        </p>
      )}
    </>
  );
}
