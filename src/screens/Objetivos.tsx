import { useState } from "react";
import { AJUSTE_KCAL, plan, type Actividad, type Objetivo, type Perfil, type Sexo } from "../lib/calc.ts";
import { Chevron, Seg, fmt } from "../ui.tsx";

const ACTIVIDADES: [Actividad, string, string][] = [
  ["sedentario", "Sedentario", "Poco o nada de ejercicio"],
  ["ligero", "Ligera", "1–3 días de ejercicio por semana"],
  ["moderado", "Moderada", "3–5 días de ejercicio por semana"],
  ["activo", "Alta", "6–7 días de ejercicio por semana"],
  ["muy_activo", "Muy alta", "Trabajo físico o doble sesión"],
];
const OBJETIVOS: [Objetivo, string][] = [["perder_grasa", "Perder grasa"], ["mantenimiento", "Mantener"], ["ganar_musculo", "Ganar músculo"]];
const ajusteTxt = (o: Objetivo) => (AJUSTE_KCAL[o] > 0 ? `superávit +${AJUSTE_KCAL[o]}` : AJUSTE_KCAL[o] < 0 ? `déficit −${-AJUSTE_KCAL[o]}` : "sin ajuste");

export default function Objetivos({ perfil, onObjetivo, onEditar, onSimular, onConfig, hayNueva }: {
  perfil: Perfil; onObjetivo: (o: Objetivo) => void; onEditar: () => void; onSimular: () => void; onConfig: () => void; hayNueva: boolean;
}) {
  const r = plan(perfil);
  const act = ACTIVIDADES.find((a) => a[0] === perfil.actividad)!;
  return (
    <main className="screen">
      <header className="head">
        <div>
          <span className="kicker">Tu plan</span>
          <h1>Objetivos</h1>
        </div>
        <div style={{ flexDirection: "row", gap: 6 }}>
          <button className="pill" onClick={onEditar}>Editar datos</button>
          <button className="icon-btn" style={{ background: "var(--surface)", width: 36, height: 36, borderRadius: 999, position: "relative" }} aria-label={hayNueva ? "Configuración, hay una actualización" : "Configuración"} onClick={onConfig} >
            {hayNueva && <span aria-hidden="true" style={{ position: "absolute", top: 0, right: 0, width: 10, height: 10, borderRadius: 99, background: "var(--accent)", border: "2px solid var(--bg)" }} />}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>
          </button>
        </div>
      </header>

      <section className="card" aria-label="Requerimiento diario">
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span className="label">Requerimiento diario</span>
          <span><b style={{ fontSize: 40, fontWeight: 700, letterSpacing: "-0.04em" }}>{fmt(r.kcal_objetivo)}</b> <span className="muted">kcal</span></span>
          <span className="sub">Mantenimiento {fmt(r.tdee)} · {ajusteTxt(perfil.objetivo)} kcal</span>
        </div>
        <Seg label="Objetivo" value={perfil.objetivo} options={OBJETIVOS} onChange={onObjetivo} />
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="kv"><span className="muted">Actividad</span><b>{act[1]} · {act[2].split(" de ")[0]}</b></div>
          <div className="hr" />
          <div className="kv"><span className="muted">Datos</span><b>{perfil.peso} kg · {perfil.altura} cm · {perfil.edad} años</b></div>
          <div className="hr" />
          <div className="kv"><span className="muted">Basal (Mifflin-St Jeor)</span><b>{fmt(r.tmb)} kcal</b></div>
        </div>
      </section>

      <section className="card" aria-label="Macros" style={{ gap: 14 }}>
        {([["Proteína", r.pctProt, r.prot, "bg-p"], ["Carbs", r.pctCarbs, r.carbs, "bg-c"], ["Grasas", r.pctGrasas, r.grasas, "bg-g"]] as const).map(([l, pct, g, bg]) => (
          <div key={l} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div className="kv"><span className="muted">{l} · {pct}%</span><b>{fmt(g)} g</b></div>
            <div className="track"><div className={bg} style={{ width: `${Math.min(100, pct)}%` }} /></div>
          </div>
        ))}
      </section>

      <button className="secondary" style={{ background: "var(--surface)" }} onClick={onSimular}>Simular con otros datos</button>
    </main>
  );
}

