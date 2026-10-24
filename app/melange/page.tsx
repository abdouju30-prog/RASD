import Link from "next/link";
import { ArrowLeft, Combine, ArrowRight } from "lucide-react";
import { LienMatiere } from "@/components/LienMatiere";
import { ficheNom } from "@/lib/liens";
import { ficheMelange, SEP_URL } from "@/lib/melange-annuaire";
import { usageFr } from "@/lib/coree";

export const dynamic = "force-dynamic";

/**
 * Fiche d'un mélange (association de matières actives).
 *
 * Sert l'annuaire : cliquer sur « Azoxystrobin Difenoconazole 200 G/L »
 * montre ce que l'outil sait de l'ASSOCIATION — au Maroc, en Corée, chez quels
 * fabricants — et non de l'une de ses molécules seules.
 */
export default async function MelangePage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const sp = await searchParams;
  const composants = (sp.c ?? "").split(SEP_URL).map((x) => x.trim()).filter(Boolean).slice(0, 6);
  if (composants.length < 2) {
    return (
      <>
        <Link href="/annuaire" style={{ color: "var(--muted)", fontSize: 13 }}><ArrowLeft size={14} /> Annuaire</Link>
        <h1>Mélange introuvable</h1>
      </>
    );
  }

  const f = ficheMelange(composants);
  const { maroc, coree, fabricants, produits } = f;
  const nbDet = new Set(produits.map((p) => p.detenteur)).size;

  return (
    <>
      <Link href="/annuaire" style={{ color: "var(--muted)", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6 }}>
        <ArrowLeft size={14} /> Annuaire
      </Link>

      <h1 style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
        <Combine size={19} />
        {composants.map((c, i) => (
          <span key={c}>
            {i > 0 && <span style={{ color: "var(--muted-2)" }}>+ </span>}
            <LienMatiere nom={c} />
          </span>
        ))}
      </h1>
      <p className="chapeau">
        {produits.length
          ? `Association homologuée au Maroc : ${produits.length} produit(s), ${nbDet} société(s).`
          : "Aucun produit de l'index ONSSA ne contient exactement cette association."}{" "}
        {coree ? `Homologuée en Corée (${coree.nbHomologations} homologation(s)).` : ""}
      </p>

      <div className="card" style={{ padding: "18px 20px", marginBottom: 14 }}>
        <div className="h-title">Composants</div>
        <table className="tbl" style={{ marginTop: 8 }}>
          <tbody>
            {composants.map((c) => {
              const n = ficheNom(c);
              return (
                <tr key={c}>
                  <td style={{ fontWeight: 500 }}><LienMatiere nom={c} /></td>
                  <td style={{ fontSize: 12, color: "var(--muted)" }}>{n.href ? n.titre : "Absente de l'index ONSSA"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {produits.length > 0 && (
        <div className="card" style={{ padding: "18px 20px", marginBottom: 14 }}>
          <div className="h-title">Au Maroc — {produits.length} produit(s) homologué(s)</div>
          <table className="tbl" style={{ marginTop: 8 }}>
            <thead>
              <tr><th>Produit</th><th>Société</th><th>AMM</th><th>Expiration</th><th>Cultures</th></tr>
            </thead>
            <tbody>
              {produits.map((p) => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 500 }}>
                    {p.nomCommercial}
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>{p.matieresActives.join(" / ")}</div>
                  </td>
                  <td style={{ fontSize: 12.5 }}>{p.detenteur}</td>
                  <td className="mono" style={{ fontSize: 12 }}>{p.amm ?? "—"}</td>
                  <td className="mono" style={{ fontSize: 12 }}>{p.expiration ?? "—"}</td>
                  <td style={{ fontSize: 11.5, color: "var(--muted)", maxWidth: 260 }}>
                    {[...new Set(p.usages.map((u) => u.culture).filter(Boolean))].slice(0, 4).join(" · ") || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {maroc && (
            <p style={{ marginTop: 10 }}>
              <Link href={`/sourcing/${maroc.id}`} className="link-accent" style={{ fontSize: 12.5 }}>
                sourcer <ArrowRight size={11} />
              </Link>
            </p>
          )}
        </div>
      )}

      {coree && (
        <div className="card" style={{ padding: "18px 20px", marginBottom: 14 }}>
          <div className="h-title">En Corée</div>
          <table className="tbl" style={{ marginTop: 8 }}>
            <tbody>
              <tr><td>Homologations</td><td>{coree.nbHomologations} ({coree.nbFabrique} fabriquées, {coree.nbImporte} importées)</td></tr>
              <tr><td>Sociétés</td><td>{coree.nbSocietes}{coree.societes.length ? ` — ${coree.societes.slice(0, 8).join(" · ")}` : ""}</td></tr>
              <tr><td>Usages</td><td>{coree.usages.slice(0, 6).map(usageFr).join(" · ") || "—"}</td></tr>
              <tr><td>Période</td><td>{coree.premiere ?? "—"} → {coree.derniere ?? "—"}</td></tr>
            </tbody>
          </table>
          {!produits.length && (
            <p style={{ fontSize: 11.5, color: "var(--muted-2)", marginTop: 8, lineHeight: 1.6 }}>
              Un précédent étranger n&apos;est pas une autorisation de mélange : l&apos;ONSSA instruit chaque association pour elle-même.
            </p>
          )}
        </div>
      )}

      <div className="card" style={{ padding: "18px 20px" }}>
        <div className="h-title">Fabricants / titulaires qui la déclarent — {fabricants.length}</div>
        {fabricants.length === 0 ? (
          <p style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 8 }}>Aucun fabricant de l&apos;annuaire ne la déclare sous cette forme.</p>
        ) : (
          <table className="tbl" style={{ marginTop: 8 }}>
            <thead><tr><th>Société</th><th>Pays</th><th>Registres</th></tr></thead>
            <tbody>
              {fabricants.slice(0, 100).map((x) => (
                <tr key={x.cle}>
                  <td style={{ fontWeight: 500 }}>
                    <Link href={`/annuaire?q=${encodeURIComponent(x.nom)}`} className="link-accent">{x.nom}</Link>
                    {x.meToo && <span className="pill" style={{ fontSize: 9.5, marginLeft: 6, color: "var(--low)" }}>fournit déjà le Maroc</span>}
                  </td>
                  <td style={{ fontSize: 12.5 }}>{x.pays}{!x.paysFiable ? " (présumé)" : ""}</td>
                  <td style={{ fontSize: 11.5, color: "var(--muted)" }}>{x.registres.join(" · ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
