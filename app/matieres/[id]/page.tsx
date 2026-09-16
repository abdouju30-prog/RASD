import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Globe } from "lucide-react";
import { RiskBadge } from "@/components/RiskBadge";
import { StatusPill } from "@/components/StatusPill";
import { getMatiere } from "@/lib/data";
import { detenteurActuel } from "@/lib/detenteur";
import { detailRisque, etatAMM, exposition, fmtDate } from "@/lib/logic";
import { alternatives } from "@/lib/substitution";
import { TableAlternatives } from "@/components/Alternatives";
import { marcheDe } from "@/lib/concurrents";
import { Concurrents } from "@/components/Concurrents";
import { consultation } from "@/lib/consultation";
import { lectureCroisee, STATS_APVMA } from "@/lib/apvma";
import { partenairesDe } from "@/lib/melanges";
import { Partenaires } from "@/components/Partenaires";
import { resoudre, nbEtranger } from "@/lib/requete";
import { contactDe } from "@/lib/contact";
import { ContactCell } from "@/components/Contact";
import { BanniereOnssa } from "@/components/SignalOnssa";
import { spectreDe } from "@/lib/usages";
import { Usages } from "@/components/Usages";
import { usagesCoreens } from "@/lib/coree-usages";
import { UsagesCoree } from "@/components/UsagesCoree";

export const dynamic = "force-dynamic";

export default async function MatierePage({ params }: { params: Promise<{ id: string }>; }) {
  const { id } = await params;
  const d = await detenteurActuel();
  const ma = getMatiere(id, d.id);
  if (!ma) notFound();

  const risque = detailRisque(ma);
  const expo = exposition(ma, d.id);
  const spectre = spectreDe(ma, d.id);
  const alts = alternatives(ma.id, 8);
  const marche = marcheDe(ma, d.id);
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
        {au.constituant && (
          <Link
            href={`/constituants/${au.constituant.id}`}
            className="pill"
            style={{ fontWeight: 500 }}
            title={au.lecture}
          >
            AU · {au.constituant.statut} · {au.constituant.nbProduitsAgricoles} prod.
          </Link>
        )}
        {f?.drapeaux.map((x) => (
          <span key={x} className="pill" style={{ fontSize: 11 }}>{x}</span>
        ))}
        {!f && (
          <span className="pill" style={{ color: "var(--mod)" }}>statut UE inconnu</span>
        )}
        <span className="pill mono">
          {spectre.emplois.length} usage(s) · {spectre.cultures.length} culture(s)
        </span>
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

      <BanniereOnssa ma={ma} />

      <div style={{ marginBottom: 16 }}>
        <Usages s={spectre} />
      </div>
      <div style={{ marginBottom: 16 }}>
        <UsagesCoree m={usagesCoreens(ma.nom)} culturesMaroc={spectre.cultures} />
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

      {f && (
        <div className="card" style={{ padding: "14px 18px", marginBottom: 16 }}>
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
              {f.drapeaux.map((drap) => (
                <span key={drap} className="pill" style={{ fontWeight: 500, fontSize: 11.5 }}>
                  {drap}
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
      {!f && (
        <div className="card" style={{ padding: "14px 18px", marginBottom: 16, display: "flex", gap: 10 }}>
          <span style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.6 }}>
            Angle mort : statut UE inconnu. À documenter avant toute décision commerciale sur cette
            molécule.
          </span>
        </div>
      )}

      <div
        className="card"
        style={{
          padding: "14px 18px",
          marginBottom: 16,
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

      <div className="card" style={{ padding: "14px 18px", marginBottom: 16 }}>
        <div className="h-title">Position marché</div>
        <div style={{ display: "grid", gap: 11, marginTop: 13, fontSize: 13.5 }}>
          <Ligne label="AMM au Maroc" value={<span className="mono">{ma.nbHomologations}</span>} />
          <Ligne label="Détenteurs" value={<span className="mono">{ma.detenteurs.length}</span>} />
          <Ligne label="Usages homologués" value={<span className="mono">{ma.usages.length}</span>} />
          <Ligne label="Cultures" value={<span className="mono">{ma.cultures.length}</span>} />
        </div>
      </div>

      <div className="card" style={{ padding: "14px 18px", marginBottom: 16 }}>
        <div className="h-title">Par quoi la remplacer — {alts.length}</div>
        {alts.length > 0 ? (
          <div style={{ marginTop: 12 }}>
            <TableAlternatives alts={alts} />
          </div>
        ) : (
          <p style={{ fontSize: 13, color: "var(--muted)", margin: "10px 0 0", lineHeight: 1.6 }}>
            Aucune matière active de la même catégorie ne couvre une cible, un usage ou une
            culture en commun avec un risque réglementaire plus faible.
          </p>
        )}
      </div>

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

      <div style={{ marginBottom: 16 }}>
        <Concurrents m={marche} />
      </div>

      <div style={{ marginBottom: 16 }}>
        <Partenaires liste={partenairesDe(ma)} />
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
