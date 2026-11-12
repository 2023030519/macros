# MacrOS

App personal de macros para Android (Capacitor 6 + React + Vite). Sin cuentas: todo vive en el teléfono (`@capacitor/preferences`).

- `npm run dev` · `npm test` · `npm run build`
- Escritorio (Windows, Electron): `npm run desk` la abre; `npm run exe` deja el instalador en `release/`. Carga el mismo `dist/` (`electron/main.cjs`); el layout ancho es el `@media (min-width: 900px)` de `src/styles.css`. Sus datos viven en `%APPDATA%\MacrOS`, separados del cel (se pasan con Exportar/Importar). El release de CI también sube el `.exe`.
- Vincular cel y compu (opcional, Supabase): `src/lib/nube.ts`; tabla y RLS en `supabase/datos.sql`; URL y llave anon en `.env` (vacío = sin vincular; no se sube) y, para el release de CI, en los secretos `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` del repo. Cada clave de Preferences que pasa `sincronizable` (`src/lib/sync.ts`) es una fila; se sube en `save`/`remove` y se baja al abrir/volver. Gana el último cambio. Las cuentas se crean a mano en Supabase (registro desactivado).
- Lógica de calorías: `src/lib/calc.ts` (viene de la calculadora anterior; no cambiar fórmulas sin pedirlo).
- Diseño: `MASTER.md` (tokens en `src/styles.css`). El canvas "MacrOS" de claude.ai quedó como referencia anterior.

## Publicar una versión
1. Sube `"version"` en `package.json` (0.3.0 → 0.3.1).
2. Agrega `## <versión>` con sus cambios en `CHANGELOG.md`, en palabras para el usuario. Es lo que se ve en la app.
3. Sube a `main`. GitHub Actions prueba, compila y publica el release; en el cel: Configuración → Actualizaciones → Descargar.

El APK se firma con la llave del secreto `DEBUG_KEYSTORE`; si cambia, Android no deja actualizar sin desinstalar (y se pierden los datos).

## Base compartida
`data/alimentos.json` son los cambios sobre la base de `src/data/foods.ts` (alimentos editados/nuevos y `borrados`). La app la descarga al abrir y, con token, la escribe con commits directos a `main` (haz `git pull` antes de trabajar). Esos commits no disparan release.
