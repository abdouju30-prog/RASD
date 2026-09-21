import Link from "next/link";
import { PRODUITS, produitsDe } from "@/lib/data";
import { detenteurActuel } from "@/lib/detenteur";
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

  // Le « q » vient de la recherche transverse. L'écran est celui du détenteur
  // courant : un produit d'une autre société n'y figure pas, et il vaut mieux
  // le dire que de laisser croire à une absence.
  const cherche = (sp.q ?? "").trim().toLowerCase();
  const trouveAilleurs =
    cherche && !portefeuille.some((p) => p.nomCommercial.toLowerCase().includes(cherche))
      ? PRODUITS.find((p) => p.nomCommercial.toLowerCase().includes(cherche)) ?? null
      : null;

  const filtre = cherche
    ? portefeuille.filter((p) => p.nomCommercial.toLowerCase().includes(cherche))
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
            borderColor: trouveAilleurs
              ? "color-mix(in srgb, var(--mod) 40%, transparent)"
              : "color-mix(in srgb, var(--accent) 38%, transparent)",
            background: trouveAilleurs
              ? "color-mix(in srgb, var(--mod) 8%, transparent)"
              : "var(--accent-fond)",
          }}
        >
          <span style={{ color: "var(--muted)", lineHeight: 1.55 }}>
            {trouveAilleurs ? (
              <>
                <strong style={{ color: "var(--fg)" }}>« {sp.q} »</strong> n&apos;est pas au
                portefeuille de {d.nom} — ce produit appartient à{" "}
                <strong style={{ color: "var(--fg)" }}>{trouveAilleurs.detenteur}</strong>.{" "}
                <Link href={`/detenteur/${trouveAilleurs.detenteurId}`} className="link-accent">
                  Basculer sur cette société
                </Link>
              </>
            ) : (
              <>
                Filtré sur <strong style={{ color: "var(--fg)" }}>« {sp.q} »</strong> —{" "}
                {list.length} produit(s).
              </>
            )}
          </span>
          <Link href="/produits" className="link-accent" style={{ marginLeft: "auto", whiteSpace: "nowrap" }}>
            Tout afficher
          </Link>
        </div>
      )}

      <div className="fil">Portefeuille · Produits</div>
      <h1>
        {portefeuille.length} produits homologués
      </h1>
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
