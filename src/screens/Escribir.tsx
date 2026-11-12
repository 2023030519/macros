import { useEffect, useRef, useState } from "react";
import type { FoodRow } from "../data/foods.ts";
import { mostrar, nombreTiempo, type PrefComidas } from "../lib/comidas.ts";
import { leerEtiqueta } from "../lib/etiqueta.ts";
import { gramos, leer, proponer, supuesto, type Leido } from "../lib/frase.ts";
import { item, sumar, type Item } from "../lib/receta.ts";
import { load, type Entrada } from "../lib/store.ts";
import { Camara, Check, Close, Galeria, Macros, Plus, SIN_LLAVE, Sheet, cap, fmt, salir, tactil, uid } from "../ui.tsx";
import { AlimentoSheet } from "./Alimentos.tsx";

type Linea = Leido & { id: string };
type Grupo = { meal: string; lineas: Linea[] };
// shortcut: la conversación vive mientras la hoja está abierta; si se quiere retomar después, guardarla con save()
type Msg =
  | { id: string; t: "yo"; texto: string }
  | { id: string; t: "nada" }
  | { id: string; t: "registro"; grupos: Grupo[]; faltan: string[]; hecho: boolean }
  | { id: string; t: "propuesta"; meal: string; kcal: number; p: number; items: Item[]; hechos: number[] }
  // estado: "leyendo", "listo", "sin llave" o el mensaje de error
  | { id: string; t: "foto"; url: string; estado: string };

const num = (n: number) => n.toLocaleString("es-MX", { maximumFractionDigits: 2 });

