import { test } from "node:test";
import assert from "node:assert/strict";
import type { FoodRow } from "../data/foods.ts";
import { aplicarItems, cascadaRecetas, type Cambios } from "./cascada.ts";
import { comoAlimento, item, type Receta } from "./receta.ts";

const pollo: FoodRow = [100, 20, 0, 2, 0, null];
const pollo2: FoodRow = [200, 30, 0, 5, 0, null];
const arroz: FoodRow = [360, 7, 79, 1, 0, null];

test("registro: mismo gramaje, valores y nombre nuevos", () => {
  const log = [{ id: "a", meal: "comida", ...item("pollo", pollo, 150) }, { id: "b", meal: "cena", ...item("arroz", arroz, 50) }];
  const out = aplicarItems(log, new Map([["pollo", { name: "pollo asado", row: pollo2 }]]))!;
  assert.deepEqual(out[0], { id: "a", meal: "comida", ...item("pollo asado", pollo2, 150) });
  assert.equal(out[1], log[1]);
  assert.equal(aplicarItems(log, new Map([["otro", { name: "otro", row: pollo }]])), null);
});

test("cambia la receta y la receta que la usa", () => {
  const bowl: Receta = { nombre: "bowl", porciones: 2, tiempo: 0, categoria: "Comida", ingredientes: [item("pollo", pollo, 200), item("arroz", arroz, 100)] };
  const doble: Receta = { nombre: "doble", porciones: 1, tiempo: 0, categoria: "Comida", ingredientes: [item("bowl", comoAlimento(bowl), 150)] };
  const ensalada: Receta = { nombre: "ensalada", porciones: 1, tiempo: 0, categoria: "Cena", ingredientes: [item("arroz", arroz, 10)] };
  const { recetas, cambios } = cascadaRecetas({ bowl, doble, ensalada }, new Map([["pollo", { name: "pollo", row: pollo2 }]]) as Cambios);

  assert.equal(recetas.bowl.ingredientes[0].kcal, 400);
  const bowlNuevo = comoAlimento(recetas.bowl);
  assert.equal(recetas.doble.ingredientes[0].kcal, item("bowl", bowlNuevo, 150).kcal);
  assert.equal(recetas.ensalada, ensalada);
  assert.deepEqual([...cambios.keys()].sort(), ["bowl", "doble", "pollo"]);
});

test("un ciclo de recetas no se queda dando vueltas", () => {
  const a: Receta = { nombre: "a", porciones: 1, tiempo: 0, categoria: "Comida", ingredientes: [item("b", pollo, 100), item("pollo", pollo, 100)] };
  const b: Receta = { nombre: "b", porciones: 1, tiempo: 0, categoria: "Comida", ingredientes: [item("a", pollo, 100)] };
  const { recetas } = cascadaRecetas({ a, b }, new Map([["pollo", { name: "pollo", row: pollo2 }]]) as Cambios);
  assert.ok(recetas.a && recetas.b);
});
