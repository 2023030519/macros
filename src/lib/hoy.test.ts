import { test } from "node:test";
import assert from "node:assert/strict";
import { mover, normalizarHoy } from "./hoy.ts";

test("lo guardado se limpia y completa", () => {
  assert.deepEqual(normalizarHoy(null), { orden: ["calorias", "semana", "comidas"], ocultas: [] });
  assert.deepEqual(normalizarHoy({ orden: ["comidas", "x" as never, "comidas"], ocultas: ["semana", "y" as never] }),
    { orden: ["comidas", "calorias", "semana"], ocultas: ["semana"] });
});

test("mover cambia de lugar y no se sale de la lista", () => {
  assert.deepEqual(mover(["calorias", "semana", "comidas"], "comidas", -1), ["calorias", "comidas", "semana"]);
  assert.deepEqual(mover(["calorias", "semana", "comidas"], "calorias", -1), ["calorias", "semana", "comidas"]);
});
