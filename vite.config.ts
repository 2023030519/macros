import { readFileSync } from "node:fs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const { version } = JSON.parse(readFileSync("package.json", "utf8"));

export default defineConfig({ plugins: [react()], define: { __VERSION__: JSON.stringify(version) } });
