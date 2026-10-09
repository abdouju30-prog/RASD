import Link from "next/link";
import { ShieldAlert, Lock, Clock } from "lucide-react";
import {
  CONTRAINTES,
  DELAIS,
  LIBELLE_OBJET,
  SOURCE_IMPORT,
  STATS_IMPORT,
  TEXTES,
  VALIDITES,
  type Objet,
} from "@/lib/importation";

export const dynamic = "force-dynamic";

/**
 * Page « Importation » — les contraintes fixes.
 *
 * Le seul écran de l'outil qui ne cherche rien. Il énonce ce qui est
 * obligatoire, et qu'aucune trouvaille de sourcing ne contourne.
 */

const TON_OBJET: Record<Objet, string> = {
  produit: "var(--info)",
  matiere_active: "var(--accent)",
  echantillon: "var(--mod)",
};

export default async function ImportationPage({
  searchParams,
}: {
  searchParams: Promise<{ objet?: string }>;
}) {
  const sp = await searchParams;
  const objet = (["produit", "matiere_active", "echantillon"] as Objet[]).find(
    (o) => o === sp.objet
  );
  const liste = objet ? CONTRAINTES.filter((c) => c.objets.includes(objet)) : CONTRAINTES;
  const barrieres = liste.filter((c) => c.barriere);
  const autres = liste.filter((c) => !c.barriere);

  const chip = (href: string, actif: boolean, texte: string, n: number) => (
    <Link
      key={texte}
      href={href}
      className="pill"
      style={{
        fontWeight: 500,
        color: actif ? "var(--accent)" : "var(--muted)",
        borderColor: actif
          ? "color-mix(in srgb, var(--accent) 45%, transparent)"
          : "var(--border-strong)",
        background: actif ? "var(--accent-fond)" : "transparent",
      }}
    >
      {texte} <span className="mono" style={{ opacity: 0.65 }}>{n}</span>
    </Link>
  );

  return (
    <>
      <h1 style={{ display: "flex", alignItems: "center", gap: 9 }}>
        <ShieldAlert size={19} /> Importation
      </h1>
      <p className="chapeau" style={{ maxWidth: "90ch" }}>
        Ce que la réglementation impose, et qu&apos;aucune trouvaille de sourcing ne contourne.{" "}
        {STATS_IMPORT.nbBarrieres} barrières, {STATS_IMPORT.nbContraintes - STATS_IMPORT.nbBarrieres}{" "}
        obligations de dossier, {STATS_IMPORT.nbDelais} délais.
      </p>

      <div className="card" style={{ padding: "12px 15px", marginBottom: 14 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {chip("/importation", !objet, "Tout", CONTRAINTES.length)}
          {(["produit", "matiere_active", "echantillon"] as Objet[]).map((o) =>
            chip(
              `/importation?objet=${o}`,
              objet === o,
              LIBELLE_OBJET[o],
              CONTRAINTES.filter((c) => c.objets.includes(o)).length
            )
          )}
        </div>
      </div>

      <div className="card" style={{ padding: "18px 20px", marginBottom: 14 }}>
        <div className="h-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Lock size={14} /> Barrières — {barrieres.length}
        </div>
        <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "8px 0 12px", lineHeight: 1.6, maxWidth: "92ch" }}>
          Sans ces pièces, l&apos;opération est <strong>impossible</strong>, pas seulement retardée.
        </p>
        <table className="tbl">
          <thead>
            <tr>
              <th>Règle</th>
              <th>Porte sur</th>
              <th>Article</th>
            </tr>
          </thead>
          <tbody>
            {barrieres.map((c) => (
              <tr key={c.id}>
                <td style={{ fontSize: 12.5, maxWidth: 520, lineHeight: 1.55 }}>
                  <strong style={{ color: "var(--fg)" }}>{c.regle}</strong>
                  {c.consequence && (
                    <div style={{ color: "var(--high)", fontSize: 11.5, marginTop: 5 }}>
                      {c.consequence}
                    </div>
                  )}
                </td>
                <td>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {c.objets.map((o) => (
                      <span
                        key={o}
                        className="pill"
                        style={{
                          fontSize: 10,
                          whiteSpace: "nowrap",
                          color: TON_OBJET[o],
                          borderColor: `color-mix(in srgb, ${TON_OBJET[o]} 38%, transparent)`,
                        }}
                      >
                        {LIBELLE_OBJET[o]}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="mono" style={{ fontSize: 11.5, color: "var(--muted-2)", whiteSpace: "nowrap" }}>
                  {c.article}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ padding: "18px 20px", marginBottom: 14 }}>
        <div className="h-title">Obligations de dossier et de contrôle — {autres.length}</div>
        <table className="tbl" style={{ marginTop: 12 }}>
          <thead>
            <tr>
              <th>Règle</th>
              <th>Porte sur</th>
              <th>Article</th>
            </tr>
          </thead>
          <tbody>
            {autres.map((c) => (
              <tr key={c.id}>
                <td style={{ fontSize: 12.5, maxWidth: 520, lineHeight: 1.55 }}>
                  {c.regle}
                  {c.consequence && (
                    <div style={{ color: "var(--mod)", fontSize: 11.5, marginTop: 5 }}>
                      {c.consequence}
                    </div>
                  )}
                </td>
                <td>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {c.objets.map((o) => (
                      <span
                        key={o}
                        className="pill"
                        style={{
                          fontSize: 10,
                          whiteSpace: "nowrap",
                          color: TON_OBJET[o],
                          borderColor: `color-mix(in srgb, ${TON_OBJET[o]} 38%, transparent)`,
                        }}
                      >
                        {LIBELLE_OBJET[o]}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="mono" style={{ fontSize: 11.5, color: "var(--muted-2)", whiteSpace: "nowrap" }}>
                  {c.article}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grille" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
        <div className="card" style={{ padding: "18px 20px" }}>
          <div className="h-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Clock size={14} /> Délais
          </div>
          <table className="tbl" style={{ marginTop: 12 }}>
            <thead>
              <tr>
                <th>Ce qu&apos;il faut faire</th>
                <th style={{ whiteSpace: "nowrap" }}>Délai</th>
              </tr>
            </thead>
            <tbody>
              {DELAIS.map((d) => (
                <tr key={d.id}>
                  <td style={{ fontSize: 12.5, lineHeight: 1.5 }}>
                    {d.quoi}
                    <div style={{ color: "var(--muted-2)", fontSize: 11 }}>{d.sanction}</div>
                  </td>
                  <td className="mono" style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{d.duree}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card" style={{ padding: "18px 20px" }}>
          <div className="h-title">Durées de validité</div>
          <table className="tbl" style={{ marginTop: 12 }}>
            <tbody>
              {VALIDITES.map((v) => (
                <tr key={v.acte}>
                  <td style={{ fontSize: 12.5, fontWeight: 500 }}>
                    {v.acte}
                    <div style={{ color: "var(--muted-2)", fontSize: 11, fontWeight: 400 }}>
                      {v.suite}
                    </div>
                  </td>
                  <td className="mono" style={{ fontWeight: 600, textAlign: "right" }}>{v.duree}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ fontSize: 11.5, color: "var(--high)", marginTop: 10, lineHeight: 1.55 }}>
            Ce ne sont pas des délais d&apos;instruction : l&apos;ONSSA ne publie pas le temps
            qu&apos;elle met à instruire un dossier.
          </p>

          <div className="h-title" style={{ marginTop: 18 }}>Textes</div>
          <div style={{ display: "grid", gap: 7, marginTop: 10 }}>
            {TEXTES.map((t) => (
              <div key={t.ref} style={{ fontSize: 12 }}>
                <span className="mono" style={{ fontWeight: 600 }}>{t.ref}</span>
                <div style={{ color: "var(--muted)", fontSize: 11.5, lineHeight: 1.5 }}>{t.objet}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <p style={{ fontSize: 11.5, color: "var(--muted-2)", marginTop: 16, lineHeight: 1.6, maxWidth: "92ch" }}>
        Transcription du{" "}
        <a href={SOURCE_IMPORT.url} target="_blank" rel="noreferrer" className="link-accent">
          {SOURCE_IMPORT.titre}
        </a>{" "}
        — {SOURCE_IMPORT.reference}, relevé le 9 septembre 2026. Chaque ligne porte l&apos;article
        dont elle vient. <strong>Ce tableau ne remplace pas le texte :</strong> il sert à savoir
        quoi préparer et quand, pas à être opposé à un inspecteur.
      </p>
    </>
  );
}
