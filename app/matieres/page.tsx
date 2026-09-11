import Link from "next/link";
import { RiskBadge } from "@/components/RiskBadge";
import { portefeuilleClasse } from "@/lib/logic";
import { MATIERES } from "@/lib/data";
import { detenteurActuel } from "@/lib/detenteur";

export default async function MatieresPage() {
  const d = await detenteurActuel();
  const classe = portefeuilleClasse(d.id);

  return (
    <>
      <div className="fil">Portefeuille · Matières</div>
      <h1>
        Les {classe.length} molécules du portefeuille
      </h1>
      <p className="chapeau">
        Extraites de l&apos;index ONSSA, classées par risque réglementaire. L&apos;index complet compte{" "}
        {MATIERES.length} matières actives — les autres se prospectent depuis l&apos;écran{" "}
        <Link href="/sourcing" className="link-accent">
          Prospection
        </Link>
        .
      </p>

      <div className="card" style={{ marginTop: 24, overflow: "hidden" }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Matière active</th>
              <th>Catégorie</th>
              <th>Vos produits</th>
              <th>Usages</th>
              <th>Concurrents</th>
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
                  <div style={{ fontSize: 11.5, color: "var(--muted-2)", marginTop: 3 }}>
                    {ma.produitsDetenteur.map((p) => p.nomCommercial).join(" · ")}
                  </div>
                </td>
                <td style={{ color: "var(--muted)", fontSize: 13 }}>{ma.categorie ?? "—"}</td>
                <td className="mono">{expo.produits}</td>
                <td className="mono">{expo.usages}</td>
                <td className="mono" style={{ color: "var(--muted)" }}>
                  {Math.max(0, ma.detenteurs.length - 1)}
                </td>
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
    </>
  );
}
