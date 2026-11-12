// Qué se comparte entre el cel y la compu: tus datos. La apariencia, las llaves (Gemini, GitHub) y la copia de la base se quedan en cada dispositivo.
const CLAVES = new Set(["perfil", "mios", "recetas", "menu", "ocultos", "comidas", "hoy"]);
export const sincronizable = (clave: string) => CLAVES.has(clave) || clave.startsWith("log:");

// Al vincular un dispositivo gana lo que ya está en la nube; lo que solo existe aquí se sube.
export function soloAqui(locales: string[], enLaNube: string[]) {
  const nube = new Set(enLaNube);
  return locales.filter((k) => sincronizable(k) && !nube.has(k));
}
