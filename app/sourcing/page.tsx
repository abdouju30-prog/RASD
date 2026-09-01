import Link from "next/link";
import { Globe2, Factory, ShieldCheck, Info } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { RiskBadge } from "@/components/RiskBadge";
import {
  PAYS_CIBLES,
  candidats,
  categoriesDisponibles,
  statsSourcing,
} from "@/lib/sourcing";

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
  const pays = sp.pays;
  const cat = sp.cat;
  const maxDetenteurs = sp.det ? Number(sp.det) : 3;

  const list = candidats({
    pays: pays ? [pays] : undefined,
    categorie: cat ?? null,
    maxDetenteurs,
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
      <div className="eyebrow">Prospection & sourcing</div>
      <h1 style={{ fontSize: 30, fontWeight: 700, margin: "10px 0 8px" }}>
        Matières actives à importer
      </h1>
      <p style={{ color: "var(--muted)", maxWidth: 720, lineHeight: 1.6, marginTop: 0 }}>
        Molécules à fort marché, faiblement détenues au Maroc, et sourçables auprès d&apos;un
        fournisseur générique <strong>déjà référencé à l&apos;ONSSA</strong> — c&apos;est ce dernier point
        qui transforme une homologation longue en dossier par référence.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
          gap: 14,
          margin: "20px 0 22px",
        }}
      >
        <StatCard label="Cibles retenues" value={String(list.length)} tone="low" sub="après filtres" />
        <StatCard
          label="Fournisseurs génériques"
          value={String(st.nbGeneriques)}
          unit={`/ ${st.nbFournisseurs}`}
          sub="référencés à l'index ONSSA"
        />
        <StatCard
          label="Pays de sourcing"
          value={String(st.parPays.length)}
          sub={st.parPays
            .slice(0, 4)
            .map(([p, n]) => `${p} ${n}`)
            .join(" · ")}
        />
        <StatCard
          label="Voie réglementaire"
          value="me-too"
          tone="low"
          sub="toutes les cibles sont déjà homologuées au Maroc"
        />
      </div>

      <div className="card" style={{ padding: "15px 18px", marginBottom: 18 }}>
        <div className="eyebrow" style={{ marginBottom: 9 }}>Pays fournisseur</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 15 }}>
          <Chip href={q({ pays: undefined })} actif={!pays}>
            Tous
          </Chip>
          {PAYS_CIBLES.filter((p) => st.parPays.some(([k]) => k === p)).map((p) => (
            <Chip key={p} href={q({ pays: p })} actif={pays === p}>
              {p}
            </Chip>
          ))}
        </div>

        <div className="eyebrow" style={{ marginBottom: 9 }}>Catégorie</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 15 }}>
          <Chip href={q({ cat: undefined })} actif={!cat}>
            Toutes
          </Chip>
          {cats.slice(0, 9).map((c) => (
            <Chip key={c} href={q({ cat: c })} actif={cat === c}>
              {c}
            </Chip>
          ))}
        </div>

        <div className="eyebrow" style={{ marginBottom: 9 }}>Concurrence maximale acceptée</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
          {[1, 2, 3, 5, 8].map((n) => (
            <Chip key={n} href={q({ det: String(n) })} actif={maxDetenteurs === n}>
              ≤ {n} détenteur{n > 1 ? "s" : ""}
            </Chip>
          ))}
        </div>
      </div>

      <div
        className="card"
        style={{ padding: "13px 17px", marginBottom: 18, display: "flex", gap: 11 }}
      >
        <Info size={16} color="var(--info)" style={{ flexShrink: 0, marginTop: 1 }} />
        <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.6 }}>
          <strong style={{ color: "var(--fg)" }}>Aucun prix dans cet écran.</strong> L&apos;index ONSSA
          n&apos;en contient pas. Le classement mesure l&apos;<em>accessibilité</em> : nombre de
          fournisseurs génériques en concurrence sur la molécule, ce qui détermine votre pouvoir de
          négociation. Les prix se relèvent en consultation, après avoir retenu une cible.
          <br />
          <strong style={{ color: "var(--mod)" }}>« Risque non évalué »</strong> signale une molécule
          sans fiche réglementaire vérifiée : son statut UE est inconnu, le filtre de risque ne
          s&apos;y applique donc pas. Vérifier avant toute consultation fournisseur.
        </div>
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        {list.slice(0, 40).map((c, i) => (
          <Link key={c.id} href={`/sourcing/${c.id}`} className="card" style={{ padding: "17px 20px", display: "block" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span className="mono" style={{ color: "var(--muted-2)", fontSize: 12 }}>
                    #{i + 1}
                  </span>
                  <span style={{ fontWeight: 600, fontSize: 15.5 }}>{c.nom}</span>
                  <span className="pill" style={{ fontWeight: 500 }}>{c.categorie ?? "—"}</span>
                  {c.risque ? (
                    <RiskBadge niveau={c.risque} score={c.scoreRisque ?? undefined} />
                  ) : (
                    <span
                      className="pill"
                      style={{
                        color: "var(--mod)",
                        borderColor: "color-mix(in srgb, var(--mod) 45%, transparent)",
                        background: "color-mix(in srgb, var(--mod) 12%, transparent)",
                      }}
                    >
                      <span className="dot" style={{ background: "var(--mod)" }} />
                      risque non évalué
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 8, lineHeight: 1.55 }}>
                  {c.cibles.slice(0, 6).join(" · ")}
                  {c.cibles.length > 6 && ` · +${c.cibles.length - 6}`}
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div
                  className="mono"
                  style={{ fontSize: 26, fontWeight: 600, color: "var(--accent)", lineHeight: 1 }}
                >
                  {c.score}
                </div>
                <div className="eyebrow" style={{ marginTop: 5 }}>score</div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 18,
                marginTop: 14,
                fontSize: 12.5,
                color: "var(--muted)",
              }}
            >
              <span>
                <strong className="mono" style={{ color: "var(--fg)" }}>{c.nbUsages}</strong> usages
              </span>
              <span>
                <strong className="mono" style={{ color: "var(--fg)" }}>{c.nbCultures}</strong> cultures
              </span>
              <span>
                <strong className="mono" style={{ color: "var(--fg)" }}>{c.nbHomologations}</strong> AMM
                au marché
              </span>
              <span>
                <strong className="mono" style={{ color: c.nbDetenteurs <= 1 ? "var(--accent)" : "var(--fg)" }}>
                  {c.nbDetenteurs}
                </strong>{" "}
                détenteur(s)
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Globe2 size={13} />
                {c.paysSourcing.join(", ")}
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Factory size={13} />
                {c.fournisseursCoutFaible.length} générique(s)
              </span>
              <span
                style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--accent)" }}
              >
                <ShieldCheck size={13} />
                voie me-too
              </span>
            </div>
          </Link>
        ))}

        {list.length === 0 && (
          <div className="card" style={{ padding: 30, color: "var(--muted)", fontSize: 14 }}>
            Aucune cible ne satisfait ces filtres. Élargissez la concurrence acceptée ou retirez le
            filtre pays.
          </div>
        )}
      </div>

      {list.length > 40 && (
        <p style={{ fontSize: 12, color: "var(--muted-2)", marginTop: 16 }}>
          {list.length - 40} autres cibles au-delà du top 40 — affinez les filtres.
        </p>
      )}
    </>
  );
}
