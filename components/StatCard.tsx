export function StatCard({
  label,
  value,
  unit,
  sub,
  tone = "default",
}: {
  label: string;
  value: string;
  unit?: string;
  sub?: string;
  tone?: "default" | "crit" | "high" | "mod" | "low";
}) {
  const toneColor =
    tone === "crit"
      ? "var(--crit)"
      : tone === "high"
      ? "var(--high)"
      : tone === "mod"
      ? "var(--mod)"
      : tone === "low"
      ? "var(--low)"
      : "var(--fg)";
  return (
    <div className="card" style={{ padding: "16px 18px" }}>
      <div className="eyebrow">{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 10 }}>
        <span className="mono" style={{ fontSize: 28, fontWeight: 600, color: toneColor, lineHeight: 1 }}>
          {value}
        </span>
        {unit && <span style={{ fontSize: 14, color: "var(--muted)" }}>{unit}</span>}
      </div>
      {sub && <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 8 }}>{sub}</div>}
    </div>
  );
}
