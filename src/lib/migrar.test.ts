import { test } from "node:test";
import assert from "node:assert/strict";
import { exportar, leer } from "./migrar.ts";
import { item, type Receta } from "./receta.ts";

const bowl: Receta = { nombre: "bowl", porciones: 2, tiempo: 20, categoria: "Comida", ingredientes: [item("pollo", [165, 31, 0, 3.6, 0, null], 200)] };

test("ida y vuelta", () => {
  const p = { alimentos: { "mi licuado": [100, 8, 12, 2, 1, { cantidad: 1, unidad: "vaso", gramos: 350 }] as const }, recetas: { bowl } };
  const r = leer(exportar(p as never));
  assert.deepEqual(r.alimentos, p.alimentos);
  assert.deepEqual(r.recetas, p.recetas);
  assert.equal(r.invalidos, 0);
});

test("acepta el userDB de la app anterior (5 valores, fibra null)", () => {
  const r = leer(JSON.stringify({ "Oreo Original": [480, 5, 70, 20, null], "chips": [500, 6, 55, 30, 3, { cantidad: 1, unidad: "bolsa", gramos: 45 }] }));
  assert.deepEqual(Object.keys(r.alimentos), ["oreo original", "chips"]);
  assert.deepEqual(r.alimentos["oreo original"], [480, 5, 70, 20, 0, null]);
});

test("descarta lo inválido y avisa", () => {
  const r = leer(JSON.stringify({ app: "macros", v: 1, alimentos: { ok: [1, 1, 1, 1, 0, null], malo: [-5, 1, 1, 1, 0, null], texto: "hola" },
    recetas: { x: { ...bowl, porciones: 0 }, y: { ...bowl, nombre: "y", foto: "javascript:alert(1)" } } }));
  assert.deepEqual(Object.keys(r.alimentos), ["ok"]);
  assert.equal(r.invalidos, 3);
  assert.equal(r.recetas.y.foto, undefined);
});

test("archivo que no es de la app", () => {
  assert.throws(() => leer("no json"), /no es de MacrOS/);
  assert.throws(() => leer("[1,2]"), /no es de MacrOS/);
  assert.throws(() => leer("{}"), /No encontré/);
});
