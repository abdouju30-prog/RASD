import { conformite, libelleMoa, lmrCultures, META_AFRIQUE, META_CONFORMITE, voisins } from "@/lib/conformite";
import { Aide } from "@/components/Aide";
import { fmtDate } from "@/lib/logic";

const ROUGE = "var(--crit)";
const ORANGE = "var(--high)";
const VERT = "var(--low)";

function Pastille({ texte, couleur }: { texte: string; couleur?: string }) {
  return (
    <span
      className="pill"
      style={{
        fontSize: 11.5,
        fontWeight: 500,
        color: couleur,
        borderColor: couleur ? `color-mix(in srgb, ${couleur} 40%, transparent)` : undefined,
        background: couleur ? `color-mix(in srgb, ${couleur} 9%, transparent)` : undefined,
      }}
    >
      {texte}
    </span>
  );
}

function dateUE(d: string | null): string | null {
  if (!d) return null;
  const m = d.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[1]}/${m[2]}/${m[3]}` : d;
}

/** « 0.06 mg/kg bw/day » -> « 0.06 mg/kg pc/j » : l'API donne déjà l'unité, en anglais. */
function unite(v: string): string {
  return v.replace(/bw\/day/g, "pc/j").replace(/bw/g, "pc");
}

function couleurNorme(v: string): string | undefined {
  if (/rouge|interdite|obsolète/.test(v)) return ROUGE;
  if (/orange|atténuation/.test(v)) return ORANGE;
  return undefined;
}

/**
 * Export et conformité : ce qu'un exportateur vérifie avant d'utiliser la
 * molécule — LMR du marché européen, normes privées, bio, statut UE.
 */
export function ExportConformite({ nom, molecule, cultures }: { nom: string; molecule: string; cultures: string[] }) {
  const c = conformite(nom);
  const v = voisins(molecule);
  const lignes = lmrCultures(nom, cultures);
  const moa = libelleMoa(c.moa);
  const n = c.normes;

  return (
    <div className="card" style={{ padding: "14px 18px", marginBottom: 16 }}>
      <div className="h-title">Export et conformité</div>

      {!c.iso ? (
        <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "8px 0 0" }}>
          Pas de nom ISO reconnu pour cette matière : LMR, normes et statut UE non évalués.
        </p>
      ) : (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
            {c.ue ? (
              <Pastille
                texte={
                  c.ue.statut === "Approved"
                    ? `UE : approuvée${c.ue.expiration ? ` jusqu'au ${dateUE(c.ue.expiration)}` : ""}`
                    : `UE : ${c.ue.statut === "Not approved" ? "non approuvée" : c.ue.statut ?? "statut inconnu"}`
                }
                couleur={c.ue.statut === "Approved" ? VERT : ROUGE}
              />
            ) : (
              <Pastille texte="UE : substance non trouvée" />
            )}
            {moa.map((m) => (
              <Pastille key={m} texte={m} />
            ))}
            {c.ue?.cas.length ? <Pastille texte={`CAS ${c.ue.cas.slice(0, 2).join(", ")}`} /> : null}
            {c.ue?.dja && !/not/i.test(c.ue.dja) && <Pastille texte={`DJA ${unite(c.ue.dja)}`} />}
            {c.ue?.arfd && !/not/i.test(c.ue.arfd) && <Pastille texte={`ARfD ${unite(c.ue.arfd)}`} />}
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
            {n ? (
              <>
                <Pastille
                  texte={`Fairtrade : ${n.fairtrade ?? "non listée"}`}
                  couleur={n.fairtrade ? couleurNorme(n.fairtrade) : VERT}
                />
                <Pastille
                  texte={`Rainforest : ${n.rainforest ?? "non listée"}`}
                  couleur={n.rainforest ? couleurNorme(n.rainforest) : VERT}
                />
                <Pastille
                  texte={n.bio ? `Bio UE : ${n.bio === "autorisée" ? "autorisée" : `autorisée — ${n.bio}`}` : "Bio UE : non autorisée"}
                  couleur={n.bio ? VERT : undefined}
                />
                {n.rotterdam && <Pastille texte="Convention de Rotterdam (PIC)" couleur={ROUGE} />}
                {n.stockholm && <Pastille texte="Convention de Stockholm (POP)" couleur={ROUGE} />}
              </>
            ) : (
              <Pastille texte="Normes privées : CAS inconnu, non évalué" />
            )}
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
            <Pastille
              texte={
                v?.tunisie
                  ? `Tunisie : ${v.tunisie.n} produit(s)${v.tunisie.restriction ? ` — ${v.tunisie.restriction}` : ""}`
                  : "Tunisie : absente de la liste"
              }
              couleur={v?.tunisie ? (v.tunisie.restriction ? ORANGE : VERT) : undefined}
            />
            <Pastille
              texte={v?.sahel ? `Sahel (CSP) : ${v.sahel.n} mention(s)` : "Sahel (CSP) : non citée"}
              couleur={v?.sahel ? VERT : undefined}
            />
          </div>

          {lignes.length > 0 && (
            <table className="tbl" style={{ marginTop: 12 }}>
              <thead>
                <tr>
                  <th>Culture (Maroc)</th>
                  <th>Produit UE</th>
                  <th>LMR UE (mg/kg)</th>
                  <th>À venir</th>
                </tr>
              </thead>
              <tbody>
                {lignes.map((l) => (
                  <tr key={`${l.culture}-${l.produitUE}`}>
                    <td>{l.culture}</td>
                    <td style={{ color: "var(--muted)", fontSize: 12.5 }}>{l.produitUE}</td>
                    <td className="mono" style={{ color: l.actuel?.lq ? ROUGE : undefined, fontWeight: l.actuel?.lq ? 600 : 400 }}>
                      {l.actuel ? `${l.actuel.v}${l.actuel.lq ? " (LQ)" : ""}` : "—"}
                    </td>
                    <td className="mono" style={{ fontSize: 12.5 }}>
                      {l.futur ? `${l.futur.v}${l.futur.lq ? " (LQ)" : ""} au ${fmtDate(l.futur.date ?? "")}` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div style={{ marginTop: 10 }}>
            <Aide titre="Lecture et sources">
              <p style={{ marginTop: 0 }}>
                <strong>(LQ)</strong> : LMR fixée à la limite de quantification, donc aucune tolérance —
                un résidu détecté bloque le lot. « — » : pas de LMR trouvée pour ce produit dans la base
                européenne sous ce nom de résidu{c.residuUE ? ` (« ${c.residuUE} »)` : ""}.
              </p>
              <p>
                LMR : {META_CONFORMITE.lmr.source}, relevé du {fmtDate(META_CONFORMITE.lmr.genere)}. Statut,
                CAS, DJA, ARfD : même base, substances actives. Groupes : FRAC et IRAC (tables CropLife
                2026), HRAC 2026. Normes : Fairtrade (mise à jour du{" "}
                {fmtDate(META_CONFORMITE.normes.sources.fairtrade.miseAJour ?? "")}), Rainforest Alliance,
                règlement (UE) 2021/1165, conventions de Rotterdam et de Stockholm — rapprochement par numéro
                CAS. Voisins : {META_AFRIQUE.tunisie.nom} ({fmtDate(META_AFRIQUE.tunisie.date)}) ; {META_AFRIQUE.sahel.nom}{" "}
                ({META_AFRIQUE.sahel.date}, document scanné lu par OCR : nombre de mentions, pas une liste
                nominative). Algérie : aucune liste publique. Vérifier la LMR du pays de destination et le
                document de la norme avant tout conseil.
              </p>
            </Aide>
          </div>
        </>
      )}
    </div>
  );
}
