/**
 * Dumpe le nom ISO anglais de chaque matière active de l'index ONSSA.
 *
 *     npx tsx scripts/noms_iso.ts
 *
 * Sert de pont vers les registres étrangers, qui nomment tous les substances
 * en anglais ISO là où l'index marocain les nomme en français.
 *
 * L'appariement n'est PAS réimplémenté ici : il appelle `apparierApvma` de
 * lib/apvma.ts, seule et unique règle de rapprochement de l'outil. Une
 * deuxième implémentation dériverait de la première sans qu'on s'en aperçoive.
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { MATIERES } from "../lib/data";
import { apparierApvma } from "../lib/apvma";

const lignes = MATIERES.map((m) => {
  const c = apparierApvma(m.nom);
  return { id: m.id, nom: m.nom, molecule: m.molecule, iso: c ? c.nom : null };
});

const apparies = lignes.filter((l) => l.iso);
const iso = [...new Set(apparies.map((l) => l.iso as string))].sort();

const sortie = join(__dirname, "..", "data", "_iso.json");
writeFileSync(
  sortie,
  JSON.stringify(
    {
      genere: new Date().toISOString().slice(0, 19),
      nbMatieres: lignes.length,
      nbAppariees: apparies.length,
      iso,
      matieres: lignes,
    },
    null,
    1
  ),
  "utf-8"
);

console.log(
  `OK -> data/_iso.json : ${apparies.length}/${lignes.length} matières appariées, ${iso.length} noms ISO distincts`
);
