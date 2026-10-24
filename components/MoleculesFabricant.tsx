import Link from "next/link";
import { LienMatiere } from "@/components/LienMatiere";
import { decouperMelange, hrefMelange } from "@/lib/melange-annuaire";

// Colonne « Molécules » de l'annuaire : une molécule ouvre sa fiche, un
// mélange ouvre la fiche du MÉLANGE (et non celle d'un seul composant).
// Ce qui n'est pas reconnu reste du texte — voir lib/melange-annuaire.ts.

function Entree({ m }: { m: string }) {
  const comps = decouperMelange(m);
  if (comps.length >= 2) {
    return (
      <Link href={hrefMelange(comps)} className="link-accent" title="Fiche du mélange">
        {comps.join(" + ")}
      </Link>
    );
  }
  return <LienMatiere nom={m} />;
}

function Liste({ liste }: { liste: string[] }) {
  return (
    <>
      {liste.map((m, i) => (
        <span key={`${m}-${i}`}>
          {i > 0 && <span style={{ color: "var(--muted-2)" }}>, </span>}
          <Entree m={m} />
        </span>
      ))}
    </>
  );
}

export function MoleculesFabricant({ molecules, max = 5 }: { molecules: string[]; max?: number }) {
  if (!molecules.length) return <>—</>;
  const debut = molecules.slice(0, max);
  const reste = molecules.slice(max);
  return (
    <>
      {molecules.length} — <Liste liste={debut} />
      {reste.length > 0 && (
        <details style={{ display: "inline" }}>
          <summary className="mono" style={{ display: "inline", cursor: "pointer", marginLeft: 4 }}>
            +{reste.length}
          </summary>
          <Liste liste={reste} />
        </details>
      )}
    </>
  );
}