// Escribir lo que comiste o pedir qué comer; lee tu base y tus recetas (lib/frase.ts).
export default function Escribir({ foods: base, recetas, comidas, log, objetivo, porDefecto, onAgregar, onNuevo, onClose }: {
  foods: Record<string, FoodRow>; recetas: string[]; comidas: PrefComidas; log: Entrada[]; objetivo: { kcal: number; p: number };
  porDefecto: string; onAgregar: (es: Entrada[]) => Promise<void>; onNuevo: (n: string, r: FoodRow) => Promise<void>; onClose: () => void;
}) {
  // lo recién guardado desde una foto, para poder mostrarlo antes de que el padre vuelva a pintar
  const [nuevos, setNuevos] = useState<Record<string, FoodRow>>({});
  const foods = { ...base, ...nuevos };
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [texto, setTexto] = useState("");
  const fin = useRef<HTMLFormElement>(null);

  // Foto de etiqueta: la misma lectura que Nuevo alimento (lib/etiqueta.ts), con la llave de Gemini de Configuración
  const [llave, setLlave] = useState("");
  const [revisar, setRevisar] = useState<{ nombre: string; row: FoodRow } | null>(null);
  const archivo = useRef<HTMLInputElement>(null);
  const urls = useRef<string[]>([]);
  useEffect(() => {
    load("gemini", "").then(setLlave);
    return () => urls.current.forEach(URL.revokeObjectURL);
  }, []);
  function abrir(camara: boolean) {
    if (!llave) return setMsgs((ms) => [...ms, { id: uid(), t: "foto", url: "", estado: "sin llave" }]);
    const i = archivo.current!;
    if (camara) i.setAttribute("capture", "environment");
    else i.removeAttribute("capture");
    i.click();
  }
  async function foto(f: File) {
    const id = uid(), url = URL.createObjectURL(f);
    urls.current.push(url);
    setMsgs((ms) => [...ms, { id, t: "foto", url, estado: "leyendo" }]);
    let estado = "listo";
    try {
      const l = await leerEtiqueta(llave, f);
      setRevisar({ nombre: l.nombre, row: [l.kcal, l.p, l.c, l.g, l.f, l.porcion ? { cantidad: 1, unidad: "porción", gramos: l.porcion } : null] });
    } catch (e) {
      estado = (e as Error).message;
    }
    cambiar(id, (m) => (m.t === "foto" ? { ...m, estado } : m));
  }
  useEffect(() => {
    // la caja de texto está pegada abajo (sticky), así que se baja la hoja entera, no hasta la caja
    if (msgs.length) fin.current?.closest(".sheet")?.scrollTo({ top: 1e9, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [msgs.length]);

  const ejemplos = ["Desayuné 2 huevos y 2 tortillas de maíz", recetas[0] ? `Media porción de ${recetas[0]} en la cena` : "150 g de pechuga de pollo en la comida", "¿Qué ceno?"];
  const cambiar = (id: string, f: (m: Msg) => Msg) => setMsgs((ms) => ms.map((m) => (m.id === id ? f(m) : m)));

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    const s = texto.trim();
    if (!s) return;
    const l = leer(s, foods, comidas.lista, porDefecto);
    const nuevos: Msg[] = [{ id: uid(), t: "yo", texto: s }];
    if (l.propuesta) {
      // lo que falta del día se reparte entre los tiempos que pediste y los que siguen vacíos
      const vacios = mostrar(comidas).filter((t) => !log.some((x) => x.meal === t.id)).map((t) => t.id);
      const pedidos = l.propuesta.length ? l.propuesta : [vacios[0] ?? porDefecto];
      const partes = pedidos.length + vacios.filter((v) => !pedidos.includes(v)).length;
      const hoy = sumar(log);
      const kcal = (objetivo.kcal - hoy.kcal) / partes, p = (objetivo.p - hoy.p) / partes;
      for (const meal of pedidos) nuevos.push({ id: uid(), t: "propuesta", meal, kcal, p, items: proponer(foods, recetas, { kcal, p }), hechos: [] });
    } else if (l.grupos.length || l.faltan.length) {
      nuevos.push({ id: uid(), t: "registro", grupos: l.grupos.map((g) => ({ meal: g.meal, lineas: g.items.map((i) => ({ ...i, id: uid() })) })), faltan: l.faltan, hecho: false });
    } else nuevos.push({ id: uid(), t: "nada" });
    setMsgs([...msgs, ...nuevos]);
    setTexto("");
  }

  const itemDe = (l: Linea) => item(l.nombre, foods[l.nombre], gramos(foods[l.nombre], l));
  const cuanto = (l: Linea) => {
    const row = foods[l.nombre], g = gramos(row, l);
    if (l.unidad === "g" || !row[5]) return `${fmt(g)} g${supuesto(row, l) ? " (supuestos, no tiene porción)" : ""}`;
    return `${num(l.cantidad * row[5].cantidad)} ${row[5].unidad} · ${fmt(g)} g`;
  };

  return (
    <Sheet title="Escribir" onClose={onClose}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h2>Escribir</h2>
        <button className="icon-btn soft" aria-label="Cerrar" onClick={onClose}><Close /></button>
      </div>

      <div className="chat" aria-live="polite">
        {!msgs.length && (
          <div className="resp">
            <p>Escribe lo que comiste con su cantidad y en qué comida, o pregunta qué comer. Leo tu base y tus recetas, sin internet. Con la cámara lees la etiqueta de un producto, como en Nuevo alimento.</p>
            <div className="chips" style={{ padding: "0 var(--s4) var(--s3)", flexWrap: "wrap" }}>
              {ejemplos.map((x) => <button key={x} type="button" className="chip" onClick={() => setTexto(x)}>{x}</button>)}
            </div>
          </div>
        )}
        {msgs.map((m) => {
          if (m.t === "yo") return <p key={m.id} className="yo llena">{m.texto}</p>;
          if (m.t === "foto") return (
            <div key={m.id} className="chat">
              {m.url && <img className="yo foto-msg llena" src={m.url} alt="Foto de la etiqueta" />}
              {m.estado === "leyendo" ? (
                <div className="estado llena" role="status"><span className="grow"><b>Leyendo etiqueta…</b><span className="sub">Unos segundos</span></span><span className="spin" aria-hidden="true" /></div>
              ) : (
                <div className="resp llena">
                  <p className={m.estado === "listo" || m.estado === "sin llave" ? undefined : "error"}>
                    {m.estado === "listo" ? "Leí la etiqueta. Revisa los valores y guárdalo; luego lo agregas a Hoy desde aquí."
                      : m.estado === "sin llave" ? SIN_LLAVE
                      : m.estado}
                  </p>
                </div>
              )}
            </div>
          );
          if (m.t === "nada") return (
            <div key={m.id} className="resp llena"><p>No reconocí ningún alimento. Escribe la cantidad y el nombre como está en tu base, por ejemplo “2 huevos en el desayuno”.</p></div>
          );
          if (m.t === "registro") {
            const todas = m.grupos.flatMap((g) => g.lineas);
            const total = sumar(todas.map(itemDe));
            const quitar = (id: string) => cambiar(m.id, (x) => (x.t === "registro" ? { ...x, grupos: x.grupos.map((g) => ({ ...g, lineas: g.lineas.filter((l) => l.id !== id) })).filter((g) => g.lineas.length) } : x));
            const otra = (id: string, nombre: string) => cambiar(m.id, (x) => (x.t === "registro" ? { ...x, grupos: x.grupos.map((g) => ({ ...g, lineas: g.lineas.map((l) => (l.id === id ? { ...l, nombre, otras: [l.nombre, ...l.otras.filter((o) => o !== nombre)] } : l)) })) } : x));
            return (
              <div key={m.id} className="resp llena">
                {m.grupos.map((g) => (
                  <div key={g.meal} className="grupo">
                    <span className="label">{nombreTiempo(comidas, g.meal)}</span>
                    {g.lineas.map((l) => (
                      <div key={l.id} className="row">
                        <div className="grow">
                          <span className="name ellipsis">{cap(l.nombre)}</span>
                          <span className="sub">{cuanto(l)} · {fmt(itemDe(l).kcal)} kcal</span>
                          {!m.hecho && l.otras.length > 0 && (
                            <span className="chips" style={{ paddingTop: 4 }}>
                              {l.otras.map((o) => <button key={o} type="button" className="chip" aria-label={`Cambiar ${l.nombre} por ${o}`} onClick={() => otra(l.id, o)}>o {o}</button>)}
                            </span>
                          )}
                        </div>
                        {!m.hecho && <button type="button" className="icon-btn" aria-label={`Quitar ${l.nombre}`} onClick={(ev) => salir(ev.currentTarget.closest(".row"), () => quitar(l.id))}><Close /></button>}
                      </div>
                    ))}
                  </div>
                ))}
                {m.faltan.length > 0 && (
                  <p className="muted">No está en tu base: {m.faltan.map((f) => `“${f}”`).join(", ")}. Regístralo en Alimentos o escríbelo como se llama ahí.</p>
                )}
                {todas.length > 0 && (
                  <div className="pie">
                    <Macros {...total} />
                    <button type="button" className="primary" disabled={m.hecho}
                      onClick={async () => {
                        await onAgregar(m.grupos.flatMap((g) => g.lineas.map((l) => ({ ...itemDe(l), id: uid(), meal: g.meal }))));
                        cambiar(m.id, (x) => (x.t === "registro" ? { ...x, hecho: true } : x));
                      }}>
                      {m.hecho ? <><Check />Agregado a Hoy</> : `Agregar a Hoy · ${fmt(total.kcal)} kcal`}
                    </button>
                  </div>
                )}
              </div>
            );
          }
          const tiempo = nombreTiempo(comidas, m.meal);
          return (
            <div key={m.id} className="resp llena">
              {m.kcal < 50 ? <p>{tiempo}: ya cubriste tu meta de hoy, no te propongo nada.</p>
                : !m.items.length ? <p>Aún no tienes recetas. Guarda algunas en Recetas y te propongo con ellas.</p>
                : <p>{tiempo}: te tocan unas {fmt(m.kcal)} kcal y {fmt(Math.max(0, m.p))} g de proteína. De tus recetas:</p>}
              {m.items.map((it, i) => {
                const hecho = m.hechos.includes(i);
                const row = foods[it.name];
                return (
                  <div key={it.name} className="row">
                    <div className="grow">
                      <span className="name ellipsis">{cap(it.name)}</span>
                      <span className="sub">{row[5] ? `${num(it.grams / row[5].gramos)} ${row[5].unidad} · ` : ""}{fmt(it.grams)} g · {fmt(it.kcal)} kcal</span>
                      <Macros {...it} />
                    </div>
                    <button type="button" className={`icon-btn ${hecho ? "" : "solid"}`} disabled={hecho} aria-label={hecho ? `${it.name} agregado` : `Agregar ${it.name} a ${tiempo}`}
                      onClick={async () => {
                        await onAgregar([{ ...it, id: uid(), meal: m.meal }]);
                        cambiar(m.id, (x) => (x.t === "propuesta" ? { ...x, hechos: [...x.hechos, i] } : x));
                      }}>
                      {hecho ? <Check /> : <Plus />}
                    </button>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <form ref={fin} className="escribir" onSubmit={enviar}>
        <input ref={archivo} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) foto(f); }} />
        {tactil && <button type="button" className="icon-btn foto" aria-label="Tomar foto de una etiqueta" onClick={() => abrir(true)}><Camara /></button>}
        <button type="button" className="icon-btn foto" aria-label="Elegir foto de una etiqueta" onClick={() => abrir(false)}><Galeria /></button>
        <div className="box">
          <label htmlFor="escribir-q" className="sr">Qué comiste o qué quieres comer</label>
          <input id="escribir-q" data-foco enterKeyHint="send" autoComplete="off" placeholder="Desayuné 2 huevos y…" value={texto} onChange={(e) => setTexto(e.target.value)} />
        </div>
        <button className="icon-btn solid" aria-label="Enviar" disabled={!texto.trim()}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
        </button>
      </form>
      {revisar && (
        <AlimentoSheet inicial={{ nombre: revisar.nombre, row: revisar.row, anterior: null }} existe={(n) => n in foods} onClose={() => setRevisar(null)}
          onSave={async (n, r) => {
            await onNuevo(n, r);
            setNuevos((x) => ({ ...x, [n]: r }));
            setRevisar(null);
            // queda listo para agregar: 1 porción (o 100 g si la etiqueta no dice porción), en el tiempo de por defecto
            setMsgs((ms) => [...ms, { id: uid(), t: "registro", grupos: [{ meal: porDefecto, lineas: [{ id: uid(), nombre: n, cantidad: 1, unidad: null, otras: [] }] }], faltan: [], hecho: false }]);
          }} />
      )}
    </Sheet>
  );
}
