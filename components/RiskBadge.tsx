import type { NiveauRisque } from "@/lib/types";
import { riskColorVar } from "@/lib/logic";
import { Pill } from "./Pill";

export function RiskBadge({ niveau, score }: { niveau: NiveauRisque; score?: number }) {
  const color = riskColorVar(niveau);
  return (
    <Pill
      color={color}
      label={niveau}
      detail={
        score !== undefined ? (
          <span className="mono" style={{ opacity: 0.75 }}>
            · {score}
          </span>
        ) : undefined
      }
    />
  );
}
