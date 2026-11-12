import assert from "node:assert/strict";
import { test } from "node:test";
import { aCien, type Respuesta } from "./etiqueta.ts";

const base: Respuesta = { encontrada: true, nombre: " Avena ", base_g: 100, porcion_g: 40, kcal: 379, proteina: 13.2, carbohidratos: 67.7, grasas: 6.5, fibra: 10.1 };

test("columna por 100 g pasa igual", () => {
  assert.deepEqual(aCien(base), { nombre: "avena", kcal: 379, p: 13.2, c: 67.7, g: 6.5, f: 10.1, porcion: 40 });
});

test("solo por porción: convierte a 100 g", () => {
  const r = aCien({ ...base, base_g: 40, kcal: 152, proteina: 5.3, fibra: -1, porcion_g: 0 });
  assert.equal(r.kcal, 380);
  assert.equal(r.p, 13.3);
  assert.equal(r.f, 0);
  assert.equal(r.porcion, 0);
});

test("sin tabla o sin base: error para el usuario", () => {
  assert.throws(() => aCien({ ...base, encontrada: false }), /tabla nutrimental/);
  assert.throws(() => aCien({ ...base, base_g: 0 }), /tabla nutrimental/);
});
