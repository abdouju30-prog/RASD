import type { CSSProperties } from "react";
import { Scale, ExternalLink, RefreshCw } from "lucide-react";
import {
  LIBELLE_TYPE_ONSSA,
  META_ONSSA_TEXTES,
  STATS_ONSSA_TEXTES,
  TEXTES_ONSSA,
  TEXTES_RECENTS,
  dateAffichee,
  estRecent,
  fraicheurOnssaTextes,
  type TexteOnssa,
} from "@/lib/onssa-reglementation";
import { fmtDate } from "@/lib/logic";

function Pastille({ t }: { t: TexteOnssa }) {
  if (t.nouveau) {
    return (
      <span
        className="pill"
        style={{
          color: "var(--crit)",
          borderColor: "color-mix(in srgb, var(--crit) 40%, transparent)",
          background: "color-mix(in srgb, var(--crit) 10%, transparent)",
          fontSize: 10,
        }}
      >
        nouveau
      </span>
    );
  }
  if (t.misAJour) {
    return (
      <span
        className="pill"
        style={{
          color: "var(--high)",
          borderColor: "color-mix(in srgb, var(--high) 40%, transparent)",
          background: "color-mix(in srgb, var(--high) 10%, transparent)",
          fontSize: 10,
        }}
      >
        mis à jour
      </span>
    );
  }
  if (estRecent(t)) {
    return (
      <span
        className="pill"
        style={{
          color: "var(--mod)",
          borderColor: "color-mix(in srgb, var(--mod) 40%, transparent)",
          background: "color-mix(in srgb, var(--mod) 10%, transparent)",
          fontSize: 10,
        }}
      >
        récent
      </span>
    );
  }
  return null;
}

function Ligne({ t }: { t: TexteOnssa }) {
  const d = dateAffichee(t);
  const corps = (
    <>
      <span
        className="pill"
        style={{ fontSize: 10, flexShrink: 0 }}
      >
        {LIBELLE_TYPE_ONSSA[t.type] ?? t.type}
      </span>
      <span style={{ minWidth: 0, flex: 1 }}>
        <span style={{ fontWeight: 600, color: "var(--fg)" }}>{t.titre}</span>
        {d && (
          <span className="mono" style={{ color: "var(--muted-2)", marginLeft: 8, fontSize: 11 }}>
            {fmtDate(d)}
          </span>
        )}
      </span>
      <Pastille t={t} />
      {t.url && <ExternalLink size={12} color="var(--muted-2)" style={{ flexShrink: 0 }} />}
    </>
  );

  const style: CSSProperties = {
    display: "flex",
    alignItems: "flex-start",
    gap: 8,
    padding: "8px 0",
    fontSize: 12.5,
    lineHeight: 1.45,
    borderBottom: "1px solid var(--border)",
  };

  if (t.url) {
    return (
      <a id={`texte-${t.id}`} href={t.url} target="_blank" rel="noreferrer" style={style}>
        {corps}
      </a>
    );
  }
  return (
    <div id={`texte-${t.id}`} style={style}>
      {corps}
    </div>
  );
}

/**
 * Case « nouveautés ONSSA ».
 *
 * Compact : tour de contrôle — les textes des trois dernières semaines, lien
 * vers le flux. Complet : page Alertes — tout le corpus, les récents en tête.
 */
export function NouveautesOnssa({ compact = false }: { compact?: boolean }) {
  const f = fraicheurOnssaTextes();
  const recents = TEXTES_RECENTS;
  const montre = compact
    ? [...recents, ...TEXTES_ONSSA.filter((t) => !recents.includes(t))].slice(0, 4)
    : TEXTES_ONSSA;

  return (
    <section
      id="textes-onssa"
      className="card"
      style={{
        padding: "14px 18px",
        margin: compact ? "18px 0 0" : "0 0 16px",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <Scale size={16} color="var(--accent)" style={{ flexShrink: 0, marginTop: 2 }} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <strong style={{ fontFamily: "var(--tete)", fontSize: 14 }}>Nouveautés ONSSA</strong>
            <span className="pill" style={{ fontSize: 10.5 }}>
              {STATS_ONSSA_TEXTES.nbRecents
                ? `${STATS_ONSSA_TEXTES.nbRecents} récent${STATS_ONSSA_TEXTES.nbRecents > 1 ? "s" : ""}`
                : `${STATS_ONSSA_TEXTES.nbTextes} textes`}
            </span>
            <span className="pill mono" style={{ fontSize: 10.5 }}>
              relevé {STATS_ONSSA_TEXTES.releveFmt}
            </span>
          </div>
          <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--muted)", lineHeight: 1.55 }}>
            Avis, listes et textes publiés sur{" "}
            <a
              href={META_ONSSA_TEXTES.url}
              target="_blank"
              rel="noreferrer"
              className="link-accent"
            >
              eservice.onssa.gov.ma
            </a>
            . Ce n&apos;est pas l&apos;index des AMM : celui-là vient toujours de l&apos;Excel.
          </p>
        </div>
      </div>

      <div style={{ marginTop: 8 }}>
        {montre.map((t) => (
          <Ligne key={t.id} t={t} />
        ))}
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          alignItems: "center",
          marginTop: 10,
          fontSize: 11.5,
          color: "var(--muted-2)",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
          <RefreshCw size={11} />
          {f.etat === "à jour"
            ? "Relevé hebdomadaire à jour."
            : f.etat === "à rafraîchir"
              ? "Relevé de plus de dix jours — le cron du jeudi a peut-être manqué."
              : f.etat === "périmée"
                ? "Relevé périmé. Relancer npm run import:onssa-regl."
                : "Date de relevé inconnue."}
        </span>
        {compact && TEXTES_ONSSA.length > montre.length && (
          <a href="/veille#textes-onssa" className="link-accent" style={{ marginLeft: "auto" }}>
            Tous les textes ({TEXTES_ONSSA.length})
          </a>
        )}
        {!compact && (
          <a
            href={META_ONSSA_TEXTES.url}
            target="_blank"
            rel="noreferrer"
            className="link-accent"
            style={{ marginLeft: "auto" }}
          >
            Source ONSSA
          </a>
        )}
      </div>
    </section>
  );
}
