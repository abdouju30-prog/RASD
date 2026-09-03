import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { RiskBadge } from "./RiskBadge";
import type { Alternative } from "@/lib/substitution";

// Une matière active menacée n'est un signal utile que si l'on voit par quoi la
// remplacer. Ces deux affichages mettent le risque et la sortie de risque au
// même endroit — la version compacte pour les listes, la table pour une fiche.

/** Une ligne de remplaçants, à glisser sous une matière active menacée. */
export function AlternativesCompactes({ alts }: { alts: Alternative[] }) {
  if (alts.length === 0) {
    return (
      <div style={{ fontSize: 11.5, color: "var(--mod)", marginTop: 4 }}>
        Aucun remplaçant dans la même catégorie
      </div>
    );
  }
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 6,
        marginTop: 6,
        fontSize: 11.5,
        color: "var(--muted-2)",
      }}
    >
      <ArrowRight size={11} style={{ flexShrink: 0 }} aria-hidden />
      <span>remplacer par</span>
      {alts.slice(0, 4).map((a) => (
        <Link
          key={a.id}
          href={`/matieres/${a.id}`}
          className="pill"
          style={{
            fontSize: 10.5,
            fontWeight: 500,
            color: a.memeFamille ? "var(--mod)" : "var(--accent)",
            borderColor: `color-mix(in srgb, ${
              a.memeFamille ? "var(--mod)" : "var(--accent)"
            } 42%, transparent)`,
            background: a.memeFamille
              ? "color-mix(in srgb, var(--mod) 9%, transparent)"
              : "var(--accent-fond)",
          }}
          title={
            a.memeFamille
              ? `${a.motif} — même famille chimique : le risque réglementaire reste corrélé`
              : a.motif
          }
        >
          {a.molecule}
          <span style={{ opacity: 0.7 }}> {a.recouvrement}</span>
        </Link>
      ))}
    </div>
  );
}

/** Table complète des remplaçants, pour la fiche d'une matière active. */
export function TableAlternatives({ alts }: { alts: Alternative[] }) {
  return (
    <>
      <table className="tbl">
        <thead>
          <tr>
            <th>Matière active</th>
            <th>Recouvrement</th>
            <th style={{ textAlign: "right" }}>AMM</th>
            <th style={{ textAlign: "right" }}>Détenteurs</th>
            <th>Risque</th>
          </tr>
        </thead>
        <tbody>
          {alts.map((a) => (
            <tr key={a.id}>
              <td>
                <Link href={`/matieres/${a.id}`} className="link-accent" style={{ fontWeight: 500 }}>
                  {a.nom}
                </Link>
                {a.memeFamille && (
                  <div style={{ fontSize: 11, color: "var(--mod)", marginTop: 3 }}>
                    même famille chimique — risque corrélé
                  </div>
                )}
              </td>
              <td style={{ fontSize: 12.5, color: "var(--muted)" }}>
                {a.recouvrement}{" "}
                {a.base === "cibles" ? "cible(s)" : a.base === "usages" ? "usage(s)" : "culture(s)"}
              </td>
              <td className="mono" style={{ textAlign: "right" }}>{a.nbHomologations}</td>
              <td className="mono" style={{ textAlign: "right" }}>{a.nbDetenteurs}</td>
              <td>
                {a.risque ? (
                  <RiskBadge niveau={a.risque} score={a.scoreRisque ?? undefined} />
                ) : (
                  <span style={{ color: "var(--muted-2)", fontSize: 12 }}>non évalué</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ fontSize: 11.5, color: "var(--muted-2)", marginTop: 12, lineHeight: 1.55 }}>
        Même catégorie ONSSA, risque strictement inférieur, au moins un élément en commun. Le
        recouvrement se lit sur les cibles quand l&apos;index les renseigne, sinon sur les usages,
        sinon sur les cultures.
      </p>
    </>
  );
}
