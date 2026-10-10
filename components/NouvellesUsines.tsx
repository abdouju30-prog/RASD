import Link from "next/link";
import { Factory } from "lucide-react";
import { fmtDate } from "@/lib/logic";
import { nouvellesUsines } from "@/lib/nouvelles-usines";

/** Nouvelles usines chinoises sur les molécules du détenteur, une par ligne. */
export function NouvellesUsines({ detenteurId, max = 5 }: { detenteurId: string; max?: number }) {
  const liste = nouvellesUsines(detenteurId);
  return (
    <section className="card" style={{ padding: "14px 18px", margin: "12px 0 0" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <Factory size={15} color="var(--accent)" />
        <strong style={{ fontFamily: "var(--tete)", fontSize: 14 }}>Nouvelles usines chinoises</strong>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>sur vos molécules, 60 derniers jours</span>
      </div>
      {liste.length ? (
        <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 13, lineHeight: 1.7 }}>
          {liste.slice(0, max).map((u) => (
            <li key={`${u.iso}-${u.societe}`}>
              <Link href={`/fournisseurs?source=chine&q=${encodeURIComponent(u.molecule)}`} className="link-accent">
                {u.molecule}
              </Link>{" "}
              — {u.nomLisible}
              {u.region ? ` (${u.region})` : ""} · {u.usine ? "usine" : "titulaire sans usine connue"} ·{" "}
              <span className="mono" style={{ fontSize: 11.5, color: "var(--muted-2)" }}>
                {fmtDate(u.date)}
              </span>
            </li>
          ))}
          {liste.length > max && (
            <li style={{ listStyle: "none", color: "var(--muted)" }}>… et {liste.length - max} autre(s)</li>
          )}
        </ul>
      ) : (
        <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 6 }}>
          Aucune nouvelle usine sur vos molécules depuis 60 jours.
        </div>
      )}
    </section>
  );
}
