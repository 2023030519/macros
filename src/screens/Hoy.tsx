import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { MealId } from "../data/foods.ts";
import { mostrar, type PrefComidas } from "../lib/comidas.ts";
import { kcalCaminando, kmDePasos, type Perfil, type plan } from "../lib/calc.ts";
import { racha, sumarDias } from "../lib/dias.ts";
import { sumar } from "../lib/receta.ts";
import type { Entrada } from "../lib/store.ts";
import { reubicar, type PrefHoy, type Tarjeta } from "../lib/hoy.ts";
import { Chevron, Close, Flame, Macros, Plus, barra, cap, fmt, salir } from "../ui.tsx";

type Props = { dia: string; log: Entrada[]; dias: Set<string>; meta: ReturnType<typeof plan>; perfil: Perfil; pasos: number; km: number; pref: PrefHoy; comidas: PrefComidas; onOrden: (o: Tarjeta[]) => void; onAdd: (m: MealId) => void; onRemove: (id: string) => void; onEscribir: () => void; onPasos: (n: number) => void; onKm: (n: number) => void };

const fecha = (dia: string) => {
  const [y, m, d] = dia.split("-").map(Number);
  return new Date(y, m - 1, d);
};

const PASOS_MAX = 100_000;
const KM_MAX = 100;

// Pasos y km del día escritos a mano (los del reloj o la app de salud). Se guardan al salir de cada campo; las kcal se ven mientras escribes.
// Con km se usan tal cual; sin km se estiman con los pasos y la estatura.
function Pasos({ perfil, pasos, km, onPasos, onKm }: { perfil: Perfil; pasos: number; km: number; onPasos: (n: number) => void; onKm: (n: number) => void }) {
  const [tp, setTp] = useState(pasos ? String(pasos) : "");
  const [tk, setTk] = useState(km ? String(km) : "");
  const np = Number(tp.replace(/[\s,.]/g, "")); // "8,500" o "8 500" son 8500
  const okP = Number.isInteger(np) && np >= 0 && np <= PASOS_MAX;
  const nk = Math.round(Number(tk.replace(",", ".")) * 100) / 100; // "6,4" o "6.4"
  const okK = Number.isFinite(nk) && nk >= 0 && nk <= KM_MAX;
  const p = okP ? np : pasos, k = okK ? nk : km;
  const quemadas = kcalCaminando(k || kmDePasos(p, perfil.altura), perfil.peso);

  const campo = (id: string, label: string, txt: string, set: (s: string) => void, ok: boolean, listo: () => void, placeholder: string, modo: "numeric" | "decimal") => (
    <div className="field">
      <label htmlFor={id} className="label">{label}</label>
      <div className="box"><input id={id} inputMode={modo} placeholder={placeholder} value={txt} aria-invalid={!ok} aria-describedby="pasos-ayuda" onChange={(e) => set(e.target.value)} onBlur={listo} onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()} /></div>
    </div>
  );
  const ayuda = !okP ? `Pasos: escribe solo el número, hasta ${fmt(PASOS_MAX)}.`
    : !okK ? `Km: escribe un número de 0 a ${KM_MAX}, como 6.4.`
    : k ? `Con tus km y tu peso (${perfil.peso} kg). No cambia tu meta.`
    : `Sin km se estiman con tus pasos y tu estatura. No cambia tu meta.`;

  return (
    <section className="card" aria-label="Pasos del día">
      <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 12 }}>
        {campo("pasos", "Pasos", tp, setTp, okP, () => (okP ? np !== pasos && onPasos(np) : setTp(pasos ? String(pasos) : "")), "0", "numeric")}
        {/* el placeholder enseña los km estimados, para comparar con los de tu app */}
        {campo("km", "Km", tk, setTk, okK, () => (okK ? nk !== km && onKm(nk) : setTk(km ? String(km) : "")), p ? kmDePasos(p, perfil.altura).toFixed(1) : "0", "decimal")}
      </div>
      <div className="kv">
        <span className="muted">Quemadas caminando</span>
        <span><b key={quemadas} className="cambia" style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.03em" }}>{fmt(quemadas)}</b> <span className="muted">kcal</span></span>
      </div>
      <span id="pasos-ayuda" className="sub">{ayuda}</span>
    </section>
  );
}

