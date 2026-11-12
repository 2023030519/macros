import { test } from "node:test";
import assert from "node:assert/strict";
import { sincronizable, soloAqui } from "./sync.ts";

test("comparte datos, no apariencia ni llaves", () => {
  for (const k of ["perfil", "mios", "recetas", "menu", "log:2026-11-11"]) assert.ok(sincronizable(k), k);
  for (const k of ["tema", "color", "gemini", "token", "base", "sync:desde", "sb-x-auth-token"]) assert.ok(!sincronizable(k), k);
});

test("al vincular sube solo lo que la nube no tiene", () => {
  assert.deepEqual(soloAqui(["perfil", "log:2026-11-10", "tema", "log:2026-11-11"], ["perfil", "log:2026-11-11"]), ["log:2026-11-10"]);
});
