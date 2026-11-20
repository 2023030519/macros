# MacrOS

App personal de macros para Android (Capacitor 6 + React + Vite), con versión de escritorio para Windows (Electron). Sin cuentas: todo vive en el teléfono (`@capacitor/preferences`).
Traspaso, estado y bitácora: `contextblox/contextblox.md` (léelo antes de trabajar y anota ahí cada cambio). Lo que necesita a una persona: `contextblox/pendientes_humanos.md`. Diseño: `MASTER.md` (tokens en `src/styles.css`).

## Comandos

- `npm run dev` · `npm test` · `npm run build`
- APK: `npm run apk` → `android/app/build/outputs/apk/debug/app-debug.apk`.
- Escritorio (Windows, Electron): `npm run desk` la abre; `npm run exe` deja el instalador en `release/`. Carga el mismo `dist/` (`electron/main.cjs`); el layout ancho es el `@media (min-width: 900px)` de `src/styles.css`. Sus datos viven en `%APPDATA%\MacrOS`, separados del cel (se pasan con Exportar/Importar).

## Reglas de datos

- Lógica de calorías: `src/lib/calc.ts` (viene de la calculadora anterior; no cambiar fórmulas sin pedirlo).
- Vincular cel y compu (opcional, Supabase): `src/lib/nube.ts`. Cada clave de Preferences que pasa `sincronizable` (`src/lib/sync.ts`) es una fila; se sube en `save`/`remove` y se baja al abrir/volver. Gana el último cambio. Las cuentas se crean a mano en Supabase (registro desactivado). URL y llave anon en `.env` (vacío = sin vincular; no se sube) y, para el release de CI, en los secretos `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` del repo.
- Base compartida: `data/alimentos.json` son los cambios sobre la base de `src/data/foods.ts` (alimentos editados/nuevos y `borrados`). La app la descarga al abrir y, con token, la escribe con commits directos a `main` (haz `git pull` antes de trabajar). Esos commits no disparan release.

## Migraciones (Supabase)

En `supabase/migrations/`: `aplicadas/` ya están corridas en el SQL Editor (`datos.sql`: tabla `datos` y RLS). Un cambio nuevo va en `nuevas/`; Claude lo corre en el SQL Editor y, si termina sin error, lo pasa a `aplicadas/` con `git mv`. Primero la migración y después la app que la usa.

## Publicar una versión

1. Sube `"version"` en `package.json` (0.3.0 → 0.3.1).
2. Agrega `## <versión>` con sus cambios en `CHANGELOG.md`, en palabras para el usuario. Es lo que se ve en la app.
3. Sube a `main`. GitHub Actions prueba, compila y publica el release con el APK y el `.exe`; en el cel: Configuración → Actualizaciones → Descargar.

El APK se firma con la llave del secreto `DEBUG_KEYSTORE`; si cambia, Android no deja actualizar sin desinstalar (y se pierden los datos). Publicar desde la PC sin CI: `npm run release` (`scripts/release.mjs`).

## Pruebas

- `npm test`: la lógica de `src/lib/` (`base`, `calc`, `cascada`, `comidas`, `dias`, `etiqueta`, `frase`, `hoy`, `menu`, `migrar`, `receta`, `sync`, `version`, cada uno con su `.test.ts`).
- CI (`.github/workflows/release.yml`): corre `npm test` y `npm run build`, y no publica si el APK no está firmado con la llave del cel.
