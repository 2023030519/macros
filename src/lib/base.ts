import type { FoodRow } from "../data/foods.ts";
import { fila, nombre } from "./migrar.ts";
import { REPO } from "./version.ts";

// Base compartida: cambios sobre la base de la app (data/alimentos.json en el repo).
// Todas las copias de la app la descargan al abrir; solo quien tiene token puede escribirla.
export type Base = { alimentos: Record<string, FoodRow>; borrados: string[] };
export const VACIA: Base = { alimentos: {}, borrados: [] };

export function aplicarBase(db: Record<string, FoodRow>, base: Base) {
  const out = { ...db, ...base.alimentos };
  for (const n of base.borrados) delete out[n];
  return out;
}

// row null = borrar; anterior distinto = renombrar
export function editarBase(base: Base, n: string, row: FoodRow | null, anterior: string | null = null): Base {
  const alimentos = { ...base.alimentos };
  const borrados = new Set(base.borrados);
  if (anterior && anterior !== n) {
    delete alimentos[anterior];
    borrados.add(anterior);
  }
  if (row) {
    alimentos[n] = row;
    borrados.delete(n);
  } else {
    delete alimentos[n];
    borrados.add(n);
  }
  return { alimentos, borrados: [...borrados].sort() };
}

export function leerBase(texto: string): Base {
  const d = JSON.parse(texto);
  const base: Base = { alimentos: {}, borrados: [] };
  for (const [k, v] of Object.entries(d?.alimentos ?? {})) {
    const n = nombre(k);
    const f = fila(v);
    if (n && f) base.alimentos[n] = f;
  }
  base.borrados = (Array.isArray(d?.borrados) ? d.borrados : []).map(nombre).filter((n: string | null): n is string => !!n);
  return base;
}

const URL_BASE = `https://api.github.com/repos/${REPO}/contents/data/alimentos.json`;
const a64 = (s: string) => {
  let bin = "";
  for (const b of new TextEncoder().encode(s)) bin += String.fromCharCode(b);
  return btoa(bin);
};
const de64 = (b: string) => new TextDecoder().decode(Uint8Array.from(atob(b.replace(/\n/g, "")), (c) => c.charCodeAt(0)));
const headers = (token?: string) => ({ Accept: "application/vnd.github+json", ...(token ? { Authorization: `Bearer ${token}` } : {}) });

export async function bajar(token?: string): Promise<{ base: Base; sha: string | null }> {
  const r = await fetch(`${URL_BASE}?ref=main`, { headers: headers(token), cache: "no-store" });
  if (r.status === 404) return { base: VACIA, sha: null };
  if (!r.ok) throw new Error(`GitHub respondió ${r.status}.`);
  const j = await r.json();
  return { base: leerBase(de64(j.content)), sha: j.sha };
}

// Baja la última versión, le aplica el cambio y la sube. Si alguien subió algo en medio (409), reintenta una vez.
export async function subir(token: string, cambio: (b: Base) => Base, mensaje: string): Promise<Base> {
  for (let intento = 0; intento < 2; intento++) {
    const { base, sha } = await bajar(token);
    const nueva = cambio(base);
    const r = await fetch(URL_BASE, {
      method: "PUT",
      headers: headers(token),
      body: JSON.stringify({ message: mensaje, branch: "main", content: a64(JSON.stringify(nueva, null, 1) + "\n"), ...(sha ? { sha } : {}) }),
    });
    if (r.ok) return nueva;
    if (r.status === 409 && intento === 0) continue;
    throw new Error(r.status === 401 || r.status === 403 || r.status === 404 ? "El token no sirve o no tiene permiso de escribir en el repo." : `GitHub respondió ${r.status}.`);
  }
  throw new Error("No se pudo subir: otro cambio llegó al mismo tiempo. Intenta de nuevo.");
}
