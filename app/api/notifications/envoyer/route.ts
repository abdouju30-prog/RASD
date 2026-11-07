import { NextResponse } from "next/server";
import { envoyerDuJour } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Idempotent : au plus une notification par jour, et seulement s'il existe un
// fournisseur du jour. Appelé par la tâche quotidienne après son push, et par
// le cron Vercel (vercel.json) en filet. La réponse ne nomme pas le fournisseur.
async function traiter() {
  try {
    return NextResponse.json(await envoyerDuJour());
  } catch (e) {
    return NextResponse.json({ envoye: false, raison: `erreur : ${(e as Error).message}` }, { status: 500 });
  }
}

export const GET = traiter;
export const POST = traiter;
