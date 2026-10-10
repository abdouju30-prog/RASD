import Link from "next/link";
import { BoutonExport } from "@/components/BoutonExport";
import { RiskBadge } from "@/components/RiskBadge";
import { alertesGroupees, statsAlertes, LIBELLE_ALERTE } from "@/lib/alertes";
import { fmtDate } from "@/lib/logic";
import { META } from "@/lib/data";
import { detenteurActuel } from "@/lib/detenteur";
import { Aide } from "@/components/Aide";
import { STATS_EPHY } from "@/lib/ephy";
import { COUVERTURE } from "@/lib/reglementaire";

const COULEUR = { critique: "var(--crit)", élevé: "var(--high)", modéré: "var(--mod)", faible: "var(--mod)" };

export default async function VeillePage() {
  const d = await detenteurActuel();
  const groupes = alertesGroupees(d.id);
  const st = statsAlertes(d.id);

  return (
    <>
      <h1>Alertes</h1>
      <div style={{ display: "flex", gap: 16, margin: "-4px 0 10px" }}>
        <BoutonExport table="alertes" />
      </div>
      <p style={{ color: "var(--muted)", fontSize: 13.5, margin: "4px 0 16px" }}>
        {st.groupesCritiques} critique(s) · {groupes.length} molécule(s) ou produit(s) ·{" "}
        {st.produitsTouches} produit(s) concerné(s)
      </p>

      <div style={{ display: "grid", gap: 10 }}>
        {groupes.map((g) => {
          // Un signal peut se répéter (deux concentrations) : un libellé une seule fois.
          const libelles = [...new Set(g.signaux.map((a) => LIBELLE_ALERTE[a.type]))];
          return (
            <div
              key={g.id}
              className="card"
              style={{ padding: "14px 18px", borderLeft: `3px solid ${COULEUR[g.niveau]}` }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                <div style={{ minWidth: 0 }}>
                  {g.matiere ? (
                    <Link
                      href={`/matieres/${g.matiere.id}`}
                      className="link-accent"
                      style={{ fontWeight: 600, fontSize: 15 }}
                    >
                      {g.titre}
                    </Link>
                  ) : (
                    <span style={{ fontWeight: 600, fontSize: 15 }}>{g.titre}</span>
                  )}
                  <div className="eyebrow" style={{ marginTop: 4 }}>
                    {libelles.join(" · ")}
                  </div>
                </div>
                <RiskBadge niveau={g.niveau} />
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginTop: 10 }}>
                {g.produits.slice(0, 6).map((p) => (
                  <span key={p.id} className="pill" style={{ fontWeight: 500 }}>
                    {p.nomCommercial}
                  </span>
                ))}
                {g.produits.length > 6 && (
                  <span className="pill" style={{ fontWeight: 500 }}>
                    +{g.produits.length - 6}
                  </span>
                )}
                <span className="pill" style={{ fontWeight: 500 }}>
                  {g.usages} usage(s)
                </span>
                {g.echeance && (
                  <span className="pill mono" style={{ fontWeight: 500 }}>
                    {fmtDate(g.echeance)}
                  </span>
                )}
              </div>

              <div style={{ fontSize: 13, marginTop: 10 }}>→ {g.action}</div>

              <div style={{ marginTop: 8 }}>
                <Aide titre={`Détail${g.signaux.length > 1 ? ` des ${g.signaux.length} signaux` : ""}`}>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {g.signaux.map((a) => (
                      <li key={a.id} style={{ marginBottom: 6 }}>
                        <strong>{a.titre}</strong> — {a.detail}
                      </li>
                    ))}
                  </ul>
                </Aide>
              </div>
            </div>
          );
        })}
        {groupes.length === 0 && (
          <div className="card" style={{ padding: 30, color: "var(--muted)", fontSize: 14 }}>
            Aucune alerte. Toutes les AMM du portefeuille sont valides et aucune matière active vérifiée
            n&apos;est en difficulté réglementaire.
          </div>
        )}
      </div>

      <div style={{ marginTop: 18 }}>
        <Aide titre="Comment lire ces alertes">
          <p>
            Recalculées à chaque affichage, rien n&apos;est stocké. Une carte réunit tous les signaux
            d&apos;une même molécule, toutes concentrations confondues.
          </p>
          <p>
            L&apos;ONSSA s&apos;aligne sur l&apos;ANSES : un retrait français annonce le retrait
            marocain. Les alertes « retrait France » passent donc en tête, avant le statut UE qui est
            en amont et plus lent. Statut français lu dans E-Phy — {STATS_EPHY.attribution}.
          </p>
          <p>
            Les échéances UE viennent de la {COUVERTURE.source} (consultée le{" "}
            {fmtDate(COUVERTURE.date)}). La Commission les prolonge fréquemment par règlement
            d&apos;exécution : <strong>une échéance dépassée signifie « à recouper d&apos;urgence »,
            pas « substance interdite »</strong>.
          </p>
          <p>
            Index source : <span className="mono">{META.source}</span> · {META.nbLignesIndex} lignes ·{" "}
            {META.nbProduitsIndex} produits · {META.nbDetenteurs} détenteurs.
          </p>
        </Aide>
      </div>
    </>
  );
}
