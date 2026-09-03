import Link from "next/link";
import { Compass, Factory, Info } from "lucide-react";
import { FOURNISSEURS, MATIERES } from "@/lib/data";
import { PAYS_CIBLES, statsSourcing } from "@/lib/sourcing";
import { ficheFournisseur } from "@/lib/packs-fournisseur";
import { PastillesPacks } from "@/components/PacksFournisseur";
import { Aide, Figure } from "@/components/Aide";
import { SchemaGisements } from "@/components/Schemas";
import { PISTES_NOUVELLES, STATS_PISTES } from "@/lib/pistes";
import { EtiquetteLien, ReservePistes } from "@/components/PistesFournisseur";
import { STATS_ICAMA, USINES_CHINE } from "@/lib/icama";
import { STATS_EPA, USINES_SOURCING, usinesDe } from "@/lib/epa";
import { EnteteUsines, ReserveEpa, SiteProduction, TableUsines } from "@/components/UsinesEpa";
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

  let list: Fournisseur[] = [...FOURNISSEURS];
  if (cherche) list = list.filter((f) => contient(f.nom));
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
  const PISTES_EPA = USINES_SOURCING.filter(
    (u) => !u.lienOnssa && u.corroboreeApvma && (!cherche || contient(u.nom))
  );
  const CHINE = USINES_CHINE.filter((u) => !cherche || contient(u.nom));
  const PISTES = PISTES_NOUVELLES.filter((p) => !cherche || contient(p.nom));

  return (
    <>
      <div className="fil">Étape 5 — fournisseur</div>
      <h1>Qui peut porter le dossier</h1>
      <p style={{ color: "var(--muted)", maxWidth: "88ch", lineHeight: 1.55, margin: "0 0 16px" }}>
        Les {FOURNISSEURS.length} sociétés de l&apos;index. Un fournisseur ne se choisit pas que sur
        le pays : il doit détenir les études qui remplissent l&apos;Annexe 3-B.
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
            Filtré sur <strong style={{ color: "var(--fg)" }}>« {sp.q} »</strong> — {list.length}{" "}
            fournisseur(s), {PISTES.length} piste(s), {CHINE.length} usine(s) chinoise(s).
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
          <span className="eyebrow">Pays de sourcing</span>
          <strong className="mono" style={{ fontSize: 17, fontWeight: 600 }}>{so.parPays.length}</strong>
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
          <span className="eyebrow">Sites de production situés</span>
          <strong className="mono" style={{ fontSize: 17, fontWeight: 600, color: "var(--info)" }}>
            {STATS_EPA.nbFournisseursAvecUsine}
          </strong>
        </div>
        <div>
          <span className="eyebrow">Usines chinoises</span>
          <strong className="mono" style={{ fontSize: 17, fontWeight: 600, color: "var(--info)" }}>
            {STATS_ICAMA.nbFabricants}
          </strong>
        </div>
        <div>
          <span className="eyebrow">Pays non inféré</span>
          <strong className="mono" style={{ fontSize: 17, fontWeight: 600, color: "var(--mod)" }}>
            {so.nbPaysInconnus}
          </strong>
        </div>
      </div>

      <div className="card" style={{ padding: "12px 15px", marginBottom: 14 }}>
        <div className="eyebrow" style={{ marginBottom: 8 }}>Pays</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
          <Chip href={q({ pays: undefined })} actif={!sp.pays}>Tous</Chip>
          {so.parPays.map(([p, n]) => (
            <Chip key={p} href={q({ pays: p })} actif={sp.pays === p}>
              {p} <span className="mono" style={{ opacity: 0.65 }}>{n}</span>
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

      <div style={{ marginBottom: 14 }}>
        <Aide titre="Fiabilité du pays et des agréments">
          <p>
            Le pays est <strong>inféré</strong> du nom de la société ; « ? » signale une déduction
            faite sur le seul suffixe juridique.
          </p>
          <p>
            Les agréments sont <strong>déclaratifs</strong> — ce que le fournisseur affirme détenir,
            à saisir dans <span className="mono">data/fournisseurs-packs.json</span> avec sa source.
            Ni l&apos;un ni l&apos;autre ne remplace une vérification avant engagement.
          </p>
        </Aide>
      </div>

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
        <p style={{ color: "var(--muted)", fontSize: 13, maxWidth: "88ch", lineHeight: 1.6, margin: "8px 0 0" }}>
          L&apos;index marocain ne nomme que les sociétés déjà entrées au Maroc. Le registre APVMA
          publie le détenteur de chaque homologation australienne : on y trouve{" "}
          <strong style={{ color: "var(--fg)" }}>{STATS_PISTES.nbNouvelles} génériqueurs</strong>{" "}
          ({STATS_PISTES.nbAbsentes} sans aucun rapprochement, {STATS_PISTES.nbHomonymes} homonymes
          d&apos;un fournisseur de l&apos;index) que la seule lecture de l&apos;index ne peut pas
          révéler.
        </p>

        <Figure
          titre="Trois gisements, deux voies"
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
        <p style={{ color: "var(--muted)", fontSize: 13, maxWidth: "88ch", lineHeight: 1.6, margin: "8px 0 12px" }}>
          Pour exporter un pesticide vers les États-Unis, le <strong style={{ color: "var(--fg)" }}>site
          qui le produit</strong> doit être enregistré auprès de l&apos;EPA. Le registre donne donc
          les usines du monde entier avec leur ville — {STATS_EPA.nbEtrangers.toLocaleString("fr")}{" "}
          hors États-Unis, dans {STATS_EPA.nbPays} pays. C&apos;est la seule voie trouvée vers
          l&apos;Inde et la Turquie, dont les registres nationaux sont fermés ou muets sur le
          titulaire.
        </p>
        <p style={{ color: "var(--muted)", fontSize: 13, maxWidth: "88ch", lineHeight: 1.6, margin: "0 0 12px" }}>
          Ne sont listées ici que les usines de pays de sourcing{" "}
          <strong style={{ color: "var(--fg)" }}>absentes de l&apos;index marocain et confirmées
          par une homologation australienne</strong> : le cumul des deux écarte le bruit du
          registre, qui couvre aussi les emballages et les cosmétiques.
        </p>
        <div className="bloc">
          <TableUsines usines={PISTES_EPA} />
          <ReserveEpa attribution={STATS_EPA.attribution} />
        </div>
      </div>

      <div className="section">
        <span className="h-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Factory size={14} color="var(--info)" /> Usines chinoises — les plus polyvalentes
        </span>
        <p style={{ color: "var(--muted)", fontSize: 13, maxWidth: "88ch", lineHeight: 1.6, margin: "8px 0 12px" }}>
          Sociétés détenant à la fois une <strong style={{ color: "var(--fg)" }}>homologation
          chinoise de matière active technique</strong> et une{" "}
          <strong style={{ color: "var(--fg)" }}>licence de production</strong>, classées par nombre
          de matières actives de l&apos;index marocain couvertes. C&apos;est la liste par laquelle
          commencer une consultation — une seule société y couvre souvent plusieurs cibles.
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
                  <td style={{ fontWeight: 500 }}>{u.nom}</td>
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
            Source <span className="mono">{STATS_ICAMA.attribution}</span>. Aucune valeur
            réglementaire au Maroc : ni voie me-too, ni étude en moins. Ces sociétés ne sont pas
            rapprochées de l&apos;index ONSSA — l&apos;ICAMA écrit les raisons sociales en
            caractères chinois, l&apos;index en alphabet latin, et aucune règle automatique ne peut
            établir qu&apos;il s&apos;agit de la même société. Le détail par matière active figure
            sur chaque fiche de prospection.
          </p>
        </div>
      </div>

      <p style={{ fontSize: 11, color: "var(--muted-2)", marginTop: 14, lineHeight: 1.5 }}>
        Pays cibles du sourcing générique : {PAYS_CIBLES.join(", ")}.
      </p>
    </>
  );
}
