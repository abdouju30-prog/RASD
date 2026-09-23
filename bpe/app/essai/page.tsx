import Link from "next/link";
import { Emplois } from "@/components/Emplois";
import { CULTURES, MATIERES, MELANGES, cultureParIdDe, matiereParIdDe } from "@/lib/corpus";
import type { Emploi } from "@/lib/types";

export const metadata = { title: "Essai" };

function idsDe(m: string | string[] | undefined): string[] {
  const brut = Array.isArray(m) ? m : m ? [m] : [];
  return [...new Set(brut.filter(Boolean))].slice(0, 3);
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ culture?: string; cible?: string; m?: string | string[] }>;
}) {
  const sp = await searchParams;
  const culture = sp.culture ? cultureParIdDe(sp.culture) : undefined;
  const cible = (sp.cible ?? "").trim();
  const matieres = idsDe(sp.m)
    .map((id) => matiereParIdDe(id))
    .filter((x) => x !== undefined);
  const choixMatieres = culture
    ? MATIERES.filter((m) => m.cultures.includes(culture.nom))
    : MATIERES;
  const cibles = culture
    ? [...new Set(choixMatieres.flatMap((m) => m.emplois.filter((e) => e.culture === culture.nom).map((e) => e.cible)).filter(Boolean))].sort(
        (a, b) => a.localeCompare(b, "fr")
      )
    : [];

  const emplois: Emploi[] = [];
  const vus = new Set<string>();
  const sources = matieres.length ? matieres : culture ? choixMatieres : [];
  for (const m of sources) {
    for (const e of m.emplois) {
      if (culture && e.culture !== culture.nom) continue;
      if (cible && e.cible !== cible) continue;
      const k = `${e.culture}/${e.cible}/${e.doses.join("|")}/${e.dar.join("|")}`;
      if (vus.has(k)) continue;
      vus.add(k);
      emplois.push(e);
    }
  }

  const melanges =
    matieres.length >= 2
      ? MELANGES.filter((mix) => matieres.every((m) => mix.composantIds.includes(m.id)))
      : [];
  const apercu = emplois.slice(0, 30);

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
      <form className="grid gap-3 rounded border border-[var(--line)] bg-[var(--surface)] p-4">
        <label className="grid gap-1 text-sm">
          Culture
          <select name="culture" defaultValue={culture?.id ?? ""} className="rounded border border-[var(--line)] bg-[var(--bg)] px-2 py-2">
            <option value="">Choisir</option>
            {CULTURES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nom}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          Cible
          <select name="cible" defaultValue={cible} className="rounded border border-[var(--line)] bg-[var(--bg)] px-2 py-2">
            <option value="">Toutes</option>
            {cibles.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        {[0, 1, 2].map((i) => (
          <label key={i} className="grid gap-1 text-sm">
            Matière active {i + 1}
            {i === 0 ? "" : " (facultative)"}
            <select name="m" defaultValue={matieres[i]?.id ?? ""} className="rounded border border-[var(--line)] bg-[var(--bg)] px-2 py-2">
              <option value="">—</option>
              {choixMatieres.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nom}
                </option>
              ))}
            </select>
          </label>
        ))}
        <button className="rounded bg-[var(--accent)] px-3 py-2 text-[var(--accent-fg)] sm:w-fit">Préparer</button>
      </form>

      {culture && (
        <section className="grid gap-3">
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
