import type { FoodRow } from "../data/foods.ts";
import type { Tiempo } from "./comidas.ts";
import { item, type Item } from "./receta.ts";

// Lee frases como "desayuné 2 huevos y 150 g de arroz" o "¿qué ceno?" contra tu base y tus recetas, sin internet.
// shortcut: reglas de palabras, no un modelo; frases libres ("lo de siempre") no se entienden. Si hace falta, un LLM detrás de Supabase.

// unidad "porcion" = cuántas veces la porción del alimento (pieza, rebanada, porción de receta…)
export type Leido = { nombre: string; cantidad: number; unidad: "g" | "porcion" | null; otras: string[] };
// propuesta: null = es un registro; [] = pidió propuesta sin decir para qué tiempo
export type Lectura = { propuesta: string[] | null; grupos: { meal: string; items: Leido[] }[]; faltan: string[] };

const norm = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
// plural y singular a la misma raíz: tomates/tomate → tomat, limones/limón → limon
const raiz = (w: string) => (w.length > 3 ? w.replace(/s$/, "").replace(/e$/, "") : w);

const VACIAS = new Set("de del la el los las lo al a en mi mis tu su para con y o e comi come tome me nos hoy fue unos unas algo receta".split(" "));
const NUM = new Map(Object.entries({ un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, medio: 0.5, media: 0.5, par: 2, cuarto: 0.25 }));
const G = new Set("g gr grs gramo gramos ml mililitro mililitros".split(" "));
const KG = new Set("kg kilo kilos l litro litros".split(" "));
// shortcut: "taza" o "vaso" cuentan como la porción que el alimento tenga en la base, aunque sea otra unidad
const PORCION = new Set("pieza piezas pz pza pzas porcion porciones rebanada rebanadas taza tazas plato platos vaso vasos scoop scoops cucharada cucharadas lata latas".split(" "));
// verbos y apodos → inicio del nombre del tiempo de comida
const ALIAS: Record<string, string> = {
  desayune: "desayun", desayunamos: "desayun", desayunar: "desayun", cene: "cena", ceno: "cena", cenar: "cena", cenamos: "cena",
  almorce: "comida", almuerzo: "comida", almorzar: "comida", colacion: "colacion", snack: "colacion", botana: "colacion", merienda: "colacion", merende: "colacion",
};
const PIDE = /\b(propon|sugier|recomien|arma)\w*|\bideas?\b|\bque (como|ceno|desayuno|almuerzo|puedo comer)\b/;
const SEP = /\s*(?:,(?!\d)|;|\.(?!\d)|\n|\+|\by\b|\bcon\b|\btambien\b)\s*/;

const numero = (w: string) => {
  const f = /^(\d+)\/(\d+)$/.exec(w);
  if (f) return Number(f[1]) / Number(f[2]);
  return /^\d+(?:[.,]\d+)?$/.test(w) ? Number(w.replace(",", ".")) : NUM.get(w);
};
const esPalabra = (w: string) => !VACIAS.has(w) && numero(w) === undefined && !G.has(w) && !KG.has(w) && !PORCION.has(w);

type Clave = { w: string[]; id: string };
function claves(tiempos: Tiempo[]): Clave[] {
  const out: Clave[] = tiempos.map((t) => ({ w: norm(t.label).split(/\s+/), id: t.id }));
  for (const [a, inicio] of Object.entries(ALIAS)) {
    const t = tiempos.find((x) => norm(x.label).startsWith(inicio));
    if (t) out.push({ w: [a], id: t.id });
  }
  return out.sort((a, b) => b.w.length - a.w.length);
}

function buscarTiempo(toks: string[], cs: Clave[]) {
  for (const c of cs) for (let i = 0; i + c.w.length <= toks.length; i++) if (c.w.every((x, j) => toks[i + j] === x)) return { id: c.id, i, n: c.w.length };
  return null;
}

type Indice = { n: string; ks: string[] }[];
const palabras = (n: string) => norm(n).split(/[\s,]+/).filter((w) => w && !VACIAS.has(w)).map(raiz);

