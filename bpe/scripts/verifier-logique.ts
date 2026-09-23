import assert from "node:assert/strict";
import { cultureParNomDe, matiereParIdDe, MELANGES } from "../lib/corpus";
import { precedentsDe, preparerEssai } from "../lib/essai";
import { ETAPES } from "../lib/procedures";

const pommier = cultureParNomDe("Pommier");
assert.ok(pommier);
assert.ok(pommier.nbMatieres > 0);

const mix = MELANGES.find(
  (m) => m.composants.includes("Boscalide") && m.composants.includes("Pyraclostrobine")
);
assert.ok(mix);
assert.ok(mix.composantIds.length >= 2);
assert.ok(mix.composantIds.every((id) => matiereParIdDe(id)));
assert.ok(mix.emplois.length > 0);

assert.deepEqual(
  ETAPES.map((e) => e.id),
  ["question", "dispositif", "doses", "melange", "application", "notations"]
);
assert.ok(ETAPES.every((e) => e.texte.length < 120 && e.schemas.length > 0));

const oranger = preparerEssai({ culture: "agrumes-oranger" });
assert.ok(oranger.cibles.includes("Acariens"));
assert.ok(oranger.groupesCibles.some((g) => g.titre === "Oranger" && g.noms.length === 2));
assert.ok(oranger.choixMatieres.length > 10);

const essai = preparerEssai({ culture: pommier.id, m: mix.composantIds.slice(0, 2) });
assert.equal(essai.culture?.nom, "Pommier");
assert.equal(essai.matieres.length, 2);
const precedents = precedentsDe(essai);
assert.equal(precedents.length, 2);
assert.ok(precedents.every((p) => p.matiere && p.doses));

console.log(`ok melange=${mix.id} pommier=${pommier.nbMatieres} etapes=${ETAPES.length}`);
