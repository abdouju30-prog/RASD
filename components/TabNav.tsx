import Link from "next/link";

export interface TabItem {
  id: string;
  label: string;
  count?: number | string;
  href: string;
  active: boolean;
}

/** Sous-onglets — même filet et compteurs que le ruban, un cran plus bas. */
export function TabNav({ tabs }: { tabs: TabItem[] }) {
  return (
    <nav
      aria-label="Sous-navigation"
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 6,
        borderBottom: "1px solid var(--border)",
        marginBottom: 18,
        paddingBottom: 0,
      }}
    >
      {tabs.map((t) => (
        <Link
          key={t.id}
          href={t.href}
          aria-current={t.active ? "page" : undefined}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            padding: "8px 14px",
            fontSize: 13,
            fontFamily: "var(--tete)",
            fontWeight: t.active ? 600 : 500,
            color: t.active ? "var(--accent)" : "var(--muted)",
            borderBottom: t.active ? "2px solid var(--accent)" : "2px solid transparent",
            background: t.active ? "var(--accent-fond)" : "transparent",
            borderRadius: "6px 6px 0 0",
            marginBottom: -1,
            transition: "all var(--t)",
            whiteSpace: "nowrap",
          }}
        >
          <span>{t.label}</span>
          {t.count !== undefined && (
            <span
              className="mono"
              style={{
                fontSize: 11,
                padding: "1px 7px",
                borderRadius: 10,
                background: t.active
                  ? "var(--accent)"
                  : "color-mix(in srgb, var(--border) 60%, transparent)",
                color: t.active ? "#fff" : "var(--muted-2)",
                fontWeight: 500,
              }}
            >
              {t.count}
            </span>
          )}
        </Link>
      ))}
    </nav>
  );
}
