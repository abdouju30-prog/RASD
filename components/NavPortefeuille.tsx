"use client";

import { usePathname } from "next/navigation";
import { TabNav } from "./TabNav";

/** Radar + Signal + Matières + Produits + Homologations : un seul poste. */
export function NavPortefeuille({
  critiques,
  detections,
  matieres,
  produits,
}: {
  critiques: number;
  detections: number;
  matieres: number;
  produits: number;
}) {
  const path = usePathname();
  const ici =
    path === "/" ||
    path.startsWith("/veille") ||
    path.startsWith("/matieres") ||
    path.startsWith("/produits") ||
    path.startsWith("/usages");
  if (!ici) return null;

  return (
    <TabNav
      tabs={[
        {
          id: "vue",
          label: "Vue",
          href: "/",
          count: critiques,
          active: path === "/",
        },
        {
          id: "alertes",
          label: "Alertes",
          href: "/veille",
          count: detections,
          active: path.startsWith("/veille"),
        },
        {
          id: "matieres",
          label: "Matières",
          href: "/matieres",
          count: matieres,
          active: path.startsWith("/matieres"),
        },
        {
          id: "produits",
          label: "Produits",
          href: "/produits",
          count: produits,
          active: path.startsWith("/produits"),
        },
        {
          id: "homologations",
          label: "Homologations",
          href: "/usages",
          active: path.startsWith("/usages"),
        },
      ]}
    />
  );
}
