/* Movimiento de la portada de MotoIberia: los bloques entran al llegar a
   ellos, la línea de la calzada avanza con el desplazamiento, las capturas
   de la cabecera se mueven un poco (paralaje) y las flechas del carrusel.
   Con «reducir movimiento» solo quedan las flechas. Si este archivo no
   carga, todo se ve igual, sin moverse. */
(function () {
  var quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!quieto && 'IntersectionObserver' in window) {
    document.documentElement.classList.add('mi-mov');
  }

  document.addEventListener('DOMContentLoaded', function () {
    // El vídeo de la cabecera: quieto con «reducir movimiento» y en pausa
    // cuando no se ve, para no gastar batería.
    var video = document.querySelector('.mi-video');
    if (video) {
      if (quieto) {
        video.removeAttribute('autoplay');
        video.pause();
        video.controls = true;
      } else if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (e) {
          if (e[0].isIntersecting) { var p = video.play(); if (p && p.catch) p.catch(function () {}); }
          else video.pause();
        }).observe(video);
      }
    }

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

    // Calzada y paralaje: un solo cálculo por fotograma
    var carriles = document.querySelectorAll('.mi-carril span');
    var paralaje = document.querySelectorAll('[data-paralaje]');
    var pendiente = false;
    function pinta() {
      pendiente = false;
      var y = window.scrollY;
      var avance = (y * 0.35) % 72; // 72 px = un trazo y su hueco (4,5rem)
      carriles.forEach(function (c) { c.style.setProperty('--mi-avance', avance + 'px'); });
      if (y < window.innerHeight * 1.2) {
        paralaje.forEach(function (p) {
          p.style.setProperty('--mi-par', (y * Number(p.dataset.paralaje)).toFixed(1) + 'px');
        });
      }
    }
    window.addEventListener('scroll', function () {
      if (!pendiente) { pendiente = true; requestAnimationFrame(pinta); }
    }, { passive: true });
    pinta();
  });
})();
