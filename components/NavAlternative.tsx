"use client";

import { usePathname } from "next/navigation";
import { TabNav } from "./TabNav";

const PISTES = ["/pistes", "/gamme", "/melanges", "/sentinelle", "/importation"];

function sous(path: string, href: string) {
  return path === href || path.startsWith(href + "/");
}

/**
 * Sous Alternative : les cibles, et une seule page pour les autres pistes
 * (Gamme, Mélanges, Sentinelle, Importation), dont chaque détail reste ouvert.
 */
export function NavAlternative({ cibles, pistes }: { cibles: number; pistes: number }) {
  const path = usePathname();
  if (!sous(path, "/sourcing") && !PISTES.some((p) => sous(path, p))) return null;

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
          id: "pistes",
          label: "Autres pistes",
          href: "/pistes",
          count: pistes,
          active: PISTES.some((p) => sous(path, p)),
        },
      ]}
    />
  );
}
