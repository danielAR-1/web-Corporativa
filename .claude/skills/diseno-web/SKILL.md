---
name: diseno-web
description: Sistema de diseño y movimiento de la web de PeluqueriaAPP Studio. Úsala SIEMPRE antes de tocar styles.css o script.js, de añadir una sección/tarjeta/animación nueva, o de cambiar colores, espaciados y transiciones. Contiene los tokens exactos, la escala de movimiento, los sistemas de animación ya montados (reveal, partículas, cursor magnético, gráfico scroll-driven, lightbox) y cómo engancharse a ellos sin romperlos. Triggers "añade una sección", "haz esto más chulo", "anima X", "efecto al hacer scroll", "hover", "que se mueva", "rediseña", "no se ve el contenido".
---

# Sistema de diseño — PeluqueriaAPP Studio

Web estática, sin build ni framework: `index.html`, `styles.css`, `script.js`, `images/`.
Vanilla JS ES5 (`var`, `function`), un único `DOMContentLoaded` en `script.js` con
funciones `inicializarX()` dentro. **Mantén ese estilo.** Nada de `const`/arrow si el
archivo alrededor no lo usa, nada de dependencias externas.

## 1. Tokens — usa la variable, nunca el literal

```css
--bg: #0D1321;           /* fondo página */
--surface: #161D2E;      /* tarjetas, paneles */
--border: #232B3D;       /* bordes 1px */
--accent: #FF6B1A;       /* naranja de marca — CTAs, .highlight, enlaces */
--accent-hover: #FF8442;
--text: #FFFFFF;
--text-secondary: #9CA3B5;  /* todo <p> por defecto */

--radius-sm: 12px;  --radius: 16px;
--shadow-sm: 0 4px 16px rgba(0,0,0,0.25);
--section-spacing: 64px;  /* 96px desde 900px */
--font: "Manrope", "Segoe UI", sans-serif;  /* pesos 400/500/700/800 */
--ease-decel: cubic-bezier(0.16, 1, 0.3, 1);
```

Reglas: h1–h3 en peso 800, `line-height: 1.15`, `letter-spacing: -0.01em`.
Contenedor `.container` = 1140px máx, padding lateral 20px.
Secciones alternan fondo con `.section--alt`.
Un solo acento. Si necesitas un segundo color, casi siempre la respuesta es
opacidad del acento o `--text-secondary`, no un color nuevo.

## 2. Escala de movimiento

| Duración | Para qué | Ejemplo en el código |
|---|---|---|
| `0.15s` | micro-feedback: botón, input | `.btn` transform/background |
| `0.2–0.25s` | hover de icono, opacidad, acordeón interno | `.accordion__icon` |
| `0.22s` | tarjetas al hover (lift + sombra + borde) | `.service-card`, `.step-card` |
| `0.3s` | paneles, header al scroll, lightbox | `.accordion__panel` max-height |
| `0.65s` | entrada de contenido al scroll | `.reveal` |
| `1–2s` | dibujado del gráfico de hitos | `.story-chart__path` |

**Siempre `var(--ease-decel)`**, no `ease` ni `ease-in-out`. Decelera fuerte al final:
el movimiento se siente deliberado, no genérico.

Anima **solo `transform` y `opacity`** (y `stroke-dashoffset` en SVG). Nunca `width`,
`height`, `top`, `left`, `margin` — provocan layout en cada frame.

## 3. Sistemas ya montados — engánchate, no reinventes

| Sistema | Dónde | Cómo lo usas |
|---|---|---|
| **Reveal al scroll** | `inicializarRevealGenerico()` + `html.js .reveal` | Añade `class="reveal"` al elemento. Ya está: un único IntersectionObserver, `threshold 0.12`, stagger de 90ms entre elementos del mismo lote, se deja de observar tras la primera vez. **No crees otro observer.** |
| **Partículas de fondo** | `inicializarParticulasFondo()`, `#particlesCanvas` | Canvas fijo detrás de toda la página, con repulsión del cursor. Se pausa con `visibilitychange`. No añadas un segundo canvas. |
| **Cursor magnético** | `inicializarBotonesMagneticos()` | Solo en los 3 CTA principales. Escribe `--magnet-x/--magnet-y` por frame; el CSS los consume en `transform: translate(...)`. Radio 40px, desplazamiento máx 8px. Para sumar un botón, amplía el selector de `document.querySelectorAll` de esa función. |
| **Gráfico de hitos** | `inicializarGraficoDeHitos()`, `#storyChart` | SVG scroll-driven, se dibuja una sola vez al entrar en viewport. |
| **Lightbox** | `inicializarLightboxPanelAdmin()`, `#lightbox` | Zoom de capturas del panel admin. Cierra con Escape, backdrop y botón. |
| **Header al scroll** | listener `passive` + `requestAnimationFrame` | Cambia `backdrop-filter` y sombra. |
| **Hero por palabras** | `.hero-word` + `@keyframes heroWordIn` | Entrada escalonada del h1. Solo el hero; el resto usa `.reveal`. |

## 4. Reglas duras

