import { NextResponse, type NextRequest } from "next/server";

// ────────────────────────────────────────────────────────────────────────────
// CODE D'ACCÈS — la prospection n'est pas publique.
//
// Le site reste ouvert (registres publics), mais le journal de prospection
// (fournisseurs contactés, molécules visées, messages) est une information
// commerciale. Ouvrir une fois /prospection?cle=<code> sur un appareil pose un
// cookie d'un an ; ensuite la page s'ouvre normalement. Code : variable
// d'environnement RASD_CLE_PROSPECTION sur Vercel. Sans elle, tout est fermé.
// ────────────────────────────────────────────────────────────────────────────

const COOKIE = "rasd_cle";

function egal(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

const PAGE_FERMEE = `<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Rasd — accès réservé</title><body style="font-family:system-ui,sans-serif;max-width:420px;margin:15vh auto;padding:0 20px;color:#1f2937">
<h1 style="font-size:20px">Prospection — accès réservé</h1>
<p style="color:#6b7280;font-size:14px">Entrez le code d'accès. Il sera retenu un an sur cet appareil.</p>
<form method="get" action="/prospection" style="display:flex;gap:8px"><input name="cle" type="password" autocomplete="current-password" required
style="flex:1;padding:8px 10px;border:1px solid #d1d5db;border-radius:8px"><button style="padding:8px 14px;border-radius:8px;border:0;background:#0f5c6e;color:#fff">Entrer</button></form></body></html>`;

export function middleware(req: NextRequest) {
  const attendu = process.env.RASD_CLE_PROSPECTION;
  const fourni = req.nextUrl.searchParams.get("cle");
  const cookie = req.cookies.get(COOKIE)?.value;

  if (attendu && fourni && egal(fourni, attendu)) {
    const url = req.nextUrl.clone();
    url.searchParams.delete("cle");
    const res = NextResponse.redirect(url);
    res.cookies.set(COOKIE, attendu, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 365 * 24 * 3600, path: "/" });
    return res;
  }
  if (attendu && cookie && egal(cookie, attendu)) return NextResponse.next();

  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ ok: false, erreur: "accès réservé" }, { status: 401 });
  }
  return new NextResponse(PAGE_FERMEE, { status: 401, headers: { "content-type": "text/html; charset=utf-8" } });
}

export const config = {
  matcher: ["/prospection", "/prospection/:path*", "/api/notifications/abonnement", "/api/notifications/test"],
};
