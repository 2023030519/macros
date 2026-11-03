// Tarjetas de la pantalla Hoy que se pueden ocultar y reordenar (Configuración → Pantalla Hoy).
export const TARJETAS = ["calorias", "semana", "comidas"] as const;
export type Tarjeta = (typeof TARJETAS)[number];
export type PrefHoy = { orden: Tarjeta[]; ocultas: Tarjeta[] };
export const HOY_DEFAULT: PrefHoy = { orden: [...TARJETAS], ocultas: [] };

// Lo guardado puede venir de otra versión: se quitan desconocidas/repetidas y se agregan las que falten al final.
export function normalizarHoy(raw: Partial<PrefHoy> | null | undefined): PrefHoy {
  const ok = (l: unknown) => (Array.isArray(l) ? l : []).filter((k): k is Tarjeta => TARJETAS.includes(k));
  return { orden: [...new Set([...ok(raw?.orden), ...TARJETAS])], ocultas: [...new Set(ok(raw?.ocultas))] };
}

export function mover(orden: Tarjeta[], t: Tarjeta, paso: -1 | 1): Tarjeta[] {
  const i = orden.indexOf(t), j = i + paso;
  if (i < 0 || j < 0 || j >= orden.length) return orden;
  const out = [...orden];
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}

// Arrastrar en Hoy: k queda en la posición `a` entre las visibles; las ocultas van al final.
export function reubicar({ orden, ocultas }: PrefHoy, k: Tarjeta, a: number): Tarjeta[] {
  const vis = orden.filter((t) => t !== k && !ocultas.includes(t));
  vis.splice(a, 0, k);
  return [...vis, ...orden.filter((t) => ocultas.includes(t))];
}
