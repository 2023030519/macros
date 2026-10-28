import { test } from "node:test";
import assert from "node:assert/strict";
import { comoAlimento, item, sumar, type Receta } from "./receta.ts";

test("una porción de la receta = total / porciones", () => {
  const r: Receta = {
    nombre: "bowl", porciones: 2, tiempo: 20, categoria: "Comida",
    ingredientes: [item("pollo", [165, 31, 0, 3.6, 0, null], 200), item("arroz", [360, 6.6, 79, 0.6, 1.3, null], 100)],
  };
  const row = comoAlimento(r);
  assert.equal(row[5]!.gramos, 150);
  const porcion = item("bowl", row, row[5]!.gramos);
  const total = sumar(r.ingredientes);
  assert.ok(Math.abs(porcion.kcal - total.kcal / 2) < 1e-9);
  assert.ok(Math.abs(porcion.p - total.p / 2) < 1e-9);
});

test("receta sin ingredientes no da NaN", () => {
  const row = comoAlimento({ nombre: "x", porciones: 1, tiempo: 0, categoria: "Cena", ingredientes: [] });
  assert.ok(row.slice(0, 4).every((n) => n === 0));
});
