import type { ContactResolu } from "@/lib/contact";
import type { ContactIcama } from "@/lib/contacts-icama";
import { licenceLisible } from "@/lib/icama";
import { lienLinkedIn } from "@/lib/contacts-societes";

/** Recherche LinkedIn (export, homologation) — ouverte avec le compte de l'utilisateur. */
function LienLinkedIn({ nom }: { nom: string }) {
  return (
    <a
      href={lienLinkedIn(nom)}
      target="_blank"
      rel="noreferrer"
      className="link-accent"
      style={{ fontSize: 11 }}
      title="Personnes export / homologation de cette société sur LinkedIn (votre compte)"
    >
      LinkedIn
    </a>
  );
}

/** Coordonnées compactes : e-mail, tél, site, première adresse ; lien LinkedIn si le nom est donné. */
export function ContactCell({ c, nom }: { c: ContactResolu; nom?: string }) {
  if (!c.joignable && !c.site && c.adresses.length === 0) {
    return nom ? <LienLinkedIn nom={nom} /> : <span style={{ color: "var(--muted-2)" }}>—</span>;
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
            {(c.site ?? "").replace(/^https?:\/\//, "").replace(/\/$/, "")}
          </a>
        </div>
      )}
      {c.adresses[0] && (
        <div style={{ color: "var(--muted-2)", marginTop: 2 }} title={c.adresses[0].source}>
          {c.adresses[0].texte}
        </div>
      )}
      {(c.preuve || nom) && (
        <div style={{ fontSize: 11, marginTop: 2, color: "var(--muted-2)" }}>
          {c.preuve && (
            <a href={c.preuve.url} target="_blank" rel="noreferrer" style={{ color: "inherit" }}
              title="Page Contact du site officiel d'où viennent l'e-mail et le téléphone">
              site officiel, relu le {c.preuve.date.split("-").reverse().join("/")}
            </a>
          )}
          {c.preuve && nom && " · "}
          {nom && <LienLinkedIn nom={nom} />}
        </div>
      )}
    </div>
  );
}

/** Preuve publique : licence ICAMA ≠ offre catalogue. */
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
  const cat = c?.catalogue;
  return (
    <div style={{ fontSize: 11.5, lineHeight: 1.45, maxWidth: 300 }}>
      <div>
        ICAMA{teneur ? ` ${teneur}` : ""}
        {expiration ? ` · jusqu'au ${expiration}` : ""}
      </div>
      {licence && (
        <div className="mono" style={{ color: "var(--low)" }} title={licence}>
          {licenceLisible(licence)}
        </div>
      )}
      {c ? (
        <>
          <div style={{ marginTop: 2 }}>{c.parent}</div>
          {cat?.statut === "absent" && (
            <div style={{ marginTop: 4 }}>
              <span
                className="pill"
                style={{
                  fontSize: 10,
                  color: "var(--high)",
                  borderColor: "color-mix(in srgb, var(--high) 42%, transparent)",
                  background: "color-mix(in srgb, var(--high) 10%, transparent)",
                }}
              >
                pas au catalogue public
              </span>
              {cat.url && (
                <div>
                  <a
                    href={cat.url}
                    className="link-accent"
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: 11 }}
                  >
                    catalogue testé {cat.date}
                  </a>
                </div>
              )}
            </div>
          )}
          <div className="mono" style={{ color: "var(--muted-2)", marginTop: 2 }}>
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
