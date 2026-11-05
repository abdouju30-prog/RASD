import Link from "next/link";
import { Bot, Mail, ArrowRight } from "lucide-react";
import { detenteurActuel } from "@/lib/detenteur";
import {
  CONFIG,
  JOURNAL,
  META_UE,
  detenteurAgent,
  fournisseursSuggeres,
  messageAnglais,
  moleculesCibles,
  relancesDues,
  statsJournal,
  type CibleMolecule,
  type Prospect,
  type StatutProspect,
} from "@/lib/prospection";

export const dynamic = "force-dynamic";

/**
 * Agent de prospection — un nouveau fournisseur potentiel par jour.
 *
 * La tâche planifiée (chaque matin, 08:15 Casablanca) lit le même calcul que
 * cette page, vérifie la société sur le web, crée le brouillon Gmail et inscrit
 * le prospect au journal (data/prospection.json). Cette page montre le journal,
 * le prochain prospect et les molécules qui motivent la recherche.
 */

const TON_STATUT: Record<StatutProspect, string> = {
  "à envoyer": "var(--accent)",
  envoyé: "var(--muted)",
  relancé: "var(--high, #b45309)",
  réponse: "var(--low)",
  "en discussion": "var(--low)",
  écarté: "var(--muted-2)",
};

function Statut({ s }: { s: StatutProspect }) {
  return (
    <span className="pill" style={{ fontSize: 10.5, color: TON_STATUT[s], whiteSpace: "nowrap" }}>
      {s}
    </span>
  );
}

function Motifs({ c }: { c: CibleMolecule }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
      {c.motifs.map((m) => (
        <span
          key={m}
          className="pill"
          style={{
            fontSize: 10,
            whiteSpace: "nowrap",
            color: m === "sortie d'exclusivité" || m === "majors seules au Maroc" ? "var(--accent)" : undefined,
          }}
        >
          {m}
        </span>
      ))}
    </div>
  );
}

function lienGmail(to: string | null, objet: string, corps: string): string {
  const p = new URLSearchParams({ view: "cm", fs: "1", su: objet, body: corps });
  if (to) p.set("to", to);
  return `https://mail.google.com/mail/?${p.toString()}`;
}

function date(iso: string | null | undefined): string {
  return iso ? new Date(iso).toLocaleDateString("fr-FR") : "—";
}

function LigneJournal({ p, due }: { p: Prospect; due: boolean }) {
  return (
    <tr>
      <td className="mono" style={{ whiteSpace: "nowrap" }}>{date(p.date)}</td>
      <td>
        <strong>{p.fournisseur}</strong>
        <div style={{ fontSize: 12, color: "var(--muted)" }}>{p.pays}</div>
      </td>
      <td style={{ fontSize: 12.5 }}>{p.molecules.join(", ")}</td>
      <td>
        <Statut s={p.statut} />
        {due && <div style={{ fontSize: 11, color: "var(--crit)", marginTop: 3 }}>relance due</div>}
      </td>
      <td className="mono" style={{ fontSize: 12, whiteSpace: "nowrap" }}>{date(p.envoyeLe)}</td>
      <td style={{ fontSize: 12 }}>
        {p.email ? <a className="link-accent" href={`mailto:${p.email}`}>{p.email}</a> : "—"}
        {p.site && (
          <div>
            <a className="link-accent" href={p.site.startsWith("http") ? p.site : `https://${p.site}`} target="_blank" rel="noreferrer">
              site
            </a>
          </div>
        )}
      </td>
      <td style={{ fontSize: 12, color: "var(--muted)", maxWidth: 260 }}>{p.verification?.exclusivite ?? p.notes ?? ""}</td>
    </tr>
  );
}

