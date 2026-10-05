import { EXPLICATIONS, decoderPlan } from "@/lib/dispositif";

export function PlanDispositif({ plan }: { plan?: string }) {
  const blocs = decoderPlan(plan);
  const colonnes = Math.max(...blocs.map((l) => l.length), 1);
  return (
    <figure className="schema">
      <div className="grille-blocs">
        {blocs.map((ligne, i) => (
          <div key={i} className="rangee-bloc" style={{ gridTemplateColumns: `4.6rem repeat(${colonnes}, minmax(0, 1fr))` }}>
            <span className="etiquette">Bloc {i + 1}</span>
            {ligne.map((mod, j) => (
              <span key={j} className={`case-mod ${mod === "T0" ? "t0" : ""} ${mod === "R" ? "ref" : ""}`}>
                {mod}
                <span className="num-parcelle" />
              </span>
            ))}
          </div>
        ))}
      </div>
      <ul className="explications">
        {EXPLICATIONS.filter((e) => e.code === "Bloc" || e.code === "Parcelle" || blocs.some((l) => l.includes(e.code))).map((e) => (
          <li key={e.code}>
            <strong>{e.code}</strong> {e.texte}
          </li>
        ))}
      </ul>
    </figure>
  );
}
