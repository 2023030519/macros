import { Capacitor } from "@capacitor/core";
import { Directory, Encoding, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

// En el cel abre el menú de compartir de Android (WhatsApp, Drive, correo…); en el navegador lo descarga.
export async function compartir(archivo: string, texto: string) {
  if (!Capacitor.isNativePlatform()) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([texto], { type: "application/json" }));
    a.download = archivo;
    a.click();
    return;
  }
  const { uri } = await Filesystem.writeFile({ path: archivo, data: texto, directory: Directory.Cache, encoding: Encoding.UTF8 });
  await Share.share({ title: "MacrOS", files: [uri] });
}

export const nombreArchivo = (base: string) => `macros-${base.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.json`;
