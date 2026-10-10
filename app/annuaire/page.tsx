import Link from "next/link";
import { ANNUAIRE, REGIONS, STATS_ANNUAIRE, dansRegion, type Region } from "@/lib/annuaire";

export const dynamic = "force-dynamic";

const PLAFOND = 200;

export default async function AnnuairePage({
  searchParams,
}: {
  searchParams: Promise<{ region?: string; pays?: string; q?: string; registre?: string; min?: string; tout?: string }>;
}) {
  const sp = await searchParams;
  const reg = REGIONS.find((r) => r === sp.region) as Region | undefined;
  const q = (sp.q ?? "").trim().toLowerCase();
  const min = Number(sp.min ?? "1") || 1;

  let liste = ANNUAIRE;
  if (reg) liste = liste.filter((f) => dansRegion(f, reg));
  if (sp.pays) liste = liste.filter((f) => f.pays === sp.pays);
  if (sp.registre) liste = liste.filter((f) => f.registres.includes(sp.registre!));
  if (min > 1) liste = liste.filter((f) => f.registres.length >= min);
  if (q) liste = liste.filter((f) => f.nom.toLowerCase().includes(q) || f.molecules.some((m) => m.toLowerCase().includes(q)));

  const parPays = new Map<string, number>();
  for (const f of liste) parPays.set(f.pays, (parPays.get(f.pays) ?? 0) + 1);
  const pays = [...parPays].sort((a, b) => b[1] - a[1]);
  const registres = [...new Set(ANNUAIRE.flatMap((f) => f.registres))].sort();
  const montres = sp.tout === "1" ? liste : liste.slice(0, PLAFOND);

  const lien = (o: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ region: sp.region, pays: sp.pays, q: sp.q, registre: sp.registre, min: sp.min, ...o }))
      if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/annuaire?${s}` : "/annuaire";
  };
  const exportHref = `/api/export/annuaire?${new URLSearchParams(
    Object.entries({ region: sp.region, pays: sp.pays, q: sp.q, registre: sp.registre, min: sp.min })
      .filter(([, v]) => v) as [string, string][]
  ).toString()}`;

  return (
    <>
      <h1>Annuaire mondial des fabricants</h1>
      <p style={{ color: "var(--muted)", fontSize: 13.5, margin: "4px 0 12px" }}>
        {STATS_ANNUAIRE.nbFabricants.toLocaleString("fr")} fabricants et titulaires dans {STATS_ANNUAIRE.nbPays} pays,
        une ligne par société, tous registres réunis.{" "}
        <a href={exportHref} className="link-accent">Exporter (Excel)</a>
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
        <Link href={lien({ region: undefined, pays: undefined })} className="pill" style={{ fontWeight: reg ? 400 : 700 }}>
          Toutes
        </Link>
        {STATS_ANNUAIRE.parRegion.filter((r) => r.nb > 0).map((r) => (
          <Link
            key={r.region}
            href={lien({ region: r.region, pays: undefined })}
            className="pill"
            style={{ fontWeight: reg === r.region ? 700 : 400, color: reg === r.region ? "var(--accent)" : undefined }}
          >
            {r.region} · {r.nb.toLocaleString("fr")}
          </Link>
        ))}
      </div>

      <form action="/annuaire" method="get" style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 10 }}>
        {reg && <input type="hidden" name="region" value={reg} />}
        {sp.pays && <input type="hidden" name="pays" value={sp.pays} />}
        <input name="q" defaultValue={sp.q ?? ""} placeholder="Société ou molécule (ex. glyphosate)"
          style={{ padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 6, minWidth: 280 }} />
        <select name="registre" defaultValue={sp.registre ?? ""} style={{ padding: "7px 8px", border: "1px solid var(--border)", borderRadius: 6 }}>
          <option value="">Tous les registres</option>
          {registres.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <select name="min" defaultValue={sp.min ?? ""} style={{ padding: "7px 8px", border: "1px solid var(--border)", borderRadius: 6 }}>
          <option value="">Présent dans au moins 1 registre</option>
          <option value="2">au moins 2 registres</option>
          <option value="3">au moins 3 registres (exporte déjà largement)</option>
        </select>
        <button type="submit" style={{ padding: "7px 14px", borderRadius: 6, border: "1px solid var(--accent)", background: "var(--accent)", color: "#fff", fontWeight: 600 }}>
          Filtrer
        </button>
      </form>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
        {pays.slice(0, 24).map(([p, n]) => (
          <Link key={p} href={lien({ pays: sp.pays === p ? undefined : p })} className="pill"
            style={{ fontSize: 11.5, fontWeight: sp.pays === p ? 700 : 400 }}>
            {p} · {n}
          </Link>
        ))}
      </div>

      <div className="card" style={{ padding: "6px 14px" }}>
        <div style={{ fontSize: 12.5, color: "var(--muted)", padding: "6px 0" }}>
          {liste.length.toLocaleString("fr")} résultat(s){liste.length > montres.length ? `, ${montres.length} affichés` : ""}
        </div>
        <table className="tbl">
          <thead>
            <tr>
              <th>Fabricant / titulaire</th>
              <th>Pays</th>
              <th>Registres</th>
              <th>Molécules</th>
            </tr>
          </thead>
          <tbody>
            {montres.map((f) => (
              <tr key={f.cle}>
                <td style={{ fontWeight: 500 }}>
                  {f.nom}
                  {f.meToo && <span className="pill" style={{ fontSize: 9.5, marginLeft: 6, color: "var(--low)" }}>fournit déjà le Maroc</span>}
                  <div>
                    <a href={`https://www.google.com/search?q=${encodeURIComponent(f.nom)}`} target="_blank" rel="noreferrer"
                      className="link-accent" style={{ fontSize: 11 }}>vérifier</a>
                  </div>
                </td>
                <td style={{ fontSize: 12.5, whiteSpace: "nowrap" }}>
                  {f.pays}
                  {!f.paysFiable && <span style={{ color: "var(--muted-2)", fontSize: 11 }}> (présumé)</span>}
                </td>
                <td style={{ fontSize: 11.5, color: "var(--muted)" }}>{f.registres.join(" · ")}</td>
                <td style={{ fontSize: 11.5, color: "var(--muted)" }}>
                  {f.molecules.length ? `${f.molecules.length} — ${f.molecules.slice(0, 5).join(", ")}${f.molecules.length > 5 ? "…" : ""}` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {liste.length > montres.length && (
          <div style={{ padding: "8px 0" }}>
            <Link href={lien({ tout: "1" })} className="link-accent" style={{ fontSize: 12.5 }}>
              Afficher les {liste.length.toLocaleString("fr")} résultats
            </Link>
          </div>
        )}
      </div>

      <p style={{ fontSize: 11.5, color: "var(--muted-2)", marginTop: 12, lineHeight: 1.6 }}>
        Registres réunis : Maroc (ONSSA), Brésil, Chine (ICAMA), États-Unis (EPA), Australie, Corée, Turquie, Russie,
        Canada, Colombie, Nouvelle-Zélande, Argentine, Japon, Malaisie, Afrique du Sud, Union européenne (ECHA).
        Une société est rapprochée sur sa raison sociale ; le pays « présumé » est celui du registre quand le nom ne
        dit pas la nationalité (filiale ou distributeur local). Une homologation étrangère n&apos;ouvre aucune voie
        me-too devant l&apos;ONSSA : seule la mention « fournit déjà le Maroc » le fait.
      </p>
    </>
  );
}
