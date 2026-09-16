import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Globe2, TriangleAlert, Compass } from "lucide-react";
import { RiskBadge } from "@/components/RiskBadge";
import { candidatParId, candidats, estFenetreMaroc } from "@/lib/sourcing";
import { getMatiere } from "@/lib/data";
import { nbEtranger, resoudre } from "@/lib/requete";
import { ficheFournisseur } from "@/lib/packs-fournisseur";
import { FicheAgrements, PastillesPacks } from "@/components/PacksFournisseur";
import { STATS_PISTES, pistesPour } from "@/lib/pistes";
import { ReservePistes, TablePistes } from "@/components/PistesFournisseur";
import { STATS_ICAMA, fabricantsChinois } from "@/lib/icama";
import { FabricantsChinois } from "@/components/FabricantsChinois";
import { STATS_BKU, fabricantsTurcs } from "@/lib/bku";
import { FabricantsTurcs } from "@/components/FabricantsTurcs";
import { STATS_RUSSIE, fabricantsRusses } from "@/lib/russie";
import { FabricantsRusses } from "@/components/FabricantsRusses";
import { STATS_BRESIL, fabricantsBresiliens } from "@/lib/bresil";
import { FabricantsBresil } from "@/components/FabricantsBresil";
import { STATS_COREE, fabricantsCoreens } from "@/lib/coree";
import { FabricantsCoreens } from "@/components/FabricantsCoreens";

export async function generateStaticParams() {
  return candidats({ maxDetenteurs: 8 })
    .slice(0, 60)
    .map((c) => ({ id: c.id }));
}

