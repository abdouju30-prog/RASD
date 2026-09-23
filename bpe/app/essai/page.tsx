import Link from "next/link";
import { Emplois } from "@/components/Emplois";
import { FormulaireEssai } from "@/components/FormulaireEssai";
import { CULTURES } from "@/lib/corpus";
import { parametresEssai, preparerEssai } from "@/lib/essai";

export const metadata = { title: "Essai" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ culture?: string; cible?: string; m?: string | string[] }>;
}) {
  const essai = preparerEssai(await searchParams);
  const { culture, cible, matieres, choixMatieres, cibles, emplois, melanges } = essai;
  const apercu = emplois.slice(0, 30);
  const q = parametresEssai(culture?.id ?? "", cible, matieres.map((m) => m.id));

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl">Préparer un essai</h1>
        <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">
          Le formulaire remplit une grille. Il ne dépose rien et n&apos;autorise rien.{" "}
          <Link href="/procedures/protocole">Protocole</Link>
          {" · "}
          <Link href="/procedures/melange">Mélange</Link>
        </p>
      </div>
      <FormulaireEssai
        cultures={CULTURES.map((c) => ({ value: c.id, label: c.nom }))}
        cibles={cibles}
        matieres={choixMatieres.map((m) => ({ value: m.id, label: m.nom }))}
        culture={culture?.id ?? ""}
        cible={cible}
        matiereIds={matieres.map((m) => m.id)}
      />

      {culture && (
        <section id="grille" className="grid gap-3">
          <h2 className="text-2xl">Grille</h2>
          <ul className="grid gap-1 text-sm">
            <li>Culture : {culture.nom}</li>
            <li>Cible : {cible || "à préciser"}</li>
            <li>
              Matières : {matieres.length ? matieres.map((m) => m.nom).join(", ") : "non choisies — spectre de la culture"}
            </li>
            <li>
              Mélange formulé :{" "}
              {matieres.length < 2
                ? "choisir au moins deux matières"
                : melanges.length
                  ? melanges.map((m) => m.composants.join(" + ")).join(" ; ")
                  : "aucun dans l'extrait — mélange en cuve non couvert, essai en bocal avant application"}
            </li>
          </ul>
          {melanges.map((m) => (
            <p key={m.id} className="text-sm">
              <Link href={`/melanges/${m.id}`}>{m.composants.join(" + ")}</Link>
            </p>
          ))}
          <p>
            <Link href={q ? `/rapport?${q}` : "/rapport"} className="bouton">
              Feuille de terrain (PDF)
            </Link>
          </p>
          <h3 className="text-xl">Précédents de dose et de DAR</h3>
          <p className="text-sm text-[var(--muted)]">
            {emplois.length} emploi(s){emplois.length > apercu.length ? `, ${apercu.length} affichés` : ""}.
          </p>
          <Emplois lignes={apercu} />
        </section>
      )}
    </div>
  );
}
