import { NextResponse, type NextRequest } from "next/server";
import { interpreter } from "@/lib/recherche";
import { estObjet, estRegistre, type FiltresRecherche } from "@/lib/filtres-recherche";

// L'index reste sur le serveur. Le client envoie la saisie et, le cas
// échéant, les filtres de registre / d'objet ; la route renvoie les
// suggestions.

export const dynamic = "force-dynamic";

function liste<T extends string>(brut: string | null, ok: (s: string) => s is T): T[] {
  if (!brut) return [];
  return brut
    .split(",")
    .map((s) => s.trim())
    .filter(ok);
}

export function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";

  // Une saisie démesurée ne peut venir d'une frappe au clavier.
  if (q.length > 80) {
    return NextResponse.json({ resultats: [], correction: null });
  }

  const filtres: FiltresRecherche = {
    registres: liste(req.nextUrl.searchParams.get("registre"), estRegistre),
    objets: liste(req.nextUrl.searchParams.get("objet"), estObjet),
  };

  return NextResponse.json(
    { ...interpreter(q, 16, filtres) },
    { headers: { "Cache-Control": "no-store" } }
  );
}
