import { NextResponse, type NextRequest } from "next/server";
import { chercher } from "@/lib/recherche";

// L'index de recherche reste sur le serveur : plus de dix mille entrées, que
// l'on n'a aucune raison d'expédier au navigateur à chaque page. Le client
// envoie la saisie, le serveur renvoie douze suggestions.
//
// La route passe par le middleware d'authentification comme le reste de
// l'application : elle n'ouvre aucun accès qui ne le serait déjà.

export const dynamic = "force-dynamic";

export function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";

  // Une saisie démesurée ne peut venir d'une frappe au clavier.
  if (q.length > 80) {
    return NextResponse.json({ resultats: [] });
  }

  return NextResponse.json(
    { resultats: chercher(q) },
    { headers: { "Cache-Control": "no-store" } }
  );
}
