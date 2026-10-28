// Compila el APK y lo publica como release en GitHub; el botón "Buscar actualización" lo descarga de ahí.
// Antes de correrlo, sube "version" en package.json.
import { execFileSync } from "node:child_process";
import { copyFileSync, readFileSync } from "node:fs";

const { version } = JSON.parse(readFileSync("package.json", "utf8"));
const run = (cmd, args) => execFileSync(cmd, args, { stdio: "inherit", shell: process.platform === "win32" });

run("npm", ["run", "apk"]);
copyFileSync("android/app/build/outputs/apk/debug/app-debug.apk", "macros.apk");
run("gh", ["release", "create", `v${version}`, "macros.apk", "-R", "2023030519/macros", "--title", `MacrOS ${version}`, "--notes", `Versión ${version}`]);
