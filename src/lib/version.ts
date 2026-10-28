export const REPO = "2023030519/macros";

// "v0.10.0" > "0.9.3"
export function esMasNueva(remota: string, local: string) {
  const a = remota.replace(/^v/, "").split(".").map(Number);
  const b = local.replace(/^v/, "").split(".").map(Number);
  for (let i = 0; i < 3; i++) if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) > (b[i] || 0);
  return false;
}
