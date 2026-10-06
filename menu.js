/* Menú móvil de MotoIberia, apertura de la pregunta a la que apunta un
   enlace y menú de los enlaces de correo.
   Correo: al pulsar un enlace «mailto:» se ofrece abrir la app de correo,
   Gmail u Outlook (en su web, con el correo nuevo ya dirigido) o copiar la
   dirección. Sirve también para los enlaces que escribe Athenea.
   Si este archivo no carga, los enlaces del menú siguen visibles y
   funcionan, y los de correo abren la app de correo como siempre. */
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

  /* ---------- Menú del correo ---------- */
  var correo = null, origen = null;
  function cierraCorreo(devuelveFoco) {
    if (!correo || correo.hidden) return;
    correo.hidden = true;
    if (devuelveFoco && origen) origen.focus();
    origen = null;
  }
  function abreCorreo(enlace) {
    var m = enlace.getAttribute('href').match(/^mailto:([^?]*)(?:\?(.*))?$/i);
    if (!m) return false;
    var dir = decodeURIComponent(m[1]);
    var asunto = '';
    (m[2] || '').split('&').forEach(function (p) {
      var kv = p.split('=');
      if (kv[0].toLowerCase() === 'subject') asunto = decodeURIComponent(kv[1] || '');
    });
    var a = encodeURIComponent(dir), s = encodeURIComponent(asunto);
    if (!correo) {
      correo = document.createElement('div');
      correo.className = 'mi-correo';
      correo.setAttribute('role', 'dialog');
      correo.setAttribute('aria-label', 'Escribir un correo');
      correo.hidden = true;
      document.body.appendChild(correo);
      correo.addEventListener('click', function (e) {
        var copiar = e.target.closest('.mi-correo__copiar');
        if (copiar) { copia(copiar); return; }
        if (e.target.closest('a')) setTimeout(function () { cierraCorreo(false); }, 0);
      });
    }
    correo.innerHTML =
      '<p class="mi-correo__dir"></p>' +
      '<a class="mi-correo__op" href="' + enlace.getAttribute('href') + '">App de correo</a>' +
      '<a class="mi-correo__op" href="https://mail.google.com/mail/?view=cm&amp;fs=1&amp;to=' + a + (s ? '&amp;su=' + s : '') + '" target="_blank" rel="noopener noreferrer">Gmail</a>' +
      '<a class="mi-correo__op" href="https://outlook.live.com/mail/0/deeplink/compose?to=' + a + (s ? '&amp;subject=' + s : '') + '" target="_blank" rel="noopener noreferrer">Outlook</a>' +
      '<button type="button" class="mi-correo__op mi-correo__copiar">Copiar dirección</button>';
    correo.querySelector('.mi-correo__dir').textContent = dir;
    correo.querySelector('.mi-correo__copiar').setAttribute('data-dir', dir);
    origen = enlace;
    correo.hidden = false;
    // Debajo del enlace, o encima si no cabe; siempre dentro de la pantalla
    var r = enlace.getBoundingClientRect(), w = correo.offsetWidth, h = correo.offsetHeight;
    var x = Math.max(16, Math.min(r.left, window.innerWidth - w - 16));
    var y = r.bottom + 8 + h < window.innerHeight ? r.bottom + 8 : Math.max(16, r.top - h - 8);
    correo.style.left = x + 'px';
    correo.style.top = y + 'px';
    correo.querySelector('.mi-correo__op').focus({ preventScroll: true });
    return true;
  }
  function copia(boton) {
    var dir = boton.getAttribute('data-dir');
    function hecho() {
      boton.textContent = 'Copiado ✓';
      setTimeout(function () { cierraCorreo(true); }, 1200);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(dir).then(hecho, function () { copiaVieja(dir) && hecho(); });
    } else if (copiaVieja(dir)) {
      hecho();
    }
  }
  function copiaVieja(texto) {
    var t = document.createElement('textarea');
    t.value = texto;
    t.setAttribute('readonly', '');
    t.style.position = 'fixed';
    t.style.opacity = '0';
    document.body.appendChild(t);
    t.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(t);
    return ok;
  }
  document.addEventListener('click', function (e) {
    var enlace = e.target.closest && e.target.closest('a[href^="mailto:"]');
    if (enlace && !enlace.closest('.mi-correo')) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (abreCorreo(enlace)) e.preventDefault();
      return;
    }
    if (correo && !correo.hidden && !e.target.closest('.mi-correo')) cierraCorreo(false);
  });
  // Escape cierra solo el menú del correo (aunque esté sobre el panel de Athenea)
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && correo && !correo.hidden) {
      e.stopImmediatePropagation();
      cierraCorreo(true);
    }
  }, true);
  window.addEventListener('resize', function () { cierraCorreo(false); });
  window.addEventListener('scroll', function () { cierraCorreo(false); }, { passive: true });

  document.addEventListener('DOMContentLoaded', function () {
    abrirPregunta();
    window.addEventListener('hashchange', abrirPregunta);

    var boton = document.querySelector('.mi-menu-btn');
    var menu = document.getElementById('mi-nav');

    function abrir(si) {
      menu.classList.toggle('is-open', si);
      boton.setAttribute('aria-expanded', si ? 'true' : 'false');
    }

    // Escape cierra el menú y devuelve el foco al botón
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (boton && boton.getAttribute('aria-expanded') === 'true') {
        abrir(false);
        boton.focus();
      }
    });

    if (!boton || !menu) return;

    boton.addEventListener('click', function () {
      abrir(boton.getAttribute('aria-expanded') !== 'true');
    });

    // Al pulsar un enlace del menú, se cierra
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) abrir(false);
    });
  });
})();
