import Link from "next/link";
import { RiskBadge } from "@/components/RiskBadge";
import {
  PAYS_CIBLES,
  candidats,
  categoriesDisponibles,
  estFenetreMaroc,
  statsSourcing,
} from "@/lib/sourcing";
import { detenteurActuel } from "@/lib/detenteur";
import type { CandidatSourcing } from "@/lib/types";

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

function TableCibles({
  list,
  max,
  fenetre,
}: {
  list: CandidatSourcing[];
  max: number;
  fenetre?: boolean;
}) {
  return (
    <table className="tbl">
      <thead>
        <tr>
          <th>Matière</th>
          <th>Attractivité</th>
          <th>Risque</th>
          <th>ANSES</th>
          <th>Détenteurs</th>
          <th>Génériques</th>
          <th>Pays</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {list.slice(0, max).map((c) => (
          <tr key={c.id}>
            <td>
              <div style={{ fontWeight: 600 }}>{c.nom}</div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>
                {c.categorie ?? "—"} · {c.nbHomologations} AMM
              </div>
            </td>
            <td className="mono" style={{ fontWeight: 600 }}>
              {c.score}
            </td>
            <td>
              {c.risque ? (
                <RiskBadge niveau={c.risque} score={c.scoreRisque ?? undefined} />
              ) : (
                <span style={{ color: "var(--muted-2)", fontSize: 12 }}>non évalué</span>
              )}
            </td>
            <td style={{ fontSize: 12, color: fenetre ? "var(--high)" : "var(--muted)" }}>
              {c.statutAnses === "en_retrait"
                ? "retrait commercial"
                : c.statutAnses === "autorisée"
                  ? "autorisée"
                  : c.statutAnses ?? "—"}
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
  );
}

export default async function SourcingPage({
  searchParams,
}: {
  searchParams: Promise<{ pays?: string; cat?: string; det?: string; vue?: string }>;
}) {
  const sp = await searchParams;
  const d = await detenteurActuel();
  const pays = sp.pays;
  const cat = sp.cat;
  const vue = sp.vue === "fenetre" || sp.vue === "bas" ? sp.vue : undefined;
  const maxDetenteurs = sp.det ? Number(sp.det) : 3;

  const list = candidats({
    pays: pays ? [pays] : undefined,
    categorie: cat ?? null,
    maxDetenteurs,
    detenteurId: d.id,
  });
  const fenetre = list.filter(estFenetreMaroc);
  const bas = list.filter((c) => !estFenetreMaroc(c));
  const st = statsSourcing();
  const cats = categoriesDisponibles();

  const q = (o: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { pays, cat, det: String(maxDetenteurs), vue, ...o };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    return `/sourcing?${p.toString()}`;
  };

  const montrerFenetre = vue !== "bas" && (vue === "fenetre" || fenetre.length > 0);
  const montrerBas = vue !== "fenetre";

  return (
    <>
      <div className="fil">Alternative · Cibles</div>
      <h1>Matières actives à importer</h1>
      <p className="chapeau">
        {list.length} cibles — générique déjà à l&apos;ONSSA (voie me-too). Les retraits ANSES
        sont exclus : l&apos;ONSSA suivra. Le risque élevé, ou un nombre réduit de détenteurs,
        reste une fenêtre au Maroc.
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
        <Chip href={q({ vue: undefined })} actif={!vue}>Toutes</Chip>
        <Chip href={q({ vue: "fenetre" })} actif={vue === "fenetre"}>
          Fenêtre Maroc {fenetre.length}
        </Chip>
        <Chip href={q({ vue: "bas" })} actif={vue === "bas"}>
          Risque bas {bas.length}
        </Chip>
      </div>

      {montrerFenetre && (
        <div className="bloc" style={{ marginBottom: 16 }}>
          <div className="titre">
            <span>Fenêtre Maroc — risque élevé</span>
            <span className="mono">{fenetre.length}</span>
          </div>
          <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "0 0 10px" }}>
            Pas un retrait ANSES. Peu de détenteurs : une part de marché peut tenir
            longtemps au Maroc le temps de travailler le dossier.
          </p>
          {fenetre.length > 0 ? (
            <TableCibles list={fenetre} max={40} fenetre />
          ) : (
            <p style={{ fontSize: 13, color: "var(--muted)", padding: "12px 0" }}>
              Aucune cible à risque élevé pour ces filtres.
            </p>
          )}
        </div>
      )}

      {montrerBas && (
        <div className="bloc">
          <div className="titre">
            <span>Cibles</span>
            <span className="mono">{Math.min(bas.length, 40)}</span>
          </div>
          <TableCibles list={bas} max={40} />
          {bas.length === 0 && (
            <p style={{ fontSize: 13, color: "var(--muted)", padding: "12px 0" }}>
              Aucune cible pour ces filtres.
            </p>
          )}
        </div>
      )}
    </>
  );
}
