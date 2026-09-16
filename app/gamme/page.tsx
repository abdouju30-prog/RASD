import Link from "next/link";
import { LienMatiere } from "@/components/LienMatiere";
import { LayoutGrid, ArrowRight } from "lucide-react";
import { detenteurActuel } from "@/lib/detenteur";
import { gamme, type Manque } from "@/lib/gamme";

export const dynamic = "force-dynamic";

/**
 * Page « Gamme » — ce qui manque au détenteur courant, et où le prendre.
 *
 * ⚠️ ÉCRAN DÉLIBÉRÉMENT SEC. Tout y est chiffre ou nom : le marché, le trou,
 * la source. Les réserves de méthode tiennent en une ligne au pied de page et
 * dans lib/gamme.ts — pas dans la lecture quotidienne.
 */

const TON_ANSES: Record<string, string> = {
  autorisée: "var(--low)",
  inconnu: "var(--muted-2)",
};

function Sources({ m }: { m: Manque }) {
  if (m.meToo.length === 0 && m.sources.length === 0) {
    return <span style={{ color: "var(--muted-2)" }}>—</span>;
  }
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 5, alignItems: "center" }}>
      {m.meToo.length > 0 && (
        <span
          className="pill"
          style={{
            fontSize: 10,
            color: "var(--accent)",
            borderColor: "color-mix(in srgb, var(--accent) 45%, transparent)",
            background: "var(--accent-fond)",
            whiteSpace: "nowrap",
          }}
          title={`Déjà référencé à l'ONSSA : ${m.meToo.join(" · ")}`}
        >
          me-too {m.meToo.length}
        </span>
      )}
      {m.sources.map((s) => (
        <span
          key={s.registre}
          className="pill"
          style={{ fontSize: 10, color: "var(--info)", whiteSpace: "nowrap" }}
          title={`${s.registre} — ${s.portee}`}
        >
          {s.registre} <span className="mono">{s.n}</span>
        </span>
      ))}
    </div>
  );
}

