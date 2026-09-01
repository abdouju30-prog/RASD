import Link from "next/link";
import { RefreshCw, Replace, Sparkles, ArrowRight } from "lucide-react";
import { RiskBadge } from "@/components/RiskBadge";
import { StatCard } from "@/components/StatCard";
import { PORTEFEUILLE } from "@/lib/data";
import { ammEcheance, ammExpirees, fmtDate, portefeuilleClasse } from "@/lib/logic";
import { candidats } from "@/lib/sourcing";
import { DELAIS_INDICATIFS } from "@/lib/dossier";

export default function DossiersPage() {
  const expirees = ammExpirees();
  const proches = ammEcheance(18);
  const aRenouveler = [...expirees, ...proches];

  const aSubstituer = portefeuilleClasse().filter((c) => (c.risque?.score ?? 0) >= 55);

  const opportunites = candidats({ maxDetenteurs: 2 }).slice(0, 4);

  return (
    <>
      <div className="eyebrow">Usine à dossiers</div>
      <h1 style={{ fontSize: 30, fontWeight: 700, margin: "10px 0 8px" }}>Atelier dossiers</h1>
      <p style={{ color: "var(--muted)", maxWidth: 720, lineHeight: 1.6, marginTop: 0 }}>
        Trois files, toutes déduites des données : renouveler ce qui expire, substituer ce qui est
        menacé, homologuer ce qui rapporte. Chaque ligne génère un dossier ONSSA pré-rempli.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
          gap: 14,
          margin: "22px 0 26px",
        }}
      >
        <StatCard
          label="À renouveler"
          value={String(aRenouveler.length)}
          tone={expirees.length ? "crit" : "mod"}
          sub={`dont ${expirees.length} déjà expirée(s)`}
        />
        <StatCard
          label="À substituer"
          value={String(aSubstituer.length)}
          tone={aSubstituer.length ? "high" : "low"}
          sub="matières actives en risque ≥ 55"
        />
        <StatCard
          label="À homologuer"
          value={String(opportunites.length)}
          tone="low"
          sub="cibles de prospection prioritaires"
        />
        <StatCard
          label="Portefeuille"
          value={String(PORTEFEUILLE.length)}
          sub="produits couverts par une AMM"
        />
      </div>

      <File
        titre="Renouvellement"
        icone={<RefreshCw size={15} color="var(--crit)" />}
        delai={DELAIS_INDICATIFS.renouvellement}
        vide="Aucune AMM à échéance dans les 18 mois."
      >
        {aRenouveler.map((p) => {
          const exp = expirees.includes(p);
          return (
            <Ligne
              key={p.id}
              href={`/dossiers/generer/${p.matieresActivesIds[0]}?type=renouvellement&produit=${encodeURIComponent(
                p.nomCommercial
              )}`}
              titre={p.nomCommercial}
              sous={`AMM ${p.amm ?? "—"} · ${p.usages.length} usage(s) · ${p.fournisseurs.join(", ")}`}
              droite={
                <span
                  className="mono"
                  style={{ color: exp ? "var(--crit)" : "var(--mod)", fontSize: 13, fontWeight: 600 }}
                >
                  {exp ? "expirée le " : "échéance "}
                  {fmtDate(p.expiration)}
                </span>
              }
            />
          );
        })}
      </File>

      <File
        titre="Substitution"
        icone={<Replace size={15} color="var(--high)" />}
        delai={DELAIS_INDICATIFS.nouvelle_homologation}
        vide="Aucune matière active du portefeuille en risque élevé."
      >
        {aSubstituer.map(({ ma, risque, expo }) => (
          <Ligne
            key={ma.id}
            href={`/dossiers/generer/${ma.id}?origine=substitution`}
            titre={ma.nom}
            sous={`${expo.produits} produit(s) · ${expo.usages} usage(s) · ${
              ma.fiche?.statutUE.replace(/_/g, " ") ?? "statut inconnu"
            }`}
            droite={risque ? <RiskBadge niveau={risque.niveau} score={risque.score} /> : null}
          />
        ))}
      </File>

      <File
        titre="Nouvelle homologation — prospection"
        icone={<Sparkles size={15} color="var(--accent)" />}
        delai={DELAIS_INDICATIFS.nouvelle_homologation}
        vide="Aucune cible."
        lien={{ href: "/sourcing", label: "Voir toutes les cibles" }}
      >
        {opportunites.map((c) => (
          <Ligne
            key={c.id}
            href={`/dossiers/generer/${c.id}?origine=prospection`}
            titre={c.nom}
            sous={`${c.nbUsages} usages · ${c.nbDetenteurs} détenteur(s) · sourçable ${c.paysSourcing.join(
              ", "
            )}`}
            droite={
              <span className="mono" style={{ color: "var(--accent)", fontWeight: 600 }}>
                score {c.score}
              </span>
            }
          />
        ))}
      </File>
    </>
  );
}

function File({
  titre,
  icone,
  delai,
  vide,
  lien,
  children,
}: {
  titre: string;
  icone: React.ReactNode;
  delai: string;
  vide: string;
  lien?: { href: string; label: string };
  children: React.ReactNode;
}) {
  const vides = !children || (Array.isArray(children) && children.length === 0);
  return (
    <div className="card" style={{ padding: "18px 20px", marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
        <div className="h-title" style={{ display: "flex", alignItems: "center", gap: 9 }}>
          {icone} {titre}
        </div>
        {lien && (
          <Link href={lien.href} className="link-accent" style={{ fontSize: 12.5 }}>
            {lien.label} <ArrowRight size={12} style={{ display: "inline", verticalAlign: -1 }} />
          </Link>
        )}
      </div>
      <div style={{ fontSize: 11.5, color: "var(--muted-2)", marginTop: 6 }}>
        Instruction ONSSA — ordre de grandeur : {delai}
      </div>
      <div style={{ display: "grid", gap: 9, marginTop: 14 }}>
        {vides ? (
          <div style={{ fontSize: 13, color: "var(--muted)" }}>{vide}</div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

function Ligne({
  href,
  titre,
  sous,
  droite,
}: {
  href: string;
  titre: string;
  sous: string;
  droite: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="card"
      style={{
        padding: "13px 15px",
        background: "var(--card-2)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{titre}</div>
        <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 4 }}>{sous}</div>
      </div>
      <div style={{ flexShrink: 0 }}>{droite}</div>
    </Link>
  );
}
