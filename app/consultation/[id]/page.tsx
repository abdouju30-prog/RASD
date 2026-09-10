import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Ban,
  ClipboardList,
  FlaskConical,
  MailQuestion,
  Scale,
  ShieldCheck,
} from "lucide-react";
import {
  CADRE_DEVIS,
  EXIGENCES_PREALABLES,
  FORMULE_COUT,
  LIBELLE_ORIGINE,
  QUESTIONNAIRE,
  consultation,
  type Candidat,
} from "@/lib/consultation";
import { bpeAEcheance, STATS_ESERVICE } from "@/lib/onssa-eservice";
import { candidats } from "@/lib/sourcing";
import { Aide } from "@/components/Aide";

export const dynamic = "force-dynamic";


function Origine({ c }: { c: Candidat }) {
  const couleur = c.meToo ? "var(--low)" : "var(--info)";
  return (
    <span
      className="pill"
      style={{
        fontSize: 10,
        color: couleur,
        borderColor: `color-mix(in srgb, ${couleur} 42%, transparent)`,
        background: `color-mix(in srgb, ${couleur} 10%, transparent)`,
      }}
    >
      {LIBELLE_ORIGINE[c.origine]}
    </span>
  );
}

function LigneCandidat({ c }: { c: Candidat }) {
  return (
    <tr>
      <td style={{ fontWeight: 500 }}>
        {c.nom}
        {c.usines && (
          <div style={{ fontSize: 11, color: "var(--muted-2)", marginTop: 3 }}>
            usine {c.usines.pays.join(", ")}
            {c.usines.lien === "probable" && (
              <span style={{ color: "var(--mod)" }}> · à vérifier</span>
            )}
          </div>
        )}
      </td>
      <td style={{ color: "var(--muted)", fontSize: 13 }}>
        {c.pays ?? "à préciser"}
        <div style={{ fontSize: 11, color: "var(--muted-2)", marginTop: 3, maxWidth: 220 }}>
          {c.adresse ?? "adresse non publiée par le registre"}
        </div>
      </td>
      <td>
        <Origine c={c} />
      </td>
      <td style={{ fontSize: 11.5, color: "var(--muted)", maxWidth: 400, lineHeight: 1.5 }}>
        {c.motif}
      </td>
    </tr>
  );
}

