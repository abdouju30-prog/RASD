import Link from "next/link";
import { AlertTriangle, ArrowRight, ShieldQuestion, RefreshCw, CalendarClock, Ban, Flag, Timer, ShieldAlert } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { RiskBadge } from "@/components/RiskBadge";
import { RiskMatrix, type MatrixPoint } from "@/components/RiskMatrix";
import { META, matieresDuPortefeuille, produitsDe } from "@/lib/data";
import { detenteurActuel } from "@/lib/detenteur";
import { alertes, anglesMorts, statsAlertes, type TypeAlerte } from "@/lib/alertes";
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
import { STATS_EPHY } from "@/lib/ephy";
import { FraicheurEphy } from "@/components/FraicheurEphy";
import { Aide } from "@/components/Aide";
import { AlternativesCompactes } from "@/components/Alternatives";
import { alternatives } from "@/lib/substitution";

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

export default async function RadarPage({
  searchParams,
}: {
  searchParams: Promise<{ filtre?: string }>;
}) {
  const sp = await searchParams;
  const d = await detenteurActuel();
  const classe = portefeuilleClasse(d.id);
  const st = statsAlertes(d.id);
  const expirees = ammExpirees(d.id);
  const proches = ammEcheance(d.id, 18);
  const morts = anglesMorts(d.id);
  const toutesAlertes = alertes(d.id);
  const produits = produitsDe(d.id);

  const filtre = sp.filtre ?? "toutes";
  const listeFiltree =
    filtre === "critiques"
      ? toutesAlertes.filter((a) => a.niveau === "critique")
      : filtre === "elevees"
      ? toutesAlertes.filter((a) => a.niveau === "élevé")
      : toutesAlertes;

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
        Section 1 · Contrôle réglementaire · {d.nom} · index du {fmtDate(META.genere.slice(0, 10))}
      </div>
      <h1>Tour de contrôle & Veille</h1>
      <p className="chapeau">
        Surveillance continue des retraits ANSES (France), statuts UE et échéances d&apos;AMM marocaines.
        Passage direct du signal de risque aux actions de substitution et de renouvellement.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
          gap: 14,
          margin: "18px 0 24px",
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

      {/* Matrice de décision */}
      <div className="card" style={{ padding: "16px 20px 10px", marginBottom: 26 }}>
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
            Taille de bulle = {CA_DISPONIBLE ? "chiffre d'affaires" : "usages détenus"} · Cliquer sur une molécule pour ouvrir son dossier
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

      {/* Barre d'état & filtres des alertes */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 17, fontFamily: "var(--tete)" }}>
            Flux de détection ({listeFiltree.length})
          </h2>
          <span style={{ fontSize: 12, color: "var(--muted)" }}>
            Signaux ANSES, déchéances d&apos;AMM et fins de validité communautaire
          </span>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link
            href="/"
            className="pill"
            style={{
              fontWeight: filtre === "toutes" ? 600 : 400,
              background: filtre === "toutes" ? "var(--card-2)" : "transparent",
              borderColor: filtre === "toutes" ? "var(--border-strong)" : "var(--border)",
            }}
          >
            Toutes ({st.total})
          </Link>
          <Link
            href="/?filtre=critiques"
            className="pill"
            style={{
              color: "var(--crit)",
              borderColor: filtre === "critiques" ? "var(--crit)" : "color-mix(in srgb, var(--crit) 30%, transparent)",
              background: filtre === "critiques" ? "color-mix(in srgb, var(--crit) 15%, transparent)" : "transparent",
              fontWeight: filtre === "critiques" ? 600 : 400,
            }}
          >
            Critiques ({st.critiques})
          </Link>
          <Link
            href="/?filtre=elevees"
            className="pill"
            style={{
              color: "var(--high)",
              borderColor: filtre === "elevees" ? "var(--high)" : "color-mix(in srgb, var(--high) 30%, transparent)",
              background: filtre === "elevees" ? "color-mix(in srgb, var(--high) 15%, transparent)" : "transparent",
              fontWeight: filtre === "elevees" ? 600 : 400,
            }}
          >
            Élevées ({st.eleves})
          </Link>
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <FraicheurEphy />
      </div>

      <div style={{ marginBottom: 18 }}>
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

      {/* Flux d'alertes détaillé avec alternatives & actions directes */}
      <div style={{ display: "grid", gap: 12 }}>
        {listeFiltree.map((a) => {
          const Icon = ICONE[a.type];
          const color =
            a.niveau === "critique"
              ? "var(--crit)"
              : a.niveau === "élevé"
              ? "var(--high)"
              : "var(--muted)";
          const altsDisponibles = a.matiere ? alternatives(a.matiere.id, 3) : [];

          return (
            <div
              key={a.id}
              className="card"
              style={{
                padding: "16px 18px",
                borderLeft: `3px solid ${color}`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Icon size={16} color={color} aria-hidden="true" />
                  <span
                    className="mono"
                    style={{
                      fontSize: 11,
                      letterSpacing: "0.04em",
                      color,
                      textTransform: "uppercase",
                    }}
                  >
                    {LIBELLE[a.type]}
                  </span>
                </div>
                <RiskBadge niveau={a.niveau} />
              </div>

              <div style={{ marginTop: 8 }}>
                <div style={{ fontWeight: 600, fontSize: 14.5 }}>{a.titre}</div>
                <p style={{ color: "var(--muted)", margin: "5px 0 0", lineHeight: 1.55 }}>
                  {a.detail}
                </p>
              </div>

              {a.matiere && altsDisponibles.length > 0 && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
                  <span style={{ fontSize: 11.5, color: "var(--muted)", marginRight: 8 }}>
                    Alternatives recommandées :
                  </span>
                  <AlternativesCompactes alts={altsDisponibles} />
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  gap: 14,
                  flexWrap: "wrap",
                  alignItems: "center",
                  fontSize: 12,
                  color: "var(--muted-2)",
                  marginTop: 12,
                  paddingTop: 10,
                  borderTop: "1px solid var(--border)",
                }}
              >
                <span>
                  <strong>{a.produits.length}</strong> produit(s) touché(s) :{" "}
                  {a.produits.map((p) => p.nomCommercial).join(", ")}
                </span>
                <span>
                  <strong>{a.usages}</strong> usage(s) concerné(s)
                </span>
                {a.echeance && (
                  <span className="mono">
                    Échéance : <strong>{fmtDate(a.echeance)}</strong>
                  </span>
                )}
                <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
                  {a.matiere && (
                    <Link href={`/matieres/${a.matiere.id}`} className="link-accent">
                      Fiche technique →
                    </Link>
                  )}
                  <Link href={`/execution/dossier/${a.matiere?.id ?? a.produits[0]?.id}?type=substitution`} className="link-accent" style={{ color: "var(--crit)" }}>
                    Préparer dossier →
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {morts.length > 0 && (
        <div
          className="card"
          style={{
            marginTop: 22,
            padding: "14px 18px",
            display: "flex",
            gap: 12,
            alignItems: "flex-start",
          }}
        >
          <ShieldQuestion size={17} color="var(--muted)" style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
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
