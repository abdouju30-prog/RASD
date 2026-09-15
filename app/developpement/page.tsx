import Link from "next/link";
import { Download } from "lucide-react";
import { TabNav } from "@/components/TabNav";
import { StatCard } from "@/components/StatCard";
import { RiskBadge } from "@/components/RiskBadge";
import { LienMatiere } from "@/components/LienMatiere";
import { Aide } from "@/components/Aide";
import { detenteurActuel } from "@/lib/detenteur";
import {
  PAYS_CIBLES,
  candidats,
  categoriesDisponibles,
  statsSourcing,
} from "@/lib/sourcing";
import { gamme, type Manque } from "@/lib/gamme";
import {
  ASSOCIATIONS,
  PISTES_ASSOCIATIONS,
  PISTES_PRETES,
  STATS_MELANGES,
  associationsDe,
  type Association,
  type PisteAssociation,
} from "@/lib/melanges";
import {
  A_ECARTER,
  A_SAISIR,
  A_SURVEILLER,
  A_VERIFIER,
  LIBELLE_ACCES,
  LIBELLE_FEU,
  NOUVELLES,
  STATS_SENTINELLE,
  type Candidate,
} from "@/lib/sentinelle";
import { usageFr } from "@/lib/coree";

export const dynamic = "force-dynamic";

const TON_ANSES: Record<string, string> = {
  autorisée: "var(--low)",
  inconnu: "var(--muted-2)",
};

const TON_FEU: Record<string, string> = {
  vert: "var(--low)",
  orange: "var(--mod)",
  rouge: "var(--high)",
  inconnu: "var(--muted-2)",
};

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