function Table({ liste, max }: { liste: Manque[]; max: number }) {
  return (
    <>
      <table className="tbl">
        <thead>
          <tr>
            <th>Matière active</th>
            <th>Type</th>
            <th style={{ textAlign: "right" }}>Marché</th>
            <th style={{ textAlign: "right" }}>Sociétés</th>
            <th style={{ textAlign: "right" }}>Usages neufs</th>
            <th>Cultures</th>
            <th>Où la prendre</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {liste.slice(0, max).map((m) => (
            <tr key={m.molecule}>
              <td style={{ fontWeight: 500 }}>
                <LienMatiere nom={m.molecule} />
                {m.anses && (
                  <span
                    style={{ color: TON_ANSES[m.anses.statut] ?? "var(--muted-2)", fontSize: 10 }}
                    title={`ANSES : ${m.anses.statut}`}
                  >
                    {" "}
                    ●
                  </span>
                )}
              </td>
              <td style={{ fontSize: 12, color: "var(--muted)" }}>{m.categorie}</td>
              <td className="mono" style={{ textAlign: "right", fontWeight: 600 }}>{m.nbProduits}</td>
              <td className="mono" style={{ textAlign: "right", color: "var(--muted)" }}>
                {m.nbDetenteurs}
              </td>
              <td className="mono" style={{ textAlign: "right", color: "var(--accent)", fontWeight: 600 }}>
                {m.usagesNeufs.length}
              </td>
              <td style={{ fontSize: 11.5, color: "var(--muted)", maxWidth: 210 }}>
                {m.cultures.slice(0, 3).join(" · ")}
                {m.cultures.length > 3 && (
                  <span className="mono" style={{ color: "var(--muted-2)" }}> +{m.cultures.length - 3}</span>
                )}
              </td>
              <td><Sources m={m} /></td>
              <td style={{ whiteSpace: "nowrap" }}>
                <Link href={`/sourcing/${m.id}`} className="link-accent" style={{ fontSize: 12 }}>
                  sourcer <ArrowRight size={11} />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {liste.length > max && (
        <p style={{ fontSize: 11.5, color: "var(--muted-2)", marginTop: 8 }}>
          {liste.length - max} autres.
        </p>
      )}
    </>
  );
}

export default async function GammePage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const sp = await searchParams;
  const d = await detenteurActuel();
  const g = gamme(d.id);
  const liste = sp.type ? g.manques.filter((m) => m.categorie === sp.type) : g.manques;

  return (
    <>
      <div className="fil">Alternative · Gamme</div>
      <h1 style={{ display: "flex", alignItems: "center", gap: 9 }}>
        <LayoutGrid size={19} /> Gamme — {d.nom}
      </h1>
      <p className="chapeau">
        {g.nbMolecules} molécules détenues sur {g.nbMoleculesMarche} au marché marocain.{" "}
        {g.manques.length} manquantes, classées par poids de marché et facilité de sourcing.
      </p>

      <div className="strip" style={{ marginBottom: 14 }}>
        {g.categories.map((c) => (
          <div key={c.categorie}>
            <span className="eyebrow">{c.categorie}</span>
            <strong className="mono" style={{ fontSize: 17, fontWeight: 600 }}>
              {c.vous}
              <span style={{ color: "var(--muted-2)", fontWeight: 400 }}>/{c.marche}</span>
            </strong>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: "12px 15px", marginBottom: 14 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          <Link
            href="/gamme"
            className="pill"
            style={{
              fontWeight: 500,
              color: !sp.type ? "var(--accent)" : "var(--muted)",
              borderColor: !sp.type
                ? "color-mix(in srgb, var(--accent) 45%, transparent)"
                : "var(--border-strong)",
              background: !sp.type ? "var(--accent-fond)" : "transparent",
            }}
          >
            Tous <span className="mono" style={{ opacity: 0.65 }}>{g.manques.length}</span>
          </Link>
          {g.categories
            .filter((c) => c.manques > 0)
            .map((c) => (
              <Link
                key={c.categorie}
                href={`/gamme?type=${encodeURIComponent(c.categorie)}`}
                className="pill"
                style={{
                  fontWeight: 500,
                  color: sp.type === c.categorie ? "var(--accent)" : "var(--muted)",
                  borderColor:
                    sp.type === c.categorie
                      ? "color-mix(in srgb, var(--accent) 45%, transparent)"
                      : "var(--border-strong)",
                  background: sp.type === c.categorie ? "var(--accent-fond)" : "transparent",
                }}
              >
                {c.categorie} <span className="mono" style={{ opacity: 0.65 }}>{c.manques}</span>
              </Link>
            ))}
        </div>
      </div>

      <div className="card" style={{ padding: "18px 20px", marginBottom: 14 }}>
        <div className="h-title">À prendre — {liste.length}</div>
        <div style={{ marginTop: 12 }}>
          <Table liste={liste} max={40} />
        </div>
      </div>

      <div className="card" style={{ padding: "18px 20px" }}>
        <div className="h-title">Couverture par culture</div>
        <div style={{ marginTop: 12, overflowX: "auto" }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Culture</th>
                {g.categories.map((c) => (
                  <th key={c.categorie} style={{ textAlign: "right" }}>
                    {c.categorie.slice(0, 4)}.
                  </th>
                ))}
                <th style={{ textAlign: "right" }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {g.cultures.slice(0, 24).map((l) => (
                <tr key={l.culture}>
                  <td style={{ fontWeight: 500 }}>{l.culture}</td>
                  {l.cases.map((c) => (
                    <td
                      key={c.categorie}
                      className="mono"
                      style={{
                        textAlign: "right",
                        fontSize: 12,
                        color:
                          c.marche === 0
                            ? "var(--muted-2)"
                            : c.vous === 0
                            ? "var(--high)"
                            : "var(--low)",
                      }}
                      title={`${c.categorie} · vous ${c.vous} / marché ${c.marche}`}
                    >
                      {c.marche === 0 ? "—" : `${c.vous}/${c.marche}`}
                    </td>
                  ))}
                  <td className="mono" style={{ textAlign: "right", fontWeight: 600 }}>
                    {l.vous}/{l.marche}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p style={{ fontSize: 11.5, color: "var(--muted-2)", marginTop: 14, lineHeight: 1.55, maxWidth: "92ch" }}>
        Marché = produits de l&apos;index ONSSA portant la molécule. Molécules retirées ou en retrait
        chez l&apos;ANSES exclues. <span className="mono">me-too</span> = fournisseur déjà référencé
        au Maroc ; Brésil et Chine comptent des usines, Corée, Turquie et Russie des détenteurs.
        Ni prix, ni volume, ni brevet.
      </p>
    </>
  );
}
