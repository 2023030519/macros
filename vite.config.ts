import { readFileSync } from "node:fs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const { version } = JSON.parse(readFileSync("package.json", "utf8"));

// base relativa: el .exe abre dist/index.html desde file://
export default defineConfig({ base: "./", plugins: [react()],define: { __VERSION__: JSON.stringify(version) } });
