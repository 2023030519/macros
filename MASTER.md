# MacrOS · sistema de diseño

Fuente única del aspecto. Los valores viven en `src/styles.css` (`:root`); este archivo dice qué son y por qué. Vista previa aprobada: https://claude.ai/artifact/HwNgSGEQymCBpqzKycKF5e

## Tesis (aprobadas 2026-11-03)

**Visual.** Instrumento preciso y tranquilo: fondos neutros fríos donde el color solo aparece para datos (naranja, azul y amarillo de los macros, los del logo) y para un acento que eliges entre 8; Geist como única familia, porque sus cifras tabulares hacen que los números se lean como un medidor, con contraste fuerte de tamaño; espaciado con aire sobre base de 4 px (cómodo por defecto, compacto opcional); tarjetas planas sin borde, separadas del fondo por tono, radios 8/14/20/28 y sin sombras salvo la hoja inferior.

**Interacción.** Rápido y seco con `cubic-bezier(0.2, 0, 0, 1)`: 120 ms al presionar (escala 0.96), 200 ms colapsables y pestañas, 280 ms entra la hoja y 160 ms sale; el anillo y las barras se llenan en 600 ms (la única excepción). Las hojas bajan al cerrarse por cualquier camino; la opción elegida de un segmento se desliza; las filas crecen al entrar y se encogen al salir; una cifra que cambia entra de abajo (no cuenta). Táctil: presionar es el estado "hover". Prohibido: animaciones al hacer scroll, rebote o elástico, bucles infinitos, parallax, vidrio desenfocado, números que cuentan solos.

**Patrones permitidos.** Cifras tabulares; línea fina sobre la barra de pestañas y entre filas de listas; barras de progreso sobre pista completa (datos reales); alto animado solo en colapsables y en filas que entran o salen (`interpolate-size`, salta al instante donde no exista); listas de opciones en hoja propia, nunca `<select>` nativo; el anillo como motivo.

## Tokens

| Grupo | Tokens | Valores |
|---|---|---|
| Neutros claro | `--bg --surface --surface2 --text --muted --line` | #F4F5F7 #FFFFFF #E9EBEF #111318 #5C616B #E1E4E9 |
| Neutros oscuro | mismos nombres | #0B0C0F #15171B #22252B #F1F2F4 #9A9FA9 #262A30 |
| Macros | `--p --c --g` (claro / oscuro) | #F26A2E #3D66F5 #E8B53A / #FF8A4C #6E8BFF #F2C94C |
| Aviso | `--warn` | #C2410C / #FF9B63 |
| Acento | `--accent --on-accent`, `data-color` en `<html>` | neutro, azul, morado, rosa, verde, rojo, turquesa, tierra; todos ≥ 4.5:1 |
| Radios | `--r-sm --r-md --r-lg --r-xl --r-full` | 8 14 20 28 999 |
| Espacio | `--s1 … --s8` × `--dens` | 4 8 12 16 20 24 32; `data-dens="compacta"` = 0.78 |
| Tamaño | `--texto`, `data-texto` | chico 0.92, normal 1, grande 1.1 (zoom de pantalla completa) |
| Curvas | `--ease --ease-in` | cubic-bezier(0.2,0,0,1) · cubic-bezier(0.4,0,1,1) |
| Tiempos | `--d-press --d-ui --d-sheet --d-exit --d-ring` | 120 200 280 160 600 ms |
| Sombra | `--shadow-sheet` | solo la hoja inferior |

## Componentes

- **Tarjeta** `.card`: superficie, radio xl, sin borde. **Lista** `.list`: radio lg, filas con línea fina.
- **Botones** `.primary .secondary .pill .chip .icon-btn .seg`: presionado = escala 0.96 + opacidad 0.85; foco = contorno 2 px de `--text`; seleccionado = `--accent`; deshabilitado = opacidad 0.4.
- **Filas tocables** `button.row .press`: presionado = fondo `--surface2`.
- **Colapsable** `<details class="fold">` con `.chev` en el `summary`.
- **Hoja** `Sheet` (ui.tsx): sube con `--d-sheet`, tocar fuera la baja con `--d-exit`.
- Movimiento reducido: todo dura 0.01 ms.
