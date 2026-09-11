/** Raison sociale chinoise : pinyin collable, han qui fait foi, lien de recherche. */
export function NomChinois({
  nom,
  latin,
  region,
}: {
  nom: string;
  latin: string | null;
  region?: string | null;
}) {
  const titre = latin?.trim() || nom;
  return (
    <div>
      <div style={{ fontWeight: 500, lineHeight: 1.35 }}>{titre}</div>
      {latin && latin !== nom && (
        <div style={{ fontSize: 11.5, color: "var(--muted-2)", marginTop: 1 }}>
          {nom}
          {region ? <span> · {region}</span> : null}
        </div>
      )}
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
