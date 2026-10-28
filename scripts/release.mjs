// Publicar desde esta PC (lo normal es que GitHub Actions lo haga solo al subir a main).
// Antes: sube "version" en package.json y agrega su sección en CHANGELOG.md.
import { execFileSync } from "node:child_process";
import { copyFileSync, readFileSync } from "node:fs";

const { version } = JSON.parse(readFileSync("package.json", "utf8"));
const run = (cmd, args) => execFileSync(cmd, args, { stdio: "inherit" });

// npm en Windows es un .cmd y necesita shell; gh no (con shell se partirían los textos con espacios)
execFileSync("npm", ["run", "apk"], { stdio: "inherit", shell: process.platform === "win32" });
copyFileSync("android/app/build/outputs/apk/debug/app-debug.apk", "macros.apk");
const notas = execFileSync("node", ["scripts/notas.mjs"], { encoding: "utf8" });
run("gh", ["release", "create", `v${version}`, "macros.apk", "-R", "2023030519/macros", "--title", `MacrOS ${version}`, "--notes", notas]);
