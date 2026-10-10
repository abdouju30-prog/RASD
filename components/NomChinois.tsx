/** Raison sociale chinoise : glose française, han qui fait foi, lien de recherche. */
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
  const titre = glose?.trim() || latin?.trim() || nom;
  return (
    <div>
      <div style={{ fontWeight: 500, lineHeight: 1.35 }} title={nom}>
        {titre}
      </div>
      <div style={{ fontSize: 11.5, color: "var(--muted-2)", marginTop: 1 }}>
        {[region, latin && latin !== titre ? latin : null].filter(Boolean).join(" · ")}
      </div>
      <a
        href={`https://www.google.com/search?q=${encodeURIComponent(nom)}`}
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
