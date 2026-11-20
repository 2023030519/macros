import { test } from "node:test";
import assert from "node:assert/strict";
import { kcalCaminando, kmDePasos, plan } from "./calc.ts";

test("kcal caminando: por km y peso; los pasos se pasan a km con la estatura", () => {
  assert.equal(kcalCaminando(kmDePasos(10000, 175), 78), 283);
  assert.equal(kcalCaminando(8, 78), 312);
  assert.ok(kcalCaminando(8, 100) > kcalCaminando(8, 60));
  assert.equal(kcalCaminando(kmDePasos(0, 175), 78), 0);
});

test("78 kg, 175 cm, 30 años, hombre, moderado, perder grasa", () => {
  const r = plan({ peso: 78, altura: 175, edad: 30, sexo: "hombre", actividad: "moderado", objetivo: "perder_grasa" });
  assert.deepEqual(r, { tmb: 1729, tdee: 2680, kcal_objetivo: 2280, prot: 117, carbs: 278, grasas: 78, pctProt: 21, pctCarbs: 48, pctGrasas: 31 });
});

test("déficit y volumen elegidos por el usuario; sin valor, los de siempre", () => {
  const base = { peso: 78, altura: 175, edad: 30, sexo: "hombre", actividad: "moderado" } as const;
  assert.equal(plan({ ...base, objetivo: "perder_grasa", deficit: 600 }).kcal_objetivo, 2080);
  assert.equal(plan({ ...base, objetivo: "ganar_musculo", volumen: 400 }).kcal_objetivo, 3080);
  assert.equal(plan({ ...base, objetivo: "ganar_musculo" }).kcal_objetivo, 2930);
  assert.equal(plan({ ...base, objetivo: "mantenimiento", deficit: 600 }).kcal_objetivo, 2680);
});

test("mujer usa -161", () => {
  assert.equal(plan({ peso: 60, altura: 160, edad: 25, sexo: "mujer", actividad: "sedentario", objetivo: "mantenimiento" }).tmb, 1314);
});

test("carbs nunca negativos (datos con error de dedo)", () => {
  const r = plan({ peso: 50, altura: 100, edad: 100, sexo: "mujer", actividad: "moderado", objetivo: "perder_grasa" });
  assert.ok(r.carbs >= 0 && r.pctCarbs >= 0);
});