export default async function CandidatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = candidatParId(id);
  const ma = getMatiere(id);
  if (!c || !ma) notFound();

  const q = encodeURIComponent(ma.molecule || ma.nom);
  const req = resoudre(ma.molecule || ma.nom);
  const g = req?.estMatiere ? req.gisement : null;
  const pistes = pistesPour(ma.nom);
  const chine = fabricantsChinois(ma.nom);
  const turquie = fabricantsTurcs(ma.nom);
  const russie = fabricantsRusses(ma.nom);
  const bresil = fabricantsBresiliens(ma.nom);
  const coree = fabricantsCoreens(ma.nom);
  const pastilles: { nom: string; n: number; source: string }[] = g
    ? [
        { nom: "ONSSA", n: g.fournisseursOnssa.length, source: "onssa" },
        { nom: "Brésil", n: g.bresil.length, source: "bresil" },
        { nom: "Chine", n: g.chineTc.length, source: "chine" },
        { nom: "Turquie", n: g.turquie.length, source: "turquie" },
        { nom: "EPA", n: g.sitesEpa, source: "epa" },
        { nom: "Corée", n: g.coree.length, source: "coree" },
        { nom: "Russie", n: g.russie.length, source: "russie" },
        { nom: "Australie", n: g.apvma.length, source: "apvma" },
      ]
    : [];

  return (
    <>
      <Link
        href="/sourcing"
        style={{ color: "var(--muted)", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6 }}
      >
        <ArrowLeft size={14} /> Cibles
      </Link>

      <div className="fil" style={{ marginTop: 10 }}>Alternative · Cible</div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start" }}>
        <div>
          <h1>{c.nom}</h1>
          <div style={{ color: "var(--muted)", fontSize: 13.5, marginTop: 6 }}>
            {c.categorie ?? "—"} · {c.nbHomologations} AMM · {c.nbDetenteurs} détenteur(s)
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="mono" style={{ fontSize: 28, fontWeight: 600, color: "var(--accent)", lineHeight: 1 }}>
            {c.score}
          </div>
          <div className="eyebrow" style={{ marginTop: 5 }}>attractivité</div>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "14px 0 18px", alignItems: "center" }}>
        {c.risque ? (
          <RiskBadge niveau={c.risque} score={c.scoreRisque ?? undefined} />
        ) : (
          <span className="pill" style={{ color: "var(--mod)" }}>risque non évalué</span>
        )}
        {estFenetreMaroc(c) && (
          <span
            className="pill"
            style={{
              fontWeight: 500,
              color: "var(--high)",
              borderColor: "color-mix(in srgb, var(--high) 40%, transparent)",
            }}
            title="Pas un retrait ANSES : une part de marché peut encore tenir au Maroc."
          >
            fenêtre Maroc
          </span>
        )}
        <span className="pill" style={{ fontWeight: 500 }}>
          voie {c.voie === "me_too" ? "me-too" : "substance nouvelle"}
        </span>
        {ma.fiche?.anses && ma.fiche.anses.statut !== "inconnu" && (
          <span className="pill" style={{ fontWeight: 500 }}>
            ANSES · {ma.fiche.anses.statut.replace(/_/g, " ")}
          </span>
        )}
        {ma.fiche && (
          <span className="pill" style={{ fontWeight: 500 }}>
            UE · {ma.fiche.statutUE.replace(/_/g, " ")}
          </span>
        )}
      </div>

      {estFenetreMaroc(c) && (
        <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 14px", maxWidth: 640 }}>
          Risque élevé, pas un retrait ANSES. Avec {c.nbDetenteurs} détenteur
          {c.nbDetenteurs > 1 ? "s" : ""}, une part de marché peut encore tenir au Maroc le temps
          du dossier.
          {c.statutAnses === "en_retrait"
            ? " Attention : retrait commercial en France (aucun produit E-Phy autorisé) — à qualifier."
            : ""}
        </p>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
        <Link
          href={`/dossiers/generer/${c.id}`}
          className="pill"
          style={{ fontWeight: 600, color: "var(--accent-fg)", background: "var(--accent)", borderColor: "var(--accent)" }}
        >
          Dossier 3-B
        </Link>
        <Link href={`/consultation/${c.id}`} className="pill" style={{ fontWeight: 500 }}>
          Consulter
        </Link>
        <Link href={`/fournisseurs?q=${q}`} className="pill" style={{ fontWeight: 500 }}>
          Fournisseurs
          {g && nbEtranger(g) > 0 && (
            <span className="mono" style={{ marginLeft: 6, opacity: 0.7 }}>{nbEtranger(g)}</span>
          )}
        </Link>
        <Link href={`/matieres/${ma.id}`} className="pill" style={{ fontWeight: 500 }}>
          Matière
        </Link>
      </div>

      {c.facteurs.length > 0 && (
        <div className="card" style={{ padding: "14px 18px", marginBottom: 16 }}>
          <div className="h-title">Décomposition du score</div>
          <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
            {c.facteurs.map((f) => (
              <div
                key={f.libelle}
                style={{ display: "flex", justifyContent: "space-between", gap: 14, fontSize: 13.5 }}
              >
                <span style={{ color: "var(--muted)" }}>{f.libelle}</span>
                <span
                  className="mono"
                  style={{ color: f.points > 0 ? "var(--low)" : "var(--crit)", fontWeight: 600 }}
                >
                  {f.points > 0 ? "+" : ""}
                  {f.points}
                </span>
              </div>
            ))}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                borderTop: "1px solid var(--border)",
                paddingTop: 10,
                marginTop: 4,
                fontWeight: 600,
              }}
            >
              <span>Score</span>
              <span className="mono">{c.score}</span>
            </div>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: "14px 18px", marginBottom: 16 }}>
        <div className="h-title">Usages homologués au Maroc — {c.nbUsages}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
          {c.usages.slice(0, 40).map((u) => (
            <span key={u} className="pill" style={{ fontWeight: 500, fontSize: 11.5 }}>
              {u}
            </span>
          ))}
          {c.usages.length > 40 && (
            <span className="pill" style={{ fontWeight: 500 }}>+{c.usages.length - 40}</span>
          )}
          {c.usages.length === 0 && (
            <span style={{ fontSize: 13, color: "var(--muted)" }}>Aucun usage renseigné à l&apos;index.</span>
          )}
        </div>
      </div>

      <div className="card" style={{ padding: "14px 18px", marginBottom: 16 }}>
        <div className="h-title">Cultures couvertes — {c.nbCultures}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
          {c.cultures.slice(0, 30).map((cu) => (
            <span key={cu} className="pill" style={{ fontWeight: 500, fontSize: 11.5 }}>
              {cu}
            </span>
          ))}
          {c.cultures.length > 30 && (
            <span className="pill" style={{ fontWeight: 500 }}>+{c.cultures.length - 30}</span>
          )}
        </div>
      </div>

      <div className="bloc" style={{ marginBottom: 16 }}>
        <div className="titre">
          <span>Fournisseurs ONSSA — me-too</span>
          <span className="mono">{c.fournisseurs.length}</span>
        </div>
        {c.fournisseurs.length > 0 ? (
          <table className="tbl">
            <thead>
              <tr>
                <th>Fournisseur</th>
                <th>Pays</th>
                <th style={{ textAlign: "right" }}>Lignes Maroc</th>
                <th>Profil</th>
                <th>Agréments déclarés</th>
              </tr>
            </thead>
            <tbody>
              {c.fournisseurs.map((f) => (
                <tr key={f.id}>
                  <td style={{ fontWeight: 500 }}>{f.nom}</td>
                  <td style={{ color: "var(--muted)" }}>
                    {f.pays ?? "à préciser"}
                    {f.pays && !f.paysFiable && (
                      <span style={{ color: "var(--mod)", fontSize: 11 }}> ?</span>
                    )}
                  </td>
                  <td className="mono" style={{ textAlign: "right" }}>{f.nbLignesMaroc}</td>
                  <td>
                    {f.coutFaible ? (
                      <span className="pill" style={{ fontSize: 10.5, fontWeight: 500 }}>générique</span>
                    ) : f.multinationale ? (
                      <span className="pill" style={{ fontSize: 10.5 }}>multinationale</span>
                    ) : (
                      <span className="pill" style={{ fontSize: 10.5 }}>autre</span>
                    )}
                  </td>
                  <td>
                    <PastillesPacks packs={ficheFournisseur(f.id)?.packs ?? []} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ fontSize: 13, color: "var(--muted)", padding: "12px 0" }}>
            Aucun fournisseur ONSSA pour cette molécule.
          </p>
        )}
      </div>

      <div className="card" style={{ padding: "14px 18px", marginBottom: 16 }}>
        <div className="h-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Compass size={14} /> Fabricants hors Maroc — registre australien
        </div>
        {!pistes.apparie ? (
          <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "9px 0 0" }}>
            Non appariée au registre PUBCRIS.
          </p>
        ) : (
          <>
            <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "6px 0 14px", lineHeight: 1.55 }}>
              {pistes.toutes.length} sociétés sur{" "}
              <span className="mono">{pistes.nomAustralien}</span>
              {pistes.nouvelles.length > 0 ? (
                <>
                  , dont{" "}
                  <strong style={{ color: "var(--fg)" }}>
                    {pistes.nouvelles.length} génériqueurs absents de l&apos;index marocain
                  </strong>
                  .
                </>
              ) : (
                <> — toutes déjà couvertes par l&apos;index marocain.</>
              )}
            </p>
            {pistes.nouvelles.length > 0 && <TablePistes pistes={pistes.nouvelles} />}
            <ReservePistes source={STATS_PISTES.source} />
          </>
        )}
      </div>

      <div style={{ marginBottom: 16 }}>
        <FabricantsBresil d={bresil} attribution={STATS_BRESIL.attribution} />
      </div>
      <div style={{ marginBottom: 16 }}>
        <FabricantsChinois m={chine} attribution={STATS_ICAMA.attribution} />
      </div>
      <div style={{ marginBottom: 16 }}>
        <FabricantsCoreens d={coree} attribution={STATS_COREE.attribution} />
      </div>
      <div style={{ marginBottom: 16 }}>
        <FabricantsTurcs d={turquie} attribution={STATS_BKU.attribution} />
      </div>
      <div style={{ marginBottom: 16 }}>
        <FabricantsRusses
          d={russie}
          attribution={STATS_RUSSIE.attribution}
          edition={STATS_RUSSIE.edition}
        />
      </div>

      <div className="card" style={{ padding: "14px 18px", marginBottom: 16 }}>
        <div className="h-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Globe2 size={14} /> Concurrence en place
        </div>
        <div style={{ display: "grid", gap: 7, marginTop: 12 }}>
          {c.detenteurs.map((det) => (
            <div key={det} style={{ fontSize: 13, color: "var(--muted)" }}>
              {det}
            </div>
          ))}
          {c.detenteurs.length === 0 && (
            <div style={{ fontSize: 13, color: "var(--accent)" }}>
              Aucun détenteur — marché entièrement ouvert.
            </div>
          )}
        </div>
      </div>

      {!ma.fiche && (
        <div
          className="card"
          style={{
            padding: "14px 18px",
            marginBottom: 16,
            borderColor: "color-mix(in srgb, var(--mod) 38%, transparent)",
            background: "color-mix(in srgb, var(--mod) 7%, transparent)",
          }}
        >
          <div className="h-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <TriangleAlert size={14} color="var(--mod)" /> Statut réglementaire inconnu
          </div>
          <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 11, lineHeight: 1.6 }}>
            Statut UE non renseigné : le filtre de risque ne s&apos;est pas appliqué. À vérifier
            sur la EU Pesticides Database <strong style={{ color: "var(--fg)" }}>avant</strong>{" "}
            de consulter un fournisseur.
          </p>
        </div>
      )}

      {ma.fiche && (
        <div className="card" style={{ padding: "14px 18px", marginBottom: 16 }}>
          <div className="h-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <TriangleAlert size={14} color="var(--mod)" /> Profil réglementaire
          </div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 11, lineHeight: 1.6 }}>
            <div>
              Statut UE :{" "}
              <strong style={{ color: "var(--fg)" }}>
                {ma.fiche.statutUE.replace(/_/g, " ")}
              </strong>
            </div>
            {ma.fiche.drapeaux.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                {ma.fiche.drapeaux.map((drap) => (
                  <span key={drap} className="pill" style={{ fontWeight: 500, fontSize: 11.5 }}>
                    {drap}
                  </span>
                ))}
              </div>
            )}
            {ma.fiche.note && <p style={{ marginTop: 11 }}>{ma.fiche.note}</p>}
          </div>
        </div>
      )}

      {c.fournisseurs
        .map((f) => ficheFournisseur(f.id))
        .filter((fiche): fiche is NonNullable<typeof fiche> => Boolean(fiche))
        .map((fiche) => (
          <div key={fiche.nom} style={{ marginBottom: 16 }}>
            <FicheAgrements fiche={fiche} />
          </div>
        ))}

      {pastilles.some((p) => p.n > 0) && (
        <div style={{ marginBottom: 18 }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>Sources étrangères — ouvrir le registre</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {pastilles
              .filter((p) => p.n > 0)
              .map((p) => (
                <Link
                  key={p.source}
                  href={`/fournisseurs?q=${q}&source=${p.source}`}
                  className="pill"
                  style={{ fontWeight: 500 }}
                >
                  {p.nom}{" "}
                  <span className="mono" style={{ opacity: 0.7 }}>{p.n}</span>
                </Link>
              ))}
          </div>
        </div>
      )}
    </>
  );
}
