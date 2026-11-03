import { test } from "node:test";
import assert from "node:assert/strict";
import { mover, normalizarHoy, reubicar } from "./hoy.ts";

test("lo guardado se limpia y completa", () => {
  assert.deepEqual(normalizarHoy(null), { orden: ["calorias", "semana", "comidas"], ocultas: [] });
  assert.deepEqual(normalizarHoy({ orden: ["comidas", "x" as never, "comidas"], ocultas: ["semana", "y" as never] }),
    { orden: ["comidas", "calorias", "semana"], ocultas: ["semana"] });
});

test("mover cambia de lugar y no se sale de la lista", () => {
  assert.deepEqual(mover(["calorias", "semana", "comidas"], "comidas", -1), ["calorias", "comidas", "semana"]);
  assert.deepEqual(mover(["calorias", "semana", "comidas"], "calorias", -1), ["calorias", "semana", "comidas"]);
});

test("reubicar al soltar: posición entre las visibles, ocultas al final", () => {
  assert.deepEqual(reubicar({ orden: ["calorias", "semana", "comidas"], ocultas: [] }, "comidas", 0), ["comidas", "calorias", "semana"]);
  assert.deepEqual(reubicar({ orden: ["calorias", "semana", "comidas"], ocultas: ["semana"] }, "calorias", 1), ["comidas", "calorias", "semana"]);
});
