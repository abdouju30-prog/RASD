import { detenteurActuel } from "@/lib/detenteur";
import { NouvellesUsines } from "@/components/NouvellesUsines";
import { STATS_ANNUAIRE } from "@/lib/annuaire";
import Link from "next/link";
import { Compass, Factory, Search } from "lucide-react";
import { FOURNISSEURS, MATIERES } from "@/lib/data";
import { statsSourcing } from "@/lib/sourcing";
import { ficheFournisseur } from "@/lib/packs-fournisseur";
import { PISTES_NOUVELLES, STATS_PISTES } from "@/lib/pistes";
import { EtiquetteLien, ReservePistes } from "@/components/PistesFournisseur";
import { LiensMatieres } from "@/components/LienMatiere";
import { STATS_ICAMA, USINES_CHINE, anglaisDe, licenceLisible, nomCherchable } from "@/lib/icama";
import { NomChinois } from "@/components/NomChinois";
import { NomRusse } from "@/components/NomRusse";
import { etiquetteRusse } from "@/lib/cyrillique";
import { STATS_BKU, USINES_TURQUES } from "@/lib/bku";
import { STATS_EPA, USINES_SOURCING, usinesDe } from "@/lib/epa";
import { ReserveEpa, SiteProduction, TableUsines } from "@/components/UsinesEpa";
import { fichePays } from "@/lib/pays";
import { BlocPays } from "@/components/FichePays";
import { PRODUCTEURS_RUSSES, STATS_RUSSIE } from "@/lib/russie";
import { USINES_BRESIL, STATS_BRESIL } from "@/lib/bresil";
import { SOCIETES_COREE, STATS_COREE, etiquette } from "@/lib/coree";
import { nbEtranger, resoudre } from "@/lib/requete";
import { contactDe } from "@/lib/contact";
import { ContactCell, ValiditeIcama } from "@/components/Contact";
import { contactIcama } from "@/lib/contacts-icama";
import type { Fournisseur } from "@/lib/types";
import { REGISTRES_OUVERTS, societesDuRegistre } from "@/lib/registres-ouverts";

export const dynamic = "force-dynamic";

const MAX = 40;

const SOURCES = [
  "onssa",
  "bresil",
  "chine",
  "turquie",
  "epa",
  "coree",
  "russie",
  "apvma",
] as const;
type Source = (typeof SOURCES)[number];

function estSource(s: string | undefined): s is Source {
  return !!s && (SOURCES as readonly string[]).includes(s);
}

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

function Pastille({
  href,
  actif,
  nom,
  n,
  note,
}: {
  href: string;
  actif: boolean;
  nom: string;
  n: number;
  note?: string;
}) {
  return (
    <Link
      href={href}
      aria-current={actif ? "page" : undefined}
      title={note}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        padding: "8px 12px",
        borderRadius: 8,
        border: actif ? "1px solid color-mix(in srgb, var(--accent) 45%, transparent)" : "1px solid var(--border)",
        background: actif ? "var(--accent-fond)" : "var(--card)",
        color: actif ? "var(--accent)" : "var(--fg)",
        fontWeight: actif ? 600 : 500,
        fontSize: 13,
      }}
    >
      <span>{nom}</span>
      <span
        className="mono"
        style={{
          fontSize: 11,
          padding: "1px 7px",
          borderRadius: 10,
          background: actif ? "var(--accent)" : "color-mix(in srgb, var(--border) 60%, transparent)",
          color: actif ? "#fff" : "var(--muted-2)",
        }}
      >
        {n}
      </span>
    </Link>
  );
}

