import Link from "next/link";
import { Sprout } from "lucide-react";
import { RequeteHomologation } from "@/components/RequeteHomologation";
import { molecules } from "@/lib/formulation";
import {
  hrefUsages,
  inventaireCibles,
  inventaireCultures,
  listerEnregistrements,
  resoudreCible,
  resoudreCulture,
  resoudreEmploi,
  suggestionsMolecules,
  suggestionsSocietes,
  type StatutAmm,
} from "@/lib/usages";

function statutDe(v: string | undefined): StatutAmm {
  if (v === "vigueur" || v === "expire") return v;
  return "tous";
}

function echeance(iso: string | null): string {
  if (!iso || iso.length < 10) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return d && m && y ? `${d}/${m}/${y}` : iso;
}

export default async function UsagesPage({
  searchParams,
}: {
  searchParams: Promise<{
    culture?: string;
    cible?: string;
    maladie?: string;
    molecule?: string;
    societe?: string;
    statut?: string;
  }>;
}) {
  const sp = await searchParams;
  const cultureSaisie = (sp.culture ?? "").trim();
  const cibleSaisie = (sp.cible ?? sp.maladie ?? "").trim();
  const molSaisie = (sp.molecule ?? "").trim();
  const societe = (sp.societe ?? "").trim();
  const statut = statutDe(sp.statut);

  const culture = resoudreCulture(cultureSaisie);
  const cible = resoudreCible(cibleSaisie);
  const matiere = molSaisie ? resoudreEmploi(molSaisie).matiere : null;
  const molecule = matiere
    ? molecules(matiere.nom, matiere.molecule)[0] || matiere.molecule || matiere.nom
    : null;

  const actif = Boolean(culture || cible || matiere || societe);
  const resultat = actif
    ? listerEnregistrements({ culture, cible, matiere, societe: societe || null, statut })
    : null;

  const titre =
    [
      molecule,
      culture,
      cible ? `contre ${cible}` : null,
      societe || null,
    ]
      .filter(Boolean)
      .join(" — ") || "Homologations";

  const cultures = inventaireCultures();
  const cibles = inventaireCibles();
  const exportHref = `/api/homologations?${new URLSearchParams({
    ...(cultureSaisie ? { culture: cultureSaisie } : {}),
    ...(cibleSaisie ? { cible: cibleSaisie } : {}),
    ...(molSaisie ? { molecule: molSaisie } : {}),
    ...(societe ? { societe } : {}),
    ...(statut !== "tous" ? { statut } : {}),
  }).toString()}`;

  return (
    <>
      <div className="fil">Portefeuille · Homologations</div>
      <h1>{titre}</h1>
      <p className="chapeau">
        Substance, culture, ravageur et société — les enregistrements ONSSA correspondants : marque,
        n° AMM, dose, DAR et échéance.
      </p>

      <div className="card" style={{ padding: "16px 18px", marginTop: 4 }}>
        <RequeteHomologation
          molecule={molSaisie}
          culture={cultureSaisie}
          cible={cibleSaisie}
          societe={societe}
          statut={statut}
          cultures={cultures.map((c) => c.libelle)}
          cibles={cibles.slice(0, 400).map((c) => c.libelle)}
          molecules={suggestionsMolecules()}
          societes={suggestionsSocietes()}
        />
      </div>

      {actif && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "14px 0 0", alignItems: "center" }}>
          {molecule && (
            <Link href={hrefUsages({ culture, cible, societe, statut })} className="pill" style={{ fontSize: 12 }}>
              {molecule} ×
            </Link>
          )}
          {culture && (
            <Link
              href={hrefUsages({ molecule, cible, societe, statut })}
              className="pill"
              style={{ fontSize: 12 }}
            >
              {culture} ×
            </Link>
          )}
          {cible && (
            <Link
              href={hrefUsages({ molecule, culture, societe, statut })}
              className="pill"
              style={{ fontSize: 12 }}
            >
              {cible} ×
            </Link>
          )}
          {societe && (
            <Link
              href={hrefUsages({ molecule, culture, cible, statut })}
              className="pill"
              style={{ fontSize: 12 }}
            >
              {societe} ×
            </Link>
          )}
          {statut !== "tous" && (
            <Link
              href={hrefUsages({ molecule, culture, cible, societe })}
              className="pill"
              style={{ fontSize: 12 }}
            >
              {statut === "expire" ? "AMM expirées" : "AMM en vigueur"} ×
            </Link>
          )}
          <Link href="/usages" style={{ fontSize: 12, color: "var(--muted)" }}>
            Effacer
          </Link>
          {resultat && resultat.total > 0 && (
            <a href={exportHref} className="link-accent" style={{ marginLeft: "auto", fontSize: 12.5 }}>
              Exporter CSV
            </a>
          )}
        </div>
      )}

      {!actif && (
        <div className="card" style={{ padding: "18px 20px", marginTop: 18 }}>
          <div className="h-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Sprout size={14} /> Cultures
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, margin: "10px 0 18px" }}>
            {cultures.slice(0, 36).map((c) => (
              <Link key={c.n} href={hrefUsages({ culture: c.libelle })} className="pill" style={{ fontSize: 11 }}>
                {c.libelle}{" "}
                <span className="mono" style={{ opacity: 0.6 }}>
                  {c.nbMatieres}
                </span>
              </Link>
            ))}
          </div>
          <div className="h-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            Ravageurs / maladies
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 10 }}>
            {cibles.slice(0, 36).map((c) => (
              <Link key={c.n} href={hrefUsages({ cible: c.libelle })} className="pill" style={{ fontSize: 11 }}>
                {c.libelle}{" "}
                <span className="mono" style={{ opacity: 0.6 }}>
                  {c.nbMatieres}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {resultat && resultat.total === 0 && (
        <p style={{ fontSize: 13.5, color: "var(--muted)", marginTop: 22 }}>
          Aucun enregistrement ONSSA pour ces critères.
        </p>
      )}

      {resultat && resultat.total > 0 && (
        <>
          <p style={{ fontSize: 13, color: "var(--muted)", margin: "16px 0 0" }}>
            {resultat.total} usage(s) · {resultat.nbProduits} produit(s) · {resultat.nbDetenteurs} société(s).
          </p>
          <div className="card" style={{ marginTop: 10, overflow: "auto" }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Produit</th>
                  <th>N° AMM</th>
                  <th>Société</th>
                  <th>Matières</th>
                  <th>Culture</th>
                  <th>Ravageur</th>
                  <th>Dose</th>
                  <th style={{ textAlign: "right" }}>DAR</th>
                  <th>Échéance</th>
                </tr>
              </thead>
              <tbody>
                {resultat.lignes.map((e, i) => (
                  <tr key={`${e.produitId}|${e.culture}|${e.cible}|${i}`}>
                    <td style={{ fontWeight: 600 }}>
                      {e.nom}
                      {e.formulation && (
                        <div className="mono" style={{ fontWeight: 400, fontSize: 11, color: "var(--muted-2)" }}>
                          {e.formulation}
                        </div>
                      )}
                    </td>
                    <td className="mono" style={{ fontSize: 12 }}>
                      {e.amm || "—"}
                    </td>
                    <td style={{ fontSize: 12.5 }}>{e.detenteur}</td>
                    <td style={{ fontSize: 12.5 }}>
                      {e.matieres}
                    </td>
                    <td>
                      <Link href={hrefUsages({ culture: e.culture, molecule, cible, societe, statut })} className="link-accent">
                        {e.culture}
                      </Link>
                    </td>
                    <td style={{ fontSize: 12.5 }}>
                      <Link href={hrefUsages({ cible: e.cible, molecule, culture, societe, statut })} className="link-accent">
                        {e.cible}
                      </Link>
                    </td>
                    <td className="mono" style={{ fontSize: 12 }}>
                      {e.dose || "—"}
                    </td>
                    <td className="mono" style={{ textAlign: "right", fontSize: 12 }}>
                      {e.dar || "—"}
                    </td>
                    <td style={{ fontSize: 12.5, color: e.expire ? "var(--crit)" : "var(--muted)" }}>
                      {echeance(e.expiration)}
                      {e.expire && (
                        <div style={{ fontSize: 10.5, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                          expirée
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {resultat.total > resultat.lignes.length && (
              <p style={{ fontSize: 11.5, color: "var(--muted-2)", margin: "8px 16px 12px" }}>
                {resultat.total - resultat.lignes.length} autres lignes. Affinez la requête, ou exportez le CSV.
              </p>
            )}
          </div>
        </>
      )}
    </>
  );
}
