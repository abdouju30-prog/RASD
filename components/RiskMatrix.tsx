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
export function RiskMatrix({
  points,
  labelY,
  maxEtiquettes = 16,
}: {
  points: MatrixPoint[];
  labelY: string;
  /** Plafond d'étiquettes, avant même l'évitement des collisions. */
  maxEtiquettes?: number;
}) {
  const W = 1000;
  const H = 430;
  const ml = 62;
  const mr = 30;
  const mt = 24;
  const mb = 46;
  const pw = W - ml - mr;
  const ph = H - mt - mb;

  const maxE = Math.max(...points.map((p) => p.expo), 1);
  const x = (score: number) => ml + (score / 100) * pw;
  const y = (e: number) => mt + ph - (e / maxE) * ph;
  const r = (e: number) => 6 + (e / maxE) * 16;

  const seuilRisque = 55;
  const seuilExpo = maxE * 0.35;

  // ── Étiquetage ────────────────────────────────────────────────────────────
  // Un portefeuille de 65 molécules empile les points en bas à gauche, là où
  // le risque et l'exposition sont faibles. Plafonner le nombre d'étiquettes
  // ne suffit pas : il faut aussi refuser celles qui recouvriraient une
  // voisine. On sert d'abord les points qui appellent une décision — risque le
  // plus élevé, puis exposition — et on saute les suivantes si la place est
  // déjà prise. Les bulles restent tracées : la densité reste lisible.
  const CH = 6.1; // largeur moyenne d'un caractère à 11,5 px
  const HL = 13; // hauteur d'une étiquette
  const places: { x1: number; y1: number; x2: number; y2: number }[] = [];
  const etiquettes = new Map<string, { tx: number; ty: number }>();

  for (const p of [...points].sort((a, b) => b.score - a.score || b.expo - a.expo)) {
    if (etiquettes.size >= maxEtiquettes) break;
    const rayon = r(p.expo);
    const cx = x(p.score);
    const cy = y(p.expo);
    const largeur = p.nom.length * CH;

    // À droite par défaut ; à gauche si l'étiquette sortirait du cadre.
    const aGauche = cx + rayon + 6 + largeur > W - 4;
    const tx = aGauche ? cx - rayon - 6 - largeur : cx + rayon + 6;
    const ty = cy + 4;
    const boite = { x1: tx - 2, y1: ty - HL + 3, x2: tx + largeur + 2, y2: ty + 4 };

    const chevauche = places.some(
      (b) => !(boite.x2 < b.x1 || boite.x1 > b.x2 || boite.y2 < b.y1 || boite.y1 > b.y2)
    );
    if (chevauche) continue;

    places.push(boite);
    etiquettes.set(p.id, { tx: aGauche ? tx + largeur : tx, ty });
  }

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
        x={18}
        y={mt + ph / 2}
        fill="var(--muted)"
        fontSize={12}
        textAnchor="middle"
        transform={`rotate(-90 18 ${mt + ph / 2})`}
      >
        {labelY} →
      </text>
      <text x={x(seuilRisque) + 8} y={mt + 14} fill="var(--crit)" fontSize={11} fontWeight={600}>
        Substituer + homologuer
      </text>

      {points.map((p) => {
        const c = riskColorVar(niveauRisque(p.score));
        const cx = x(p.score);
        const cy = y(p.expo);
        const et = etiquettes.get(p.id);
        return (
          <a key={p.id} href={`/matieres/${p.id}`}>
            {/* Une seule chaîne : React refuse un tableau d'enfants dans <title>. */}
            <title>{`${p.nom} — risque ${p.score}, ${p.expo} usage(s)`}</title>
            <circle cx={cx} cy={cy} r={r(p.expo)} fill={c} opacity={0.22} stroke={c} strokeWidth={1.5} />
            {et && (
              <text
                x={et.tx}
                y={et.ty}
                fill="var(--fg)"
                fontSize={11.5}
                textAnchor={et.tx < cx ? "end" : "start"}
                style={{ pointerEvents: "none" }}
              >
                {p.nom}
              </text>
            )}
          </a>
        );
      })}
    </svg>
  );
}
