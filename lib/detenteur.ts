import { cookies } from "next/headers";
import { DETENTEURS, META, detenteurParId } from "./data";
import type { Detenteur } from "./types";

// ────────────────────────────────────────────────────────────────────────────
// Détenteur courant.
//
// L'outil couvre les 75 détenteurs de l'index. Le choix se fait à l'écran et
// se conserve dans un cookie : pas de compte, pas de base, et l'URL reste
// partageable telle quelle.
//
// Le cookie ne porte qu'un identifiant public déjà présent dans l'index ONSSA.
// Il ne donne accès à rien : il mémorise seulement le détenteur affiché.
// ────────────────────────────────────────────────────────────────────────────

export const COOKIE_DETENTEUR = "homologa_detenteur";

/** Détenteur sélectionné, ou celui par défaut au premier passage. */
export async function detenteurActuel(): Promise<Detenteur> {
  const c = await cookies();
  return detenteurParId(c.get(COOKIE_DETENTEUR)?.value);
}

/** Action de formulaire : mémorise le détenteur choisi. */
export async function choisirDetenteur(formData: FormData) {
  "use server";
  const id = String(formData.get("detenteur") ?? "");
  if (DETENTEURS.some((d) => d.id === id)) {
    const c = await cookies();
    c.set(COOKIE_DETENTEUR, id, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      httpOnly: true,
    });
  }
}

export const DETENTEUR_DEFAUT = META.detenteurDefaut;
