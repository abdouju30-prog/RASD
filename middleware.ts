import { NextResponse, type NextRequest } from "next/server";

// ────────────────────────────────────────────────────────────────────────────
// Protection par mot de passe (HTTP Basic).
//
// L'application expose le portefeuille commercial d'un détenteur : AMM,
// fournisseurs, usages, échéances. Elle ne doit jamais être accessible sans
// authentification en ligne.
//
// Comportement volontairement « fail-closed » : en production, l'absence de
// HOMOLOGA_PASSWORD bloque l'accès plutôt que de l'ouvrir. En développement
// local, l'accès reste libre tant que la variable n'est pas définie.
//
// Configuration Vercel : Settings → Environment Variables
//   HOMOLOGA_USER      (optionnel, défaut « phytobeht »)
//   HOMOLOGA_PASSWORD  (obligatoire en production)
//
// ⚠️ Ce middleware tourne sur l'Edge Runtime (Vercel) : pas de Buffer ni
//    de crypto.timingSafeEqual (Node.js uniquement). On utilise TextEncoder
//    et une boucle XOR manuelle avec padding à longueur fixe.
// ────────────────────────────────────────────────────────────────────────────

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

function refuser(message: string) {
  return new NextResponse(message, {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Homologa", charset="UTF-8"',
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}

export function middleware(req: NextRequest) {
  const attendu = process.env.HOMOLOGA_PASSWORD;
  const utilisateur = process.env.HOMOLOGA_USER ?? "phytobeht";

  if (!attendu) {
    if (process.env.NODE_ENV === "production") {
      return new NextResponse(
        "Configuration incomplète : la variable d'environnement HOMOLOGA_PASSWORD " +
          "n'est pas définie. L'accès est bloqué tant qu'elle ne l'est pas.",
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

  if (!egal(u, utilisateur) || !egal(p, attendu)) {
    return refuser("Identifiants incorrects.");
  }
  return NextResponse.next();
}

/** Décodage Base64 compatible Edge Runtime (supporte UTF-8). */
function decodeBase64(b64: string): string {
  const binaire = atob(b64);
  const octets = Uint8Array.from(binaire, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(octets);
}

/**
 * Comparaison à durée constante — évite de fuiter la longueur ou le contenu
 * au timing. Compatible Edge Runtime (pas de crypto.timingSafeEqual).
 *
 * Les deux chaînes sont encodées en octets UTF-8 puis paddées à la même
 * longueur avant la boucle XOR, qui parcourt TOUJOURS le tableau entier.
 * La longueur réelle est vérifiée séparément sans court-circuit.
 */
function egal(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const bufA = enc.encode(a);
  const bufB = enc.encode(b);
  const maxLen = Math.max(bufA.length, bufB.length, 1);

  let d = 0;
  for (let i = 0; i < maxLen; i++) {
    d |= (bufA[i] ?? 0) ^ (bufB[i] ?? 0);
  }
  // Vérifier la longueur réelle sans court-circuiter la boucle XOR
  d |= bufA.length ^ bufB.length;
  return d === 0;
}


