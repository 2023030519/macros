import { useEffect, useState, type ReactNode } from "react";

export const fmt = (n: number) => Math.round(n).toLocaleString("es-MX");
export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

const svg = { fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;
export const Plus = () => <svg width="18" height="18" viewBox="0 0 24 24" strokeWidth="2" {...svg}><path d="M12 5v14M5 12h14" /></svg>;
export const Minus = () => <svg width="18" height="18" viewBox="0 0 24 24" strokeWidth="2.2" {...svg}><path d="M5 12h14" /></svg>;
export const Close = () => <svg width="18" height="18" viewBox="0 0 24 24" strokeWidth="2.2" {...svg}><path d="M6 6l12 12M18 6 6 18" /></svg>;
export const Search = () => <svg width="18" height="18" viewBox="0 0 24 24" strokeWidth="2" {...svg}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>;
export const Chevron = () => <svg width="16" height="16" viewBox="0 0 24 24" strokeWidth="2.2" {...svg}><path d="m6 9 6 6 6-6" /></svg>;
export const Flame = () => <svg width="16" height="16" viewBox="0 0 24 24" strokeWidth="2" {...svg} stroke="var(--p)"><path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2.2 1.2-3.6 2.4-4.6.3 1.6 1.2 2.6 2.1 2.6 0-3 .5-5.5.5-8z" /></svg>;

export function Macros({ p, c, g }: { p: number; c: number; g: number }) {
  return (
    <div className="macros">
      <span><i className="dot bg-p" />P {fmt(p)}</span>
      <span><i className="dot bg-c" />C {fmt(c)}</span>
      <span><i className="dot bg-g" />G {fmt(g)}</span>
    </div>
  );
}

// Hay modales encima de modales (Elegir → Registrar), así que se cuentan para soltar el scroll al cerrar el último.
let abiertos = 0;

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    if (abiertos++ === 0) document.body.style.overflow = "hidden";
    return () => {
      if (--abiertos === 0) document.body.style.overflow = "";
    };
  }, []);
  return (
    <>
      <div className="scrim" aria-hidden="true" onClick={onClose} />
      <section className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <span className="grabber" aria-hidden="true" />
        {children}
      </section>
    </>
  );
}

export function Seg<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map(([v, l]) => (
        <button key={v} type="button" aria-pressed={v === value} onClick={() => onChange(v)}>{l}</button>
      ))}
    </div>
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