export default async function ProspectionPage() {
  const d = await detenteurActuel();
  const agent = detenteurAgent();
  const cibles = moleculesCibles(d.id);
  const suggestions = fournisseursSuggeres(d.id, new Date(), 10);
  const st = statsJournal();
  const dues = new Set(relancesDues().map((p) => p.id));
  const journal = [...JOURNAL].sort((a, b) => b.date.localeCompare(a.date));
  const jour = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Casablanca" }).format(new Date());
  const duJour = journal.filter((p) => p.date === jour);
  const prochain = suggestions[0] ?? null;
  const brouillon = prochain ? messageAnglais(prochain) : null;
  const signatureAFaire = CONFIG.signature.some((l) => l.includes("["));

  return (
    <>
      <h1 style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Bot size={22} /> Agent de prospection
      </h1>
      <div style={{ fontSize: 13.5, color: "var(--muted)", margin: "4px 0 14px", maxWidth: 820 }}>
        Un fabricant qui produit une molécule manquant au portefeuille de <strong>{agent.nom}</strong>,
        homologuée dans un pays de l&apos;OCDE, reçoit chaque jour un brouillon de message en anglais dans Gmail —
        à relire avant envoi. Tâche planifiée : {CONFIG.horaire} ; un jour sur {CONFIG.exclusiviteUnJourSur}, le
        fournisseur est choisi pour une molécule en sortie d&apos;exclusivité. {cibles.length} molécules cibles · base
        UE du {META_UE.genere} · {st.total} fournisseurs contactés.
        {agent.id !== d.id && (
          <div style={{ marginTop: 6, color: "var(--crit)" }}>
            Vous consultez {d.nom} ; la tâche quotidienne écrit pour {agent.nom} (data/prospection-config.json).
          </div>
        )}
        {signatureAFaire && (
          <div style={{ marginTop: 6, color: "var(--crit)" }}>
            Signature à compléter dans data/prospection-config.json.
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {(Object.entries(st.parStatut) as [StatutProspect, number][]).map(([s, n]) => (
          <span key={s} className="pill" style={{ fontSize: 12 }}>
            {s} <strong className="mono">{n}</strong>
          </span>
        ))}
        <span className="pill" style={{ fontSize: 12, color: st.relancesDues ? "var(--crit)" : undefined }}>
          relances dues <strong className="mono">{st.relancesDues}</strong>
        </span>
      </div>

      {/* ── Aujourd'hui ─────────────────────────────────────────────────── */}
      <div className="card" style={{ padding: "14px 18px", marginBottom: 16 }}>
        <span className="h-title">Aujourd&apos;hui</span>
        {duJour.length > 0 ? (
          duJour.map((p) => (
            <div key={p.id} style={{ marginTop: 10 }}>
              <div style={{ fontSize: 14 }}>
                <strong>{p.fournisseur}</strong> ({p.pays}) — {p.molecules.join(", ")} <Statut s={p.statut} />
              </div>
              <div style={{ fontSize: 12.5, color: "var(--muted)", margin: "4px 0" }}>{p.motifs.join(" ; ")}</div>
              <details>
                <summary style={{ cursor: "pointer", fontSize: 13 }}>Message — {p.objet}</summary>
                <pre style={{ whiteSpace: "pre-wrap", fontSize: 12.5, lineHeight: 1.5 }}>{p.message}</pre>
              </details>
            </div>
          ))
        ) : prochain && brouillon ? (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 6 }}>
              Pas encore préparé par la tâche quotidienne. Prochain fournisseur suggéré :
            </div>
            <div style={{ fontSize: 14 }}>
              <strong>{prochain.nom}</strong> ({prochain.pays}{prochain.paysFiable ? "" : ", présumé"}) — score {prochain.score}
            </div>
            <ul style={{ margin: "6px 0", paddingLeft: 20, fontSize: 13 }}>
              {prochain.raisons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 13, marginBottom: 6 }}>
              {prochain.contact?.site && (
                <a className="link-accent" href={prochain.contact.site.startsWith("http") ? prochain.contact.site : `https://${prochain.contact.site}`} target="_blank" rel="noreferrer">
                  site officiel
                </a>
              )}
              <a className="link-accent" href={prochain.linkedin} target="_blank" rel="noreferrer">LinkedIn</a>
              <a
                className="link-accent"
                href={lienGmail(prochain.contact?.emails?.[0] ?? null, brouillon.objet, brouillon.corps)}
                target="_blank"
                rel="noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
              >
                <Mail size={14} /> Ouvrir dans Gmail
              </a>
            </div>
            <details>
              <summary style={{ cursor: "pointer", fontSize: 13 }}>Brouillon — {brouillon.objet}</summary>
              <pre style={{ whiteSpace: "pre-wrap", fontSize: 12.5, lineHeight: 1.5 }}>{brouillon.corps}</pre>
            </details>
          </div>
        ) : (
          <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 8 }}>Aucun fournisseur à proposer.</div>
        )}
      </div>

      {/* ── Suivi ──────────────────────────────────────────────────────── */}
      <h2 style={{ fontSize: 17, margin: "18px 0 8px" }}>Suivi des fournisseurs contactés</h2>
      {journal.length ? (
        <div style={{ overflowX: "auto" }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Date</th>
                <th>Fournisseur</th>
                <th>Molécules</th>
                <th>Statut</th>
                <th>Envoyé</th>
                <th>Contact</th>
                <th>Vérification</th>
              </tr>
            </thead>
            <tbody>
              {journal.map((p) => (
                <LigneJournal key={p.id} p={p} due={dues.has(p.id)} />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card" style={{ padding: "12px 16px", fontSize: 13, color: "var(--muted)" }}>
          Le journal est vide : le premier prospect y entrera au prochain passage de la tâche quotidienne.
        </div>
      )}

      {/* ── File d'attente ─────────────────────────────────────────────── */}
      <h2 style={{ fontSize: 17, margin: "22px 0 8px" }}>Prochains fournisseurs</h2>
      <div style={{ overflowX: "auto" }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Fournisseur</th>
              <th>Molécules cibles fabriquées</th>
              <th>Registres</th>
              <th>Contact</th>
              <th style={{ textAlign: "right" }}>Score</th>
            </tr>
          </thead>
          <tbody>
            {suggestions.slice(1).map((s) => (
              <tr key={s.cle}>
                <td>
                  <strong>{s.nom}</strong>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>
                    {s.pays}{s.paysFiable ? "" : " (présumé)"}{s.dejaAuMaroc ? " · déjà à l'ONSSA" : ""}
                  </div>
                </td>
                <td style={{ fontSize: 12.5 }}>{s.molecules.map((m) => m.molecule).join(", ")}</td>
                <td style={{ fontSize: 12 }}>{s.registres.join(", ")}</td>
                <td style={{ fontSize: 12 }}>
                  {s.contact?.emails?.[0] ?? (s.contact?.site ? "site" : "à trouver")}
                </td>
                <td className="mono" style={{ textAlign: "right" }}>{s.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Molécules ──────────────────────────────────────────────────── */}
      <h2 style={{ fontSize: 17, margin: "22px 0 8px" }}>Molécules qui manquent — homologuées OCDE</h2>
      <div style={{ overflowX: "auto" }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Molécule</th>
              <th>Motifs</th>
              <th>Maroc</th>
              <th title="Date d'approbation en vigueur (première ou renouvellement) et + 10 ans">UE : approbation → + 10 ans</th>
              <th>OCDE</th>
              <th style={{ textAlign: "right" }}>Génériqueurs</th>
              <th style={{ textAlign: "right" }}>Score</th>
            </tr>
          </thead>
          <tbody>
            {cibles.slice(0, 40).map((c) => (
              <tr key={c.cles[0]}>
                <td>
                  <strong>{c.molecule}</strong>
                  <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{c.categorie}</div>
                </td>
                <td><Motifs c={c} /></td>
                <td className="mono" style={{ fontSize: 12, whiteSpace: "nowrap" }}>
                  {c.nbProduitsMaroc ? `${c.nbProduitsMaroc} prod. · ${c.nbDetenteursMaroc} dét.` : "absente"}
                </td>
                <td className="mono" style={{ fontSize: 12, whiteSpace: "nowrap" }}>
                  {c.ue?.approbation ? `${date(c.ue.approbation)} → ${date(c.ue.finProtectionEstimee)}` : "—"}
                  {c.ue?.substitution && <div style={{ color: "var(--crit)", fontSize: 11 }}>candidate à la substitution</div>}
                </td>
                <td style={{ fontSize: 12 }}>{c.ocde.join(", ")}</td>
                <td className="mono" style={{ textAlign: "right" }}>{c.nbGeneriques}</td>
                <td className="mono" style={{ textAlign: "right" }}>{c.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 14, maxWidth: 860, lineHeight: 1.6 }}>
        « Sortie d&apos;exclusivité » : au Maroc, seules des majors fournissent la molécule alors que des génériqueurs
        la fabriquent déjà ailleurs ; pour une molécule absente du Maroc, approbation UE + 10 ans (règl. 1107/2009,
        art. 59) tombée récemment. L&apos;API européenne donne parfois la date du renouvellement : estimation, pas une
        preuve — brevets et certificats complémentaires sont vérifiés par la tâche quotidienne, source à l&apos;appui.
        Une homologation OCDE n&apos;ouvre pas la voie me-too devant l&apos;ONSSA. Aucun message n&apos;est envoyé sans
        relecture.{" "}
        <Link href="/annuaire" className="link-accent">
          Annuaire mondial <ArrowRight size={12} style={{ verticalAlign: -1 }} />
        </Link>
      </div>
    </>
  );
}
