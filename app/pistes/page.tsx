import Link from "next/link";
import { detenteurActuel } from "@/lib/detenteur";
import { gamme } from "@/lib/gamme";
import { PISTES_PRETES, STATS_MELANGES } from "@/lib/melanges";
import { A_SAISIR, STATS_SENTINELLE } from "@/lib/sentinelle";
import { CONTRAINTES, STATS_IMPORT } from "@/lib/importation";

export const dynamic = "force-dynamic";

/**
 * Autres pistes : Gamme, Mélanges, Sentinelle et Importation sur une page.
 * Les cinq premières lignes de chacun ; le détail complet reste sur sa page.
 */
function Bloc({
  titre,
  resume,
  href,
  lignes,
}: {
  titre: string;
  resume: string;
  href: string;
  lignes: string[];
}) {
  return (
    <div className="card" style={{ padding: "14px 18px" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <span className="h-title">{titre}</span>
        <Link href={href} className="link-accent" style={{ fontSize: 12.5, whiteSpace: "nowrap" }}>
          Voir tout →
        </Link>
      </div>
      <div style={{ fontSize: 12.5, color: "var(--muted)", margin: "4px 0 8px" }}>{resume}</div>
      {lignes.length ? (
        <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13, lineHeight: 1.7 }}>
          {lignes.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ol>
      ) : (
        <div style={{ fontSize: 12.5, color: "var(--muted)" }}>Rien pour l&apos;instant.</div>
      )}
    </div>
  );
}

export default async function PistesPage() {
  const d = await detenteurActuel();
  const gm = gamme(d.id);
  const manques = [...gm.manques].sort((a, b) => b.score - a.score);
  const barrieres = CONTRAINTES.filter((c) => c.barriere);

  return (
    <>
      <h1>Autres pistes</h1>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))",
          gap: 12,
          marginTop: 12,
        }}
      >
        <Bloc
          titre="Gamme — ce qui manque"
          resume={`${manques.length} molécule(s) du marché marocain absentes de la gamme ${d.nom}`}
          href="/gamme"
          lignes={manques
            .slice(0, 5)
            .map(
              (m) =>
                `${m.molecule} — ${m.categorie.toLowerCase()}, ${m.nbProduits} produit(s) au Maroc, ${m.meToo.length} fournisseur(s) déjà référencé(s)`
            )}
        />
        <Bloc
          titre="Mélanges — associations prêtes"
          resume={`${STATS_MELANGES.nbPretes} association(s) homologuée(s) en Corée dont tous les composants sont déjà homologués au Maroc`}
          href="/melanges"
          lignes={PISTES_PRETES.slice(0, 5).map(
            (p) =>
              `${p.composantsSitues.map((c) => c.auMaroc ?? c.iso).join(" + ")} — ${p.nbHomologations} homologation(s) en Corée`
          )}
        />
        <Bloc
          titre="Sentinelle — molécules à saisir"
          resume={`${STATS_SENTINELLE.nbASaisir} molécule(s) absentes du Maroc, autorisées en France, fabrication générique attestée`}
          href="/sentinelle"
          lignes={A_SAISIR.slice(0, 5).map(
            (c) =>
              `${c.libelle} — ${c.nbGeneriques} générique(s)${c.paysGeneriques.length ? ` (${c.paysGeneriques.slice(0, 3).join(", ")})` : ""}`
          )}
        />
        <Bloc
          titre="Importation — barrières"
          resume={`${STATS_IMPORT.nbBarrieres} barrière(s) sur ${STATS_IMPORT.nbContraintes} règles d'importation`}
          href="/importation"
          lignes={barrieres.slice(0, 5).map((c) => c.regle)}
        />
      </div>
    </>
  );
}
