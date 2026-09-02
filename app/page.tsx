import Link from "next/link";
import { AlertTriangle, ArrowRight, ShieldQuestion } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { RiskBadge } from "@/components/RiskBadge";
import { RiskMatrix, type MatrixPoint } from "@/components/RiskMatrix";
import { META, matieresDuPortefeuille, produitsDe } from "@/lib/data";
import { detenteurActuel } from "@/lib/detenteur";
import { alertes, anglesMorts, statsAlertes } from "@/lib/alertes";
import {
  CA_DISPONIBLE,
  ammEcheance,
  ammExpirees,
  fmtDate,
  fmtMAD,
  portefeuilleClasse,
  usagesTotal,
} from "@/lib/logic";
import { COUVERTURE } from "@/lib/reglementaire";

export default async function RadarPage() {
  const d = await detenteurActuel();
  const classe = portefeuilleClasse(d.id);
  const st = statsAlertes(d.id);
  const expirees = ammExpirees(d.id);
  const proches = ammEcheance(d.id, 18);
  const morts = anglesMorts(d.id);
  const top = alertes(d.id).slice(0, 5);
  const produits = produitsDe(d.id);

  const points: MatrixPoint[] = classe
    .filter((c) => c.risque !== null)
    .map((c) => ({
      id: c.ma.id,
      nom: c.ma.molecule,
      score: c.risque!.score,
      expo: CA_DISPONIBLE && c.expo.ca ? c.expo.ca : c.expo.usages,
    }));

  const usagesARisque = classe
    .filter((c) => (c.risque?.score ?? 0) >= 55)
    .reduce((s, c) => s + c.expo.usages, 0);

  return (
    <>
      <div className="eyebrow">
        Radar réglementaire · {d.nom} · index du {fmtDate(META.genere.slice(0, 10))}
      </div>
      <h1 style={{ fontSize: 30, fontWeight: 700, margin: "10px 0 8px" }}>Tour de contrôle</h1>
      <p style={{ color: "var(--muted)", maxWidth: 660, lineHeight: 1.6, marginTop: 0 }}>
        Chaque signal est relié aux produits concernés et à l&apos;alternative à homologuer.
      </p>

      {st.critiques > 0 && (
        <Link
          href="/veille"
          className="card"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "13px 18px",
            margin: "22px 0 0",
            borderColor: "color-mix(in srgb, var(--crit) 40%, transparent)",
            background: "color-mix(in srgb, var(--crit) 8%, transparent)",
          }}
        >
          <AlertTriangle size={17} color="var(--crit)" />
          <span style={{ fontSize: 14 }}>
            <strong>{st.critiques} alerte(s) critique(s)</strong> sur {st.total} détections —{" "}
            {st.produitsTouches} produits concernés.
          </span>
          <span className="link-accent" style={{ marginLeft: "auto", fontSize: 13.5 }}>
            Voir le flux <ArrowRight size={13} style={{ display: "inline", verticalAlign: -2 }} />
          </span>
        </Link>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
          gap: 14,
          margin: "18px 0 26px",
        }}
      >
        <StatCard
          label="AMM expirées"
          value={String(expirees.length)}
          unit={`/ ${produits.length}`}
          tone={expirees.length ? "crit" : "low"}
          sub={expirees.length ? expirees.map((p) => p.nomCommercial).join(" · ") : "aucune"}
        />
        <StatCard
          label="AMM < 18 mois"
          value={String(proches.length)}
          tone={proches.length ? "high" : "low"}
          sub="échéances à sécuriser"
        />
        <StatCard
          label="Usages à risque élevé"
          value={String(usagesARisque)}
          unit={`/ ${usagesTotal(d.id)}`}
          tone={usagesARisque ? "high" : "low"}
          sub="usages portés par une M.A. en risque ≥ 55"
        />
        <StatCard
          label={CA_DISPONIBLE ? "CA exposé" : "Matières actives"}
          value={
            CA_DISPONIBLE
              ? fmtMAD(
                  classe
                    .filter((c) => (c.risque?.score ?? 0) >= 55)
                    .reduce((s, c) => s + (c.expo.ca ?? 0), 0)
                )
              : String(matieresDuPortefeuille(d.id).length)
          }
          unit={CA_DISPONIBLE ? "MAD" : "au portefeuille"}
          tone="default"
          sub={CA_DISPONIBLE ? "sur risque ≥ 55" : `${COUVERTURE.nbVerifiees} fiches UE vérifiées`}
        />
      </div>

      {/* La matrice prend toute la largeur : c'est une carte de décision, elle
          se lit d'autant mieux qu'elle respire. La légende passe à côté du
          titre, les actions en dessous. */}
      <div className="card" style={{ padding: "16px 20px 10px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 6,
          }}
        >
          <span className="h-title">Matrice risque × exposition</span>
          <span style={{ color: "var(--muted-2)", fontSize: 11.5 }}>
            Taille de bulle ={" "}
            {CA_DISPONIBLE ? "chiffre d'affaires" : "usages homologués détenus"} · cliquez une bulle
            pour analyser la matière active
          </span>
        </div>
        {points.length ? (
          <RiskMatrix points={points} labelY={CA_DISPONIBLE ? "Exposition CA" : "Usages détenus"} />
        ) : (
          <p style={{ color: "var(--muted)", fontSize: 13, padding: "30px 0" }}>
            Aucune matière active du portefeuille ne dispose d&apos;une fiche réglementaire vérifiée.
          </p>
        )}
      </div>

      <div className="section">
        <span className="h-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <AlertTriangle size={14} color="var(--mod)" /> Actions recommandées
        </span>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 12,
            marginTop: 10,
          }}
        >
          {top.map((a) => (
            <Link
              key={a.id}
              href={a.matiere ? `/matieres/${a.matiere.id}` : "/veille"}
              className="card"
              style={{ padding: "12px 14px", display: "block" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <span style={{ fontWeight: 600, fontSize: 13.5 }}>{a.titre}</span>
                <RiskBadge niveau={a.niveau} />
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
                {a.produits.length} produit(s) · {a.usages} usage(s)
              </div>
              <div className="link-accent" style={{ fontSize: 12.5, marginTop: 8 }}>
                {a.action}
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginTop: 16, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px 4px" }}>
          <div className="h-title">Matières actives du portefeuille</div>
        </div>
        <table className="tbl">
          <thead>
            <tr>
              <th>Matière active</th>
              <th>Catégorie</th>
              <th>Produits</th>
              <th>Usages</th>
              <th>Statut UE</th>
              <th>Risque</th>
            </tr>
          </thead>
          <tbody>
            {classe.map(({ ma, risque, expo }) => (
              <tr key={ma.id}>
                <td>
                  <Link href={`/matieres/${ma.id}`} className="link-accent">
                    {ma.nom}
                  </Link>
                </td>
                <td style={{ color: "var(--muted)", fontSize: 13 }}>{ma.categorie ?? "—"}</td>
                <td className="mono">{expo.produits}</td>
                <td className="mono">{expo.usages}</td>
                <td style={{ fontSize: 13, color: "var(--muted)" }}>
                  {ma.fiche && ma.fiche.statutUE !== "inconnu"
                    ? ma.fiche.statutUE.replace(/_/g, " ")
                    : "non renseigné"}
                </td>
                <td>
                  {risque ? (
                    <RiskBadge niveau={risque.niveau} score={risque.score} />
                  ) : (
                    <span style={{ color: "var(--muted-2)", fontSize: 12.5 }}>—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {morts.length > 0 && (
        <div
          className="card"
          style={{
            marginTop: 16,
            padding: "14px 18px",
            display: "flex",
            gap: 12,
            alignItems: "flex-start",
          }}
        >
          <ShieldQuestion size={17} color="var(--muted)" style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>
            <strong style={{ color: "var(--fg)" }}>Angles morts — {morts.length} matière(s) active(s)</strong>{" "}
            du portefeuille sans statut UE renseigné :{" "}
            {morts.map((m) => m.molecule).join(", ")}. Elles n&apos;apparaissent ni dans la matrice ni dans
            les alertes tant que leur fiche n&apos;est pas complétée dans{" "}
            <span className="mono">lib/reglementaire.ts</span>.
          </div>
        </div>
      )}
    </>
  );
}
