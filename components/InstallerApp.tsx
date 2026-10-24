"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

// Bouton « Installer Rasd » : Chrome, Edge et Brave exposent l'invite par
// `beforeinstallprompt` ; Safari (iPhone, iPad) n'en a pas, on explique le
// geste. Rien ne s'affiche dans l'application déjà installée.

type InviteInstall = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export function InstallerApp() {
  const [invite, setInvite] = useState<InviteInstall | null>(null);
  const [ios, setIos] = useState(false);
  const [aide, setAide] = useState(false);
  const [masque, setMasque] = useState(true);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    const installee =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (installee) return;
    try {
      if (localStorage.getItem("rasd-install-masque") === "1") return;
    } catch {}
    const ua = navigator.userAgent;
    const estIos = /iPhone|iPad|iPod/.test(ua);
    setIos(estIos);
    setMasque(false);
    const avant = (e: Event) => {
      e.preventDefault();
      setInvite(e as InviteInstall);
    };
    const fait = () => setMasque(true);
    window.addEventListener("beforeinstallprompt", avant);
    window.addEventListener("appinstalled", fait);
    return () => {
      window.removeEventListener("beforeinstallprompt", avant);
      window.removeEventListener("appinstalled", fait);
    };
  }, []);

  if (masque || (!invite && !ios)) return null;

  const fermer = () => {
    setMasque(true);
    try { localStorage.setItem("rasd-install-masque", "1"); } catch {}
  };

  const installer = async () => {
    if (invite) {
      await invite.prompt();
      const r = await invite.userChoice;
      if (r.outcome === "accepted") setMasque(true);
      setInvite(null);
    } else {
      setAide((v) => !v);
    }
  };

  return (
    <div
      style={{
        position: "fixed", right: 16, bottom: 16, zIndex: 50, display: "flex", flexDirection: "column",
        alignItems: "flex-end", gap: 8,
      }}
    >
      {aide && (
        <div className="card" style={{ padding: "10px 14px", fontSize: 12.5, maxWidth: 260, lineHeight: 1.5 }}>
          Sur iPhone / iPad : touchez <strong>Partager</strong>, puis <strong>Sur l&apos;écran d&apos;accueil</strong>.
        </div>
      )}
      <div style={{ display: "flex", gap: 6 }}>
        <button
          onClick={installer}
          style={{
            display: "inline-flex", alignItems: "center", gap: 7, background: "var(--accent)", color: "#fff",
            border: 0, borderRadius: 999, padding: "9px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer",
            boxShadow: "0 4px 14px rgba(0,0,0,.18)",
          }}
        >
          <Download size={15} aria-hidden /> Installer Rasd
        </button>
        <button
          onClick={fermer}
          aria-label="Ne plus proposer"
          title="Ne plus proposer"
          style={{
            background: "var(--card)", color: "var(--muted)", border: "1px solid var(--border)",
            borderRadius: 999, width: 34, cursor: "pointer", display: "grid", placeItems: "center",
          }}
        >
          <X size={14} aria-hidden />
        </button>
      </div>
    </div>
  );
}
