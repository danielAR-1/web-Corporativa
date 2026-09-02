# Catálogo de efectos reactivos

Todos escritos en el estilo del proyecto: ES5, `var`/`function`, sin dependencias,
`var(--ease-decel)`, guardas de `prefers-reduced-motion` y `(hover: hover)`.

Coste: **bajo** = solo CSS o vars por evento · **medio** = rAF con pocos elementos ·
**alto** = rAF sobre muchos elementos o canvas. Antes de meter un efecto **alto**,
recuerda que las partículas de fondo ya consumen un rAF permanente.

---

## 1. Tilt 3D en tarjeta al mover el ratón

Coste: medio · Encaja en: `.service-card`, `.step-card`, capturas del panel admin.

La tarjeta se inclina siguiendo al cursor. Da sensación de profundidad sin ser ruidoso
si el ángulo es pequeño (máx 6°). Más de eso parece un juguete.

```css
.tilt {
  transform: perspective(700px)
             rotateX(var(--tilt-x, 0deg))
             rotateY(var(--tilt-y, 0deg));
  transition: transform 0.22s var(--ease-decel);
}
.tilt:hover { transition-duration: 0.08s; } /* sigue al cursor sin lag */
```

```js
function inicializarTilt() {
  if (!window.matchMedia('(hover: hover)').matches) return;
  if (prefiereMovimientoReducido()) return;

  var ANGULO_MAX = 6;
  var tarjetas = Array.prototype.slice.call(document.querySelectorAll('.tilt'));

  tarjetas.forEach(function (el) {
    el.addEventListener('mousemove', function (e) {
      var r = el.getBoundingClientRect();
      // -0.5..0.5 respecto al centro de la tarjeta
      var px = (e.clientX - r.left) / r.width - 0.5;
      var py = (e.clientY - r.top) / r.height - 0.5;
      el.style.setProperty('--tilt-y', (px * ANGULO_MAX * 2) + 'deg');
      el.style.setProperty('--tilt-x', (-py * ANGULO_MAX * 2) + 'deg');
    });
    el.addEventListener('mouseleave', function () {
      el.style.setProperty('--tilt-y', '0deg');
      el.style.setProperty('--tilt-x', '0deg');
    });
  });
}
```

**No lo uses** en una tarjeta que ya hace lift al hover: sumar dos transforms compite,
elige uno. Y ojo: `transform` en el padre crea un contexto de apilamiento que rompe
`position: fixed` de los hijos.

---

## 2. Spotlight que sigue al cursor

Coste: bajo · Encaja en: tarjetas de `#servicios`, CTA final.

Un halo naranja tenue bajo el cursor dentro de la tarjeta. Muy barato: dos variables.

```css
.spotlight { position: relative; overflow: hidden; }
.spotlight::before {
  content: "";
  position: absolute;
  inset: 0;
  background: radial-gradient(240px circle at var(--mx, 50%) var(--my, 50%),
              rgba(255, 107, 26, 0.14), transparent 65%);
  opacity: 0;
  transition: opacity 0.25s var(--ease-decel);
  pointer-events: none;
}
.spotlight:hover::before { opacity: 1; }
```

```js
el.addEventListener('mousemove', function (e) {
  var r = el.getBoundingClientRect();
  el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
  el.style.setProperty('--my', (e.clientY - r.top) + 'px');
});
```

Sin rAF: solo lee layout una vez por evento y escribe custom properties, que el
navegador resuelve en compositing.

---

## 3. Borde con gradiente girando

Coste: bajo · Encaja en: destacar **una** tarjeta (plan recomendado, CTA).

```css
@property --angulo {
  syntax: "<angle>";
  initial-value: 0deg;
  inherits: false;
}

.borde-vivo {
  position: relative;
  background: var(--surface);
  border-radius: var(--radius);
}
.borde-vivo::before {
  content: "";
  position: absolute;
  inset: -1px;
  border-radius: inherit;
  background: conic-gradient(from var(--angulo),
              transparent 0deg, var(--accent) 60deg, transparent 140deg);
  animation: girarBorde 5s linear infinite;
  z-index: -1;
}
@keyframes girarBorde { to { --angulo: 360deg; } }

@media (prefers-reduced-motion: reduce) {
  .borde-vivo::before { animation: none; }
}
```

Sin `@property` (Firefox antiguo) el borde se queda fijo: degradación aceptable.
**Solo en un elemento por página** — si todo brilla, nada destaca.

---

## 4. Parallax por capas al hacer scroll

Coste: medio · Encaja en: fondo del hero, imágenes decorativas.

```js
function inicializarParallax() {
  if (prefiereMovimientoReducido()) return;

  var capas = Array.prototype.slice.call(document.querySelectorAll('[data-parallax]'));
  if (capas.length === 0) return;

  var pendiente = false;

  function actualizar() {
    var y = window.pageYOffset;
    capas.forEach(function (el) {
      var factor = parseFloat(el.getAttribute('data-parallax')) || 0.1;
      el.style.transform = 'translate3d(0,' + (y * factor).toFixed(2) + 'px,0)';
    });
    pendiente = false;
  }

  window.addEventListener('scroll', function () {
    if (pendiente) return;
    pendiente = true;
    window.requestAnimationFrame(actualizar);
  }, { passive: true });

  actualizar();
}
```

