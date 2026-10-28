import { test } from "node:test";
import assert from "node:assert/strict";
import type { FoodRow } from "../data/foods.ts";
import { VACIA, aplicarBase, editarBase, leerBase } from "./base.ts";

const db: Record<string, FoodRow> = { pollo: [165, 31, 0, 3.6, 0, null], arroz: [360, 7, 79, 1, 0, null] };

test("editar uno de la base lo cambia para todos", () => {
  const b = editarBase(VACIA, "pollo", [110, 23, 0, 1.5, 0, null]);
  assert.deepEqual(aplicarBase(db, b).pollo, [110, 23, 0, 1.5, 0, null]);
  assert.deepEqual(aplicarBase(db, b).arroz, db.arroz);
});

test("renombrar y borrar", () => {
  let b = editarBase(VACIA, "pollo asado", db.pollo, "pollo");
  assert.deepEqual(Object.keys(aplicarBase(db, b)).sort(), ["arroz", "pollo asado"]);
  b = editarBase(b, "arroz", null);
  assert.deepEqual(Object.keys(aplicarBase(db, b)), ["pollo asado"]);
  b = editarBase(b, "arroz", db.arroz); // volver a crearlo lo saca de borrados
  assert.ok("arroz" in aplicarBase(db, b));
});

test("lee el archivo y descarta lo inválido", () => {
  const b = leerBase(JSON.stringify({ alimentos: { Pollo: [110, 23, 0, 1.5, 0, null], malo: [-1, 0, 0, 0, 0, null] }, borrados: ["Arroz", 5] }));
  assert.deepEqual(b, { alimentos: { pollo: [110, 23, 0, 1.5, 0, null] }, borrados: ["arroz"] });
});
