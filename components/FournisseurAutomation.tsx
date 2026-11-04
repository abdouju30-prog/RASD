"use client";

import { useMemo, useState } from "react";

type Props = { nom: string; matieres: string[] };

export function FournisseurAutomation({ nom, matieres }: Props) {
  const [ouvert, setOuvert] = useState(false);
  const message = useMemo(() => `Objet : Demande de coopération — produits phytosanitaires pour le Maroc

Bonjour,

Nous sommes Phyto Beht et étudions des matières actives et formulations pour une future évaluation auprès de l’ONSSA.

Votre société ${nom} a été identifiée dans notre recherche. Merci de transmettre votre catalogue PDF, les fabricants et sites de production, les droits de fourniture et licences, ainsi que les éléments disponibles pour : ${matieres.slice(0, 6).join(", ") || "vos produits phytosanitaires"}.

Merci d’indiquer le MOQ, les prix, délais, capacité, Incoterm, certificats, COA, SDS/MSDS, TDS, composition, étiquette, données toxicologiques et résidus, stabilité, et les enregistrements dans un pays de l’OCDE lorsque cela est requis pour l’évaluation ONSSA.

Message préparé, non envoyé.`, [nom, matieres]);

  async function activerNotifications() {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return;
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      await navigator.serviceWorker.register("/sw.js");
      new Notification("Rasd — notifications activées", { body: "Les alertes Fournisseurs sont activées sur ce téléphone." });
    }
  }

  return (
    <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
      <button type="button" className="pill" onClick={() => setOuvert((v) => !v)} style={{ cursor: "pointer", color: "var(--accent)" }}>
        {ouvert ? "Masquer le message" : "Générer le message"}
      </button>
      <button type="button" className="pill" onClick={activerNotifications} style={{ cursor: "pointer" }}>
        Activer les notifications
      </button>
      {ouvert && <textarea readOnly value={message} aria-label={`Message préparé pour ${nom}`} style={{ width: "100%", minHeight: 180, marginTop: 4, padding: 10, borderRadius: 8, border: "1px solid var(--border-strong)", background: "var(--card)", color: "var(--fg)", fontSize: 12, lineHeight: 1.5 }} />}
    </div>
  );
}
