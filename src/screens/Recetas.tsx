import { useState } from "react";
import type { FoodRow } from "../data/foods.ts";
import { CATEGORIAS, sumar, type Receta } from "../lib/receta.ts";
import { Close, Minus, Plus, Seg, cap, fmt } from "../ui.tsx";
import Elegir from "./Elegir.tsx";

const Libro = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z" /><path d="M5 17a3 3 0 0 1 3-3h11" /></svg>
);

// Achica la foto a 480 px de lado para que quepa en el almacenamiento de la app.
async function reducir(file: File) {
  const img = await createImageBitmap(file);
  const k = Math.min(1, 480 / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * k);
  c.height = Math.round(img.height * k);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.7);
}

function BarraMacros({ p, c, g }: { p: number; c: number; g: number }) {
  const t = p * 4 + c * 4 + g * 9 || 1;
  return (
    <div role="img" aria-label={`Proteína ${fmt(p)} g, carbohidratos ${fmt(c)} g, grasas ${fmt(g)} g`} style={{ display: "flex", height: 6, borderRadius: 99, overflow: "hidden", gap: 2 }}>
      <span className="bg-p" style={{ flex: `0 0 calc(${(p * 4 * 100) / t}% - 2px)` }} />
      <span className="bg-c" style={{ flex: `0 0 calc(${(c * 4 * 100) / t}% - 2px)` }} />
      <span className="bg-g" style={{ flex: `0 0 calc(${(g * 9 * 100) / t}% - 2px)` }} />
    </div>
  );
}