Factores entre 0.05 y 0.2. Más alto marea y despega el elemento del contenido.
**Nunca sobre texto que haya que leer.**

---

## 5. Contador numérico al entrar en viewport

Coste: bajo · Encaja en: métricas de `#experiencia`.

```js
function inicializarContadores() {
  var nodos = Array.prototype.slice.call(document.querySelectorAll('[data-contador]'));
  if (nodos.length === 0) return;

  if (prefiereMovimientoReducido() || !('IntersectionObserver' in window)) {
    nodos.forEach(function (el) {
      el.textContent = el.getAttribute('data-contador');
    });
    return;
  }

  var obs = new IntersectionObserver(function (entradas) {
    entradas.forEach(function (entrada) {
      if (!entrada.isIntersecting) return;

      var el = entrada.target;
      obs.unobserve(el);

      var destino = parseFloat(el.getAttribute('data-contador'));
      var inicio = null;
      var DURACION = 1200;

      function paso(ts) {
        if (inicio === null) inicio = ts;
        var t = Math.min((ts - inicio) / DURACION, 1);
        // easeOutCubic: mismo carácter que --ease-decel
        var suavizado = 1 - Math.pow(1 - t, 3);
        el.textContent = Math.round(destino * suavizado);
        if (t < 1) window.requestAnimationFrame(paso);
      }

      window.requestAnimationFrame(paso);
    });
  }, { threshold: 0.5 });

  nodos.forEach(function (el) { obs.observe(el); });
}
```

Pon el valor final ya en el HTML (`<span data-contador="40">40</span>`): si JS falla,
el número está. Añade `font-variant-numeric: tabular-nums` para que no salte el ancho
mientras cuenta.

---

## 6. Barra de progreso de lectura

Coste: bajo · Encaja en: justo bajo el header fijo.

CSS puro con scroll-driven animations, sin JS:

```css
.progreso {
  position: fixed;
  top: 0; left: 0; right: 0;
  height: 3px;
  background: var(--accent);
  transform: scaleX(0);
  transform-origin: 0 50%;
  z-index: 100;
  animation: llenarProgreso linear;
  animation-timeline: scroll(root block);
}
@keyframes llenarProgreso { to { transform: scaleX(1); } }

@media (prefers-reduced-motion: reduce) {
  .progreso { display: none; }
}
```

Sin soporte de `animation-timeline` se queda en `scaleX(0)`: invisible, no roto.

---

## 7. Marquee infinito

Coste: bajo · Encaja en: logos de clientes, si algún día hay.

```css
.marquee {
  overflow: hidden;
  -webkit-mask-image: linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent);
          mask-image: linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent);
}
.marquee__pista {
  display: flex;
  gap: 48px;
  width: max-content;
  animation: desplazar 28s linear infinite;
}
.marquee:hover .marquee__pista { animation-play-state: paused; }
@keyframes desplazar { to { transform: translateX(-50%); } }

@media (prefers-reduced-motion: reduce) {
  .marquee__pista { animation: none; }
  .marquee { overflow-x: auto; }
}
```

Duplica el contenido en el HTML (la misma lista dos veces) para que el `-50%` cierre
el bucle sin salto. La segunda copia va con `aria-hidden="true"`.

---

## 8. Scrollytelling sticky

Coste: medio · Encaja en: explicar el flujo del cliente paso a paso.

Columna izquierda con `position: sticky` sosteniendo la imagen; derecha, los pasos
pasando. Un IntersectionObserver con `rootMargin: '-45% 0px -45% 0px'` marca activo el
paso que cruza el centro del viewport y cambia la imagen.

Es el efecto con más impacto de la lista y el que más fácil se rompe en móvil:
**por debajo de 900px degrada a lista vertical normal** y no arranques el observer.

---

## 9. Ripple al pulsar botón

Coste: bajo · Encaja en: `.btn--primary`.

```js
btn.addEventListener('click', function (e) {
  var r = btn.getBoundingClientRect();
  var onda = document.createElement('span');
  onda.className = 'ripple';
  onda.style.left = (e.clientX - r.left) + 'px';
  onda.style.top = (e.clientY - r.top) + 'px';
  btn.appendChild(onda);
  window.setTimeout(function () { onda.remove(); }, 600);
});
```

Requiere `.btn { position: relative; overflow: hidden; }` y una animación de 0.6s que
escale de 0 a ~2.5 bajando opacidad. Es feedback a un clic, así que **se mantiene** con
`prefers-reduced-motion`.

---

## Descartados a propósito

- **Cursor personalizado** (círculo que sustituye al puntero): rompe las affordances
  del sistema y confunde a un público no técnico. El cursor magnético ya da ese toque.
- **Scroll suavizado por JS** (Lenis y similares): secuestra el scroll nativo, pelea
  con el `scroll-behavior: smooth` que ya hay y penaliza accesibilidad.
- **Preloader animado**: retrasa el contenido para lucirse. La web carga 3 archivos.
- **Texto letra a letra fuera del hero**: leer con el texto moviéndose cansa. Una vez,
  en el h1, es un acento; repetido es un peaje.
