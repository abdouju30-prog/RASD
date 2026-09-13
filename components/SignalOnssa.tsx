import { META_ONSSA_LISTES, hrefOnssa, restreinteParNom, restreintePourMatiere, retireeParNom, retireePourMatiere } from "@/lib/onssa-listes";
import { fmtDate } from "@/lib/logic";

function LienPdf({ href, libelle }: { href: string | null; libelle: string }) {
  if (!href) return <span>{libelle}</span>;
  return (
    <a href={href} target="_blank" rel="noreferrer" className="link-accent">
      {libelle}
    </a>
  );
}

/** Bannière de fiche matière : retrait (incohérence Excel) ou restriction. */
export function BanniereOnssa({ ma }: { ma: { nom: string; molecule: string } }) {
  const retrait = retireePourMatiere(ma);
  const restriction = restreintePourMatiere(ma);
  if (!retrait && !restriction) return null;

  if (retrait) {
    const href = hrefOnssa(META_ONSSA_LISTES.urlRetirees);
    return (
      <div
        className="card"
        style={{
          padding: "14px 18px",
          marginBottom: 16,
          borderColor: "color-mix(in srgb, var(--crit) 40%, transparent)",
          background: "color-mix(in srgb, var(--crit) 8%, transparent)",
        }}
      >
        <div className="h-title" style={{ color: "var(--crit)" }}>
          Retirée / interdite au Maroc
        </div>
        <p style={{ margin: "8px 0 0", fontSize: 13.5, lineHeight: 1.55, color: "var(--fg)" }}>
          Liste ONSSA des substances actives retirées
          {retrait.dateRetrait ? ` depuis le ${fmtDate(retrait.dateRetrait)}` : ""}. L&apos;index Excel
          porte encore cette molécule : l&apos;AMM affichée n&apos;est pas une preuve d&apos;homologation
          en vigueur.
        </p>
        <p style={{ margin: "8px 0 0", fontSize: 12.5, color: "var(--muted)" }}>
          <LienPdf href={href} libelle="PDF officiel — substances retirées" />
        </p>
      </div>
    );
  }

  const href = hrefOnssa(META_ONSSA_LISTES.urlRestrictions);
  return (
    <div
      className="card"
      style={{
        padding: "14px 18px",
        marginBottom: 16,
        borderColor: "color-mix(in srgb, var(--high) 40%, transparent)",
        background: "color-mix(in srgb, var(--high) 8%, transparent)",
      }}
    >
      <div className="h-title" style={{ color: "var(--high)" }}>
        Restriction d&apos;usage ONSSA
        {restriction!.dateRestriction ? ` · ${fmtDate(restriction!.dateRestriction)}` : ""}
      </div>
      <p style={{ margin: "8px 0 0", fontSize: 13.5, lineHeight: 1.55, color: "var(--fg)" }}>
        {restriction!.condition || "Condition d'emploi renforcée."}
      </p>
      <p style={{ margin: "8px 0 0", fontSize: 12.5, color: "var(--muted)" }}>
        <LienPdf href={href} libelle="PDF officiel — restrictions d'usage" />
      </p>
    </div>
  );
}

/** Pastille pour une ligne d'index Excel (composants inclus). */
export function PastilleOnssaMatiere({ ma }: { ma: { nom: string; molecule: string } }) {
  const retrait = retireePourMatiere(ma);
  const restriction = restreintePourMatiere(ma);
  if (retrait) {
    return (
      <span
        className="pill"
        style={{
          fontWeight: 500,
          color: "var(--crit)",
          borderColor: "color-mix(in srgb, var(--crit) 40%, transparent)",
          background: "color-mix(in srgb, var(--crit) 10%, transparent)",
        }}
      >
        ONSSA · retirée
      </span>
    );
  }
  if (restriction) {
    return (
      <span
        className="pill"
        style={{
          fontWeight: 500,
          color: "var(--high)",
          borderColor: "color-mix(in srgb, var(--high) 40%, transparent)",
          background: "color-mix(in srgb, var(--high) 10%, transparent)",
        }}
      >
        ONSSA · restriction
      </span>
    );
  }
  return null;
}
export function PastilleOnssaNom({ nom }: { nom: string }) {
  const retrait = retireeParNom(nom);
  const restriction = restreinteParNom(nom);
  if (retrait) {
    return (
      <span
        className="pill"
        style={{
          fontWeight: 500,
          color: "var(--crit)",
          borderColor: "color-mix(in srgb, var(--crit) 40%, transparent)",
          background: "color-mix(in srgb, var(--crit) 10%, transparent)",
        }}
        title={retrait.dateRetrait ? `Retrait ONSSA au ${fmtDate(retrait.dateRetrait)}` : "Retrait ONSSA"}
      >
        ONSSA · retirée
        {retrait.dateRetrait ? ` ${fmtDate(retrait.dateRetrait)}` : ""}
      </span>
    );
  }
  if (restriction) {
    return (
      <span
        className="pill"
        style={{
          fontWeight: 500,
          color: "var(--high)",
          borderColor: "color-mix(in srgb, var(--high) 40%, transparent)",
          background: "color-mix(in srgb, var(--high) 10%, transparent)",
        }}
        title={restriction.condition}
      >
        ONSSA · restriction d&apos;usage
      </span>
    );
  }
  return null;
}