export default async function FournisseursPage({
  searchParams,
}: {
  searchParams: Promise<{ pays?: string; profil?: string; q?: string; source?: string; tout?: string }>;
}) {
  const sp = await searchParams;
  const d = await detenteurActuel();
  const ouvert = REGISTRES_OUVERTS.find((r) => r.id === sp.source) ?? null;
  const source: Source | null = ouvert ? null : estSource(sp.source) ? sp.source : "onssa";
  const etendu = sp.tout === "1";
  const plafond = etendu ? Number.POSITIVE_INFINITY : MAX;
  const so = statsSourcing();
  const parMa = matieresPar();

  const cherche = (sp.q ?? "").trim().toLowerCase();
  const contient = (x: string) => x.toLowerCase().includes(cherche);

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
    for (const [k, v] of Object.entries({
      pays: sp.pays,
      profil: sp.profil,
      q: sp.q,
      source: sp.source,
      tout: sp.tout,
      ...o,
    }))
      if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/fournisseurs?${s}` : "/fournisseurs";
  };
  const hrefElargir = `${q({ tout: "1" })}#resultats`;
  const hrefReduire = `${q({ tout: undefined })}#resultats`;
  const pied = (total: number) =>
    total > MAX ? (
      <PiedReste n={total - MAX} etendu={etendu} hrefElargir={hrefElargir} hrefReduire={hrefReduire} />
    ) : null;

  const PISTES_EPA = surMatiere
    ? []
    : USINES_SOURCING.filter(
        (u) => !u.lienOnssa && u.corroboreeApvma && (!cherche || contient(u.nom))
      );
  const CHINE = surMatiere
    ? surMatiere.gisement.chine
    : USINES_CHINE.filter(
        (u) =>
          !cherche ||
          contient(u.nom) ||
          contient(u.latin ?? "") ||
          contient(u.glose ?? "") ||
          contient(anglaisDe(u.nom)?.nomAnglais ?? "")
      );
  const CHINE_TC = surMatiere?.gisement.chineTc ?? [];
  const TURQUIE = surMatiere
    ? surMatiere.gisement.turquie
    : USINES_TURQUES.filter((u) => !cherche || contient(u.nom ?? ""));
  const PISTES = surMatiere
    ? surMatiere.gisement.apvma
    : PISTES_NOUVELLES.filter((p) => !cherche || contient(p.nom));
  const RUSSIE = surMatiere
    ? surMatiere.gisement.russie
    : PRODUCTEURS_RUSSES.filter(
        (s) => !cherche || contient(s.nom) || contient(s.latin) || contient(etiquetteRusse(s))
      );
  const BRESIL = surMatiere
    ? surMatiere.gisement.bresil
    : USINES_BRESIL.filter((u) => !cherche || contient(u.nom));
  const COREE = surMatiere
    ? surMatiere.gisement.coree
    : SOCIETES_COREE.filter(
        (s) => !cherche || contient(s.nom) || contient(s.latin ?? "") || contient(s.commercial ?? "")
      );

  const comptes: Record<Source, number> = {
    onssa: list.length,
    bresil: BRESIL.length,
    chine: surMatiere ? CHINE_TC.length : CHINE.length,
    turquie: TURQUIE.length,
    epa: PISTES_EPA.length,
    coree: COREE.length,
    russie: RUSSIE.length,
    apvma: PISTES.length,
  };

  return (
    <>
      <h1>Qui peut porter le dossier</h1>
      <Link href="/annuaire" className="card" style={{ display: "block", padding: "12px 16px", margin: "8px 0 0", fontSize: 14 }}>
        <strong>Annuaire mondial : {STATS_ANNUAIRE.nbFabricants.toLocaleString("fr")} fabricants dans {STATS_ANNUAIRE.nbPays} pays</strong>
        <span style={{ color: "var(--muted)", fontSize: 13 }}> — OCDE, Amérique latine, Chine, Inde, Russie… une ligne par société, tous registres réunis →</span>
      </Link>
      <NouvellesUsines detenteurId={d.id} />

      <form
        action="/fournisseurs"
        method="get"
        style={{ display: "flex", gap: 8, marginBottom: 14, maxWidth: 560 }}
      >
        {sp.source && sp.source !== "onssa" && <input type="hidden" name="source" value={sp.source} />}
        <div style={{ position: "relative", flex: 1 }}>
          <Search
            size={14}
            style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--muted-2)" }}
          />
          <input
            name="q"
            defaultValue={sp.q ?? ""}
            placeholder="Molécule ou société — ex. emamectine"
            aria-label="Molécule ou société"
            style={{
              width: "100%",
              padding: "9px 12px 9px 32px",
              border: "1px solid var(--border-strong)",
              borderRadius: 8,
              fontSize: 13.5,
              fontFamily: "var(--sans)",
              background: "var(--card)",
              color: "var(--fg)",
            }}
          />
        </div>
        <button
          type="submit"
          className="pill"
          style={{
            fontWeight: 600,
            color: "var(--accent-fg)",
            background: "var(--accent)",
            borderColor: "var(--accent)",
            padding: "8px 14px",
            cursor: "pointer",
          }}
        >
          Chercher
        </button>
      </form>

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
                </strong>
                {" — "}
                <strong style={{ color: "var(--accent)" }}>{list.length}</strong> me-too ONSSA
                {nbEtranger(surMatiere.gisement) > 0 && (
                  <>
                    {" · "}
                    <strong style={{ color: "var(--info)" }}>{nbEtranger(surMatiere.gisement)}</strong>{" "}
                    piste(s) étrangère(s)
                  </>
                )}
              </>
            ) : (
              <>
                Filtré sur <strong style={{ color: "var(--fg)" }}>« {sp.q} »</strong> —{" "}
                {list.length} fournisseur(s) ONSSA. Aucune matière active de l&apos;index ne porte
                ce nom.
              </>
            )}
          </span>
          <Link href={q({ q: undefined })} className="link-accent" style={{ marginLeft: "auto" }}>
            Effacer
          </Link>
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
        <Pastille href={q({ source: "onssa" })} actif={source === "onssa"} nom="ONSSA" n={comptes.onssa} note="Voie me-too — déjà à l'index marocain" />
        <Pastille href={q({ source: "bresil" })} actif={source === "bresil"} nom="Brésil" n={comptes.bresil} note="AGROFIT — usine de synthèse déclarée" />
        <Pastille href={q({ source: "chine" })} actif={source === "chine"} nom="Chine" n={comptes.chine} note="ICAMA — licence de production" />
        <Pastille href={q({ source: "turquie" })} actif={source === "turquie"} nom="Turquie" n={comptes.turquie} note="BKÜ — İMAL, fabriqué sur place" />
        <Pastille href={q({ source: "epa" })} actif={source === "epa"} nom="EPA" n={comptes.epa} note="Sites de production déclarés aux États-Unis" />
        <Pastille href={q({ source: "coree" })} actif={source === "coree"} nom="Corée" n={comptes.coree} note="PSIS — titulaire, avec la date" />
        <Pastille href={q({ source: "russie" })} actif={source === "russie"} nom="Russie" n={comptes.russie} note="Catalogue d'État" />
        <Pastille href={q({ source: "apvma" })} actif={source === "apvma"} nom="Australie" n={comptes.apvma} note="PUBCRIS — détenteur, pas usine" />
        {REGISTRES_OUVERTS.map((r) => (
          <Pastille
            key={r.id}
            href={q({ source: r.id })}
            actif={sp.source === r.id}
            nom={r.pays}
            n={societesDuRegistre(r.id, cherche, surMatiere?.molecules ?? []).length}
            note={r.autorite}
          />
        ))}
      </div>
      <p style={{ fontSize: 12, color: "var(--muted-2)", margin: "0 0 16px" }}>
        {surMatiere
          ? "Comptes pour cette molécule. Cliquez une pastille pour ouvrir le registre."
          : "Sans molécule, les comptes sont ceux du registre entier. Tapez un nom pour ne voir que qui la fabrique."}
      </p>

      {ouvert && (
        <div className="bloc">
          <div className="titre">
            <span>{ouvert.pays} — {ouvert.autorite}</span>
            <span className="mono">{societesDuRegistre(ouvert.id, cherche, surMatiere?.molecules ?? []).length}</span>
          </div>
          <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "8px 0 4px", lineHeight: 1.55 }}>
            {ouvert.nomme}.{" "}
            <a href={ouvert.url} target="_blank" rel="noreferrer" className="link-accent">
              Source
            </a>
          </p>
          <p style={{ fontSize: 12, color: "var(--high)", margin: "0 0 8px", lineHeight: 1.5 }}>{ouvert.avertissement}</p>
          {societesDuRegistre(ouvert.id, cherche, surMatiere?.molecules ?? []).length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--muted)", padding: "12px 0" }}>
              {ouvert.nbSocietes === 0
                ? "La source est identifiée. Le fichier public ne permet pas d'en extraire les sociétés."
                : "Aucune société de ce registre pour cette recherche."}
            </p>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Société</th>
                  <th>Matières</th>
                  <th style={{ textAlign: "right" }}>Lignes</th>
                </tr>
              </thead>
              <tbody>
                {societesDuRegistre(ouvert.id, cherche, surMatiere?.molecules ?? [])
                  .slice(0, plafond)
                  .map((s) => (
                    <tr key={s.nom}>
                      <td style={{ fontWeight: 600 }}>{s.nom}</td>
                      <td style={{ fontSize: 12.5, color: "var(--muted)" }}>
                        {[...s.matieres]
                          .sort(
                            (a, b) =>
                              Number(
                                (surMatiere?.molecules ?? []).some((m) =>
                                  b.toLowerCase().includes(m.toLowerCase())
                                )
                              ) -
                              Number(
                                (surMatiere?.molecules ?? []).some((m) =>
                                  a.toLowerCase().includes(m.toLowerCase())
                                )
                              )
                          )
                          .slice(0, 4)
                          .join(" · ") || "—"}
                        {s.matieres.length > 4 && (
                          <span className="mono"> +{s.matieres.length - 4}</span>
                        )}
                      </td>
                      <td className="mono" style={{ textAlign: "right" }}>{s.nb}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {source === "onssa" && (
        <>
          <div className="card" style={{ padding: "12px 15px", marginBottom: 14 }}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>Pays — index ONSSA</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
              <Chip href={q({ pays: undefined })} actif={!sp.pays}>Tous</Chip>
              {so.parPays.slice(0, 16).map(([pays, n]) => (
                <Chip key={pays} href={q({ pays })} actif={sp.pays === pays}>
                  {pays} <span className="mono" style={{ opacity: 0.65 }}>{n}</span>
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
          {sp.pays && fichePays(sp.pays) && (
            <div style={{ marginBottom: 16 }}>
              <BlocPays fiche={fichePays(sp.pays)} />
            </div>
          )}
          <div className="bloc">
            <div className="titre" id="resultats">
              <span>Fournisseurs ONSSA</span>
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
                  <th>Contact</th>
                </tr>
              </thead>
              <tbody>
                {list.slice(0, plafond).map((f) => {
                  const mas = parMa.get(f.nom) ?? [];
                  const masVues = etendu ? mas : mas.slice(0, 3);
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
                          <span className="pill" style={{ fontSize: 10, color: "var(--accent)", borderColor: "color-mix(in srgb, var(--accent) 40%, transparent)", background: "var(--accent-fond)" }}>générique</span>
                        ) : f.multinationale ? (
                          <span className="pill" style={{ fontSize: 10 }}>multinationale</span>
                        ) : (
                          <span className="pill" style={{ fontSize: 10 }}>autre</span>
                        )}
                      </td>
                      <td className="mono" style={{ textAlign: "right" }}>{f.nbLignesMaroc}</td>
                      <td className="mono" style={{ textAlign: "right" }}>{f.nbMatieresActives}</td>
                      <td style={{ fontSize: 11.5, color: "var(--muted)", maxWidth: 320 }}>
                        {masVues.map((m, i) => (
                          <span key={m.id}>
                            {i > 0 && " · "}
                            <Link href={`/sourcing/${m.id}`} className="link-accent" style={{ fontWeight: 500 }}>{m.nom}</Link>
                          </span>
                        ))}
                        {!etendu && mas.length > 3 && (
                          <Link
                            href={hrefElargir}
                            className="link-accent mono"
                            title="Afficher les autres matières et le reste des fournisseurs"
                          >
                            {" "}
                            +{mas.length - 3}
                          </Link>
                        )}
                        {mas.length === 0 && <span style={{ color: "var(--muted-2)" }}>—</span>}
                      </td>
                      <td>
                        <ContactCell c={contactDe(f.nom, f.id)} nom={f.nom} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {pied(list.length)}
            {list.length === 0 && (
              <p style={{ fontSize: 13, color: "var(--muted)", padding: "20px 0" }}>
                Aucun fournisseur ONSSA ne correspond.
              </p>
            )}
          </div>
        </>
      )}

      {source === "bresil" && (
        <BlocSource icone titre="Usines de synthèse — AGROFIT" n={BRESIL.length} reserve={STATS_BRESIL.avertissement}>
          {BRESIL.length === 0 ? (
            <Vide texte="Aucun fabricant de technique déclaré à l'AGROFIT pour cette molécule." />
          ) : (
            <>
          <table className="tbl">
            <thead>
              <tr>
                <th>Société</th>
                <th>Site déclaré</th>
                <th>Pays</th>
                <th style={{ textAlign: "right" }}>M.A. index</th>
              </tr>
            </thead>
            <tbody>
              {BRESIL.slice(0, plafond).map((u) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 500 }}>{u.nom}</td>
                  <td style={{ fontSize: 12, color: "var(--muted)", maxWidth: 220 }}>{u.sites.join(" · ") || "—"}</td>
                  <td style={{ color: "var(--muted)" }}>{u.pays ?? u.paysBrut ?? "—"}</td>
                  <td className="mono" style={{ textAlign: "right", color: "var(--accent)", fontWeight: 600 }}>{u.matieres.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {pied(BRESIL.length)}
            </>
          )}
        </BlocSource>
      )}

      {source === "chine" && (
        <BlocSource
          icone
          titre="Usines chinoises — ICAMA"
          n={surMatiere ? CHINE_TC.length : CHINE.length}
          reserve={
            surMatiere
              ? `ICAMA — ${surMatiere.gisement.chineNoms.join(" · ") || "nom chinois non relevé"}. Une licence de production n'est pas une offre : le catalogue public est testé à part. Contacts GET HTTP 200 ; ce n'est pas un envoi de courriel.`
              : STATS_ICAMA.attribution
          }
        >
          {surMatiere ? (
            CHINE_TC.length === 0 ? (
              <Vide texte="Aucune homologation de matière active technique relevée à l'ICAMA pour cette molécule." />
            ) : (
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Société</th>
                    <th>Contact</th>
                    <th>Validité</th>
                    <th>Région</th>
                    <th style={{ textAlign: "right" }}>Teneur</th>
                  </tr>
                </thead>
                <tbody>
                  {CHINE_TC.slice(0, plafond).map((u) => {
                    const ic = contactIcama(u.nom);
                    return (
                      <tr key={u.nom}>
                        <td>
                          <NomChinois nom={u.nom} latin={u.latin} glose={u.glose} />
                        </td>
                        <td>
                          <ContactCell c={contactDe(u.nom)} nom={nomCherchable(u)} />
                        </td>
                        <td>
                          <ValiditeIcama
                            licence={u.licenceProduction}
                            teneur={u.teneurMax}
                            expiration={u.expirationMax}
                            c={ic}
                          />
                        </td>
                        <td style={{ fontSize: 12, color: "var(--muted)" }}>{u.region ?? "—"}</td>
                        <td className="mono" style={{ textAlign: "right", fontWeight: 600 }}>
                          {u.teneurMax ?? "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Société</th>
                  <th style={{ textAlign: "right" }}>M.A. index</th>
                  <th style={{ textAlign: "right" }}>Homolog. TC</th>
                  <th>Matières actives</th>
                  <th>Licence</th>
                </tr>
              </thead>
              <tbody>
                {CHINE.slice(0, plafond).map((u) => (
                  <tr key={u.nom}>
                    <td>
                      <NomChinois nom={u.nom} latin={u.latin} glose={u.glose} region={u.region} />
                    </td>
                    <td className="mono" style={{ textAlign: "right", color: "var(--accent)", fontWeight: 600 }}>{u.matieres.length}</td>
                    <td className="mono" style={{ textAlign: "right" }}>{u.nbHomologations}</td>
                    <td style={{ fontSize: 11.5, maxWidth: 340 }}>
                      <LiensMatieres
                        noms={u.matieres}
                        max={etendu ? undefined : 5}
                        resteHref={hrefElargir}
                      />
                    </td>
                    <td className="mono" style={{ fontSize: 11.5, color: "var(--low)" }} title={u.licenceProduction ?? undefined}>
                      {licenceLisible(u.licenceProduction)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {pied(surMatiere ? CHINE_TC.length : CHINE.length)}
        </BlocSource>
      )}

      {source === "turquie" && (
        <BlocSource icone titre="Fabricants turcs — BKÜ İMAL" n={TURQUIE.length} reserve={`${STATS_BKU.attribution} · İMAL = formulation en Turquie, pas la synthèse du technique.`}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Société</th>
                <th style={{ textAlign: "right" }}>M.A. index</th>
                <th style={{ textAlign: "right" }}>İMAL</th>
                <th>Matières actives</th>
                <th>Adresse</th>
              </tr>
            </thead>
            <tbody>
              {TURQUIE.slice(0, plafond).map((u) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 500 }}>{u.nom}</td>
                  <td className="mono" style={{ textAlign: "right", color: "var(--accent)", fontWeight: 600 }}>{u.matieresMaroc.length}</td>
                  <td className="mono" style={{ textAlign: "right" }}>{u.nbImal}</td>
                  <td style={{ fontSize: 11.5, maxWidth: 320 }}>
                    <LiensMatieres
                      noms={u.matieresMaroc}
                      max={etendu ? undefined : 4}
                      resteHref={hrefElargir}
                    />
                  </td>
                  <td style={{ fontSize: 11.5, color: "var(--muted)", maxWidth: 240 }}>{u.adresse ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {pied(TURQUIE.length)}
        </BlocSource>
      )}

      {source === "epa" && (
        <BlocSource
          icone
          titre="Sites de production — EPA"
          n={PISTES_EPA.length}
          reserve={
            surMatiere
              ? "L'EPA ne publie pas la matière active. Un compteur d'usines au nom du fournisseur ONSSA faisait croire à des sources qui n'existaient pas dans cette table. Les sites de Bayer (et des autres déjà à l'index) restent dans l'onglet ONSSA."
              : STATS_EPA.attribution
          }
        >
          {PISTES_EPA.length === 0 ? (
            <Vide
              texte={
                surMatiere
                  ? "Pas de piste EPA propre à cette molécule — le registre ne dit pas quoi on y fabrique."
                  : "Aucun site."
              }
            />
          ) : (
            <>
              <TableUsines usines={PISTES_EPA.slice(0, plafond)} />
              {pied(PISTES_EPA.length)}
            </>
          )}
          {!surMatiere && <ReserveEpa attribution={STATS_EPA.attribution} />}
        </BlocSource>
      )}

      {source === "coree" && (
        <BlocSource icone titre="Titulaires — PSIS Corée" n={COREE.length} reserve={STATS_COREE.avertissement}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Société</th>
                <th>Romanisation</th>
                <th style={{ textAlign: "right" }}>Homologations</th>
                <th>Dernière</th>
                <th>Matières actives</th>
              </tr>
            </thead>
            <tbody>
              {COREE.slice(0, plafond).map((s) => (
                <tr key={s.cle}>
                  <td style={{ fontWeight: 500 }}>{etiquette(s)}</td>
                  <td className="mono" style={{ fontSize: 11.5, color: "var(--muted)" }}>{s.latin ?? "—"}</td>
                  <td className="mono" style={{ textAlign: "right", color: "var(--accent)", fontWeight: 600 }}>{s.nbHomologations}</td>
                  <td className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>{s.derniere ?? "—"}</td>
                  <td style={{ fontSize: 11.5, maxWidth: 280 }}>
                    {s.matieres.length ? (
                      <LiensMatieres
                        noms={s.matieres}
                        max={etendu ? undefined : 4}
                        resteHref={hrefElargir}
                      />
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {pied(COREE.length)}
        </BlocSource>
      )}

      {source === "russie" && (
        <BlocSource icone titre="Détenteurs — catalogue russe" n={RUSSIE.length} reserve={`${STATS_RUSSIE.attribution} · Noms en lecture française ; le cyrillique du catalogue reste sous chaque ligne.`}>
          {RUSSIE.length === 0 ? (
            <Vide texte="Aucun détenteur au catalogue russe sur cette molécule." />
          ) : (
            <>
          <table className="tbl">
            <thead>
              <tr>
                <th>Société</th>
                <th style={{ textAlign: "right" }}>Homologations</th>
                <th>Pays</th>
              </tr>
            </thead>
            <tbody>
              {RUSSIE.slice(0, plafond).map((s) => (
                <tr key={s.cle}>
                  <td>
                    <NomRusse s={s} />
                  </td>
                  <td className="mono" style={{ textAlign: "right", color: "var(--accent)", fontWeight: 600 }}>{s.nbHomologations}</td>
                  <td style={{ fontSize: 12, color: "var(--muted)" }}>{s.pays ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {pied(RUSSIE.length)}
            </>
          )}
        </BlocSource>
      )}

      {source === "apvma" && (
        <BlocSource titre={surMatiere ? "Détenteurs — PUBCRIS" : "Pistes hors index — PUBCRIS"} n={PISTES.length} reserve="Une homologation australienne n'ouvre aucun droit devant l'ONSSA. L'originateur (Bayer, etc.) apparaît s'il y est — ce n'est pas une piste nouvelle." compass>
          {PISTES.length === 0 ? (
            <Vide texte="Aucun détenteur PUBCRIS apparié à cette molécule." />
          ) : (
            <>
          <table className="tbl">
            <thead>
              <tr>
                <th>Société</th>
                <th>Pays présumé</th>
                <th style={{ textAlign: "right" }}>M.A. en AU</th>
                <th style={{ textAlign: "right" }}>dont Maroc</th>
                <th>Terrain commun</th>
                <th>Index ONSSA</th>
              </tr>
            </thead>
            <tbody>
              {PISTES.slice(0, plafond).map((p) => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 500 }}>
                    <Link href={`/fournisseurs/piste/${p.id}`} className="link-accent">
                      {p.nom}
                    </Link>
                  </td>
                  <td style={{ color: "var(--muted)" }}>
                    {p.pays ?? "à préciser"}
                    {p.pays && !p.paysFiable && <span style={{ color: "var(--mod)", fontSize: 11 }}> ?</span>}
                  </td>
                  <td className="mono" style={{ textAlign: "right" }}>{p.matieres.length}</td>
                  <td className="mono" style={{ textAlign: "right", color: p.matieresMaroc.length ? "var(--accent)" : "var(--muted-2)", fontWeight: p.matieresMaroc.length ? 600 : 400 }}>
                    {p.matieresMaroc.length}
                  </td>
                  <td style={{ fontSize: 11.5, maxWidth: 360 }}>
                    {p.matieresMaroc.length ? (
                      <LiensMatieres
                        noms={p.matieresMaroc}
                        max={etendu ? undefined : 4}
                        resteHref={`/fournisseurs/piste/${p.id}`}
                      />
                    ) : (
                      <span style={{ color: "var(--muted-2)" }}>aucune</span>
                    )}
                  </td>
                  <td>
                    <EtiquetteLien lien={p.lien} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {pied(PISTES.length)}
            </>
          )}
          <ReservePistes source={STATS_PISTES.source} />
        </BlocSource>
      )}
    </>
  );
}

function Vide({ texte }: { texte: string }) {
  return (
    <p style={{ fontSize: 13, color: "var(--muted)", margin: "8px 0 0", lineHeight: 1.55 }}>{texte}</p>
  );
}

function PiedReste({
  n,
  etendu,
  hrefElargir,
  hrefReduire,
}: {
  n: number;
  etendu: boolean;
  hrefElargir: string;
  hrefReduire: string;
}) {
  return (
    <p style={{ fontSize: 11.5, color: "var(--muted-2)", marginTop: 10 }}>
      {etendu ? (
        <>
          Liste complète.{" "}
          <Link href={hrefReduire} className="link-accent">
            Réduire aux {`${MAX} premiers`}
          </Link>
        </>
      ) : (
        <>
          <Link href={hrefElargir} className="link-accent">
            {`${n} autres`}
          </Link>
          {" — afficher le reste de la liste."}
        </>
      )}
    </p>
  );
}

function BlocSource({
  titre,
  n,
  reserve,
  children,
  icone,
  compass,
}: {
  titre: string;
  n: number;
  reserve?: string;
  children: React.ReactNode;
  icone?: boolean;
  compass?: boolean;
}) {
  return (
    <div className="section" style={{ marginTop: 0 }}>
      <span className="h-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {compass ? <Compass size={14} color="var(--info)" /> : icone ? <Factory size={14} color="var(--info)" /> : null}
        {titre}
      </span>
      <div className="bloc" style={{ marginTop: 12 }}>
        <div className="titre" id="resultats">
          <span>Résultats</span>
          <span className="mono">{n}</span>
        </div>
        {children}
        {reserve && (
          <p style={{ fontSize: 11.5, color: "var(--muted-2)", marginTop: 12, lineHeight: 1.55 }}>{reserve}</p>
        )}
      </div>
    </div>
  );
}
