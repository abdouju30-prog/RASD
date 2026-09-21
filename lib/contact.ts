import { agrementDe } from "./onssa-eservice";
import { usinesDe } from "./epa";
import { ficheFournisseur, toutesLesFiches } from "./packs-fournisseur";
import { USINES_TURQUES } from "./bku";
import { IndexNoms } from "./noms";
import { contactIcama } from "./contacts-icama";

// ────────────────────────────────────────────────────────────────────────────
// COORDONNÉES FOURNISSEUR
//
// Aucun registre unique ne publie e-mail + téléphone + adresse. On assemble
// ce qui existe, sans inventer :
//
//   1. Fiche saisie (brochure / site officiel) — e-mail, tél, site, siège
//   2. Pages Contact ICAMA retestées par HTTP (groupes chinois)
//   3. ONSSA e-service — agrément marocain (souvent le bureau local)
//   4. EPA — adresse d'établissement de production
//   5. BKÜ Turquie — adresse du titulaire İMAL
//
// Chaque ligne porte sa source. Une case vide signifie « non publié », pas
// un oubli de saisie.
// ────────────────────────────────────────────────────────────────────────────

export interface ContactResolu {
  emails: string[];
  telephones: string[];
  site: string | null;
  adresses: { texte: string; source: string }[];
  /** true dès qu'on a un e-mail ou un téléphone. */
  joignable: boolean;
}

const INDEX_TURC = new IndexNoms(
  USINES_TURQUES.filter((u) => u.nom).map((u) => ({ nom: u.nom ?? "", valeur: u }))
);

function uniq(xs: (string | null | undefined)[]): string[] {
  const out: string[] = [];
  const vu = new Set<string>();
  for (const x of xs) {
    const t = (x ?? "").trim();
    if (!t) continue;
    const k = t.toLowerCase();
    if (vu.has(k)) continue;
    vu.add(k);
    out.push(t);
  }
  return out;
}

/** Coordonnées d'une société, par nom d'index et identifiant ONSSA optionnel. */
export function contactDe(nom: string, idOnssa?: string): ContactResolu {
  const fiche =
    (idOnssa ? ficheFournisseur(idOnssa) : null) ??
    toutesLesFiches().find((f) => f.nom.toUpperCase() === nom.toUpperCase()) ??
    null;
  const agr = agrementDe(nom);
  const epa = usinesDe(nom);
  const tr = INDEX_TURC.exact(nom) ?? INDEX_TURC.proches(nom, 1)[0] ?? null;

  const ic = contactIcama(nom);
  const emails = uniq([fiche?.contact?.email, ...(ic?.emails ?? []), ...(agr?.emails ?? [])]);
  const telephones = uniq([
    fiche?.contact?.telephone,
    ...(ic?.telephones ?? []),
    agr?.telephone,
  ]);
  const site = fiche?.contact?.site ?? ic?.site ?? null;

  const adresses: { texte: string; source: string }[] = [];
  const push = (texte: string | null | undefined, source: string) => {
    const t = (texte ?? "").trim();
    if (!t) return;
    if (adresses.some((a) => a.texte.toLowerCase() === t.toLowerCase())) return;
    adresses.push({ texte: t, source });
  };

  push(fiche?.contact?.adresse ?? null, fiche?.source ?? "fiche fournisseur");
  push(ic?.adresse ?? null, ic?.source ?? "page Contact officielle");
  push(agr?.siege ?? null, "ONSSA e-service");
  if (epa?.sites[0]) {
    push(
      [epa.sites[0].adresse, epa.sites[0].ville, epa.sites[0].pays].filter(Boolean).join(", "),
      epa.lien === "exact" ? "EPA establishment" : "EPA (rapprochement probable)"
    );
  }
  push(tr?.adresse ?? null, "BKÜ Turquie");

  return {
    emails,
    telephones,
    site,
    adresses,
    joignable: emails.length > 0 || telephones.length > 0,
  };
}

export function aUnContact(c: ContactResolu): boolean {
  return c.joignable || c.adresses.length > 0 || Boolean(c.site);
}
