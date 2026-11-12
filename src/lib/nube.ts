import { Preferences } from "@capacitor/preferences";
import { createClient } from "@supabase/supabase-js";
import { sincronizable, soloAqui } from "./sync.ts";

// Cel y compu vinculados: cada clave de Preferences es una fila de la tabla "datos" en Supabase (supabase/datos.sql).
// Se sube al guardar; se baja al abrir y al volver a la app. Si los dos cambian lo mismo, gana el último.
const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
export const hayNube = !!(URL && KEY);

const leer = async (k: string) => (await Preferences.get({ key: k })).value;
const sb = hayNube
  ? createClient(URL!, KEY!, {
      // la sesión vive en Preferences, como lo demás (el sistema no la borra como a localStorage)
      auth: { detectSessionInUrl: false, storage: { getItem: leer, setItem: (key, value) => Preferences.set({ key, value }), removeItem: (key) => Preferences.remove({ key }) } },
    })
  : null;

type Fila = { clave: string; valor: unknown; actualizado: string };

async function sesion() {
  return sb ? (await sb.auth.getSession()).data.session : null;
}
export const cuenta = async () => (await sesion())?.user.email ?? null;

// este dispositivo, para no bajar lo que él mismo subió
async function yo() {
  let id = await leer("sync:yo");
  if (!id) await Preferences.set({ key: "sync:yo", value: (id = crypto.randomUUID()) });
  return id;
}

async function enviar(claves: string[]) {
  const dispositivo = await yo();
  const filas = await Promise.all(claves.map(async (clave) => {
    const v = await leer(clave);
    return { clave, valor: v === null ? null : JSON.parse(v), dispositivo }; // null = se borró
  }));
  const { error } = await sb!.from("datos").upsert(filas, { onConflict: "user_id,clave" });
  if (error) throw new Error(error.message);
}

// Todo lo de la nube (de a 1000, el límite de Supabase), opcionalmente solo lo nuevo de otros dispositivos.
async function traer(desde: string | null, dispositivo: string | null) {
  const filas: Fila[] = [];
  for (let i = 0; ; i += 1000) {
    let q = sb!.from("datos").select("clave,valor,actualizado").order("actualizado").order("clave").range(i, i + 999);
    if (desde) q = q.gt("actualizado", desde);
    if (dispositivo) q = q.neq("dispositivo", dispositivo);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    filas.push(...(data as Fila[]));
    if (data.length < 1000) return filas;
  }
}

async function aplicar(filas: Fila[]) {
  for (const f of filas) {
    if (f.valor === null) await Preferences.remove({ key: f.clave });
    else await Preferences.set({ key: f.clave, value: JSON.stringify(f.valor) });
  }
  if (filas.length) await Preferences.set({ key: "sync:desde", value: filas[filas.length - 1].actualizado });
}

async function pendientes(): Promise<string[]> {
  return JSON.parse((await leer("sync:pendientes")) ?? "[]");
}

// Lo llama store.ts después de guardar. Sin internet queda pendiente para la próxima sincronización.
export async function subirClave(clave: string) {
  if (!sincronizable(clave) || !(await sesion())) return;
  try {
    await enviar([clave]);
  } catch {
    const p = await pendientes();
    if (!p.includes(clave)) await Preferences.set({ key: "sync:pendientes", value: JSON.stringify([...p, clave]) });
  }
}

// Sube lo pendiente y baja lo que cambió en el otro dispositivo. Devuelve cuántas claves cambiaron aquí.
let enCurso: Promise<number> | null = null;
export function sincronizar(): Promise<number> {
  return (enCurso ??= (async () => {
    if (!(await sesion())) return 0;
    const p = await pendientes();
    if (p.length) {
      await enviar(p);
      await Preferences.remove({ key: "sync:pendientes" });
    }
    const filas = await traer(await leer("sync:desde"), await yo());
    await aplicar(filas);
    return filas.length;
  })().finally(() => { enCurso = null; }));
}

export async function entrar(correo: string, clave: string) {
  const { error } = await sb!.auth.signInWithPassword({ email: correo, password: clave });
  if (error) throw new Error(error.message === "Invalid login credentials" ? "Correo o contraseña incorrectos." : error.message);
  // primera vez en este dispositivo: baja todo y sube lo que la nube aún no tiene
  const filas = await traer(null, null);
  await aplicar(filas);
  const { keys } = await Preferences.keys();
  const subir = soloAqui(keys, filas.map((f) => f.clave));
  if (subir.length) await enviar(subir);
}

// Tus datos se quedan en este dispositivo; solo deja de sincronizar.
export async function salir() {
  await sb!.auth.signOut();
  await Preferences.remove({ key: "sync:desde" });
  await Preferences.remove({ key: "sync:pendientes" });
}
