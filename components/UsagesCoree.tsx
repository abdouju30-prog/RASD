import { Globe2 } from "lucide-react";
import {
  STATS_USAGES_COREE,
  type MatiereUsages,
  type NiveauTraduction,
  type UsageCoreen,
} from "@/lib/coree-usages";

// ────────────────────────────────────────────────────────────────────────────
// USAGES HOMOLOGUÉS EN CORÉE — les pistes d'extension
//
// ⚠️ LE NIVEAU DE TRADUCTION EST VISIBLE, ligne par ligne. Un terme reconstruit
// à partir de morphèmes porte le signe ≈ ; un terme non traduit reste en
// coréen. Le nom d'origine est toujours en dessous : c'est lui qui fait foi, et
// c'est lui qu'on recopie pour vérifier.
// ────────────────────────────────────────────────────────────────────────────

function Terme({
  fr,
  ko,
  niveau,
}: {
  fr: string;
  ko: string;
  niveau: NiveauTraduction;
}) {
  return (
    <div>
      <div style={{ fontSize: 12.5 }}>
        {niveau === "compose" && (
          <span
            className="mono"
            style={{ color: "var(--muted-2)", marginRight: 3 }}
            title="Reconstruit à partir de morphèmes — vérifier sur le nom coréen"
          >
            ≈
          </span>
        )}
        {niveau === "brut" ? (
          <span style={{ color: "var(--mod)" }} title="Non traduit">
            {fr}
          </span>
        ) : (
          fr
        )}
      </div>
      <div style={{ fontSize: 10.5, color: "var(--muted-2)" }}>{ko}</div>
    </div>
  );
}

function Liste({ v, max = 2 }: { v: string[]; max?: number }) {
  if (v.length === 0) return <span style={{ color: "var(--muted-2)" }}>—</span>;
  return (
    <span className="mono" style={{ fontSize: 11.5 }}>
      {v.slice(0, max).join(" · ")}
      {v.length > max && <span style={{ color: "var(--muted-2)" }}> +{v.length - max}</span>}
    </span>
  );
}

export function UsagesCoree({
  m,
  culturesMaroc,
  max = 25,
}: {
  m: MatiereUsages | null;
  culturesMaroc: string[];
  max?: number;
}) {
  if (!m) return null;

  const connues = new Set(culturesMaroc.map((c) => c.toLowerCase()));
  // Les usages sur une culture absente du Maroc passent devant : ce sont eux
  // qui ouvrent quelque chose.
  const tries = [...m.usages].sort((a, b) => {
    const na = connues.has(a.culture.toLowerCase()) ? 1 : 0;
    const nb = connues.has(b.culture.toLowerCase()) ? 1 : 0;
    return na - nb || b.nbProduits - a.nbProduits;
  });
  const nbNeufs = tries.filter((u) => !connues.has(u.culture.toLowerCase())).length;

  return (
    <div className="card" style={{ padding: "18px 20px" }}>
      <div className="h-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Globe2 size={14} /> Usages homologués en Corée — {m.nbUsages}
      </div>

      <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "8px 0 12px", lineHeight: 1.6, maxWidth: "92ch" }}>
        {m.cultures.length} culture(s), {m.cibles.length} ravageur(s).{" "}
        <strong style={{ color: "var(--accent)" }}>{nbNeufs}</strong> portent sur une culture
        absente du spectre marocain — ce sont les pistes d&apos;extension, montrées en premier.
      </p>

      <table className="tbl">
        <thead>
          <tr>
            <th>Culture</th>
            <th>Ravageur / maladie</th>
            <th>Dilution</th>
            <th>Dose</th>
            <th>Stade / délai</th>
            <th style={{ textAlign: "right" }}>Appl.</th>
            <th>Méthode</th>
            <th style={{ textAlign: "right" }}>Prod.</th>
          </tr>
        </thead>
        <tbody>
          {tries.slice(0, max).map((u: UsageCoreen) => {
            const neuf = !connues.has(u.culture.toLowerCase());
            return (
              <tr key={`${u.cultureKo}|${u.cibleKo}`}>
                <td style={{ fontWeight: 500 }}>
                  {neuf && (
                    <span style={{ color: "var(--accent)" }} title="Culture absente du Maroc">
                      ●{" "}
                    </span>
                  )}
                  <Terme fr={u.culture} ko={u.cultureKo} niveau={u.cultureNiveau} />
                </td>
                <td>
                  <Terme fr={u.cible} ko={u.cibleKo} niveau={u.cibleNiveau} />
                </td>
                <td><Liste v={u.dilutions} /></td>
                <td><Liste v={u.doses} /></td>
                <td><Liste v={u.delais} max={1} /></td>
                <td style={{ textAlign: "right" }}><Liste v={u.applications} max={1} /></td>
                <td style={{ fontSize: 11.5, color: "var(--muted)" }}>
                  {u.methodes[0] ?? "—"}
                </td>
                <td className="mono" style={{ textAlign: "right", color: "var(--muted)" }}>
                  {u.nbProduits}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {tries.length > max && (
        <p style={{ fontSize: 11.5, color: "var(--muted-2)", marginTop: 8 }}>
          {tries.length - max} autres usages.
        </p>
      )}

      <p style={{ fontSize: 11.5, color: "var(--muted-2)", marginTop: 12, lineHeight: 1.6 }}>
        <span className="mono">≈</span> terme reconstruit à partir de morphèmes agronomiques ; en{" "}
        <span style={{ color: "var(--mod)" }}>orange</span>, non traduit. Le nom coréen figure sous
        chaque terme — c&apos;est lui qui fait foi. {STATS_USAGES_COREE.partTraduite} % des{" "}
        {STATS_USAGES_COREE.nbUsages.toLocaleString("fr")} usages du registre sont entièrement
        traduits. <strong>Aucune valeur réglementaire au Maroc :</strong> un usage coréen ne se
        revendique pas devant l&apos;ONSSA, il faut ses propres essais d&apos;efficacité. Ce
        tableau donne des pistes, et le fait qu&apos;un régulateur exigeant les a acceptées.{" "}
        {STATS_USAGES_COREE.attribution}.
      </p>
    </div>
  );
}
