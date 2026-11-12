import { test } from "node:test";
import assert from "node:assert/strict";
import type { FoodRow } from "../data/foods.ts";
import { COMIDAS_DEFAULT } from "./comidas.ts";
import { gramos, leer, proponer, supuesto } from "./frase.ts";

const pz = (gramos: number, unidad = "pieza") => ({ cantidad: 1, unidad, gramos });
const foods: Record<string, FoodRow> = {
  "huevo": [143, 12.6, 0.7, 9.5, 0, pz(50)],
  "clara de huevo": [52, 10.9, 0.7, 0.2, 0, null],
  "tortilla de maíz": [218, 5.7, 45, 2.8, 6, pz(25)],
  "tortilla de harina": [310, 8, 50, 9, 2, pz(30)],
  "arroz con pollo": [150, 10, 15, 5, 1, pz(300, "porción")],
  "tinga": [160, 14, 6, 9, 1, pz(250, "porción")],
  "manzana roja": [52, 0.3, 13.8, 0.2, 2.4, null],
};
const T = COMIDAS_DEFAULT.lista;
const leerla = (s: string, def = "comida") => leer(s, foods, T, def);

test("separa alimentos, cantidades y tiempos", () => {
  const l = leerla("Desayuné 2 huevos y 2 tortillas, en la cena media porción de mi tinga");
  assert.equal(l.propuesta, null);
  assert.deepEqual(l.grupos.map((g) => [g.meal, g.items.map((i) => [i.nombre, i.cantidad, i.unidad])]), [
    ["desayuno", [["huevo", 2, null], ["tortilla de maíz", 2, null]]],
    ["cena", [["tinga", 0.5, "porcion"]]],
  ]);
  assert.deepEqual(l.grupos[0].items[1].otras, ["tortilla de harina"]);
  assert.equal(gramos(foods["huevo"], l.grupos[0].items[0]), 100);
  assert.equal(gramos(foods["tinga"], l.grupos[1].items[0]), 125);
});

test("el tiempo al final se lleva lo anterior; sin tiempo va al de por defecto", () => {
  const l = leerla("2 huevos y 1 tortilla de harina en el desayuno");
  assert.deepEqual(l.grupos.map((g) => [g.meal, g.items.length]), [["desayuno", 2]]);
  assert.deepEqual(leerla("una manzana", "cena").grupos.map((g) => g.meal), ["cena"]);
});

test("gramos, kilos y nombres con 'con' adentro", () => {
  const [g] = leerla("150g de arroz con pollo en la comida").grupos;
  assert.deepEqual([g.meal, g.items[0].nombre, g.items[0].cantidad, g.items[0].unidad], ["comida", "arroz con pollo", 150, "g"]);
  assert.equal(leerla("1,5 kg de tinga").grupos[0].items[0].cantidad, 1500);
  const m = leerla("una manzana").grupos[0].items[0];
  assert.ok(supuesto(foods["manzana roja"], m));
  assert.equal(gramos(foods["manzana roja"], m), 100);
});

test("lo que no está en la base se reporta, no se inventa", () => {
  const l = leerla("2 tacos de pastor y un huevo");
  assert.deepEqual(l.faltan, ["tacos de pastor"]);
  assert.equal(l.grupos[0].items[0].nombre, "huevo");
});

test("pedir propuesta", () => {
  assert.deepEqual(leerla("¿Qué ceno?").propuesta, ["cena"]);
  assert.deepEqual(leerla("propón algo").propuesta, []);
});

test("propone la receta y la porción más cercana a lo que falta", () => {
  const its = proponer(foods, ["tinga", "arroz con pollo"], { kcal: 400, p: 35 });
  assert.equal(its[0].name, "tinga");
  assert.equal(its[0].grams, 250);
  // pasarse de proteína no castiga: 527 kcal con 23 g de proteína → 1.5 porciones (600 kcal), no 1 (400 kcal)
  assert.equal(proponer(foods, ["tinga"], { kcal: 527, p: 23 })[0].grams, 375);
  assert.deepEqual(proponer(foods, ["tinga"], { kcal: 20, p: 0 }), []);
});
