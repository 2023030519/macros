import { useEffect, useState } from "react";
import { REPO, esMasNueva } from "../lib/version.ts";
import { Seg } from "../ui.tsx";

export type Tema = "sistema" | "claro" | "oscuro";
export type Color = "neutro" | "azul" | "morado" | "rosa" | "verde";
// muestra del color en el botón; los valores reales (claro/oscuro) están en styles.css
const COLORES: [Color, string, string][] = [
  ["neutro", "Neutro", "#121212"], ["azul", "Azul", "#2456D6"], ["morado", "Morado", "#6B3FD0"], ["rosa", "Rosa", "#C0266F"], ["verde", "Verde", "#147A57"],
];

type Release = { tag_name: string; name: string; body: string; published_at: string; assets: { name: string; browser_download_url: string }[] };
type Estado = { t: "buscando" } | { t: "listo"; releases: Release[] } | { t: "error"; msg: string };

export default function Configuracion({ tema, onTema, color, onColor, ocultos, onRestaurar, onExportar, onImportar, token, onToken, mios, onSubirMios, onCerrar }: {
  tema: Tema; onTema: (t: Tema) => void; color: Color; onColor: (c: Color) => void; ocultos: number; onRestaurar: () => void;
  onExportar: () => Promise<void>; onImportar: (texto: string) => Promise<string | null>;
  token: string; onToken: (t: string) => Promise<void>; mios: number; onSubirMios: () => Promise<string>; onCerrar: () => void;
}) {
  const [upd, setUpd] = useState<Estado>({ t: "buscando" });
  const [aviso, setAviso] = useState("");
  const [nuevoToken, setNuevoToken] = useState("");
  const [avisoBase, setAvisoBase] = useState("");

  async function buscar() {
    setUpd({ t: "buscando" });
    try {
      const res = await fetch(`https://api.github.com/repos/${REPO}/releases?per_page=15`);
      if (!res.ok) throw new Error(`GitHub respondió ${res.status}.`);
      setUpd({ t: "listo", releases: await res.json() });
    } catch (e) {
      setUpd({ t: "error", msg: e instanceof TypeError ? "Sin conexión." : (e as Error).message });
    }
  }
  useEffect(() => { buscar(); }, []);

  const ultima = upd.t === "listo" ? upd.releases[0] : undefined;
  const apk = ultima && esMasNueva(ultima.tag_name, __VERSION__) ? ultima.assets.find((a) => a.name.endsWith(".apk")) : undefined;

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

      <section className="field" aria-label="Actualizaciones">
        <h2>Actualizaciones</h2>
        <div className="list">
          <div className="row">
            <div className="grow">
              <span className="name">MacrOS {__VERSION__}</span>
              <span className="sub" role="status">
                {upd.t === "buscando" ? "Buscando…" : upd.t === "error" ? upd.msg : apk ? `Hay una versión nueva: ${ultima!.tag_name}` : "Tienes la última versión."}
              </span>
            </div>
            {apk
              // abre el navegador del cel, que descarga el APK; Android pide confirmar la instalación y conserva tus datos
              ? <button className="pill solid" onClick={() => { location.href = apk.browser_download_url; }}>Descargar</button>
              : <button className="pill" disabled={upd.t === "buscando"} onClick={buscar}>Buscar</button>}
          </div>
        </div>
        {upd.t === "listo" && upd.releases.map((r) => {
          const nueva = esMasNueva(r.tag_name, __VERSION__);
          const actual = !nueva && !esMasNueva(__VERSION__, r.tag_name);
          return (
            <article key={r.tag_name} className="card" style={{ padding: 16, gap: 8, borderRadius: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <b style={{ fontSize: 15 }}>{r.tag_name}</b>
                <span className="sub">{new Date(r.published_at).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })}</span>
                {(nueva || actual) && <span className="badge" style={nueva ? { background: "var(--accent)", color: "var(--on-accent)" } : undefined}>{nueva ? "Nueva" : "Instalada"}</span>}
              </div>
              <span style={{ fontSize: 14, whiteSpace: "pre-line", lineHeight: 1.45 }}>{r.body?.trim() || "Sin notas."}</span>
            </article>
          );
        })}
      </section>
    </main>
  );
}
