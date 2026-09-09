import Link from "next/link";
import { LienMatiere } from "@/components/LienMatiere";
import { Combine } from "lucide-react";
import type { Partenaire } from "@/lib/melanges";

// ────────────────────────────────────────────────────────────────────────────
// PARTENAIRES DE FORMULATION
//
// Avec quoi cette matière active se vend au Maroc. Pour une molécule qu'on
// détient déjà, c'est la liste des produits qu'on pourrait en tirer sans
// changer de fournisseur de base : le partenaire est la seule chose à sourcer.
// ────────────────────────────────────────────────────────────────────────────

export function Partenaires({ liste, max = 8 }: { liste: Partenaire[]; max?: number }) {
  if (liste.length === 0) return null;
  return (
    <div className="card" style={{ padding: "18px 20px" }}>
      <div className="h-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Combine size={14} /> Partenaires de formulation — {liste.length}
      </div>
      <table className="tbl" style={{ marginTop: 12 }}>
        <thead>
          <tr>
            <th>Associée à</th>
            <th style={{ textAlign: "right" }}>Produits</th>
            <th>Sous</th>
          </tr>
        </thead>
        <tbody>
          {liste.slice(0, max).map((p) => (
            <tr key={p.molecule}>
              <td style={{ fontWeight: 500 }}>
                <LienMatiere nom={p.molecule} />
              </td>
              <td className="mono" style={{ textAlign: "right", color: "var(--accent)", fontWeight: 600 }}>
                {p.nbProduits}
              </td>
              <td style={{ fontSize: 11.5, color: "var(--muted)" }}>
                {p.associations.slice(0, 2).join(" · ")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {liste.length > max && (
        <p style={{ fontSize: 11.5, color: "var(--muted-2)", marginTop: 8 }}>
          {liste.length - max} autres.
        </p>
      )}
      <p style={{ fontSize: 11.5, color: "var(--muted-2)", marginTop: 10, lineHeight: 1.55 }}>
        Associations homologuées au Maroc.{" "}
        <Link href="/melanges" className="link-accent">
          Celles qui manquent
        </Link>{" "}
        — un mélange s&apos;instruit pour lui-même, il n&apos;est pas l&apos;addition de deux
        dossiers.
      </p>
    </div>
  );
}
