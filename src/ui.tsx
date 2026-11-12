import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

export const fmt = (n: number) => Math.round(n).toLocaleString("es-MX");
export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
// cel = táctil; en la compu "Tomar foto" abriría el mismo selector de archivos que "Elegir foto"
export const tactil = matchMedia("(pointer: coarse)").matches;
export const SIN_LLAVE = "Para leer fotos pon tu llave de Gemini en Configuración → Leer etiquetas. Se guarda en cada dispositivo por separado.";

const svg = { fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;
export const Plus = () => <svg width="18" height="18" viewBox="0 0 24 24" strokeWidth="2" {...svg}><path d="M12 5v14M5 12h14" /></svg>;
export const Minus = () => <svg width="18" height="18" viewBox="0 0 24 24" strokeWidth="2.2" {...svg}><path d="M5 12h14" /></svg>;
export const Close = () => <svg width="18" height="18" viewBox="0 0 24 24" strokeWidth="2.2" {...svg}><path d="M6 6l12 12M18 6 6 18" /></svg>;
export const Search = () => <svg width="18" height="18" viewBox="0 0 24 24" strokeWidth="2" {...svg}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>;
export const Check = () => <svg width="18" height="18" viewBox="0 0 24 24" strokeWidth="2.4" {...svg}><path d="m5 12 5 5 9-10" /></svg>;
export const Chevron = () => <svg width="16" height="16" viewBox="0 0 24 24" strokeWidth="2.2" {...svg}><path d="m6 9 6 6 6-6" /></svg>;
export const Camara = () => <svg width="18" height="18" viewBox="0 0 24 24" strokeWidth="2" {...svg}><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>;
export const Galeria = () => <svg width="18" height="18" viewBox="0 0 24 24" strokeWidth="2" {...svg}><rect x="4" y="4" width="16" height="16" rx="3" /><path d="m4 16 5-5 4 4 2-2 5 5" /></svg>;
export const Flame =() => <svg width="16" height="16" viewBox="0 0 24 24" strokeWidth="2" {...svg} stroke="var(--p)"><path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2.2 1.2-3.6 2.4-4.6.3 1.6 1.2 2.6 2.1 2.6 0-3 .5-5.5.5-8z" /></svg>;

export function Macros({ p, c, g }: { p: number; c: number; g: number }) {
  return (
    <div className="macros">
      <span><i className="dot bg-p" />P {fmt(p)}</span>
      <span><i className="dot bg-c" />C {fmt(c)}</span>
      <span><i className="dot bg-g" />G {fmt(g)}</span>
    </div>
  );
}

// Atrás de Android (MainActivity.java regresa en el historial del WebView): lo abierto encima empuja una entrada
// y regresar cierra solo lo de más arriba. Cerrado con un botón, se quita su entrada sin cerrar lo de abajo.
const pila: (() => void)[] = [];
let ignorar = 0;
window.addEventListener("popstate", () => {
  if (ignorar) ignorar--;
  else pila.pop()?.();
});
// con teclado (compu), Escape hace lo mismo que atrás
window.addEventListener("keydown", (e) => { if (e.key === "Escape" && pila.length) history.back(); });
export function useAtras(abierto: boolean, cerrar: () => void) {
  const ref = useRef(cerrar);
  ref.current = cerrar;
  useEffect(() => {
    if (!abierto) return;
    const f = () => ref.current();
    pila.push(f);
    history.pushState(null, "");
    return () => {
      const i = pila.indexOf(f);
      if (i < 0) return; // ya lo cerró atrás
      pila.splice(i, 1);
      ignorar++;
      history.back();
    };
  }, [abierto]);
}

// Hay modales encima de modales (Elegir → Registrar), así que se cuentan para soltar el scroll al cerrar el último.
let abiertos = 0;

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  useAtras(true, onClose);
  useEffect(() => {
    if (abiertos++ === 0) document.body.style.overflow = "hidden";
    return () => {
      if (--abiertos === 0) document.body.style.overflow = "";
    };
  }, []);
  // Al cerrarse por cualquier camino, una copia inerte baja y se borra sola; así ningún botón tiene que esperar la animación.
  useLayoutEffect(() => {
    const hoja = ref.current!, scrim = hoja.previousElementSibling as HTMLElement;
    return () => {
      const top = hoja.scrollTop;
      queueMicrotask(() => {
        if (hoja.isConnected) return; // StrictMode desmonta de prueba en desarrollo
        for (const el of [scrim, hoja]) {
          const copia = el.cloneNode(true) as HTMLElement;
          copia.classList.add("cerrando");
          copia.inert = true;
          copia.addEventListener("animationend", () => copia.remove());
          document.body.append(copia);
          copia.scrollTop = el === hoja ? top : 0;
        }
      });
    };
  }, []);
  return (
    <>
      <div className="scrim" aria-hidden="true" onClick={onClose} />
      <section ref={ref} className="sheet" role="dialog" aria-modal="true" aria-label={title}
        // el teclado se abre después de que la hoja sube; abrirlo a media animación la traba
        onAnimationEnd={(e) => e.target === e.currentTarget && e.currentTarget.querySelector<HTMLElement>("[data-foco]")?.focus()}>
        <span className="grabber" aria-hidden="true" />
        {children}
      </section>
    </>
  );
}

