import { test } from "node:test";
import assert from "node:assert/strict";
import { esMasNueva } from "./version.ts";

test("compara versiones como números", () => {
  assert.equal(esMasNueva("v0.10.0", "0.9.3"), true);
  assert.equal(esMasNueva("v0.2.0", "0.2.0"), false);
  assert.equal(esMasNueva("0.1.9", "0.2.0"), false);
  assert.equal(esMasNueva("v1.0", "0.9.9"), true);
});
