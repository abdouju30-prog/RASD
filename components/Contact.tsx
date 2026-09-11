import type { ContactResolu } from "@/lib/contact";

/** Coordonnées compactes : e-mail, tél, site, première adresse. */
export function ContactCell({ c }: { c: ContactResolu }) {
  if (!c.joignable && !c.site && c.adresses.length === 0) {
    return <span style={{ color: "var(--muted-2)" }}>—</span>;
  }
  return (
    <div style={{ fontSize: 12, lineHeight: 1.45, maxWidth: 280 }}>
      {c.emails.slice(0, 2).map((e) => (
        <div key={e}>
          <a href={`mailto:${e}`} className="link-accent" style={{ fontWeight: 500 }}>
            {e}
          </a>
        </div>
      ))}
      {c.telephones.slice(0, 2).map((t) => (
        <div key={t} className="mono" style={{ color: "var(--muted)" }}>
          {t}
        </div>
      ))}
      {c.site && (
        <div>
          <a
            href={c.site.startsWith("http") ? c.site : `https://${c.site}`}
            className="link-accent"
            target="_blank"
            rel="noreferrer"
          >
            {c.site}
          </a>
        </div>
      )}
      {c.adresses[0] && (
        <div style={{ color: "var(--muted-2)", marginTop: 2 }} title={c.adresses[0].source}>
          {c.adresses[0].texte}
        </div>
      )}
    </div>
  );
}
