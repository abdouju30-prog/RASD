import { LienMatiere } from "@/components/LienMatiere";
import { Combine } from "lucide-react";
import { detenteurActuel } from "@/lib/detenteur";
import {
  PISTES_ASSOCIATIONS,
  PISTES_PRETES,
  STATS_MELANGES,
  associationsDe,
  type PisteAssociation,
} from "@/lib/melanges";
import { usageFr } from "@/lib/coree";

export const dynamic = "force-dynamic";

/**
 * Page « Mélanges ».
 *
 * Le marché se vend en associations, pas en molécules. Trois tables, dans
 * l'ordre du coût : ce qui est prêt à déposer, ce qui demande une seule
 * matière active de plus, ce que le marché marocain porte déjà.
 */

function Composants({ p }: { p: PisteAssociation }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 5, alignItems: "baseline" }}>
      {p.composantsSitues.map((c, i) => (
        <span key={c.iso} style={{ fontSize: 12.5 }}>
          {i > 0 && <span style={{ color: "var(--muted-2)" }}>+ </span>}
          {c.auMaroc ? (
            <span>
              <LienMatiere nom={c.auMaroc} />
              <span className="mono" style={{ color: "var(--muted-2)", fontSize: 10.5 }}>
                {" "}
                {c.nbProduits}
              </span>
            </span>
          ) : (
            <span style={{ color: "var(--high)" }} title="Absente de l'index ONSSA">
              {c.iso}
            </span>
          )}
        </span>
      ))}
    </div>
  );
}

function TablePistes({ liste, max }: { liste: PisteAssociation[]; max: number }) {
  return (
    <>
      <table className="tbl">
        <thead>
          <tr>
            <th>Association</th>
            <th style={{ textAlign: "right" }}>Hom. Corée</th>
            <th style={{ textAlign: "right" }}>Sociétés</th>
            <th>Dernière</th>
            <th>Usage</th>
          </tr>
        </thead>
        <tbody>
          {liste.slice(0, max).map((p) => (
            <tr key={p.cle}>
              <td><Composants p={p} /></td>
              <td className="mono" style={{ textAlign: "right", fontWeight: 600 }}>{p.nbHomologations}</td>
              <td className="mono" style={{ textAlign: "right", color: "var(--muted)" }}>{p.nbSocietes}</td>
              <td className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>{p.derniere ?? "—"}</td>
              <td style={{ fontSize: 11.5, color: "var(--muted)", maxWidth: 190 }}>
                {p.usages.slice(0, 2).map(usageFr).join(" · ") || "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {liste.length > max && (
        <p style={{ fontSize: 11.5, color: "var(--muted-2)", marginTop: 8 }}>
          {liste.length - max} autres.
        </p>
      )}
    </>
  );
}

export default async function MelangesPage() {
  const d = await detenteurActuel();
  const g = associationsDe(d.id);
  const presque = PISTES_ASSOCIATIONS.filter(
    (p) => !p.toutAuMaroc && p.nbAuMaroc === p.composants.length - 1 && p.nbSocietes >= 2
  );

  return (
    <>
      <div className="fil">Alternative · Mélanges</div>
      <h1 style={{ display: "flex", alignItems: "center", gap: 9 }}>
        <Combine size={19} /> Mélanges
      </h1>
      <p className="chapeau">
        {STATS_MELANGES.nbLignesMelange} des {STATS_MELANGES.nbLignes} lignes de l&apos;index sont
        des associations — {STATS_MELANGES.nbAssociations} distinctes. Le registre coréen en compte{" "}
        {STATS_MELANGES.nbCoreennes}, dont {STATS_MELANGES.nbPistes} absentes du Maroc.
      </p>

      <div className="strip" style={{ marginBottom: 14 }}>
        <div>
          <span className="eyebrow">Prêtes à déposer</span>
          <strong className="mono" style={{ fontSize: 17, fontWeight: 600, color: "var(--accent)" }}>
            {STATS_MELANGES.nbPretes}
          </strong>
        </div>
        <div>
          <span className="eyebrow">À une M.A. près</span>
          <strong className="mono" style={{ fontSize: 17, fontWeight: 600, color: "var(--mod)" }}>
            {presque.length}
          </strong>
        </div>
        <div>
          <span className="eyebrow">Associations au Maroc</span>
          <strong className="mono" style={{ fontSize: 17, fontWeight: 600 }}>
            {STATS_MELANGES.nbAssociations}
          </strong>
        </div>
        <div>
          <span className="eyebrow">Dont vous en détenez</span>
          <strong className="mono" style={{ fontSize: 17, fontWeight: 600, color: "var(--info)" }}>
            {g.tenues.length}
          </strong>
        </div>
      </div>

      <div className="card" style={{ padding: "18px 20px", marginBottom: 14 }}>
        <div className="h-title">Prêtes à déposer — {PISTES_PRETES.length}</div>
        <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "8px 0 12px", lineHeight: 1.6, maxWidth: "92ch" }}>
          Homologuées en Corée, absentes du Maroc, et <strong>chaque composant est déjà homologué
          au Maroc</strong> — donc chacun a une voie me-too. Le chiffre gris est le nombre de
          produits marocains portant la molécule.
        </p>
        <TablePistes liste={PISTES_PRETES} max={30} />
      </div>

      <div className="card" style={{ padding: "18px 20px", marginBottom: 14 }}>
        <div className="h-title">À une matière active près — {presque.length}</div>
        <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "8px 0 12px", lineHeight: 1.6, maxWidth: "92ch" }}>
          Un seul composant manque au Maroc, en rouge. Portées par au moins deux sociétés
          coréennes, ce qui écarte les homologations isolées.
        </p>
        <TablePistes liste={presque} max={25} />
      </div>
    </>
  );
}
