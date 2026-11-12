// Leer la declaración nutrimental de una foto con Gemini. La llave la pega cada quien en Configuración
// (se guarda en el cel); nunca va en el código porque el repo y los APK son públicos.
// gemini-flash-latest pasaba el día en 503 (nov 2026); 3.5-flash contesta en ~4 s. Si lo retiran (404, como a 2.5-flash),
// se satura o tarda, va el alias lite, que siempre apunta a un modelo vivo.
// shortcut: cuando 3.5-flash dé 404 siempre, cambiarlo por el flash vigente en aistudio.google.com.
const MODELOS = ["gemini-3.5-flash", "gemini-flash-lite-latest"];
const NO_TABLA = "No encontré la tabla nutrimental. Toma la foto más de cerca y con luz.";

export type Respuesta = {
  encontrada: boolean; nombre: string; base_g: number; porcion_g: number;
  kcal: number; proteina: number; carbohidratos: number; grasas: number; fibra: number;
};

const PROMPT = `Lee la declaración nutrimental (tabla de información nutricional) de la foto.
Si tiene columna por 100 g o 100 ml, usa esa y pon base_g = 100. Si no, usa la columna por porción y pon base_g = gramos o ml de esa porción.
Energía en kcal, no kJ. carbohidratos = carbohidratos disponibles o totales. fibra = fibra dietética. Si un dato no aparece, pon 0.
porcion_g = gramos o ml de una porción si la etiqueta la dice, si no 0. nombre = nombre corto del producto en español si se ve, si no "".
encontrada = false si en la foto no hay una tabla nutrimental legible.`;

const num = { type: "NUMBER" };
const ESQUEMA = {
  type: "OBJECT",
  properties: { encontrada: { type: "BOOLEAN" }, nombre: { type: "STRING" }, base_g: num, porcion_g: num, kcal: num, proteina: num, carbohidratos: num, grasas: num, fibra: num },
  required: ["encontrada", "nombre", "base_g", "porcion_g", "kcal", "proteina", "carbohidratos", "grasas", "fibra"],
};

// La regla de tres a 100 g la hace la app, no la IA.
export function aCien(r: Respuesta) {
  if (!r.encontrada || !(r.base_g > 0)) throw new Error(NO_TABLA);
  const n = (v: number) => (Number.isFinite(v) && v > 0 ? +((v * 100) / r.base_g).toFixed(1) : 0);
  return { nombre: r.nombre.trim().toLowerCase(), kcal: n(r.kcal), p: n(r.proteina), c: n(r.carbohidratos), g: n(r.grasas), f: n(r.fibra), porcion: r.porcion_g > 0 ? r.porcion_g : 0 };
}

// Las fotos del cel pesan varios MB; a 1280 px los números de la tabla se siguen leyendo.
async function jpeg(foto: Blob) {
  const img = await createImageBitmap(foto).catch(() => { throw new Error("No pude abrir esa foto. Prueba con otra o tómala con la cámara."); });
  const k = Math.min(1, 1280 / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * k);
  c.height = Math.round(img.height * k);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.85).split(",")[1];
}

export async function leerEtiqueta(llave: string, foto: Blob) {
  const body = JSON.stringify({
    contents: [{ parts: [{ inline_data: { mime_type: "image/jpeg", data: await jpeg(foto) } }, { text: PROMPT }] }],
    generationConfig: { responseMimeType: "application/json", responseSchema: ESQUEMA, temperature: 0 },
  });
  // saturado, el modelo puede tardar 15 s o más en contestar 503: a los 12 s se pasa al siguiente
  let r: Response | null = null;
  for (const m of MODELOS) {
    r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`, { method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": llave }, body, signal: AbortSignal.timeout(12000) })
      .catch((e) => { if (e.name === "TimeoutError") return null; throw new Error("Sin conexión. Llena los valores a mano o intenta de nuevo."); });
    if (r && r.status !== 404 && r.status < 500) break;
  }
  if (!r) throw new Error("Gemini tardó demasiado. Intenta de nuevo.");
  if (!r.ok) {
    const txt = await r.text();
    if (r.status === 401 || r.status === 403 || /API.?key/i.test(txt)) throw new Error("Gemini rechazó la llave. Revísala en Configuración → Leer etiquetas.");
    if (r.status === 429) throw new Error("Se acabó la cuota gratis de Gemini por ahora. Intenta más tarde.");
    if (r.status >= 500) throw new Error("Gemini está saturado. Intenta en un momento o llena los valores a mano.");
    throw new Error(`Gemini no respondió (${r.status}). Intenta de nuevo.`);
  }
  const datos = await r.json();
  try {
    return aCien(JSON.parse(datos.candidates[0].content.parts[0].text) as Respuesta);
  } catch (e) {
    throw e instanceof Error && e.message === NO_TABLA ? e : new Error(NO_TABLA);
  }
}
