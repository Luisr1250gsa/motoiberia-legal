/* Menú móvil de MotoIberia y apertura de la pregunta a la que apunta un enlace.
   Si este archivo no carga, los enlaces del menú siguen visibles y funcionan. */
(function () {
  document.documentElement.classList.add('mi-js');

  // Si el enlace apunta a una pregunta cerrada (soporte.html#carplay), se abre
  function abrirPregunta() {
    var id = decodeURIComponent(location.hash.slice(1));
    if (!id) return;
    var el = document.getElementById(id);
    var caja = el && el.closest('details');
    if (caja && !caja.open) {
      caja.open = true;
      el.scrollIntoView();
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    abrirPregunta();
    window.addEventListener('hashchange', abrirPregunta);

    var boton = document.querySelector('.mi-menu-btn');
    var menu = document.getElementById('mi-nav');
    if (!boton || !menu) return;

    function abrir(si) {
      menu.classList.toggle('is-open', si);
      boton.setAttribute('aria-expanded', si ? 'true' : 'false');
    }

    boton.addEventListener('click', function () {
      abrir(boton.getAttribute('aria-expanded') !== 'true');
    });

    // Escape cierra el menú y devuelve el foco al botón
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && boton.getAttribute('aria-expanded') === 'true') {
        abrir(false);
        boton.focus();
      }
    });

    // Al pulsar un enlace del menú, se cierra
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) abrir(false);
    });
  });
})();
