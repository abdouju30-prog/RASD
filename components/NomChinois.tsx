import { anglaisDe } from "@/lib/icama";

/**
 * Raison sociale chinoise, lisible en alphabet latin.
 *
 * Le nom anglais (retrouvé au Brésil, à l'EPA, en Australie ou au Maroc)
 * passe en tête quand il existe ; « probable » signale qu'il est à vérifier.
 * Sinon la glose française. Le han, qui fait foi, reste en infobulle.
 */
export function NomChinois({
  nom,
  latin,
  glose,
  region,
}: {
  nom: string;
  latin: string | null;
  glose?: string | null;
  region?: string | null;
}) {
  const en = anglaisDe(nom);
  const titre = en?.nomAnglais || glose?.trim() || latin?.trim() || nom;
  const second = en ? glose?.trim() || latin : latin && latin !== titre ? latin : null;
  return (
    <div>
      <div
        style={{ fontWeight: 500, lineHeight: 1.35 }}
        title={en ? `${nom} — ${en.regle}` : nom}
      >
        {titre}
        {en?.niveau === "probable" && (
          <span className="pill" style={{ fontSize: 9.5, marginLeft: 6, color: "var(--mod)" }}>
            probable
          </span>
        )}
      </div>
      <div style={{ fontSize: 11.5, color: "var(--muted-2)", marginTop: 1 }}>
        {[region, second].filter(Boolean).join(" · ")}
      </div>
      {en && en.registres.length > 0 && (
        <div style={{ fontSize: 11, color: "var(--low)", marginTop: 2 }}>
          Exporte déjà : {en.registres.join(" · ")}
        </div>
      )}
      <a
        href={`https://www.google.com/search?q=${encodeURIComponent(en?.nomAnglais || nom)}`}
        className="link-accent"
        target="_blank"
        rel="noreferrer"
        style={{ fontSize: 11, fontWeight: 500 }}
      >
        vérifier
      </a>
    </div>
  );
}
