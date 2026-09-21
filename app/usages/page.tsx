import Link from "next/link";
import { Sprout } from "lucide-react";
import { molecules } from "@/lib/formulation";
import {
  filtrerEmplois,
  hrefUsages,
  inventaireCibles,
  inventaireCultures,
  resoudreCible,
  resoudreCulture,
  resoudreEmploi,
} from "@/lib/usages";

function Valeurs({ v }: { v: string[] }) {
  if (v.length === 0) return <span style={{ color: "var(--muted-2)" }}>—</span>;
  return (
    <span className="mono" style={{ fontSize: 12 }}>
      {v.slice(0, 2).join(" · ")}
      {v.length > 2 && <span style={{ color: "var(--muted-2)" }}> +{v.length - 2}</span>}
    </span>
  );
}

export default async function UsagesPage({
  searchParams,
}: {
  searchParams: Promise<{ culture?: string; cible?: string; maladie?: string; molecule?: string }>;
}) {
  const sp = await searchParams;
  const culture = resoudreCulture(sp.culture ?? "");
  const cible = resoudreCible(sp.cible ?? sp.maladie ?? "");
  const molQ = (sp.molecule ?? "").trim();
  const matiere = molQ ? resoudreEmploi(molQ).matiere : null;
  const molecule = matiere
    ? molecules(matiere.nom, matiere.molecule)[0] || matiere.molecule || matiere.nom
    : null;

  const filtre = Boolean(culture || cible || matiere);
  const { emplois, nbProduits, nbDetenteurs, nbMatieres } = filtre
    ? filtrerEmplois({ culture, cible, matiere })
    : { emplois: [], nbProduits: 0, nbDetenteurs: 0, nbMatieres: 0 };

  const titre = [
    molecule,
    culture,
    cible ? `contre ${cible}` : null,
  ]
    .filter(Boolean)
    .join(" — ") || "Usages homologués";

  const max = 80;
  const cultures = inventaireCultures();
  const cibles = inventaireCibles();

  return (
    <>
      <div className="fil">Portefeuille · Usages</div>
      <h1>{titre}</h1>
      <p className="chapeau">
        {filtre ? (
          <>
            {emplois.length} usage(s) homologué(s) · {nbMatieres} matière(s) · {nbProduits} produit(s)
            chez {nbDetenteurs} détenteur(s). Dose et DAR tels qu&apos;à l&apos;index ONSSA.
          </>
        ) : (
          <>
            Tapez une matière, une culture ou une maladie dans la barre — ou choisissez ci-dessous.
            L&apos;écran montre les usages homologués correspondants : matières, produits, dose, DAR.
          </>
        )}
      </p>

      {filtre && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "14px 0 4px" }}>
          {molecule && (
            <Link href={hrefUsages({ culture, cible })} className="pill" style={{ fontSize: 12 }}>
              {molecule} ×
            </Link>
          )}
          {culture && (
            <Link href={hrefUsages({ molecule, cible })} className="pill" style={{ fontSize: 12 }}>
              {culture} ×
            </Link>
          )}
          {cible && (
            <Link href={hrefUsages({ molecule, culture })} className="pill" style={{ fontSize: 12 }}>
              {cible} ×
            </Link>
          )}
        </div>
      )}

      {!filtre && (
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
            Maladies / ravageurs
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

      {filtre && emplois.length === 0 && (
        <p style={{ fontSize: 13.5, color: "var(--muted)", marginTop: 22 }}>
          Aucun usage homologué pour ces critères dans l&apos;index ONSSA.
        </p>
      )}

      {filtre && emplois.length > 0 && (
        <div className="card" style={{ marginTop: 22, overflow: "hidden" }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Matière active</th>
                <th>Culture</th>
                <th>Parasite</th>
                <th>Dose</th>
                <th style={{ textAlign: "right" }}>DAR (j)</th>
                <th>Produits</th>
              </tr>
            </thead>
            <tbody>
              {emplois.slice(0, max).map((e) => (
                <tr key={`${e.matiere}|${e.culture}|${e.cible}`}>
                  <td style={{ fontWeight: 500 }}>
                    {e.matiereId ? (
                      <Link href={`/matieres/${e.matiereId}`} className="link-accent">
                        {e.matiere}
                      </Link>
                    ) : (
                      e.matiere
                    )}
                  </td>
                  <td>
                    <Link href={hrefUsages({ culture: e.culture, molecule, cible })} className="link-accent">
                      {e.culture}
                    </Link>
                  </td>
                  <td style={{ fontSize: 12.5, color: "var(--muted)" }}>
                    <Link href={hrefUsages({ cible: e.cible, molecule, culture })} className="link-accent">
                      {e.cible}
                    </Link>
                  </td>
                  <td>
                    <Valeurs v={e.doses} />
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <Valeurs v={e.dar} />
                  </td>
                  <td style={{ fontSize: 12.5, color: "var(--muted)" }}>
                    {e.produits.slice(0, 2).join(" · ")}
                    {e.produits.length > 2 && (
                      <span className="mono" style={{ color: "var(--muted-2)" }}>
                        {" "}
                        +{e.produits.length - 2}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {emplois.length > max && (
            <p style={{ fontSize: 11.5, color: "var(--muted-2)", margin: "8px 16px 12px" }}>
              {emplois.length - max} autres usages. Affinez avec une matière, une culture ou une maladie.
            </p>
          )}
        </div>
      )}
    </>
  );
}
