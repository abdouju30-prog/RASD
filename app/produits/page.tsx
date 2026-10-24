import Link from "next/link";
import { BoutonExport } from "@/components/BoutonExport";
import { PRODUITS, produitsDe } from "@/lib/data";
import { detenteurActuel } from "@/lib/detenteur";
import { historiqueProduit } from "@/lib/actualites";
import { CA_DISPONIBLE, etatAMM, fmtDate, fmtMAD } from "@/lib/logic";

const COULEUR = {
  expirée: "var(--crit)",
  critique: "var(--high)",
  proche: "var(--mod)",
  valide: "var(--low)",
  inconnue: "var(--muted)",
} as const;

export default async function ProduitsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const sp = await searchParams;
  const d = await detenteurActuel();
  const portefeuille = produitsDe(d.id);

  // Le « q » vient de la recherche transverse : il porte sur TOUS les produits de
  // l'index, quelle que soit la société choisie, et non sur son seul portefeuille.
  const cherche = (sp.q ?? "").trim().toLowerCase();
  const filtre = cherche
    ? PRODUITS.filter((p) => p.nomCommercial.toLowerCase().includes(cherche))
    : portefeuille;
  const list = [...filtre].sort((a, b) =>
    (a.expiration ?? "9999").localeCompare(b.expiration ?? "9999")
  );

  return (
    <>
      {cherche && (
        <div
          className="card"
          style={{
            padding: "10px 15px",
            marginBottom: 14,
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 13,
            borderColor: "color-mix(in srgb, var(--accent) 38%, transparent)",
            background: "var(--accent-fond)",
          }}
        >
          <span style={{ color: "var(--muted)", lineHeight: 1.55 }}>
            Recherche <strong style={{ color: "var(--fg)" }}>« {sp.q} »</strong> dans tous les produits —{" "}
            {list.length} résultat(s).
          </span>
          <Link href="/produits" className="link-accent" style={{ marginLeft: "auto", whiteSpace: "nowrap" }}>
            Tout afficher
          </Link>
        </div>
      )}

      <h1>
        {cherche ? `${list.length} produit(s) trouvé(s)` : `${portefeuille.length} produits homologués`}
      </h1>
      <div style={{ display: "flex", gap: 16, margin: "-4px 0 10px" }}>
        <BoutonExport table="produits" />
        <BoutonExport table="homologations" />
      </div>
      <p style={{ color: "var(--muted)", maxWidth: 700, lineHeight: 1.6, marginTop: 0 }}>
        Classés par échéance d&apos;AMM, la plus proche en premier. Données extraites de l&apos;index
        ONSSA — aucune saisie manuelle.
      </p>

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
              <th>Société</th>
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
                    {historiqueProduit(p.id).length > 0 && (
                      <div style={{ fontSize: 11, color: "var(--accent)", marginTop: 2 }}>
                        {historiqueProduit(p.id)
                          .map((h) => `${h.type} ${fmtDate(h.date)}${h.type === "nouveau" ? "" : ` (${h.detail})`}`)
                          .join(" · ")}
                      </div>
                    )}
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
                  <td style={{ fontSize: 12.5 }}>{p.detenteur}</td>
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
