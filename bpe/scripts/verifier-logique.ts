import assert from "node:assert/strict";
import { cultureParNomDe, matiereParIdDe, MELANGES, ORGANISMES } from "../lib/corpus";
import { echeanceDe, organismesPour } from "../lib/organismes";

const ref = new Date(2026, 8, 23);

const pommier = cultureParNomDe("Pommier");
assert.ok(pommier);
assert.equal(pommier.originePerimetres, "homologa");
assert.ok(pommier.perimetres.includes("Cultures fruitières"));

const framboise = cultureParNomDe("Framboisier");
assert.equal(framboise?.originePerimetres, "ajout-bpe");
assert.ok(framboise?.perimetres.includes("Cultures fruitières"));

const fruit = organismesPour(["Pommier"]);
assert.equal(fruit.indetermine, false);
assert.ok(fruit.organismes.length > 0);
assert.ok(fruit.organismes.every((o) => o.couverture.includes("Cultures fruitières")));
assert.equal(
  fruit.organismes.some((o) => o.nom === "AGRO SPRAY TECHNIC"),
  false
);

const adjuvant = organismesPour(["Adjuvant pour herbicides"]);
assert.equal(adjuvant.indetermine, true);
assert.equal(adjuvant.organismes.length, ORGANISMES.length);

assert.equal(echeanceDe("01/01/2020", ref), "expire");
assert.equal(echeanceDe("20/10/2026", ref), "proche");
assert.equal(echeanceDe("01/01/2030", ref), "valide");
assert.equal(echeanceDe(null, ref), "inconnue");

const mix = MELANGES.find(
  (m) => m.composants.includes("Boscalide") && m.composants.includes("Pyraclostrobine")
);
assert.ok(mix);
assert.ok(mix.composantIds.every((id) => matiereParIdDe(id)));

console.log(`ok organismes-fruit=${fruit.organismes.length} melange=${mix.id}`);