export default function Hoy({ dia, log, dias, meta, perfil, pasos, km, pref, comidas, onOrden, onAdd, onRemove, onEscribir, onPasos, onKm }: Props) {
  const tiempos = mostrar(comidas, log.map((e) => e.meal));
  const [abierto, setAbierto] = useState<MealId | null>(null);
  // orden recién soltado, mientras se guarda
  const [local, setLocal] = useState<Tarjeta[] | null>(null);
  useEffect(() => setLocal(null), [pref.orden]);
  const orden = local ?? pref.orden;
  const vis = orden.filter((k) => !pref.ocultas.includes(k));
  const raiz = useRef<HTMLElement>(null);
  const actual = useRef({ pref: { ...pref, orden }, onOrden });
  actual.current = { pref: { ...pref, orden }, onOrden };

  // ya reordenado el DOM, se quitan los desplazamientos del arrastre sin animar (si no, regresarían de lado)
  useLayoutEffect(() => {
    raiz.current!.querySelectorAll<HTMLElement>(".tarjeta").forEach((t) => {
      t.classList.remove("soltando");
      t.style.transition = "none";
      t.style.transform = "";
      void t.offsetHeight;
      t.style.transition = "";
    });
  }, [vis.join()]);

  // Mantener presionada una tarjeta (400 ms) y arrastrarla. Eventos nativos: hay que poder cancelar el scroll.
  useEffect(() => {
    const main = raiz.current!;
    let timer = 0, x0 = 0, y0 = 0, el: HTMLElement | null = null, activo = false, i = 0, ni = 0, gap = 0;
    let cajas: { el: HTMLElement; top: number; h: number }[] = [];
    const fin = () => { clearTimeout(timer); el = null; activo = false; };
    const inicio = (e: TouchEvent) => {
      const t = (e.target as Element).closest<HTMLElement>(".tarjeta");
      // en un campo, mantener presionado es para seleccionar o pegar, no para arrastrar
      if (!t || (e.target as Element).closest("input") || e.touches.length > 1 || main.querySelector(".soltando")) return;
      el = t; x0 = e.touches[0].clientX; y0 = e.touches[0].clientY;
      timer = window.setTimeout(() => {
        cajas = [...main.querySelectorAll<HTMLElement>(".tarjeta")].map((c) => { const r = c.getBoundingClientRect(); return { el: c, top: r.top, h: r.height }; });
        i = ni = cajas.findIndex((c) => c.el === t);
        gap = cajas.length > 1 ? cajas[1].top - cajas[0].top - cajas[0].h : 0;
        activo = true;
        t.classList.add("arrastrando");
      }, 400);
    };
    const mover = (e: TouchEvent) => {
      if (!el) return;
      const y = e.touches[0].clientY;
      if (!activo) { if (Math.hypot(e.touches[0].clientX - x0, y - y0) > 8) fin(); return; }
      e.preventDefault();
      const dy = y - y0, paso = cajas[i].h + gap;
      el.style.transform = `translateY(${dy}px)`;
      const centro = cajas[i].top + cajas[i].h / 2 + dy;
      ni = cajas.filter((c, j) => j !== i && c.top + c.h / 2 < centro).length;
      cajas.forEach((c, j) => { if (j !== i) c.el.style.transform = i < j && j <= ni ? `translateY(${-paso}px)` : ni <= j && j < i ? `translateY(${paso}px)` : ""; });
    };
    const soltar = (e: TouchEvent) => {
      if (!activo) return fin();
      e.preventDefault(); // sin clic al soltar
      e.stopPropagation(); // ni cambio de pestaña por deslizar
      const t = el!, desde = i, a = ni;
      let off = 0;
      for (let j = Math.min(desde, a); j <= Math.max(desde, a); j++) if (j !== desde) off += (a > desde ? 1 : -1) * (cajas[j].h + gap);
      t.classList.replace("arrastrando", "soltando");
      t.style.transform = `translateY(${off}px)`;
      fin();
      window.setTimeout(() => {
        if (a === desde) { t.classList.remove("soltando"); t.style.transform = ""; return; }
        const n = reubicar(actual.current.pref, t.dataset.tarjeta as Tarjeta, a);
        setLocal(n);
        actual.current.onOrden(n);
      }, 200);
    };
    const cancelar = () => {
      if (activo) cajas.forEach((c) => { c.el.style.transform = ""; c.el.classList.remove("arrastrando"); });
      fin();
    };
    const menu = (e: Event) => { if ((e.target as Element).closest(".tarjeta") && !(e.target as Element).closest("input")) e.preventDefault(); };
    main.addEventListener("touchstart", inicio, { passive: true });
    main.addEventListener("touchmove", mover, { passive: false });
    main.addEventListener("touchend", soltar);
    main.addEventListener("touchcancel", cancelar);
    main.addEventListener("contextmenu", menu);
    return () => {
      clearTimeout(timer);
      main.removeEventListener("touchstart", inicio);
      main.removeEventListener("touchmove", mover);
      main.removeEventListener("touchend", soltar);
      main.removeEventListener("touchcancel", cancelar);
      main.removeEventListener("contextmenu", menu);
    };
  }, []);
  const t = sumar(log);
  const resto = meta.kcal_objetivo - t.kcal;
  const arco = Math.min(1, t.kcal / meta.kcal_objetivo) * 339.3;
  const r = racha(dias, dia);
  const semana = [6, 5, 4, 3, 2, 1, 0].map((i) => sumarDias(dia, -i));

  // al cerrar (o cambiar de comida) las filas abiertas se encogen primero; abrir no espera nada
  function alternar(m: MealId, lista: Element | null) {
    const sig = abierto === m ? null : m;
    const filas = [...(lista?.querySelectorAll(".meal > .row.crece") ?? [])];
    filas.forEach((f) => f.classList.add("sale"));
    salir(filas[0], () => setAbierto(sig));
  }

  const bloques: Record<Tarjeta, JSX.Element> = {
    calorias: (
      <section className="card" aria-label="Calorías del día">
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ position: "relative", width: 124, height: 124, flexShrink: 0 }}>
            <svg width="124" height="124" viewBox="0 0 124 124" role="img" aria-label={`${fmt(t.kcal)} de ${fmt(meta.kcal_objetivo)} kcal consumidas`}>
              <circle cx="62" cy="62" r="54" fill="none" stroke="var(--surface2)" strokeWidth="10" />
              <circle className="arco" cx="62" cy="62" r="54" fill="none" stroke={resto < 0 ? "var(--warn)" : "var(--accent)"} strokeWidth="10" strokeLinecap={arco > 0 ? "round" : "butt"} strokeDasharray={`${arco} 339.3`} transform="rotate(-90 62 62)" />
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <span key={resto} className="cambia" style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-0.04em" }}>{fmt(Math.abs(resto))}</span>
              <span className="muted" style={{ fontSize: 11, fontWeight: 500 }}>{resto < 0 ? "kcal de más" : "kcal restantes"}</span>
            </div>
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
            <div className="kv"><span className="muted">Meta</span><b>{fmt(meta.kcal_objetivo)}</b></div>
            <div className="hr" />
            <div className="kv"><span className="muted">Consumidas</span><b>{fmt(t.kcal)}</b></div>
            <div className="hr" />
            <div className="kv"><span className="muted">Fibra</span><b>{fmt(t.f)} g</b></div>
          </div>
        </div>
        <div className="grid3" style={{ gap: 12 }}>
          {([["Proteína", t.p, meta.prot, "bg-p"], ["Carbs", t.c, meta.carbs, "bg-c"], ["Grasas", t.g, meta.grasas, "bg-g"]] as const).map(([l, v, m, bg]) => (
            <div key={l} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span className="label" style={{ fontWeight: 500 }}>{l}</span>
              <div className="track"><div className={bg} style={barra(v / m)} /></div>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{fmt(v)}<span className="muted" style={{ fontWeight: 500 }}> / {fmt(m)} g</span></span>
            </div>
          ))}
        </div>
      </section>
    ),
    // key: al cambiar de día o llegar otro valor de la nube, el campo arranca con el nuevo
    pasos: <Pasos key={`${dia}|${pasos}|${km}`} perfil={perfil} pasos={pasos} km={km} onPasos={onPasos} onKm={onKm} />,
    semana: (
      <section className="card" aria-label="Últimos 7 días" style={{ borderRadius: "var(--r-lg)", padding: "var(--s3) var(--s4)", flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <div className="week">
          {semana.map((d) => (
            <div key={d}>
              {"DLMMJVS"[fecha(d).getDay()]}
              <span className={`wd ${dias.has(d) ? "done" : d === dia ? "today" : "miss"}`} aria-label={dias.has(d) ? "Registrado" : "Sin registro"} />
            </div>
          ))}
        </div>
      </section>
    ),
    comidas: (
      <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 4 }}>
        <h2>Comidas</h2>
        <span className="sub">{tiempos.length} {tiempos.length === 1 ? "tiempo" : "tiempos"}</span>
      </div>

      <div className="list">
        {tiempos.map((m) => {
          const es = log.filter((e) => e.meal === m.id);
          const s = sumar(es);
          return (
            <div key={m.id} className="meal">
              <div className="row" style={{ borderBottom: 0 }}>
                <button className="grow" style={{ background: "none", border: 0, padding: 0, textAlign: "left" }} aria-expanded={es.length ? abierto === m.id : undefined} onClick={(ev) => es.length && alternar(m.id, ev.currentTarget.closest(".list"))}>
                  <span style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <span className="name">{m.label}</span>
                    {es.length > 0 && <span className="sub">{fmt(s.kcal)} kcal</span>}
                    {es.length > 0 && <span className="chev" aria-hidden="true" style={{ alignSelf: "center", transform: abierto === m.id ? "rotate(180deg)" : undefined }}><Chevron /></span>}
                  </span>
                  <span className="sub ellipsis" style={{ fontWeight: 400 }}>{es.length ? es.map((e) => cap(e.name)).join(" · ") : "Sin registrar"}</span>
                  {es.length > 0 && <Macros {...s} />}
                </button>
                <button className={`icon-btn ${es.length ? "" : "solid"}`} aria-label={`Agregar a ${m.label}`} onClick={() => onAdd(m.id)}><Plus /></button>
              </div>
              {abierto === m.id && es.map((e) => (
                <div key={e.id} className="row crece" style={{ paddingLeft: 28, borderBottom: 0, paddingTop: 0 }}>
                  <div className="grow">
                    <span style={{ fontSize: 14, fontWeight: 500 }} className="ellipsis">{cap(e.name)}</span>
                    <span className="sub">{fmt(e.grams)} g · {fmt(e.kcal)} kcal</span>
                  </div>
                  <button className="icon-btn" aria-label={`Quitar ${e.name}`} onClick={(ev) => salir(ev.currentTarget.closest(".row"), () => onRemove(e.id))}><Close /></button>
                </div>
              ))}
            </div>
          );
        })}
      </div>
      </>
    ),
  };

  return (
    <main ref={raiz} className="screen">
      <header className="head">
        <div>
          <span className="kicker">{cap(fecha(dia).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" }).replace(",", ""))}</span>
          <h1>Hoy</h1>
        </div>
        <div style={{ flexDirection: "row", gap: 8 }}>
          <button className="pill" onClick={onEscribir}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z" /></svg>
            Escribir
          </button>
          <span className="pill" aria-label={`Racha de ${r} días`}><Flame />{r}</span>
        </div>
      </header>

      {vis.map((k) => <div key={k} className="tarjeta" data-tarjeta={k}>{bloques[k]}</div>)}
    </main>
  );
}