export default function Recetas({ recetas, onEditar }: { recetas: Record<string, Receta>; onEditar: (nombre: string | null) => void }) {
  const [filtro, setFiltro] = useState<string>("Todas");
  const lista = Object.values(recetas).filter((r) => filtro === "Todas" || r.categoria === filtro);
  const n = Object.keys(recetas).length;

  return (
    <main className="screen">
      <header className="head">
        <div>
          <span className="kicker">{n} {n === 1 ? "guardada" : "guardadas"}</span>
          <h1>Recetas</h1>
        </div>
        <button className="pill solid" onClick={() => onEditar(null)}><Plus />Nueva</button>
      </header>

      <div className="chips">
        {["Todas", ...CATEGORIAS].map((c) => <button key={c} className="chip" aria-pressed={filtro === c} onClick={() => setFiltro(c)}>{c}</button>)}
      </div>

      {lista.length === 0 && <p className="sub" style={{ margin: 0 }}>{n ? "No hay recetas en esta categoría." : "Aún no tienes recetas. Crea la primera con “Nueva”."}</p>}

      <div className="grid2" style={{ gap: 12 }}>
        {lista.map((r) => {
          const t = sumar(r.ingredientes);
          const pp = { kcal: t.kcal / r.porciones, p: t.p / r.porciones, c: t.c / r.porciones, g: t.g / r.porciones };
          return (
            <button key={r.nombre} className="card" style={{ borderRadius: 20, padding: 8, gap: 10, textAlign: "left" }} onClick={() => onEditar(r.nombre)}>
              <div style={{ height: 84, width: "100%", borderRadius: 14, background: "var(--surface2)", position: "relative", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>
                {r.foto ? <img className="foto" src={r.foto} alt="" /> : <Libro />}
                {r.tiempo > 0 && <span className="badge" style={{ position: "absolute", left: 8, bottom: 8, height: 22, borderRadius: 999, background: "var(--surface)", padding: "0 8px" }}>{r.tiempo} min</span>}
              </div>
              <div style={{ padding: "0 6px 6px", display: "flex", flexDirection: "column", gap: 6, width: "100%", boxSizing: "border-box" }}>
                <span style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.25, height: 35, overflow: "hidden" }}>{cap(r.nombre)}</span>
                <span className="sub">{fmt(pp.kcal)} kcal · {r.porciones} porc.</span>
                <BarraMacros {...pp} />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 600 }}>
                  <span>P {fmt(pp.p)}</span><span>C {fmt(pp.c)}</span><span>G {fmt(pp.g)}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </main>
  );
}

export function EditarReceta({ receta, foods, existe, onSave, onDelete, onCancel, onNuevoAlimento }: {
  receta: Receta | null; foods: Record<string, FoodRow>; existe: (n: string) => boolean; onNuevoAlimento: (n: string, r: FoodRow) => Promise<void>;
  onSave: (r: Receta, nombreAnterior: string | null) => Promise<void>; onDelete: () => Promise<void>; onCancel: () => void;
}) {
  const [r, setR] = useState<Receta>(receta ?? { nombre: "", porciones: 1, tiempo: 0, categoria: "Comida", ingredientes: [] });
  const [tiempo, setTiempo] = useState(receta?.tiempo ? String(receta.tiempo) : "");
  const [eligiendo, setEligiendo] = useState(false);
  const [err, setErr] = useState("");
  const t = sumar(r.ingredientes);

  function guardar() {
    const nombre = r.nombre.trim().toLowerCase();
    const min = tiempo.trim() ? Number(tiempo) : 0;
    if (!nombre) return setErr("Ponle nombre.");
    if (!r.ingredientes.length) return setErr("Agrega al menos un ingrediente.");
    if (!Number.isFinite(min) || min < 0) return setErr("El tiempo debe ser un número de minutos.");
    // el nombre es la llave: no pisar un alimento u otra receta sin preguntar
    if (nombre !== receta?.nombre && existe(nombre) && !confirm(`"${nombre}" ya existe. ¿Reemplazarlo?`)) return;
    onSave({ ...r, nombre, tiempo: min }, receta?.nombre ?? null);
  }

  return (
    <main className="screen" style={{ paddingBottom: 150, gap: 18 }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: 44 }}>
        <button className="pill" style={{ border: 0, background: "none" }} onClick={onCancel}>Cancelar</button>
        <h2>{receta ? "Editar receta" : "Nueva receta"}</h2>
        <button className="pill solid" onClick={guardar}>Guardar</button>
      </header>

      <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
        <label className="press" style={{ width: 72, height: 72, flexShrink: 0, borderRadius: 18, background: "var(--surface2)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, fontSize: 11, fontWeight: 600, color: "var(--muted)", cursor: "pointer", overflow: "hidden" }}>
          {r.foto ? <img className="foto" src={r.foto} alt="Foto de la receta" /> : <><Libro />Foto</>}
          <input type="file" accept="image/*" className="sr" aria-label={r.foto ? "Cambiar foto" : "Agregar foto"}
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              try { setR({ ...r, foto: await reducir(f) }); } catch { setErr("No se pudo leer esa imagen."); }
            }} />
        </label>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="r-nombre" className="label">Nombre</label>
          <div className="box"><input id="r-nombre" value={r.nombre} onChange={(e) => setR({ ...r, nombre: e.target.value })} style={{ fontSize: 16, fontWeight: 600 }} /></div>
        </div>
      </div>
      {r.foto && <button className="pill" style={{ alignSelf: "flex-start", marginTop: -8 }} onClick={() => setR({ ...r, foto: undefined })}>Quitar foto</button>}

      <div className="grid2">
        <div className="field">
          <span className="label">Porciones</span>
          <div className="box" style={{ padding: "0 4px", justifyContent: "space-between" }}>
            <button className="icon-btn" style={{ border: 0 }} aria-label="Menos porciones" onClick={() => setR({ ...r, porciones: Math.max(1, r.porciones - 1) })}><Minus /></button>
            <b style={{ fontSize: 18 }} aria-live="polite">{r.porciones}</b>
            <button className="icon-btn" style={{ border: 0 }} aria-label="Más porciones" onClick={() => setR({ ...r, porciones: r.porciones + 1 })}><Plus /></button>
          </div>
        </div>
        <div className="field">
          <label htmlFor="r-tiempo" className="label">Tiempo</label>
          <div className="box"><input id="r-tiempo" inputMode="numeric" value={tiempo} onChange={(e) => setTiempo(e.target.value)} /><span className="unit">min</span></div>
        </div>
      </div>

      <div className="field">
        <span className="label">Categoría</span>
        <Seg label="Categoría" value={r.categoria} options={CATEGORIAS.map((c) => [c, c] as [Receta["categoria"], string])} onChange={(c) => setR({ ...r, categoria: c })} />
      </div>

      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <h2>Ingredientes</h2>
        <span className="sub">Total {fmt(t.kcal)} kcal</span>
      </div>
      <div className="list">
        {r.ingredientes.map((i, idx) => (
          <div key={idx} className="row">
            <div className="grow"><span className="name ellipsis">{cap(i.name)}</span><span className="sub">{fmt(i.grams)} g</span></div>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{fmt(i.kcal)}</span>
            <button className="icon-btn" aria-label={`Quitar ${i.name}`} onClick={() => setR({ ...r, ingredientes: r.ingredientes.filter((_, j) => j !== idx) })}><Close /></button>
          </div>
        ))}
        <button className="row" style={{ justifyContent: "center", gap: 8, fontWeight: 600, fontSize: 14 }} onClick={() => setEligiendo(true)}><Plus />Agregar ingrediente</button>
      </div>

      {err && <p className="error" role="alert">{err}</p>}
      {receta && <button className="secondary" style={{ color: "var(--warn)" }} onClick={() => confirm(`¿Borrar la receta "${receta.nombre}"?`) && onDelete()}>Borrar receta</button>}

      <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, background: "var(--bar)", backdropFilter: "blur(16px)", borderTop: "1px solid var(--line)", padding: "14px 20px calc(18px + env(safe-area-inset-bottom))" }}>
        <div style={{ maxWidth: 440, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span className="sub">Por porción</span>
            <b style={{ fontSize: 20 }}>{fmt(t.kcal / r.porciones)} kcal</b>
          </div>
          <div className="macros" style={{ fontSize: 12 }}>
            <span><i className="dot bg-p" />P {fmt(t.p / r.porciones)}</span>
            <span><i className="dot bg-c" />C {fmt(t.c / r.porciones)}</span>
            <span><i className="dot bg-g" />G {fmt(t.g / r.porciones)}</span>
          </div>
        </div>
      </div>

      {eligiendo && (
        <Elegir title="Agregar ingrediente" boton="Agregar" foods={foods} onNuevo={onNuevoAlimento} onClose={() => setEligiendo(false)}
          onPick={(it) => { setR({ ...r, ingredientes: [...r.ingredientes, it] }); setEligiendo(false); }} />
      )}
    </main>
  );
}