// Reemplaza <select>: la lista nativa de Android no se puede estilizar; esta abre una hoja con las opciones.
export function Opciones<T extends string>({ id, titulo, value, options, onChange, style }: {
  id: string; titulo: string; value: T; options: readonly (readonly [T, string, string?])[]; onChange: (v: T) => void; style?: CSSProperties;
}) {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <button id={id} type="button" className="box opc" aria-haspopup="dialog" style={style} onClick={() => setAbierto(true)}>
        <span className="grow ellipsis">{options.find((o) => o[0] === value)?.[1]}</span><Chevron />
      </button>
      {abierto && (
        <Sheet title={titulo} onClose={() => setAbierto(false)}>
          <h2>{titulo}</h2>
          <div className="list">
            {options.map(([v, l, d]) => (
              <button key={v} type="button" className="row" aria-pressed={v === value} onClick={() => { onChange(v); setAbierto(false); }}>
                <span className="grow"><span className="name">{l}</span>{d && <span className="sub">{d}</span>}</span>
                {v === value && <span style={{ display: "flex", color: "var(--accent)" }}><Check /></span>}
              </button>
            ))}
          </div>
        </Sheet>
      )}
    </>
  );
}

// Barras de progreso: se llenan con transform (--f de 0 a 1), así animan al abrir y al cambiar.
export const barra = (f: number) => ({ "--f": Math.min(1, Math.max(0, f)) || 0 }) as CSSProperties;

// Llave estable por objeto para listas sin id (menú, ingredientes): con el índice animaría la fila equivocada.
const llaves = new WeakMap<object, string>();
export const llave = (o: object) => {
  let k = llaves.get(o);
  if (!k) llaves.set(o, (k = uid()));
  return k;
};

// La fila se encoge (.sale) y luego se quita del estado. Si falla, vuelve a verse.
export function salir(el: Element | null | undefined, fn: () => unknown) {
  if (!el) return void fn();
  el.classList.add("sale");
  const f = (ev: Event) => {
    if (ev.target !== el) return;
    el.removeEventListener("animationend", f);
    Promise.resolve(fn()).catch((err) => { el.classList.remove("sale"); throw err; });
  };
  el.addEventListener("animationend", f);
}

export function Seg<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="seg" role="group" aria-label={label} style={{ "--n": options.length, "--i": Math.max(0, options.findIndex((o) => o[0] === value)) } as CSSProperties}>
      {options.map(([v, l]) => (
        <button key={v} type="button" aria-pressed={v === value} onClick={() => onChange(v)}>{l}</button>
      ))}
    </div>
  );
}

// Colapsables <details class="fold">: el alto se anima con JS; en el WebView del cel interpolate-size no animó.
export function animarColapsables() {
  document.addEventListener("click", (e) => {
    const s = (e.target as Element).closest(".fold > summary");
    if (!s) return;
    e.preventDefault();
    const d = s.parentElement as HTMLDetailsElement;
    const cerrar = d.open && !d.classList.contains("cerrando");
    const desde = d.offsetHeight;
    d.getAnimations().forEach((a) => a.cancel());
    d.open = !cerrar;
    const hasta = d.offsetHeight;
    d.open = true; // al cerrar, el contenido se queda hasta el final y el alto lo recorta
    d.classList.toggle("cerrando", cerrar);
    const ms = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 200;
    d.animate({ height: [`${desde}px`, `${hasta}px`] }, { duration: ms, easing: "cubic-bezier(0.2, 0, 0, 1)" }).onfinish = () => {
      if (cerrar) d.open = false;
      d.classList.remove("cerrando");
    };
  });
}

// Preguntas antes de una acción (reemplazan confirm/alert nativos): await preguntar({...}) da true si acepta.
type Pregunta = { titulo: string; texto?: string; si: string; peligro?: boolean; no?: string | false };
type Pendiente = Pregunta & { resolve: (ok: boolean) => void };
export const preguntar = (p: Pregunta) =>
  new Promise<boolean>((resolve) => { window.dispatchEvent(new CustomEvent<Pendiente>("pregunta", { detail: { ...p, resolve } })); });

export function Preguntas() {
  const [p, setP] = useState<Pendiente | null>(null);
  useEffect(() => {
    // si llega otra con una abierta, la anterior cuenta como cancelada
    const f = (e: Event) => setP((prev) => { prev?.resolve(false); return (e as CustomEvent<Pendiente>).detail; });
    window.addEventListener("pregunta", f);
    return () => window.removeEventListener("pregunta", f);
  }, []);
  if (!p) return null;
  const fin = (ok: boolean) => { p.resolve(ok); setP(null); };
  return (
    <Sheet title={p.titulo} onClose={() => fin(false)}>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--s2)" }}>
        <h2>{p.titulo}</h2>
        {p.texto && <p className="muted" style={{ margin: 0, fontSize: 15, lineHeight: 1.45 }}>{p.texto}</p>}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--s2)", paddingTop: "var(--s2)" }}>
        <button className={`primary${p.peligro ? " peligro" : ""}`} onClick={() => fin(true)}>{p.si}</button>
        {p.no !== false && <button className="secondary" onClick={() => fin(false)}>{p.no ?? "Cancelar"}</button>}
      </div>
    </Sheet>
  );
}

// Confirmaciones cortas ("Borrado", "Agregado a Cena"…) desde cualquier pantalla.
export const avisar = (msg: string) => { window.dispatchEvent(new CustomEvent("aviso", { detail: msg })); };

export function Toast() {
  const [msg, setMsg] = useState("");
  useEffect(() => {
    let t: number;
    const f = (e: Event) => {
      setMsg((e as CustomEvent<string>).detail);
      clearTimeout(t);
      t = window.setTimeout(() => setMsg(""), 2200);
    };
    window.addEventListener("aviso", f);
    return () => { window.removeEventListener("aviso", f); clearTimeout(t); };
  }, []);
  return <div className="toast" role="status" aria-live="polite">{msg && <span key={msg + Date.now()}>{msg}</span>}</div>;
}
