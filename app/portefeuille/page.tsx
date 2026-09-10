import Link from "next/link";
import { PRODUITS, produitsDe, MATIERES, matieresDuPortefeuille } from "@/lib/data";
import { detenteurActuel } from "@/lib/detenteur";
import { CA_DISPONIBLE, etatAMM, fmtDate, fmtMAD, usagesTotal, portefeuilleClasse } from "@/lib/logic";
import { StatCard } from "@/components/StatCard";
import { RiskBadge } from "@/components/RiskBadge";
import { TabNav } from "@/components/TabNav";

const COULEUR = {
  expirée: "var(--crit)",
  critique: "var(--high)",
  proche: "var(--mod)",
  valide: "var(--low)",
  inconnue: "var(--muted)",
} as const;

export default async function PortefeuillePage({
  searchParams,
}: {
  searchParams: Promise<{ vue?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const d = await detenteurActuel();
  const vue = sp.vue === "molecules" ? "molecules" : "produits";

  const portefeuilleProduits = produitsDe(d.id);
  const classeMatiere = portefeuilleClasse(d.id);

  const cherche = (sp.q ?? "").trim().toLowerCase();

  // ── Onglet Produits ──
  const trouveAilleurs =
    cherche && !portefeuilleProduits.some((p) => p.nomCommercial.toLowerCase().includes(cherche))
      ? PRODUITS.find((p) => p.nomCommercial.toLowerCase().includes(cherche)) ?? null
      : null;

  const filtreProduits = cherche
    ? portefeuilleProduits.filter((p) => p.nomCommercial.toLowerCase().includes(cherche))
    : portefeuilleProduits;

  const listProduits = [...filtreProduits].sort((a, b) =>
    (a.expiration ?? "9999").localeCompare(b.expiration ?? "9999")
  );

  const expirees = listProduits.filter((p) => etatAMM(p).etat === "expirée").length;
  const critiques = listProduits.filter((p) => etatAMM(p).etat === "critique").length;

  // ── Onglet Molécules ──
  const filtreMolecules = cherche
    ? classeMatiere.filter(
        ({ ma }) =>
          ma.nom.toLowerCase().includes(cherche) ||
          ma.produitsDetenteur.some((p) => p.nomCommercial.toLowerCase().includes(cherche))
      )
    : classeMatiere;

  const tabs = [
    {
      id: "produits",
      label: "Formulations & AMM",
      count: portefeuilleProduits.length,
      href: `/portefeuille?vue=produits${cherche ? `&q=${encodeURIComponent(sp.q ?? "")}` : ""}`,
      active: vue === "produits",
    },
    {
      id: "molecules",
      label: "Molécules actives",
      count: classeMatiere.length,
      href: `/portefeuille?vue=molecules${cherche ? `&q=${encodeURIComponent(sp.q ?? "")}` : ""}`,
      active: vue === "molecules",
    },
  ];

  return (
    <>
      <div className="eyebrow">Section 2 · Portefeuille commercial</div>
      <h1>
        {vue === "produits"
          ? `${portefeuilleProduits.length} produits homologués`
          : `${classeMatiere.length} matières actives au catalogue`}
      </h1>
      <p className="chapeau">
        {vue === "produits"
          ? `Portefeuille commercial de ${d.nom}. Suivi des AMM, dates d'expiration et fournisseurs autorisés.`
          : `Substances actives composant le portefeuille de ${d.nom}, classées par risque réglementaire et exposition.`}
      </p>

      <TabNav tabs={tabs} />

      {cherche && (
        <div
          className="card"
          style={{
            padding: "10px 15px",
            marginBottom: 16,
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
                {vue === "produits" ? `${listProduits.length} produit(s)` : `${filtreMolecules.length} molécule(s)`}.
              </>
            )}
          </span>
          <Link
            href={`/portefeuille?vue=${vue}`}
            className="link-accent"
            style={{ marginLeft: "auto", whiteSpace: "nowrap" }}
          >
            Tout afficher
          </Link>
        </div>
      )}

      {vue === "produits" ? (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
              gap: 14,
              marginBottom: 20,
            }}
          >
            <StatCard label="Produits" value={String(portefeuilleProduits.length)} sub="détenus" />
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
                  <th scope="col">Produit</th>
                  <th scope="col">Catégorie</th>
                  <th scope="col">Matière active</th>
                  <th scope="col">AMM</th>
                  <th scope="col">Expiration</th>
                  <th scope="col">Usages</th>
                  <th scope="col">Fournisseur</th>
                  {CA_DISPONIBLE && <th scope="col">CA</th>}
                </tr>
              </thead>
              <tbody>
                {listProduits.map((p) => {
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
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
              gap: 14,
              marginBottom: 20,
            }}
          >
            <StatCard label="Matières actives" value={String(classeMatiere.length)} sub="au catalogue" />
            <StatCard
              label="Index national"
              value={String(MATIERES.length)}
              sub="matières homologuées au Maroc"
            />
            <StatCard
              label="Risque critique"
              value={String(classeMatiere.filter((m) => (m.risque?.score ?? 0) >= 55).length)}
              tone={classeMatiere.some((m) => (m.risque?.score ?? 0) >= 55) ? "crit" : "low"}
              sub="score ≥ 55 à substituer"
            />
          </div>

          <div className="card" style={{ overflow: "hidden" }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th scope="col">Matière active</th>
                  <th scope="col">Catégorie</th>
                  <th scope="col">Vos produits</th>
                  <th scope="col">Usages</th>
                  <th scope="col">Concurrents</th>
                  <th scope="col">Statut UE</th>
                  <th scope="col">Risque</th>
                </tr>
              </thead>
              <tbody>
                {filtreMolecules.map(({ ma, risque, expo }) => (
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
      )}
    </>
  );
}
