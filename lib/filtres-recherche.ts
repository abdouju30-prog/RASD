/**
 * Filtres de la barre de recherche — catalogues seulement, sans l'index.
 *
 * Deux axes, ceux qui répondent à « où chercher » :
 *   • le registre (ONSSA, ANSES, EPA…) — un pays, une source
 *   • l'objet (matière, produit, usage…) — ce qu'on veut ouvrir
 *
 * Le pays n'est pas un troisième axe : chaque registre est déjà un pays.
 */

export const REGISTRES_RECHERCHE = [
  { id: "onssa", libelle: "ONSSA", detail: "Maroc — index, usages, agréments" },
  { id: "anses", libelle: "ANSES", detail: "France — statut E-Phy des matières" },
  { id: "epa", libelle: "EPA", detail: "États-Unis — usines" },
  { id: "apvma", libelle: "APVMA", detail: "Australie — PUBCRIS" },
  { id: "chine", libelle: "ICAMA", detail: "Chine — licences de production" },
  { id: "bresil", libelle: "MAPA", detail: "Brésil — Agrofit" },
  { id: "coree", libelle: "PSIS", detail: "Corée du Sud" },
  { id: "russie", libelle: "Catalogue RU", detail: "Russie" },
  { id: "turquie", libelle: "BKU", detail: "Turquie" },
] as const;

export type RegistreRecherche = (typeof REGISTRES_RECHERCHE)[number]["id"];

export const OBJETS_RECHERCHE = [
  { id: "matiere", libelle: "Matière" },
  { id: "produit", libelle: "Produit" },
  { id: "usage", libelle: "Usage" },
  { id: "fournisseur", libelle: "Fournisseur" },
  { id: "detenteur", libelle: "Détenteur" },
  { id: "texte", libelle: "Texte ONSSA" },
] as const;

export type ObjetRecherche = (typeof OBJETS_RECHERCHE)[number]["id"];

export interface FiltresRecherche {
  registres: RegistreRecherche[];
  objets: ObjetRecherche[];
}

export const FILTRES_VIDES: FiltresRecherche = { registres: [], objets: [] };

export function estRegistre(s: string): s is RegistreRecherche {
  return REGISTRES_RECHERCHE.some((r) => r.id === s);
}

export function estObjet(s: string): s is ObjetRecherche {
  return OBJETS_RECHERCHE.some((o) => o.id === s);
}

export function nbFiltres(f: FiltresRecherche): number {
  return f.registres.length + f.objets.length;
}
