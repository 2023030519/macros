import { useState } from "react";
import { REPO, esMasNueva } from "../lib/version.ts";
import { Seg } from "../ui.tsx";

export type Tema = "sistema" | "claro" | "oscuro";
type Estado = { t: "nada" } | { t: "buscando" } | { t: "al-dia" } | { t: "nueva"; version: string; url: string } | { t: "error"; msg: string };

export default function Configuracion({ tema, onTema, ocultos, onRestaurar, onCerrar }: {
  tema: Tema; onTema: (t: Tema) => void; ocultos: number; onRestaurar: () => void; onCerrar: () => void;
}) {
  const [upd, setUpd] = useState<Estado>({ t: "nada" });

  async function buscar() {
    setUpd({ t: "buscando" });
    try {
      const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`);
      if (!res.ok) throw new Error(res.status === 404 ? "No hay versiones publicadas (o el repo es privado)." : `GitHub respondió ${res.status}.`);
      const rel = await res.json();
      const apk = rel.assets?.find((a: { name: string }) => a.name.endsWith(".apk"));
      if (!esMasNueva(rel.tag_name, __VERSION__)) return setUpd({ t: "al-dia" });
      if (!apk) throw new Error(`La versión ${rel.tag_name} no trae APK.`);
      setUpd({ t: "nueva", version: rel.tag_name, url: apk.browser_download_url });
    } catch (e) {
      setUpd({ t: "error", msg: e instanceof TypeError ? "Sin conexión." : (e as Error).message });
    }
  }

  return (
    <main className="screen" style={{ paddingBottom: 40, gap: 18 }}>
      <header className="head" style={{ flexDirection: "column", alignItems: "flex-start", gap: 6 }}>
        <button className="pill" style={{ border: 0, background: "none", paddingLeft: 0 }} onClick={onCerrar}>← Objetivos</button>
        <h1>Configuración</h1>
      </header>

      <section className="field" aria-label="Apariencia">
        <h2>Apariencia</h2>
        <Seg label="Tema" value={tema} options={[["sistema", "Sistema"], ["claro", "Claro"], ["oscuro", "Oscuro"]]} onChange={onTema} />
      </section>

      {ocultos > 0 && (
        <section className="field" aria-label="Datos">
          <h2>Datos</h2>
          <div className="list">
            <div className="row">
              <div className="grow"><span className="name">Alimentos borrados de la base</span><span className="sub">{ocultos} ocultos</span></div>
              <button className="pill" onClick={onRestaurar}>Restaurar</button>
            </div>
          </div>
        </section>
      )}

      <section className="field" aria-label="Actualizaciones">
        <h2>App</h2>
        <div className="list">
          <div className="row">
            <div className="grow">
              <span className="name">MacrOS {__VERSION__}</span>
              <span className="sub" role="status">
                {upd.t === "buscando" ? "Buscando…" : upd.t === "al-dia" ? "Tienes la última versión." : upd.t === "nueva" ? `Hay una versión nueva: ${upd.version}` : upd.t === "error" ? upd.msg : "Las versiones se publican en GitHub."}
              </span>
            </div>
            {upd.t === "nueva"
              // abre el navegador del cel, que descarga el APK; Android pide confirmar la instalación
              ? <button className="pill solid" onClick={() => { location.href = upd.url; }}>Descargar</button>
              : <button className="pill" disabled={upd.t === "buscando"} onClick={buscar}>Buscar actualización</button>}
          </div>
        </div>
        <span className="sub">Al instalar la versión nueva se conservan tus datos.</span>
      </section>
    </main>
  );
}
