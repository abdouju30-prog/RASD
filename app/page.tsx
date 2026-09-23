import Link from "next/link";
import { AlertTriangle, ArrowRight, ShieldQuestion } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { RiskBadge } from "@/components/RiskBadge";
import { RiskMatrix, type MatrixPoint } from "@/components/RiskMatrix";
import { matieresDuPortefeuille, produitsDe } from "@/lib/data";
import { detenteurActuel } from "@/lib/detenteur";
import { alertes, anglesMorts, statsAlertes } from "@/lib/alertes";
import {
  CA_DISPONIBLE,
  ammEcheance,
  ammExpirees,
  fmtMAD,
  portefeuilleClasse,
  usagesTotal,
} from "@/lib/logic";
import { COUVERTURE } from "@/lib/reglementaire";
import { alternatives } from "@/lib/substitution";
import { AlternativesCompactes } from "@/components/Alternatives";
import { NouveautesOnssa } from "@/components/NouveautesOnssa";
import { RequeteHomologation } from "@/components/RequeteHomologation";

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
      <div className="fil">Portefeuille · Vue</div>
      <h1>Tour de contrôle</h1>

      <div className="card" style={{ padding: "16px 18px", marginTop: 16 }}>
        <div className="h-title" style={{ marginBottom: 6 }}>
          Recherche homologation
        </div>
        <p className="chapeau" style={{ marginBottom: 12 }}>
          Substance, culture, ravageur ou société — enregistrements ONSSA, dose, DAR et échéance d&apos;AMM.
        </p>
        <RequeteHomologation />
      </div>

      <NouveautesOnssa compact />

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

      <div className="card" style={{ padding: "16px 20px 10px", marginBottom: 18 }}>
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
            Taille de bulle = {CA_DISPONIBLE ? "chiffre d'affaires" : "usages détenus"}
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
            // La carte n'est plus un lien : les remplaçants en contiennent, et
            // un lien imbriqué dans un lien n'est pas du HTML valide.
            <div key={a.id} className="card" style={{ padding: "12px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <Link
                  href={a.matiere ? `/matieres/${a.matiere.id}` : "/veille"}
                  className="link-accent"
                  style={{ fontWeight: 600, fontSize: 13.5 }}
                >
                  {a.titre}
                </Link>
                <RiskBadge niveau={a.niveau} />
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
                {a.produits.length} produit(s) · {a.usages} usage(s)
              </div>
              {a.matiere && <AlternativesCompactes alts={alternatives(a.matiere.id, 3)} />}
            </div>
          ))}
        </div>
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
            <strong style={{ color: "var(--fg)" }}>Angles morts — {morts.length} matière(s)</strong>{" "}
            sans statut UE, donc absentes de la matrice et des alertes :{" "}
            {morts.map((m) => m.molecule).join(", ")}.
          </div>
        </div>
      )}
    </>
  );
}
