import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  FlaskConical,
  Info,
  ShieldAlert,
  TriangleAlert,
  User,
} from "lucide-react";
import { getMatiere } from "@/lib/data";
import { fmtDate } from "@/lib/logic";
import {
  DELAIS_INDICATIFS,
  chargeParResponsable,
  genererDossier,
  parSection,
  partAllegeable,
  statsDossier,
} from "@/lib/dossier";
import { ENTETE_FORMULAIRE, MENTIONS_FORMULAIRE, STATS_CHECKLIST } from "@/lib/checklist-onssa";
import type { TypeDossier } from "@/lib/types";

export const dynamic = "force-dynamic";

const ICONE_RESP = {
  fournisseur: Building2,
  laboratoire: FlaskConical,
  phytobeht: User,
} as const;

const LIBELLE_RESP: Record<string, string> = {
  fournisseur: "Fournisseur",
  laboratoire: "Laboratoire",
  phytobeht: "Détenteur",
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

  const allege = partAllegeable(d);
  const charge = chargeParResponsable(d);
  const st = statsDossier(d);
  const groupes = parSection(d);
  const ansesKo = ma.fiche?.anses?.statut === "retirée" || ma.fiche?.anses?.statut === "en_retrait";

  return (
    <>
      <Link
        href="/dossiers"
        style={{ color: "var(--muted)", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6 }}
      >
        <ArrowLeft size={14} /> Atelier dossiers
      </Link>

      <div className="eyebrow" style={{ marginTop: 16 }}>
        ONSSA · Annexe 3-B · {type.replace(/_/g, " ")}
      </div>
      <h1 style={{ fontSize: 28, fontWeight: 700, margin: "9px 0 8px" }}>{d.produitNom}</h1>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
        <span className="pill">{ma.nom}</span>
        <span className="pill">{ma.categorie ?? "—"}</span>
        <span
          className="pill"
          style={{
            color: "var(--accent)",
            borderColor: "color-mix(in srgb, var(--accent) 45%, transparent)",
            background: "color-mix(in srgb, var(--accent) 12%, transparent)",
          }}
        >
          voie {d.voie === "me_too" ? "me-too" : "substance nouvelle"}
        </span>
        {d.origine && <span className="pill">{d.origine}</span>}
      </div>
      <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>
        Instruction — ordre de grandeur : {DELAIS_INDICATIFS[type]}
      </p>

      {ansesKo && (
        <div
          className="card"
          style={{
            padding: "14px 18px",
            marginTop: 18,
            display: "flex",
            gap: 12,
            alignItems: "flex-start",
            borderColor: "color-mix(in srgb, var(--crit) 45%, transparent)",
            background: "color-mix(in srgb, var(--crit) 9%, transparent)",
          }}
        >
          <ShieldAlert size={18} color="var(--crit)" style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.65 }}>
            <strong style={{ color: "var(--fg)" }}>
              Matière active retirée en France — dossier déconseillé.
            </strong>{" "}
            L&apos;ONSSA s&apos;alignant sur l&apos;ANSES, engager un dossier sur cette molécule expose
            à un refus, ou à un retrait en cours d&apos;instruction. Arbitrer avant d&apos;investir dans
            les études.
          </div>
        </div>
      )}

      <div
        className="card"
        style={{
          padding: "14px 18px",
          margin: "18px 0",
          display: "flex",
          gap: 12,
          alignItems: "flex-start",
          borderColor: "color-mix(in srgb, var(--info) 30%, transparent)",
        }}
      >
        <Info size={17} color="var(--info)" style={{ flexShrink: 0, marginTop: 1 }} />
        <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.65 }}>
          <strong style={{ color: "var(--fg)" }}>Ce que produit cet écran.</strong> Les{" "}
          {STATS_CHECKLIST.nbItems} lignes du formulaire officiel, avec pour chacune : qui détient la
          donnée, si une accréditation BPL est exigée, si elle est allégeable par référence, et ce que
          l&apos;index ONSSA permet de pré-remplir.{" "}
          <strong style={{ color: "var(--fg)" }}>Ce qu&apos;il ne produit pas :</strong> les études
          elles-mêmes, qui appartiennent au fournisseur ou relèvent d&apos;un laboratoire accrédité. Le
          dossier est prêt à être <em>constitué</em>, pas encore à être déposé.
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.45fr 1fr", gap: 16, alignItems: "start" }}>
        <div style={{ display: "grid", gap: 16 }}>
          <div className="card" style={{ padding: "18px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
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
          </div>

          {groupes.map((g) => (
            <div key={g.partie} className="card" style={{ padding: "18px 20px" }}>
              <div className="eyebrow">Partie {g.partie}</div>
              <div style={{ fontSize: 15.5, fontWeight: 600, margin: "5px 0 16px" }}>{g.titre}</div>

              <div style={{ display: "grid", gap: 18 }}>
                {g.sections.map((s) => (
                  <div key={s.titre}>
                    <div
                      className="h-title"
                      style={{ paddingBottom: 8, borderBottom: "1px solid var(--border)" }}
                    >
                      {s.titre}
                    </div>
                    <div style={{ display: "grid", gap: 7, marginTop: 11 }}>
                      {s.pieces.map((p) => {
                        const Icon = ICONE_RESP[p.responsable ?? "phytobeht"];
                        return (
                          <div
                            key={p.code}
                            className="card"
                            style={{
                              padding: "10px 13px",
                              background: "var(--card-2)",
                              borderColor: p.allegeable
                                ? "color-mix(in srgb, var(--accent) 26%, transparent)"
                                : "var(--border)",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                gap: 12,
                                alignItems: "flex-start",
                              }}
                            >
                              <span style={{ fontSize: 13.2, lineHeight: 1.45 }}>
                                <span
                                  className="mono"
                                  style={{ color: "var(--muted-2)", marginRight: 8, fontSize: 12 }}
                                >
                                  {p.code}
                                </span>
                                {p.libelle}
                              </span>
                              <span style={{ display: "flex", gap: 5, flexShrink: 0 }}>
                                {p.glp && (
                                  <span
                                    className="pill"
                                    style={{
                                      fontSize: 10.5,
                                      fontWeight: 600,
                                      color: "var(--mod)",
                                      borderColor: "color-mix(in srgb, var(--mod) 40%, transparent)",
                                      background: "color-mix(in srgb, var(--mod) 11%, transparent)",
                                    }}
                                  >
                                    BPL
                                  </span>
                                )}
                                <span className="pill" style={{ fontSize: 10.5, fontWeight: 500 }}>
                                  <Icon size={10} />
                                  {LIBELLE_RESP[p.responsable ?? "phytobeht"]}
                                </span>
                              </span>
                            </div>
                            {p.prerempli && (
                              <p
                                style={{
                                  fontSize: 12,
                                  color: p.allegeable ? "var(--accent)" : "var(--muted)",
                                  lineHeight: 1.55,
                                  margin: "7px 0 0",
                                }}
                              >
                                {p.prerempli}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="card" style={{ padding: "18px 20px" }}>
            <div className="h-title">
              Usages revendicables — Partie I, section 5 ({d.usagesVises.length})
            </div>
            <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "6px 0 12px", lineHeight: 1.6 }}>
              Dose et DAR déjà acceptés par l&apos;ONSSA sur cette matière active chez un autre
              détenteur. Reprendre ces valeurs évite d&apos;ouvrir une discussion technique inutile.
            </p>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Usage (culture / cible)</th>
                  <th>Dose</th>
                  <th>DAR</th>
                </tr>
              </thead>
              <tbody>
                {d.usagesVises.map((u, i) => (
                  <tr key={i}>
                    <td style={{ fontSize: 13 }}>{u.usage}</td>
                    <td className="mono" style={{ fontSize: 12.5 }}>{u.dose}</td>
                    <td className="mono" style={{ fontSize: 12.5, color: "var(--muted)" }}>{u.dar}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {ma.referentielDoses.length > d.usagesVises.length && (
              <p style={{ fontSize: 11.5, color: "var(--muted-2)", marginTop: 11 }}>
                {ma.referentielDoses.length - d.usagesVises.length} autres usages homologués non
                affichés.
              </p>
            )}
          </div>
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          <div className="card" style={{ padding: "18px 20px" }}>
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

          <div className="card" style={{ padding: "18px 20px" }}>
            <div className="h-title">Répartition de la charge</div>
            <div style={{ display: "grid", gap: 10, marginTop: 13 }}>
              {charge.map(([resp, n]) => {
                const Icon = ICONE_RESP[resp as keyof typeof ICONE_RESP] ?? User;
                return (
                  <div
                    key={resp}
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}
                  >
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        fontSize: 13,
                        color: "var(--muted)",
                      }}
                    >
                      <Icon size={14} />
                      {LIBELLE_RESP[resp] ?? resp}
                    </span>
                    <span className="mono" style={{ fontWeight: 600 }}>{n}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {d.fournisseur && (
            <div className="card" style={{ padding: "18px 20px" }}>
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

          <div
            className="card"
            style={{
              padding: "18px 20px",
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

          <div className="card" style={{ padding: "18px 20px" }}>
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
          </div>

          <div className="card" style={{ padding: "16px 18px" }}>
            <div className="eyebrow">Références croisées</div>
            <div style={{ display: "grid", gap: 8, marginTop: 11, fontSize: 13 }}>
              <Link href={`/matieres/${ma.id}`} className="link-accent">
                Fiche matière active →
              </Link>
              <Link href={`/sourcing/${ma.id}`} className="link-accent">
                Fiche sourcing & fournisseurs →
              </Link>
            </div>
            <p style={{ fontSize: 11, color: "var(--muted-2)", marginTop: 12, lineHeight: 1.5 }}>
              Structure : {STATS_CHECKLIST.source}. Généré le{" "}
              {fmtDate(new Date().toISOString().slice(0, 10))} depuis l&apos;index ONSSA.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