1. **`prefers-reduced-motion` siempre.** Movimiento ambiental o automático (entradas,
   bucles, parallax, partículas, cursor) se desactiva. Hovers y feedback a un clic se
   mantienen: son respuesta a una acción del usuario, no movimiento continuo.
   En JS: `if (prefiereMovimientoReducido()) return;` al principio de la función.
   En CSS: bloque `@media (prefers-reduced-motion: reduce)` al final del archivo.

2. **Nada que oculte contenido sin red de seguridad.** El patrón obligatorio:
   - El script inline del `<head>` marca `<html class="js">` y, a los 3s sin
     `reveal-ready`, añade `reveal-fallback` que fuerza todo a estado final.
   - Por eso `.reveal` se oculta con `html.js .reveal`, nunca con `.reveal` a secas.
   - **Y el estado visible debe llevar el mismo prefijo**: `html.js .reveal.is-visible`.
     Sin `html.js`, `html.js .reveal` (0,2,1) le gana a `.reveal.is-visible` (0,2,0) y
     el contenido queda invisible para siempre. Esto ya pasó (commit `ee3cdd6`).
   Si añades un efecto que parte de `opacity: 0`, replica las tres piezas.

3. **Listeners de scroll/mousemove: `{ passive: true }` + `requestAnimationFrame`.**
   Nunca leas `getBoundingClientRect()` directamente dentro del handler sin rAF.

4. **`resize` con debounce** (patrón de `inicializarParticulasFondo`, 200ms).

5. **Efectos de cursor: `if (!window.matchMedia('(hover: hover)').matches) return;`**
   En móvil no hay cursor; sin esto el efecto se dispara con el táctil y molesta.

6. **Todo texto sigue siendo seleccionable y accesible.** `aria-hidden="true"` solo en
   lo puramente decorativo (canvas, iconos SVG). Botones con `aria-expanded`. Foco
   visible: no elimines el outline sin poner algo mejor.

7. **Español en comentarios y contenido.** Los comentarios de este proyecto explican
   *por qué*, no *qué* — mantén ese nivel.

## 5. Bucle de verificación visual — no edites a ciegas

Animación es *timing*: no se juzga leyendo CSS. Después de cualquier cambio visual:

```bash
cd "C:/Users/hppp/Documents/web-Corporativa" && python -m http.server 8000
```

Luego con las herramientas de Chrome (`mcp__claude-in-chrome__*`):
1. `tabs_create_mcp` → `http://localhost:8000`
2. `computer` con screenshot → composición, colores, espaciado, estado final.
3. `resize_window` a **500x900** → comprobar móvil. Ojo: Chrome en Windows tiene
   ancho mínimo de ventana (~500px), así que `resize_window` a 390 **no** encoge el
   viewport, devuelve "ok" y te engaña. Para 390px reales: `python -m http.server
   8000 --bind 0.0.0.0` y abrir `http://<IP-del-PC>:8000` desde el móvil en la
   misma wifi. Es donde más se rompe el diseño.
4. **`gif_creator` grabando el scroll o el hover** → única forma de juzgar el
   movimiento de verdad. Captura frames antes y después de la acción.
5. `read_console_messages` → cero errores antes de dar por bueno.

Screenshot valida composición; GIF valida movimiento. Para un cambio de animación,
el GIF no es opcional.

### Dos trampas del entorno que imitan bugs reales

**La pestaña de automatización corre en `visibilityState: "hidden"`.** Chrome no
entrega callbacks de `IntersectionObserver` a pestañas en segundo plano, así que
**ningún `.reveal` recibe `is-visible`**: los screenshots salen en blanco o a medias
y parece exactamente la regresión de contenido invisible de `ee3cdd6`.

Antes de dar por roto el reveal, **mide**:

```js
document.visibilityState                              // "hidden" -> es esto
document.querySelectorAll('.reveal.is-visible').length // 0 de N
```

Y confirma con un observer nuevo sobre los mismos elementos: si tampoco dispara
**ni un solo callback**, no es el código — un `IntersectionObserver` sano siempre
entrega una primera notificación. Para capturar, usa la red de seguridad de la
propia web:

```js
document.documentElement.classList.add('reveal-fallback');
```

**Chrome cachea `styles.css` con fuerza**, incluso tras `location.reload(true)`.
Verificarás estilos viejos sin enterarte. Antes de medir nada de CSS:

```js
var l = document.querySelector('link[href*="styles.css"]');
l.href = 'styles.css?v=' + Date.now();
```

Comprueba siempre con `getComputedStyle` que la propiedad que acabas de escribir
tiene el valor nuevo. Si sale el viejo, es caché, no tu regla.

## 6. Catálogo de efectos

Recetas concretas de efectos reactivos que encajan con este stack (tilt 3D, spotlight
que sigue al cursor, borde con gradiente animado, parallax por capas, contadores,
barra de progreso, marquee, scrollytelling sticky, ripple): ver
`references/efectos.md`. Cada uno con coste, cuándo *no* usarlo y el enganche a los
sistemas de arriba.

Antes de añadir un efecto, pregunta: ¿ayuda a entender el contenido o solo decora?
La web vende claridad a dueños de peluquería. Movimiento que distrae de leer resta.
