import Link from "next/link";
import { idMatiere } from "@/lib/liens";

// ────────────────────────────────────────────────────────────────────────────
// UN NOM DE MATIÈRE ACTIVE EST TOUJOURS CLIQUABLE
//
// Une molécule se cite dans une dizaine d'écrans — gamme, mélanges, sentinelle,
// concurrents, partenaires de formulation — et nulle part elle n'ouvrait sa
// fiche. Ce composant est le seul endroit qui sache faire ce lien.
//
// ⚠️ IL NE FABRIQUE PAS DE LIEN QU'IL NE SAIT PAS TENIR. Une molécule absente
// de l'index — celles de la sentinelle, par définition — s'affiche en texte
// simple. Un lien mort vaut moins que pas de lien.
// ────────────────────────────────────────────────────────────────────────────

export function LienMatiere({
  nom,
  children,
  style,
}: {
  /** Nom de la molécule, dans n'importe laquelle de ses graphies d'index. */
  nom: string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}) {
  const id = idMatiere(nom);
  const contenu = children ?? nom;
  if (!id) return <span style={style}>{contenu}</span>;
  return (
    <Link href={`/matieres/${id}`} className="link-accent" style={style} title={`Fiche — ${nom}`}>
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
}: {
  noms: string[];
  separateur?: string;
  max?: number;
  style?: React.CSSProperties;
}) {
  const liste = max ? noms.slice(0, max) : noms;
  return (
    <>
      {liste.map((n, i) => (
        <span key={n}>
          {i > 0 && <span style={{ color: "var(--muted-2)" }}>{separateur}</span>}
          <LienMatiere nom={n} style={style} />
        </span>
      ))}
      {max && noms.length > max && (
        <span className="mono" style={{ color: "var(--muted-2)" }}> +{noms.length - max}</span>
      )}
    </>
  );
}