export default async function DeveloppementPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; pays?: string; cat?: string; det?: string; type?: string }>;
}) {
  const sp = await searchParams;
  const d = await detenteurActuel();
  const mode = sp.mode ?? "metoo";

  // Data for Mode Me-too
  const pays = sp.pays;
  const cat = sp.cat;
  const maxDetenteurs = sp.det ? Number(sp.det) : 3;
  const listCandidats = candidats({
    pays: pays ? [pays] : undefined,
    categorie: cat ?? null,
    maxDetenteurs,
    detenteurId: d.id,
  });
  const stSourcing = statsSourcing();
  const cats = categoriesDisponibles();

  // Data for Mode Gamme
  const gm = gamme(d.id);
  const typeFiltre = sp.type;
  const manquesFiltres = typeFiltre
    ? gm.manques.filter((m) => m.categorie.toLowerCase() === typeFiltre.toLowerCase())
    : gm.manques;

  // Data for Mode Mélanges
  const tenues = associationsDe(d.id);

  const tabs = [
    {
      id: "metoo",
      label: "Cibles Me-too",
      count: listCandidats.length,
      href: `/developpement?mode=metoo`,
      active: mode === "metoo",
    },
    {
      id: "gamme",
      label: "Trous de Gamme",
      count: gm.manques.length,
      href: `/developpement?mode=gamme`,
      active: mode === "gamme",
    },
    {
      id: "melanges",
      label: "Mélanges & Associations",
      count: STATS_MELANGES.nbPretes,
      href: `/developpement?mode=melanges`,
      active: mode === "melanges",
    },
    {
      id: "sentinelle",
      label: "Sentinelle Exclusivités",
      count: STATS_SENTINELLE.nbASaisir,
      href: `/developpement?mode=sentinelle`,
      active: mode === "sentinelle",
    },
  ];

  const qSourcing = (o: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { mode: "metoo", pays, cat, det: String(maxDetenteurs), ...o };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    return `/developpement?${p.toString()}`;
  };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20 }}>
        <div>
          <div className="eyebrow">Section 3 · Développement & Croissance</div>
          <h1>
            {mode === "metoo" && "Cibles Me-too à fort potentiel"}
            {mode === "gamme" && "Trous de gamme & opportunités de marché"}
            {mode === "melanges" && "Associations & formulations prêtes"}
            {mode === "sentinelle" && "Sentinelle — Prise d'exclusivité"}
          </h1>
          <p className="chapeau">
            {mode === "metoo" && "Molécules déjà référencées à l'ONSSA avec fournisseurs génériques identifiés (homologation allégée sans dossier toxicologique complet)."}
            {mode === "gamme" && "Substances actives présentes sur le marché marocain chez des concurrents mais absentes de votre catalogue."}
            {mode === "melanges" && "Formulations 2-way et 3-way déjà homologuées à l'international (Corée du Sud) dont les matières actives sont présentes au Maroc."}
            {mode === "sentinelle" && "Molécules émergentes dans les registres OCDE (Brésil, Corée) mais absentes du Maroc — opportunités de premier arrivant."}
          </p>
        </div>
        {mode === "metoo" && (
          <a
            href="/api/spectres-pdf"
            className="pill"
            style={{
              background: "var(--accent)",
              color: "#fff",
              borderColor: "var(--accent)",
              fontWeight: 600,
              padding: "10px 16px",
              fontSize: 12.5,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              flexShrink: 0,
              boxShadow: "var(--ombre-1)",
            }}
            download
          >
            <Download size={15} /> PDF spectres · 21 M.A.
          </a>
        )}
      </div>

      <TabNav tabs={tabs} />

      {/* ── MODE 1 : CIBLES ME-TOO ── */}
      {mode === "metoo" && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
              gap: 14,
              marginBottom: 20,
            }}
          >
            <StatCard label="Cibles retenues" value={String(listCandidats.length)} tone="low" sub="après filtres" />
            <StatCard
              label="Fournisseurs génériques"
              value={String(stSourcing.nbGeneriques)}
              unit={`/ ${stSourcing.nbFournisseurs}`}
              sub="référencés à l'index ONSSA"
            />
            <StatCard
              label="Pays de sourcing"
              value={String(stSourcing.parPays.length)}
              sub={stSourcing.parPays.slice(0, 4).map(([pays, n]) => `${pays} (${n})`).join(" · ")}
            />
            <StatCard label="Voie réglementaire" value="me-too" tone="low" sub="exemption étude toxicité active" />
          </div>

          <div className="card" style={{ padding: "14px 18px", marginBottom: 18, display: "flex", flexWrap: "wrap", gap: 14 }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "var(--muted)", marginRight: 4 }}>Pays fournisseur :</span>
              <Chip href={qSourcing({ pays: undefined })} actif={!pays}>Tous</Chip>
              {PAYS_CIBLES.map((p) => (
                <Chip key={p} href={qSourcing({ pays: p })} actif={pays === p}>{p}</Chip>
              ))}
            </div>

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "var(--muted)", marginRight: 4 }}>Catégorie :</span>
              <Chip href={qSourcing({ cat: undefined })} actif={!cat}>Toutes</Chip>
              {cats.map((c) => (
                <Chip key={c} href={qSourcing({ cat: c })} actif={cat === c}>{c}</Chip>
              ))}
            </div>

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "var(--muted)", marginRight: 4 }}>Concurrence max :</span>
              {[1, 2, 3, 5, 8].map((n) => (
                <Chip key={n} href={qSourcing({ det: String(n) })} actif={maxDetenteurs === n}>≤ {n} dét.</Chip>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            {listCandidats.slice(0, 40).map((c) => (
              <div key={c.id} className="card" style={{ padding: "16px 20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Link href={`/sourcing/${c.id}`} className="link-accent" style={{ fontSize: 16, fontWeight: 600 }}>
                        {c.molecule}
                      </Link>
                      <span style={{ fontSize: 12, color: "var(--muted)" }}>{c.categorie ?? "—"}</span>
                      {c.risque && <RiskBadge niveau={c.risque} score={c.scoreRisque ?? undefined} />}
                    </div>
                    <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 4 }}>
                      {c.cibles.slice(0, 5).join(" · ")}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span className="mono" style={{ fontSize: 24, fontWeight: 700, color: "var(--accent)" }}>
                      {c.score}
                    </span>
                    <div style={{ fontSize: 11, color: "var(--muted-2)" }}>score d&apos;opportunité</div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 12, color: "var(--muted)", marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
                  <span>{c.nbUsages} usage(s)</span>
                  <span>{c.nbCultures} culture(s)</span>
                  <span>{c.nbDetenteurs} concurrent(s)</span>
                  <span>Fournisseurs : <strong>{c.paysSourcing.join(", ")}</strong></span>
                  <span className="mono" style={{ color: "var(--low)" }}>me-too éligible</span>
                  <Link href={`/sourcing/${c.id}`} className="link-accent" style={{ marginLeft: "auto" }}>
                    Fiche sourcing complète →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── MODE 2 : TROUS DE GAMME ── */}
      {mode === "gamme" && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
              gap: 14,
              marginBottom: 20,
            }}
          >
            <StatCard label="Molécules détenues" value={String(gm.nbMolecules)} unit={`/ ${gm.nbMoleculesMarche}`} sub="part du catalogue national" />
            <StatCard label="Matières manquantes" value={String(gm.manques.length)} tone="high" sub="présentes chez concurrents" />
            <StatCard label="Cultures couvertes" value={String(gm.cultures.length)} sub="cultures avec homologation" />
          </div>

          <div className="card" style={{ padding: "14px 18px", marginBottom: 18, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "var(--muted)", marginRight: 4 }}>Famille :</span>
            <Chip href="/developpement?mode=gamme" actif={!typeFiltre}>Toutes</Chip>
            {gm.categories.map((c) => (
              <Chip key={c.categorie} href={`/developpement?mode=gamme&type=${encodeURIComponent(c.categorie)}`} actif={typeFiltre?.toLowerCase() === c.categorie.toLowerCase()}>
                {c.categorie} ({c.vous}/{c.marche})
              </Chip>
            ))}
          </div>

          <div className="card" style={{ overflow: "hidden", marginBottom: 24 }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th scope="col">Matière active</th>
                  <th scope="col">Type</th>
                  <th scope="col" style={{ textAlign: "right" }}>Marché</th>
                  <th scope="col" style={{ textAlign: "right" }}>Concurrents</th>
                  <th scope="col" style={{ textAlign: "right" }}>Usages neufs</th>
                  <th scope="col">Cultures</th>
                  <th scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                {manquesFiltres.slice(0, 50).map((m) => (
                  <tr key={m.molecule}>
                    <td style={{ fontWeight: 500 }}>
                      <LienMatiere nom={m.molecule} />
                      {m.anses && (
                        <span style={{ color: TON_ANSES[m.anses.statut] ?? "var(--muted-2)", fontSize: 10 }}> ●</span>
                      )}
                    </td>
                    <td style={{ fontSize: 12, color: "var(--muted)" }}>{m.categorie}</td>
                    <td className="mono" style={{ textAlign: "right", fontWeight: 600 }}>{m.nbProduits} prod.</td>
                    <td className="mono" style={{ textAlign: "right", color: "var(--muted)" }}>{m.nbDetenteurs}</td>
                    <td className="mono" style={{ textAlign: "right", color: "var(--accent)", fontWeight: 600 }}>
                      +{m.usagesNeufs.length}
                    </td>
                    <td style={{ fontSize: 11.5, color: "var(--muted)", maxWidth: 210 }}>
                      {m.cultures.slice(0, 3).join(" · ")}
                      {m.cultures.length > 3 && <span className="mono"> +{m.cultures.length - 3}</span>}
                    </td>
                    <td>
                      <Link href={`/sourcing/${m.id}`} className="link-accent" style={{ fontSize: 12 }}>
                        Sourcer →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── MODE 3 : MÉLANGES & ASSOCIATIONS ── */}
      {mode === "melanges" && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
              gap: 14,
              marginBottom: 20,
            }}
          >
            <StatCard label="Prêtes à déposer" value={String(STATS_MELANGES.nbPretes)} tone="low" sub="composants 100% au Maroc" />
            <StatCard label="Pistes Corée" value={String(STATS_MELANGES.nbPistes)} tone="high" sub="associations identifiées" />
            <StatCard label="Associations au Maroc" value={String(STATS_MELANGES.nbAssociations)} sub="déjà homologuées ONSSA" />
            <StatCard label="Détenues par vous" value={String(tenues.tenues.length)} sub="au catalogue actif" />
          </div>

          <h2 style={{ fontSize: 16, fontFamily: "var(--tete)", margin: "20px 0 10px" }}>
            Formulations prêtes à déposer (Miroir Corée → Maroc)
          </h2>
          <div className="card" style={{ overflow: "hidden", marginBottom: 24 }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th scope="col">Association</th>
                  <th scope="col" style={{ textAlign: "right" }}>Homologations Corée</th>
                  <th scope="col" style={{ textAlign: "right" }}>Sociétés</th>
                  <th scope="col">Dernière</th>
                  <th scope="col">Usages types</th>
                </tr>
              </thead>
              <tbody>
                {PISTES_PRETES.slice(0, 25).map((p) => (
                  <tr key={p.cle}>
                    <td>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                        {p.composantsSitues.map((c, i) => (
                          <span key={c.iso} style={{ fontSize: 12.5 }}>
                            {i > 0 && <span style={{ color: "var(--muted-2)" }}>+ </span>}
                            {c.auMaroc ? <LienMatiere nom={c.auMaroc} /> : <span style={{ color: "var(--high)" }}>{c.iso}</span>}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="mono" style={{ textAlign: "right", fontWeight: 600 }}>{p.nbHomologations}</td>
                    <td className="mono" style={{ textAlign: "right", color: "var(--muted)" }}>{p.nbSocietes}</td>
                    <td className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>{p.derniere ?? "—"}</td>
                    <td style={{ fontSize: 11.5, color: "var(--muted)", maxWidth: 220 }}>
                      {p.usages.slice(0, 2).map(usageFr).join(" · ") || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── MODE 4 : SENTINELLE EXCLUSIVITÉS ── */}
      {mode === "sentinelle" && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
              gap: 14,
              marginBottom: 20,
            }}
          >
            <StatCard label="À saisir" value={String(STATS_SENTINELLE.nbASaisir)} tone="low" sub="usines déclarées + France OK" />
            <StatCard label="À vérifier" value={String(STATS_SENTINELLE.nbAVerifier)} tone="high" sub="génériques sans AMM France" />
            <StatCard label="Le piège (écartés)" value={String(STATS_SENTINELLE.nbAEcarter)} tone="crit" sub="retirées en France" />
            <StatCard label="Lancements récents" value={String(STATS_SENTINELLE.nbASurveiller)} sub="brevets majors à surveiller" />
          </div>

          <h2 style={{ fontSize: 16, fontFamily: "var(--tete)", margin: "20px 0 10px" }}>
            Matières candidates à une première homologation exclusive
          </h2>
          <div className="card" style={{ overflow: "hidden", marginBottom: 24 }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th scope="col">Matière candidate</th>
                  <th scope="col">Groupe chimique</th>
                  <th scope="col" style={{ textAlign: "right" }}>Génériqueurs</th>
                  <th scope="col">Pays fabricants</th>
                  <th scope="col" style={{ textAlign: "right" }}>Teneur max</th>
                  <th scope="col">Entrée Corée</th>
                  <th scope="col">Statut France</th>
                </tr>
              </thead>
              <tbody>
                {A_SAISIR.slice(0, 30).map((c) => (
                  <tr key={c.libelle}>
                    <td style={{ fontWeight: 500 }}>
                      <LienMatiere nom={c.libelle} />
                      {c.nouvelle && <span className="badge">nouvelle</span>}
                    </td>
                    <td style={{ fontSize: 12, color: "var(--muted)" }}>{c.groupeChimique ?? "—"}</td>
                    <td className="mono" style={{ textAlign: "right", color: "var(--accent)", fontWeight: 600 }}>
                      {c.nbGeneriques}
                    </td>
                    <td style={{ fontSize: 12, color: "var(--muted)" }}>{c.paysGeneriques.join(" · ") || "—"}</td>
                    <td className="mono" style={{ textAlign: "right", fontSize: 12 }}>
                      {c.teneurMax ? `${c.teneurMax} g/kg` : "—"}
                    </td>
                    <td className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>{c.entreeCoree ?? "—"}</td>
                    <td>
                      <span
                        className="pill"
                        style={{
                          fontSize: 10,
                          color: TON_FEU[c.feu],
                          borderColor: `color-mix(in srgb, ${TON_FEU[c.feu]} 38%, transparent)`,
                        }}
                      >
                        {c.france ? `France · ${c.france.nbProduitsAutorises} prod.` : "France · inconnue"}
                      </span>
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
