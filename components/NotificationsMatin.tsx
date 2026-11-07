"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";

type Etat = "inconnu" | "non-supporte" | "refuse" | "inactif" | "actif" | "en-cours" | "erreur";

function cleBinaire(base64: string): ArrayBuffer {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const b = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(b.length));
  for (let i = 0; i < b.length; i++) out[i] = b.charCodeAt(i);
  return out.buffer;
}

/**
 * « Recevoir la notification du matin sur cet appareil. »
 * Sur iPhone, les notifications web ne marchent qu'une fois Rasd ajouté à
 * l'écran d'accueil (Partager → Sur l'écran d'accueil), puis ouvert de là.
 */
export function NotificationsMatin({ clePublique }: { clePublique: string }) {
  const [etat, setEtat] = useState<Etat>("inconnu");
  const [message, setMessage] = useState("");

  useEffect(() => {
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        setEtat("non-supporte");
        return;
      }
      if (Notification.permission === "denied") return setEtat("refuse");
      const reg = await navigator.serviceWorker.register("/sw.js");
      const sub = await reg.pushManager.getSubscription();
      setEtat(sub ? "actif" : "inactif");
    })().catch(() => setEtat("erreur"));
  }, []);

  async function activer() {
    setEtat("en-cours");
    setMessage("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return setEtat("refuse");
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: cleBinaire(clePublique) }));
      const corps = JSON.stringify(sub.toJSON());
      const r = await fetch("/api/notifications/abonnement", { method: "POST", headers: { "content-type": "application/json" }, body: corps });
      if (!r.ok) throw new Error(`enregistrement refusé (${r.status})`);
      const t = await fetch("/api/notifications/test", { method: "POST", headers: { "content-type": "application/json" }, body: corps });
      const ok = t.ok && (await t.json()).ok;
      setEtat("actif");
      setMessage(ok ? "Notification d'essai envoyée sur cet appareil." : "Abonné, mais l'essai n'est pas parti : réessayez plus tard.");
    } catch (e) {
      setEtat("erreur");
      setMessage((e as Error).message);
    }
  }

  async function desactiver() {
    setEtat("en-cours");
    const reg = await navigator.serviceWorker.getRegistration("/sw.js");
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await fetch("/api/notifications/abonnement", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify(sub.toJSON()) }).catch(() => undefined);
      await sub.unsubscribe();
    }
    setEtat("inactif");
    setMessage("Cet appareil ne recevra plus la notification du matin.");
  }

  const texte: Record<Etat, string> = {
    inconnu: "…",
    "non-supporte": "Ce navigateur ne reçoit pas de notifications web. Sur iPhone : ajoutez Rasd à l'écran d'accueil, puis ouvrez-le de là.",
    refuse: "Notifications bloquées pour ce site : autorisez-les dans les réglages du navigateur.",
    inactif: "",
    actif: "Cet appareil reçoit la notification du matin.",
    "en-cours": "…",
    erreur: "Échec de l'activation.",
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", fontSize: 13, margin: "0 0 14px" }}>
      {etat === "actif" ? (
        <button type="button" className="pill" onClick={desactiver} style={{ cursor: "pointer", display: "inline-flex", gap: 5, alignItems: "center" }}>
          <BellOff size={14} /> Arrêter sur cet appareil
        </button>
      ) : (
        <button
          type="button"
          className="pill"
          onClick={activer}
          disabled={etat === "en-cours" || etat === "non-supporte" || etat === "refuse"}
          style={{ cursor: "pointer", display: "inline-flex", gap: 5, alignItems: "center", color: "var(--accent)" }}
        >
          <Bell size={14} /> Recevoir la notification du matin sur cet appareil
        </button>
      )}
      <span style={{ color: etat === "erreur" || etat === "refuse" ? "var(--crit)" : "var(--muted)" }}>
        {[texte[etat], message].filter(Boolean).join(" ")}
      </span>
    </div>
  );
}
