import type { SocieteRusse } from "@/lib/russie";
import { etiquetteRusse } from "@/lib/cyrillique";

/** Nom russe : lecture française, cyrillique du catalogue en dessous. */
export function NomRusse({ s }: { s: SocieteRusse }) {
  return (
    <div>
      <div style={{ fontWeight: 500, lineHeight: 1.35 }}>
        {!s.identifie && (
          <span
            className="mono"
            style={{ color: "var(--muted-2)", fontWeight: 400, marginRight: 3 }}
            title="Transcription française du cyrillique — sert à lire, ne vaut pas identification"
          >
            ≈
          </span>
        )}
        {etiquetteRusse(s)}
      </div>
      <div style={{ fontSize: 11.5, color: "var(--muted-2)", marginTop: 1 }}>{s.nom}</div>
    </div>
  );
}
