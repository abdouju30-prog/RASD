import { chercher } from "../lib/recherche";
import {
  NB_COLLISIONS_RETRAIT,
  NB_RESTRICTIONS_INDEX,
  RESTRICTIONS_HORS_INDEX,
  RETIREES_HORS_INDEX,
  SUBSTANCES_RETIREES,
  SUBSTANCES_RESTREINTES,
  collisionsRetrait,
  restreinteParNom,
  restreintePourMatiere,
  retireeParNom,
  retireePourMatiere,
} from "../lib/onssa-listes";
import { DETENTEURS, MATIERES, META, matieresDuPortefeuille } from "../lib/data";
import { alertes } from "../lib/alertes";
import { detailRisque } from "../lib/logic";

function ok(cond: unknown, msg: string) {
  if (!cond) throw new Error("FAIL " + msg);
  console.log("OK  " + msg);
}

ok(SUBSTANCES_RETIREES.length === 87, `87 retirées (${SUBSTANCES_RETIREES.length})`);
ok(SUBSTANCES_RESTREINTES.length === 14, `14 restrictions (${SUBSTANCES_RESTREINTES.length})`);
ok(retireeParNom("Mancozèbe")?.nom === "Mancozèbe", "mancozèbe par nom");
ok(retireeParNom("mancozeb")?.nom === "Mancozèbe", "mancozeb graphie");
ok(restreinteParNom("Glyphosate")?.nom === "Glyphosate", "glyphosate restriction nom");
ok(restreinteParNom("Imidaclopride")?.nom === "Imidaclopride", "imidaclopride restriction nom");

const gly = MATIERES.filter((m) => restreintePourMatiere(m)?.nom === "Glyphosate");
ok(gly.length > 0, `glyphosate dans l'index (${gly.length} lignes)`);
const imi = MATIERES.filter((m) => restreintePourMatiere(m)?.nom === "Imidaclopride");
ok(imi.length > 0, `imidaclopride dans l'index (${imi.length} lignes)`);

const mancoExcel = MATIERES.filter((m) => retireePourMatiere(m)?.nom === "Mancozèbe");
ok(mancoExcel.length === 0, "mancozèbe absent de l'Excel");
ok(RETIREES_HORS_INDEX.some((r) => r.nom === "Mancozèbe"), "mancozèbe hors index");

const rManco = chercher("mancozeb");
ok(
  rManco.some((x) => x.type === "retiree" && /mancoz/i.test(x.libelle)),
  "recherche mancozeb → Retirée ONSSA: " + rManco.slice(0, 4).map((x) => `${x.type}:${x.libelle}`).join(" | ")
);
ok(
  rManco.some((x) => x.type === "retiree" && x.href && x.href.startsWith("http")),
  "mancozeb href PDF"
);

const rGly = chercher("glyphosate");
ok(
  rGly.some((x) => x.type === "matiere" && /restriction/i.test(x.detail)),
  "recherche glyphosate → restriction: " + rGly.slice(0, 3).map((x) => `${x.type}:${x.detail}`).join(" | ")
);

const rImi = chercher("imidaclopride");
ok(
  rImi.some((x) => x.type === "matiere" && /restriction/i.test(x.detail)),
  "recherche imidaclopride → restriction"
);

const rCad = chercher("cadusafos");
ok(
  rCad.some((x) => x.type === "restriction" && /cadusafos/i.test(x.libelle)),
  "recherche cadusafos → Restriction ONSSA: " + rCad.slice(0, 3).map((x) => `${x.type}:${x.libelle}`).join(" | ")
);
ok(RESTRICTIONS_HORS_INDEX.length === 4, `4 restrictions hors index (${RESTRICTIONS_HORS_INDEX.map(r => r.nom).join(", ")})`);

const collisions = collisionsRetrait();
console.log("collisions Excel/retrait:", collisions.length, collisions.map((c) => c.liste.nom).join(", "));
ok(typeof NB_COLLISIONS_RETRAIT === "number", `NB_COLLISIONS_RETRAIT=${NB_COLLISIONS_RETRAIT}`);
ok(NB_RESTRICTIONS_INDEX >= 2, `NB_RESTRICTIONS_INDEX=${NB_RESTRICTIONS_INDEX}`);

const d = DETENTEURS.find((x) => x.nom === META.detenteurDefaut) ?? DETENTEURS[0];
const al = alertes(d.id);
const onssaR = al.filter((a) => a.type === "onssa_restriction" || a.type === "onssa_retrait");
console.log("détenteur", d.nom, "alertes ONSSA", onssaR.map((a) => `${a.type}:${a.titre}`).join(" | "));

const glyMa = gly[0];
const risque = detailRisque(glyMa);
console.log("risque glyphosate", glyMa.id, risque?.score, risque?.facteurs[0]);
ok(risque && risque.facteurs.some((f) => /restriction/i.test(f.libelle)), "score glyphosate porte la restriction");

const portefeuille = matieresDuPortefeuille(d.id);
const restPf = portefeuille.filter((m) => restreintePourMatiere(m));
console.log("restrictions portefeuille", [...new Set(restPf.map((m) => restreintePourMatiere(m)!.nom))].join(", "));
console.log("ids glyphosate", gly.map((m) => m.id).slice(0, 5).join(", "));
console.log("ids imidaclopride", imi.map((m) => m.id).slice(0, 5).join(", "));

console.log("DONE");
