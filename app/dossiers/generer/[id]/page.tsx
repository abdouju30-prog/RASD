import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ShieldAlert, TriangleAlert } from "lucide-react";
import { getMatiere } from "@/lib/data";
import { fmtDate } from "@/lib/logic";
import { chargeParResponsable, genererDossier, partAllegeable, statsDossier } from "@/lib/dossier";
import { ENTETE_FORMULAIRE, MENTIONS_FORMULAIRE, STATS_CHECKLIST } from "@/lib/checklist-onssa";
import { ficheFournisseur } from "@/lib/packs-fournisseur";
import { FicheAgrements } from "@/components/PacksFournisseur";
import { Aide, Figure } from "@/components/Aide";
import { SchemaDossier } from "@/components/Schemas";
import type { TypeDossier } from "@/lib/types";

export const dynamic = "force-dynamic";

const LIBELLE_RESP: Record<string, string> = {
  fournisseur: "Fournisseur",
  laboratoire: "Laboratoire",
  phytobeht: "Détenteur",
};

const LIBELLE_TYPE: Record<TypeDossier, string> = {
  nouvelle_homologation: "nouvelle homologation",
  renouvellement: "renouvellement",
  extension_usage: "extension d'usage",
};

export default async function GenererPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ type?: string; produit?: string; origine?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const ma = getMatiere(id);
  if (!ma) notFound();

  const type = (sp.type as TypeDossier) ?? "nouvelle_homologation";
  const d = genererDossier(id, {
    type,
    produitNom: sp.produit,
    origine:
      sp.origine === "substitution"
        ? "Radar — substitution d'une matière active à risque"
        : sp.origine === "prospection"
        ? "Prospection — nouvelle matière active à importer"
        : undefined,
  });
  if (!d) notFound();

  const st = statsDossier(d);
  const allege = partAllegeable(d);
  const charge = chargeParResponsable(d);
  const ansesKo = ma.fiche?.anses?.statut === "retirée" || ma.fiche?.anses?.statut === "en_retrait";
  const q = encodeURIComponent(ma.molecule || ma.nom);
  const aProduire = d.pieces
    .filter((p) => !p.allegeable)
    .sort((a, b) => Number(!!b.glp) - Number(!!a.glp) || (a.code ?? "").localeCompare(b.code ?? "", "fr"));

  return (
    <>
      <Link
        href="/dossiers"
        style={{ color: "var(--muted)", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6 }}
      >
        <ArrowLeft size={14} /> Dossiers
      </Link>

      <h1>{d.produitNom}</h1>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "8px 0 14px" }}>
        <span className="pill">{ma.nom}</span>
        <span className="pill">{LIBELLE_TYPE[type]}</span>
        <span className="pill" style={{ fontWeight: 500 }}>
          voie {d.voie === "me_too" ? "me-too" : "substance nouvelle"}
        </span>
        {d.fournisseur && (
          <span className="pill">{d.fournisseur.nom}</span>
        )}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
        <Link href={`/consultation/${id}`} className="pill" style={{ fontWeight: 500 }}>
          Consulter
        </Link>
        <Link href={`/fournisseurs?q=${q}`} className="pill" style={{ fontWeight: 500 }}>
          Fournisseurs
        </Link>
        <Link href={`/matieres/${id}`} className="pill" style={{ fontWeight: 500 }}>
          Matière
        </Link>
      </div>

      {ansesKo && (
        <div
          className="card"
          style={{
            padding: "14px 18px",
            marginBottom: 16,
            display: "flex",
            gap: 12,
            alignItems: "flex-start",
            borderColor: "color-mix(in srgb, var(--crit) 45%, transparent)",
            background: "color-mix(in srgb, var(--crit) 9%, transparent)",
          }}
        >
          <ShieldAlert size={18} color="var(--crit)" style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.65 }}>
            <strong style={{ color: "var(--fg)" }}>Matière retirée en France — dossier déconseillé.</strong>{" "}
            L&apos;ONSSA s&apos;alignant sur l&apos;ANSES, engager un dossier expose à un refus.
          </div>
        </div>
      )}

      <div style={{ margin: "0 0 16px", display: "grid", gap: 10 }}>
        <Figure titre="Structure du formulaire" legende={`Annexe 3-B · ${STATS_CHECKLIST.nbItems} lignes`}>
          <SchemaDossier />
        </Figure>
        <Aide titre="Ce que cet écran produit — et ce qu'il ne produit pas">
          <p>
            Il produit les {STATS_CHECKLIST.nbItems} lignes du formulaire officiel, avec pour chacune :
            qui détient la donnée, si une accréditation BPL est exigée, si elle est allégeable par
            référence, et ce que l&apos;index ONSSA permet de pré-remplir.
          </p>
          <p>
            Il ne produit <strong>pas</strong> les études elles-mêmes : elles appartiennent au
            fournisseur ou relèvent d&apos;un laboratoire accrédité. Le dossier est prêt à être{" "}
            <em>constitué</em>, pas encore à être déposé.
          </p>
        </Aide>
      </div>

      <div className="card" style={{ padding: "14px 18px", marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
          <div className="h-title">Charge du dossier</div>
          <span className="mono" style={{ color: "var(--accent)", fontWeight: 600, fontSize: 15 }}>
            {allege}% allégeable
          </span>
        </div>
        <div className="bar" style={{ margin: "12px 0 14px" }}>
          <span style={{ width: `${allege}%`, background: "var(--accent)" }} />
        </div>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", fontSize: 12.5, color: "var(--muted)" }}>
          <span>
            <strong className="mono" style={{ color: "var(--fg)" }}>{st.nbLignes}</strong> lignes
          </span>
          <span>
            <strong className="mono" style={{ color: "var(--accent)" }}>{st.nbAllegeables}</strong>{" "}
            allégeables
          </span>
          <span>
            <strong className="mono" style={{ color: "var(--high)" }}>{st.nbNonAllegeables}</strong>{" "}
            à produire
          </span>
          <span>
            <strong className="mono" style={{ color: "var(--mod)" }}>{st.nbGLP}</strong> études BPL
          </span>
        </div>
        {charge.length > 0 && (
          <div style={{ display: "grid", gap: 6, marginTop: 14, fontSize: 13 }}>
            {charge.map(([qui, n]) => (
              <div key={String(qui)} style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--muted)" }}>
                  {qui === "non attribué" ? "Non attribué" : LIBELLE_RESP[qui] ?? qui}
                </span>
                <span className="mono">{n}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {d.fournisseur && (
        <div className="card" style={{ padding: "14px 18px", marginBottom: 16 }}>
          <div className="h-title">Fournisseur pressenti</div>
          <div style={{ fontSize: 14, fontWeight: 600, marginTop: 11 }}>{d.fournisseur.nom}</div>
          <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 5, lineHeight: 1.6 }}>
            {d.fournisseur.pays ?? "pays à préciser"} · {d.fournisseur.nbLignesMaroc} références à
            l&apos;index ONSSA · {d.fournisseur.nbMatieresActives} matières actives
          </div>
          <div
            style={{
              fontSize: 12.5,
              color: "var(--accent)",
              marginTop: 11,
              lineHeight: 1.6,
              paddingTop: 11,
              borderTop: "1px solid var(--border)",
            }}
          >
            Déjà référencé à l&apos;ONSSA sur cette matière active : son dossier technique a passé
            l&apos;administration marocaine. {d.aFournirParFournisseur.length} lignes du formulaire
            lui incombent — les lui réclamer en un seul envoi.
          </div>
        </div>
      )}

      {d.fournisseur && ficheFournisseur(d.fournisseur.id) && (
        <div style={{ marginBottom: 16 }}>
          <FicheAgrements fiche={ficheFournisseur(d.fournisseur.id)!} />
        </div>
      )}

      <div className="card" style={{ padding: "14px 18px", marginBottom: 16 }}>
        <div className="h-title">En-tête du formulaire</div>
        <ul
          style={{
            margin: "11px 0 0",
            paddingLeft: 17,
            fontSize: 12.5,
            color: "var(--muted)",
            lineHeight: 1.8,
          }}
        >
          {ENTETE_FORMULAIRE.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      </div>

      {d.objections.length > 0 && (
        <div
          className="card"
          style={{
            padding: "14px 18px",
            marginBottom: 16,
            borderColor: "color-mix(in srgb, var(--mod) 30%, transparent)",
          }}
        >
          <div className="h-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <TriangleAlert size={14} color="var(--mod)" /> Objections anticipées
          </div>
          <div style={{ display: "grid", gap: 11, marginTop: 13 }}>
            {d.objections.map((o, i) => (
              <p key={i} style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.6, margin: 0 }}>
                {o}
              </p>
            ))}
          </div>
        </div>
      )}

      <div className="bloc" style={{ marginBottom: 16 }}>
        <div className="titre">
          <span>À produire</span>
          <span className="mono">{st.nbNonAllegeables}</span>
        </div>
        <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "0 0 10px", lineHeight: 1.55 }}>
          {st.nbLignes} lignes · {st.nbAllegeables} allégeables par référence · {st.nbGLP} études BPL
        </p>
        {aProduire.length > 0 ? (
          <table className="tbl">
            <thead>
              <tr>
                <th>Ligne</th>
                <th>Donnée</th>
                <th>Qui</th>
                <th>BPL</th>
              </tr>
            </thead>
            <tbody>
              {aProduire.map((p) => (
                <tr key={p.code ?? p.rubrique}>
                  <td className="mono" style={{ fontSize: 12.5, color: "var(--muted)" }}>
                    {p.code ?? "—"}
                  </td>
                  <td style={{ fontSize: 13 }}>
                    {p.libelle ?? p.rubrique}
                    {p.prerempli && (
                      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>{p.prerempli}</div>
                    )}
                  </td>
                  <td style={{ fontSize: 12.5, color: "var(--muted)" }}>
                    {LIBELLE_RESP[p.responsable ?? "phytobeht"]}
                  </td>
                  <td>
                    {p.glp ? (
                      <span className="pill" style={{ fontSize: 10.5, fontWeight: 500 }}>BPL</span>
                    ) : (
                      <span style={{ color: "var(--muted)" }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ fontSize: 13, color: "var(--muted)", padding: "12px 0" }}>
            Toutes les lignes sont allégeables par référence.
          </p>
        )}
      </div>

      <div className="card" style={{ padding: "14px 18px", marginBottom: 16 }}>
        <div className="h-title">Mentions du formulaire</div>
        <ul
          style={{
            margin: "11px 0 0",
            paddingLeft: 17,
            fontSize: 12,
            color: "var(--muted)",
            lineHeight: 1.7,
          }}
        >
          {MENTIONS_FORMULAIRE.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
        <p style={{ fontSize: 11, color: "var(--muted-2)", marginTop: 12, lineHeight: 1.5 }}>
          Structure : {STATS_CHECKLIST.source}. Généré le{" "}
          {fmtDate(new Date().toISOString().slice(0, 10))} depuis l&apos;index ONSSA.
        </p>
      </div>
    </>
  );
}
