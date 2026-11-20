# MacrOS · contextblox

Traspaso y bitácora del proyecto. Todo lo que se decide o cambia se anota aquí.
Última actualización: 2026-11-17.

## Proyecto

- **Qué es:** app personal para llevar calorías y macros, para Android y para la compu (Windows). Sin cuentas: los datos viven en cada dispositivo; vincular cel y compu es opcional.
- **Estado:** versión 0.7.0 publicada en GitHub Releases (2026-11-12, APK y `.exe`). La app se actualiza desde Configuración → Actualizaciones.
- **Carpeta:** `rayblox_dev/apk/macrOS/` (repo git con remoto `https://github.com/2023030519/macros.git`). Rama actual: `staging`, igual a `origin/main` (la 0.7.0); el `main` local va 2 commits atrás.
  - `src/`: la app (React). `src/screens/` las pantallas, `src/lib/` la lógica con sus pruebas, `src/data/foods.ts` la base de alimentos, `src/styles.css` los tokens.
  - `data/alimentos.json`: cambios de la base compartida (los escribe la app con commits a `main`).
  - `electron/`: la versión de escritorio. `android/`: el proyecto de Capacitor.
  - `scripts/`: `release.mjs` (publicar desde la PC) y `notas.mjs` (notas del release desde `CHANGELOG.md`).
  - `supabase/migrations/`: la tabla para vincular dispositivos.
  - `.github/workflows/release.yml`: prueba, compila y publica al subir una versión nueva a `main`.
  - `MASTER.md`: sistema de diseño. `CHANGELOG.md`: cambios por versión (los muestra la app).
  - `contextblox/`: este archivo y `pendientes_humanos.md`.
- **Correr y compilar:** ver `CLAUDE.md`.
- **Llaves:** `.env` (fuera de git; sin plantilla todavía): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. En los secretos del repo: esas dos y `DEBUG_KEYSTORE` (la llave de firma del APK, en base64).

## Servicios

- **Supabase:** tabla `datos` con RLS para vincular cel y compu. Cuentas creadas a mano (registro desactivado).
- **GitHub** (`2023030519/macros`): Actions compila y publica; Releases reparte el APK y el `.exe`; `data/alimentos.json` en `main` es la base compartida.
- **Gemini:** leer etiquetas nutrimentales con foto, con la llave gratis que cada usuario pone en Configuración → Leer etiquetas.

## Reglas de trabajo

- Responder en español.
- Anotar cada cambio en la bitácora y lo que necesite a una persona en `pendientes_humanos.md`.
- Las migraciones las corre Claude en el SQL Editor (pedido del dueño, 2026-11-17): van en `supabase/migrations/nuevas/` y, si terminan sin error, pasan a `aplicadas/` con `git mv`.
- Las pruebas en el dispositivo las hace el dueño: instalar y decirle qué probar.
- Antes de instalar una dependencia, preguntar.
- No inventar datos del negocio, cifras ni testimonios; lo de ejemplo se marca como ejemplo.
- No hacer commit, publicar ni desplegar sin que el dueño lo pida.
- No cambiar las fórmulas de `src/lib/calc.ts` sin pedirlo.

## Diseño

Referencia completa en `MASTER.md` (tesis aprobadas el 2026-11-03). Instrumento preciso y tranquilo: neutros fríos, color solo para los datos (naranja, azul y amarillo de los macros) y un acento que eliges entre 8; Geist con cifras tabulares; tarjetas planas sin borde ni sombra; movimiento rápido y seco. El canvas "MacrOS" de claude.ai quedó como referencia anterior.

## Pantallas

Según `src/screens/` y `CHANGELOG.md`:

1. **Hoy:** anillo y barras de los macros del día, pasos del día con las kcal quemadas caminando, tiempos de comida y tarjetas que se ordenan arrastrándolas.
2. **Alimentos, Recetas y Menú:** la base de alimentos (con la compartida), recetas con foto y menú semanal.
3. **Objetivos:** requerimientos diarios con el detalle del cálculo y un simulador. Con "Perder grasa" o "Ganar músculo" se elige el tamaño del déficit o del volumen (0 a 1,500 kcal).
4. **Escribir:** registrar en lenguaje natural ("desayuné 2 huevos y 2 tortillas"), "¿qué ceno?" y leer etiquetas con foto.
5. **Configuración:** tema, color, tamaño de texto, densidad, tiempos de comida, Actualizaciones, vincular dispositivos y, en modo dev (tocar la versión 15 veces), Base compartida.

## Servidor (migraciones)

En `supabase/migrations/aplicadas/` (corridas) y `supabase/migrations/nuevas/` (por correr).

1. `datos.sql`: tabla `datos` (una fila por clave de Preferences y usuario) y sus reglas RLS.

## Verificación

- `npm test`: la lógica de `src/lib/` (ver `CLAUDE.md`).
- El CI no publica si el APK no está firmado con la llave del cel.
- **Sin verificar:** qué es "la calculadora anterior" de la que viene `calc.ts`.

## Bitácora

El historial anterior está en `CHANGELOG.md` (por versión) y en `git log`.

- **2026-11-20** · Publicada la 0.7.1 (release v0.7.1 con APK y .exe; el CI pasó) e instalada en la compu. Falta descargarla y probarla en el cel.
- **2026-11-20** · Tarjeta "Pasos" en Hoy: el usuario escribe sus pasos (los del reloj o la app de salud; el dueño eligió no leer Health Connect) y se guardan en `pasos:<día>`, que también se sincroniza. Las kcal salen de `kcalPasos` en `calc.ts` (0.5 kcal por kg y km, sin contar el basal; zancada = 41.4 % de la estatura) y solo se muestran: la meta no cambia, porque el nivel de actividad ya cuenta el movimiento. A quien ya tenía la app la tarjeta le aparece al final de Hoy. Mantener presionado un campo de Hoy ya no arrastra la tarjeta. Falta probarlo en el cel.
- **2026-11-20** · Déficit y volumen a elección del usuario: `Perfil` tiene `deficit` y `volumen` opcionales (kcal positivas) y `ajusteKcal` en `calc.ts` los usa; sin valor siguen −400 / +250, así que los perfiles guardados no cambian. El campo está en Objetivos (se guarda al salir del campo) y en Tus datos/Simulador.
- **2026-11-17** · `supabase/datos.sql` pasó a `supabase/migrations/aplicadas/datos.sql` (migraciones divididas en `nuevas/` y `aplicadas/`; el dueño confirmó que no hay pendientes).
- **2026-11-17** · ordenblox: se crearon `contextblox/contextblox.md` y `contextblox/pendientes_humanos.md`; `CLAUDE.md` se ordenó con la plantilla (el estado y el diseño pasaron aquí; comandos, reglas de datos y publicar se quedaron allá); `MASTER.md` solo cambió de formato.
- **2026-11-17** · Se borró `web/macrOS`, el arranque de Ionic + Angular que nunca pasó de pantallas vacías (pedido del dueño). Desde hoy las migraciones las corre Claude.
