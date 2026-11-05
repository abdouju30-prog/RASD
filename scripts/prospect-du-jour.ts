/**
 * Prospect du jour — ce que la tâche planifiée quotidienne lit avant d'écrire.
 *
 *   npm run prospect                 résumé lisible
 *   npm run prospect -- --json       tout, en JSON (pour la tâche planifiée)
 *   npm run prospect -- --detenteur "AUTRE SOCIETE"
 *
 * Le détenteur vient de data/prospection-config.json, sauf --detenteur.
 * Rien n'est écrit : le journal (data/prospection.json) est tenu par la tâche,
 * qui y ajoute le prospect après avoir vérifié la société et créé le brouillon.
 */
import { DETENTEURS } from "../lib/data";
import {
  CONFIG,
  JOURNAL,
  META_UE,
  detenteurAgent,
  fournisseursSuggeres,
  messageAnglais,
  moleculesCibles,
  relancesDues,
} from "../lib/prospection";

const args = process.argv.slice(2);
const json = args.includes("--json");
const i = args.indexOf("--detenteur");
const nomDetenteur = i >= 0 ? args[i + 1] : null;

const detenteur = nomDetenteur
  ? DETENTEURS.find((d) => d.nom.toUpperCase() === nomDetenteur.toUpperCase())
  : detenteurAgent();
if (!detenteur) {
  console.error(`Détenteur inconnu : ${nomDetenteur}`);
  process.exit(1);
}

// La journée se compte à Casablanca, pas en UTC.
const jour = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Casablanca" }).format(new Date());
const aujourdhui = new Date(`${jour}T12:00:00Z`);

const suggestions = fournisseursSuggeres(detenteur.id, aujourdhui, 10);
const cibles = moleculesCibles(detenteur.id, aujourdhui);
const dejaFait = JOURNAL.filter((p) => p.date === jour);

const sortie = {
  jour,
  detenteur: detenteur.nom,
  config: CONFIG,
  baseUE: META_UE,
  dejaPrepareAujourdhui: dejaFait.length >= CONFIG.parJour,
  prospectsDuJour: dejaFait,
  aPreparer: suggestions.slice(0, Math.max(0, CONFIG.parJour - dejaFait.length)).map((s) => ({
    ...s,
    brouillon: messageAnglais(s),
  })),
  suivants: suggestions.slice(CONFIG.parJour).map((s) => ({
    nom: s.nom, pays: s.pays, score: s.score, molecules: s.molecules.map((m) => m.molecule),
  })),
  relancesDues: relancesDues(aujourdhui),
  enAttenteDeReponse: JOURNAL.filter((p) => ["envoyé", "relancé", "à envoyer"].includes(p.statut)).map((p) => ({
    id: p.id, fournisseur: p.fournisseur, email: p.email, site: p.site, statut: p.statut, date: p.date, envoyeLe: p.envoyeLe ?? null,
  })),
  ciblesEnTete: cibles.slice(0, 15).map((c) => ({
    molecule: c.molecule, nomAnglais: c.nomAnglais, motifs: c.motifs, score: c.score, pourquoi: c.pourquoi,
  })),
};

if (json) {
  console.log(JSON.stringify(sortie, null, 1));
} else {
  console.log(`Prospect du jour — ${jour} — détenteur ${detenteur.nom}`);
  console.log(`${cibles.length} molécules cibles · base UE du ${META_UE.genere}`);
  if (sortie.dejaPrepareAujourdhui) console.log("Déjà préparé aujourd'hui :", dejaFait.map((p) => p.fournisseur).join(", "));
  for (const s of sortie.aPreparer) {
    console.log(`\n→ ${s.nom} (${s.pays}) — score ${s.score}`);
    for (const r of s.raisons) console.log(`   · ${r}`);
    console.log(`   e-mail : ${s.contact?.emails?.join(", ") || "à trouver"} · site : ${s.contact?.site || "à trouver"}`);
    console.log(`\nObjet : ${s.brouillon.objet}\n\n${s.brouillon.corps}`);
  }
  console.log("\nEnsuite :", sortie.suivants.map((s) => `${s.nom} (${s.pays})`).join(" · ") || "—");
  console.log("Relances dues :", sortie.relancesDues.map((p) => p.fournisseur).join(", ") || "aucune");
  console.log("\nMolécules en tête :");
  for (const c of sortie.ciblesEnTete) console.log(`  ${String(c.score).padStart(4)}  ${c.molecule} [${c.motifs.join(", ")}] — ${c.pourquoi}`);
}
