import { Sprout, FlaskConical } from "lucide-react";
import { parCible, parCulture, type Spectre } from "@/lib/usages";
import { essaiPour, essaisDe, STATS_EFFICACITE } from "@/lib/efficacite";

// ────────────────────────────────────────────────────────────────────────────
// SPECTRE D'EMPLOI — toutes les cultures, tous les parasites, toutes les doses
//
// ⚠️ LA COLONNE « EFFICACITÉ » EST VIDE TANT QU'ON NE L'A PAS REMPLIE, et c'est
// la seule position tenable : aucun des neuf registres de l'outil ne publie de
// pourcentage. Ce qui est publié — l'usage, la dose, le DAR — l'est ici en
// entier, et c'est déjà le référentiel opposable devant l'ONSSA.
// ────────────────────────────────────────────────────────────────────────────

function Valeurs({ v, unite }: { v: string[]; unite?: string }) {
  if (v.length === 0) return <span style={{ color: "var(--muted-2)" }}>—</span>;
  return (
    <span className="mono" style={{ fontSize: 12 }}>
      {v.slice(0, 2).join(" · ")}
      {unite && v.length > 0 ? ` ${unite}` : ""}
      {v.length > 2 && <span style={{ color: "var(--muted-2)" }}> +{v.length - 2}</span>}
    </span>
  );
}

export function Usages({ s, max = 40 }: { s: Spectre; max?: number }) {
  const essais = essaisDe(s.molecules);
  const cultures = parCulture(s);
  const cibles = parCible(s);

  return (
    <div className="card" style={{ padding: "18px 20px" }}>
      <div className="h-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Sprout size={14} /> Spectre d&apos;emploi — {s.cultures.length} culture(s),{" "}
        {s.cibles.length} parasite(s), {s.emplois.length} usages homologués
      </div>

      <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "8px 0 4px", lineHeight: 1.6 }}>
        Tous détenteurs confondus — {s.nbProduits} produits chez {s.nbDetenteurs} sociétés. Les
        lignes marquées <span style={{ color: "var(--accent)" }}>●</span> sont celles que vous
        revendiquez déjà.
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, margin: "10px 0 4px" }}>
        {cibles.slice(0, 14).map((c) => (
          <span
            key={c.cible}
            className="pill"
            style={{ fontSize: 10.5, color: "var(--info)" }}
            title={`${c.emplois.length} culture(s)`}
          >
            {c.cible} <span className="mono" style={{ opacity: 0.6 }}>{c.emplois.length}</span>
          </span>
        ))}
      </div>

      <table className="tbl" style={{ marginTop: 12 }}>
        <thead>
          <tr>
            <th>Culture</th>
            <th>Parasite</th>
            <th>Dose</th>
            <th style={{ textAlign: "right" }}>DAR (j)</th>
            <th style={{ textAlign: "right" }}>Appl.</th>
            <th style={{ textAlign: "right" }}>Efficacité</th>
            <th style={{ textAlign: "right" }}>Produits</th>
          </tr>
        </thead>
        <tbody>
          {s.emplois.slice(0, max).map((e) => {
            const essai = essaiPour(s.molecules, e.culture, e.cible);
            const vous = s.vosEmplois.has(`${e.culture} / ${e.cible}`);
            return (
              <tr key={`${e.culture}|${e.cible}`}>
                <td style={{ fontWeight: 500 }}>
                  {vous && <span style={{ color: "var(--accent)" }}>● </span>}
                  {e.culture}
                </td>
                <td style={{ fontSize: 12.5, color: "var(--muted)" }}>{e.cible}</td>
                <td><Valeurs v={e.doses} /></td>
                <td style={{ textAlign: "right" }}><Valeurs v={e.dar} /></td>
                <td style={{ textAlign: "right" }}><Valeurs v={e.nbApplications} /></td>
                <td className="mono" style={{ textAlign: "right" }}>
                  {essai ? (
                    <span
                      style={{ color: "var(--low)", fontWeight: 600 }}
                      title={`${essai.source}${essai.date ? ` · ${essai.date}` : ""}${
                        essai.protocole ? ` · ${essai.protocole}` : ""
                      }`}
                    >
                      {essai.efficacite} %
                    </span>
                  ) : (
                    <span style={{ color: "var(--muted-2)" }}>—</span>
                  )}
                </td>
                <td className="mono" style={{ textAlign: "right", color: "var(--muted)" }}>
                  {e.produits.length}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {s.emplois.length > max && (
        <p style={{ fontSize: 11.5, color: "var(--muted-2)", marginTop: 8 }}>
          {s.emplois.length - max} autres usages.
        </p>
      )}

      <div
        style={{
          borderTop: "1px solid var(--border)",
          marginTop: 14,
          paddingTop: 12,
          display: "flex",
          alignItems: "flex-start",
          gap: 9,
        }}
      >
        <FlaskConical size={14} style={{ color: "var(--mod)", flexShrink: 0, marginTop: 2 }} />
        <p style={{ fontSize: 11.5, color: "var(--muted-2)", margin: 0, lineHeight: 1.6 }}>
          <strong style={{ color: "var(--mod)" }}>
            Aucun registre public ne publie de taux d&apos;efficacité.
          </strong>{" "}
          Ni l&apos;ONSSA, ni l&apos;ANSES, ni l&apos;APVMA, ni les registres chinois, turc, russe,
          brésilien ou coréen : les pourcentages viennent des essais biologiques du dossier
          d&apos;homologation, qui sont confidentiels. La colonne se remplit depuis{" "}
          <span className="mono">data/efficacite.json</span> — vos essais, ou les fiches techniques
          de vos fournisseurs, avec leur source et leur date.{" "}
          {STATS_EFFICACITE.nbEssais === 0
            ? "Aucun essai saisi pour l'instant."
            : `${essais.length} essai(s) saisi(s) sur cette molécule, ${STATS_EFFICACITE.nbEssais} au total.`}{" "}
          Ce qui est publié — l&apos;usage, la dose, le DAR — figure ci-dessus en entier : c&apos;est
          le référentiel opposable devant l&apos;ONSSA.
        </p>
      </div>
    </div>
  );
}
