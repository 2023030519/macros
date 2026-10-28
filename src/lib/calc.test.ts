import { test } from "node:test";
import assert from "node:assert/strict";
import { plan } from "./calc.ts";

test("78 kg, 175 cm, 30 años, hombre, moderado, perder grasa", () => {
  const r = plan({ peso: 78, altura: 175, edad: 30, sexo: "hombre", actividad: "moderado", objetivo: "perder_grasa" });
  assert.deepEqual(r, { tmb: 1729, tdee: 2680, kcal_objetivo: 2280, prot: 117, carbs: 278, grasas: 78, pctProt: 21, pctCarbs: 48, pctGrasas: 31 });
});

test("mujer usa -161", () => {
  assert.equal(plan({ peso: 60, altura: 160, edad: 25, sexo: "mujer", actividad: "sedentario", objetivo: "mantenimiento" }).tmb, 1314);
});

test("carbs nunca negativos (datos con error de dedo)", () => {
  const r = plan({ peso: 50, altura: 100, edad: 100, sexo: "mujer", actividad: "moderado", objetivo: "perder_grasa" });
  assert.ok(r.carbs >= 0 && r.pctCarbs >= 0);
});
