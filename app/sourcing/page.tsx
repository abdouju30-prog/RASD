import Link from "next/link";
import { RiskBadge } from "@/components/RiskBadge";
import {
  PAYS_CIBLES,
  candidats,
  categoriesDisponibles,
  statsSourcing,
} from "@/lib/sourcing";
import { detenteurActuel } from "@/lib/detenteur";

export const dynamic = "force-dynamic";

function Chip({
  href,
  actif,
  children,
}: {
  href: string;
  actif: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="pill"
      style={{
        fontWeight: 500,
        color: actif ? "var(--accent)" : "var(--muted)",
        borderColor: actif ? "color-mix(in srgb, var(--accent) 45%, transparent)" : "var(--border-strong)",
        background: actif ? "color-mix(in srgb, var(--accent) 12%, transparent)" : "transparent",
      }}
    >
      {children}
    </Link>
  );
}

export default async function SourcingPage({
  searchParams,
}: {
  searchParams: Promise<{ pays?: string; cat?: string; det?: string }>;
}) {
  const sp = await searchParams;
  const d = await detenteurActuel();
  const pays = sp.pays;
  const cat = sp.cat;
  const maxDetenteurs = sp.det ? Number(sp.det) : 3;

  const list = candidats({
    pays: pays ? [pays] : undefined,
    categorie: cat ?? null,
    maxDetenteurs,
    detenteurId: d.id,
  });
  const st = statsSourcing();
  const cats = categoriesDisponibles();

  const q = (o: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { pays, cat, det: String(maxDetenteurs), ...o };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    return `/sourcing?${p.toString()}`;
  };

  return (
    <>
      <div className="fil">Alternative · Cibles</div>
      <h1>Matières actives à importer</h1>
      <p className="chapeau">
        {list.length} cibles — fournisseur générique déjà à l&apos;ONSSA (voie me-too).
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "8px 0 16px" }}>
        <Chip href={q({ pays: undefined })} actif={!pays}>Tous pays</Chip>
        {PAYS_CIBLES.filter((p) => st.parPays.some(([k]) => k === p)).map((p) => (
          <Chip key={p} href={q({ pays: p })} actif={pays === p}>{p}</Chip>
        ))}
        <Chip href={q({ cat: undefined })} actif={!cat}>Toutes cat.</Chip>
        {cats.slice(0, 8).map((c) => (
          <Chip key={c} href={q({ cat: c })} actif={cat === c}>{c}</Chip>
        ))}
        {[1, 2, 3, 5, 8].map((n) => (
          <Chip key={n} href={q({ det: String(n) })} actif={maxDetenteurs === n}>
            ≤ {n} dét.
          </Chip>
        ))}
      </div>

      <div className="bloc">
        <div className="titre">
          <span>Cibles</span>
          <span className="mono">{Math.min(list.length, 40)}</span>
        </div>
        <table className="tbl">
          <thead>
            <tr>
              <th>Matière</th>
              <th>Score</th>
              <th>Détenteurs</th>
              <th>Génériques</th>
              <th>Pays</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {list.slice(0, 40).map((c) => (
              <tr key={c.id}>
                <td>
                  <div style={{ fontWeight: 600 }}>{c.nom}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>
                    {c.categorie ?? "—"} · {c.nbHomologations} AMM
                  </div>
                </td>
                <td>
                  {c.risque ? (
                    <RiskBadge niveau={c.risque} score={c.scoreRisque ?? undefined} />
                  ) : (
                    <span className="mono">{c.score}</span>
                  )}
                </td>
                <td className="mono">{c.nbDetenteurs}</td>
                <td className="mono">{c.fournisseursCoutFaible.length}</td>
                <td style={{ fontSize: 12.5, color: "var(--muted)" }}>
                  {c.paysSourcing.slice(0, 3).join(", ")}
                </td>
                <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                  <Link href={`/sourcing/${c.id}`} className="pill" style={{ fontWeight: 500, fontSize: 12 }}>
                    Ouvrir
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && (
          <p style={{ fontSize: 13, color: "var(--muted)", padding: "12px 0" }}>
            Aucune cible pour ces filtres.
          </p>
        )}
      </div>
    </>
  );
}
