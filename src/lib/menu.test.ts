import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizarMenu } from "./menu.ts";

const huevo = { name: "huevo", grams: 50, kcal: 72, p: 6, c: 0, g: 5 };

test("el menú viejo (un item por tiempo) pasa a listas; el nuevo queda igual", () => {
  assert.deepEqual(normalizarMenu({ "2026-10-28": { desayuno: huevo } }), { "2026-10-28": { desayuno: [huevo] } });
  const nuevo = { "2026-10-28": { desayuno: [huevo, huevo] } };
  assert.deepEqual(normalizarMenu(nuevo), nuevo);
});
