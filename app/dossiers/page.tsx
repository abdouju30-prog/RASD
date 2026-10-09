import Link from "next/link";
import { detenteurActuel } from "@/lib/detenteur";
import { getMatiere } from "@/lib/data";
import { ammEcheance, ammExpirees, fmtDate, portefeuilleClasse } from "@/lib/logic";
import { candidats } from "@/lib/sourcing";
import { DELAIS_INDICATIFS } from "@/lib/dossier";
import { alternatives } from "@/lib/substitution";
import { PISTES_PRETES } from "@/lib/melanges";
import { idMatiere } from "@/lib/liens";
import {
  inventaireCibles,
  inventaireCultures,
  listerEnregistrements,
  resoudreCible,
  resoudreCulture,
} from "@/lib/usages";

function norm(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function BoutonDossier({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="pill"
      style={{
        fontWeight: 600,
        fontSize: 12,
        color: "var(--accent-fg)",
        background: "var(--accent)",
        borderColor: "var(--accent)",
      }}
    >
      Dossier 3-B
    </Link>
  );
}

function EmploiMarocain({
  culture: cultureSaisie,
  cible: cibleSaisie,
  file,
}: {
  culture?: string;
  cible?: string;
  file?: File;
}) {
  const culture = resoudreCulture(cultureSaisie ?? "");
  const cible = resoudreCible(cibleSaisie ?? "");
  const actif = Boolean(culture || cible);
  const cultures = inventaireCultures();
  const cibles = inventaireCibles();

  const resultat = actif
    ? listerEnregistrements(
        { culture, cible, matiere: null, societe: null, statut: "vigueur" },
        2000
      )
    : null;
  const enregistrements = resultat?.lignes ?? [];

  const parMatiere = new Map<string, { nom: string; id: string | null; produits: Set<string>; dose: string | null }>();
  const parMelange = new Map<string, { libelle: string; composants: string[]; produits: Set<string>; dose: string | null }>();
  for (const l of enregistrements) {
    const nomsLigne = l.matieres.split(" · ").map((n) => n.trim()).filter((n) => n && n !== "—");
    for (const n of nomsLigne) {
      const e = parMatiere.get(n) ?? { nom: n, id: idMatiere(n), produits: new Set<string>(), dose: l.dose };
      e.produits.add(l.nom);
      if (!e.dose && l.dose) e.dose = l.dose;
      parMatiere.set(n, e);
    }
    if (nomsLigne.length < 2) continue;
    const cle = nomsLigne.map(norm).sort().join("|");
    const e = parMelange.get(cle) ?? { libelle: nomsLigne.join(" + "), composants: nomsLigne, produits: new Set<string>(), dose: l.dose };
    e.produits.add(l.nom);
    if (!e.dose && l.dose) e.dose = l.dose;
    parMelange.set(cle, e);
  }
  const matieres = [...parMatiere.values()].sort((a, b) => b.produits.size - a.produits.size).slice(0, 8);
  const melangesIci = [...parMelange.values()].sort((a, b) => b.produits.size - a.produits.size).slice(0, 6);
  const vendus = new Set(parMelange.keys());
  const noms = new Set([...parMatiere.keys()].map(norm));

  const ancreDe = (composants: string[]) => {
    const tries = [...composants].sort(
      (a, b) => (parMatiere.get(b)?.produits.size ?? 0) - (parMatiere.get(a)?.produits.size ?? 0)
    );
    for (const n of tries) {
      const id = parMatiere.get(n)?.id ?? idMatiere(n);
      if (id) return id;
    }
    return null;
  };

  const melangesNouveaux = actif
    ? PISTES_PRETES.filter((p) => {
        const maroc = p.composantsSitues.map((c) => c.auMaroc).filter((n): n is string => Boolean(n));
        if (maroc.length !== p.composantsSitues.length) return false;
        if (!maroc.every((n) => noms.has(norm(n)))) return false;
        return !vendus.has(maroc.map(norm).sort().join("|"));
      }).slice(0, 6)
    : [];

  return (
    <div className="card" style={{ padding: "16px 18px", marginBottom: 18 }}>
      <div className="h-title" style={{ marginBottom: 8 }}>
        Emploi au Maroc
      </div>
      <form className="requete" action="/dossiers" method="get">
        {file && <input type="hidden" name="file" value={file} />}
        <label>
          Culture
          <input name="culture" defaultValue={cultureSaisie ?? ""} placeholder="tomate" list="dos-cultures" autoComplete="off" />
        </label>
        <label>
          Ravageur
          <input name="cible" defaultValue={cibleSaisie ?? ""} placeholder="mildiou" list="dos-cibles" autoComplete="off" />
        </label>
        <div className="requete-actions">
          <button type="submit">Voir ce qui est praticable</button>
          {actif && (
            <Link href={file ? `/dossiers?file=${file}` : "/dossiers"} style={{ fontSize: 12, color: "var(--muted)" }}>
              Effacer
            </Link>
          )}
        </div>
        <datalist id="dos-cultures">
          {cultures.map((c) => (
            <option key={c.n} value={c.libelle} />
          ))}
        </datalist>
        <datalist id="dos-cibles">
          {cibles.slice(0, 400).map((c) => (
            <option key={c.n} value={c.libelle} />
          ))}
        </datalist>
      </form>

      {actif && (
        <div style={{ marginTop: 16 }}>
          <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 10px" }}>
            {resultat?.total ?? enregistrements.length} usage(s) en vigueur
            {culture ? ` sur ${culture}` : ""}
            {cible ? ` contre ${cible}` : ""}.
          </p>

          <div className="h-title" style={{ margin: "12px 0 6px" }}>Déjà homologué</div>
          {matieres.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--muted)" }}>Aucune AMM en vigueur pour cet emploi.</p>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Matière</th>
                  <th>Dose</th>
                  <th style={{ textAlign: "right" }}>Produits</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {matieres.map((m) => (
                  <tr key={m.nom}>
                    <td style={{ fontWeight: 600 }}>{m.nom}</td>
                    <td className="mono" style={{ fontSize: 12 }}>{m.dose || "—"}</td>
                    <td className="mono" style={{ textAlign: "right" }}>{m.produits.size}</td>
                    <td style={{ textAlign: "right" }}>
                      {m.id ? <BoutonDossier href={`/dossiers/generer/${m.id}?origine=prospection`} /> : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="h-title" style={{ margin: "16px 0 6px" }}>Mélange déjà vendu au Maroc</div>
          {melangesIci.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--muted)" }}>Aucune association de l&apos;index ne couvre cet emploi.</p>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Association</th>
                  <th style={{ textAlign: "right" }}>Produits</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {melangesIci.map((a) => {
                  const id = ancreDe(a.composants);
                  return (
                    <tr key={a.libelle}>
                      <td style={{ fontWeight: 600 }}>{a.libelle}</td>
                      <td className="mono" style={{ textAlign: "right" }}>{a.produits.size}</td>
                      <td style={{ textAlign: "right" }}>
                        {id ? <BoutonDossier href={`/dossiers/generer/${id}?origine=prospection`} /> : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          <div className="h-title" style={{ margin: "16px 0 6px" }}>Mélange nouveau, composants déjà au Maroc</div>
          <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 6px" }}>
            Chaque composant a une voie me-too. Le mélange reste une AMM neuve.
          </p>
          {melangesNouveaux.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--muted)" }}>
              Aucune association prête ne reprend une matière de cet emploi.
            </p>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Association</th>
                  <th style={{ textAlign: "right" }}>Hom. Corée</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {melangesNouveaux.map((p) => {
                  const id = ancreDe(p.composantsSitues.map((c) => c.auMaroc).filter((n): n is string => Boolean(n)));
                  return (
                    <tr key={p.cle}>
                      <td style={{ fontWeight: 600 }}>{p.composants.join(" + ")}</td>
                      <td className="mono" style={{ textAlign: "right" }}>{p.nbHomologations}</td>
                      <td style={{ textAlign: "right" }}>
                        {id ? <BoutonDossier href={`/dossiers/generer/${id}?origine=prospection`} /> : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

type File = "renouveler" | "substituer" | "homologuer";

const LIBELLE: Record<File, string> = {
  renouveler: "Renouveler",
  substituer: "Substituer",
  homologuer: "Homologuer",
};

export default async function DossiersPage({
  searchParams,
}: {
  searchParams: Promise<{ file?: string; culture?: string; cible?: string; maladie?: string }>;
}) {
  const sp = await searchParams;
  const file = (["renouveler", "substituer", "homologuer"] as File[]).find((f) => f === sp.file);

  const d = await detenteurActuel();
  const expirees = ammExpirees(d.id);
  const proches = ammEcheance(d.id, 18);
  const aSubstituer = portefeuilleClasse(d.id).filter((c) => (c.risque?.score ?? 0) >= 55);
  const opportunites = candidats({ maxDetenteurs: 2, detenteurId: d.id }).slice(0, 8);

  type Ligne = {
    key: string;
    file: File;
    titre: string;
    detail: string;
    href: string;
    rang: number;
    etiq: string;
    couleur: string;
  };

  const lignes: Ligne[] = [];

  for (const p of expirees) {
    lignes.push({
      key: `exp-${p.id}`,
      file: "renouveler",
      titre: p.nomCommercial,
      detail: `AMM ${p.amm ?? "—"} · ${p.usages.length} usage(s) · ${p.fournisseurs.join(", ")}`,
      // Un produit sorti de l'index peut porter une matière qui n'y figure plus :
      // pas de générateur possible, on renvoie vers son alerte.
      href: getMatiere(p.matieresActivesIds[0])
        ? `/dossiers/generer/${p.matieresActivesIds[0]}?type=renouvellement&produit=${encodeURIComponent(p.nomCommercial)}`
        : "/veille",
      rang: 0,
      etiq: `expirée ${fmtDate(p.expiration)}`,
      couleur: "var(--crit)",
    });
  }
  for (const p of proches) {
    if (expirees.includes(p)) continue;
    lignes.push({
      key: `ech-${p.id}`,
      file: "renouveler",
      titre: p.nomCommercial,
      detail: `AMM ${p.amm ?? "—"} · ${p.usages.length} usage(s) · ${p.fournisseurs.join(", ")}`,
      href: `/dossiers/generer/${p.matieresActivesIds[0]}?type=renouvellement&produit=${encodeURIComponent(p.nomCommercial)}`,
      rang: 1,
      etiq: `échéance ${fmtDate(p.expiration)}`,
      couleur: "var(--mod)",
    });
  }
  for (const { ma, risque, expo } of aSubstituer) {
    const alts = alternatives(ma.id, 2);
    lignes.push({
      key: `sub-${ma.id}`,
      file: "substituer",
      titre: ma.nom,
      detail:
        `${expo.produits} produit(s) · ${expo.usages} usage(s)` +
        (alts.length ? ` · remplacer : ${alts.map((a) => a.molecule).join(", ")}` : ""),
      href: `/dossiers/generer/${ma.id}?origine=substitution`,
      rang: 2 + (100 - (risque?.score ?? 55)) / 1000,
      etiq: risque ? `risque ${risque.score}` : "risque",
      couleur: (risque?.score ?? 0) >= 70 ? "var(--crit)" : "var(--high)",
    });
  }
  for (const c of opportunites) {
    lignes.push({
      key: `hom-${c.id}`,
      file: "homologuer",
      titre: c.nom,
      detail: `${c.nbUsages} usages · ${c.nbDetenteurs} détenteur(s) · ${c.paysSourcing.join(", ")}`,
      href: `/dossiers/generer/${c.id}?origine=prospection`,
      rang: 4 + (100 - c.score) / 1000,
      etiq: `score ${c.score}`,
      couleur: "var(--accent)",
    });
  }

  lignes.sort((a, b) => a.rang - b.rang);
  const vue = file ? lignes.filter((l) => l.file === file) : lignes;
  const n = (f: File) => lignes.filter((l) => l.file === f).length;

  const hrefFile = (f?: File) => {
    const p = new URLSearchParams();
    if (f) p.set("file", f);
    if (sp.culture) p.set("culture", sp.culture);
    const cible = sp.cible ?? sp.maladie;
    if (cible) p.set("cible", cible);
    const s = p.toString();
    return s ? `/dossiers?${s}` : "/dossiers";
  };

  const pill = (href: string, actif: boolean, label: string, count: number) => (
    <Link
      href={href}
      className="pill"
      style={{
        fontWeight: actif ? 600 : 500,
        color: actif ? "var(--accent)" : "var(--muted)",
        borderColor: actif ? "color-mix(in srgb, var(--accent) 45%, transparent)" : "var(--border-strong)",
        background: actif ? "var(--accent-fond)" : "transparent",
      }}
    >
      {label} <span className="mono" style={{ opacity: 0.7 }}>{count}</span>
    </Link>
  );

  return (
    <>
      <div className="fil">Dossier</div>
      <h1>À traiter</h1>
      <p className="chapeau">
        Culture et ravageur : ce qui est déjà homologué au Maroc, le mélange déjà vendu ici,
        puis le mélange dont chaque composant est déjà à l&apos;index. Chaque ligne ouvre un
        dossier ONSSA 3-B. Délais indicatifs : renouvellement {DELAIS_INDICATIFS.renouvellement}{" "}
        · nouvelle homologation {DELAIS_INDICATIFS.nouvelle_homologation}.
      </p>

      <EmploiMarocain culture={sp.culture} cible={sp.cible ?? sp.maladie} file={file} />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "8px 0 16px" }}>
        {pill(hrefFile(), !file, "Tout", lignes.length)}
        {pill(hrefFile("renouveler"), file === "renouveler", "Renouveler", n("renouveler"))}
        {pill(hrefFile("substituer"), file === "substituer", "Substituer", n("substituer"))}
        {pill(hrefFile("homologuer"), file === "homologuer", "Homologuer", n("homologuer"))}
      </div>

      <div className="bloc">
        <div className="titre">
          <span>Dossiers</span>
          <span className="mono">{vue.length}</span>
        </div>
        <table className="tbl">
          <thead>
            <tr>
              <th>File</th>
              <th>Objet</th>
              <th>Urgence</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {vue.map((l) => (
              <tr key={l.key}>
                <td>
                  <span className="pill" style={{ fontSize: 10.5 }}>{LIBELLE[l.file]}</span>
                </td>
                <td>
                  <div style={{ fontWeight: 600 }}>{l.titre}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>{l.detail}</div>
                </td>
                <td>
                  <span className="mono" style={{ color: l.couleur, fontWeight: 600, fontSize: 12.5 }}>
                    {l.etiq}
                  </span>
                </td>
                <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                  <Link
                    href={l.href}
                    className="pill"
                    style={{
                      fontWeight: 600,
                      fontSize: 12,
                      color: "var(--accent-fg)",
                      background: "var(--accent)",
                      borderColor: "var(--accent)",
                    }}
                  >
                    Dossier 3-B
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {vue.length === 0 && (
          <p style={{ fontSize: 13, color: "var(--muted)", padding: "18px 0" }}>
            Rien à traiter dans cette file.
          </p>
        )}
      </div>
    </>
  );
}
