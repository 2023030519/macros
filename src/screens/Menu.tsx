import { useState } from "react";
import { MEALS, type FoodRow, type MealId } from "../data/foods.ts";
import type { plan } from "../lib/calc.ts";
import { lunes, sumarDias } from "../lib/dias.ts";
import type { MenuSemanal } from "../lib/menu.ts";
import { sumar, type Item } from "../lib/receta.ts";
import { Close, Plus, cap, fmt } from "../ui.tsx";
import Elegir from "./Elegir.tsx";

const svg = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2.2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;
const fecha = (dia: string) => {
  const [y, m, d] = dia.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const corta = (dia: string) => fecha(dia).toLocaleDateString("es-MX", { day: "numeric", month: "short" }).replace(".", "");

export default function Menu({ dia, menu, meta, foods, onAgregar, onQuitar, onDuplicar, onAplicar, onNuevoAlimento }: {
  dia: string; menu: MenuSemanal; meta: ReturnType<typeof plan>; foods: Record<string, FoodRow>;
  onAgregar: (d: string, m: MealId, it: Item) => void; onQuitar: (d: string, m: MealId, i: number) => void; onDuplicar: (lunes: string) => Promise<boolean>; onAplicar: (d: string) => void; onNuevoAlimento: (n: string, r: FoodRow) => Promise<void>;
}) {
  const [semana, setSemana] = useState(lunes(dia));
  const [sel, setSel] = useState(dia);
  const [agregando, setAgregando] = useState<MealId | null>(null);
  const dias = [0, 1, 2, 3, 4, 5, 6].map((i) => sumarDias(semana, i));
  const delDia = (d: string) => Object.values(menu[d] ?? {}).flat() as Item[];
  const t = sumar(delDia(sel));
  const libres = meta.kcal_objetivo - t.kcal;

  function moverSemana(n: number) {
    const l = sumarDias(semana, 7 * n);
    setSemana(l);
    setSel(l === lunes(dia) ? dia : l);
  }

  return (
    <main className="screen">
      <header className="head">
        <div>
          <span className="kicker">{corta(dias[0])} – {corta(dias[6])}</span>
          <h1>Menú semanal</h1>
        </div>
        <div style={{ display: "flex", flexDirection: "row", gap: 6 }}>
          <button className="icon-btn" style={{ background: "var(--surface)" }} aria-label="Semana anterior" onClick={() => moverSemana(-1)}><svg {...svg}><path d="m15 6-6 6 6 6" /></svg></button>
          <button className="icon-btn" style={{ background: "var(--surface)" }} aria-label="Semana siguiente" onClick={() => moverSemana(1)}><svg {...svg}><path d="m9 6 6 6-6 6" /></svg></button>
        </div>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 6 }}>
        {dias.map((d) => {
          const on = d === sel;
          const pct = Math.min(100, (sumar(delDia(d)).kcal / meta.kcal_objetivo) * 100);
          return (
            <button key={d} aria-pressed={on} aria-label={fecha(d).toLocaleDateString("es-MX", { weekday: "long", day: "numeric" })} onClick={() => setSel(d)}
              style={{ height: 72, borderRadius: 16, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, padding: 0, border: on ? 0 : "1px solid var(--line)", background: on ? "var(--accent)" : "var(--surface)", color: on ? "var(--on-accent)" : "var(--text)", outline: d === dia && !on ? "2px dashed var(--line)" : undefined }}>
              <span style={{ fontSize: 11, fontWeight: 600, opacity: 0.75 }}>{"DLMMJVS"[fecha(d).getDay()]}</span>
              <span style={{ fontSize: 17, fontWeight: 700 }}>{fecha(d).getDate()}</span>
              <span style={{ display: "block", height: 3, borderRadius: 9, width: Math.max(pct * 0.22, 4), background: on ? "var(--on-accent)" : pct ? "var(--accent)" : "var(--line)" }} />
            </button>
          );
        })}
      </div>

      <section className="card" aria-label="Resumen del día planeado" style={{ borderRadius: 22, padding: 16, gap: 12 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <span><b style={{ fontSize: 26, letterSpacing: "-0.03em" }}>{fmt(t.kcal)}</b> <span className="sub" style={{ fontSize: 13 }}>/ {fmt(meta.kcal_objetivo)} kcal planeadas</span></span>
          <span style={{ fontSize: 12, fontWeight: 600, color: libres < 0 ? "var(--warn)" : undefined }}>{libres < 0 ? `${fmt(-libres)} de más` : `${fmt(libres)} libres`}</span>
        </div>
        <div className="track" style={{ height: 8 }}><div style={{ width: `${Math.min(100, (t.kcal / meta.kcal_objetivo) * 100)}%`, background: "var(--accent)" }} /></div>
        <div className="macros" style={{ justifyContent: "space-between", fontSize: 12 }}>
          <span><i className="dot bg-p" />P {fmt(t.p)} / {fmt(meta.prot)} g</span>
          <span><i className="dot bg-c" />C {fmt(t.c)} / {fmt(meta.carbs)} g</span>
          <span><i className="dot bg-g" />G {fmt(t.g)} / {fmt(meta.grasas)} g</span>
        </div>
      </section>

      <div className="list">
        {MEALS.map((m) => {
          const its = menu[sel]?.[m.id] ?? [];
          return (
            <div key={m.id} className="meal">
              <div className="row" style={{ padding: "10px 10px 10px 16px", borderBottom: 0 }}>
                <div className="grow" style={{ gap: 2 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }} className="muted">{m.label}</span>
                  {!its.length && <span className="name muted" style={{ fontWeight: 500 }}>Sin planear</span>}
                </div>
                {its.length > 0 && <span style={{ fontSize: 14, fontWeight: 600 }}>{fmt(sumar(its).kcal)} kcal</span>}
                <button className={`icon-btn ${its.length ? "" : "solid"}`} aria-label={`Agregar a ${m.label}`} onClick={() => setAgregando(m.id)}><Plus /></button>
              </div>
              {its.map((it, i) => (
                <div key={i} className="row" style={{ padding: "0 10px 8px 16px", borderBottom: 0 }}>
                  <div className="grow"><span className="name ellipsis">{cap(it.name)}</span><span className="sub">{fmt(it.grams)} g · {fmt(it.kcal)} kcal</span></div>
                  <button className="icon-btn" aria-label={`Quitar ${it.name} de ${m.label}`} onClick={() => onQuitar(sel, m.id, i)}><Close /></button>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      <div className="grid2">
        <button className="secondary" style={{ height: 50, background: "var(--surface)", fontSize: 14 }} onClick={async () => { if (await onDuplicar(semana)) moverSemana(1); }}>Duplicar semana</button>
        <button className="primary" style={{ height: 50, fontSize: 14 }} disabled={!delDia(sel).length} onClick={() => onAplicar(sel)}>Aplicar a Hoy</button>
      </div>

      {agregando && (
        <Elegir title={`Agregar a ${MEALS.find((x) => x.id === agregando)!.label}`} boton="Agregar al menú" foods={foods} onNuevo={onNuevoAlimento} onClose={() => setAgregando(null)}
          onPick={(it) => { onAgregar(sel, agregando, it); setAgregando(null); }} />
      )}
    </main>
  );
}
