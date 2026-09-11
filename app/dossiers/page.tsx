import Link from "next/link";
import { detenteurActuel } from "@/lib/detenteur";
import { ammEcheance, ammExpirees, fmtDate, portefeuilleClasse } from "@/lib/logic";
import { candidats } from "@/lib/sourcing";
import { DELAIS_INDICATIFS } from "@/lib/dossier";
import { alternatives } from "@/lib/substitution";

type File = "renouveler" | "substituer" | "homologuer";

const LIBELLE: Record<File, string> = {
  renouveler: "Renouveler",
  substituer: "Substituer",
  homologuer: "Homologuer",
};

export default async function DossiersPage({
  searchParams,
}: {
  searchParams: Promise<{ file?: string }>;
}) {
  const sp = await searchParams;
  const file = (["renouveler", "substituer", "homologuer"] as File[]).find((f) => f === sp.file);

  const d = await detenteurActuel();
  const expirees = ammExpirees(d.id);
  const proches = ammEcheance(d.id, 18);
  const aSubstituer = portefeuilleClasse(d.id).filter((c) => (c.risque?.score ?? 0) >= 55);
  const opportunites = candidats({ maxDetenteurs: 2, detenteurId: d.id }).slice(0, 8);

  type Ligne = {
    key: string;
    file: File;
    titre: string;
    detail: string;
    href: string;
    rang: number;
    etiq: string;
    couleur: string;
  };

  const lignes: Ligne[] = [];

  for (const p of expirees) {
    lignes.push({
      key: `exp-${p.id}`,
      file: "renouveler",
      titre: p.nomCommercial,
      detail: `AMM ${p.amm ?? "—"} · ${p.usages.length} usage(s) · ${p.fournisseurs.join(", ")}`,
      href: `/dossiers/generer/${p.matieresActivesIds[0]}?type=renouvellement&produit=${encodeURIComponent(p.nomCommercial)}`,
      rang: 0,
      etiq: `expirée ${fmtDate(p.expiration)}`,
      couleur: "var(--crit)",
    });
  }
  for (const p of proches) {
    if (expirees.includes(p)) continue;
    lignes.push({
      key: `ech-${p.id}`,
      file: "renouveler",
      titre: p.nomCommercial,
      detail: `AMM ${p.amm ?? "—"} · ${p.usages.length} usage(s) · ${p.fournisseurs.join(", ")}`,
      href: `/dossiers/generer/${p.matieresActivesIds[0]}?type=renouvellement&produit=${encodeURIComponent(p.nomCommercial)}`,
      rang: 1,
      etiq: `échéance ${fmtDate(p.expiration)}`,
      couleur: "var(--mod)",
    });
  }
  for (const { ma, risque, expo } of aSubstituer) {
    const alts = alternatives(ma.id, 2);
    lignes.push({
      key: `sub-${ma.id}`,
      file: "substituer",
      titre: ma.nom,
      detail:
        `${expo.produits} produit(s) · ${expo.usages} usage(s)` +
        (alts.length ? ` · remplacer : ${alts.map((a) => a.molecule).join(", ")}` : ""),
      href: `/dossiers/generer/${ma.id}?origine=substitution`,
      rang: 2 + (100 - (risque?.score ?? 55)) / 1000,
      etiq: risque ? `risque ${risque.score}` : "risque",
      couleur: (risque?.score ?? 0) >= 70 ? "var(--crit)" : "var(--high)",
    });
  }
  for (const c of opportunites) {
    lignes.push({
      key: `hom-${c.id}`,
      file: "homologuer",
      titre: c.nom,
      detail: `${c.nbUsages} usages · ${c.nbDetenteurs} détenteur(s) · ${c.paysSourcing.join(", ")}`,
      href: `/dossiers/generer/${c.id}?origine=prospection`,
      rang: 4 + (100 - c.score) / 1000,
      etiq: `score ${c.score}`,
      couleur: "var(--accent)",
    });
  }

  lignes.sort((a, b) => a.rang - b.rang);
  const vue = file ? lignes.filter((l) => l.file === file) : lignes;
  const n = (f: File) => lignes.filter((l) => l.file === f).length;

  const pill = (href: string, actif: boolean, label: string, count: number) => (
    <Link
      href={href}
      className="pill"
      style={{
        fontWeight: actif ? 600 : 500,
        color: actif ? "var(--accent)" : "var(--muted)",
        borderColor: actif ? "color-mix(in srgb, var(--accent) 45%, transparent)" : "var(--border-strong)",
        background: actif ? "var(--accent-fond)" : "transparent",
      }}
    >
      {label} <span className="mono" style={{ opacity: 0.7 }}>{count}</span>
    </Link>
  );

  return (
    <>
      <div className="fil">Étape 3 — dossier</div>
      <h1>À traiter</h1>
      <p className="chapeau">
        Une file, triée par urgence. Chaque ligne ouvre un dossier ONSSA 3-B pré-rempli.
        Délais indicatifs : renouvellement {DELAIS_INDICATIFS.renouvellement} · nouvelle
        homologation {DELAIS_INDICATIFS.nouvelle_homologation}.
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "8px 0 16px" }}>
        {pill("/dossiers", !file, "Tout", lignes.length)}
        {pill("/dossiers?file=renouveler", file === "renouveler", "Renouveler", n("renouveler"))}
        {pill("/dossiers?file=substituer", file === "substituer", "Substituer", n("substituer"))}
        {pill("/dossiers?file=homologuer", file === "homologuer", "Homologuer", n("homologuer"))}
      </div>

      <div className="bloc">
        <div className="titre">
          <span>Dossiers</span>
          <span className="mono">{vue.length}</span>
        </div>
        <table className="tbl">
          <thead>
            <tr>
              <th>File</th>
              <th>Objet</th>
              <th>Urgence</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {vue.map((l) => (
              <tr key={l.key}>
                <td>
                  <span className="pill" style={{ fontSize: 10.5 }}>{LIBELLE[l.file]}</span>
                </td>
                <td>
                  <div style={{ fontWeight: 600 }}>{l.titre}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>{l.detail}</div>
                </td>
                <td>
                  <span className="mono" style={{ color: l.couleur, fontWeight: 600, fontSize: 12.5 }}>
                    {l.etiq}
                  </span>
                </td>
                <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                  <Link
                    href={l.href}
                    className="pill"
                    style={{
                      fontWeight: 600,
                      fontSize: 12,
                      color: "var(--accent-fg)",
                      background: "var(--accent)",
                      borderColor: "var(--accent)",
                    }}
                  >
                    Dossier 3-B
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {vue.length === 0 && (
          <p style={{ fontSize: 13, color: "var(--muted)", padding: "18px 0" }}>
            Rien à traiter dans cette file.
          </p>
        )}
      </div>
    </>
  );
}
