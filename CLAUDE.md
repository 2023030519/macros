# MacrOS

App personal de macros para Android (Capacitor 6 + React + Vite). Sin cuentas: todo vive en el teléfono (`@capacitor/preferences`).

- `npm run dev` · `npm test` · `npm run build`
- Lógica de calorías: `src/lib/calc.ts` (viene de la calculadora anterior; no cambiar fórmulas sin pedirlo).
- Diseño de referencia (solo aspecto): canvas "MacrOS" en claude.ai.

## Publicar una versión
1. Sube `"version"` en `package.json` (0.3.0 → 0.3.1).
2. Agrega `## <versión>` con sus cambios en `CHANGELOG.md`, en palabras para el usuario. Es lo que se ve en la app.
3. Sube a `main`. GitHub Actions prueba, compila y publica el release; en el cel: Configuración → Actualizaciones → Descargar.

El APK se firma con la llave del secreto `DEBUG_KEYSTORE`; si cambia, Android no deja actualizar sin desinstalar (y se pierden los datos).

## Base compartida
`data/alimentos.json` son los cambios sobre la base de `src/data/foods.ts` (alimentos editados/nuevos y `borrados`). La app la descarga al abrir y, con token, la escribe con commits directos a `main` (haz `git pull` antes de trabajar). Esos commits no disparan release.
