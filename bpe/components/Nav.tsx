"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LIENS = [
  { href: "/spectre", label: "Spectre" },
  { href: "/cultures", label: "Cultures" },
  { href: "/melanges", label: "Mélanges" },
  { href: "/procedures", label: "Procédures" },
  { href: "/essai", label: "Essai" },
  { href: "/sources", label: "Sources" },
];

export function Nav() {
  const chemin = usePathname();
  return (
    <nav className="nav-bpe" aria-label="Sections">
      <Link
        href="/"
        className={chemin === "/" ? "bg-[var(--accent)] text-[var(--accent-fg)]" : "text-[var(--ink)]"}
      >
        BPE
      </Link>
      {LIENS.map((l) => {
        const actif = chemin === l.href || chemin.startsWith(`${l.href}/`);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={actif ? "bg-[var(--accent)] text-[var(--accent-fg)]" : "text-[var(--ink)]"}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
