/* Movimiento de la portada de MotoIberia:
   · la línea de ruta de la cabecera: sale de la frase, pasa por el iPhone y
     llega a la pantalla de CarPlay;
   · la ruta de las funciones: la línea avanza hasta cada parada al llegar a
     ella y la tarjeta sale de la ruta al tocarla (el trazo lo pone el CSS);
   · los bloques que entran al llegar a ellos, la línea de la calzada que
     avanza con el desplazamiento, los vídeos y las flechas del carrusel.
   Vídeos: se cargan al acercarse (el de la cabecera, cuando la página ya ha
   cargado), se pausan al salir de la pantalla y tienen botón de pausa.
   Con «reducir movimiento» no arrancan solos y las líneas aparecen ya
   trazadas. Si este archivo no carga, todo se ve igual, sin moverse, y los
   vídeos llevan los controles del navegador. */
(function () {
  var quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!quieto && 'IntersectionObserver' in window) {
    document.documentElement.classList.add('mi-mov');
  }

  // Recalcula como mucho una vez por fotograma
  function porFotograma(fn) {
    var pendiente = false;
    return function () {
      if (pendiente) return;
      pendiente = true;
      requestAnimationFrame(function () { pendiente = false; fn(); });
    };
  }
  function vigila(el, fn) {
    if ('ResizeObserver' in window) new ResizeObserver(porFotograma(fn)).observe(el);
    else window.addEventListener('resize', porFotograma(fn));
  }
  var letras = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();

  /* ---------- Línea de ruta de la cabecera ----------
     Dos tramos en un mismo trazo: de «Y se saborean.» al iPhone y del iPhone
     a CarPlay. En escritorio entra por la izquierda del iPhone y baja a la
     pantalla; en el móvil, donde todo va debajo del texto, baja por el
     margen, entra por arriba del iPhone y sigue hasta CarPlay. */
  function trazado() {
    var svg = document.querySelector('.mi-trazado');
    var fin = document.querySelector('.mi-h1 span:last-child');
    var movil = document.querySelector('.mi-movil');
    var heroe = document.querySelector('.mi-heroe');
    if (!svg || !fin || !movil || !heroe || !document.createRange) return;
    var seccion = svg.parentNode;
    var linea = svg.querySelector('.mi-trazado__linea');
    var brillo = svg.querySelector('.mi-trazado__brillo');
    var wp1 = svg.querySelector('.mi-trazado__wp--1');
    var wp2 = svg.querySelector('.mi-trazado__wp--2');

    function calcula() {
      var s = seccion.getBoundingClientRect();
      function caja(el) {
        var b = el.getBoundingClientRect();
        return { l: b.left - s.left, r: b.right - s.left, t: b.top - s.top, b: b.bottom - s.top, w: b.width };
      }
      // La última línea de la frase, aunque se parta en dos
      var r = document.createRange();
      r.selectNodeContents(fin);
      var rs = r.getClientRects();
      var t = rs.length ? rs[rs.length - 1] : r.getBoundingClientRect();
      // El titular entra subiendo: se descuenta lo que aún esté desplazado
      var m = getComputedStyle(fin.parentNode).transform;
      var dy = m && m !== 'none' ? new DOMMatrixReadOnly(m).m42 : 0;
      var I = caja(movil), C = caja(heroe);
      var ax = t.right - s.left + 16;
      var ay = t.top - dy - s.top + t.height * .55;
      var x1, y1, x2, y2, d1, d2;
      if (I.t > ay + t.height) {
        var xr = s.width - 10;
        x1 = I.l + I.w * .5; y1 = I.t - 1;
        d1 = 'M' + ax + ' ' + ay + 'H' + (xr - 16) + 'Q' + xr + ' ' + ay + ' ' + xr + ' ' + (ay + 16) +
             'V' + (y1 - 40) + 'C' + xr + ' ' + (y1 - 12) + ' ' + x1 + ' ' + (y1 - 26) + ' ' + x1 + ' ' + y1;
        var ys = I.t + (C.t - I.t) * .5;
        x2 = C.l + C.w * .3; y2 = C.t - 1;
        d2 = 'M' + (I.l - 1) + ' ' + ys + 'C' + (I.l - 50) + ' ' + ys + ' ' + x2 + ' ' + (y2 - 40) + ' ' + x2 + ' ' + y2;
      } else {
        y1 = Math.max(I.t + 50, Math.min(ay, I.b - 50, C.t - 30));
        x1 = I.l - 1;
        var c = (x1 - ax) * .55;
        d1 = 'M' + ax + ' ' + ay + 'C' + (ax + c) + ' ' + ay + ' ' + (x1 - c) + ' ' + y1 + ' ' + x1 + ' ' + y1;
        x2 = C.l + C.w * .7; y2 = C.t - 1;
        d2 = 'M' + (I.r + 1) + ' ' + y1 + 'C' + (I.r + 70) + ' ' + y1 + ' ' + x2 + ' ' + (y2 - 60) + ' ' + x2 + ' ' + y2;
      }
      linea.setAttribute('d', d1);
      var l1 = linea.getTotalLength();
      linea.setAttribute('d', d1 + d2);
      brillo.setAttribute('d', d1 + d2);
      var total = linea.getTotalLength();
      wp1.setAttribute('cx', x1); wp1.setAttribute('cy', y1);
      wp2.setAttribute('cx', x2); wp2.setAttribute('cy', y2);
      // Velocidad constante: cada punto se enciende cuando la línea llega
      var dur = Math.min(2.2, Math.max(1.1, total / 650));
      seccion.style.setProperty('--mi-largo', Math.ceil(total) + 1);
      seccion.style.setProperty('--mi-dur', dur.toFixed(2) + 's');
      seccion.style.setProperty('--mi-t1', (.5 + dur * l1 / total).toFixed(2) + 's');
      seccion.style.setProperty('--mi-t2', (.5 + dur).toFixed(2) + 's');
    }

    // Se mide con la letra del titular ya cargada: cambia el ancho de la frase
    letras.then(function () {
      calcula();
      svg.classList.add('is-listo');
      if (!quieto) seccion.classList.add('is-anim');
      vigila(seccion, calcula);
    });
  }

  /* ---------- Ruta de las funciones ---------- */
  function ruta() {
    var caja = document.querySelector('.mi-ruta');
    if (!caja) return;
    var base = caja.querySelector('.mi-ruta__base');
    var linea = caja.querySelector('.mi-ruta__linea');
    var brillo = caja.querySelector('.mi-ruta__brillo');
    var paradas = Array.prototype.slice.call(caja.querySelectorAll('.mi-parada'));
    var puntos = paradas.map(function (p) { return p.querySelector('.mi-parada__wp'); });
    var largos = [], total = 0;
    var hasta = quieto || !('IntersectionObserver' in window) ? paradas.length - 1 : -1;

    function pinta() {
      var off = total - (hasta < 0 ? 0 : largos[hasta]);
      linea.style.strokeDashoffset = off;
      brillo.style.strokeDashoffset = off;
      paradas.forEach(function (p, i) { p.classList.toggle('is-llegada', i <= hasta); });
    }
    function calcula() {
      var c = caja.getBoundingClientRect();
      var ps = puntos.map(function (w) {
        var b = w.getBoundingClientRect();
        return [b.left + b.width / 2 - c.left, b.top + b.height / 2 - c.top];
      });
      // Un tramo de entrada y otro de salida, y curvas suaves entre paradas
      var n = ps.length;
      var todos = [[ps[0][0], ps[0][1] - 40]].concat(ps, [[ps[n - 1][0], ps[n - 1][1] + 40]]);
      var tramos = [];
      for (var i = 0; i < todos.length - 1; i++) {
        var p0 = todos[Math.max(0, i - 1)], p1 = todos[i], p2 = todos[i + 1], p3 = todos[Math.min(todos.length - 1, i + 2)];
        tramos.push('C' + (p1[0] + (p2[0] - p0[0]) / 6) + ' ' + (p1[1] + (p2[1] - p0[1]) / 6) + ' ' +
                    (p2[0] - (p3[0] - p1[0]) / 6) + ' ' + (p2[1] - (p3[1] - p1[1]) / 6) + ' ' + p2[0] + ' ' + p2[1]);
      }
      var inicio = 'M' + todos[0][0] + ' ' + todos[0][1];
      // Largo de la ruta hasta cada parada (la parada k acaba el tramo k)
      largos = ps.map(function (_, k) {
        linea.setAttribute('d', inicio + tramos.slice(0, k + 1).join(''));
        return linea.getTotalLength();
      });
      var d = inicio + tramos.join('');
      linea.setAttribute('d', d);
      brillo.setAttribute('d', d);
      base.setAttribute('d', d);
      total = linea.getTotalLength();
      [linea, brillo].forEach(function (p) { p.style.strokeDasharray = total + ' ' + total; });
      pinta();
    }
    function llega(i) {
      if (i > hasta) { hasta = i; pinta(); }
    }

    calcula();
    caja.classList.add('is-lista');
    vigila(caja, calcula);
    letras.then(calcula);

    /* Sonido de la moto al abrir una parada: el arranque del bóxer en la
       primera y un golpe de gas en las demás (nunca al cerrar, nunca si
       Athenea está hablando). Se descarga al acercarse a la sección y el
       botón «Sonido» lo silencia. Sin JS no hay ni botón ni sonido. */
    var sonidos = null, conSonido = typeof Audio !== 'undefined';
    function preparaSonido() {
      if (sonidos || !conSonido) return;
      sonidos = ['arranque', 'escape'].map(function (k) {
        var a = new Audio('audio/' + k + '.m4a');
        a.preload = 'auto';
        a.volume = .7;
        return a;
      });
    }
    var titulo = document.getElementById('t-funciones');
    if (titulo && conSonido) {
      var bs = document.createElement('button');
      bs.type = 'button';
      bs.className = 'mi-sonido';
      bs.textContent = 'Sonido';
      bs.title = 'Sonido de la moto al abrir una función';
      bs.setAttribute('aria-pressed', 'true');
      bs.addEventListener('click', function () {
        conSonido = bs.getAttribute('aria-pressed') !== 'true';
        bs.setAttribute('aria-pressed', conSonido ? 'true' : 'false');
        if (!conSonido && sonidos) sonidos.forEach(function (a) { a.pause(); });
      });
      titulo.insertAdjacentElement('afterend', bs);
    }
    paradas.forEach(function (p, i) {
      p.querySelector('summary').addEventListener('click', function () {
        // Se suena en el mismo toque: el iPhone no deja sonar audio fuera de él
        if (this.parentNode.open || !conSonido) return;
        if (document.documentElement.classList.contains('mi-athenea-habla')) return;
        preparaSonido();
        sonidos.forEach(function (a) { a.pause(); });
        var a = sonidos[i === 0 ? 0 : 1];
        a.currentTime = 0;
        var pr = a.play();
        if (pr && pr.catch) pr.catch(function () {});
      });
    });

    // Abrir o cerrar una parada mueve las de debajo: se recalcula al momento.
    // Y si es una parada más adelante, la línea llega hasta ella.
    paradas.forEach(function (p, i) {
      p.querySelector('details').addEventListener('toggle', function (e) {
        calcula();
        if (e.target.open) llega(i);
      });
    });
    if (hasta < paradas.length - 1) {
      var vigia = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (e.isIntersecting) { preparaSonido(); llega(paradas.indexOf(e.target)); vigia.unobserve(e.target); }
        });
      }, { rootMargin: '0px 0px -30% 0px' });
      paradas.forEach(function (p) { vigia.observe(p); });
    }
  }

  /* ---------- Capturas en grande ----------
     Al pulsar una captura del carrusel se abre sola y entera, con su pie,
     flechas (y deslizar en el móvil) para pasar a la siguiente y botón de
     cerrar. Esc o tocar fuera también la cierran y el foco vuelve a la
     captura. Sin ventana nativa (<dialog>) el carrusel se queda como está. */
  function visor() {
    var galeria = document.getElementById('galeria');
    var dialogo = document.createElement('dialog');
    if (!galeria || typeof dialogo.showModal !== 'function') return;
    var tomas = Array.prototype.slice.call(galeria.querySelectorAll('.mi-toma'));
    dialogo.className = 'mi-visor';
    dialogo.setAttribute('aria-labelledby', 'mi-visor-pie');
    dialogo.innerHTML =
      '<button type="button" class="mi-visor__cerrar" aria-label="Cerrar"></button>' +
      '<button type="button" class="mi-flecha mi-visor__ant" aria-label="Captura anterior"></button>' +
      '<figure class="mi-visor__fig"><img alt=""><figcaption id="mi-visor-pie"></figcaption></figure>' +
      '<button type="button" class="mi-flecha mi-flecha--sig mi-visor__sig" aria-label="Captura siguiente"></button>';
    document.body.appendChild(dialogo);
    var img = dialogo.querySelector('img');
    var pie = dialogo.querySelector('figcaption');
    var actual = 0, vuelta = null;

    function muestra(i) {
      actual = (i + tomas.length) % tomas.length;
      var t = tomas[actual], o = t.querySelector('img');
      img.src = o.currentSrc || o.src;
      img.alt = o.alt;
      pie.innerHTML = t.querySelector('figcaption').innerHTML;
    }
    function abre(i, boton) {
      vuelta = boton;
      muestra(i);
      document.documentElement.classList.add('mi-sin-scroll');
      dialogo.showModal();
    }
    tomas.forEach(function (t, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'mi-toma__ver';
      b.setAttribute('aria-label', 'Ver en grande: ' + t.querySelector('img').alt);
      b.addEventListener('click', function () { abre(i, b); });
      t.querySelector('.mi-toma__marco').appendChild(b);
    });
    dialogo.querySelector('.mi-visor__cerrar').addEventListener('click', function () { dialogo.close(); });
    dialogo.querySelector('.mi-visor__ant').addEventListener('click', function () { muestra(actual - 1); });
    dialogo.querySelector('.mi-visor__sig').addEventListener('click', function () { muestra(actual + 1); });
    // Tocar el fondo (fuera de la captura y de los botones) cierra
    dialogo.addEventListener('click', function (e) { if (e.target === dialogo) dialogo.close(); });
    dialogo.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { e.preventDefault(); muestra(actual - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); muestra(actual + 1); }
    });
    // Deslizar en el móvil
    var x0 = null;
    dialogo.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    dialogo.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0;
      x0 = null;
      if (Math.abs(dx) > 50) muestra(actual + (dx < 0 ? 1 : -1));
    }, { passive: true });
    dialogo.addEventListener('close', function () {
      document.documentElement.classList.remove('mi-sin-scroll');
      // El carrusel queda en la última captura vista
      galeria.scrollLeft = tomas[actual].offsetLeft - galeria.offsetLeft - 20;
      var b = tomas[actual].querySelector('.mi-toma__ver');
      (b || vuelta).focus({ preventScroll: true });
    });
  }

  /* ---------- Vídeos: botón de pausa, carga al acercarse ---------- */
  function videos() {
    document.querySelectorAll('video.mi-video').forEach(function (v) {
      v.controls = false;
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'mi-vbtn';
      v.parentNode.appendChild(b);
      // Pausado a mano o con «reducir movimiento»: no arranca solo
      var parado = quieto;
      // El de la cabecera no compite con lo primero que se ve: espera a la carga
      var espera = v.hasAttribute('data-tras-carga') && document.readyState !== 'complete';
      var visible = false;
      function pinta() {
        b.classList.toggle('is-parado', v.paused);
        b.setAttribute('aria-label', v.paused ? 'Reproducir el vídeo' : 'Pausar el vídeo');
      }
      function juega() {
        var p = v.play();
        if (p && p.catch) p.catch(pinta);   // modo ahorro del iPhone: queda el botón
      }
      b.addEventListener('click', function () {
        if (v.paused) { parado = false; espera = false; juega(); } else { parado = true; v.pause(); }
      });
      v.addEventListener('play', pinta);
      v.addEventListener('pause', pinta);
      pinta();
      if (espera) {
        window.addEventListener('load', function () {
          espera = false;
          if (visible && !parado) juega();
        });
      }
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (e) {
          visible = e[0].isIntersecting;
          if (visible) { if (!parado && !espera) juega(); }
          else if (!v.paused) v.pause();
        }, { rootMargin: '150px 0px' }).observe(v);
      } else if (!parado) {
        juega();
      }
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    trazado();
    ruta();
    videos();
    visor();

    // Flechas del carrusel: una captura cada vez
    var galeria = document.getElementById('galeria');
    document.querySelectorAll('[data-galeria]').forEach(function (b) {
      b.addEventListener('click', function () {
        var paso = galeria.querySelector('.mi-toma').offsetWidth + 16;
        galeria.scrollBy({ left: paso * Number(b.dataset.galeria), behavior: quieto ? 'auto' : 'smooth' });
      });
    });

    if (quieto || !('IntersectionObserver' in window)) return;

    // Entrada al llegar
    var vigia = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('is-visto');
          vigia.unobserve(e.target);
        }
      });
    }, { rootMargin: '0px 0px -12% 0px' });
    document.querySelectorAll('[data-revela]').forEach(function (el) { vigia.observe(el); });

    // Calzada: un solo cálculo por fotograma, sin leer medidas de la página
    var carriles = document.querySelectorAll('.mi-carril span');
    var pinta = porFotograma(function () {
      var avance = (window.scrollY * 0.35) % 72; // 72 px = un trazo y su hueco (4,5rem)
      carriles.forEach(function (c) { c.style.setProperty('--mi-avance', avance + 'px'); });
    });
    window.addEventListener('scroll', pinta, { passive: true });
    pinta();
  });
})();
