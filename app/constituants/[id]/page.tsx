import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { EtiquetteLien } from "@/components/PistesFournisseur";
import { constituantParId } from "@/lib/apvma";
import { ficheNom } from "@/lib/liens";
import { slug } from "@/lib/noms";
import { pisteParId } from "@/lib/pistes";
import { PastilleOnssaNom } from "@/components/SignalOnssa";

export const dynamic = "force-dynamic";

export default async function ConstituantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = constituantParId(decodeURIComponent(id));
  if (!c) notFound();

  const f = ficheNom(c.nom);
  const societes = [...(c.societes ?? [])].sort((a, b) => b.nbProduits - a.nbProduits);

  return (
    <>
      <Link
        href="/fournisseurs?source=apvma"
        style={{ color: "var(--muted)", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6 }}
      >
        <ArrowLeft size={14} /> Australie
      </Link>

      <h1>{f.libelle}</h1>
      <div style={{ color: "var(--muted)", fontSize: 13.5, marginTop: 6 }}>
        {c.nom}
        {c.famille ? ` · ${c.famille}` : ""}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "14px 0 18px" }}>
        <span className="pill" style={{ fontWeight: 500 }}>
          Australie · {c.statut}
        </span>
        <span className="pill mono">{c.nbProduitsAgricoles} produit(s) agricoles</span>
        {c.nbProduitsEchus > 0 && (
          <span className="pill mono" style={{ color: "var(--muted)" }}>
            {c.nbProduitsEchus} échu(s)
          </span>
        )}
        {f.matiere ? (
          <span className="pill" style={{ fontWeight: 500, color: "var(--low)" }}>
            {f.matiere.nbHomologations} AMM Maroc
          </span>
        ) : (
          <span className="pill" style={{ color: "var(--mod)" }}>
            absente de l&apos;index ONSSA
          </span>
        )}
        {f.matiere?.anses && f.matiere.anses.statut !== "inconnu" && (
          <span className="pill" style={{ fontWeight: 500 }}>
            ANSES · {f.matiere.anses.statut.replace(/_/g, " ")}
          </span>
        )}
        <PastilleOnssaNom nom={c.nom} />
      </div>

      {f.matiere && (
        <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 16px", maxWidth: 640 }}>
          Homologuée au Maroc sous <strong style={{ color: "var(--fg)" }}>{f.matiere.nom}</strong>
          {f.matiere.categorie ? ` · ${f.matiere.categorie}` : ""}. Une homologation australienne
          n&apos;ouvre aucun droit devant l&apos;ONSSA.
        </p>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
        {f.id && (
          <Link href={`/matieres/${f.id}`} className="pill" style={{ fontWeight: 500 }}>
            Fiche matière
          </Link>
        )}
        <Link
          href={`/fournisseurs?q=${encodeURIComponent(f.libelle)}&source=apvma`}
          className="pill"
          style={{ fontWeight: 500 }}
        >
          Fournisseurs
        </Link>
      </div>

      <div className="bloc">
        <div className="titre">
          <span>Détenteurs PUBCRIS</span>
          <span className="mono">{societes.length}</span>
        </div>
        {societes.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--muted)", padding: "12px 0" }}>
            Aucune société agricole rattachée à ce constituant.
          </p>
        ) : (
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
              {societes.map((s) => {
                const piste = pisteParId(slug(s.nom));
                return (
                  <tr key={s.nom}>
                    <td style={{ fontWeight: 500 }}>
                      {piste ? (
                        <Link href={`/fournisseurs/piste/${piste.id}`} className="link-accent">
                          {s.nom}
                        </Link>
                      ) : (
                        s.nom
                      )}
                    </td>
                    <td style={{ color: "var(--muted)" }}>
                      {s.pays ?? "à préciser"}
                      {s.pays && !s.paysFiable && (
                        <span style={{ color: "var(--mod)", fontSize: 11 }}> ?</span>
                      )}
                    </td>
                    <td className="mono" style={{ textAlign: "right" }}>
                      {s.nbProduits}
                    </td>
                    <td>{piste ? <EtiquetteLien lien={piste.lien} /> : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
