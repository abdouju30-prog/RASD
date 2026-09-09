import Link from "next/link";
import { Compass, Factory } from "lucide-react";
import { FOURNISSEURS, MATIERES } from "@/lib/data";
import { statsSourcing } from "@/lib/sourcing";
import { ficheFournisseur } from "@/lib/packs-fournisseur";
import { PastillesPacks } from "@/components/PacksFournisseur";
import { Figure } from "@/components/Aide";
import { SchemaGisements } from "@/components/Schemas";
import { PISTES_NOUVELLES, STATS_PISTES } from "@/lib/pistes";
import { EtiquetteLien, ReservePistes } from "@/components/PistesFournisseur";
import { STATS_ICAMA, USINES_CHINE } from "@/lib/icama";
import { STATS_BKU, USINES_TURQUES } from "@/lib/bku";
import { STATS_EPA, USINES_SOURCING, usinesDe } from "@/lib/epa";
import { EnteteUsines, ReserveEpa, SiteProduction, TableUsines } from "@/components/UsinesEpa";
import { CENSUS_PAYS, fichePays } from "@/lib/pays";
import { BlocPays } from "@/components/FichePays";
import { PRODUCTEURS_RUSSES, STATS_RUSSIE } from "@/lib/russie";
import { nbEtranger, resoudre } from "@/lib/requete";
import type { Fournisseur } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Matières actives fournies par chaque société, d'après l'index ONSSA. */
function matieresPar(): Map<string, { id: string; nom: string }[]> {
  const m = new Map<string, { id: string; nom: string }[]>();
  for (const ma of MATIERES) {
    for (const nom of ma.fournisseurs) {
      const l = m.get(nom) ?? [];
      l.push({ id: ma.id, nom: ma.nom });
      m.set(nom, l);
    }
  }
  return m;
}

function Chip({ href, actif, children }: { href: string; actif: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="pill"
      style={{
        fontWeight: 500,
        color: actif ? "var(--accent)" : "var(--muted)",
        borderColor: actif ? "color-mix(in srgb, var(--accent) 45%, transparent)" : "var(--border-strong)",
        background: actif ? "var(--accent-fond)" : "transparent",
      }}
    >
      {children}
    </Link>
  );
}

