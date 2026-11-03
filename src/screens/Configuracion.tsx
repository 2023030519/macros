import { useState, type ReactNode } from "react";
import { agregarTiempo, type PrefComidas } from "../lib/comidas.ts";
import { mover, type PrefHoy, type Tarjeta } from "../lib/hoy.ts";
import { apkNuevo, type EstadoUpd } from "../lib/version.ts";
import { Chevron, Seg } from "../ui.tsx";

export type Tema = "sistema" | "claro" | "oscuro";
export type Color = "neutro" | "azul" | "morado" | "rosa" | "verde" | "rojo" | "turquesa" | "tierra";
export type Texto = "chico" | "normal" | "grande";
export type Densidad = "comoda" | "compacta";
// muestra del color en el botón; los valores reales (claro/oscuro) están en styles.css
const COLORES: [Color, string, string][] = [
  ["neutro", "Neutro", "var(--text)"], ["azul", "Azul", "#2456D6"], ["morado", "Morado", "#6B3FD0"], ["rosa", "Rosa", "#C0266F"],
  ["verde", "Verde", "#147A57"], ["rojo", "Rojo", "#C2262E"], ["turquesa", "Turquesa", "#0B7A85"], ["tierra", "Tierra", "#8A5A2B"],
];
const NOMBRE_TARJETA: Record<Tarjeta, string> = { calorias: "Calorías y macros", semana: "Últimos 7 días", comidas: "Comidas" };

// Logo: el anillo de tres macros (assets_Rayblox/iconos/macrOS/2), con los colores del tema.
const Logo = () => (
  <svg width="32" height="32" viewBox="0 0 100 100" aria-hidden="true" style={{ flexShrink: 0 }}>
    {([["var(--p)", -80], ["var(--c)", 40], ["var(--g)", 160]] as const).map(([c, r]) => (
      <circle key={r} cx="50" cy="50" r="27" fill="none" stroke={c} strokeWidth="11" strokeLinecap="round" strokeDasharray="36 133.6" transform={`rotate(${r} 50 50)`} />
    ))}
  </svg>
);

function Seccion({ titulo, resumen, abierta, children }: { titulo: string; resumen: string; abierta?: boolean; children: ReactNode }) {
  return (
    <details className="list fold" open={abierta}>
      <summary className="row" style={{ borderBottom: 0 }}>
        <span className="grow"><span className="name">{titulo}</span><span className="sub">{resumen}</span></span>
        <span className="chev" aria-hidden="true"><Chevron /></span>
      </summary>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--s3)", padding: "0 var(--s4) var(--s4)" }}>{children}</div>
    </details>
  );
}

