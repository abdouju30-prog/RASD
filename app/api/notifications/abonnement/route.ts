import { NextResponse } from "next/server";
import { enregistrer, estAbonnement, retirer } from "@/lib/notifications";

export const runtime = "nodejs";

// Protégé par middleware.ts (code d'accès) : seul l'utilisateur abonne ses appareils.

export async function POST(req: Request) {
  const sub = await req.json().catch(() => null);
  if (!estAbonnement(sub)) return NextResponse.json({ ok: false, erreur: "abonnement invalide" }, { status: 400 });
  await enregistrer(sub);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const sub = await req.json().catch(() => null);
  if (!estAbonnement(sub)) return NextResponse.json({ ok: false }, { status: 400 });
  await retirer(sub);
  return NextResponse.json({ ok: true });
}
