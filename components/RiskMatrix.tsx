import { niveauRisque, riskColorVar } from "@/lib/logic";

export interface MatrixPoint {
  id: string;
  nom: string;
  score: number;
  /** Exposition du portefeuille : usages détenus, ou CA si renseigné. */
  expo: number;
}

// Matrice risque réglementaire (X) × exposition du portefeuille (Y).
// Le quadrant haut-droit = « substituer et homologuer une alternative en priorité ».
export function RiskMatrix({ points, labelY }: { points: MatrixPoint[]; labelY: string }) {
  const W = 720;
  const H = 420;
  const ml = 58;
  const mr = 150;
  const mt = 20;
  const mb = 46;
  const pw = W - ml - mr;
  const ph = H - mt - mb;

  const maxE = Math.max(...points.map((p) => p.expo), 1);
  const x = (score: number) => ml + (score / 100) * pw;
  const y = (e: number) => mt + ph - (e / maxE) * ph;
  const r = (e: number) => 7 + (e / maxE) * 17;

  const seuilRisque = 55;
  const seuilExpo = maxE * 0.35;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Matrice risque × exposition">
      <rect
        x={x(seuilRisque)}
        y={mt}
        width={x(100) - x(seuilRisque)}
        height={y(seuilExpo) - mt}
        fill="var(--crit)"
        opacity={0.07}
      />
      {[0, 25, 50, 75, 100].map((v) => (
        <line key={v} x1={x(v)} y1={mt} x2={x(v)} y2={mt + ph} stroke="var(--border)" strokeWidth={1} />
      ))}
      <line x1={ml} y1={mt + ph} x2={ml + pw} y2={mt + ph} stroke="var(--border-strong)" strokeWidth={1} />
      <line
        x1={x(seuilRisque)}
        y1={mt}
        x2={x(seuilRisque)}
        y2={mt + ph}
        stroke="var(--crit)"
        strokeWidth={1}
        strokeDasharray="4 4"
        opacity={0.5}
      />
      <line
        x1={ml}
        y1={y(seuilExpo)}
        x2={ml + pw}
        y2={y(seuilExpo)}
        stroke="var(--muted-2)"
        strokeWidth={1}
        strokeDasharray="4 4"
        opacity={0.4}
      />

      <text x={ml + pw / 2} y={H - 12} fill="var(--muted)" fontSize={12} textAnchor="middle">
        Score de risque réglementaire →
      </text>
      <text
        x={16}
        y={mt + ph / 2}
        fill="var(--muted)"
        fontSize={12}
        textAnchor="middle"
        transform={`rotate(-90 16 ${mt + ph / 2})`}
      >
        {labelY} →
      </text>
      <text x={x(seuilRisque) + 8} y={mt + 16} fill="var(--crit)" fontSize={11} fontWeight={600}>
        Substituer + homologuer
      </text>

      {points.map((p) => {
        const c = riskColorVar(niveauRisque(p.score));
        const cx = x(p.score);
        const cy = y(p.expo);
        return (
          <a key={p.id} href={`/matieres/${p.id}`}>
            <circle cx={cx} cy={cy} r={r(p.expo)} fill={c} opacity={0.22} stroke={c} strokeWidth={1.5} />
            <text
              x={cx + r(p.expo) + 6}
              y={cy + 4}
              fill="var(--fg)"
              fontSize={11.5}
              style={{ pointerEvents: "none" }}
            >
              {p.nom}
            </text>
          </a>
        );
      })}
    </svg>
  );
}
