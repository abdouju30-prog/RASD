import assert from "node:assert/strict";
import { cultureParNomDe, matiereParIdDe, MELANGES } from "../lib/corpus";

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

console.log(`ok melange=${mix.id} pommier=${pommier.nbMatieres}`);
