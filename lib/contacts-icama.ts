import fichier from "../data/contacts-icama.json";

// ────────────────────────────────────────────────────────────────────────────
// CONTACTS ICAMA — pages officielles, retestées par HTTP
//
// Le registre chinois nomme l'usine et la licence, pas l'e-mail. Les
// coordonnées ci-dessous viennent des pages Contact des groupes, et ont été
// relues dans le HTML (GET 200). Ce n'est pas un envoi de courriel.
// ────────────────────────────────────────────────────────────────────────────

export interface ContactIcama {
  nom: string;
  aliases: string[];
  parent: string;
  emails: string[];
  telephones: string[];
  site: string;
  adresse: string;
  source: string;
  date: string;
  http: { url: string; status: number; date: string };
  validite: string;
  reserve: string | null;
}

const FICHIER = fichier as unknown as { societes: ContactIcama[] };
export const CONTACTS_ICAMA: ContactIcama[] = FICHIER.societes;

function norm(s: string): string {
  return s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

/** Contact public d'une usine ICAMA, par nom han, pinyin ou glose. */
export function contactIcama(nom: string | null | undefined): ContactIcama | null {
  const q = (nom ?? "").trim();
  if (q.length < 3) return null;
  const nq = norm(q);
  for (const c of CONTACTS_ICAMA) {
    if (q.includes(c.nom) || c.nom.includes(q)) return c;
    if (c.aliases.some((a) => nq.includes(norm(a)) || norm(a).includes(nq))) return c;
  }
  return null;
}
