import Link from "next/link";
import { Download, Mail, ExternalLink, Sparkles, Building2, FlaskConical, Sprout, Bug, ShieldAlert, CheckCircle2 } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import nouveautesJson from "@/data/nouveautes.json";

export const dynamic = "force-dynamic";

const ICONE_CAT = {
  produit: FlaskConical,
  societe: Building2,
  usage: Sprout,
  nuisible: Bug,
  retrait: ShieldAlert,
};

const COULEUR_CAT = {
  produit: "var(--accent)",
  societe: "var(--info)",
  usage: "var(--low)",
  nuisible: "var(--mod)",
  retrait: "var(--crit)",
};

const LIBELLE_CAT = {
  produit: "Produit & AMM",
  societe: "Société & Revendeur",
  usage: "Culture & Usage",
  nuisible: "Organisme nuisible",
  retrait: "Expiration / Retrait",
};

export default async function NouveautesPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>;
}) {
  const sp = await searchParams;
  const filtreCat = sp.cat;

  const meta = nouveautesJson.meta;
  const stats = nouveautesJson.statistiques;
  const evenements = nouveautesJson.evenements;

  const listeFiltree = filtreCat
    ? evenements.filter((e) => e.categorie === filtreCat)
    : evenements;

  return (
    <>
      <div className="eyebrow">Section Veille · Relevé officiel ONSSA</div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1>Journal des Nouveautés & Mises à Jour</h1>
          <p className="chapeau" style={{ maxWidth: 800 }}>
            Surveillance en temps réel des produits phytopharmaceutiques, cultures, revendeurs agréés, détenteurs, organismes nuisibles et usages depuis l&apos;index officiel{" "}
            <a
              href="https://eservice.onssa.gov.ma/IndPesticide.aspx"
              target="_blank"
              rel="noopener noreferrer"
              className="link-accent"
              style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
            >
              eservice.onssa.gov.ma/IndPesticide.aspx <ExternalLink size={12} />
            </a>.
          </p>
        </div>

        {/* Barre d'action Rapport PDF */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
          <a
            href="/api/rapport-pdf"
            className="pill"
            style={{
              background: "var(--accent)",
              color: "#fff",
              borderColor: "var(--accent)",
              fontWeight: 600,
              padding: "10px 18px",
              fontSize: 13,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              boxShadow: "var(--ombre-2)",
            }}
            download
          >
            <Download size={16} /> Télécharger le rapport hebdomadaire PDF
          </a>
          <span
            style={{
              fontSize: 11.5,
              color: "var(--muted)",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Mail size={13} color="var(--accent)" /> Envoyé chaque lundi à <strong>{meta.emailDestinataire}</strong>
          </span>
        </div>
      </div>

      {/* Cartes de statistiques clés */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
          gap: 14,
          margin: "24px 0 20px",
        }}
      >
        <StatCard
          label="Nouveaux Produits"
          value={String(stats.nbNouveauxProduits)}
          tone="low"
          sub="homologations détectées"
        />
        <StatCard
          label="Revendeurs & Sociétés"
          value={String(stats.nbNouvellesSocietes)}
          tone="default"
          sub="agréments officiels ONSSA"
        />
        <StatCard
          label="Cultures & Usages"
          value={String(stats.nbNouveauxUsages)}
          sub="couples bioagresseurs suivis"
        />
        <StatCard
          label="Homologations Expirées"
          value={String(stats.nbRetraitsExpires)}
          tone="crit"
          sub="marchés vacants / me-too"
        />
        <StatCard
          label="Index National"
          value={String(stats.totalProduitsEnLigne)}
          sub="produits au catalogue ONSSA"
        />
      </div>

      {/* Filtres par thématique */}
      <div className="card" style={{ padding: "12px 16px", marginBottom: 20, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: 12, color: "var(--muted)", marginRight: 6 }}>Filtrer par thématique :</span>
        <Link
          href="/nouveautes"
          className="pill"
          style={{
            fontWeight: !filtreCat ? 600 : 400,
            background: !filtreCat ? "var(--accent-fond)" : "transparent",
            color: !filtreCat ? "var(--accent)" : "var(--muted)",
            borderColor: !filtreCat ? "var(--accent)" : "var(--border-strong)",
          }}
        >
          Tous ({evenements.length})
        </Link>
        <Link
          href="/nouveautes?cat=produit"
          className="pill"
          style={{
            fontWeight: filtreCat === "produit" ? 600 : 400,
            background: filtreCat === "produit" ? "color-mix(in srgb, var(--accent) 15%, transparent)" : "transparent",
            color: filtreCat === "produit" ? "var(--accent)" : "var(--muted)",
            borderColor: filtreCat === "produit" ? "var(--accent)" : "var(--border-strong)",
          }}
        >
          🧪 Nouveaux Produits ({stats.nbNouveauxProduits})
        </Link>
        <Link
          href="/nouveautes?cat=societe"
          className="pill"
          style={{
            fontWeight: filtreCat === "societe" ? 600 : 400,
            background: filtreCat === "societe" ? "color-mix(in srgb, var(--info) 15%, transparent)" : "transparent",
            color: filtreCat === "societe" ? "var(--info)" : "var(--muted)",
            borderColor: filtreCat === "societe" ? "var(--info)" : "var(--border-strong)",
          }}
        >
          🏢 Sociétés & Revendeurs ({stats.nbNouvellesSocietes})
        </Link>
        <Link
          href="/nouveautes?cat=usage"
          className="pill"
          style={{
            fontWeight: filtreCat === "usage" ? 600 : 400,
            background: filtreCat === "usage" ? "color-mix(in srgb, var(--low) 15%, transparent)" : "transparent",
            color: filtreCat === "usage" ? "var(--low)" : "var(--muted)",
            borderColor: filtreCat === "usage" ? "var(--low)" : "var(--border-strong)",
          }}
        >
          🌾 Cultures & Usages ({stats.nbNouveauxUsages})
        </Link>
        <Link
          href="/nouveautes?cat=retrait"
          className="pill"
          style={{
            fontWeight: filtreCat === "retrait" ? 600 : 400,
            background: filtreCat === "retrait" ? "color-mix(in srgb, var(--crit) 15%, transparent)" : "transparent",
            color: filtreCat === "retrait" ? "var(--crit)" : "var(--muted)",
            borderColor: filtreCat === "retrait" ? "var(--crit)" : "var(--border-strong)",
          }}
        >
          ⚠️ Expirations & Retraits ({stats.nbRetraitsExpires})
        </Link>
      </div>

      {/* Flux d'événements détaillé */}
      <div style={{ display: "grid", gap: 12 }}>
        {listeFiltree.map((e) => {
          const Icon = ICONE_CAT[e.categorie as keyof typeof ICONE_CAT] ?? Sparkles;
          const color = COULEUR_CAT[e.categorie as keyof typeof COULEUR_CAT] ?? "var(--accent)";
          const libelle = LIBELLE_CAT[e.categorie as keyof typeof LIBELLE_CAT] ?? e.categorie;

          return (
            <div
              key={e.id}
              className="card"
              style={{
                padding: "16px 20px",
                borderLeft: `3px solid ${color}`,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Icon size={16} color={color} aria-hidden="true" />
                  <span className="mono" style={{ fontSize: 11, color, letterSpacing: "0.04em", textTransform: "uppercase", fontWeight: 600 }}>
                    {libelle}
                  </span>
                  <span className="mono" style={{ fontSize: 11, color: "var(--muted-2)" }}>
                    · {e.date}
                  </span>
                </div>

                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {e.tags.map((tag: string) => (
                    <span key={tag} className="pill" style={{ fontSize: 10 }}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: 8 }}>
                <div style={{ fontWeight: 600, fontSize: 14.5 }}>{e.titre}</div>
                <p style={{ color: "var(--muted)", margin: "6px 0 0", lineHeight: 1.55 }}>
                  {e.description}
                </p>
              </div>

              {/* Détails spécifiques si disponibles */}
              {e.details && (
                <div
                  style={{
                    display: "flex",
                    gap: 16,
                    flexWrap: "wrap",
                    fontSize: 12,
                    color: "var(--muted)",
                    marginTop: 12,
                    paddingTop: 10,
                    borderTop: "1px solid var(--border)",
                  }}
                >
                  {e.details.agrement && (
                    <span>
                      N° Agrément : <strong style={{ color: "var(--fg)" }}>{e.details.agrement}</strong>
                    </span>
                  )}
                  {e.details.siege && (
                    <span>
                      Siège : <strong style={{ color: "var(--fg)" }}>{e.details.siege}</strong>
                    </span>
                  )}
                  {e.details.ingenieur && (
                    <span>
                      Ingénieur : <strong style={{ color: "var(--fg)" }}>{e.details.ingenieur}</strong>
                    </span>
                  )}
                  {e.details.culture && (
                    <span>
                      Culture : <strong style={{ color: "var(--fg)" }}>{e.details.culture}</strong>
                    </span>
                  )}
                  {e.details.nuisible && (
                    <span>
                      Cible : <strong style={{ color: "var(--fg)" }}>{e.details.nuisible}</strong>
                    </span>
                  )}
                  {e.details.expiration && (
                    <span className="mono" style={{ color: "var(--crit)" }}>
                      Échéance légale : <strong>{e.details.expiration}</strong>
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
