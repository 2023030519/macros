import { Preferences } from "@capacitor/preferences";
import type { MealId } from "../data/foods.ts";
import type { Item } from "./receta.ts";

// Preferences = SharedPreferences en Android (no lo borra el sistema como localStorage).
// shortcut: un JSON por día; si el historial crece a años y se siente lento, pasar a SQLite.
export type Entrada = Item & { id: string; meal: MealId };

export async function load<T>(key: string, fallback: T): Promise<T> {
  const { value } = await Preferences.get({ key });
  return value ? (JSON.parse(value) as T) : fallback;
}

export const save = (key: string, v: unknown) => Preferences.set({ key, value: JSON.stringify(v) });
export const remove = (key: string) => Preferences.remove({ key });

export async function diasRegistrados() {
  const { keys } = await Preferences.keys();
  return new Set(keys.filter((k) => k.startsWith("log:")).map((k) => k.slice(4)));
}
