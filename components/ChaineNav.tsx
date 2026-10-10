"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Recherche } from "./Recherche";

/**
 * Ruban de stations — la signature de la direction retenue.
 *
 * La navigation matérialise la boucle : Portefeuille → Alternative →
 * Fournisseur → Dossier. Le portefeuille fusionne radar, alertes, matières
 * et produits. Chaque station porte le compteur du travail restant.
 *
 * Le radar précède la chaîne, séparé par un filet : c'est une vue d'ensemble,
 * pas une étape du raisonnement.
 */

export interface Station {
  href: string;
  /** « Étape 1 » — vide pour le radar, qui est hors chaîne. */
  etape?: string;
  nom: string;
  compteur: string;
  /** Nombre d'alertes critiques, affiché en pastille rouge. */
  alerte?: number;
  /** Autres préfixes qui gardent cette station allumée (sous-vues). */
  aliases?: string[];
}

export interface Jauge {
  libelle: string;
  valeur: string;
  ton?: "crit" | "high";
}

export function ChaineNav({
  contexte,
  stations,
  jauges,
  selecteur,
  fraicheur,
}: {
  contexte: string;
  stations: Station[];
  jauges: Jauge[];
  /** Sélecteur de détenteur — l'outil couvre les 75 sociétés de l'index. */
  selecteur?: React.ReactNode;
  fraicheur?: React.ReactNode;
}) {
  const path = usePathname();

  const actif = (s: Station) => {
    const paths = [s.href, ...(s.aliases ?? [])];
    return paths.some((href) =>
      href === "/" ? path === "/" : path === href || path.startsWith(href + "/")
    );
  };

  return (
    <header className="entete">
      <div className="barre">
        <Link href="/" className="logo" aria-label="Rasd — veille réglementaire">
          R
        </Link>
        <Link href="/" className="nom">
          Rasd
        </Link>
        {selecteur}
        <Recherche />
        <span className="ctx">{contexte}</span>
        <div className="droite">
          <Link
            href="/actualites"
            className="jauge"
            style={{ textDecoration: path === "/actualites" ? "underline" : "none" }}
          >
            ACTUALITÉS
          </Link>
          <Link
            href="/sources"
            className="jauge"
            style={{ textDecoration: path === "/sources" ? "underline" : "none" }}
          >
            SOURCES
          </Link>
          {jauges.map((j) => (
            <span key={j.libelle} className={`jauge${j.ton ? " " + j.ton[0] : ""}`}>
              {j.libelle} <b>{j.valeur}</b>
            </span>
          ))}
          {fraicheur}
        </div>
      </div>

      <nav className="chaine" aria-label="Chaîne de décision">
        {stations.map((s) => {
          const on = actif(s);
          return (
            <Link
              key={s.href}
              href={s.href}
              className={`station${on ? " on" : ""}`}
              aria-current={on ? "page" : undefined}
            >
              <span className="n">{s.nom}</span>
              <span className="k">
                {s.compteur}
                {s.alerte ? <span className="badge">{s.alerte}</span> : null}
              </span>
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
