import { MEALS } from "../data/foods.ts";

// Tiempos de comida (Configuración → Tiempos de comida). Se ocultan, no se borran: lo ya registrado conserva su nombre.
export type Tiempo = { id: string; label: string };
export type PrefComidas = { lista: Tiempo[]; ocultas: string[] };
export const COMIDAS_DEFAULT: PrefComidas = { lista: MEALS.map((m) => ({ id: m.id, label: m.label })), ocultas: [] };

// Lo guardado puede venir dañado o de otra versión: se limpian repetidos, vuelven los de siempre que falten y queda al menos uno visible.
export function normalizarComidas(raw: Partial<PrefComidas> | null | undefined): PrefComidas {
  const ok = (Array.isArray(raw?.lista) ? raw.lista : []).filter((t) => typeof t?.id === "string" && typeof t?.label === "string" && t.label.trim());
  const ids = new Set<string>();
  const lista: Tiempo[] = [];
  for (const t of [...ok, ...COMIDAS_DEFAULT.lista]) if (!ids.has(t.id)) { ids.add(t.id); lista.push({ id: t.id, label: t.label }); }
  const ocultas = [...new Set((Array.isArray(raw?.ocultas) ? raw.ocultas : []).filter((id) => ids.has(id)))];
  return { lista, ocultas: ocultas.length >= lista.length ? [] : ocultas };
}

// Los visibles, más los ocultos que ya tienen algo ese día, para que nada registrado desaparezca de la vista.
export const mostrar = ({ lista, ocultas }: PrefComidas, usados: string[] = []) => lista.filter((t) => !ocultas.includes(t.id) || usados.includes(t.id));

export const nombreTiempo = ({ lista }: PrefComidas, id: string) => lista.find((t) => t.id === id)?.label ?? id;

export const agregarTiempo = (p: PrefComidas, label: string): PrefComidas =>
  ({ ...p, lista: [...p.lista, { id: `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, label: label.trim() }] });
