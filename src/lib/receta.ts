import type { FoodRow } from "../data/foods.ts";

// Un alimento con su cantidad y los macros ya calculados; si editas el alimento, lib/cascada.ts los recalcula.
export type Item = { name: string; grams: number; kcal: number; p: number; c: number; g: number };
export const CATEGORIAS = ["Desayuno", "Comida", "Cena", "Colación"] as const;
// shortcut: la foto va dentro de la receta como JPEG chico en base64; si son muchas recetas con foto y la app tarda en abrir, pasarlas a archivos (@capacitor/filesystem).
export type Receta = { nombre: string; porciones: number; tiempo: number; categoria: (typeof CATEGORIAS)[number]; ingredientes: Item[]; foto?: string };

export function item(name: string, row: FoodRow, grams: number): Item {
  const k = grams / 100;
  return { name, grams, kcal: row[0] * k, p: row[1] * k, c: row[2] * k, g: row[3] * k };
}

export const sumar = (es: Omit<Item, "name">[]) =>
  es.reduce((t, e) => ({ kcal: t.kcal + e.kcal, p: t.p + e.p, c: t.c + e.c, g: t.g + e.g }), { kcal: 0, p: 0, c: 0, g: 0 });

// La receta como alimento de la base: valores por 100 g y la porción como atajo.
export function comoAlimento(r: Receta): FoodRow {
  const t = sumar(r.ingredientes);
  const gramos = r.ingredientes.reduce((s, i) => s + i.grams, 0);
  const k = gramos ? 100 / gramos : 0;
  return [t.kcal * k, t.p * k, t.c * k, t.g * k, 0, { cantidad: 1, unidad: "porción", gramos: Math.round(gramos / r.porciones) }];
}
