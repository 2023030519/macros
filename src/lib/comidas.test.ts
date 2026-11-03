import { test } from "node:test";
import assert from "node:assert/strict";
import { COMIDAS_DEFAULT, agregarTiempo, mostrar, normalizarComidas, nombreTiempo } from "./comidas.ts";

test("tiempos guardados se limpian y nunca quedan todos ocultos", () => {
  assert.deepEqual(normalizarComidas(null), COMIDAS_DEFAULT);
  const todos = COMIDAS_DEFAULT.lista.map((t) => t.id);
  assert.deepEqual(normalizarComidas({ lista: COMIDAS_DEFAULT.lista, ocultas: todos }).ocultas, []);
  const p = normalizarComidas({ lista: [{ id: "cena", label: "Cena" }, { id: "cena", label: "x" }, { id: 3 as never, label: "y" }], ocultas: ["nada", "desayuno"] });
  assert.equal(p.lista[0].id, "cena");
  assert.equal(p.lista.length, 5);
  assert.deepEqual(p.ocultas, ["desayuno"]);
});

test("un tiempo oculto con algo registrado se sigue viendo", () => {
  const p = { ...COMIDAS_DEFAULT, ocultas: ["desayuno", "colacion1"] };
  assert.deepEqual(mostrar(p).map((t) => t.id), ["comida", "colacion2", "cena"]);
  assert.deepEqual(mostrar(p, ["desayuno"]).map((t) => t.id), ["desayuno", "comida", "colacion2", "cena"]);
});

test("agregar un tiempo nuevo", () => {
  const p = agregarTiempo(COMIDAS_DEFAULT, "  Colación noche ");
  const t = p.lista[p.lista.length - 1];
  assert.equal(nombreTiempo(p, t.id), "Colación noche");
  assert.notEqual(t.id, "cena");
});
