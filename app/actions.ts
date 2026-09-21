"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { DETENTEURS } from "@/lib/data";
import { COOKIE_DETENTEUR } from "@/lib/detenteur";

/**
 * Mémorise le détenteur choisi.
 *
 * Le cookie ne porte qu'un identifiant public déjà présent dans l'index ONSSA :
 * il ne donne accès à rien, il mémorise seulement le détenteur affiché.
 */
export async function choisirDetenteur(formData: FormData) {
  const id = String(formData.get("detenteur") ?? "");
  if (!DETENTEURS.some((d) => d.id === id)) return;

  const c = await cookies();
  c.set(COOKIE_DETENTEUR, id, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });
  revalidatePath("/", "layout");
}
