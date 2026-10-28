import { useState } from "react";
import { MEALS, PRODUCTOS, RECETAS, type FoodRow, type MealId } from "../data/foods.ts";
import type { Entrada } from "../lib/store.ts";
import { Chevron, Close, Macros, Minus, Plus, Search, Sheet, cap, fmt, uid } from "../ui.tsx";

type Fuente = "General" | "Producto" | "Receta" | "Mío";
type Props = {
  foods: Record<string, FoodRow>; mios: Record<string, FoodRow>; recetas: Set<string>; meal: MealId; setMeal: (m: MealId) => void;
  consumidas: number; meta: number; onAdd: (e: Entrada) => Promise<void>;
  onGuardar: (name: string, row: FoodRow, anterior: string | null) => Promise<void>; onBorrar: (name: string) => Promise<void>; onEditarReceta: (name: string) => void; onCompartir: (name: string) => void;
};

export const sinAcentos = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
export const porcionTxt = (r: FoodRow) => (r[5] ? `${r[5].cantidad} ${r[5].unidad} · ${fmt(r[5].gramos)} g` : "100 g");
const mealLabel = (m: MealId) => MEALS.find((x) => x.id === m)!.label;

function MealSelect({ id, meal, setMeal }: { id: string; meal: MealId; setMeal: (m: MealId) => void }) {
  return (
    <div className="box" style={{ height: 44, paddingRight: 10 }}>
      <select id={id} value={meal} onChange={(e) => setMeal(e.target.value as MealId)}>
        {MEALS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
      </select>
      <Chevron />
    </div>
  );
}

export default function Alimentos({ foods, mios, recetas, meal, setMeal, consumidas, meta, onAdd, onGuardar, onBorrar, onEditarReceta, onCompartir }: Props) {
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState<Fuente | "Todos">("Todos");
  const [sel, setSel] = useState<string | null>(null);
  const [nuevo, setNuevo] = useState<Inicial | null>(null);
  const [opciones, setOpciones] = useState<string | null>(null);

  const fuente = (n: string): Fuente => (n in mios ? "Mío" : RECETAS.has(n) || recetas.has(n) ? "Receta" : PRODUCTOS.has(n) ? "Producto" : "General");
  const nq = sinAcentos(q.trim());
  // los míos y tus recetas primero; un nombre propio igual a uno de la base lo reemplaza (como en la app anterior)
  const nombres = [...new Set([...Object.keys(mios), ...recetas, ...Object.keys(foods)])]
    .filter((n) => (filtro === "Todos" || fuente(n) === filtro) && sinAcentos(n).includes(nq));

  return (
    <main className="screen">
      <header className="head">
        <div>
          <span className="kicker">Base de datos</span>
          <h1>Alimentos</h1>
        </div>
        <button className="pill solid" onClick={() => setNuevo({ nombre: "", row: null, anterior: null })}><Plus />Nuevo</button>
      </header>

      <div className="box" style={{ height: 48, color: "var(--muted)", gap: 10 }}>
        <Search />
        <label htmlFor="buscar" className="sr">Buscar alimento</label>
        <input id="buscar" type="search" placeholder="Buscar alimento, producto o receta" value={q} onChange={(e) => setQ(e.target.value)} style={{ fontSize: 15, fontWeight: 500 }} />
      </div>

      <div className="chips">
        {(["Todos", "General", "Producto", "Receta", "Mío"] as const).map((f) => (
          <button key={f} className="chip" aria-pressed={filtro === f} onClick={() => setFiltro(f)}>
            {{ Todos: "Todos", General: "Base general", Producto: "Productos", Receta: "Recetas", Mío: "Míos" }[f]}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "2px 2px 0" }}>
        <label htmlFor="meal-lista" className="kicker">Agregando a</label>
        <MealSelect id="meal-lista" meal={meal} setMeal={setMeal} />
      </div>

      <div className="list">
        {nombres.length === 0 && <div className="row"><span className="sub">Sin resultados.</span></div>}
        {nombres.map((n) => {
          const r = mios[n] ?? foods[n];
          const k = (r[5]?.gramos ?? 100) / 100;
          return (
            // mantener presionado (o clic derecho / tecla de menú) abre Editar y Borrar
            <div key={n} className="row press" tabIndex={0} onContextMenu={(e) => { e.preventDefault(); setOpciones(n); }}>
              <div className="grow" style={{ gap: 4 }}>
                <span className="name ellipsis">{cap(n)}</span>
                <span className="sub" style={{ display: "flex", alignItems: "center", gap: 8 }}><span className="badge">{fuente(n)}</span>{porcionTxt(r)}</span>
                <Macros p={r[1] * k} c={r[2] * k} g={r[3] * k} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.02em" }}>{fmt(r[0] * k)}</span>
                <span className="sub" style={{ fontSize: 11 }}>kcal</span>
              </div>
              <button className="icon-btn" aria-label={`Agregar ${n}`} onClick={() => setSel(n)}><Plus /></button>
            </div>
          );
        })}
        {nq && !nombres.some((n) => sinAcentos(n) === nq) && (
          <button className="row" style={{ gap: 8, fontWeight: 600, fontSize: 14 }} onClick={() => setNuevo({ nombre: q.trim(), row: null, anterior: null })}><Plus />Registrar “{q.trim()}”</button>
        )}
      </div>

      {sel && (
        <AgregarSheet name={sel} row={mios[sel] ?? foods[sel]} fuente={fuente(sel)} meal={meal} setMeal={setMeal} consumidas={consumidas} meta={meta}
          onClose={() => setSel(null)} onAdd={async (e) => { await onAdd(e); setSel(null); }} />
      )}
      {nuevo && <AlimentoSheet inicial={nuevo} existe={(n) => n in foods || n in mios} onClose={() => setNuevo(null)} onSave={async (n, r) => { await onGuardar(n, r, nuevo.anterior); setNuevo(null); setQ(""); setFiltro("Mío"); }} />}
      {opciones && (
        <Sheet title={cap(opciones)} onClose={() => setOpciones(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <h2>{cap(opciones)}</h2>
            <span className="sub">{fuente(opciones)}</span>
          </div>
          <button className="secondary" onClick={() => {
            if (recetas.has(opciones)) onEditarReceta(opciones);
            else setNuevo({ nombre: opciones, row: mios[opciones] ?? foods[opciones], anterior: opciones });
            setOpciones(null);
          }}>Editar</button>
          <button className="secondary" onClick={() => { onCompartir(opciones); setOpciones(null); }}>Compartir</button>
          <button className="secondary" style={{ color: "var(--warn)" }} onClick={async () => {
            const aviso = opciones in mios && opciones in foods ? "Se borra tu versión y vuelve la original de la base."
              : opciones in mios || recetas.has(opciones) ? "No se puede deshacer." : "Lo puedes restaurar en Configuración.";
            if (!confirm(`¿Borrar "${opciones}"? ${aviso}`)) return;
            await onBorrar(opciones);
            setOpciones(null);
          }}>Borrar</button>
        </Sheet>
      )}
    </main>
  );
}

function AgregarSheet({ name, row, fuente, meal, setMeal, consumidas, meta, onClose, onAdd }: {
  name: string; row: FoodRow; fuente: Fuente; meal: MealId; setMeal: (m: MealId) => void; consumidas: number; meta: number;
  onClose: () => void; onAdd: (e: Entrada) => Promise<void>;
}) {
  const [gramos, setGramos] = useState(String(row[5]?.gramos ?? 100));
  const g = Number(gramos.replace(",", "."));
  const ok = Number.isFinite(g) && g > 0;
  const k = ok ? g / 100 : 0;
  const e = { kcal: row[0] * k, p: row[1] * k, c: row[2] * k, g: row[3] * k };
  const paso = (d: number) => setGramos(String(Math.max(0, (ok ? g : 0) + d)));
  const atajos: [string, number][] = [["100 g", 100], ...(row[5] ? [[porcionTxt(row), row[5].gramos] as [string, number]] : [])];

  return (
    <Sheet title={cap(name)} onClose={onClose}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <h2>{cap(name)}</h2>
          <span className="sub" style={{ display: "flex", alignItems: "center", gap: 8 }}><span className="badge">{fuente}</span>{fmt(row[0])} kcal por 100 g</span>
        </div>
        <button className="icon-btn soft" aria-label="Cerrar" onClick={onClose}><Close /></button>
      </div>

      <div className="field">
        <label htmlFor="cantidad" className="label">Cantidad</label>
        <div className="box" style={{ padding: "0 4px", justifyContent: "space-between" }}>
          <button className="icon-btn" style={{ border: 0 }} aria-label="Menos 10 g" onClick={() => paso(-10)}><Minus /></button>
          <input id="cantidad" inputMode="decimal" value={gramos} onChange={(ev) => setGramos(ev.target.value)} style={{ textAlign: "center", fontSize: 20 }} />
          <span className="unit">g</span>
          <button className="icon-btn" style={{ border: 0 }} aria-label="Más 10 g" onClick={() => paso(10)}><Plus /></button>
        </div>
      </div>

      <div className="chips">
        {atajos.map(([l, v]) => <button key={l} className="chip" aria-pressed={g === v} onClick={() => setGramos(String(v))}>{l}</button>)}
      </div>

      <div className="field">
        <label htmlFor="meal-sheet" className="label">Agregar a</label>
        <MealSelect id="meal-sheet" meal={meal} setMeal={setMeal} />
      </div>

      <div className="grid4">
        <div className="tile"><b>{fmt(e.kcal)}</b><span>kcal</span></div>
        <div className="tile"><b>{fmt(e.p)}</b><span><i className="dot bg-p" />Prot g</span></div>
        <div className="tile"><b>{fmt(e.c)}</b><span><i className="dot bg-c" />Carb g</span></div>
        <div className="tile"><b>{fmt(e.g)}</b><span><i className="dot bg-g" />Gras g</span></div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div className="kv"><span className="muted">Tu día después</span><b>{fmt(consumidas + e.kcal)} / {fmt(meta)} kcal</b></div>
        <div className="track" style={{ height: 8, display: "flex" }}>
          <span style={{ width: `${Math.min(100, (consumidas / meta) * 100)}%`, background: "var(--accent)" }} />
          <span style={{ width: `${Math.min(100, (e.kcal / meta) * 100)}%`, background: "var(--accent)", opacity: 0.35 }} />
        </div>
      </div>

      <button className="primary" disabled={!ok} onClick={() => onAdd({ id: uid(), meal, name, grams: g, ...e })}>Agregar a {mealLabel(meal)}</button>
    </Sheet>
  );
}

export type Inicial = { nombre: string; row: FoodRow | null; anterior: string | null };
const num0 = (n?: number) => (n === undefined ? "" : String(+n.toFixed(2)));

export function AlimentoSheet({ inicial, existe, onClose, onSave }: { inicial: Inicial; existe: (n: string) => boolean; onClose: () => void; onSave: (n: string, r: FoodRow) => Promise<void> }) {
  const r0 = inicial.row;
  const [v, setV] = useState({ nombre: inicial.nombre, kcal: num0(r0?.[0]), p: num0(r0?.[1]), c: num0(r0?.[2]), g: num0(r0?.[3]), porcion: num0(r0?.[5]?.gramos) });
  const [err, setErr] = useState("");
  const num = (s: string) => (s.trim() === "" ? 0 : Number(s.replace(",", ".")));
  const titulo = inicial.anterior ? "Editar alimento" : "Nuevo alimento";

  function guardar() {
    const nombre = v.nombre.trim().toLowerCase();
    const [kcal, p, c, g, porcion] = [v.kcal, v.p, v.c, v.g, v.porcion].map(num);
    if (!nombre || !v.kcal.trim()) return setErr("Pon nombre y kcal.");
    if (![kcal, p, c, g, porcion].every((n) => Number.isFinite(n) && n >= 0)) return setErr("Solo números de 0 en adelante.");
    if (nombre !== inicial.anterior && existe(nombre) && !confirm(`"${nombre}" ya existe. ¿Reemplazarlo con tus valores?`)) return;
    // si no cambió el peso de la porción, conserva su nombre original (pieza, rebanada…)
    const p0 = r0?.[5];
    const porc = !porcion ? null : p0 && p0.gramos === porcion ? p0 : { cantidad: 1, unidad: "porción", gramos: porcion };
    onSave(nombre, [kcal, p, c, g, r0?.[4] ?? 0, porc]);
  }

  const campo = (k: keyof typeof v, label: string, unit: string) => (
    <div className="field">
      <label htmlFor={`n-${k}`} className="label">{label}</label>
      <div className="box"><input id={`n-${k}`} inputMode="decimal" value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })} /><span className="unit">{unit}</span></div>
    </div>
  );

  return (
    <Sheet title={titulo} onClose={onClose}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h2>{titulo}</h2>
        <button className="icon-btn soft" aria-label="Cerrar" onClick={onClose}><Close /></button>
      </div>
      <div className="field">
        <label htmlFor="n-nombre" className="label">Nombre</label>
        <div className="box"><input id="n-nombre" value={v.nombre} onChange={(e) => setV({ ...v, nombre: e.target.value })} style={{ fontSize: 16, fontWeight: 600 }} /></div>
      </div>
      <span className="label">Valores por 100 g</span>
      <div className="grid2">{campo("kcal", "Calorías", "kcal")}{campo("p", "Proteína", "g")}{campo("c", "Carbohidratos", "g")}{campo("g", "Grasas", "g")}</div>
      {campo("porcion", "1 porción pesa (opcional)", "g")}
      {err && <p className="error" role="alert">{err}</p>}
      <button className="primary" onClick={guardar}>Guardar</button>
    </Sheet>
  );
}
