import type { FoodRow, Porcion } from "../data/foods.ts";
import { CATEGORIAS, type Item, type Receta } from "./receta.ts";

// Archivo para pasar alimentos y recetas entre teléfonos. También acepta el userDB de la app anterior.
export type Paquete = { alimentos: Record<string, FoodRow>; recetas: Record<string, Receta> };

export const exportar = (p: Paquete) => JSON.stringify({ app: "macros", v: 1, ...p });

const num = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x) && x >= 0;
// "__proto__" como llave cambiaría el prototipo del objeto en vez de guardar un alimento
export const nombre = (x: unknown) => (typeof x === "string" && x.trim() && x.trim() !== "__proto__" ? x.trim().toLowerCase() : null);

function porcion(x: unknown): Porcion | null | undefined {
  if (x === null || x === undefined) return null;
  const p = x as Porcion;
  return num(p.cantidad) && typeof p.unidad === "string" && num(p.gramos) && p.gramos > 0 ? { cantidad: p.cantidad, unidad: p.unidad, gramos: p.gramos } : undefined;
}

// La app anterior guardaba [kcal, p, c, g, fibra] o con la porción al final; fibra podía venir en null.
export function fila(x: unknown): FoodRow | null {
  if (!Array.isArray(x) || x.length < 5 || x.length > 6) return null;
  const [kcal, p, c, g, fibra] = x;
  const por = porcion(x[5]);
  if (![kcal, p, c, g].every(num) || !(fibra === null || num(fibra)) || por === undefined) return null;
  return [kcal, p, c, g, fibra ?? 0, por];
}

function item(x: unknown): Item | null {
  const i = x as Item;
  const n = nombre(i?.name);
  return n && [i.grams, i.kcal, i.p, i.c, i.g].every(num) ? { name: n, grams: i.grams, kcal: i.kcal, p: i.p, c: i.c, g: i.g } : null;
}

function receta(x: unknown): Receta | null {
  const r = x as Receta;
  const n = nombre(r?.nombre);
  if (!n || !Number.isInteger(r.porciones) || r.porciones < 1 || !num(r.tiempo) || !CATEGORIAS.includes(r.categoria) || !Array.isArray(r.ingredientes)) return null;
  const ingredientes = r.ingredientes.map(item);
  if (!ingredientes.length || ingredientes.some((i) => !i)) return null;
  // solo fotos que la app misma generó (JPEG en base64)
  const foto = typeof r.foto === "string" && r.foto.startsWith("data:image/jpeg;base64,") ? r.foto : undefined;
  return { nombre: n, porciones: r.porciones, tiempo: r.tiempo, categoria: r.categoria, ingredientes: ingredientes as Item[], ...(foto ? { foto } : {}) };
}

export function leer(texto: string): Paquete & { invalidos: number } {
  let datos: unknown;
  try {
    datos = JSON.parse(texto);
  } catch {
    throw new Error("El archivo no es de MacrOS.");
  }
  if (!datos || typeof datos !== "object" || Array.isArray(datos)) throw new Error("El archivo no es de MacrOS.");
  const d = datos as Record<string, unknown>;
  const esPaquete = d.app === "macros";
  const fuenteA = (esPaquete ? d.alimentos : d) as Record<string, unknown>;
  const fuenteR = (esPaquete ? d.recetas : {}) as Record<string, unknown>;

  const out: Paquete & { invalidos: number } = { alimentos: {}, recetas: {}, invalidos: 0 };
  for (const [k, v] of Object.entries(fuenteA ?? {})) {
    const n = nombre(k);
    const f = fila(v);
    if (n && f) out.alimentos[n] = f;
    else out.invalidos++;
  }
  for (const v of Object.values(fuenteR ?? {})) {
    const r = receta(v);
    if (r) out.recetas[r.nombre] = r;
    else out.invalidos++;
  }
  if (!Object.keys(out.alimentos).length && !Object.keys(out.recetas).length) throw new Error("No encontré alimentos ni recetas válidos en el archivo.");
  return out;
}
