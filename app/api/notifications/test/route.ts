import { NextResponse } from "next/server";
import { envoyerEssai, estAbonnement } from "@/lib/notifications";

export const runtime = "nodejs";

// Protégé par middleware.ts. Une notification d'essai vers l'appareil qui vient de s'abonner.
export async function POST(req: Request) {
  const sub = await req.json().catch(() => null);
  if (!estAbonnement(sub)) return NextResponse.json({ ok: false }, { status: 400 });
  return NextResponse.json({ ok: await envoyerEssai(sub) });
}
