"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Radar, Bell, FlaskConical, Package, FolderCheck, Globe2 } from "lucide-react";

const NAV = [
  { href: "/", label: "Radar réglementaire", icon: Radar },
  { href: "/veille", label: "Veille & alertes", icon: Bell },
  { href: "/sourcing", label: "Prospection & sourcing", icon: Globe2 },
  { href: "/matieres", label: "Matières actives", icon: FlaskConical },
  { href: "/produits", label: "Portefeuille produits", icon: Package },
  { href: "/dossiers", label: "Atelier dossiers", icon: FolderCheck },
];

export function Sidebar({
  detenteur,
  source,
  fraicheur,
}: {
  detenteur: string;
  source: string;
  fraicheur?: React.ReactNode;
}) {
  const path = usePathname();
  return (
    <aside className="sidebar">
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 8px 22px" }}>
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 9,
            background: "var(--accent)",
            color: "var(--accent-fg)",
            display: "grid",
            placeItems: "center",
            fontWeight: 700,
            fontSize: 16,
          }}
        >
          H
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16, lineHeight: 1 }}>Homologa</div>
          <div style={{ fontSize: 11, color: "var(--muted-2)", marginTop: 3 }}>{detenteur}</div>
        </div>
      </div>

      <nav>
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? path === "/" : path.startsWith(href);
          return (
            <Link key={href} href={href} className={`navlink${active ? " active" : ""}`}>
              <Icon size={17} aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>

      <div
        style={{
          position: "absolute",
          bottom: 20,
          left: 16,
          right: 16,
          fontSize: 10.5,
          color: "var(--muted-2)",
          lineHeight: 1.55,
          borderTop: "1px solid var(--border)",
          paddingTop: 14,
        }}
      >
        Index ONSSA importé de <span className="mono">{source}</span>.
        <br />
        Statuts UE : PPDB / AERU, à recouper avant décision.
        <div style={{ marginTop: 9 }}>{fraicheur}</div>
      </div>
    </aside>
  );
}
