import { useState } from "react";
import { MEALS, type MealId } from "../data/foods.ts";
import type { plan } from "../lib/calc.ts";
import { racha, sumarDias } from "../lib/dias.ts";
import { sumar } from "../lib/receta.ts";
import type { Entrada } from "../lib/store.ts";
import { Close, Flame, Macros, Plus, cap, fmt } from "../ui.tsx";

type Props = { dia: string; log: Entrada[]; dias: Set<string>; meta: ReturnType<typeof plan>; onAdd: (m: MealId) => void; onRemove: (id: string) => void };

const fecha = (dia: string) => {
  const [y, m, d] = dia.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export default function Hoy({ dia, log, dias, meta, onAdd, onRemove }: Props) {
  const [abierto, setAbierto] = useState<MealId | null>(null);
  const t = sumar(log);
  const resto = meta.kcal_objetivo - t.kcal;
  const arco = Math.min(1, t.kcal / meta.kcal_objetivo) * 339.3;
  const r = racha(dias, dia);
  const semana = [6, 5, 4, 3, 2, 1, 0].map((i) => sumarDias(dia, -i));

  return (
    <main className="screen">
      <header className="head">
        <div>
          <span className="kicker">{cap(fecha(dia).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" }).replace(",", ""))}</span>
          <h1>Hoy</h1>
        </div>
        <span className="pill" aria-label={`Racha de ${r} días`}><Flame />{r}</span>
      </header>

      <section className="card" aria-label="Calorías del día">
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ position: "relative", width: 124, height: 124, flexShrink: 0 }}>
            <svg width="124" height="124" viewBox="0 0 124 124" role="img" aria-label={`${fmt(t.kcal)} de ${fmt(meta.kcal_objetivo)} kcal consumidas`}>
              <circle cx="62" cy="62" r="54" fill="none" stroke="var(--surface2)" strokeWidth="10" />
              <circle cx="62" cy="62" r="54" fill="none" stroke={resto < 0 ? "var(--warn)" : "var(--text)"} strokeWidth="10" strokeLinecap={arco > 0 ? "round" : "butt"} strokeDasharray={`${arco} 339.3`} transform="rotate(-90 62 62)" />
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.03em" }}>{fmt(Math.abs(resto))}</span>
              <span className="muted" style={{ fontSize: 11, fontWeight: 500 }}>{resto < 0 ? "kcal de más" : "kcal restantes"}</span>
            </div>
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
            <div className="kv"><span className="muted">Meta</span><b>{fmt(meta.kcal_objetivo)}</b></div>
            <div className="hr" />
            <div className="kv"><span className="muted">Consumidas</span><b>{fmt(t.kcal)}</b></div>
          </div>
        </div>
        <div className="grid3" style={{ gap: 12 }}>
          {([["Proteína", t.p, meta.prot, "bg-p"], ["Carbs", t.c, meta.carbs, "bg-c"], ["Grasas", t.g, meta.grasas, "bg-g"]] as const).map(([l, v, m, bg]) => (
            <div key={l} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span className="label" style={{ fontWeight: 500 }}>{l}</span>
              <div className="track"><div className={bg} style={{ width: `${m ? Math.min(100, (v / m) * 100) : 0}%` }} /></div>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{fmt(v)}<span className="muted" style={{ fontWeight: 500 }}> / {fmt(m)} g</span></span>
            </div>
          ))}
        </div>
      </section>

      <section className="card" aria-label="Últimos 7 días" style={{ borderRadius: 20, padding: "14px 16px", flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <div className="week">
          {semana.map((d) => (
            <div key={d}>
              {"DLMMJVS"[fecha(d).getDay()]}
              <span className={`wd ${dias.has(d) ? "done" : d === dia ? "today" : "miss"}`} aria-label={dias.has(d) ? "Registrado" : "Sin registro"} />
            </div>
          ))}
        </div>
      </section>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 4 }}>
        <h2>Comidas</h2>
        <span className="sub">{MEALS.length} tiempos</span>
      </div>

      <div className="list">
        {MEALS.map((m) => {
          const es = log.filter((e) => e.meal === m.id);
          const s = sumar(es);
          return (
            <div key={m.id} className="meal">
              <div className="row" style={{ borderBottom: 0 }}>
                <button className="grow" style={{ background: "none", border: 0, padding: 0, textAlign: "left" }} aria-expanded={es.length ? abierto === m.id : undefined} onClick={() => es.length && setAbierto(abierto === m.id ? null : m.id)}>
                  <span style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <span className="name">{m.label}</span>
                    {es.length > 0 && <span className="sub">{fmt(s.kcal)} kcal</span>}
                  </span>
                  <span className="sub ellipsis" style={{ fontWeight: 400 }}>{es.length ? es.map((e) => cap(e.name)).join(" · ") : "Sin registrar"}</span>
                  {es.length > 0 && <Macros {...s} />}
                </button>
                <button className={`icon-btn ${es.length ? "" : "solid"}`} aria-label={`Agregar a ${m.label}`} onClick={() => onAdd(m.id)}><Plus /></button>
              </div>
              {abierto === m.id && es.map((e) => (
                <div key={e.id} className="row" style={{ paddingLeft: 28, borderBottom: 0, paddingTop: 0 }}>
                  <div className="grow">
                    <span style={{ fontSize: 14, fontWeight: 500 }} className="ellipsis">{cap(e.name)}</span>
                    <span className="sub">{fmt(e.grams)} g · {fmt(e.kcal)} kcal</span>
                  </div>
                  <button className="icon-btn" aria-label={`Quitar ${e.name}`} onClick={() => onRemove(e.id)}><Close /></button>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </main>
  );
}
