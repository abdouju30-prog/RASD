import Link from "next/link";
import { produitsDe, META } from "@/lib/data";
import { detenteurActuel } from "@/lib/detenteur";
import { CA_DISPONIBLE, etatAMM, fmtDate, fmtMAD, usagesTotal } from "@/lib/logic";
import { StatCard } from "@/components/StatCard";

const COULEUR = {
  expirée: "var(--crit)",
  critique: "var(--high)",
  proche: "var(--mod)",
  valide: "var(--low)",
  inconnue: "var(--muted)",
} as const;

export default async function ProduitsPage() {
  const d = await detenteurActuel();
  const portefeuille = produitsDe(d.id);
  const list = [...portefeuille].sort((a, b) =>
    (a.expiration ?? "9999").localeCompare(b.expiration ?? "9999")
  );
  const expirees = list.filter((p) => etatAMM(p).etat === "expirée").length;
  const critiques = list.filter((p) => etatAMM(p).etat === "critique").length;

  return (
    <>
      <div className="eyebrow">Portefeuille · {d.nom}</div>
      <h1 style={{ fontSize: 30, fontWeight: 700, margin: "10px 0 8px" }}>
        {portefeuille.length} produits homologués
      </h1>
      <p style={{ color: "var(--muted)", maxWidth: 700, lineHeight: 1.6, marginTop: 0 }}>
        Classés par échéance d&apos;AMM, la plus proche en premier. Données extraites de l&apos;index
        ONSSA — aucune saisie manuelle.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
          gap: 14,
          margin: "22px 0",
        }}
      >
        <StatCard label="Produits" value={String(portefeuille.length)} sub="détenus" />
        <StatCard label="Usages homologués" value={String(usagesTotal(d.id))} sub="couples culture × cible" />
        <StatCard
          label="AMM expirées"
          value={String(expirees)}
          tone={expirees ? "crit" : "low"}
          sub="commercialisation non couverte"
        />
        <StatCard
          label="AMM < 6 mois"
          value={String(critiques)}
          tone={critiques ? "high" : "low"}
          sub="renouvellement urgent"
        />
      </div>

      {!CA_DISPONIBLE && (
        <p
          className="card"
          style={{
            padding: "12px 16px",
            fontSize: 12.5,
            color: "var(--muted)",
            lineHeight: 1.6,
            marginBottom: 18,
          }}
        >
          Le chiffre d&apos;affaires n&apos;existe pas dans l&apos;index ONSSA. Pour activer les colonnes
          et la pondération CA, renseigner <span className="mono">data/ca.json</span>. En attendant,
          l&apos;exposition est mesurée en usages homologués.
        </p>
      )}

      <div className="card" style={{ overflow: "hidden" }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Produit</th>
              <th>Catégorie</th>
              <th>Matière active</th>
              <th>AMM</th>
              <th>Expiration</th>
              <th>Usages</th>
              <th>Fournisseur</th>
              {CA_DISPONIBLE && <th>CA</th>}
            </tr>
          </thead>
          <tbody>
            {list.map((p) => {
              const e = etatAMM(p);
              return (
                <tr key={p.id}>
                  <td style={{ fontWeight: 500 }}>
                    {p.nomCommercial}
                    <div style={{ fontSize: 11.5, color: "var(--muted-2)", marginTop: 3 }}>
                      {p.formulation ?? "—"}
                      {p.tox ? ` · tox ${p.tox}` : ""}
                    </div>
                  </td>
                  <td style={{ fontSize: 13, color: "var(--muted)" }}>{p.categorie ?? "—"}</td>
                  <td style={{ fontSize: 12.5 }}>
                    {p.matieresActivesIds.map((id, i) => (
                      <span key={id}>
                        {i > 0 && " + "}
                        <Link href={`/matieres/${id}`} className="link-accent">
                          {p.matieresActives[i]}
                        </Link>
                      </span>
                    ))}
                  </td>
                  <td className="mono" style={{ fontSize: 12.5, color: "var(--muted)" }}>
                    {p.amm ?? "—"}
                  </td>
                  <td>
                    <span className="mono" style={{ fontSize: 13, color: COULEUR[e.etat] }}>
                      {fmtDate(p.expiration)}
                    </span>
                    {e.mois !== null && e.mois < 12 && (
                      <div style={{ fontSize: 11, color: COULEUR[e.etat], marginTop: 2 }}>
                        {e.mois < 0 ? `expirée depuis ${Math.abs(e.mois)} mois` : `${e.mois} mois`}
                      </div>
                    )}
                  </td>
                  <td className="mono">{p.usages.length}</td>
                  <td style={{ fontSize: 12, color: "var(--muted)" }}>{p.fournisseurs.join(", ")}</td>
                  {CA_DISPONIBLE && (
                    <td className="mono">{p.caAnnuel != null ? fmtMAD(p.caAnnuel) : "—"}</td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
