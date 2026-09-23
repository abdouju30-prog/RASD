import { NextResponse, type NextRequest } from "next/server";

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

function refuser(message: string) {
  return new NextResponse(message, {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="BPE", charset="UTF-8"',
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}

export function middleware(req: NextRequest) {
  const attendu = process.env.BPE_PASSWORD;
  const utilisateur = process.env.BPE_USER ?? "bpe";

  if (!attendu) {
    if (process.env.NODE_ENV === "production") {
      return new NextResponse(
        "BPE_PASSWORD n'est pas défini. L'accès est bloqué.",
        { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } }
      );
    }
    return NextResponse.next();
  }

  const entete = req.headers.get("authorization");
  if (!entete?.startsWith("Basic ")) return refuser("Authentification requise.");

  let decode: string;
  try {
    decode = decodeBase64(entete.slice(6));
  } catch {
    return refuser("En-tête d'authentification invalide.");
  }

  const sep = decode.indexOf(":");
  const u = sep >= 0 ? decode.slice(0, sep) : "";
  const p = sep >= 0 ? decode.slice(sep + 1) : "";
  if (!egal(u, utilisateur) || !egal(p, attendu)) return refuser("Identifiants incorrects.");
  return NextResponse.next();
}

function decodeBase64(b64: string): string {
  const binaire = atob(b64);
  const octets = Uint8Array.from(binaire, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(octets);
}

function egal(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const bufA = enc.encode(a);
  const bufB = enc.encode(b);
  const maxLen = Math.max(bufA.length, bufB.length, 1);
  let d = 0;
  for (let i = 0; i < maxLen; i++) d |= (bufA[i] ?? 0) ^ (bufB[i] ?? 0);
  d |= bufA.length ^ bufB.length;
  return d === 0;
}
