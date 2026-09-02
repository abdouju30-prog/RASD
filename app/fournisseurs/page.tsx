import Link from "next/link";
import { Info } from "lucide-react";
import { FOURNISSEURS, MATIERES } from "@/lib/data";
import { PAYS_CIBLES, statsSourcing } from "@/lib/sourcing";
import { ficheFournisseur } from "@/lib/packs-fournisseur";
import { PastillesPacks } from "@/components/PacksFournisseur";
import type { Fournisseur } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Matières actives fournies par chaque société, d'après l'index ONSSA. */
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

export default async function FournisseursPage({
  searchParams,
}: {
  searchParams: Promise<{ pays?: string; profil?: string }>;
}) {
  const sp = await searchParams;
  const so = statsSourcing();
  const parMa = matieresPar();

  let list: Fournisseur[] = [...FOURNISSEURS];
  if (sp.pays) list = list.filter((f) => f.pays === sp.pays);
  if (sp.profil === "generique") list = list.filter((f) => f.coutFaible);
  if (sp.profil === "multinationale") list = list.filter((f) => f.multinationale);
  if (sp.profil === "agrements") list = list.filter((f) => ficheFournisseur(f.id));
  list.sort((a, b) => b.nbLignesMaroc - a.nbLignesMaroc);

  const q = (o: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ pays: sp.pays, profil: sp.profil, ...o })) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/fournisseurs?${s}` : "/fournisseurs";
  };

  const nbFiches = FOURNISSEURS.filter((f) => ficheFournisseur(f.id)).length;

  return (
    <>
      <div className="fil">Étape 5 — fournisseur</div>
      <h1>Qui peut porter le dossier</h1>
      <p style={{ color: "var(--muted)", maxWidth: "88ch", lineHeight: 1.55, margin: "0 0 16px" }}>
        Les {FOURNISSEURS.length} sociétés référencées à l&apos;index ONSSA. Un fournisseur ne se
        choisit pas que sur le pays : il doit détenir les études qui remplissent l&apos;Annexe 3-B.
        La colonne « agréments » dit ce qu&apos;il déclare avoir.
      </p>

      <div className="strip" style={{ marginBottom: 14 }}>
        <div>
          <span className="eyebrow">Référencés ONSSA</span>
          <strong className="mono" style={{ fontSize: 17, fontWeight: 600 }}>{FOURNISSEURS.length}</strong>
        </div>
        <div>
          <span className="eyebrow">Génériques</span>
          <strong className="mono" style={{ fontSize: 17, fontWeight: 600, color: "var(--accent)" }}>
            {so.nbGeneriques}
          </strong>
        </div>
        <div>
          <span className="eyebrow">Pays de sourcing</span>
          <strong className="mono" style={{ fontSize: 17, fontWeight: 600 }}>{so.parPays.length}</strong>
        </div>
        <div>
          <span className="eyebrow">Agréments renseignés</span>
          <strong
            className="mono"
            style={{ fontSize: 17, fontWeight: 600, color: nbFiches ? "var(--low)" : "var(--mod)" }}
          >
            {nbFiches}
          </strong>
        </div>
        <div>
          <span className="eyebrow">Pays non inféré</span>
          <strong className="mono" style={{ fontSize: 17, fontWeight: 600, color: "var(--mod)" }}>
            {so.nbPaysInconnus}
          </strong>
        </div>
      </div>

      <div className="card" style={{ padding: "12px 15px", marginBottom: 14 }}>
        <div className="eyebrow" style={{ marginBottom: 8 }}>Pays</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
          <Chip href={q({ pays: undefined })} actif={!sp.pays}>Tous</Chip>
          {so.parPays.map(([p, n]) => (
            <Chip key={p} href={q({ pays: p })} actif={sp.pays === p}>
              {p} <span className="mono" style={{ opacity: 0.65 }}>{n}</span>
            </Chip>
          ))}
        </div>
        <div className="eyebrow" style={{ marginBottom: 8 }}>Profil</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          <Chip href={q({ profil: undefined })} actif={!sp.profil}>Tous</Chip>
          <Chip href={q({ profil: "generique" })} actif={sp.profil === "generique"}>Générique</Chip>
          <Chip href={q({ profil: "multinationale" })} actif={sp.profil === "multinationale"}>Multinationale</Chip>
          <Chip href={q({ profil: "agrements" })} actif={sp.profil === "agrements"}>Agréments renseignés</Chip>
        </div>
      </div>

      <div className="card" style={{ padding: "11px 15px", marginBottom: 14, display: "flex", gap: 10 }}>
        <Info size={15} color="var(--info)" style={{ flexShrink: 0, marginTop: 1 }} />
        <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.55 }}>
          Le pays est <strong>inféré</strong> du nom de la société ; « ? » signale une déduction faite
          sur le seul suffixe juridique. Les agréments sont <strong>déclaratifs</strong> — ce que le
          fournisseur affirme détenir, à saisir dans{" "}
          <span className="mono">data/fournisseurs-packs.json</span> avec sa source. Ni l&apos;un ni
          l&apos;autre ne remplace une vérification avant engagement.
        </div>
      </div>

      <div className="grille">
        <div className="bloc">
          <div className="titre">
            <span>Fournisseurs</span>
            <span className="mono">{list.length}</span>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th>Fournisseur</th>
                <th>Pays</th>
                <th>Profil</th>
                <th style={{ textAlign: "right" }}>Réf. Maroc</th>
                <th style={{ textAlign: "right" }}>M.A.</th>
                <th>Matières actives fournies</th>
                <th>Agréments déclarés</th>
              </tr>
            </thead>
            <tbody>
              {list.slice(0, 80).map((f) => {
                const mas = parMa.get(f.nom) ?? [];
                return (
                  <tr key={f.id}>
                    <td style={{ fontWeight: 500 }}>{f.nom}</td>
                    <td style={{ color: "var(--muted)" }}>
                      {f.pays ?? "à préciser"}
                      {f.pays && !f.paysFiable && (
                        <span style={{ color: "var(--mod)", fontSize: 11 }}> ?</span>
                      )}
                    </td>
                    <td>
                      {f.coutFaible ? (
                        <span
                          className="pill"
                          style={{
                            fontSize: 10,
                            color: "var(--accent)",
                            borderColor: "color-mix(in srgb, var(--accent) 40%, transparent)",
                            background: "var(--accent-fond)",
                          }}
                        >
                          générique
                        </span>
                      ) : f.multinationale ? (
                        <span className="pill" style={{ fontSize: 10 }}>multinationale</span>
                      ) : (
                        <span className="pill" style={{ fontSize: 10 }}>autre</span>
                      )}
                    </td>
                    <td className="mono" style={{ textAlign: "right" }}>{f.nbLignesMaroc}</td>
                    <td className="mono" style={{ textAlign: "right" }}>{f.nbMatieresActives}</td>
                    <td style={{ fontSize: 11.5, color: "var(--muted)", maxWidth: 320 }}>
                      {mas.slice(0, 3).map((m, i) => (
                        <span key={m.id}>
                          {i > 0 && " · "}
                          <Link href={`/sourcing/${m.id}`} className="link-accent" style={{ fontWeight: 500 }}>
                            {m.nom}
                          </Link>
                        </span>
                      ))}
                      {mas.length > 3 && (
                        <span className="mono" style={{ color: "var(--muted-2)" }}> +{mas.length - 3}</span>
                      )}
                      {mas.length === 0 && <span style={{ color: "var(--muted-2)" }}>—</span>}
                    </td>
                    <td>
                      <PastillesPacks packs={ficheFournisseur(f.id)?.packs ?? []} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {list.length > 80 && (
            <p style={{ fontSize: 11.5, color: "var(--muted-2)", marginTop: 10 }}>
              {list.length - 80} autres au-delà des 80 premiers — affinez les filtres.
            </p>
          )}
          {list.length === 0 && (
            <p style={{ fontSize: 13, color: "var(--muted)", padding: "20px 0" }}>
              Aucun fournisseur ne correspond à ces filtres.
            </p>
          )}
        </div>
      </div>

      <p style={{ fontSize: 11, color: "var(--muted-2)", marginTop: 14, lineHeight: 1.5 }}>
        Pays cibles du sourcing générique : {PAYS_CIBLES.join(", ")}.
      </p>
    </>
  );
}
