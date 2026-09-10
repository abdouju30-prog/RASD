import Link from "next/link";
import { TabNav } from "@/components/TabNav";
import { StatCard } from "@/components/StatCard";
import { RiskBadge } from "@/components/RiskBadge";
import { AlternativesCompactes } from "@/components/Alternatives";
import { alternatives } from "@/lib/substitution";
import { FOURNISSEURS, MATIERES, produitsDe } from "@/lib/data";
import { detenteurActuel } from "@/lib/detenteur";
import { statsSourcing, candidats } from "@/lib/sourcing";
import { ficheFournisseur } from "@/lib/packs-fournisseur";
import { PastillesPacks } from "@/components/PacksFournisseur";
import { PISTES_NOUVELLES, STATS_PISTES } from "@/lib/pistes";
import { STATS_ICAMA, USINES_CHINE } from "@/lib/icama";
import { STATS_BKU, USINES_TURQUES } from "@/lib/bku";
import { STATS_EPA, USINES_SOURCING } from "@/lib/epa";
import { PRODUCTEURS_RUSSES, STATS_RUSSIE } from "@/lib/russie";
import { resoudre } from "@/lib/requete";
import {
  CONTRAINTES,
  LIBELLE_OBJET,
  STATS_IMPORT,
  type Objet,
} from "@/lib/importation";
import { ammEcheance, ammExpirees, fmtDate, portefeuilleClasse } from "@/lib/logic";
import { DELAIS_INDICATIFS } from "@/lib/dossier";
import { RefreshCw, Replace, Sparkles, Lock, ShieldAlert, Clock, ArrowRight } from "lucide-react";
import type { Fournisseur } from "@/lib/types";

export const dynamic = "force-dynamic";

function matieresPar(): Map<string, { id: string; nom: string }[]> {
  const m = new Map<string, { id: string; nom: string }[]>();
  for (const ma of MATIERES) {
    for (const nom of ma.fournisseurs) {
      const l = m.get(nom) ?? [];
      l.push({ id: ma.id, nom: ma.nom });
      m.set(nom, l);
    }
  }
  return m;
}

function Chip({ href, actif, children }: { href: string; actif: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="pill"
      style={{
        fontWeight: 500,
        color: actif ? "var(--accent)" : "var(--muted)",
        borderColor: actif ? "color-mix(in srgb, var(--accent) 45%, transparent)" : "var(--border-strong)",
        background: actif ? "var(--accent-fond)" : "transparent",
      }}
    >
      {children}
    </Link>
  );
}

