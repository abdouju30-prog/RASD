import type { SocieteRusse } from "./russie";

// ────────────────────────────────────────────────────────────────────────────
// LECTURE FRANÇAISE DU CYRILLIQUE
//
// Le catalogue russe écrit tout en cyrillique, y compris Bayer et Syngenta.
// La translittération anglaise (shch, yu, ya) n'est pas celle qu'on lit en
// français (chtch, iou, ia). On transcrit ici pour AFFICHER, sans prétendre
// identifier : le nom han… non, le nom cyrillique du catalogue reste la source.
//
// Les sociétés passées par la table d'alias (Bayer, Syngenta, UPL…) gardent
// le nom latin vérifié : le retraduire du cyrillique referait « Baier ».
// ────────────────────────────────────────────────────────────────────────────

/** Transcription à la française : щ→chtch, ч→tch, ш→ch, ю→iou, я→ia, ж→j. */
const FR: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "e",
  ж: "j",
  з: "z",
  и: "i",
  й: "i",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "kh",
  ц: "ts",
  ч: "tch",
  ш: "ch",
  щ: "chtch",
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
  ю: "iou",
  я: "ia",
};

const MOTS_FR: Record<string, string> = {
  grupp: "groupe",
  grup: "groupe",
  ekspert: "expert",
  firma: "firme",
};

const PREFIXES_FORME = ["ООО", "ЗАО", "ОАО", "ПАО", "НАО", "ТПК", "НПО", "НПП", "НПФ", "ГК", "ИП", "АО", "ФИРМА"];

const FORMES_FR: Record<string, string> = {
  ООО: "SARL",
  АО: "SA",
  ОАО: "SA",
  ПАО: "SA",
  ЗАО: "SA",
  НАО: "SA",
  ИП: "EI",
  ГК: "groupe",
  ТПК: "maison de commerce",
  НПО: "institut",
  НПФ: "institut",
  НПП: "institut",
  ФИРМА: "firme",
  ЛТД: "Ltd",
  ГМБХ: "GmbH",
  АГ: "AG",
  СЕ: "SE",
};

function titreMot(w: string): string {
  if (!w) return w;
  return w.charAt(0).toUpperCase() + w.slice(1);
}

/**
 * Transcrit un nom cyrillique en lecture française.
 *
 * Ce n'est pas une identité commerciale. « Щелково Агрохим » devient
 * « Chtchelkovo Agrokhim », pas « Shchelkovo ».
 */
export function translittererFr(nom: string): string {
  let source = nom.trim();
  for (const f of PREFIXES_FORME) {
    if (source.toUpperCase().startsWith(f + " ") || source.toUpperCase().startsWith(f + "\u00a0")) {
      source = source.slice(f.length).trim();
      break;
    }
  }
  let brut = "";
  for (const c of source) {
    const l = c.toLowerCase();
    if (l in FR) brut += FR[l];
    else brut += c;
  }
  brut = brut.replace(/khkh(?=[iIxX])/gi, "xx");
  brut = brut.replace(/tekhno/gi, "techno");
  brut = brut.replace(/eksport/gi, "export");
  const mots = brut.split(/(\s+|-)/);
  const lu = mots
    .map((m) => {
      if (/^\s+$/.test(m) || m === "-") return m;
      const k = m.toLowerCase();
      if (MOTS_FR[k]) return titreMot(MOTS_FR[k]);
      if (/^xxi$/i.test(m)) return "XXI";
      if (/^[a-zà-ÿ]/i.test(m)) return titreMot(k);
      return m;
    })
    .join("");
  return lu.replace(/\bI\s+Ko\b/g, "et Cie");
}

/** Forme juridique du catalogue, en français. La plus précise l'emporte. */
export function formeFr(formes: string[]): string | null {
  const ordre = ["ПАО", "ОАО", "ЗАО", "АО", "ООО", "ИП", "ГК", "ТПК", "НПО", "ГМБХ", "АГ", "СЕ", "ЛТД"];
  for (const f of ordre) {
    if (formes.includes(f) && FORMES_FR[f]) return FORMES_FR[f];
  }
  for (const f of formes) {
    if (FORMES_FR[f]) return FORMES_FR[f];
  }
  return null;
}

/** Nom affichable en français. Le cyrillique reste disponible à part. */
export function etiquetteRusse(s: Pick<SocieteRusse, "nom" | "latin" | "identifie" | "formes">): string {
  const base = s.identifie ? s.latin : translittererFr(s.nom);
  const forme = formeFr(s.formes);
  if (!forme) return base;
  if (s.identifie) return base;
  const b = base.toLowerCase();
  if (b.includes(forme.toLowerCase()) || b.endsWith(" sarl") || b.endsWith(" sa")) return base;
  return `${base} — ${forme}`;
}
