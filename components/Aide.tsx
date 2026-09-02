import { CircleHelp } from "lucide-react";

/**
 * Bloc d'aide repliable.
 *
 * Les avertissements de méthode — provenance d'une donnée, limite d'une
 * source, réserve à énoncer au client — doivent rester accessibles sans
 * occuper l'écran à chaque consultation. On les lit une fois, on les retrouve
 * quand on en a besoin.
 *
 * Ce qui NE va pas ici : une information dont dépend une décision. Une réserve
 * qui change la lecture d'un chiffre s'affiche à côté du chiffre.
 */
export function Aide({
  titre,
  children,
  ouvert = false,
}: {
  titre: string;
  children: React.ReactNode;
  ouvert?: boolean;
}) {
  return (
    <details className="aide" open={ouvert}>
      <summary>
        <CircleHelp size={13} aria-hidden />
        {titre}
      </summary>
      <div className="aide-corps">{children}</div>
    </details>
  );
}

/**
 * Encadré de schéma : un titre court, le dessin, rien d'autre.
 */
export function Figure({
  titre,
  legende,
  children,
}: {
  titre: string;
  legende?: string;
  children: React.ReactNode;
}) {
  return (
    <figure className="figure">
      <figcaption>
        <span className="h-title">{titre}</span>
        {legende && <span className="figure-legende">{legende}</span>}
      </figcaption>
      {children}
    </figure>
  );
}
