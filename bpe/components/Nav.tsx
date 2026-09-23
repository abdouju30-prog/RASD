"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LIENS = [
  { href: "/spectre", label: "Spectre" },
  { href: "/cultures", label: "Cultures" },
  { href: "/melanges", label: "Mélanges" },
  { href: "/organismes", label: "Organismes" },
  { href: "/procedures", label: "Procédures" },
  { href: "/essai", label: "Essai" },
  { href: "/sources", label: "Sources" },
];

export function Nav() {
  const chemin = usePathname();
  return (
    <nav className="flex flex-wrap gap-1">
      <Link
        href="/"
        className={`rounded px-2 py-1 no-underline ${chemin === "/" ? "bg-[var(--accent)] text-[var(--accent-fg)]" : "text-[var(--ink)]"}`}
      >
        BPE
      </Link>
      {LIENS.map((l) => {
        const actif = chemin === l.href || chemin.startsWith(`${l.href}/`);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`rounded px-2 py-1 no-underline ${actif ? "bg-[var(--accent)] text-[var(--accent-fg)]" : "text-[var(--ink)]"}`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
