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
    decode = atob(entete.slice(6));
  } catch {
    return refuser("En-tête d'authentification invalide.");
  }

  const sep = decode.indexOf(":");
  const u = sep >= 0 ? decode.slice(0, sep) : "";
  const p = sep >= 0 ? decode.slice(sep + 1) : "";

  if (u !== utilisateur || !egal(p, attendu)) {
    return refuser("Identifiants incorrects.");
  }
  return NextResponse.next();
}

/** Comparaison à durée constante — évite de fuiter le mot de passe au timing. */
function egal(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
