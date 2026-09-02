import { BadgeCheck, CircleHelp, FlaskConical } from "lucide-react";
import { PACKS, couverture, type CodePack, type FicheFournisseur } from "@/lib/packs-fournisseur";
import { fmtDate } from "@/lib/logic";

/** Pastilles compactes des paquets déclarés — pour les tableaux. */
export function PastillesPacks({ packs }: { packs: CodePack[] }) {
  if (!packs.length) {
    return (
      <span style={{ color: "var(--muted-2)", fontSize: 11.5 }}>non renseigné</span>
    );
  }
  return (
    <span style={{ display: "inline-flex", gap: 4, flexWrap: "wrap" }}>
      {PACKS.filter((p) => packs.includes(p.code)).map((p) => (
        <span
          key={p.code}
          className="pill"
          title={p.description}
          style={{
            fontSize: 10,
            fontWeight: 600,
            padding: "2px 7px",
            color: "var(--accent)",
            borderColor: "color-mix(in srgb, var(--accent) 38%, transparent)",
            background: "color-mix(in srgb, var(--accent) 9%, transparent)",
          }}
        >
          {p.libelleBrochure}
        </span>
      ))}
    </span>
  );
}

/**
 * Fiche complète : ce que le fournisseur déclare détenir, confronté aux lignes
 * du formulaire qui lui incombent. La question à laquelle répond ce bloc :
 * que faudra-t-il produire soi-même s'il n'a que ça ?
 */
export function FicheAgrements({ fiche }: { fiche: FicheFournisseur }) {
  const c = couverture(fiche.packs);

  return (
    <div className="card" style={{ padding: "18px 20px" }}>
      <div className="h-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <BadgeCheck size={14} color="var(--accent)" /> Agréments déclarés
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 13 }}>
        <span style={{ fontSize: 13, color: "var(--muted)" }}>
          Lignes du formulaire à sa charge, couvertes
        </span>
        <span className="mono" style={{ fontWeight: 600, fontSize: 15, color: "var(--accent)" }}>
          {c.nbCouvertes} / {c.nbAChargeFournisseur}
        </span>
      </div>
      <div className="bar" style={{ margin: "9px 0 14px" }}>
        <span style={{ width: `${c.pct}%`, background: "var(--accent)" }} />
      </div>

      <div style={{ display: "grid", gap: 9 }}>
        {PACKS.map((p) => {
          const a = fiche.packs.includes(p.code);
          const nb = p.couvre.reduce((s, b) => s + b.codes.length, 0);
          return (
            <div
              key={p.code}
              style={{ display: "flex", gap: 9, alignItems: "flex-start", opacity: a ? 1 : 0.55 }}
            >
              {a ? (
                <BadgeCheck size={15} color="var(--accent)" style={{ flexShrink: 0, marginTop: 1 }} />
              ) : (
                <CircleHelp size={15} color="var(--muted-2)" style={{ flexShrink: 0, marginTop: 1 }} />
              )}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: a ? 600 : 500 }}>
                  {p.libelleBrochure}
                  <span style={{ color: "var(--muted-2)", fontWeight: 400 }}> — {p.libelle}</span>
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.55, marginTop: 3 }}>
                  {p.description}
                </div>
                {nb > 0 && (
                  <div className="eyebrow" style={{ marginTop: 4 }}>
                    {nb} ligne{nb > 1 ? "s" : ""} de l&apos;Annexe 3-B
                  </div>
                )}
                {p.horsAnnexe3B && (
                  <div className="eyebrow" style={{ marginTop: 4, color: "var(--mod)" }}>
                    hors Annexe 3-B
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {c.manquantes.length > 0 && (
        <div
          style={{
            marginTop: 15,
            paddingTop: 13,
            borderTop: "1px solid var(--border)",
          }}
        >
          <div className="h-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <FlaskConical size={13} color="var(--high)" /> Restant à obtenir — {c.manquantes.length} ligne(s)
          </div>
          <p style={{ fontSize: 12, color: "var(--muted)", margin: "7px 0 0", lineHeight: 1.6 }}>
            Ces lignes incombent au fournisseur mais aucun paquet déclaré ne les couvre. À réclamer
            explicitement lors de la consultation.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 9 }}>
            {c.manquantes.map((m) => (
              <span
                key={m.code}
                className="pill"
                style={{ fontSize: 10.5, fontWeight: 500, padding: "2px 7px" }}
              >
                <span className="mono">{m.code}</span> {m.libelle}
                {m.glp ? " · BPL" : ""}
              </span>
            ))}
          </div>
        </div>
      )}

      <p style={{ fontSize: 11, color: "var(--muted-2)", marginTop: 14, lineHeight: 1.55 }}>
        Information <strong>déclarative</strong> — {fiche.source}, {fmtDate(fiche.date)}. Les études
        doivent être réclamées et lues avant tout engagement.
      </p>
    </div>
  );
}
