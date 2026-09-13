import type { ContactResolu } from "@/lib/contact";
import type { ContactIcama } from "@/lib/contacts-icama";

/** Coordonnées compactes : e-mail, tél, site, première adresse. */
export function ContactCell({ c }: { c: ContactResolu }) {
  if (!c.joignable && !c.site && c.adresses.length === 0) {
    return <span style={{ color: "var(--muted-2)" }}>—</span>;
  }
  const hrefSite = !c.site ? null : c.site.startsWith("http") ? c.site : `https://${c.site}`;
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
        <div key={t}>
          <a href={`tel:${t.replace(/[^\d+]/g, "")}`} className="mono" style={{ color: "var(--muted)" }}>
            {t}
          </a>
        </div>
      ))}
      {hrefSite && (
        <div>
          <a href={hrefSite} className="link-accent" target="_blank" rel="noreferrer">
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

/** Preuve publique : licence ICAMA + page Contact HTTP testée. */
export function ValiditeIcama({
  licence,
  teneur,
  expiration,
  c,
}: {
  licence: string | null;
  teneur: string | null;
  expiration: string | null;
  c: ContactIcama | null;
}) {
  return (
    <div style={{ fontSize: 11.5, lineHeight: 1.45, maxWidth: 300 }}>
      <div>
        ICAMA{teneur ? ` ${teneur}` : ""}
        {expiration ? ` · jusqu'au ${expiration}` : ""}
      </div>
      {licence && (
        <div className="mono" style={{ color: "var(--low)" }}>
          {licence}
        </div>
      )}
      {c ? (
        <>
          <div style={{ marginTop: 2 }}>{c.parent}</div>
          <div className="mono" style={{ color: "var(--muted-2)" }}>
            HTTP {c.http.status} · {c.http.date}
          </div>
          {c.reserve && (
            <div style={{ color: "var(--mod)", marginTop: 3 }}>{c.reserve}</div>
          )}
        </>
      ) : (
        <div style={{ color: "var(--muted-2)" }}>Contact public non vérifié</div>
      )}
    </div>
  );
}
