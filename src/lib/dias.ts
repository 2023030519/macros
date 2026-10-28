// Fechas locales como "YYYY-MM-DD" (en-CA da ese formato).
export const iso = (d: Date) => d.toLocaleDateString("en-CA");
export const hoy = () => iso(new Date());

export function sumarDias(dia: string, n: number) {
  const [y, m, d] = dia.split("-").map(Number);
  return iso(new Date(y, m - 1, d + n));
}

// Días seguidos con registro; si hoy aún no hay nada, cuenta desde ayer.
export function racha(registrados: Set<string>, dia: string) {
  let d = registrados.has(dia) ? dia : sumarDias(dia, -1);
  let n = 0;
  while (registrados.has(d)) {
    n++;
    d = sumarDias(d, -1);
  }
  return n;
}

// Semana de lunes a domingo, como en el diseño.
export function lunes(dia: string) {
  const [y, m, d] = dia.split("-").map(Number);
  return sumarDias(dia, -((new Date(y, m - 1, d).getDay() + 6) % 7));
}