export default async function ConsultationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = consultation(id);
  if (!c) notFound();

  const bloque = c.route.cle === "bloque";

  return (
    <>
      <Link
        href={`/sourcing/${id}`}
        style={{ color: "var(--muted)", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6 }}
      >
        <ArrowLeft size={14} /> Fiche de prospection
      </Link>

      <div className="fil" style={{ marginTop: 14 }}>Étape 5 — consulter</div>
      <h1>
        Consultation fournisseur — {c.matiere.nom}
      </h1>
      <p className="chapeau">
        Qui consulter, quoi demander, dans quel ordre. Le prix vient en dernier.
      </p>

      {/* 1. La route — elle décide de tout le reste */}
      <div
        className="card"
        style={{
          padding: "16px 20px",
          marginTop: 18,
          display: "flex",
          gap: 13,
          alignItems: "flex-start",
          borderColor: bloque
            ? "color-mix(in srgb, var(--crit) 42%, transparent)"
            : "color-mix(in srgb, var(--accent) 35%, transparent)",
          background: bloque
            ? "color-mix(in srgb, var(--crit) 7%, transparent)"
            : "color-mix(in srgb, var(--accent) 6%, transparent)",
        }}
      >
        {bloque ? (
          <Ban size={18} color="var(--crit)" style={{ flexShrink: 0, marginTop: 2 }} />
        ) : (
          <ShieldCheck size={18} color="var(--accent)" style={{ flexShrink: 0, marginTop: 2 }} />
        )}
        <div>
          <div style={{ fontFamily: "var(--tete)", fontSize: 15, fontWeight: 600 }}>
            {c.route.titre}
          </div>
          <p style={{ fontSize: 13, color: "var(--muted)", margin: "7px 0 0", lineHeight: 1.65, maxWidth: "82ch" }}>
            {c.route.lecture}
          </p>
        </div>
      </div>

      {/* 2. Liste courte */}
      <div className="section">
        <span className="h-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ClipboardList size={14} /> Liste courte — {c.meToo.length + c.autres.length} candidats
        </span>
        {c.meToo.length > 0 && (
          <div className="bloc" style={{ marginBottom: 14 }}>
            <div className="titre">
              <span>À consulter en premier — voie me-too</span>
              <span className="mono">{c.meToo.length}</span>
            </div>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Société</th>
                  <th>Pays</th>
                  <th>Registre</th>
                  <th>Motif</th>
                </tr>
              </thead>
              <tbody>
                {c.meToo.map((x) => (
                  <LigneCandidat key={x.id} c={x} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="bloc">
          <div className="titre">
            <span>{c.meToo.length > 0 ? "Autres pistes" : "Pistes à qualifier"}</span>
            <span className="mono">{c.autres.length}</span>
          </div>
          {c.autres.length > 0 ? (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Société</th>
                  <th>Pays</th>
                  <th>Registre</th>
                  <th>Motif</th>
                </tr>
              </thead>
              <tbody>
                {c.autres.map((x) => (
                  <LigneCandidat key={x.id} c={x} />
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ fontSize: 13, color: "var(--muted)", padding: "16px 0" }}>
              Aucune piste au-delà de l&apos;index marocain pour cette matière active.
            </p>
          )}
          <p style={{ fontSize: 11.5, color: "var(--muted-2)", marginTop: 12, lineHeight: 1.55 }}>
            Viser cinq à huit candidats sur au moins deux pays. Seul l&apos;index ONSSA ouvre la
            voie me-too.
          </p>
        </div>
      </div>

      {/* 3. Ce qu'il faut exiger avant de parler prix */}
      <div className="section">
        <span className="h-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <MailQuestion size={14} /> À obtenir avant toute demande de prix
        </span>
        <div
          className="grille"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", marginTop: 10 }}
        >
          {EXIGENCES_PREALABLES.map((e) => (
            <div key={e.titre} className="bloc">
              <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 6 }}>{e.titre}</div>
              <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.6 }}>{e.detail}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Le questionnaire, tiré de l'Annexe 3-B */}
      <div className="section">
        <span className="h-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <FlaskConical size={14} /> Questionnaire technique — {c.nbLignesFournisseur} lignes,
          dont {c.nbLignesGlp} sous BPL
        </span>
        <p style={{ color: "var(--muted)", fontSize: 12.5, margin: "0 0 12px" }}>
          Les lignes de l&apos;Annexe 3-B qui incombent au fournisseur, avec le nom commercial du
          paquet d&apos;études.
        </p>
        <div className="bloc">
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 74 }}>Ligne</th>
                <th>Donnée demandée</th>
                <th style={{ width: 58 }}>BPL</th>
                <th style={{ width: 150 }}>Paquet commercial</th>
              </tr>
            </thead>
            <tbody>
              {QUESTIONNAIRE.map((q) => (
                <tr key={q.cle}>
                  <td className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>{q.cle}</td>
                  <td style={{ fontSize: 13 }}>{q.libelle}</td>
                  <td>
                    {q.glp && (
                      <span
                        className="pill"
                        style={{
                          fontSize: 10,
                          color: "var(--mod)",
                          borderColor: "color-mix(in srgb, var(--mod) 42%, transparent)",
                          background: "color-mix(in srgb, var(--mod) 10%, transparent)",
                        }}
                      >
                        BPL
                      </span>
                    )}
                  </td>
                  <td style={{ fontSize: 11.5, color: "var(--muted)" }}>{q.pack ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Essais d'efficacité */}
      <div className="section">
        <span className="h-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <FlaskConical size={14} color="var(--accent)" /> Essais d&apos;efficacité — organismes
          agréés BPE
        </span>
        <p style={{ color: "var(--muted)", fontSize: 12.5, margin: "8px 0 12px", maxWidth: "88ch", lineHeight: 1.6 }}>
          {c.essais.indetermine ? (
            <>
              Les cultures de cette matière active ne se rattachent à aucun périmètre BPE reconnu :
              la liste n&apos;est pas filtrée, à vous de vérifier la couverture au cas par cas.
            </>
          ) : (
            <>
              Périmètre requis :{" "}
              <strong style={{ color: "var(--fg)" }}>{c.essais.perimetres.join(" · ")}</strong>.
              Seuls les organismes qui couvrent tout le périmètre sont listés.
            </>
          )}
        </p>
        <div className="bloc">
          <table className="tbl">
            <thead>
              <tr>
                <th>Organisme</th>
                <th>Agrément</th>
                <th>Valable jusqu&apos;au</th>
                <th>Contact</th>
              </tr>
            </thead>
            <tbody>
              {c.essais.organismes.map((o) => {
                const ech = bpeAEcheance(o);
                return (
                  <tr key={o.nom ?? ""}>
                    <td style={{ fontWeight: 500 }}>
                      {o.nom}
                      <div style={{ fontSize: 11, color: "var(--muted-2)", marginTop: 3 }}>
                        {o.siege}
                      </div>
                    </td>
                    <td className="mono" style={{ fontSize: 12 }}>{o.agrement.numero}</td>
                    <td className="mono" style={{ fontSize: 12, color: ech ? "var(--mod)" : "var(--muted)" }}>
                      {o.agrement.expiration ?? "—"}
                      {ech && <div style={{ fontSize: 10.5 }}>{ech}</div>}
                    </td>
                    <td style={{ fontSize: 11.5, color: "var(--muted)" }}>
                      {o.telephone}
                      {o.emails.length > 0 && <div>{o.emails[0]}</div>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p style={{ fontSize: 11.5, color: "var(--muted-2)", marginTop: 12, lineHeight: 1.55 }}>
            {STATS_ESERVICE.attribution} · un agrément expiré en cours d&apos;essai invalide les
            résultats.
          </p>
        </div>
      </div>

      {/* 6. Rendre les devis comparables */}
      <div className="section">
        <span className="h-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Scale size={14} /> Rendre les devis comparables
        </span>
        <div className="grille" style={{ gridTemplateColumns: "1.1fr 1fr", marginTop: 10 }}>
          <div className="bloc">
            <div className="titre"><span>À imposer dans la demande</span></div>
            <table className="tbl">
              <tbody>
                {CADRE_DEVIS.map(([k, v]) => (
                  <tr key={k}>
                    <td style={{ fontWeight: 500, width: 180 }}>{k}</td>
                    <td style={{ fontSize: 12, color: "var(--muted)" }}>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="bloc">
            <div className="titre"><span>Le seul calcul qui décide</span></div>
            <p style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.6, margin: "10px 0 0" }}>
              Coût rendu par kilo de <strong style={{ color: "var(--fg)" }}>matière active pure</strong> :
            </p>
            <div
              className="mono"
              style={{
                fontSize: 11.5,
                background: "color-mix(in srgb, var(--fg) 5%, transparent)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                padding: "10px 12px",
                margin: "8px 0",
                lineHeight: 1.6,
              }}
            >
              {FORMULE_COUT}
            </div>
            <p style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.6 }}>
              C&apos;est le dernier terme qui tranche. Aucun prix ne figure dans l&apos;outil :
              aucun registre public n&apos;en publie.
            </p>
          </div>
        </div>
      </div>

      <div className="section" style={{ maxWidth: "92ch" }}>
        <Aide titre="Pourquoi consulter les fournisseurs me-too même s'ils sont plus chers">
          <p>
            Un fournisseur déjà référencé à l&apos;ONSSA sur cette matière active a, par construction,
            un dossier technique accepté par l&apos;administration marocaine. Votre dossier s&apos;y
            réfère au lieu de tout reconstituer : les lignes marquées allégeables de l&apos;Annexe 3-B
            tombent.
          </p>
          <p>
            Sur un tonnage de quelques tonnes par an, quinze pour cent d&apos;écart de prix
            représentent quelques dizaines de milliers de dirhams. Une étude BPL manquante en
            représente plusieurs centaines de milliers, et deux ans de délai supplémentaire.
            L&apos;arbitrage n&apos;est pas serré.
          </p>
        </Aide>
      </div>
    </>
  );
}
