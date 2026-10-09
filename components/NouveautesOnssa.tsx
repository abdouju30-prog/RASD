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
import {
  META_ONSSA_LISTES,
  NB_COLLISIONS_RETRAIT,
  NB_RESTRICTIONS_INDEX,
  hrefOnssa,
} from "@/lib/onssa-listes";
import { fmtDate } from "@/lib/logic";
import { Aide } from "./Aide";

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

function SignauxIntegres({ compact }: { compact: boolean }) {
  const hrefR = hrefOnssa(META_ONSSA_LISTES.urlRetirees);
  const hrefS = hrefOnssa(META_ONSSA_LISTES.urlRestrictions);
  const pastille: CSSProperties = { fontSize: 10.5 };
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        marginTop: 10,
        alignItems: "center",
      }}
    >
      {hrefR ? (
        <a href={hrefR} target="_blank" rel="noreferrer" className="pill" style={pastille}>
          {META_ONSSA_LISTES.nbRetirees} substances retirées
        </a>
      ) : (
        <span className="pill" style={pastille}>
          {META_ONSSA_LISTES.nbRetirees} substances retirées
        </span>
      )}
      {hrefS ? (
        <a href={hrefS} target="_blank" rel="noreferrer" className="pill" style={pastille}>
          {META_ONSSA_LISTES.nbRestrictions} restrictions d&apos;usage
        </a>
      ) : (
        <span className="pill" style={pastille}>
          {META_ONSSA_LISTES.nbRestrictions} restrictions d&apos;usage
        </span>
      )}
      {NB_RESTRICTIONS_INDEX > 0 && (
        <span
          className="pill"
          style={{
            ...pastille,
            color: "var(--high)",
            borderColor: "color-mix(in srgb, var(--high) 40%, transparent)",
            background: "color-mix(in srgb, var(--high) 10%, transparent)",
          }}
        >
          {NB_RESTRICTIONS_INDEX} dans l&apos;index
        </span>
      )}
      {NB_COLLISIONS_RETRAIT > 0 && (
        <span
          className="pill"
          style={{
            ...pastille,
            color: "var(--crit)",
            borderColor: "color-mix(in srgb, var(--crit) 40%, transparent)",
            background: "color-mix(in srgb, var(--crit) 10%, transparent)",
          }}
        >
          {NB_COLLISIONS_RETRAIT} encore à l&apos;index
        </span>
      )}
      {!compact && (
        <span style={{ fontSize: 11.5, color: "var(--muted-2)" }}>
          Intégrés au radar, pas seulement au journal.
        </span>
      )}
    </div>
  );
}

/**
 * Case « nouveautés ONSSA » : les textes des 30 derniers jours, une ligne
 * chacun. Tout le corpus reste dans le volet « Tous les textes ».
 */
export function NouveautesOnssa(_: { compact?: boolean } = {}) {
  const f = fraicheurOnssaTextes();
  const recents = TEXTES_RECENTS;

  return (
    <section id="textes-onssa" className="card" style={{ padding: "14px 18px", margin: "18px 0 0" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <Scale size={15} color="var(--accent)" style={{ flexShrink: 0 }} />
        <strong style={{ fontFamily: "var(--tete)", fontSize: 14 }}>Nouveautés ONSSA</strong>
        <span className="pill mono" style={{ fontSize: 10.5 }}>
          relevé {STATS_ONSSA_TEXTES.releveFmt}
        </span>
        {f.etat !== "à jour" && (
          <span style={{ fontSize: 11.5, color: "var(--high)", display: "inline-flex", alignItems: "center", gap: 4 }}>
            <RefreshCw size={11} /> relevé {f.etat}
          </span>
        )}
      </div>

      <div style={{ marginTop: 6 }}>
        {recents.length ? (
          recents.map((t) => <Ligne key={t.id} t={t} />)
        ) : (
          <div style={{ fontSize: 12.5, color: "var(--muted)", padding: "6px 0" }}>
            Aucun texte publié ces 30 derniers jours.
          </div>
        )}
      </div>

      <SignauxIntegres compact />

      <div style={{ marginTop: 10 }}>
        <Aide titre={`Tous les textes (${TEXTES_ONSSA.length})`}>
          <p style={{ marginTop: 0 }}>
            Avis, listes et textes publiés sur{" "}
            <a href={META_ONSSA_TEXTES.url} target="_blank" rel="noreferrer" className="link-accent">
              eservice.onssa.gov.ma
            </a>
            . Ce n&apos;est pas l&apos;index des AMM : celui-là est relu sur IndPesticide.aspx.
          </p>
          {TEXTES_ONSSA.map((t) => (
            <Ligne key={t.id} t={t} />
          ))}
        </Aide>
      </div>
    </section>
  );
}
