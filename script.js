document.addEventListener('DOMContentLoaded', function () {

  // Menú móvil
  var navToggle = document.getElementById('navToggle');
  var siteNav = document.getElementById('siteNav');

  if (navToggle && siteNav) {
    navToggle.addEventListener('click', function () {
      var isOpen = siteNav.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      navToggle.setAttribute('aria-label', isOpen ? 'Cerrar menú' : 'Abrir menú');
    });

    siteNav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        siteNav.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
        navToggle.setAttribute('aria-label', 'Abrir menú');
      });
    });
  }

  // Acordeón de FAQ
  var triggers = document.querySelectorAll('.accordion__trigger');

  triggers.forEach(function (trigger) {
    var panel = trigger.nextElementSibling;
    panel.style.maxHeight = null;

    trigger.addEventListener('click', function () {
      var isExpanded = trigger.getAttribute('aria-expanded') === 'true';

      triggers.forEach(function (otherTrigger) {
        otherTrigger.setAttribute('aria-expanded', 'false');
        otherTrigger.nextElementSibling.style.maxHeight = null;
      });

      if (!isExpanded) {
        trigger.setAttribute('aria-expanded', 'true');
        panel.style.maxHeight = panel.scrollHeight + 'px';
      }
    });
  });

  // Secuencia de entrada del hero: envuelve cada palabra del <h1> en un
  // span.hero-word para animarlas en cascada (ver @keyframes heroWordIn en
  // styles.css). No toca el HTML fuente: si este script no llega a correr,
  // el título se queda como texto normal, visible sin más.
  var heroTitle = document.querySelector('.hero h1');
  if (heroTitle) {
    var originalNodes = Array.prototype.slice.call(heroTitle.childNodes);
    var delayStep = 45; // ms entre palabra y palabra
    var wordIndex = 0;
    var wordDurationMs = 420; // debe coincidir con heroWordIn en styles.css

    heroTitle.textContent = '';

    originalNodes.forEach(function (node) {
      if (node.nodeType === Node.TEXT_NODE) {
        node.textContent.split(/(\s+)/).forEach(function (chunk) {
          if (chunk === '') return;

          if (/^\s+$/.test(chunk)) {
            heroTitle.appendChild(document.createTextNode(chunk));
            return;
          }

          var word = document.createElement('span');
          word.className = 'hero-word';
          word.textContent = chunk;
          word.style.animationDelay = (wordIndex * delayStep) + 'ms';
          heroTitle.appendChild(word);
          wordIndex += 1;
        });
      } else {
        // Elemento existente (el <span class="highlight">): se conserva tal
        // cual, solo se le añaden las clases de animación.
        var baseDelay = wordIndex * delayStep;
        node.classList.add('hero-word', 'hero-word--highlight');
        node.style.animationDelay = baseDelay + 'ms, ' + (baseDelay + wordDurationMs) + 'ms';
        heroTitle.appendChild(node);
        wordIndex += 1;
      }
    });
  }

  // Header dinámico al hacer scroll: más compacto y con más blur pasados
  // ~80px. rAF-throttled para no recalcular estilos en cada evento de scroll.
  var siteHeader = document.querySelector('.site-header');
  if (siteHeader) {
    var scrollTicking = false;

    var actualizarHeaderScroll = function () {
      siteHeader.classList.toggle('site-header--scrolled', window.scrollY > 80);
      scrollTicking = false;
    };

    var onScrollHeader = function () {
      if (!scrollTicking) {
        window.requestAnimationFrame(actualizarHeaderScroll);
        scrollTicking = true;
      }
    };

    onScrollHeader();
    window.addEventListener('scroll', onScrollHeader, { passive: true });
  }

  // Año en el footer
  var yearEl = document.getElementById('year');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  // Gráfico de hitos: el trazo se dibuja una sola vez al entrar en el
  // viewport (no sigue el scroll de ida y vuelta), y cada hito se ilumina
  // en el momento en que el trazo pasa por su posición real sobre la curva.
  inicializarGraficoDeHitos();

  // Cursor magnético en los CTAs principales.
  inicializarBotonesMagneticos();

  // Lightbox para ampliar las capturas del panel admin con zoom in.
  inicializarLightboxPanelAdmin();

  // Fondo de partículas flotando en "Somos reales".
  inicializarParticulasFondo();

  function prefiereMovimientoReducido() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function inicializarGraficoDeHitos() {
    var storyChart = document.getElementById('storyChart');
    if (!storyChart) return;

    var path = storyChart.querySelector('.story-chart__path');
    var puntos = Array.prototype.slice.call(storyChart.querySelectorAll('.story-chart__point'));
    if (!path || puntos.length === 0) return;

    var DURACION_TRAZO_MS = 2000; // debe coincidir con el "2s" de .story-chart__path en styles.css

    // A qué fracción (0-1) del trazo corresponde cada hito, según su
    // posición real sobre la curva -- no una regla de tres por su x, que
    // con una curva Bézier no avanza a velocidad constante. Con eso se fija
    // el transition-delay de cada punto, para que se ilumine justo cuando
    // el trazo (una sola pasada, ver .story-chart.is-visible en CSS) llega
    // a su altura, no todos a la vez ni en cuanto se hace scroll.
    var umbrales = calcularUmbralesPorPosicion(path, puntos);
    puntos.forEach(function (punto, i) {
      punto.style.transitionDelay = Math.round(umbrales[i] * DURACION_TRAZO_MS) + 'ms';
    });

    function activar() {
      storyChart.classList.add('is-visible');
    }

    if (prefiereMovimientoReducido()) {
      activar();
      return;
    }

    if ('IntersectionObserver' in window) {
      var chartObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            activar();
            chartObserver.unobserve(storyChart);
          }
        });
      }, { threshold: 0.4 });

      chartObserver.observe(storyChart);
    } else {
      activar();
    }
  }

  function calcularUmbralesPorPosicion(path, puntos) {
    var longitudTotal = path.getTotalLength();
    var muestras = 200;

    return puntos.map(function (punto) {
      var cx = parseFloat(punto.getAttribute('cx'));
      var cy = parseFloat(punto.getAttribute('cy'));
      var mejorT = 0;
      var mejorDistancia = Infinity;

      for (var i = 0; i <= muestras; i++) {
        var t = i / muestras;
        var p = path.getPointAtLength(t * longitudTotal);
        var dx = p.x - cx;
        var dy = p.y - cy;
        var distancia = dx * dx + dy * dy;

        if (distancia < mejorDistancia) {
          mejorDistancia = distancia;
          mejorT = t;
        }
      }

      return mejorT;
    });
  }

  // Cursor magnético: los botones se dejan llevar levemente hacia el
  // cursor cuando pasa cerca, y vuelven a su sitio con un suavizado más
  // lento (el "rebote" elástico) al alejarse. Solo en dispositivos con
  // puntero fino -- en táctil no hay cursor que seguir.
  function inicializarBotonesMagneticos() {
    if (!window.matchMedia('(hover: hover)').matches) return;
    if (prefiereMovimientoReducido()) return;

    var RADIO = 40; // px de "atracción" alrededor del botón
    var DESPLAZAMIENTO_MAX = 8; // px

    var botones = Array.prototype.slice.call(
      document.querySelectorAll('.hero__actions .btn--primary, .demo-cta .btn--primary, .cta-final__actions .btn--primary')
    );
    if (botones.length === 0) return;

    var estados = botones.map(function (el) {
      el.classList.add('btn--magnetic');
      return { el: el, targetX: 0, targetY: 0, currentX: 0, currentY: 0 };
    });

    var mouseX = null;
    var mouseY = null;
    var animando = false;

    function tick() {
      var enReposo = true;

      estados.forEach(function (estado) {
        if (mouseX !== null) {
          var rect = estado.el.getBoundingClientRect();
          var cx = rect.left + rect.width / 2;
          var cy = rect.top + rect.height / 2;
          var dx = mouseX - cx;
          var dy = mouseY - cy;
          // Distancia al borde más cercano, no al centro: si el cursor ya
          // está dentro del botón, la atracción es máxima.
          var distX = Math.max(Math.abs(dx) - rect.width / 2, 0);
          var distY = Math.max(Math.abs(dy) - rect.height / 2, 0);
          var distancia = Math.sqrt(distX * distX + distY * distY);

          if (distancia < RADIO) {
            var fuerza = 1 - distancia / RADIO;
            estado.targetX = (dx / rect.width) * DESPLAZAMIENTO_MAX * fuerza;
            estado.targetY = (dy / rect.height) * DESPLAZAMIENTO_MAX * fuerza;
          } else {
            estado.targetX = 0;
            estado.targetY = 0;
          }
        } else {
          estado.targetX = 0;
          estado.targetY = 0;
        }

        // Suavizado exponencial: más lento volviendo al reposo (0.12) que
        // persiguiendo el cursor (0.25), de ahí el "rebote" elástico al
        // soltar. Todo en JS, sin transition de CSS de por medio, para que
        // no se pisen dos animaciones a la vez sobre el mismo transform.
        var factor = (estado.targetX === 0 && estado.targetY === 0) ? 0.12 : 0.25;
        estado.currentX += (estado.targetX - estado.currentX) * factor;
        estado.currentY += (estado.targetY - estado.currentY) * factor;

        if (Math.abs(estado.currentX) < 0.05) estado.currentX = 0;
        if (Math.abs(estado.currentY) < 0.05) estado.currentY = 0;

        estado.el.style.setProperty('--magnet-x', estado.currentX.toFixed(2) + 'px');
        estado.el.style.setProperty('--magnet-y', estado.currentY.toFixed(2) + 'px');

        if (estado.currentX !== 0 || estado.currentY !== 0 || estado.targetX !== 0 || estado.targetY !== 0) {
          enReposo = false;
        }
      });

      if (enReposo) {
        animando = false;
        return; // no se piden más frames hasta el próximo mousemove que importe
      }

      window.requestAnimationFrame(tick);
    }

    function solicitarFrame() {
      if (!animando) {
        animando = true;
        window.requestAnimationFrame(tick);
      }
    }

    document.addEventListener('mousemove', function (e) {
      mouseX = e.clientX;
      mouseY = e.clientY;
      solicitarFrame();
    }, { passive: true });

    document.addEventListener('mouseleave', function () {
      mouseX = null;
      mouseY = null;
      solicitarFrame();
    });
  }

  // Lightbox de la sección "Para el dueño": al pulsar una captura, se
  // reutiliza el mismo diálogo para las 7, poniendo su imagen y un pie
  // formado por el nombre de pantalla (barra de la ventana) + el titular de
  // la tarjeta -- así no hace falta duplicar ese texto en el HTML.
  function inicializarLightboxPanelAdmin() {
    var lightbox = document.getElementById('lightbox');
    var triggers = Array.prototype.slice.call(document.querySelectorAll('.admin-card__zoom'));
    if (!lightbox || triggers.length === 0) return;

    var dialog = lightbox.querySelector('.lightbox__dialog');
    var imgEl = lightbox.querySelector('.lightbox__img');
    var captionEl = lightbox.querySelector('.lightbox__caption');
    var DURACION_CIERRE_MS = 280; // debe coincidir con la transition de .lightbox__dialog en styles.css

    var ultimoFoco = null;
    var cierreTimeout = null;

    function abrir(trigger) {
      var img = trigger.querySelector('img');
      var card = trigger.closest('.admin-card');
      if (!img || !card) return;

      clearTimeout(cierreTimeout);
      ultimoFoco = trigger;

      var pantalla = card.querySelector('.admin-card__bar-title');
      var titular = card.querySelector('.admin-card__text h3');
      imgEl.src = img.currentSrc || img.src;
      imgEl.alt = img.alt;
      captionEl.textContent = (pantalla ? pantalla.textContent + ' — ' : '') + (titular ? titular.textContent : '');

      lightbox.hidden = false;
      document.body.style.overflow = 'hidden';

      // Quitar "hidden" y añadir la clase que dispara la transición en dos
      // frames distintos -- si no, el navegador puede colapsar ambos
      // cambios y la animación de entrada no se llega a ver.
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          lightbox.classList.add('is-open');
        });
      });

      document.addEventListener('keydown', alPulsarTecla);
    }

    function cerrar() {
      if (lightbox.hidden) return;

      lightbox.classList.remove('is-open');
      document.removeEventListener('keydown', alPulsarTecla);
      document.body.style.overflow = '';

      cierreTimeout = setTimeout(function () {
        lightbox.hidden = true;
        imgEl.src = '';
      }, DURACION_CIERRE_MS);

      if (ultimoFoco) {
        ultimoFoco.focus();
      }
    }

    function alPulsarTecla(e) {
      if (e.key === 'Escape') cerrar();
    }

    triggers.forEach(function (trigger) {
      trigger.addEventListener('click', function () {
        abrir(trigger);
      });
    });

    Array.prototype.slice.call(lightbox.querySelectorAll('[data-lightbox-close]')).forEach(function (el) {
      el.addEventListener('click', cerrar);
    });

    // El clic ya cierra al llegar al backdrop porque el diálogo no lo cubre
    // entero; esto es solo para no perder el cierre si el diálogo crece
    // (imagen muy ancha) y tapa el backdrop bajo el cursor.
    if (dialog) {
      dialog.addEventListener('click', function (e) {
        if (e.target === dialog) cerrar();
      });
    }
  }

  // Fondo de partículas global: puntos flotando muy despacio, tipo
  // estrellas, fijos detrás de toda la página (no solo de una sección).
  // Canvas nativo, sin librerías -- ver .particles-canvas en styles.css
  // para el posicionamiento (position:fixed, z-index:-1).
  function inicializarParticulasFondo() {
    var canvas = document.getElementById('particlesCanvas');
    if (!canvas) return;

    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    var BLANCO = '255, 255, 255';
    var NARANJA = '255, 107, 26'; // debe coincidir con --accent en styles.css
    var DPR = Math.min(window.devicePixelRatio || 1, 2); // cap: en móviles de DPR alto no merece la pena más resolución de la que se aprecia

    var particulas = [];
    var anchoCss = 0;
    var altoCss = 0;
    var rafId = null;
    var resizeTimeout = null;

    function numeroDeParticulasPara(ancho, alto) {
      // Densidad relativa al área visible, no un número fijo: antes se
      // calculaba sobre el alto de la sección "Somos reales" (varias
      // pantallas de contenido); ahora el canvas solo cubre un viewport
      // (fixed), así que la densidad está calibrada para que un viewport
      // de escritorio típico (~1440x900) siga dando ~90 partículas, la
      // misma sensación visual que había antes.
      var area = ancho * alto;
      var densidad = ancho < 640 ? (1 / 16000) : ancho < 1024 ? (1 / 15000) : (1 / 14000);
      var cantidad = Math.round(area * densidad);
      return Math.max(18, Math.min(cantidad, 110)); // límites: nunca demasiado vacío ni demasiado cargado (pantallas muy grandes)
    }

    function crearParticula() {
      var esNaranja = Math.random() < 0.2; // ~80/20 blanco/naranja
      return {
        x: Math.random() * anchoCss,
        y: Math.random() * altoCss,
        radio: 0.5 + Math.random(), // 0.5-1.5px
        vx: (Math.random() - 0.5) * 0.6, // lenta pero con movimiento perceptible -- "flotar", no desplazarse
        vy: (Math.random() - 0.5) * 0.6,
        opacidad: 0.2 + Math.random() * 0.4, // 0.2-0.6
        color: esNaranja ? NARANJA : BLANCO
      };
    }

    function generarParticulas() {
      var cuantas = numeroDeParticulasPara(anchoCss, altoCss);
      particulas = [];
      for (var i = 0; i < cuantas; i++) {
        particulas.push(crearParticula());
      }
    }

    function ajustarTamano() {
      // El canvas cubre el viewport (fixed), no la página entera: no hace
      // falta medir scrollHeight, con innerWidth/innerHeight sobra.
      anchoCss = window.innerWidth;
      altoCss = window.innerHeight;

      canvas.width = Math.round(anchoCss * DPR);
      canvas.height = Math.round(altoCss * DPR);
      canvas.style.width = anchoCss + 'px';
      canvas.style.height = altoCss + 'px';

      // Con el canvas ya escalado a píxeles de dispositivo, este scale()
      // hace que el resto del código dibuje en coordenadas CSS normales.
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

      generarParticulas();
    }

    function dibujarFrame() {
      ctx.clearRect(0, 0, anchoCss, altoCss);
      particulas.forEach(function (p) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radio, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(' + p.color + ', ' + p.opacidad + ')';
        ctx.fill();
      });
    }

    function actualizarParticulas() {
      particulas.forEach(function (p) {
        p.x += p.vx;
        p.y += p.vy;

        // Wrap-around: reaparece por el lado opuesto, sin rebotar.
        if (p.x < -p.radio) p.x = anchoCss + p.radio;
        else if (p.x > anchoCss + p.radio) p.x = -p.radio;

        if (p.y < -p.radio) p.y = altoCss + p.radio;
        else if (p.y > altoCss + p.radio) p.y = -p.radio;
      });
    }

    function tick() {
      actualizarParticulas();
      dibujarFrame();
      rafId = window.requestAnimationFrame(tick);
    }

    function iniciarAnimacion() {
      if (rafId !== null || prefiereMovimientoReducido() || document.hidden) return;
      rafId = window.requestAnimationFrame(tick);
    }

    function detenerAnimacion() {
      if (rafId === null) return;
      window.cancelAnimationFrame(rafId);
      rafId = null;
    }

    ajustarTamano();
    dibujarFrame();

    if (prefiereMovimientoReducido()) {
      // Ni una partícula en movimiento: se dibujan una vez, quietas, en
      // vez de quitarlas del todo -- se mantiene la estética sin animar.
      // No hace falta pausar/reanudar nada porque nunca llega a animarse.
    } else {
      iniciarAnimacion();

      // Antes esto lo decidía un IntersectionObserver sobre la sección
      // "Somos reales" (se pausaba al salir del viewport por scroll). Con
      // el canvas cubriendo toda la ventana (fixed) siempre está "a la
      // vista" mientras la pestaña lo esté, así que el criterio pasa a
      // ser la visibilidad de la propia pestaña.
      document.addEventListener('visibilitychange', function () {
        if (document.hidden) {
          detenerAnimacion();
        } else {
          iniciarAnimacion();
        }
      });
    }

    // Debounce: un resize real solo se procesa 200ms después del último
    // evento, para no recalcular tamaño/partículas en cada píxel arrastrado.
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(function () {
        ajustarTamano();
        dibujarFrame();
      }, 200);
    });
  }

});
