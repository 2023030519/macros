// Versión de escritorio: una ventana que carga el mismo dist/ que el APK.
// Los datos (Preferences = localStorage aquí) quedan en %APPDATA%\MacrOS, separados del cel.
const { app, BrowserWindow, Menu, shell } = require("electron");
const path = require("node:path");

if (!app.requestSingleInstanceLock()) app.quit();
// el mismo id que el acceso directo del instalador: así la ventana y el ícono anclado en la barra de tareas son uno
app.setAppUserModelId("mx.hecto.macros");

function ventana() {
  const win = new BrowserWindow({
    width: 1280, height: 840, minWidth: 380, minHeight: 600,
    title: "MacrOS", icon: path.join(__dirname, "icon.png"), backgroundColor: "#F4F5F7", show: false,
  });
  win.once("ready-to-show", () => win.show());
  win.loadFile(path.join(__dirname, "..", "dist", "index.html"));

  // Enlaces y descargas (GitHub, el .exe nuevo) se abren en el navegador, no dentro de la app.
  const externo = (url) => url.startsWith("http") && (shell.openExternal(url), true);
  win.webContents.setWindowOpenHandler(({ url }) => (externo(url), { action: "deny" }));
  win.webContents.on("will-navigate", (e, url) => externo(url) && e.preventDefault());

  // Esc y el botón "atrás" del mouse hacen lo que el atrás de Android: cierran la hoja o pantalla de encima.
  const atras = () => win.webContents.navigationHistory.canGoBack() && win.webContents.navigationHistory.goBack();
  win.webContents.on("before-input-event", (_, i) => i.type === "keyDown" && i.key === "Escape" && atras());
  win.on("app-command", (_, cmd) => cmd === "browser-backward" && atras());
  return win;
}

Menu.setApplicationMenu(null);
app.whenReady().then(ventana);
app.on("second-instance", () => BrowserWindow.getAllWindows()[0]?.focus());
app.on("window-all-closed", () => app.quit());
