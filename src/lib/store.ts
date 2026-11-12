import { Preferences } from "@capacitor/preferences";
import { subirClave } from "./nube.ts";
import type { MealId } from "../data/foods.ts";
import type { Item } from "./receta.ts";

// Preferences = SharedPreferences en Android (no lo borra el sistema como localStorage).
// shortcut: un JSON por día; si el historial crece a años y se siente lento, pasar a SQLite.
export type Entrada = Item & { id: string; meal: MealId };

export async function load<T>(key: string, fallback: T): Promise<T> {
  const { value } = await Preferences.get({ key });
  return value ? (JSON.parse(value) as T) : fallback;
}

// si el dispositivo está vinculado, también se sube a la nube (sin esperar: la app no se traba sin internet)
export async function save(key: string, v: unknown) {
  await Preferences.set({ key, value: JSON.stringify(v) });
  void subirClave(key);
}
export async function remove(key: string) {
  await Preferences.remove({ key });
  void subirClave(key);
}

export async function diasRegistrados() {
  const { keys } = await Preferences.keys();
  return new Set(keys.filter((k) => k.startsWith("log:")).map((k) => k.slice(4)));
}
