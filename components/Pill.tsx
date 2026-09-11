import type { ReactNode } from "react";

// ────────────────────────────────────────────────────────────────────────────
// PILL — pastille colorée « point + libellé », partagée par RiskBadge et
// StatusPill qui reproduisaient à l'identique le même color-mix bordure/fond.
//
// Les ratios de teinte sont exposés (borderPct/bgPct) pour conserver au pixel
// les nuances existantes de chaque appelant, sans perte visuelle.
// ────────────────────────────────────────────────────────────────────────────

export function Pill({
  color,
  label,
  detail,
  borderPct = 40,
  bgPct = 12,
}: {
  color: string;
  label: ReactNode;
  detail?: ReactNode;
  borderPct?: number;
  bgPct?: number;
}) {
  return (
    <span
      className="pill"
      style={{
        color,
        borderColor: `color-mix(in srgb, ${color} ${borderPct}%, transparent)`,
        background: `color-mix(in srgb, ${color} ${bgPct}%, transparent)`,
      }}
    >
      <span className="dot" style={{ background: color }} />
      {label}
      {detail}
    </span>
  );
}
