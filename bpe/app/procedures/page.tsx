import { Parcours } from "@/components/Parcours";
import { CULTURES } from "@/lib/corpus";
import { precedentsDe, preparerEssai } from "@/lib/essai";
import { etapeParId } from "@/lib/procedures";

export const metadata = { title: "Procédure" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ etape?: string; question?: string; culture?: string; cible?: string; m?: string | string[] }>;
}) {
  const sp = await searchParams;
  const essai = preparerEssai(sp);
  const etape = etapeParId(sp.etape);

  return (
    <Parcours
      etape={etape}
      question={sp.question ?? ""}
      cultureId={essai.culture?.id ?? ""}
      cultureNom={essai.culture?.nom ?? ""}
      cible={essai.cible}
      matiereIds={essai.matieres.map((m) => m.id)}
      matiereNoms={essai.matieres.map((m) => m.nom)}
      melanges={essai.melanges.map((m) => m.composants.join(" + "))}
      precedents={precedentsDe(essai).slice(0, 6)}
      cultures={CULTURES.map((c) => ({ value: c.id, label: c.nom }))}
      cibles={essai.cibles}
      matieres={essai.choixMatieres.map((m) => ({ value: m.id, label: m.nom }))}
    />
  );
}