export default function Configuracion({ tema, onTema, color, onColor, texto, onTexto, densidad, onDensidad, hoy, onHoy, comidas, onComidas, dev, onSalirDev, ocultos, onRestaurar, onExportar, onImportar, token, onToken, mios, onSubirMios, upd, onActualizaciones, onCerrar }: {
  tema: Tema; onTema: (t: Tema) => void; color: Color; onColor: (c: Color) => void;
  texto: Texto; onTexto: (t: Texto) => void; densidad: Densidad; onDensidad: (d: Densidad) => void; hoy: PrefHoy; onHoy: (h: PrefHoy) => void; comidas: PrefComidas; onComidas: (c: PrefComidas) => void; dev: boolean; onSalirDev: () => void;
  ocultos: number; onRestaurar: () => void;
  onExportar: () => Promise<void>; onImportar: (texto: string) => Promise<string | null>;
  token: string; onToken: (t: string) => Promise<void>; mios: number; onSubirMios: () => Promise<string>;
  upd: EstadoUpd; onActualizaciones: () => void; onCerrar: () => void;
}) {
  const [aviso, setAviso] = useState("");
  const [nuevoToken, setNuevoToken] = useState("");
  const [avisoBase, setAvisoBase] = useState("");
  const [nuevoTiempo, setNuevoTiempo] = useState("");
  const nVisibles = comidas.lista.length - comidas.ocultas.length;

  const nueva = apkNuevo(upd, __VERSION__);

  return (
    <main className="screen" style={{ paddingBottom: 40 }}>
      <header className="head" style={{ flexDirection: "column", alignItems: "flex-start", gap: 6 }}>
        <button className="pill" style={{ background: "none", paddingLeft: 0 }} onClick={onCerrar}>← Objetivos</button>
        <h1>Configuración</h1>
      </header>

      <Seccion titulo="Apariencia" resumen="Tema, color, tamaño y densidad" abierta>
        <Seg label="Tema" value={tema} options={[["sistema", "Sistema"], ["claro", "Claro"], ["oscuro", "Oscuro"]]} onChange={onTema} />
        <span className="label">Color</span>
        <div role="group" aria-label="Color" style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {COLORES.map(([id, label, hex]) => (
            <button key={id} className="sw" aria-label={label} aria-pressed={color === id} onClick={() => onColor(id)}
              style={{ width: 44, height: 44, borderRadius: "var(--r-full)", background: hex, border: "3px solid var(--surface)", boxShadow: color === id ? "0 0 0 2px var(--text)" : "0 0 0 1px var(--line)" }} />
          ))}
        </div>
        <span className="label">Tamaño</span>
        <Seg label="Tamaño" value={texto} options={[["chico", "Chico"], ["normal", "Normal"], ["grande", "Grande"]]} onChange={onTexto} />
        <span className="label">Densidad</span>
        <Seg label="Densidad" value={densidad} options={[["comoda", "Cómoda"], ["compacta", "Compacta"]]} onChange={onDensidad} />
      </Seccion>

      <Seccion titulo="Pantalla Hoy" resumen="Qué tarjetas ves y en qué orden">
        <span className="sub">También puedes mantener presionada una tarjeta en Hoy y arrastrarla.</span>
        <div className="list" style={{ background: "var(--surface2)" }}>
          {hoy.orden.map((t, i) => {
            const visible = !hoy.ocultas.includes(t);
            return (
              <div key={t} className="row" style={{ paddingTop: 6, paddingBottom: 6 }}>
                <span className="grow"><span className="name" style={{ opacity: visible ? 1 : 0.5 }}>{NOMBRE_TARJETA[t]}</span></span>
                <button className="icon-btn" style={{ background: "var(--surface)" }} aria-label={`Subir ${NOMBRE_TARJETA[t]}`} disabled={i === 0} onClick={() => onHoy({ ...hoy, orden: mover(hoy.orden, t, -1) })}>↑</button>
                <button className="icon-btn" style={{ background: "var(--surface)" }} aria-label={`Bajar ${NOMBRE_TARJETA[t]}`} disabled={i === hoy.orden.length - 1} onClick={() => onHoy({ ...hoy, orden: mover(hoy.orden, t, 1) })}>↓</button>
                <button className="pill" style={{ minWidth: 84, justifyContent: "center", background: visible ? "var(--surface)" : "transparent" }} aria-pressed={visible}
                  onClick={() => onHoy({ ...hoy, ocultas: visible ? [...hoy.ocultas, t] : hoy.ocultas.filter((x) => x !== t) })}>{visible ? "Visible" : "Oculta"}</button>
              </div>
            );
          })}
        </div>
      </Seccion>

      <Seccion titulo="Tiempos de comida" resumen={`${nVisibles} en tu día`}>
        <span className="sub">Toca un nombre para cambiarlo. Oculta los que no haces (por ejemplo, el desayuno si ayunas) o agrega más. Lo ya registrado no se pierde.</span>
        <div className="list" style={{ background: "var(--surface2)" }}>
          {comidas.lista.map((t, i) => {
            const visible = !comidas.ocultas.includes(t.id);
            return (
              <div key={t.id} className="row" style={{ paddingTop: 6, paddingBottom: 6 }}>
                <input className="name renombrar" aria-label={`Nombre de ${t.label}`} defaultValue={t.label} maxLength={24} enterKeyHint="done" style={{ opacity: visible ? 1 : 0.5 }}
                  onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                  onBlur={(e) => {
                    const v = e.currentTarget.value.trim();
                    if (!v) e.currentTarget.value = t.label; // vacío no: vuelve el nombre anterior
                    else if (v !== t.label) onComidas({ ...comidas, lista: comidas.lista.map((x) => (x.id === t.id ? { ...x, label: v } : x)) });
                  }} />
                <button className="icon-btn" style={{ background: "var(--surface)" }} aria-label={`Subir ${t.label}`} disabled={i === 0} onClick={() => onComidas({ ...comidas, lista: mover(comidas.lista, t, -1) })}>↑</button>
                <button className="icon-btn" style={{ background: "var(--surface)" }} aria-label={`Bajar ${t.label}`} disabled={i === comidas.lista.length - 1} onClick={() => onComidas({ ...comidas, lista: mover(comidas.lista, t, 1) })}>↓</button>
                <button className="pill" style={{ minWidth: 84, justifyContent: "center", background: visible ? "var(--surface)" : "transparent" }} aria-pressed={visible} disabled={visible && nVisibles === 1}
                  onClick={() => onComidas({ ...comidas, ocultas: visible ? [...comidas.ocultas, t.id] : comidas.ocultas.filter((x) => x !== t.id) })}>{visible ? "Visible" : "Oculto"}</button>
              </div>
            );
          })}
        </div>
        <form style={{ display: "flex", gap: 8 }} onSubmit={(e) => { e.preventDefault(); if (nuevoTiempo.trim()) onComidas(agregarTiempo(comidas, nuevoTiempo)); setNuevoTiempo(""); }}>
          <div className="box" style={{ flex: 1, height: 44 }}>
            <label htmlFor="tiempo" className="sr">Nuevo tiempo de comida</label>
            <input id="tiempo" placeholder="Ej. Colación noche" maxLength={24} value={nuevoTiempo} onChange={(e) => setNuevoTiempo(e.target.value)} style={{ fontSize: 14, fontWeight: 500 }} />
          </div>
          <button className="pill solid" style={{ height: 44 }} disabled={!nuevoTiempo.trim()}>Agregar</button>
        </form>
      </Seccion>

      <Seccion titulo="Datos" resumen="Compartir, importar y restaurar">
        <div className="list" style={{ background: "var(--surface2)" }}>
          <div className="row">
            <div className="grow"><span className="name">Compartir mis alimentos y recetas</span><span className="sub">Archivo para pasarlos a otro teléfono</span></div>
            <button className="pill" style={{ background: "var(--surface)" }} onClick={() => onExportar().catch(() => {})}>Compartir</button>
          </div>
          <div className="row">
            <div className="grow"><span className="name">Importar</span><span className="sub">De otro MacrOS o de la app anterior (userDB)</span></div>
            <label className="pill" style={{ cursor: "pointer", background: "var(--surface)" }}>
              Elegir archivo
              <input type="file" accept=".json,application/json,text/plain" className="sr" onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (!f) return;
                try { setAviso((await onImportar(await f.text())) ?? ""); } catch (err) { setAviso((err as Error).message); }
              }} />
            </label>
          </div>
          {ocultos > 0 && (
            <div className="row">
              <div className="grow"><span className="name">Alimentos borrados de la base</span><span className="sub">{ocultos} ocultos</span></div>
              <button className="pill" style={{ background: "var(--surface)" }} onClick={onRestaurar}>Restaurar</button>
            </div>
          )}
        </div>
        {aviso && <span className="sub" role="status">{aviso}</span>}
      </Seccion>

      {dev && <Seccion titulo="Base compartida" resumen={token ? "Modo dev · eres editor" : "Modo dev"}>
        <span className="sub">
          {token
            ? "Eres editor: lo que crees, edites o borres en Alimentos se guarda para todos los que tienen la app, y vuelve aunque la reinstales."
            : "Todos los que tienen la app reciben los alimentos de la base compartida. Para editarla, pega un token de GitHub con permiso de escribir en el repo."}
        </span>
        {token ? (
          <div className="list" style={{ background: "var(--surface2)" }}>
            <div className="row">
              <div className="grow"><span className="name">Token guardado</span><span className="sub">Solo en este cel</span></div>
              <button className="pill" style={{ background: "var(--surface)" }} onClick={() => { onToken(""); setAvisoBase(""); }}>Quitar</button>
            </div>
            {mios > 0 && (
              <div className="row">
                <div className="grow"><span className="name">Tus alimentos de este cel</span><span className="sub">{mios} que solo existen aquí</span></div>
                <button className="pill solid" onClick={async () => { try { setAvisoBase(await onSubirMios()); } catch (e) { setAvisoBase((e as Error).message); } }}>Subir</button>
              </div>
            )}
          </div>
        ) : (
          <form style={{ display: "flex", gap: 8 }} onSubmit={(e) => { e.preventDefault(); if (nuevoToken.trim()) onToken(nuevoToken.trim()); setNuevoToken(""); }}>
            <div className="box" style={{ flex: 1, height: 44 }}>
              <label htmlFor="token" className="sr">Token de GitHub</label>
              <input id="token" type="password" autoComplete="off" placeholder="github_pat_…" value={nuevoToken} onChange={(e) => setNuevoToken(e.target.value)} style={{ fontSize: 14, fontWeight: 500 }} />
            </div>
            <button className="pill solid" style={{ height: 44 }} disabled={!nuevoToken.trim()}>Guardar</button>
          </form>
        )}
        {avisoBase && <span className="sub" role="status">{avisoBase}</span>}
        <button className="pill" style={{ alignSelf: "flex-start" }} onClick={onSalirDev}>Salir del modo dev</button>
      </Seccion>}

      <div className="list">
        <button className="row" onClick={onActualizaciones}>
          <Logo />
          <span className="grow">
            <span className="name">Actualizaciones</span>
            <span className="sub">{nueva ? `Hay una versión nueva: ${nueva.version}` : `MacrOS ${__VERSION__}`}</span>
          </span>
          {nueva && <span className="badge" style={{ background: "var(--accent)", color: "var(--on-accent)" }}>Nueva</span>}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
        </button>
      </div>
    </main>
  );
}