export default async function ExecutionPage({
  searchParams,
}: {
  searchParams: Promise<{ volet?: string; pays?: string; profil?: string; q?: string; objet?: string }>;
}) {
  const sp = await searchParams;
  const d = await detenteurActuel();
  const volet = sp.volet ?? "fournisseurs";

  // Data for Volet Dossiers
  const expirees = ammExpirees(d.id);
  const proches = ammEcheance(d.id, 18);
  const aRenouveler = [...expirees, ...proches];
  const aSubstituer = portefeuilleClasse(d.id).filter((c) => (c.risque?.score ?? 0) >= 55);
  const opportunites = candidats({ maxDetenteurs: 2, detenteurId: d.id }).slice(0, 4);

  // Data for Volet Fournisseurs
  const so = statsSourcing();
  const parMa = matieresPar();
  const cherche = (sp.q ?? "").trim().toLowerCase();
  const contient = (x: string) => x.toLowerCase().includes(cherche);
  const req = resoudre(sp.q);
  const surMatiere = req?.estMatiere ? req : null;
  const porteurs = new Set(surMatiere?.gisement.fournisseursOnssa ?? []);

  let listFournisseurs: Fournisseur[] = [...FOURNISSEURS];
  if (surMatiere) listFournisseurs = listFournisseurs.filter((f) => porteurs.has(f.nom));
  else if (cherche) listFournisseurs = listFournisseurs.filter((f) => contient(f.nom));
  if (sp.pays) listFournisseurs = listFournisseurs.filter((f) => f.pays === sp.pays);
  if (sp.profil === "generique") listFournisseurs = listFournisseurs.filter((f) => f.coutFaible);
  if (sp.profil === "multinationale") listFournisseurs = listFournisseurs.filter((f) => f.multinationale);
  if (sp.profil === "agrements") listFournisseurs = listFournisseurs.filter((f) => ficheFournisseur(f.id));
  listFournisseurs.sort((a, b) => b.nbLignesMaroc - a.nbLignesMaroc);

  // Data for Volet Importation
  const objet = (["produit", "matiere_active", "echantillon"] as Objet[]).find((o) => o === sp.objet);
  const listeContraintes = objet ? CONTRAINTES.filter((c) => c.objets.includes(objet)) : CONTRAINTES;
  const barrieres = listeContraintes.filter((c) => c.barriere);

  const tabs = [
    {
      id: "fournisseurs",
      label: "Usines & Fournisseurs",
      count: so.nbGeneriques,
      href: `/execution?volet=fournisseurs`,
      active: volet === "fournisseurs",
    },
    {
      id: "dossiers",
      label: "Atelier Dossiers (3-B)",
      count: aRenouveler.length + aSubstituer.length,
      href: `/execution?volet=dossiers`,
      active: volet === "dossiers",
    },
    {
      id: "importation",
      label: "Règles d'Importation",
      count: STATS_IMPORT.nbBarrieres,
      href: `/execution?volet=importation`,
      active: volet === "importation",
    },
  ];

  const qFournisseur = (o: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ volet: "fournisseurs", pays: sp.pays, profil: sp.profil, q: sp.q, ...o })) {
      if (v) p.set(k, v);
    }
    return `/execution?${p.toString()}`;
  };

  return (
    <>
      <div className="eyebrow">Section 4 · Sourcing & Exécution Réglementaire</div>
      <h1>
        {volet === "fournisseurs" && "Annuaire des usines & fabricants internationaux"}
        {volet === "dossiers" && "Atelier de montage de dossiers ONSSA"}
        {volet === "importation" && "Cadre légal & barrières à l'importation"}
      </h1>
      <p className="chapeau">
        {volet === "fournisseurs" && "Croisement des registres ONSSA (Maroc), EPA (USA), ICAMA (Chine), BKÜ (Turquie), Russie et Australie."}
        {volet === "dossiers" && "Génération automatique des dossiers Annexe 3-B : renouvellements d'AMM, substitutions de molécules menacées et nouvelles homologations."}
        {volet === "importation" && "Exigences formelles d'importation selon la Loi 42-95 : barrières infranchissables, obligations de contrôle et délais légaux."}
      </p>

      <TabNav tabs={tabs} />

      {/* ── VOLET 1 : FOURNISSEURS & USINES ── */}
      {volet === "fournisseurs" && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
              gap: 14,
              marginBottom: 20,
            }}
          >
            <StatCard label="Référencés ONSSA" value={String(FOURNISSEURS.length)} sub="sociétés avec AMM au Maroc" />
            <StatCard label="Fabricants génériques" value={String(so.nbGeneriques)} tone="low" sub="fournisseurs à bas coût" />
            <StatCard label="Usines Chine ICAMA" value={String(STATS_ICAMA.nbFabricants)} sub="licences officielles vérifiées" />
            <StatCard label="Usines Turquie BKÜ" value={String(STATS_BKU.nbImal)} sub="fabrication locale İMAL" />
          </div>

          <div className="card" style={{ padding: "14px 18px", marginBottom: 18, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "var(--muted)", marginRight: 4 }}>Profil :</span>
            <Chip href={qFournisseur({ profil: undefined })} actif={!sp.profil}>Tous</Chip>
            <Chip href={qFournisseur({ profil: "generique" })} actif={sp.profil === "generique"}>Génériques seuls</Chip>
            <Chip href={qFournisseur({ profil: "multinationale" })} actif={sp.profil === "multinationale"}>Multinationales</Chip>
            <Chip href={qFournisseur({ profil: "agrements" })} actif={sp.profil === "agrements"}>Avec agréments 3-B</Chip>
          </div>

          <div className="card" style={{ overflow: "hidden", marginBottom: 24 }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th scope="col">Fournisseur</th>
                  <th scope="col">Pays</th>
                  <th scope="col" style={{ textAlign: "right" }}>Réf. Maroc</th>
                  <th scope="col" style={{ textAlign: "right" }}>M.A. fournies</th>
                  <th scope="col">Matières actives principales</th>
                  <th scope="col">Dossier 3-B</th>
                </tr>
              </thead>
              <tbody>
                {listFournisseurs.slice(0, 40).map((f) => {
                  const maFournies = parMa.get(f.nom) ?? [];
                  const fiche = ficheFournisseur(f.id);
                  return (
                    <tr key={f.id}>
                      <td style={{ fontWeight: 500 }}>
                        <span style={{ color: "var(--fg)", fontSize: 13.5 }}>{f.nom}</span>
                        {f.coutFaible && (
                          <span className="pill" style={{ fontSize: 9.5, marginLeft: 7, color: "var(--low)" }}>
                            générique
                          </span>
                        )}
                      </td>
                      <td style={{ fontSize: 12, color: "var(--muted)" }}>{f.pays}</td>
                      <td className="mono" style={{ textAlign: "right", fontWeight: 600 }}>{f.nbLignesMaroc}</td>
                      <td className="mono" style={{ textAlign: "right" }}>{maFournies.length}</td>
                      <td style={{ fontSize: 12, color: "var(--muted)", maxWidth: 300 }}>
                        {maFournies.slice(0, 3).map((m) => m.nom).join(" · ")}
                        {maFournies.length > 3 && <span className="mono"> +{maFournies.length - 3}</span>}
                      </td>
                      <td>
                        {fiche ? (
                          <PastillesPacks packs={fiche.packs} />
                        ) : (
                          <span style={{ color: "var(--muted-2)", fontSize: 11.5 }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── VOLET 2 : ATELIER DOSSIERS ── */}
      {volet === "dossiers" && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
              gap: 14,
              marginBottom: 20,
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
              sub="cibles me-too prioritaires"
            />
            <StatCard
              label="Portefeuille"
              value={String(produitsDe(d.id).length)}
              sub="produits couverts par une AMM"
            />
          </div>

          <h2 style={{ fontSize: 16, fontFamily: "var(--tete)", margin: "24px 0 10px" }}>
            File 1 : Renouvellement d&apos;AMM ({aRenouveler.length})
          </h2>
          <div className="card" style={{ overflow: "hidden", marginBottom: 24 }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th scope="col">Produit</th>
                  <th scope="col">AMM</th>
                  <th scope="col">Expiration</th>
                  <th scope="col">Fournisseur</th>
                  <th scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                {aRenouveler.map((p) => {
                  const exp = expirees.includes(p);
                  return (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 500 }}>{p.nomCommercial}</td>
                      <td className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>{p.amm ?? "—"}</td>
                      <td>
                        <span className="mono" style={{ color: exp ? "var(--crit)" : "var(--mod)", fontWeight: 600 }}>
                          {exp ? "expirée le " : "échéance "} {fmtDate(p.expiration)}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: "var(--muted)" }}>{p.fournisseurs.join(", ")}</td>
                      <td>
                        <Link
                          href={`/dossiers/generer/${p.matieresActivesIds[0]}?type=renouvellement&produit=${encodeURIComponent(p.nomCommercial)}`}
                          className="link-accent"
                          style={{ fontSize: 12 }}
                        >
                          Générer dossier →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <h2 style={{ fontSize: 16, fontFamily: "var(--tete)", margin: "24px 0 10px" }}>
            File 2 : Substitution préventive ({aSubstituer.length})
          </h2>
          <div className="card" style={{ overflow: "hidden", marginBottom: 24 }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th scope="col">Matière active menacée</th>
                  <th scope="col">Risque</th>
                  <th scope="col">Alternatives recommandées</th>
                  <th scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                {aSubstituer.map(({ ma, risque }) => {
                  const alts = alternatives(ma.id, 3);
                  return (
                    <tr key={ma.id}>
                      <td style={{ fontWeight: 500 }}>
                        <Link href={`/matieres/${ma.id}`} className="link-accent">{ma.nom}</Link>
                      </td>
                      <td>{risque && <RiskBadge niveau={risque.niveau} score={risque.score} />}</td>
                      <td><AlternativesCompactes alts={alts} /></td>
                      <td>
                        <Link
                          href={`/dossiers/generer/${ma.id}?origine=substitution`}
                          className="link-accent"
                          style={{ fontSize: 12, color: "var(--crit)" }}
                        >
                          Monter dossier substitution →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── VOLET 3 : RÈGLES D'IMPORTATION ── */}
      {volet === "importation" && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
              gap: 14,
              marginBottom: 20,
            }}
          >
            <StatCard label="Barrières strictes" value={String(STATS_IMPORT.nbBarrieres)} tone="crit" sub="interdiction sans conformité" />
            <StatCard label="Obligations dossier" value={String(STATS_IMPORT.nbContraintes - STATS_IMPORT.nbBarrieres)} sub="pièces à fournir obligatoires" />
            <StatCard label="Délais légaux" value={String(STATS_IMPORT.nbDelais)} sub="délais d'analyse et recours" />
            <StatCard label="Base légale" value="Loi 42-95" tone="low" sub="textes réglementaires ONSSA" />
          </div>

          <div className="card" style={{ padding: "16px 20px", marginBottom: 24 }}>
            <div className="h-title" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <Lock size={15} color="var(--crit)" /> Barrières légales infranchissables
            </div>
            <table className="tbl">
              <thead>
                <tr>
                  <th scope="col">Règle d&apos;importation</th>
                  <th scope="col">Porte sur</th>
                  <th scope="col">Base légale</th>
                </tr>
              </thead>
              <tbody>
                {barrieres.map((b) => (
                  <tr key={b.regle}>
                    <td style={{ fontWeight: 500 }}>
                      {b.regle}
                      {b.consequence && (
                        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>
                          {b.consequence}
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 4 }}>
                        {b.objets.map((o) => (
                          <span key={o} className="pill" style={{ fontSize: 10 }}>{LIBELLE_OBJET[o]}</span>
                        ))}
                      </div>
                    </td>
                    <td className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>{b.article}</td>
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
