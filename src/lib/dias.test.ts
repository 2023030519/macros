import { test } from "node:test";
import assert from "node:assert/strict";
import { lunes, racha, sumarDias } from "./dias.ts";

test("sumarDias cruza meses y años", () => {
  assert.equal(sumarDias("2026-03-01", -1), "2026-02-28");
  assert.equal(sumarDias("2026-12-31", 1), "2027-01-01");
});

test("racha", () => {
  const s = new Set(["2026-10-25", "2026-10-26", "2026-10-27"]);
  assert.equal(racha(s, "2026-10-27"), 3);
  assert.equal(racha(s, "2026-10-28"), 3); // hoy sin registro todavía
  assert.equal(racha(s, "2026-10-29"), 0); // ayer sin registro
});

test("lunes de la semana", () => {
  assert.equal(lunes("2026-10-28"), "2026-10-26"); // miércoles
  assert.equal(lunes("2026-11-01"), "2026-10-26"); // domingo
  assert.equal(lunes("2026-10-26"), "2026-10-26");
});
