import type { MealId } from "../data/foods.ts";
import type { Item } from "./receta.ts";

// día → tiempo de comida → lo planeado (puede ser más de un alimento o receta)
export type MenuSemanal = Record<string, Partial<Record<MealId, Item[]>>>;

// Hasta 0.4.0 cada tiempo guardaba un solo item; se convierte a lista al cargar.
export function normalizarMenu(raw: Record<string, Record<string, Item | Item[]>>): MenuSemanal {
  const out: MenuSemanal = {};
  for (const [d, comidas] of Object.entries(raw ?? {})) {
    out[d] = {};
    for (const [m, v] of Object.entries(comidas ?? {})) out[d][m as MealId] = Array.isArray(v) ? v : [v];
  }
  return out;
}
