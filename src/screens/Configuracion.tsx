import { useState } from "react";
import { apkNuevo, type EstadoUpd } from "../lib/version.ts";
import { Seg } from "../ui.tsx";

export type Tema = "sistema" | "claro" | "oscuro";
export type Color = "neutro" | "azul" | "morado" | "rosa" | "verde";
// muestra del color en el botón; los valores reales (claro/oscuro) están en styles.css
const COLORES: [Color, string, string][] = [
  ["neutro", "Neutro", "#121212"], ["azul", "Azul", "#2456D6"], ["morado", "Morado", "#6B3FD0"], ["rosa", "Rosa", "#C0266F"], ["verde", "Verde", "#147A57"],
];


export default function Configuracion({ tema, onTema, color, onColor, ocultos, onRestaurar, onExportar, onImportar, token, onToken, mios, onSubirMios, upd, onActualizaciones, onCerrar }: {
  tema: Tema; onTema: (t: Tema) => void; color: Color; onColor: (c: Color) => void; ocultos: number; onRestaurar: () => void;
  onExportar: () => Promise<void>; onImportar: (texto: string) => Promise<string | null>;
  token: string; onToken: (t: string) => Promise<void>; mios: number; onSubirMios: () => Promise<string>;
  upd: EstadoUpd; onActualizaciones: () => void; onCerrar: () => void;
}) {
  const [aviso, setAviso] = useState("");
  const [nuevoToken, setNuevoToken] = useState("");
  const [avisoBase, setAvisoBase] = useState("");

  const nueva = apkNuevo(upd, __VERSION__);

  return (
    <main className="screen" style={{ paddingBottom: 40, gap: 18 }}>
      <header className="head" style={{ flexDirection: "column", alignItems: "flex-start", gap: 6 }}>
        <button className="pill" style={{ border: 0, background: "none", paddingLeft: 0 }} onClick={onCerrar}>← Objetivos</button>
        <h1>Configuración</h1>
      </header>

      <section className="field" aria-label="Apariencia">
        <h2>Apariencia</h2>
        <Seg label="Tema" value={tema} options={[["sistema", "Sistema"], ["claro", "Claro"], ["oscuro", "Oscuro"]]} onChange={onTema} />
        <div role="group" aria-label="Color" style={{ display: "flex", gap: 10, paddingTop: 6 }}>
          {COLORES.map(([id, label, hex]) => (
            <button key={id} aria-label={label} aria-pressed={color === id} onClick={() => onColor(id)}
              style={{ width: 44, height: 44, borderRadius: 99, background: hex, border: "3px solid var(--bg)", boxShadow: color === id ? "0 0 0 2px var(--text)" : "0 0 0 1px var(--line)" }} />
          ))}
        </div>
      </section>

      <section className="field" aria-label="Datos">
        <h2>Datos</h2>
        <div className="list">
          <div className="row">
            <div className="grow"><span className="name">Compartir mis alimentos y recetas</span><span className="sub">Archivo para pasarlos a otro teléfono</span></div>
            <button className="pill" onClick={() => onExportar().catch(() => {})}>Compartir</button>
          </div>
          <div className="row">
            <div className="grow"><span className="name">Importar</span><span className="sub">De otro MacrOS o de la app anterior (userDB)</span></div>
            <label className="pill" style={{ cursor: "pointer" }}>
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
              <button className="pill" onClick={onRestaurar}>Restaurar</button>
            </div>
          )}
        </div>
        {aviso && <span className="sub" role="status">{aviso}</span>}
      </section>

      <section className="field" aria-label="Base compartida">
        <h2>Base compartida</h2>
        <span className="sub">
          {token
            ? "Eres editor: lo que crees, edites o borres en Alimentos se guarda para todos los que tienen la app, y vuelve aunque la reinstales."
            : "Todos los que tienen la app reciben los alimentos de la base compartida. Para editarla, pega un token de GitHub con permiso de escribir en el repo."}
        </span>
        {token ? (
          <div className="list">
            <div className="row">
              <div className="grow"><span className="name">Token guardado</span><span className="sub">Solo en este cel</span></div>
              <button className="pill" onClick={() => { onToken(""); setAvisoBase(""); }}>Quitar</button>
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
      </section>

      <div className="list">
        <button className="row" onClick={onActualizaciones}>
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
