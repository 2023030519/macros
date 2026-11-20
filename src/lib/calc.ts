// Lógica de la calculadora anterior (calculadora.txt), sin cambios salvo el tope de carbs en 0.
export const ACTIVITY_FACTORS = {
  sedentario: 1.2,
  ligero: 1.375,
  moderado: 1.55,
  activo: 1.725,
  muy_activo: 1.9,
};

export const AJUSTE_KCAL = {
  perder_grasa: -400,
  ganar_musculo: +250,
  mantenimiento: 0,
};

export const GRAMOS_POR_KILO = {
  sedentario: { prot: 1.3, grasas: 0.7 },
  ligero: { prot: 1.5, grasas: 0.8 },
  moderado: { prot: 1.5, grasas: 1 },
  activo: { prot: 2, grasas: 1 },
  muy_activo: { prot: 2, grasas: 1.2 },
};

export type Actividad = keyof typeof ACTIVITY_FACTORS;
export type Objetivo = keyof typeof AJUSTE_KCAL;
export type Sexo = "hombre" | "mujer";
// deficit/volumen: kcal que elige el usuario (positivas); sin valor se usa AJUSTE_KCAL
export type Perfil = { peso: number; altura: number; edad: number; sexo: Sexo; actividad: Actividad; objetivo: Objetivo; deficit?: number; volumen?: number };

export const AJUSTE_MAX = 1500; // más que esto es casi seguro un error de dedo

export function ajusteKcal(p: Pick<Perfil, "objetivo" | "deficit" | "volumen">) {
  if (p.objetivo === "perder_grasa") return -(p.deficit ?? -AJUSTE_KCAL.perder_grasa);
  if (p.objetivo === "ganar_musculo") return p.volumen ?? AJUSTE_KCAL.ganar_musculo;
  return 0;
}

export function calcMifflin(peso: number, altura: number, edad: number, sexo: Sexo) {
  const base = 10 * peso + 6.25 * altura - 5 * edad;
  return sexo === "hombre" ? base + 5 : base - 161;
}

export function calcTDEE(tmb: number, actividad: Actividad) {
  return Math.round(tmb * ACTIVITY_FACTORS[actividad]);
}

export function calcMacros(tdee: number, ajuste: number, peso: number, actividad: Actividad) {
  const kcalObjetivo = tdee + ajuste;

  const factores = GRAMOS_POR_KILO[actividad];
  const prot = Math.round(peso * factores.prot);
  const grasas = Math.round(peso * factores.grasas);

  const kcalProt = prot * 4;
  const kcalGrasas = grasas * 9;
  // con mucho peso y poca meta, prot + grasas pueden pasarse de la meta
  const kcalCarbs = Math.max(0, kcalObjetivo - kcalProt - kcalGrasas);
  const carbs = Math.round(kcalCarbs / 4);

  const pctProt = Math.round((kcalProt / kcalObjetivo) * 100);
  const pctGrasas = Math.round((kcalGrasas / kcalObjetivo) * 100);
  const pctCarbs = Math.max(0, 100 - pctProt - pctGrasas);

  return { kcal_objetivo: kcalObjetivo, prot, carbs, grasas, pctProt, pctCarbs, pctGrasas };
}

// Zancada ≈ 41.4 % de la estatura; solo se usa si no escribiste los km.
export const kmDePasos = (pasos: number, altura: number) => (pasos * altura * 0.414) / 100_000;

// Caminar, sin lo que ya cuenta el basal: ACSM ≈ 0.5 kcal por kg y km.
export const kcalCaminando = (km: number, peso: number) => Math.round(km * peso * 0.5);

export function plan(p: Perfil) {
  const tmb = calcMifflin(p.peso, p.altura, p.edad, p.sexo);
  const tdee = calcTDEE(tmb, p.actividad);
  return { tmb: Math.round(tmb), tdee, ...calcMacros(tdee, ajusteKcal(p), p.peso, p.actividad) };
}
