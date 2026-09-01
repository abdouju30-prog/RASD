import { RefreshCw, CircleAlert, CircleCheck } from "lucide-react";
import { CHANGEMENTS_EPHY, NB_CHANGEMENTS_EPHY, STATS_EPHY, fraicheurEphy } from "@/lib/ephy";
import { fmtDate } from "@/lib/logic";

/**
 * Indicateur de fraîcheur de la source ANSES.
 *
 * Un outil de veille qui affiche des statuts sans dire de quand ils datent est
 * plus dangereux qu'utile : l'utilisateur les croit à jour. Ce bandeau rend
 * l'âge de la donnée visible, et signale ce qui a changé au dernier import.
 */
export function FraicheurEphy({ compact = false }: { compact?: boolean }) {
  const f = fraicheurEphy();
  const couleur =
    f.etat === "à jour" ? "var(--low)" : f.etat === "à rafraîchir" ? "var(--mod)" : "var(--crit)";
  const Icone = f.etat === "à jour" ? CircleCheck : CircleAlert;

  if (compact) {
    return (
      <span className="pill" style={{ color: couleur, borderColor: `color-mix(in srgb, ${couleur} 40%, transparent)` }}>
        <Icone size={12} />
        E-Phy {f.maj ? fmtDate(f.maj) : "?"}
      </span>
    );
  }

  return (
    <div
      className="card"
      style={{
        padding: "14px 18px",
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        borderColor: `color-mix(in srgb, ${couleur} 32%, transparent)`,
      }}
    >
      <Icone size={17} color={couleur} style={{ flexShrink: 0, marginTop: 1 }} />
      <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.65, minWidth: 0 }}>
        <strong style={{ color: "var(--fg)" }}>
          Source ANSES — {f.maj ? `données du ${fmtDate(f.maj)}` : "date inconnue"}
          {f.jours !== null && `, il y a ${f.jours} jour${f.jours > 1 ? "s" : ""}`}.
        </strong>{" "}
        {f.etat === "à jour" && (
          <>Catalogue à jour. L&apos;Anses republie chaque nuit de mardi à mercredi.</>
        )}
        {f.etat === "à rafraîchir" && (
          <>
            Une publication hebdomadaire a été manquée. Lancer{" "}
            <span className="mono">npm run import:ephy</span>, ou vérifier le workflow{" "}
            <span className="mono">maj-ephy</span>.
          </>
        )}
        {f.etat === "périmée" && (
          <>
            Données périmées : plus de trois semaines sans actualisation. Les statuts affichés ne
            reflètent peut-être plus la situation française — à rafraîchir avant toute décision.
          </>
        )}
        {f.etat === "inconnue" && <>Date d&apos;actualisation absente du fichier importé.</>}

        {NB_CHANGEMENTS_EPHY > 0 && (
          <div style={{ marginTop: 10 }}>
            <strong style={{ color: "var(--fg)" }}>
              {NB_CHANGEMENTS_EPHY} changement(s) de statut au dernier import :
            </strong>
            <ul style={{ margin: "6px 0 0", paddingLeft: 18, lineHeight: 1.7 }}>
              {CHANGEMENTS_EPHY.slice(0, 6).map((c) => (
                <li key={c.id}>
                  <span style={{ color: "var(--fg)" }}>{c.nom}</span> : {c.avant ?? "—"} →{" "}
                  <span style={{ color: c.apres === "autorisée" ? "var(--low)" : "var(--crit)" }}>
                    {c.apres ?? "—"}
                  </span>
                </li>
              ))}
            </ul>
            {NB_CHANGEMENTS_EPHY > 6 && (
              <div style={{ marginTop: 5 }}>… et {NB_CHANGEMENTS_EPHY - 6} autres.</div>
            )}
          </div>
        )}
        {NB_CHANGEMENTS_EPHY === 0 && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, marginLeft: 4 }}>
            <RefreshCw size={11} /> Aucun changement de statut au dernier import.
          </span>
        )}

        <div style={{ fontSize: 11, color: "var(--muted-2)", marginTop: 9 }}>
          {STATS_EPHY.attribution} · Licence Ouverte.
        </div>
      </div>
    </div>
  );
}
