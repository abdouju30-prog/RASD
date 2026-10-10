"use client";

import { useState } from "react";

/** Bloc de texte avec un bouton « Copier » — pour coller dans LinkedIn ou un courriel. */
export function CopierTexte({ texte }: { texte: string }) {
  const [copie, setCopie] = useState(false);
  return (
    <div>
      <pre
        style={{
          whiteSpace: "pre-wrap",
          fontFamily: "inherit",
          fontSize: 12.5,
          lineHeight: 1.6,
          margin: "0 0 8px",
          padding: "10px 12px",
          border: "1px solid var(--border)",
          borderRadius: 6,
          background: "var(--fond, transparent)",
        }}
      >
        {texte}
      </pre>
      <button
        type="button"
        style={{
          padding: "6px 14px",
          fontSize: 12.5,
          fontWeight: 600,
          borderRadius: 6,
          border: "1px solid var(--accent)",
          background: "var(--accent)",
          color: "#fff",
          cursor: "pointer",
        }}
        onClick={async () => {
          await navigator.clipboard.writeText(texte);
          setCopie(true);
          setTimeout(() => setCopie(false), 2000);
        }}
      >
        {copie ? "Copié ✓" : "Copier"}
      </button>
    </div>
  );
}