// Un trozo ("2 tortillas de maíz") → alimento y cantidad; texto si no está en la base; null si no nombra nada.
function linea(toks: string[], indice: Indice): Leido | string | null {
  let cantidad = 1;
  let unidad: Leido["unidad"] = null;
  const pal: string[] = [];
  for (const w of toks) {
    const n = numero(w);
    if (n !== undefined) cantidad *= n;
    else if (G.has(w)) unidad = "g";
    else if (KG.has(w)) { unidad = "g"; cantidad *= 1000; }
    else if (PORCION.has(w)) unidad ??= "porcion";
    else if (!VACIAS.has(w)) pal.push(w);
  }
  if (!pal.length) return null;
  const q = pal.map(raiz);
  const exacto = (ks: string[]) => +(ks.join(" ") === q.join(" "));
  // el nombre que contiene todas tus palabras; gana el exacto, luego el que menos palabras extra tiene
  const cands = indice.filter((f) => q.every((w) => f.ks.includes(w)))
    .sort((a, b) => exacto(b.ks) - exacto(a.ks) || a.ks.length - b.ks.length || a.n.length - b.n.length);
  if (!cands.length) return toks.slice(toks.indexOf(pal[0])).join(" ");
  return { nombre: cands[0].n, cantidad, unidad, otras: cands.slice(1, 4).map((c) => c.n) };
}

export function leer(texto: string, foods: Record<string, FoodRow>, tiempos: Tiempo[], porDefecto: string): Lectura {
  const cs = claves(tiempos);
  let t = norm(texto).replace(/[¿?¡!"():]/g, " ").replace(/(\d)([a-z])/g, "$1 $2");
  if (PIDE.test(t)) {
    const toks = t.split(/\s+/);
    const ids = cs.flatMap((c) => (toks.some((_, i) => c.w.every((x, j) => toks[i + j] === x)) ? [c.id] : []));
    return { propuesta: [...new Set(ids)], grupos: [], faltan: [] };
  }
  // nombres con "y" o "con" adentro ("arroz con pollo") no se parten
  for (const n of Object.keys(foods).map(norm).filter((k) => /\b(y|con)\b|,/.test(k)).sort((a, b) => b.length - a.length)) {
    t = t.split(n).join(n.replace(/[\s,]+/g, "_"));
  }
  const indice: Indice = Object.keys(foods).map((n) => ({ n, ks: palabras(n) }));
  const grupos: Lectura["grupos"] = [];
  const faltan: string[] = [];
  const poner = (meal: string, its: Leido[]) => {
    if (!its.length) return;
    const g = grupos.find((x) => x.meal === meal);
    if (g) g.items.push(...its);
    else grupos.push({ meal, items: [...its] });
  };
  let actual: string | null = null;
  let pendientes: Leido[] = [];
  for (const trozo of t.split(SEP)) {
    const toks = trozo.split(/[\s_]+/).filter(Boolean);
    if (!toks.length) continue;
    const m = buscarTiempo(toks, cs);
    const l = linea(m ? toks.filter((_, j) => j < m.i || j >= m.i + m.n) : toks, indice);
    if (typeof l === "string") faltan.push(l);
    const its = l && typeof l !== "string" ? [l] : [];
    if (!m) {
      if (actual) poner(actual, its);
      else pendientes.push(...its);
      continue;
    }
    // "2 huevos y 2 tortillas en el desayuno": el tiempo al final se lleva lo pendiente
    if (toks.slice(0, m.i).some(esPalabra)) poner(m.id, [...pendientes, ...its]);
    else { poner(actual ?? porDefecto, pendientes); poner(m.id, its); }
    pendientes = [];
    actual = m.id;
  }
  poner(actual ?? porDefecto, pendientes);
  return { propuesta: null, grupos, faltan };
}

// sin gramos y sin porción en la base se suponen 100 g por pieza (supuesto() lo avisa)
export const gramos = (row: FoodRow, l: Leido) => (l.unidad === "g" ? l.cantidad : l.cantidad * (row[5] ? row[5].gramos / row[5].cantidad : 100));
export const supuesto = (row: FoodRow, l: Leido) => l.unidad !== "g" && !row[5];

// Recetas cuya porción (de media a doble) queda más cerca de lo que le toca a ese tiempo; quedarse corto de proteína resta, pasarse no.
export function proponer(foods: Record<string, FoodRow>, recetas: string[], meta: { kcal: number; p: number }, n = 3): Item[] {
  if (meta.kcal < 50) return [];
  const p = Math.max(0, meta.p);
  return recetas.filter((r) => foods[r]).map((r) => {
    const row = foods[r], por = row[5]?.gramos ?? 100;
    return [0.5, 1, 1.5, 2].map((f) => item(r, row, por * f))
      .map((it) => ({ it, s: Math.abs(it.kcal - meta.kcal) / meta.kcal + (0.5 * Math.max(0, p - it.p)) / Math.max(p, 10) }))
      .sort((a, b) => a.s - b.s)[0];
  }).sort((a, b) => a.s - b.s).slice(0, n).map((x) => x.it);
}
