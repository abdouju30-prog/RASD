import { NextResponse, type NextRequest } from "next/server";
import { interpreter } from "@/lib/recherche";

// L'index reste sur le serveur. Le client envoie la saisie ; la route
// renvoie les suggestions et, le cas échéant, une correction de frappe.
// Authentifiée comme le reste de l'application.

export const dynamic = "force-dynamic";

export function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";

  // Une saisie démesurée ne peut venir d'une frappe au clavier.
  if (q.length > 80) {
    return NextResponse.json({ resultats: [], correction: null });
  }

  return NextResponse.json(
    { ...interpreter(q) },
    { headers: { "Cache-Control": "no-store" } }
  );
}
