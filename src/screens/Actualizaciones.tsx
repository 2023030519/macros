import { apkNuevo, esMasNueva, type EstadoUpd } from "../lib/version.ts";

export default function Actualizaciones({ upd, onBuscar, onCerrar }: { upd: EstadoUpd; onBuscar: () => void; onCerrar: () => void }) {
  const nueva = apkNuevo(upd, __VERSION__);
  return (
    <main className="screen" style={{ paddingBottom: 40, gap: 18 }}>
      <header className="head" style={{ flexDirection: "column", alignItems: "flex-start", gap: 6 }}>
        <button className="pill" style={{ border: 0, background: "none", paddingLeft: 0 }} onClick={onCerrar}>← Configuración</button>
        <h1>Actualizaciones</h1>
      </header>

      <div className="list">
        <div className="row">
          <div className="grow">
            <span className="name">MacrOS {__VERSION__}</span>
            <span className="sub" role="status">
              {upd.t === "buscando" ? "Buscando…" : upd.t === "error" ? upd.msg : nueva ? `Hay una versión nueva: ${nueva.version}` : "Tienes la última versión."}
            </span>
          </div>
          {nueva?.url
            // abre el navegador del cel, que descarga el APK; Android pide confirmar la instalación y conserva tus datos
            ? <button className="pill solid" onClick={() => { location.href = nueva.url!; }}>Descargar</button>
            : <button className="pill" disabled={upd.t === "buscando"} onClick={onBuscar}>Buscar</button>}
        </div>
      </div>

      {upd.t === "listo" && upd.releases.map((r) => {
        const esNueva = esMasNueva(r.tag_name, __VERSION__);
        const instalada = !esNueva && !esMasNueva(__VERSION__, r.tag_name);
        return (
          // colapsadas; las nuevas abiertas para ver qué trae la actualización
          <details key={r.tag_name} className="card upd" open={esNueva} style={{ padding: 0, gap: 0, borderRadius: 20 }}>
            <summary style={{ display: "flex", alignItems: "center", gap: 8, padding: 16, minHeight: 24, cursor: "pointer" }}>
              <b style={{ fontSize: 15 }}>{r.tag_name}</b>
              <span className="sub">{new Date(r.published_at).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })}</span>
              {(esNueva || instalada) && <span className="badge" style={esNueva ? { background: "var(--accent)", color: "var(--on-accent)" } : undefined}>{esNueva ? "Nueva" : "Instalada"}</span>}
              <span className="chev" aria-hidden="true" style={{ marginLeft: "auto" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
              </span>
            </summary>
            <p style={{ margin: 0, padding: "0 16px 16px", fontSize: 14, whiteSpace: "pre-line", lineHeight: 1.45 }}>{r.body?.trim() || "Sin notas."}</p>
          </details>
        );
      })}
    </main>
  );
}
