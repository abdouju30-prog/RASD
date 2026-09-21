import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { DETENTEURS } from "@/lib/data";
import { COOKIE_DETENTEUR } from "@/lib/detenteur";

// Bascule vers un détenteur depuis un lien, et non depuis le sélecteur.
//
// La recherche transverse propose les 75 détenteurs de l'index : quand on en
// choisit un, l'intention n'est pas d'ouvrir une page mais de CHANGER de
// société — tous les compteurs du ruban en dépendent. Ce point d'entrée pose
// le même cookie que le sélecteur, puis renvoie sur le portefeuille.
//
// Comme le sélecteur, il ne porte qu'un identifiant public déjà présent dans
// l'index.

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const connu = DETENTEURS.some((d) => d.id === id);

  if (connu) {
    const c = await cookies();
    c.set(COOKIE_DETENTEUR, id, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    });
  }

  return NextResponse.redirect(new URL(connu ? "/produits" : "/", req.url));
}
