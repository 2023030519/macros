import type { FoodRow } from "../data/foods.ts";
import { comoAlimento, item, type Item, type Receta } from "./receta.ts";

// nombre anterior → nombre y valores nuevos
export type Cambios = Map<string, { name: string; row: FoodRow }>;

// Recalcula los items que usan un alimento cambiado, con los mismos gramos. null = nada cambió.
export function aplicarItems<T extends Item>(items: T[], cambios: Cambios): T[] | null {
  let cambio = false;
  const out = items.map((it) => {
    const c = cambios.get(it.name);
    if (!c) return it;
    cambio = true;
    return { ...it, ...item(c.name, c.row, it.grams) };
  });
  return cambio ? out : null;
}

// Las recetas que usan algo cambiado también cambian, y con ellas las recetas que las usan a ellas.
export function cascadaRecetas(recetas: Record<string, Receta>, cambios: Cambios) {
  const rs = { ...recetas };
  const todos: Cambios = new Map(cambios);
  let pendientes = cambios;
  // el tope de vueltas corta ciclos (receta A dentro de B dentro de A)
  for (let vuelta = 0; pendientes.size && vuelta <= Object.keys(rs).length; vuelta++) {
    const nuevos: Cambios = new Map();
    for (const [k, r] of Object.entries(rs)) {
      const ingredientes = aplicarItems(r.ingredientes, pendientes);
      if (!ingredientes) continue;
      rs[k] = { ...r, ingredientes };
      const c = { name: r.nombre, row: comoAlimento(rs[k]) };
      nuevos.set(r.nombre, c);
      todos.set(r.nombre, c);
    }
    pendientes = nuevos;
  }
  return { recetas: rs, cambios: todos };
}
