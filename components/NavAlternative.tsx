"use client";

import { usePathname } from "next/navigation";
import { TabNav } from "./TabNav";

const PREFIXES = ["/sourcing", "/gamme", "/melanges", "/sentinelle", "/importation"];

function sous(path: string, href: string) {
  return path === href || path.startsWith(href + "/");
}

/** Gamme, Mélanges, Sentinelle, Importation : plus dans le ruban, ici sous Alternative. */
export function NavAlternative({
  cibles,
  gamme,
  melanges,
  sentinelle,
  importation,
}: {
  cibles: number;
  gamme: number;
  melanges: number;
  sentinelle: number;
  importation: number;
}) {
  const path = usePathname();
  if (!PREFIXES.some((p) => sous(path, p))) return null;

  return (
    <TabNav
      tabs={[
        {
          id: "cibles",
          label: "Cibles",
          href: "/sourcing",
          count: cibles,
          active: sous(path, "/sourcing"),
        },
        {
          id: "gamme",
          label: "Gamme",
          href: "/gamme",
          count: gamme,
          active: sous(path, "/gamme"),
        },
        {
          id: "melanges",
          label: "Mélanges",
          href: "/melanges",
          count: melanges,
          active: sous(path, "/melanges"),
        },
        {
          id: "sentinelle",
          label: "Sentinelle",
          href: "/sentinelle",
          count: sentinelle,
          active: sous(path, "/sentinelle"),
        },
        {
          id: "importation",
          label: "Importation",
          href: "/importation",
          count: importation,
          active: sous(path, "/importation"),
        },
      ]}
    />
  );
}
