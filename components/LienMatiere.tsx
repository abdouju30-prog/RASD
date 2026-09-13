import Link from "next/link";
import { ficheNom } from "@/lib/liens";

// ────────────────────────────────────────────────────────────────────────────
// UN NOM DE MATIÈRE ACTIVE EST TOUJOURS CLIQUABLE
//
// Une molécule se cite dans une dizaine d'écrans — gamme, mélanges, sentinelle,
// tableau fournisseur australien — et nulle part elle n'ouvrait sa fiche. Ce
// composant est le seul endroit qui sache faire ce lien.
//
// ⚠️ IL NE FABRIQUE PAS DE LIEN QU'IL NE SAIT PAS TENIR. Une molécule à l'index
// ouvre /matieres (nom français, ANSES, AMM). Une molécule connue seulement de
// PUBCRIS ouvre /constituants (statut australien, pas de droit marocain). Le
// reste reste du texte : un lien mort vaut moins que pas de lien.
// ────────────────────────────────────────────────────────────────────────────

export function LienMatiere({
  nom,
  children,
  style,
}: {
  /** Nom de la molécule, dans n'importe laquelle de ses graphies. */
  nom: string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}) {
  const f = ficheNom(nom);
  const contenu = children ?? f.libelle;
  if (!f.href) return <span style={style}>{contenu}</span>;
  return (
    <Link href={f.href} className="link-accent" style={style} title={f.titre}>
      {contenu}
    </Link>
  );
}

/** Plusieurs molécules d'affilée, séparées par le signe donné. */
export function LiensMatieres({
  noms,
  separateur = " · ",
  max,
  style,
  resteHref,
}: {
  noms: string[];
  separateur?: string;
  max?: number;
  style?: React.CSSProperties;
  /** Où va le « +N » : la fiche société qui liste le reste, pas une impasse. */
  resteHref?: string;
}) {
  const liste = max ? noms.slice(0, max) : noms;
  const reste = max ? Math.max(0, noms.length - max) : 0;
  return (
    <>
      {liste.map((n, i) => (
        <span key={`${n}-${i}`}>
          {i > 0 && <span style={{ color: "var(--muted-2)" }}>{separateur}</span>}
          <LienMatiere nom={n} style={style} />
        </span>
      ))}
      {reste > 0 &&
        (resteHref ? (
          <Link
            href={resteHref}
            className="link-accent mono"
            title="Voir toutes les matières actives de cette société"
            style={{ marginLeft: 4 }}
          >
            +{reste}
          </Link>
        ) : (
          <span className="mono" style={{ color: "var(--muted-2)" }}>
            {" "}
            +{reste}
          </span>
        ))}
    </>
  );
}
