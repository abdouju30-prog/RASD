import type { NiveauRisque } from "@/lib/types";
import { riskColorVar } from "@/lib/logic";

export function RiskBadge({ niveau, score }: { niveau: NiveauRisque; score?: number }) {
  const color = riskColorVar(niveau);
  return (
    <span
      className="pill"
      style={{
        color,
        borderColor: "color-mix(in srgb, " + color + " 40%, transparent)",
        background: "color-mix(in srgb, " + color + " 12%, transparent)",
      }}
    >
      <span className="dot" style={{ background: color }} />
      {niveau}
      {score !== undefined && <span className="mono" style={{ opacity: 0.75 }}>· {score}</span>}
    </span>
  );
}