export default async function FournisseursPage({
  searchParams,
}: {
  searchParams: Promise<{ pays?: string; profil?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const so = statsSourcing();
  const parMa = matieresPar();

  // Le « q » vient de la recherche transverse : elle amène ici sur un nom
  // précis, il faut donc que la liste s'y réduise plutôt que de laisser
  // retrouver la ligne à la main.
  const cherche = (sp.q ?? "").trim().toLowerCase();
  const contient = (x: string) => x.toLowerCase().includes(cherche);

  // ⚠️ UNE REQUÊTE PEUT ÊTRE UNE MATIÈRE ACTIVE. C'est même la question la plus
  // fréquente sur cet écran — QUI PEUT ME FOURNIR CETTE MOLÉCULE — et le filtre
  // ne comparait qu'à des raisons sociales : taper « emamectine » ne donnait
  // rien. Quand la requête désigne une molécule de l'index, on ne filtre plus
  // par nom, on filtre par CE QUE CHACUN PORTE.
  const req = resoudre(sp.q);
  const surMatiere = req?.estMatiere ? req : null;
  const porteurs = new Set(surMatiere?.gisement.fournisseursOnssa ?? []);

  let list: Fournisseur[] = [...FOURNISSEURS];
  if (surMatiere) list = list.filter((f) => porteurs.has(f.nom));
  else if (cherche) list = list.filter((f) => contient(f.nom));
  if (sp.pays) list = list.filter((f) => f.pays === sp.pays);
  if (sp.profil === "generique") list = list.filter((f) => f.coutFaible);
  if (sp.profil === "multinationale") list = list.filter((f) => f.multinationale);
  if (sp.profil === "agrements") list = list.filter((f) => ficheFournisseur(f.id));
  list.sort((a, b) => b.nbLignesMaroc - a.nbLignesMaroc);

  const q = (o: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ pays: sp.pays, profil: sp.profil, q: sp.q, ...o })) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/fournisseurs?${s}` : "/fournisseurs";
  };

  const nbFiches = FOURNISSEURS.filter((f) => ficheFournisseur(f.id)).length;

  // Le croisement le plus sélectif de l'outil : une usine localisée, un
  // régulateur exigeant qui l'a homologuée, et personne au Maroc qui la fasse
  // déjà entrer.
  // Sur une matière active, les registres étrangers ne se refiltrent pas ici :
  // lib/requete.ts a déjà fait la sélection, une fois, pour tous les écrans.
  const nomsBresil = new Set((surMatiere?.gisement.bresil ?? []).map((u) => u.nom));

  const PISTES_EPA = USINES_SOURCING.filter(
    (u) =>
      !u.lienOnssa &&
      u.corroboreeApvma &&
      (surMatiere ? porteurs.has(u.nom) || nomsBresil.has(u.nom) : !cherche || contient(u.nom))
  );
  // Le pinyin est cherchable, les caractères han ne le sont pas depuis un
  // clavier latin : les deux formes répondent au filtre.
  const CHINE = surMatiere
    ? surMatiere.gisement.chine
    : USINES_CHINE.filter(
        (u) => !cherche || contient(u.nom) || contient(u.latin ?? "") || contient(u.glose ?? "")
      );
  const TURQUIE = surMatiere
    ? surMatiere.gisement.turquie
    : USINES_TURQUES.filter((u) => !cherche || contient(u.nom ?? ""));
  const PISTES = PISTES_NOUVELLES.filter((p) =>
    surMatiere
      ? p.matieresMaroc.some((m) => surMatiere.matieres.some((x) => x.nom === m))
      : !cherche || contient(p.nom)
  );
  // Le nom cyrillique et sa translittération sont tous deux cherchables : on ne
  // peut pas demander de taper « Щёлково » sur un clavier latin.
  const RUSSIE = surMatiere
    ? surMatiere.gisement.russie
    : PRODUCTEURS_RUSSES.filter((s) => !cherche || contient(s.nom) || contient(s.latin));

  return (
    <>
      <div className="fil">Étape 5 — fournisseur</div>
      <h1>Qui peut porter le dossier</h1>
      <p className="chapeau">
        Les {FOURNISSEURS.length} sociétés de l&apos;index, et les usines identifiées hors du Maroc.
      </p>

      {cherche && (
        <div
          className="card"
          style={{
            padding: "10px 15px",
            marginBottom: 12,
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 13,
            borderColor: "color-mix(in srgb, var(--accent) 38%, transparent)",
            background: "var(--accent-fond)",
          }}
        >
          <span style={{ color: "var(--muted)" }}>
            {surMatiere ? (
              <>
                <strong style={{ color: "var(--fg)" }}>
                  {surMatiere.molecules.slice(0, 3).join(" · ")}
                </strong>{" "}
                — matière active. <strong style={{ color: "var(--accent)" }}>{list.length}</strong>{" "}
                fournisseur(s) de l&apos;index la portent (voie me-too),{" "}
                <strong style={{ color: "var(--info)" }}>
                  {nbEtranger(surMatiere.gisement)}
                </strong>{" "}
                piste(s) étrangère(s) — Brésil {surMatiere.gisement.bresil.length}, Chine{" "}
                {surMatiere.gisement.chine.length}, Corée {surMatiere.gisement.coree.length},
                Turquie {surMatiere.gisement.turquie.length}, Russie{" "}
                {surMatiere.gisement.russie.length}.
              </>
            ) : (
              <>
                Filtré sur <strong style={{ color: "var(--fg)" }}>« {sp.q} »</strong> —{" "}
                {list.length} fournisseur(s), {PISTES.length} piste(s), {CHINE.length} usine(s)
                chinoise(s). Aucune matière active de l&apos;index ne porte ce nom.
              </>
            )}
          </span>
          <Link href={q({ q: undefined })} className="link-accent" style={{ marginLeft: "auto" }}>
            Tout afficher
          </Link>
        </div>
      )}

      <div className="strip" style={{ marginBottom: 14 }}>
        <div>
          <span className="eyebrow">Référencés ONSSA</span>
          <strong className="mono" style={{ fontSize: 17, fontWeight: 600 }}>{FOURNISSEURS.length}</strong>
        </div>
        <div>
          <span className="eyebrow">Génériques</span>
          <strong className="mono" style={{ fontSize: 17, fontWeight: 600, color: "var(--accent)" }}>
            {so.nbGeneriques}
          </strong>
        </div>
        <div>
          <span className="eyebrow">Agréments renseignés</span>
          <strong
            className="mono"
            style={{ fontSize: 17, fontWeight: 600, color: nbFiches ? "var(--low)" : "var(--mod)" }}
          >
            {nbFiches}
          </strong>
        </div>
        <div>
          <span className="eyebrow">Pistes hors index</span>
          <strong className="mono" style={{ fontSize: 17, fontWeight: 600, color: "var(--info)" }}>
            {STATS_PISTES.nbNouvelles}
          </strong>
        </div>
        <div>
          <span className="eyebrow">Usines situées</span>
          <strong className="mono" style={{ fontSize: 17, fontWeight: 600, color: "var(--info)" }}>
            {STATS_EPA.nbFournisseursAvecUsine}
          </strong>
        </div>
      </div>

      <div className="card" style={{ padding: "12px 15px", marginBottom: 14 }}>
        {/* ⚠️ Ces compteurs portent sur TOUS les registres, pas sur le seul
            index ONSSA. Auparavant ils ne comptaient que les fournisseurs
            marocains : l'Inde affichait 24 alors que l'outil en connaissait
            plus de trois cents, assises dans le registre de l'EPA. */}
        <div className="eyebrow" style={{ marginBottom: 8 }}>Pays — tous registres</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
          <Chip href={q({ pays: undefined })} actif={!sp.pays}>Tous</Chip>
          {CENSUS_PAYS.slice(0, 22).map((c) => (
            <Chip key={c.pays} href={q({ pays: c.pays })} actif={sp.pays === c.pays}>
              {c.pays} <span className="mono" style={{ opacity: 0.65 }}>{c.total}</span>
            </Chip>
          ))}
        </div>
        <div className="eyebrow" style={{ marginBottom: 8 }}>Profil</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          <Chip href={q({ profil: undefined })} actif={!sp.profil}>Tous</Chip>
          <Chip href={q({ profil: "generique" })} actif={sp.profil === "generique"}>Générique</Chip>
          <Chip href={q({ profil: "multinationale" })} actif={sp.profil === "multinationale"}>Multinationale</Chip>
          <Chip href={q({ profil: "agrements" })} actif={sp.profil === "agrements"}>Agréments renseignés</Chip>
        </div>
      </div>


      {sp.pays && (
        <div style={{ marginBottom: 16 }}>
          <BlocPays fiche={fichePays(sp.pays)} />
        </div>
      )}

      <div className="grille">
        <div className="bloc">
          <div className="titre">
            <span>Fournisseurs</span>
            <span className="mono">{list.length}</span>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th>Fournisseur</th>
                <th>Pays</th>
                <th>Profil</th>
                <th style={{ textAlign: "right" }}>Réf. Maroc</th>
                <th style={{ textAlign: "right" }}>M.A.</th>
                <th>Matières actives fournies</th>
                <th>Agréments déclarés</th>
              </tr>
            </thead>
            <tbody>
              {list.slice(0, 80).map((f) => {
                const mas = parMa.get(f.nom) ?? [];
                return (
                  <tr key={f.id}>
                    <td style={{ fontWeight: 500 }}>
                      {f.nom}
                      <SiteProduction u={usinesDe(f.nom)} />
                    </td>
                    <td style={{ color: "var(--muted)" }}>
                      {f.pays ?? "à préciser"}
                      {f.pays && !f.paysFiable && (
                        <span style={{ color: "var(--mod)", fontSize: 11 }}> ?</span>
                      )}
                    </td>
                    <td>
                      {f.coutFaible ? (
                        <span
                          className="pill"
                          style={{
                            fontSize: 10,
                            color: "var(--accent)",
                            borderColor: "color-mix(in srgb, var(--accent) 40%, transparent)",
                            background: "var(--accent-fond)",
                          }}
                        >
                          générique
                        </span>
                      ) : f.multinationale ? (
                        <span className="pill" style={{ fontSize: 10 }}>multinationale</span>
                      ) : (
                        <span className="pill" style={{ fontSize: 10 }}>autre</span>
                      )}
                    </td>
                    <td className="mono" style={{ textAlign: "right" }}>{f.nbLignesMaroc}</td>
                    <td className="mono" style={{ textAlign: "right" }}>{f.nbMatieresActives}</td>
                    <td style={{ fontSize: 11.5, color: "var(--muted)", maxWidth: 320 }}>
                      {mas.slice(0, 3).map((m, i) => (
                        <span key={m.id}>
                          {i > 0 && " · "}
                          <Link href={`/sourcing/${m.id}`} className="link-accent" style={{ fontWeight: 500 }}>
                            {m.nom}
                          </Link>
                        </span>
                      ))}
                      {mas.length > 3 && (
                        <span className="mono" style={{ color: "var(--muted-2)" }}> +{mas.length - 3}</span>
                      )}
                      {mas.length === 0 && <span style={{ color: "var(--muted-2)" }}>—</span>}
                    </td>
                    <td>
                      <PastillesPacks packs={ficheFournisseur(f.id)?.packs ?? []} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {list.length > 80 && (
            <p style={{ fontSize: 11.5, color: "var(--muted-2)", marginTop: 10 }}>
              {list.length - 80} autres au-delà des 80 premiers — affinez les filtres.
            </p>
          )}
          {list.length === 0 && (
            <p style={{ fontSize: 13, color: "var(--muted)", padding: "20px 0" }}>
              Aucun fournisseur ne correspond à ces filtres.
            </p>
          )}
        </div>
      </div>

      <div className="section">
        <span className="h-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Compass size={14} color="var(--info)" /> Pistes hors index — détenteurs australiens
        </span>
        <p style={{ color: "var(--muted)", fontSize: 13, margin: "0 0 12px" }}>
          {STATS_PISTES.nbNouvelles} génériqueurs détenant une homologation australienne, absents de
          l&apos;index marocain.
        </p>
        <Figure
          titre="Deux gisements, deux voies"
          legende="seul l'index marocain raccourcit le dossier"
        >
          <SchemaGisements />
        </Figure>

        <div className="bloc" style={{ marginTop: 14 }}>
          <div className="titre">
            <span>Fabricants à qualifier</span>
            <span className="mono">{PISTES.length}</span>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th>Société</th>
                <th>Pays présumé</th>
                <th style={{ textAlign: "right" }}>M.A. en AU</th>
                <th style={{ textAlign: "right" }}>dont homologuées au Maroc</th>
                <th>Matières actives du terrain commun</th>
                <th>Index ONSSA</th>
              </tr>
            </thead>
            <tbody>
              {PISTES.map((p) => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 500 }}>{p.nom}</td>
                  <td style={{ color: "var(--muted)" }}>
                    {p.pays ?? "à préciser"}
                    {p.pays && !p.paysFiable && (
                      <span style={{ color: "var(--mod)", fontSize: 11 }}> ?</span>
                    )}
                    {p.filialeLocale && (
                      <span
                        style={{ color: "var(--muted-2)", fontSize: 11 }}
                        title="Entité australienne d'un groupe étranger — le pays indiqué est celui du groupe."
                      >
                        {" "}
                        · filiale AU
                      </span>
                    )}
                  </td>
                  <td className="mono" style={{ textAlign: "right" }}>{p.matieres.length}</td>
                  <td
                    className="mono"
                    style={{
                      textAlign: "right",
                      color: p.matieresMaroc.length ? "var(--accent)" : "var(--muted-2)",
                      fontWeight: p.matieresMaroc.length ? 600 : 400,
                    }}
                  >
                    {p.matieresMaroc.length}
                  </td>
                  <td style={{ fontSize: 11.5, color: "var(--muted)", maxWidth: 320 }}>
                    {p.matieresMaroc.slice(0, 4).join(" · ") || (
                      <span style={{ color: "var(--muted-2)" }}>aucune</span>
                    )}
                    {p.matieresMaroc.length > 4 && (
                      <span className="mono" style={{ color: "var(--muted-2)" }}>
                        {" "}
                        +{p.matieresMaroc.length - 4}
                      </span>
                    )}
                  </td>
                  <td>
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
          <ReservePistes source={STATS_PISTES.source} />
        </div>
      </div>

      <div className="section">
        <EnteteUsines titre="Usines à qualifier — registre EPA" nb={PISTES_EPA.length} />
        <p style={{ color: "var(--muted)", fontSize: 13, margin: "0 0 12px" }}>
          Sites de production enregistrés à l&apos;EPA, en pays de sourcing, absents de l&apos;index
          marocain et confirmés par une homologation australienne.
        </p>
        <div className="bloc">
          <TableUsines usines={PISTES_EPA} />
          <ReserveEpa attribution={STATS_EPA.attribution} />
        </div>
      </div>

      <div className="section">
        <span className="h-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Factory size={14} color="var(--info)" /> Usines turques — fabrication locale
        </span>
        <p style={{ color: "var(--muted)", fontSize: 13, margin: "0 0 12px" }}>
          Sociétés détenant au moins une homologation <span className="mono">İMAL</span> —
          fabriquée en Turquie, par opposition à <span className="mono">İTHAL</span>, importée.
        </p>
        <div className="bloc">
          <div className="titre">
            <span>Fabricants turcs</span>
            <span className="mono">{TURQUIE.length}</span>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th>Société</th>
                <th style={{ textAlign: "right" }}>M.A. de l&apos;index</th>
                <th style={{ textAlign: "right" }}>İMAL</th>
                <th>Matières actives</th>
                <th>Index ONSSA</th>
              </tr>
            </thead>
            <tbody>
              {TURQUIE.slice(0, 20).map((u) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 500 }}>{u.nom}</td>
                  <td className="mono" style={{ textAlign: "right", color: "var(--accent)", fontWeight: 600 }}>
                    {u.matieresMaroc.length}
                  </td>
                  <td className="mono" style={{ textAlign: "right" }}>{u.nbImal}</td>
                  <td style={{ fontSize: 11.5, color: "var(--muted)", maxWidth: 320 }}>
                    {u.matieresMaroc.slice(0, 4).join(" · ")}
                    {u.matieresMaroc.length > 4 && (
                      <span className="mono" style={{ color: "var(--muted-2)" }}>
                        {" "}
                        +{u.matieresMaroc.length - 4}
                      </span>
                    )}
                  </td>
                  <td style={{ fontSize: 11.5, color: "var(--muted-2)" }}>
                    {u.fournisseurOnssa ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ fontSize: 11.5, color: "var(--muted-2)", marginTop: 12, lineHeight: 1.55 }}>
            {STATS_BKU.attribution} · İMAL désigne une fabrication en Turquie, pas nécessairement la
            synthèse de la matière active.
          </p>
        </div>
      </div>

      <div className="section">
        <span className="h-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Factory size={14} color="var(--info)" /> Usines chinoises — les plus polyvalentes
        </span>
        <p style={{ color: "var(--muted)", fontSize: 13, margin: "0 0 12px" }}>
          Homologation chinoise de matière active technique <em>et</em> licence de production,
          classées par couverture de l&apos;index marocain.
        </p>
        <div className="bloc">
          <div className="titre">
            <span>Usines confirmées</span>
            <span className="mono">{CHINE.length}</span>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th>Société</th>
                <th style={{ textAlign: "right" }}>M.A. de l&apos;index</th>
                <th style={{ textAlign: "right" }}>Homolog. TC</th>
                <th>Matières actives</th>
                <th>Licence</th>
              </tr>
            </thead>
            <tbody>
              {CHINE.slice(0, 25).map((u) => (
                <tr key={u.nom}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{u.glose ?? u.nom}</div>
                    <div style={{ fontSize: 11.5, color: "var(--muted-2)", marginTop: 1 }}>
                      {u.nom}
                      {u.region && <span style={{ marginLeft: 6 }}>· {u.region}</span>}
                    </div>
                  </td>
                  <td className="mono" style={{ textAlign: "right", color: "var(--accent)", fontWeight: 600 }}>
                    {u.matieres.length}
                  </td>
                  <td className="mono" style={{ textAlign: "right" }}>{u.nbHomologations}</td>
                  <td style={{ fontSize: 11.5, color: "var(--muted)", maxWidth: 340 }}>
                    {u.matieres.slice(0, 5).join(" · ")}
                    {u.matieres.length > 5 && (
                      <span className="mono" style={{ color: "var(--muted-2)" }}>
                        {" "}
                        +{u.matieres.length - 5}
                      </span>
                    )}
                  </td>
                  <td className="mono" style={{ fontSize: 11.5, color: "var(--low)" }}>
                    {u.licenceProduction}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ fontSize: 11.5, color: "var(--muted-2)", marginTop: 12, lineHeight: 1.55 }}>
            {STATS_ICAMA.attribution} · non rapprochées de l&apos;index, les raisons sociales étant
            en caractères chinois. Les noms latins sont transcrits (pinyin) : ils servent à
            chercher, pas à identifier. Détail par matière active sur chaque fiche de prospection.
          </p>
        </div>
      </div>

      <div className="section">
        <span className="h-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Factory size={14} color="var(--info)" /> Producteurs russes — catalogue d&apos;État
        </span>
        <p style={{ color: "var(--muted)", fontSize: 13, margin: "0 0 12px" }}>
          Sociétés immatriculées en Russie détenant au moins une homologation au catalogue
          fédéral. L&apos;outil n&apos;en connaissait que deux par l&apos;index marocain.
        </p>
        <div className="bloc">
          <div className="titre">
            <span>Détenteurs russes</span>
            <span className="mono">{RUSSIE.length}</span>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th>Société</th>
                <th>Translittération</th>
                <th style={{ textAlign: "right" }}>Homologations</th>
                <th>Produits homologués</th>
              </tr>
            </thead>
            <tbody>
              {RUSSIE.slice(0, 25).map((s) => (
                <tr key={s.cle}>
                  <td style={{ fontWeight: 500 }}>{s.nom}</td>
                  <td className="mono" style={{ fontSize: 11.5, color: "var(--muted)" }}>
                    {s.latin}
                  </td>
                  <td
                    className="mono"
                    style={{ textAlign: "right", color: "var(--accent)", fontWeight: 600 }}
                  >
                    {s.nbHomologations}
                  </td>
                  <td style={{ fontSize: 11.5, color: "var(--muted)", maxWidth: 320 }}>
                    {s.produits.slice(0, 2).join(" · ").slice(0, 110) || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ fontSize: 11.5, color: "var(--muted-2)", marginTop: 12, lineHeight: 1.55 }}>
            {STATS_RUSSIE.attribution}, via le miroir du {STATS_RUSSIE.miroir} — le site fédéral ne
            répond pas depuis l&apos;étranger. Les raisons sociales sont en cyrillique : la
            translittération sert à chercher, elle ne vaut pas identification. Édition datée —
            elle sert à identifier des sociétés, pas à établir un statut réglementaire courant.
          </p>
        </div>
      </div>
    </>
  );
}
