import fichier from "../data/contacts-societes.json";
import { FORMES, cleFabricant } from "./cle";

// ────────────────────────────────────────────────────────────────────────────
// COORDONNÉES PUBLIÉES PAR LES FABRICANTS — site officiel, relu par HTTP
//
// scripts/import_contacts_societes.py lit l'accueil et la page Contact de
// chaque site de scripts/sites-societes.json : un site n'est gardé que s'il
// cite la société, un e-mail que s'il est une adresse de service (info@,
// sales@, export@…) au domaine de la société. Aucune donnée de personne.
// ────────────────────────────────────────────────────────────────────────────

export interface ContactSociete {
  site: string;
  noms: string[];
  emails?: string[];
  telephones?: string[];
  sources?: string[];
  verifie: string;
  statut: string;
}

const FICHIER = fichier as unknown as { meta: { dateTest: string }; societes: ContactSociete[] };

// Seuls les sites qui ont répondu et cité la société sont exploitables.
const UTILES = FICHIER.societes.filter((s) => s.statut === "ok" || s.statut.startsWith("site sans coord"));

const PAR_CLE = new Map<string, ContactSociete>();
for (const s of UTILES) {
  for (const nom of s.noms) {
    const cle = cleFabricant(nom);
    if (cle && !PAR_CLE.has(cle)) PAR_CLE.set(cle, s);
  }
}

export const DATE_CONTACTS = FICHIER.meta.dateTest;

/** Coordonnées relevées sur le site officiel, par raison sociale exacte (à la forme sociale près). */
export function contactSociete(nom: string | null | undefined): ContactSociete | null {
  const cle = cleFabricant(nom ?? "");
  return (cle && PAR_CLE.get(cle)) || null;
}

/**
 * Recherche LinkedIn des personnes de la société côté export ou homologation.
 * Le lien ouvre LinkedIn avec le compte de l'utilisateur ; rien n'est relevé.
 */
const FORMES_EN_PLUS = new Set(["sarl", "doo", "oo", "sau", "slu", "spol", "bvba", "kk", "branch"]);

export function lienLinkedIn(nom: string): string {
  const court = nom
    .replace(/\(.*?\)/g, " ")
    .split(/[\s,;]+/)
    .filter((m) => {
      const n = m.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
      return n.length > 1 && !FORMES.has(n) && !FORMES_EN_PLUS.has(n);
    })
    .map((m) => m.replace(/[.,]+$/, ""))
    .join(" ")
    .trim();
  const q = `"${court || nom}" AND (export OR regulatory OR registration OR sales)`;
  return `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(q)}`;
}
