import { useEffect, useRef, useState } from "react";
import { DB, MEALS, type FoodRow, type MealId } from "./data/foods.ts";
import { plan, type Perfil } from "./lib/calc.ts";
import { hoy, sumarDias } from "./lib/dias.ts";
import { aplicarItems, cascadaRecetas, type Cambios } from "./lib/cascada.ts";
import { compartir, nombreArchivo } from "./lib/compartir.ts";
import { exportar, leer } from "./lib/migrar.ts";
import { comoAlimento, sumar, type Item, type Receta } from "./lib/receta.ts";
import { diasRegistrados, load, remove, save, type Entrada } from "./lib/store.ts";
import Alimentos from "./screens/Alimentos.tsx";
import Hoy from "./screens/Hoy.tsx";
import Menu, { type MenuSemanal } from "./screens/Menu.tsx";
import Configuracion, { type Color, type Tema } from "./screens/Configuracion.tsx";
import Objetivos, { TusDatos } from "./screens/Objetivos.tsx";
import Recetas, { EditarReceta } from "./screens/Recetas.tsx";
import { uid } from "./ui.tsx";

type Tab = "hoy" | "alimentos" | "recetas" | "menu" | "objetivos";
const ico = { fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;
const TABS: [Tab, string, JSX.Element][] = [
  ["hoy", "Hoy", <svg width="22" height="22" viewBox="0 0 24 24" {...ico}><circle cx="12" cy="12" r="8.5" /><path d="M12 3.5a8.5 8.5 0 0 1 8.5 8.5H12z" fill="currentColor" /></svg>],
  ["alimentos", "Alimentos", <svg width="22" height="22" viewBox="0 0 24 24" {...ico}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>],
  ["recetas", "Recetas", <svg width="22" height="22" viewBox="0 0 24 24" {...ico}><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z" /><path d="M5 17a3 3 0 0 1 3-3h11" /></svg>],
  ["menu", "Menú", <svg width="22" height="22" viewBox="0 0 24 24" {...ico}><rect x="3.5" y="5" width="17" height="15.5" rx="3" /><path d="M3.5 10h17M8.5 3v4M15.5 3v4" /></svg>],
  ["objetivos", "Objetivos", <svg width="22" height="22" viewBox="0 0 24 24" {...ico}><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="0.8" fill="currentColor" /></svg>],
];

export default function App() {
  const [ready, setReady] = useState(false);
  const [dia, setDia] = useState(hoy());
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [mios, setMios] = useState<Record<string, FoodRow>>({});
  const [recetas, setRecetas] = useState<Record<string, Receta>>({});
  const [menu, setMenu] = useState<MenuSemanal>({});
  const [log, setLog] = useState<Entrada[]>([]);
  const [dias, setDias] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<Tab>("hoy");
  const [meal, setMeal] = useState<MealId>("desayuno");
  const [editando, setEditando] = useState(false);
  const [simulando, setSimulando] = useState(false);
  const [config, setConfig] = useState(false);
  const [tema, setTema] = useState<Tema>("sistema");
  const [color, setColor] = useState<Color>("neutro");
  const diaRef = useRef(dia);
  const toque = useRef<{ x: number; y: number } | null>(null);
  // nombres de la base que borraste; se pueden restaurar en Configuración
  const [ocultos, setOcultos] = useState<string[]>([]);
  // undefined = no se edita; null = receta nueva
  const [receta, setReceta] = useState<string | null | undefined>(undefined);

  async function cargar() {
    const d = hoy();
    const [p, m, r, mn, l, ds, t, oc, co] = await Promise.all([
      load<Perfil | null>("perfil", null), load<Record<string, FoodRow>>("mios", {}), load<Record<string, Receta>>("recetas", {}),
      load<MenuSemanal>("menu", {}), load<Entrada[]>(`log:${d}`, []), diasRegistrados(), load<Tema>("tema", "sistema"), load<string[]>("ocultos", []),
      load<Color>("color", "neutro"),
    ]);
    setPerfil(p); setMios(m); setRecetas(r); setMenu(mn); setLog(l); setDias(ds); setTema(t); setOcultos(oc); setColor(co); setDia(d); setReady(true);
    diaRef.current = d;
  }

  useEffect(() => {
    cargar();
    // al volver a la app, si ya cambió el día, carga el registro del día nuevo
    // (no siempre: volver del selector de archivos o de compartir pisaría lo que se está guardando)
    const onVis = () => document.visibilityState === "visible" && hoy() !== diaRef.current && cargar();
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    if (tema === "sistema") delete html.dataset.theme;
    else html.dataset.theme = tema === "claro" ? "light" : "dark";
    html.dataset.color = color;
  }, [tema, color]);

  function irA(t: Tab, desde = "0px") {
    document.documentElement.style.setProperty("--desde", desde);
    setTab(t);
    window.scrollTo(0, 0);
  }

  // deslizar a los lados cambia de pestaña; no dentro de menús, campos ni filas que se desplazan solas
  function finToque(e: React.TouchEvent) {
    const s = toque.current;
    toque.current = null;
    if (!s) return;
    const dx = e.changedTouches[0].clientX - s.x;
    const dy = e.changedTouches[0].clientY - s.y;
    if (Math.abs(dx) < 70 || Math.abs(dx) < 2 * Math.abs(dy)) return;
    const i = TABS.findIndex(([t]) => t === tab) + (dx < 0 ? 1 : -1);
    if (TABS[i]) irA(TABS[i][0], dx < 0 ? "24px" : "-24px");
  }

  async function compartirPaquete(nombres: string[] | null) {
    const sel = <T,>(o: Record<string, T>) => (nombres ? Object.fromEntries(Object.entries(o).filter(([n]) => nombres.includes(n))) : o);
    // un alimento de la base sin editar no está en "mios": se comparte con sus valores de la base
    const alimentos = nombres ? Object.fromEntries(nombres.filter((n) => !(n in recetas) && (mios[n] ?? DB[n])).map((n) => [n, mios[n] ?? DB[n]])) : mios;
    await compartir(nombreArchivo(nombres?.length === 1 ? nombres[0] : "alimentos-y-recetas"), exportar({ alimentos, recetas: sel(recetas) }));
  }

  async function importar(texto: string) {
    const p = leer(texto);
    const na = Object.keys(p.alimentos).length;
    const nr = Object.keys(p.recetas).length;
    const repetidos = [...Object.keys(p.alimentos), ...Object.keys(p.recetas)].filter((n) => n in mios || n in recetas).length;
    if (!confirm(`Importar ${na} alimentos y ${nr} recetas?${repetidos ? ` ${repetidos} ya existen y se reemplazan.` : ""}`)) return null;
    const m = { ...mios, ...p.alimentos };
    await save("mios", m);
    setMios(m);
    // lo que reemplaza algo que ya usabas se recalcula en cascada
    const existe = (n: string) => n in mios || n in DB || n in recetas;
    const cambios: Cambios = new Map([
      ...Object.entries(p.alimentos).filter(([n]) => existe(n)).map(([n, row]) => [n, { name: n, row }] as const),
      ...Object.values(p.recetas).filter((r) => existe(r.nombre)).map((r) => [r.nombre, { name: r.nombre, row: comoAlimento(r) }] as const),
    ]);
    const rs = { ...recetas, ...p.recetas };
    if (cambios.size) await cascada(rs, cambios);
    else { await save("recetas", rs); setRecetas(rs); }
    return `Listo: ${na} alimentos y ${nr} recetas.${p.invalidos ? ` ${p.invalidos} venían con datos inválidos y no se importaron.` : ""}`;
  }

  async function guardarOcultos(next: string[]) {
    await save("ocultos", next);
    setOcultos(next);
  }

  // Cambió un alimento o receta: recalcula las recetas, los registros de todos los días y el menú que lo usan.
  async function cascada(rs: Record<string, Receta>, cambios: Cambios) {
    const { recetas: nr, cambios: todos } = cascadaRecetas(rs, cambios);
    if (rs !== recetas || Object.keys(nr).some((k) => nr[k] !== rs[k])) {
      await save("recetas", nr);
      setRecetas(nr);
    }
    for (const d of new Set([...dias, dia])) {
      const l = d === dia ? log : await load<Entrada[]>(`log:${d}`, []);
      const n = aplicarItems(l, todos);
      if (!n) continue;
      await save(`log:${d}`, n);
      if (d === dia) setLog(n);
    }
    let cambioMenu = false;
    const nm: MenuSemanal = {};
    for (const [d, comidas] of Object.entries(menu)) {
      const ms = Object.entries(comidas) as [MealId, Item][];
      const n = aplicarItems(ms.map(([, it]) => it), todos);
      if (n) cambioMenu = true;
      nm[d] = n ? Object.fromEntries(ms.map(([m], i) => [m, n[i]])) : comidas;
    }
    if (cambioMenu) await guardarMenu(nm);
  }

  async function guardarAlimento(n: string, row: FoodRow, anterior: string | null) {
    // un nombre que nunca existió no lo usa nada: no hay qué recalcular
    const usado = anterior !== null || n in mios || n in DB || n in recetas;
    const m = { ...mios };
    if (anterior && anterior !== n) {
      delete m[anterior];
      // renombrar uno de la base: el nombre viejo se oculta para que no quede repetido
      if (anterior in DB && !ocultos.includes(anterior)) await guardarOcultos([...ocultos, anterior]);
    }
    m[n] = row;
    await save("mios", m);
    setMios(m);
    if (usado) await cascada(recetas, new Map([[anterior ?? n, { name: n, row }]]));
  }

  async function borrarAlimento(n: string) {
    if (n in recetas) {
      const r = { ...recetas };
      delete r[n];
      return guardarRecetas(r);
    }
    if (n in mios) {
      const m = { ...mios };
      delete m[n];
      await save("mios", m);
      setMios(m);
      // era tu versión de uno de la base: lo que lo usa vuelve a los valores originales
      if (n in DB && !ocultos.includes(n)) await cascada(recetas, new Map([[n, { name: n, row: DB[n] }]]));
      return;
    }
    await guardarOcultos([...ocultos, n]);
  }

  async function guardarLog(next: Entrada[]) {
    if (next.length) await save(`log:${dia}`, next);
    else await remove(`log:${dia}`);
    setLog(next);
    const ds = new Set(dias);
    next.length ? ds.add(dia) : ds.delete(dia);
    setDias(ds);
  }

  async function guardarPerfil(p: Perfil) {
    await save("perfil", p);
    setPerfil(p);
    setEditando(false);
  }

  async function guardarRecetas(next: Record<string, Receta>) {
    await save("recetas", next);
    setRecetas(next);
    setReceta(undefined);
  }

  async function guardarMenu(next: MenuSemanal) {
    await save("menu", next);
    setMenu(next);
  }

  if (!ready) return null;
  if (!perfil || editando) return <TusDatos perfil={perfil} onSave={guardarPerfil} onCancel={perfil ? () => setEditando(false) : undefined} />;
  if (simulando) return <TusDatos perfil={perfil} simular onCancel={() => setSimulando(false)} />;
  if (config) {
    return (
      <Configuracion tema={tema} color={color} ocultos={ocultos.length} onCerrar={() => setConfig(false)}
        onTema={async (t) => { await save("tema", t); setTema(t); }}
        onColor={async (c) => { await save("color", c); setColor(c); }}
        onExportar={() => compartirPaquete(null)} onImportar={importar}
        onRestaurar={() => guardarOcultos([])} />
    );
  }

  const meta = plan(perfil);
  const foods: Record<string, FoodRow> = { ...DB };
  for (const n of ocultos) delete foods[n];
  for (const r of Object.values(recetas)) foods[r.nombre] = comoAlimento(r);
  const todo = { ...foods, ...mios };

  if (receta !== undefined) {
    const actual = receta === null ? null : recetas[receta];
    return (
      <EditarReceta receta={actual} foods={todo} existe={(n) => n in todo} onNuevoAlimento={(n, r) => guardarAlimento(n, r, null)} onCancel={() => setReceta(undefined)}
        onSave={async (r, anterior) => {
          const next = { ...recetas };
          if (anterior) delete next[anterior];
          next[r.nombre] = r;
          if (anterior || r.nombre in todo) await cascada(next, new Map([[anterior ?? r.nombre, { name: r.nombre, row: comoAlimento(r) }]]));
          else await guardarRecetas(next);
          setReceta(undefined);
        }}
        onDelete={() => {
          const next = { ...recetas };
          delete next[receta!];
          return guardarRecetas(next);
        }} />
    );
  }

  return (
    <>
      <div key={tab} className="entrar" style={{ minHeight: "100vh" }}
        onTouchStart={(e) => {
          const t = e.target as HTMLElement;
          toque.current = t.closest(".sheet, .scrim, .chips, input, select, textarea") ? null : { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }}
        onTouchEnd={finToque}>
      {tab === "hoy" && (
        <Hoy dia={dia} log={log} dias={dias} meta={meta}
          onAdd={(m) => { setMeal(m); irA("alimentos"); }}
          onRemove={(id) => guardarLog(log.filter((e) => e.id !== id))} />
      )}
      {tab === "alimentos" && (
        <Alimentos foods={foods} mios={mios} recetas={new Set(Object.keys(recetas))} meal={meal} setMeal={setMeal} consumidas={sumar(log).kcal} meta={meta.kcal_objetivo}
          onAdd={(e) => guardarLog([...log, e])}
          onGuardar={guardarAlimento} onBorrar={borrarAlimento} onEditarReceta={setReceta} onCompartir={(n) => compartirPaquete([n]).catch(() => {})} />
      )}
      {tab === "recetas" && <Recetas recetas={recetas} onEditar={setReceta} />}
      {tab === "menu" && (
        <Menu dia={dia} menu={menu} meta={meta} foods={todo} onNuevoAlimento={(n, r) => guardarAlimento(n, r, null)}
          onSet={(d, m, it) => {
            const delDia = { ...menu[d] };
            if (it) delDia[m] = it;
            else delete delDia[m];
            const next = { ...menu, [d]: delDia };
            if (!Object.keys(delDia).length) delete next[d];
            guardarMenu(next);
          }}
          onDuplicar={async (lunes) => {
            const destino = [0, 1, 2, 3, 4, 5, 6].map((i) => sumarDias(lunes, i + 7));
            if (destino.some((d) => menu[d]) && !confirm("La semana siguiente ya tiene menú. ¿Reemplazarlo?")) return false;
            const next = { ...menu };
            destino.forEach((d, i) => {
              const origen = menu[sumarDias(lunes, i)];
              if (origen) next[d] = origen;
              else delete next[d];
            });
            await guardarMenu(next);
            return true;
          }}
          onAplicar={async (d) => {
            if (log.length && !confirm("Hoy ya tienes comidas registradas. ¿Agregar el menú además?")) return;
            const nuevas = MEALS.flatMap((m) => {
              const it = menu[d]?.[m.id];
              return it ? [{ ...it, id: uid(), meal: m.id }] : [];
            });
            await guardarLog([...log, ...nuevas]);
            irA("hoy");
          }} />
      )}
      {tab === "objetivos" && <Objetivos perfil={perfil} onObjetivo={(o) => guardarPerfil({ ...perfil, objetivo: o })} onEditar={() => setEditando(true)} onSimular={() => setSimulando(true)} onConfig={() => setConfig(true)} />}
      </div>

      <nav className="tabs" aria-label="Navegación principal">
        {TABS.map(([id, label, icon]) => (
          <button key={id} aria-current={tab === id ? "page" : undefined} onClick={() => irA(id)}>{icon}{label}</button>
        ))}
      </nav>
    </>
  );
}
