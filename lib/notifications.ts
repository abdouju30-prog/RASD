import { del, get, list, put } from "@vercel/blob";
import webpush, { type PushSubscription } from "web-push";
import { createHash } from "node:crypto";
import { JOURNAL, type Prospect } from "./prospection";

// ────────────────────────────────────────────────────────────────────────────
// NOTIFICATION DU MATIN — « Nouveau fournisseur : … » sur le téléphone.
//
// Les abonnements (un par appareil) vivent dans un store Vercel Blob PRIVÉ :
// le système de fichiers de Vercel est en lecture seule, et un abonnement ne
// doit pas finir dans le dépôt. Variables d'environnement :
//   BLOB_READ_WRITE_TOKEN   posée par Vercel en reliant le store au projet
//   VAPID_PRIVATE_KEY       clé privée de signature des notifications
//
// L'envoi est IDEMPOTENT : une notification par jour au plus, et seulement
// s'il existe un prospect du jour. Il peut donc être appelé sans secret — par
// la tâche quotidienne après son push, et par le cron Vercel en filet.
// ────────────────────────────────────────────────────────────────────────────

/** Clé publique VAPID — publique par nature, le navigateur en a besoin. */
export const VAPID_PUBLIC =
  "BMrLRPFWpQvqDwYt5wX6couWmXGhM4OYgCBzMDQGj31YMcbuuMQa_v_EAWYCh2ta_Zjo-0IWcbAh4yQzeOijNl0";
const VAPID_SUJET = "mailto:chraibi.agro@gmail.com";

const DOSSIER = "notifications/abonnements/";
const ENVOIS = "notifications/envois/";

function configurer(): boolean {
  const prive = process.env.VAPID_PRIVATE_KEY;
  if (!prive) return false;
  webpush.setVapidDetails(VAPID_SUJET, VAPID_PUBLIC, prive);
  return true;
}

function nomAbonnement(sub: PushSubscription): string {
  return DOSSIER + createHash("sha256").update(sub.endpoint).digest("hex").slice(0, 32) + ".json";
}

export function estAbonnement(x: unknown): x is PushSubscription {
  const s = x as PushSubscription;
  return !!s && typeof s.endpoint === "string" && s.endpoint.startsWith("https://") &&
    typeof s.keys?.p256dh === "string" && typeof s.keys?.auth === "string";
}

export async function enregistrer(sub: PushSubscription): Promise<void> {
  await put(nomAbonnement(sub), JSON.stringify(sub), {
    access: "private", addRandomSuffix: false, allowOverwrite: true, contentType: "application/json",
  });
}

export async function retirer(sub: PushSubscription): Promise<void> {
  await del(nomAbonnement(sub)).catch(() => undefined);
}

async function lire(chemin: string): Promise<string | null> {
  const r = await get(chemin, { access: "private", useCache: false });
  if (!r) return null;
  return await new Response(r.stream).text();
}

async function abonnements(): Promise<{ chemin: string; sub: PushSubscription }[]> {
  const { blobs } = await list({ prefix: DOSSIER });
  const out: { chemin: string; sub: PushSubscription }[] = [];
  for (const b of blobs) {
    const t = await lire(b.pathname).catch(() => null);
    if (!t) continue;
    try {
      const sub = JSON.parse(t);
      if (estAbonnement(sub)) out.push({ chemin: b.pathname, sub });
    } catch {
      /* abonnement illisible : ignoré */
    }
  }
  return out;
}

export interface Charge {
  title: string;
  body: string;
  url: string;
}

/** Envoie à tous les appareils ; retire ceux que le navigateur a révoqués. */
async function diffuser(charge: Charge, cibles?: PushSubscription[]): Promise<{ ok: number; echecs: number }> {
  const liste = cibles ? cibles.map((sub) => ({ chemin: nomAbonnement(sub), sub })) : await abonnements();
  let ok = 0;
  let echecs = 0;
  for (const { chemin, sub } of liste) {
    try {
      await webpush.sendNotification(sub, JSON.stringify(charge), { TTL: 6 * 3600 });
      ok++;
    } catch (e) {
      echecs++;
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await del(chemin).catch(() => undefined);
    }
  }
  return { ok, echecs };
}

export function jourCasablanca(d = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Casablanca" }).format(d);
}

export function chargeDuProspect(p: Prospect): Charge {
  const mols = p.molecules.slice(0, 3).join(", ") + (p.molecules.length > 3 ? "…" : "");
  return { title: `Nouveau fournisseur : ${p.fournisseur}`, body: `${p.pays} — ${mols}`, url: "/prospection" };
}

export type ResultatEnvoi =
  | { envoye: true; jour: string; appareils: number; echecs: number }
  | { envoye: false; jour: string; raison: string };

/** La notification du jour : une fois, s'il y a un prospect du jour. */
export async function envoyerDuJour(): Promise<ResultatEnvoi> {
  const jour = jourCasablanca();
  if (!configurer()) return { envoye: false, jour, raison: "clé VAPID absente" };
  const p = JOURNAL.find((x) => x.date === jour && x.statut !== "écarté");
  if (!p) return { envoye: false, jour, raison: "pas encore de fournisseur du jour dans ce déploiement" };
  const marque = `${ENVOIS}${jour}.json`;
  if (await lire(marque).catch(() => null)) return { envoye: false, jour, raison: "déjà envoyée aujourd'hui" };
  const r = await diffuser(chargeDuProspect(p));
  if (r.ok === 0) return { envoye: false, jour, raison: r.echecs ? "aucun appareil joignable" : "aucun appareil abonné" };
  await put(marque, JSON.stringify({ fournisseur: p.fournisseur, ...r }), {
    access: "private", addRandomSuffix: false, allowOverwrite: true, contentType: "application/json",
  });
  return { envoye: true, jour, appareils: r.ok, echecs: r.echecs };
}

/** Notification d'essai, vers un seul appareil — juste après l'abonnement. */
export async function envoyerEssai(sub: PushSubscription): Promise<boolean> {
  if (!configurer()) return false;
  const r = await diffuser(
    { title: "Rasd — notifications activées", body: "Le fournisseur du jour arrivera ici chaque matin.", url: "/prospection" },
    [sub],
  );
  return r.ok > 0;
}
