import Link from "next/link";
import { CalendarClock, Ban, Flag, Timer, RefreshCw, Info, ShieldAlert } from "lucide-react";
import { RiskBadge } from "@/components/RiskBadge";
import { alertes, statsAlertes, type TypeAlerte } from "@/lib/alertes";
import { fmtDate } from "@/lib/logic";
import { COUVERTURE } from "@/lib/reglementaire";
import { META } from "@/lib/data";
import { detenteurActuel } from "@/lib/detenteur";
import { STATS_EPHY } from "@/lib/ephy";
import { FraicheurEphy } from "@/components/FraicheurEphy";
import { Aide } from "@/components/Aide";

const ICONE: Record<TypeAlerte, typeof Ban> = {
  anses_retrait: ShieldAlert,
  amm_expiree: Ban,
  amm_echeance: CalendarClock,
  ue_non_renouvelee: Ban,
  ue_echeance_depassee: Timer,
  ue_echeance_proche: CalendarClock,
  candidate_substitution: Flag,
};

const LIBELLE: Record<TypeAlerte, string> = {
  anses_retrait: "Retrait ANSES — l'ONSSA suivra",
  amm_expiree: "AMM expirée",
  amm_echeance: "Échéance AMM",
  ue_non_renouvelee: "Approbation UE perdue",
  ue_echeance_depassee: "Échéance UE dépassée",
  ue_echeance_proche: "Échéance UE proche",
  candidate_substitution: "Candidate à la substitution",
};

export default async function VeillePage() {
  const d = await detenteurActuel();
  const list = alertes(d.id);
  const st = statsAlertes(d.id);

  return (
    <>
      <div className="eyebrow">Veille réglementaire</div>
      <h1 style={{ fontSize: 30, fontWeight: 700, margin: "10px 0 8px" }}>Flux d&apos;alertes</h1>
      <p style={{ color: "var(--muted)", maxWidth: 720, lineHeight: 1.6, marginTop: 0 }}>
        Recalculées à chaque affichage. Rien n&apos;est stocké.
      </p>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", margin: "20px 0 8px" }}>
        <span className="pill">
          <RefreshCw size={12} /> {st.total} détection(s)
        </span>
        <span
          className="pill"
          style={{
            color: "var(--crit)",
            borderColor: "color-mix(in srgb, var(--crit) 40%, transparent)",
            background: "color-mix(in srgb, var(--crit) 12%, transparent)",
          }}
        >
          {st.critiques} critique(s)
        </span>
        <span
          className="pill"
          style={{
            color: "var(--high)",
            borderColor: "color-mix(in srgb, var(--high) 40%, transparent)",
            background: "color-mix(in srgb, var(--high) 12%, transparent)",
          }}
        >
          {st.eleves} élevé(s)
        </span>
        <span className="pill">{st.produitsTouches} produit(s) concerné(s)</span>
      </div>

      <div style={{ margin: "14px 0 12px" }}>
        <FraicheurEphy />
      </div>

      <div style={{ margin: "0 0 16px" }}>
        <Aide titre="Hiérarchie des signaux, et réserve sur les échéances UE">
          <p>
            L&apos;ONSSA s&apos;aligne sur l&apos;ANSES : un retrait français annonce le retrait
            marocain. Les alertes « retrait ANSES » passent donc en tête, avant le statut UE qui est
            en amont et plus lent. Statut français lu dans E-Phy — {STATS_EPHY.attribution}.
          </p>
          <p>
            Les échéances UE viennent de la {COUVERTURE.source} (consultée le{" "}
            {fmtDate(COUVERTURE.date)}). La Commission les prolonge fréquemment par règlement
            d&apos;exécution : <strong>une échéance dépassée signifie « à recouper d&apos;urgence »,
            pas « substance interdite »</strong>.
          </p>
        </Aide>
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        {list.map((a) => {
          const Icon = ICONE[a.type];
          const color =
            a.niveau === "critique"
              ? "var(--crit)"
              : a.niveau === "élevé"
              ? "var(--high)"
              : "var(--mod)";
          return (
            <div
              key={a.id}
              className="card"
              style={{ padding: "16px 20px", borderLeft: `3px solid ${color}` }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <Icon size={16} color={color} />
                    <span style={{ fontWeight: 600, fontSize: 15 }}>{a.titre}</span>
                  </div>
                  <div className="eyebrow" style={{ marginTop: 5, marginLeft: 25 }}>
                    {LIBELLE[a.type]}
                  </div>
                </div>
                <RiskBadge niveau={a.niveau} />
              </div>

              <p
                style={{
                  fontSize: 13.5,
                  color: "var(--muted)",
                  lineHeight: 1.6,
                  margin: "11px 0 0 25px",
                }}
              >
                {a.detail}
              </p>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  alignItems: "center",
                  margin: "12px 0 0 25px",
                }}
              >
                {a.produits.slice(0, 4).map((p) => (
                  <span key={p.id} className="pill" style={{ fontWeight: 500 }}>
                    {p.nomCommercial}
                  </span>
                ))}
                {a.produits.length > 4 && (
                  <span className="pill" style={{ fontWeight: 500 }}>
                    +{a.produits.length - 4}
                  </span>
                )}
                <span className="pill" style={{ fontWeight: 500 }}>
                  {a.usages} usage(s)
                </span>
                {a.echeance && (
                  <span className="pill mono" style={{ fontWeight: 500 }}>
                    {fmtDate(a.echeance)}
                  </span>
                )}
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 14,
                  margin: "13px 0 0 25px",
                }}
              >
                <span style={{ fontSize: 13, color: "var(--fg)" }}>→ {a.action}</span>
                {a.matiere && (
                  <Link href={`/matieres/${a.matiere.id}`} className="link-accent" style={{ fontSize: 13 }}>
                    Analyser la matière active
                  </Link>
                )}
              </div>
            </div>
          );
        })}
        {list.length === 0 && (
          <div className="card" style={{ padding: 30, color: "var(--muted)", fontSize: 14 }}>
            Aucune alerte. Toutes les AMM du portefeuille sont valides et aucune matière active vérifiée
            n&apos;est en difficulté réglementaire.
          </div>
        )}
      </div>

      <p style={{ fontSize: 11.5, color: "var(--muted-2)", marginTop: 22 }}>
        Index source : <span className="mono">{META.source}</span> · {META.nbLignesIndex} lignes ·{" "}
        {META.nbProduitsIndex} produits · {META.nbDetenteurs} détenteurs.
      </p>
    </>
  );
}
