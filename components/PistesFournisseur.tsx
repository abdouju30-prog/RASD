import type { LienOnssa, Piste } from "@/lib/pistes";

// Rendu des pistes fournisseur tirées du registre australien. Le point délicat
// est le rattachement à l'index marocain : il se fait sur le nom, donc il se
// montre — chaque rapprochement affiche le fournisseur ONSSA qui l'a déclenché,
// pour que l'utilisateur puisse le contredire d'un coup d'œil.

const LIENS: Record<LienOnssa, { libelle: string; couleur: string; aide: string }> = {
  referencee: {
    libelle: "déjà à l'ONSSA",
    couleur: "var(--low)",
    aide: "Même raison sociale à l'index marocain : voie me-too ouverte.",
  },
  homonyme: {
    libelle: "groupe probable",
    couleur: "var(--mod)",
    aide: "Nom proche d'un fournisseur de l'index. Même groupe très probablement, entité juridique différente — à confirmer avant d'invoquer un dossier existant.",
  },
  absente: {
    libelle: "nouvelle piste",
    couleur: "var(--accent)",
    aide: "Aucun rapprochement avec l'index marocain sous ce nom. Fabricant à qualifier depuis zéro.",
  },
};

export function EtiquetteLien({ lien }: { lien: LienOnssa }) {
  const t = LIENS[lien];
  return (
    <span
      className="pill"
      title={t.aide}
      style={{
        fontSize: 10.5,
        color: t.couleur,
        borderColor: `color-mix(in srgb, ${t.couleur} 42%, transparent)`,
        background: `color-mix(in srgb, ${t.couleur} 10%, transparent)`,
      }}
    >
      {t.libelle}
    </span>
  );
}

function Pays({ p }: { p: Piste }) {
  return (
    <>
      {p.pays ?? "à préciser"}
      {p.pays && !p.paysFiable && <span style={{ color: "var(--mod)", fontSize: 11 }}> ?</span>}
      {p.filialeLocale && (
        <span style={{ color: "var(--muted-2)", fontSize: 11 }} title="Entité australienne d'un groupe étranger — le pays indiqué est celui du groupe.">
          {" "}
          · filiale AU
        </span>
      )}
    </>
  );
}

/** Tableau des pistes d'une matière active, sur la fiche de prospection. */
export function TablePistes({ pistes }: { pistes: Piste[] }) {
  if (pistes.length === 0) return null;
  return (
    <table className="tbl">
      <thead>
        <tr>
          <th>Société</th>
          <th>Pays présumé</th>
          <th style={{ textAlign: "right" }}>Produits AU</th>
          <th>Index ONSSA</th>
        </tr>
      </thead>
      <tbody>
        {pistes.map((p) => (
          <tr key={p.id}>
            <td style={{ fontSize: 13 }}>{p.nom}</td>
            <td style={{ fontSize: 13, color: "var(--muted)" }}>
              <Pays p={p} />
            </td>
            <td className="mono" style={{ fontSize: 13, textAlign: "right" }}>
              {p.nbProduits}
            </td>
            <td style={{ fontSize: 12 }}>
              <EtiquetteLien lien={p.lien} />
              {p.fournisseurOnssa && (
                <div style={{ color: "var(--muted-2)", fontSize: 11, marginTop: 3 }}>
                  {p.fournisseurOnssa}
                </div>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Réserve de méthode, à afficher partout où ces pistes sont montrées. */
export function ReservePistes({ source }: { source: string }) {
  return (
    <p style={{ fontSize: 11.5, color: "var(--muted-2)", marginTop: 12, lineHeight: 1.55 }}>
      Source <span className="mono">{source}</span>. Une homologation australienne ne vaut rien
      devant l&apos;ONSSA : elle n&apos;ouvre pas la voie me-too et ne remplace aucune étude. Ce
      qu&apos;elle prouve, c&apos;est que la société fabrique la molécule et a déjà constitué un
      dossier complet devant un régulateur exigeant. Le pays est déduit du nom ; «&nbsp;?&nbsp;»
      signale une déduction faite sur le seul suffixe juridique.
    </p>
  );
}
