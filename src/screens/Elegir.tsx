import { useState, type ReactNode } from "react";
import type { FoodRow } from "../data/foods.ts";
import { item, type Item } from "../lib/receta.ts";
import { Close, Macros, Plus, Search, Sheet, cap, fmt } from "../ui.tsx";
import { AlimentoSheet, porcionTxt, sinAcentos } from "./Alimentos.tsx";

// Buscar un alimento (o receta) y su cantidad; lo usan Nueva receta y Menú.
export default function Elegir({ title, foods: base, boton, onPick, onClose, onNuevo, extra }: {
  title: string; foods: Record<string, FoodRow>; boton: string; onPick: (it: Item) => void; onClose: () => void;
  onNuevo: (n: string, r: FoodRow) => Promise<void>; extra?: ReactNode;
}) {
  // lo recién registrado aquí, para poder elegirlo antes de que el padre vuelva a pintar
  const [nuevos, setNuevos] = useState<Record<string, FoodRow>>({});
  const [creando, setCreando] = useState(false);
  const foods = { ...base, ...nuevos };
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string | null>(null);
  const [gramos, setGramos] = useState("100");
  const nq = sinAcentos(q.trim());
  const nombres = Object.keys(foods).filter((n) => sinAcentos(n).includes(nq)).slice(0, 40);
  const g = Number(gramos.replace(",", "."));
  const ok = sel !== null && Number.isFinite(g) && g > 0;
  const prev = ok ? item(sel, foods[sel], g) : null;

  function elegir(n: string) {
    setSel(n);
    setGramos(String(foods[n][5]?.gramos ?? 100));
  }

  return (
    <Sheet title={title} onClose={onClose}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h2>{title}</h2>
        <button className="icon-btn soft" aria-label="Cerrar" onClick={onClose}><Close /></button>
      </div>

      {sel === null ? (
        <>
          <div className="box" style={{ height: 48, color: "var(--muted)", gap: 10 }}>
            <Search />
            <label htmlFor="elegir-q" className="sr">Buscar alimento</label>
            <input id="elegir-q" type="search" autoFocus placeholder="Buscar alimento o receta" value={q} onChange={(e) => setQ(e.target.value)} style={{ fontSize: 15, fontWeight: 500 }} />
          </div>
          <div className="list" style={{ minHeight: 0 }}>
            {nombres.length === 0 && <div className="row"><span className="sub">Sin resultados.</span></div>}
            {nombres.map((n) => (
              <button key={n} className="row" onClick={() => elegir(n)}>
                <span className="grow"><span className="name ellipsis">{cap(n)}</span><span className="sub">{porcionTxt(foods[n])}</span></span>
                <span className="sub">{fmt(foods[n][0] * (foods[n][5]?.gramos ?? 100) / 100)} kcal</span>
              </button>
            ))}
            {nq && !nombres.some((n) => sinAcentos(n) === nq) && (
              <button className="row" style={{ gap: 8, fontWeight: 600, fontSize: 14 }} onClick={() => setCreando(true)}><Plus />Registrar “{q.trim()}”</button>
            )}
          </div>
          {extra}
        </>
      ) : (
        <>
          <button className="pill" style={{ alignSelf: "flex-start" }} onClick={() => setSel(null)}>← {cap(sel)}</button>
          <div className="field">
            <label htmlFor="elegir-g" className="label">Cantidad</label>
            <div className="box"><input id="elegir-g" inputMode="decimal" value={gramos} onChange={(e) => setGramos(e.target.value)} /><span className="unit">g</span></div>
          </div>
          <div className="chips">
            {([["100 g", 100], ...(foods[sel][5] ? [[porcionTxt(foods[sel]), foods[sel][5]!.gramos]] : [])] as [string, number][]).map(([l, v]) => (
              <button key={l} className="chip" aria-pressed={g === v} onClick={() => setGramos(String(v))}>{l}</button>
            ))}
          </div>
          {prev && <div className="kv"><span className="muted">{fmt(prev.kcal)} kcal</span><Macros {...prev} /></div>}
          <button className="primary" disabled={!ok} onClick={() => prev && onPick(prev)}>{boton}</button>
        </>
      )}
      {creando && (
        <AlimentoSheet inicial={{ nombre: q.trim(), row: null, anterior: null }} existe={(n) => n in foods} onClose={() => setCreando(false)}
          onSave={async (n, r) => {
            await onNuevo(n, r);
            setNuevos({ ...nuevos, [n]: r });
            setSel(n);
            setGramos(String(r[5]?.gramos ?? 100));
            setCreando(false);
          }} />
      )}
    </Sheet>
  );
}
