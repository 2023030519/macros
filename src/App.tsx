import { useEffect, useState } from "react";
import { DB, MEALS, type FoodRow, type MealId } from "./data/foods.ts";
import { plan, type Perfil } from "./lib/calc.ts";
import { hoy, sumarDias } from "./lib/dias.ts";
import { comoAlimento, sumar, type Receta } from "./lib/receta.ts";
import { diasRegistrados, load, remove, save, type Entrada } from "./lib/store.ts";
import Alimentos from "./screens/Alimentos.tsx";
import Hoy from "./screens/Hoy.tsx";
import Menu, { type MenuSemanal } from "./screens/Menu.tsx";
import Configuracion, { type Tema } from "./screens/Configuracion.tsx";
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
  // nombres de la base que borraste; se pueden restaurar en Configuración
  const [ocultos, setOcultos] = useState<string[]>([]);
  // undefined = no se edita; null = receta nueva
  const [receta, setReceta] = useState<string | null | undefined>(undefined);

  async function cargar() {
    const d = hoy();
    const [p, m, r, mn, l, ds, t, oc] = await Promise.all([
      load<Perfil | null>("perfil", null), load<Record<string, FoodRow>>("mios", {}), load<Record<string, Receta>>("recetas", {}),
      load<MenuSemanal>("menu", {}), load<Entrada[]>(`log:${d}`, []), diasRegistrados(), load<Tema>("tema", "sistema"), load<string[]>("ocultos", []),
    ]);
    setPerfil(p); setMios(m); setRecetas(r); setMenu(mn); setLog(l); setDias(ds); setTema(t); setOcultos(oc); setDia(d); setReady(true);
  }

  useEffect(() => {
    cargar();
    // al volver a la app recarga, por si ya cambió el día
    const onVis = () => document.visibilityState === "visible" && cargar();
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    if (tema === "sistema") delete html.dataset.theme;
    else html.dataset.theme = tema === "claro" ? "light" : "dark";
  }, [tema]);

  async function guardarOcultos(next: string[]) {
    await save("ocultos", next);
    setOcultos(next);
  }

  async function guardarAlimento(n: string, row: FoodRow, anterior: string | null) {
    const m = { ...mios };
    if (anterior && anterior !== n) {
      delete m[anterior];
      // renombrar uno de la base: el nombre viejo se oculta para que no quede repetido
      if (anterior in DB && !ocultos.includes(anterior)) await guardarOcultos([...ocultos, anterior]);
    }
    m[n] = row;
    await save("mios", m);
    setMios(m);
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
      return setMios(m);
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
      <Configuracion tema={tema} ocultos={ocultos.length} onCerrar={() => setConfig(false)}
        onTema={async (t) => { await save("tema", t); setTema(t); }}
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
        onSave={(r, anterior) => {
          const next = { ...recetas };
          if (anterior) delete next[anterior];
          return guardarRecetas({ ...next, [r.nombre]: r });
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
      {tab === "hoy" && (
        <Hoy dia={dia} log={log} dias={dias} meta={meta}
          onAdd={(m) => { setMeal(m); setTab("alimentos"); }}
          onRemove={(id) => guardarLog(log.filter((e) => e.id !== id))} />
      )}
      {tab === "alimentos" && (
        <Alimentos foods={foods} mios={mios} recetas={new Set(Object.keys(recetas))} meal={meal} setMeal={setMeal} consumidas={sumar(log).kcal} meta={meta.kcal_objetivo}
          onAdd={(e) => guardarLog([...log, e])}
          onGuardar={guardarAlimento} onBorrar={borrarAlimento} onEditarReceta={setReceta} />
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
            setTab("hoy");
          }} />
      )}
      {tab === "objetivos" && <Objetivos perfil={perfil} onObjetivo={(o) => guardarPerfil({ ...perfil, objetivo: o })} onEditar={() => setEditando(true)} onSimular={() => setSimulando(true)} onConfig={() => setConfig(true)} />}

      <nav className="tabs" aria-label="Navegación principal">
        {TABS.map(([id, label, icon]) => (
          <button key={id} aria-current={tab === id ? "page" : undefined} onClick={() => setTab(id)}>{icon}{label}</button>
        ))}
      </nav>
    </>
  );
}
