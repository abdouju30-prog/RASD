/**
 * Alerte hebdomadaire par courriel (Resend).
 *
 *   npx tsx scripts/alerte_hebdo.ts            # envoie si RESEND_API_KEY est défini
 *   npx tsx scripts/alerte_hebdo.ts --apercu   # écrit le message sans l'envoyer
 *
 * Variables : RESEND_API_KEY (secret GitHub), EMAIL_DESTINATAIRE,
 * EMAIL_EXPEDITEUR (défaut : onboarding@resend.dev, l'adresse d'essai de
 * Resend — elle n'écrit qu'au titulaire du compte), DETENTEUR (défaut PHYTO BEHT).
 *
 * Le contenu ne reprend que ce que les relevés ont constaté :
 *   - les alertes critiques du portefeuille (une par molécule) ;
 *   - les mouvements de l'index des 7 derniers jours sur ses produits ET sur
 *     ses molécules (un concurrent qui homologue la même matière) ;
 *   - les textes ONSSA des 30 derniers jours ;
 *   - les nouvelles usines chinoises sur ses molécules (60 jours).
 * Sans aucun de ces éléments, rien n'est envoyé.
 */
import { writeFileSync } from "node:fs";
import { DETENTEURS, matieresDuPortefeuille } from "../lib/data";
import { alertesGroupees, LIBELLE_ALERTE } from "../lib/alertes";
import { JOURNAL } from "../lib/actualites";
import { TEXTES_RECENTS } from "../lib/onssa-reglementation";
import { nouvellesUsines } from "../lib/nouvelles-usines";

const apercu = process.argv.includes("--apercu");
const nomDetenteur = process.env.DETENTEUR ?? "PHYTO BEHT";
const d = DETENTEURS.find((x) => x.nom === nomDetenteur);
if (!d) {
  console.error(`Détenteur inconnu : ${nomDetenteur}`);
  process.exit(1);
}

const jours = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
const molecules = new Set(matieresDuPortefeuille(d.id).map((m) => m.molecule.toLowerCase()));
const concerne = (matieres: string[]) =>
  matieres.some((m) => molecules.has(m.split("(")[0].trim().toLowerCase()));

const critiques = alertesGroupees(d.id).filter((g) => g.niveau === "critique");
const mouvements = JOURNAL.filter(
  (e) => e.date >= jours(7) && (e.detenteurId === d.id || concerne(e.matieres))
);
const textes = TEXTES_RECENTS;
const usines = nouvellesUsines(d.id);

if (!critiques.length && !mouvements.length && !textes.length && !usines.length) {
  console.log("Rien de nouveau : aucun courriel envoyé.");
  process.exit(0);
}

const blocs: { titre: string; lignes: string[] }[] = [];
if (critiques.length)
  blocs.push({
    titre: `Alertes critiques — ${critiques.length}`,
    lignes: critiques.map(
      (g) => `${g.titre} : ${[...new Set(g.signaux.map((s) => LIBELLE_ALERTE[s.type]))].join(", ")} — ${g.produits.map((p) => p.nomCommercial).join(", ")}`
    ),
  });
if (mouvements.length)
  blocs.push({
    titre: `Index ONSSA, 7 derniers jours — ${mouvements.length}`,
    lignes: mouvements.map(
      (e) => `${e.type} · ${e.nomCommercial} (${e.detenteur}${e.detenteurId === d.id ? ", vous" : ""}) · ${e.detail}`
    ),
  });
if (textes.length)
  blocs.push({ titre: `Textes ONSSA récents — ${textes.length}`, lignes: textes.map((t) => t.titre) });
if (usines.length)
  blocs.push({
    titre: `Nouvelles usines chinoises sur vos molécules — ${usines.length}`,
    lignes: usines.map((u) => `${u.molecule} — ${u.nomLisible}${u.region ? ` (${u.region})` : ""}`),
  });

const sujet = `Veille ${d.nom} — ${critiques.length} critique(s), ${mouvements.length} mouvement(s) de l'index`;
const echapper = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const html =
  `<div style="font-family:Arial,sans-serif;font-size:14px;color:#14232b">` +
  `<h2 style="margin:0 0 12px">${echapper(sujet)}</h2>` +
  blocs
    .map(
      (b) =>
        `<h3 style="margin:16px 0 6px;font-size:15px">${echapper(b.titre)}</h3><ul style="margin:0;padding-left:18px">` +
        b.lignes.slice(0, 15).map((l) => `<li>${echapper(l)}</li>`).join("") +
        (b.lignes.length > 15 ? `<li>… et ${b.lignes.length - 15} autre(s)</li>` : "") +
        `</ul>`
    )
    .join("") +
  `<p style="margin-top:18px;color:#5a6c77;font-size:12px">Relevés automatiques : index ONSSA (IndPesticide), textes ONSSA, Anses E-Phy, ICAMA. ` +
  `Le détail est sur l'application.</p></div>`;
const texte = [sujet, "", ...blocs.flatMap((b) => [b.titre, ...b.lignes.map((l) => `• ${l}`), ""])].join("\n");

if (apercu || !process.env.RESEND_API_KEY) {
  writeFileSync("alerte-hebdo-apercu.html", html, "utf-8");
  console.log(texte);
  console.log(process.env.RESEND_API_KEY ? "(aperçu : rien envoyé)" : "RESEND_API_KEY absent : aperçu écrit dans alerte-hebdo-apercu.html, rien envoyé.");
  process.exit(0);
}

async function envoyer() {
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_EXPEDITEUR ?? "Veille Homologa <onboarding@resend.dev>",
      to: [process.env.EMAIL_DESTINATAIRE ?? "abdouju30@gmail.com"],
      subject: sujet,
      html,
      text: texte,
    }),
  });
  if (!r.ok) {
    console.error(`Resend a refusé l'envoi : ${r.status} ${await r.text()}`);
    process.exit(1);
  }
  console.log(`Courriel envoyé : ${sujet}`);
}

envoyer();
