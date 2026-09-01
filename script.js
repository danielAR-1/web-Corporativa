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

});
