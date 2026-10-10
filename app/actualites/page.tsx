import { actualitesParMois, texteAPublier, type EvenementIndex } from "@/lib/actualites";
import { detenteurActuel } from "@/lib/detenteur";
import { fmtDate } from "@/lib/logic";
import { Aide } from "@/components/Aide";
import { CopierTexte } from "@/components/CopierTexte";

export const dynamic = "force-dynamic";

const TITRES: Record<EvenementIndex["type"], string> = {
  nouveau: "Nouveaux produits à l'index",
  sorti: "Sortis de l'index",
  échéance: "Échéances d'AMM modifiées",
  usages: "Usages modifiés",
  renommé: "Changements de nom commercial",
};

export default async function ActualitesPage() {
  const d = await detenteurActuel();
  const mois = actualitesParMois();

  return (
    <>
      <h1>Actualités</h1>
      <p style={{ color: "var(--muted)", fontSize: 13.5, margin: "4px 0 16px" }}>
        Ce que les relevés ont constaté, mois par mois. Les produits de {d.nom} sont en gras.
      </p>

      {mois.map((m) => (
        <section key={m.cle} className="card" style={{ padding: "14px 18px", marginBottom: 14 }}>
          <div className="h-title" style={{ textTransform: "capitalize" }}>{m.libelle}</div>

          {(Object.keys(TITRES) as EvenementIndex["type"][]).map((type) => {
            const es = m.index.filter((e) => e.type === type);
            if (!es.length) return null;
            return (
              <div key={type} style={{ marginTop: 10 }}>
                <div className="eyebrow">{TITRES[type]} — {es.length}</div>
                <ul style={{ margin: "4px 0 0", paddingLeft: 18, fontSize: 13, lineHeight: 1.65 }}>
                  {es.slice(0, 12).map((e) => (
                    <li key={`${e.type}-${e.produit}`} style={{ fontWeight: e.detenteurId === d.id ? 700 : 400 }}>
                      {e.nomCommercial} — {e.detenteur}
                      {e.matieres[0] ? ` · ${e.matieres.join(" + ")}` : ""} · {e.detail}
                    </li>
                  ))}
                  {es.length > 12 && <li style={{ listStyle: "none", color: "var(--muted)" }}>… et {es.length - 12} autre(s)</li>}
                </ul>
                {es[0]?.reserve && (
                  <div style={{ fontSize: 11.5, color: "var(--high)", marginTop: 4 }}>{es[0].reserve}</div>
                )}
              </div>
            );
          })}

          {m.textes.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div className="eyebrow">Textes ONSSA — {m.textes.length}</div>
              <ul style={{ margin: "4px 0 0", paddingLeft: 18, fontSize: 13, lineHeight: 1.65 }}>
                {m.textes.map((t) => (
                  <li key={t.id}>
                    {t.url ? (
                      <a href={t.url} target="_blank" rel="noreferrer" className="link-accent">{t.titre}</a>
                    ) : (
                      t.titre
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {m.usines.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div className="eyebrow">Nouvelles usines chinoises (ICAMA) — {m.usines.length}</div>
              <ul style={{ margin: "4px 0 0", paddingLeft: 18, fontSize: 13, lineHeight: 1.65 }}>
                {m.usines.slice(0, 10).map((u) => (
                  <li key={`${u.molecule}-${u.nom}`}>
                    {u.molecule} — {u.nom} · {u.usine ? "usine" : "titulaire"} · {fmtDate(u.date)}
                  </li>
                ))}
                {m.usines.length > 10 && <li style={{ listStyle: "none", color: "var(--muted)" }}>… et {m.usines.length - 10} autre(s)</li>}
              </ul>
            </div>
          )}

          <div style={{ marginTop: 12 }}>
            <Aide titre="Texte prêt à publier (LinkedIn, courriel)">
              <CopierTexte texte={texteAPublier(m)} />
            </Aide>
          </div>
        </section>
      ))}
    </>
  );
}
