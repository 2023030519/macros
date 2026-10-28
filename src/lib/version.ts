export const REPO = "2023030519/macros";

// "v0.10.0" > "0.9.3"
export function esMasNueva(remota: string, local: string) {
  const a = remota.replace(/^v/, "").split(".").map(Number);
  const b = local.replace(/^v/, "").split(".").map(Number);
  for (let i = 0; i < 3; i++) if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) > (b[i] || 0);
  return false;
}

export type Release = { tag_name: string; body: string; published_at: string; assets: { name: string; browser_download_url: string }[] };
export type EstadoUpd = { t: "buscando" } | { t: "listo"; releases: Release[] } | { t: "error"; msg: string };

export async function buscarReleases(): Promise<EstadoUpd> {
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases?per_page=15`, { cache: "no-store" });
    if (!res.ok) return { t: "error", msg: `GitHub respondió ${res.status}.` };
    return { t: "listo", releases: await res.json() };
  } catch {
    return { t: "error", msg: "Sin conexión." };
  }
}

// El APK de la versión más nueva, si es más nueva que la instalada.
export function apkNuevo(e: EstadoUpd, actual: string) {
  const r = e.t === "listo" ? e.releases[0] : undefined;
  return r && esMasNueva(r.tag_name, actual) ? { version: r.tag_name, url: r.assets.find((a) => a.name.endsWith(".apk"))?.browser_download_url } : null;
}
