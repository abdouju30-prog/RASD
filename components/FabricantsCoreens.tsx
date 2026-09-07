import { Factory } from "lucide-react";
import { etiquette, type FabricantsCoreens as Donnees, type SocieteCoreenne } from "@/lib/coree";

// ────────────────────────────────────────────────────────────────────────────
// DÉTENTEURS CORÉENS D'UNE MATIÈRE ACTIVE
//
// ⚠️ DEUX NIVEAUX DE NOM LATIN, jamais confondus — la même règle que pour le
// russe et le chinois : « relevé » quand la société a été lue et nommée à la
// main (Farm Hannong, Kyung Nong), « romanisé » quand la machine a transcrit
// les syllabes. Le second se cherche, il ne s'affirme pas.
//
// ⚠️ LA COLONNE « FABRIQUÉS » DIT 제조, PRODUIT FABRIQUÉ EN CORÉE. Elle ne dit
// pas que la matière active y est synthétisée : un formulateur coréen peut
// partir d'un technique chinois importé. C'est écrit sous le tableau, parce
// que c'est la confusion qui coûterait le plus cher ici.
// ────────────────────────────────────────────────────────────────────────────

function Nom({ s }: { s: SocieteCoreenne }) {
  return (
    <div>
      <div style={{ fontWeight: 500, fontSize: 13 }}>
        {!s.commercial && (
          <span
            className="mono"
            style={{ color: "var(--muted-2)", fontWeight: 400, marginRight: 3 }}
            title="Romanisation automatique du hangul — sert à chercher, ne vaut pas identification"
          >
            ≈
          </span>
        )}
        {etiquette(s)}
        {s.groupe && (
          <span
            className="pill"
            style={{ fontSize: 9.5, marginLeft: 6, color: "var(--mod)", fontWeight: 400 }}
            title="Entité coréenne d'un groupe étranger — pas une piste de sourcing générique"
          >
            {s.groupe}
          </span>
        )}
      </div>
      <div style={{ fontSize: 11.5, color: "var(--muted-2)", marginTop: 1 }}>{s.nom}</div>
    </div>
  );
}

function Table({ soc }: { soc: SocieteCoreenne[] }) {
  return (
    <table className="tbl">
      <thead>
        <tr>
          <th>Société</th>
          <th style={{ textAlign: "right" }}>M.A. de l&apos;index</th>
          <th style={{ textAlign: "right" }}>Homologations</th>
          <th style={{ textAlign: "right" }}>Fabriqués / importés</th>
          <th>Depuis</th>
        </tr>
      </thead>
      <tbody>
        {soc.map((s) => (
          <tr key={s.cle}>
            <td><Nom s={s} /></td>
            <td className="mono" style={{ textAlign: "right", color: "var(--accent)", fontWeight: 600 }}>
              {s.matieres.length}
            </td>
            <td className="mono" style={{ textAlign: "right" }}>{s.nbHomologations}</td>
            <td className="mono" style={{ textAlign: "right", fontSize: 12, color: "var(--muted)" }}>
              {s.nbFabrique} / {s.nbImporte}
            </td>
            <td className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>
              {s.premiere?.slice(0, 4) ?? "—"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function FabricantsCoreens({
  d,
  attribution,
  max = 12,
}: {
  d: Donnees | null;
  attribution: string;
  max?: number;
}) {
  return (
    <div className="card" style={{ padding: "18px 20px" }}>
      <div className="h-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Factory size={14} /> Détenteurs coréens — registre PSIS
      </div>

      {!d ? (
        <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "9px 0 0", lineHeight: 1.55 }}>
          Cette matière active n&apos;est pas homologuée en Corée du Sud.
        </p>
      ) : (
        <>
          <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "6px 0 14px", lineHeight: 1.55 }}>
            <strong style={{ color: "var(--fg)" }}>{d.societes.length}</strong> société(s)
            coréenne(s)
            {d.filiales.length > 0 && <> et {d.filiales.length} filiale(s) de groupes étrangers</>}{" "}
            détiennent une homologation sur{" "}
            <span className="mono">{d.matiere.nomsCoreens.slice(0, 3).join(" · ")}</span>
            {d.matiere.premiere && (
              <>
                {" "}
                — première homologation coréenne le{" "}
                <strong style={{ color: "var(--fg)" }} className="mono">
                  {d.matiere.premiere}
                </strong>
              </>
            )}
            .
          </p>

          {d.societes.length > 0 ? (
            <Table soc={d.societes.slice(0, max)} />
          ) : (
            <p style={{ fontSize: 12.5, color: "var(--mod)", margin: "0 0 12px", lineHeight: 1.55 }}>
              Aucune société coréenne indépendante : seules des filiales de groupes étrangers
              portent cette matière active en Corée. Ce n&apos;est pas une piste de sourcing.
            </p>
          )}
          {d.societes.length > max && (
            <p style={{ fontSize: 11.5, color: "var(--muted-2)", marginTop: 8 }}>
              {d.societes.length - max} autres sociétés coréennes.
            </p>
          )}

          {d.filiales.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div className="eyebrow" style={{ marginBottom: 7 }}>
                Filiales de groupes étrangers — pas des pistes de sourcing
              </div>
              <Table soc={d.filiales.slice(0, 6)} />
            </div>
          )}
        </>
      )}

      <p style={{ fontSize: 11.5, color: "var(--muted-2)", marginTop: 12, lineHeight: 1.55 }}>
        <span className="mono">≈</span> nom romanisé automatiquement du hangul : il sert à chercher,
        il ne vaut pas identification. Les autres ont été lus et nommés à la main.{" "}
        <strong>« Fabriqués » désigne des produits fabriqués en Corée, pas des matières actives
        synthétisées :</strong> ce registre nomme le titulaire de l&apos;homologation, pas
        l&apos;usine de synthèse. {attribution}. N&apos;ouvre aucun droit devant l&apos;ONSSA — la
        Corée adhère à l&apos;AMD, le Maroc non.
      </p>
    </div>
  );
}
