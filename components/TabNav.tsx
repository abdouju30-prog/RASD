import Link from "next/link";

export interface TabItem {
  id: string;
  label: string;
  count?: number | string;
  badge?: string;
  href: string;
  active: boolean;
  description?: string;
}

/**
 * Navigation par onglets / modes pour les sections consolidées d'Homologa.
 * Aligné sur la charte graphique : filets, monospace, tokens de couleur.
 */
export function TabNav({
  tabs,
  style,
}: {
  tabs: TabItem[];
  style?: React.CSSProperties;
}) {
  return (
    <nav
      aria-label="Sous-navigation"
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 6,
        borderBottom: "1px solid var(--border)",
        marginBottom: 20,
        paddingBottom: 0,
        ...style,
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
            padding: "9px 16px",
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
                background: t.active ? "var(--accent)" : "color-mix(in srgb, var(--border) 60%, transparent)",
                color: t.active ? "#fff" : "var(--muted-2)",
                fontWeight: 500,
              }}
            >
              {t.count}
            </span>
          )}
          {t.badge && (
            <span
              className="badge"
              style={{
                fontSize: 9.5,
                margin: 0,
                padding: "1px 5px",
                verticalAlign: "baseline",
              }}
            >
              {t.badge}
            </span>
          )}
        </Link>
      ))}
    </nav>
  );
}