// simular: mismo formulario, pero sin Guardar; no toca tu perfil.
export function TusDatos({ perfil, onSave, onCancel, simular }: { perfil: Perfil | null; onSave?: (p: Perfil) => Promise<void>; onCancel?: () => void; simular?: boolean }) {
  const [sexo, setSexo] = useState<Sexo>(perfil?.sexo ?? "hombre");
  const [actividad, setActividad] = useState<Actividad>(perfil?.actividad ?? "moderado");
  const [objetivo, setObjetivo] = useState<Objetivo>(perfil?.objetivo ?? "mantenimiento");
  const [v, setV] = useState({ edad: String(perfil?.edad ?? ""), peso: String(perfil?.peso ?? ""), altura: String(perfil?.altura ?? "") });
  const n = (s: string) => Number(s.replace(",", "."));
  const p: Perfil = { sexo, actividad, objetivo, edad: n(v.edad), peso: n(v.peso), altura: n(v.altura) };
  // misma validación que la calculadora anterior: los tres campos con valor
  const ok = [p.edad, p.peso, p.altura].every((x) => Number.isFinite(x) && x > 0);
  const r = ok ? plan(p) : null;

  const campo = (k: keyof typeof v, label: string, unit: string) => (
    <div className="field">
      <label htmlFor={`d-${k}`} className="label">{label}</label>
      <div className="box"><input id={`d-${k}`} inputMode="decimal" value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })} /><span className="unit">{unit}</span></div>
    </div>
  );

  return (
    <main className="screen" style={{ paddingBottom: 40, gap: 18 }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: 44 }}>
        {onCancel ? <button className="pill" style={{ border: 0, background: "none" }} onClick={onCancel}>{simular ? "Cerrar" : "Cancelar"}</button> : <span />}
        <h2>{simular ? "Simulador" : "Tus datos"}</h2>
        {simular || !onSave ? <span style={{ width: 70 }} /> : <button className="pill solid" disabled={!ok} style={{ opacity: ok ? 1 : 0.4 }} onClick={() => onSave(p)}>Guardar</button>}
      </header>

      <div className="field"><span className="label">Sexo</span>
        <Seg label="Sexo" value={sexo} options={[["hombre", "Hombre"], ["mujer", "Mujer"]]} onChange={setSexo} />
      </div>
      <div className="grid3">{campo("edad", "Edad", "años")}{campo("peso", "Peso", "kg")}{campo("altura", "Estatura", "cm")}</div>

      <div className="field">
        <label htmlFor="d-act" className="label">Nivel de actividad</label>
        <div className="box" style={{ height: 56 }}>
          <select id="d-act" value={actividad} onChange={(e) => setActividad(e.target.value as Actividad)}>
            {ACTIVIDADES.map(([id, l]) => <option key={id} value={id}>{l}</option>)}
          </select>
          <Chevron />
        </div>
        <span className="sub">{ACTIVIDADES.find((a) => a[0] === actividad)![2]}</span>
      </div>

      <div className="field"><span className="label">Objetivo</span>
        <Seg label="Objetivo" value={objetivo} options={OBJETIVOS} onChange={setObjetivo} />
      </div>

      <section className="result" aria-label="Resultado" aria-live="polite">
        <span className="dim" style={{ fontSize: 13, fontWeight: 600 }}>Tu requerimiento</span>
        <span><span className="big">{r ? fmt(r.kcal_objetivo) : "—"}</span> <span className="dim">kcal/día</span></span>
        <div className="grid3">
          <div><span className="dim">Basal</span><b>{r ? fmt(r.tmb) : "—"}</b></div>
          <div><span className="dim">Mantenimiento</span><b>{r ? fmt(r.tdee) : "—"}</b></div>
          <div><span className="dim">Ajuste</span><b>{AJUSTE_KCAL[objetivo] > 0 ? "+" : ""}{AJUSTE_KCAL[objetivo]}</b></div>
        </div>
        {r && (
          <div className="grid3">
            <div><span className="dim">Proteína · {r.pctProt}%</span><b>{fmt(r.prot)} g</b></div>
            <div><span className="dim">Carbs · {r.pctCarbs}%</span><b>{fmt(r.carbs)} g</b></div>
            <div><span className="dim">Grasas · {r.pctGrasas}%</span><b>{fmt(r.grasas)} g</b></div>
          </div>
        )}
      </section>
      {!ok && <p className="sub" style={{ margin: 0 }}>Completa edad, peso y estatura.</p>}
    </main>
  );
}
