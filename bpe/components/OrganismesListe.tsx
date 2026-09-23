import { echeanceDe, LIBELLE_ECHEANCE } from "@/lib/organismes";
import type { Organisme } from "@/lib/types";

const STYLE: Record<string, string> = {
  expire: "text-[var(--bad)]",
  proche: "text-[var(--warn)]",
  valide: "text-[var(--accent)]",
  inconnue: "text-[var(--muted)]",
};

export function OrganismesListe({ organismes }: { organismes: Organisme[] }) {
  if (organismes.length === 0) {
    return (
      <p className="text-sm text-[var(--muted)]">
        Aucun organisme de l&apos;extrait ne couvre tous ces périmètres.
      </p>
    );
  }
  return (
    <ul className="grid gap-3">
      {organismes.map((o) => {
        const etat = echeanceDe(o.agrement.expiration);
        return (
          <li key={o.agrement.numero ?? o.nom} className="rounded border border-[var(--line)] bg-[var(--surface)] p-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-lg">{o.nom}</h3>
              <span className={`text-sm font-medium ${STYLE[etat]}`}>{LIBELLE_ECHEANCE[etat]}</span>
            </div>
            <p className="mt-1 text-sm">
              {o.agrement.numero ?? "—"} · {o.agrement.date ?? "—"} → {o.agrement.expiration ?? "—"}
            </p>
            <p className="mt-1 text-sm text-[var(--muted)]">{o.siege}</p>
            <p className="mt-1 text-sm">
              {o.telephone ?? "—"}
              {o.emails.length ? ` · ${o.emails.join(", ")}` : ""}
            </p>
            <p className="mt-2 text-sm">{o.couverture.join(" · ")}</p>
          </li>
        );
      })}
    </ul>
  );
}
