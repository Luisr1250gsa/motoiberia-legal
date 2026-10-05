/* Athenea, la asistente de la web.

   Responde a preguntas predefinidas sobre la app. Cada respuesta es la
   misma de la página de soporte o de la portada; la voz (audio/asis/NN.m4a,
   00 es el saludo y 01-09 siguen el orden de PREGUNTAS) dice un resumen y
   el texto va completo. No se envía nada a ningún servidor.

   Avatar: cuatro fotogramas (img/athenea/*.webp: base, boca entreabierta,
   boca abierta y ojos cerrados). La boca sigue a la voz: el mismo audio se
   decodifica aparte y se mide su volumen cada 40 ms. Parpadeo y respiración
   en reposo.

   La voz está encendida por defecto; el botón «Voz» la apaga. */
(function () {
  /* Conversación libre: desactivada. */
  var CHAT_LIBRE = false;
  var URL_ATHENEA = '';
  var LIMITE_DIA = 10;
  var CORREO = '<a href="mailto:AsesoramientoAsistia@outlook.es">correo</a>';
  var PREGUNTAS = [
    ['¿Qué necesito para usar CarPlay?',
     'Un iPhone con iOS 15 o posterior y una pantalla compatible con CarPlay, de serie o de posventa (por ejemplo, las pantallas para moto). Que sea con cable o inalámbrica depende de tu pantalla, no de la app. La primera vez, abre la app en el iPhone y permite la ubicación: el coche no puede pedir ese permiso. Después, la navegación va en la pantalla y el iPhone puede ir bloqueado en el bolsillo.'],
    ['¿Cómo creo una ruta?',
     'En Explorar: una ruta curada, elígela y pulsa «Navegar»; con IA, el botón «Ruta con IA» (necesita cuenta); la tuya, el botón «Mi ruta» (icono de carretera con lápiz): toca el mapa o busca una dirección y pulsa «Navegar».'],
    ['¿Necesito cuenta?',
     'No para empezar. Sin cuenta: ver las rutas curadas, navegarlas (también en CarPlay), crear tu ruta en «Mi ruta» y ver gasolineras y talleres. Con cuenta: rutas con IA, comunidad, guardar rutas, subir fotos, historial, garaje y mantenimiento.'],
    ['¿Es gratis?',
     'Sí. La app es gratuita y puedes empezar sin cuenta.'],
    ['¿Qué radares avisa?',
     'Los radares fijos y de tramo de la DGT. No incluye radares municipales ni los de Cataluña, el País Vasco o Portugal.'],
    ['¿Hay versión para Android?',
     'De momento, solo iPhone.'],
    ['¿Cómo denuncio o bloqueo a alguien?',
     'En cada publicación y cada comentario hay un menú con «Denunciar» y «Bloquear». Denunciar nos llega y lo revisamos en menos de 24 horas. Bloquear: dejas de ver a esa persona en toda la app al instante, y puedes desbloquearla desde tu perfil. También puedes escribirnos al ' + CORREO + '.'],
    ['¿Qué datos guarda la app?',
     'Lo mínimo para que funcione. No vendemos tus datos ni usamos publicidad de terceros. Todo el detalle está en la <a href="privacidad.html">Política de Privacidad</a>.'],
    ['¿Cómo borro mi cuenta?',
     'Desde Perfil → Eliminar cuenta. El borrado es inmediato e irreversible.']
  ];

  var quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var habla = typeof Audio !== 'undefined';
  var conVoz = habla;
  /* Un solo reproductor: Safari en iPhone solo deja sonar audio que arranca
     dentro del toque, así que se lanza en el mismo clic. */
  var reproductor = habla ? new Audio() : null;

  function di(n) {
    if (!conVoz) return;
    reproductor.pause();
    reproductor.src = 'audio/asis/' + (n < 10 ? '0' : '') + n + '.m4a';
    envDeFichero(n);
    var p = reproductor.play();
    if (p && p.catch) p.catch(function () {});
  }
  function calla() { cola = null; if (habla) reproductor.pause(); }
  /* Safari en iPhone no deja sonar un audio que llega segundos después del
     toque. Se «desbloquea» el reproductor en el mismo toque con un
     silencio de 0,15 s; luego ya acepta el audio de la respuesta. */
  function desbloquea() {
    if (!conVoz) return;
    reproductor.src = 'audio/asis/silencio.m4a';
    var p = reproductor.play();
    if (p && p.catch) p.catch(function () {});
  }
  /* La voz de una respuesta libre llega en TROZOS (el primero con el
     texto; los demás, firmados por el servidor, se piden mientras suena):
     así empieza a hablar en ~5 s en vez de ~11. Se encadenan al acabar
     cada uno. `largos` son los caracteres de cada trozo, para repartir el
     texto en pantalla al ritmo de la voz. */
  var cola = null;
  function tocaTrozo(k) {
    var c = cola;
    if (!c || !conVoz) return;
    c.idx = k;
    c.esperando = false;
    var b64 = c.audios[k];
    if (b64 === false) { siguienteTrozo(); return; }   // ese trozo falló: se salta
    if (!b64) { c.esperando = true; c.desde = Date.now(); return; }   // aún no ha llegado
    reproductor.src = 'data:audio/mpeg;base64,' + b64;
    envDeBase64(b64);
    var p = reproductor.play();
    // Si el navegador no deja sonar, se abandona la voz: el texto sigue solo.
    if (p && p.catch) p.catch(function () { if (cola === c) cola = null; });
  }
  function siguienteTrozo() {
    var c = cola;
    if (!c) return;
    c.hechos += c.largos[c.idx] || 0;
    if (c.idx + 1 < c.audios.length) tocaTrozo(c.idx + 1);
    else c.terminada = true;
  }
  function suena(j) {
    if (!conVoz || !j || !j.audio) return;
    reproductor.pause();
    var largos = j.largos && j.largos.length ? j.largos : [1];
    var c = cola = {
      audios: [j.audio].concat((j.trozos || []).map(function () { return null; })),
      largos: largos,
      total: largos.reduce(function (a, b) { return a + b; }, 0) || 1,
      idx: 0, hechos: 0, esperando: false, terminada: false
    };
    (j.trozos || []).forEach(function (tz, n) {
      fetch(URL_ATHENEA, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trozo: tz }) })
        .then(function (r) { return r.json(); })
        .then(function (x) { c.audios[n + 1] = x.audio || false; })
        .catch(function () { c.audios[n + 1] = false; })
        .then(function () { if (cola === c && c.esperando && c.idx === n + 1) tocaTrozo(n + 1); });
    });
    tocaTrozo(0);
  }
  if (habla) {
    reproductor.addEventListener('ended', function () {
      if (cola && reproductor.src.indexOf('silencio') < 0) siguienteTrozo();
    });
  }
  /* Cuánto de la respuesta se ha dicho ya (0 a 1), o null si no suena voz */
  function progresoVoz() {
    if (!habla || !conVoz || (reproductor.src || '').indexOf('silencio') >= 0) return null;
    var d = reproductor.duration;
    var parte = reproductor.ended ? 1 : (d > 0 && isFinite(d) ? Math.min(1, reproductor.currentTime / (d * 0.95)) : 0);
    if (cola) {
      if (cola.terminada) return 1;
      // Ni suena ni espera un trozo (o lleva >4 s esperándolo): sin voz,
      // y el texto sigue a su ritmo. Nunca se queda colgado.
      if (cola.esperando ? Date.now() - cola.desde > 4000 : (reproductor.paused && !reproductor.ended)) return null;
      var enCurso = cola.esperando ? 0 : (cola.largos[cola.idx] || 0) * parte;
      return Math.min(1, (cola.hechos + enCurso) / cola.total);
    }
    if (reproductor.paused && !reproductor.ended) return null;
    return parte;
  }

  /* ---------- Avatar ---------- */
  var FOTOGRAMAS = ['base', 'boca-media', 'boca-abierta', 'ojos-cerrados'];
  FOTOGRAMAS.forEach(function (k) { var i = new Image(); i.src = 'img/athenea/' + k + '.webp'; });
  var caras = [];          // los avatares animados de la página
  var envolvente = null;   // nivel de la voz cada 40 ms, de 0 a 1
  var hablando = false, bucle = 0, ultimo = 0, actual = 'base';
  var cacheEnv = {};

  function cara(k) {
    if (k === actual) return;
    actual = k;
    caras.forEach(function (c) {
      c.querySelectorAll('img').forEach(function (im) { im.classList.toggle('is-on', im.getAttribute('data-k') === k); });
    });
  }
  function marcaHablando(si) {
    hablando = si;
    caras.forEach(function (c) { c.classList.toggle('is-hablando', si); });
  }
  function mideVoz(buf, cb) {
    try {
      var C = window.OfflineAudioContext || window.webkitOfflineAudioContext;
      if (!C) return cb(null);
      new C(1, 1, 22050).decodeAudioData(buf, function (ab) {
        var d = ab.getChannelData(0), paso = Math.round(ab.sampleRate * 0.04);
        var n = Math.ceil(d.length / paso), v = new Float32Array(n);
        for (var i = 0; i < n; i++) {
          var s2 = 0, f = Math.min(d.length, (i + 1) * paso);
          for (var j = i * paso; j < f; j++) s2 += d[j] * d[j];
          v[i] = Math.sqrt(s2 / Math.max(1, f - i * paso));
        }
        var orden = Array.prototype.slice.call(v).sort(function (a, b) { return a - b; });
        var alto = orden[Math.floor(n * 0.95)] || 1;
        for (var k = 0; k < n; k++) v[k] = Math.min(1, v[k] / alto);
        /* Suavizado (media de 3 tramos): la boca no salta en cada sílaba. */
        var sv = new Float32Array(n);
        for (var q = 0; q < n; q++) sv[q] = (v[Math.max(0, q - 1)] + v[q] + v[Math.min(n - 1, q + 1)]) / 3;
        cb(sv);
      }, function () { cb(null); });
    } catch (e) { cb(null); }
  }
  function envDeFichero(n) {
    envolvente = null;
    if (cacheEnv[n]) { envolvente = cacheEnv[n]; return; }
    fetch('audio/asis/' + (n < 10 ? '0' : '') + n + '.m4a')
      .then(function (r) { return r.arrayBuffer(); })
      .then(function (b) { mideVoz(b, function (v) { cacheEnv[n] = v; envolvente = v; }); })
      .catch(function () {});
  }
  function envDeBase64(b64) {
    envolvente = null;
    try {
      var bin = atob(b64), u = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
      mideVoz(u.buffer, function (v) { envolvente = v; });
    } catch (e) {}
  }
  function anima(t) {
    var suenaVoz = habla && !reproductor.paused && !reproductor.ended &&
      reproductor.src.indexOf('silencio') < 0;
    if (!suenaVoz) { bucle = 0; marcaHablando(false); cara('base'); return; }
    if (!hablando) marcaHablando(true);
    if (t - ultimo > 60) {   // como mucho un cambio cada 60 ms: sin parpadeo de boca
      ultimo = t;
      var k;
      if (envolvente) {
        var v = envolvente[Math.floor(reproductor.currentTime / 0.04)] || 0;
        // Casi siempre entreabierta; abierta solo en los picos claros.
        k = v > 0.9 ? 'boca-abierta' : v > 0.38 ? 'boca-media' : 'base';
      } else {
        k = ['boca-media', 'base', 'boca-media', 'boca-media', 'base'][Math.floor(t / 140) % 5];
      }
      cara(k);
    }
    bucle = requestAnimationFrame(anima);
  }
  if (habla) {
    reproductor.addEventListener('playing', function () { if (!bucle) bucle = requestAnimationFrame(anima); });
  }
  (function parpadea() {
    setTimeout(function () {
      if (!hablando && caras.length) {
        cara('ojos-cerrados');
        setTimeout(function () { if (!hablando) cara('base'); }, 130);
      }
      parpadea();
    }, 2600 + Math.random() * 3400);
  })();
  function avatarHTML(clase) {
    return '<span class="mi-avatar ' + clase + '" aria-hidden="true"><span class="mi-avatar__in">' +
      FOTOGRAMAS.map(function (k) {
        return '<img src="img/athenea/' + k + '.webp" data-k="' + k + '" alt=""' + (k === 'base' ? ' class="is-on"' : '') + '>';
      }).join('') + '</span></span>';
  }

  /* Contador orientativo en este navegador, solo para avisar cuando
     quedan pocas. El que manda es el del servidor. */
  function hoy() { return new Date().toISOString().slice(0, 10); }
  function usadas() {
    try {
      var g = JSON.parse(localStorage.getItem('athenea-uso') || '{}');
      return g.dia === hoy() ? g.n : 0;
    } catch (e) { return 0; }
  }
  function anotaUso() {
    try { localStorage.setItem('athenea-uso', JSON.stringify({ dia: hoy(), n: usadas() + 1 })); } catch (e) {}
  }

  /* La respuesta del modelo llega en texto con algo de markdown. Se
     escapa TODO primero y solo después se reconocen negritas, listas,
     enlaces de la propia web y el correo: nada de lo que llegue se
     interpreta como HTML. */
  function escapa(t) {
    return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function lista(items) {
    return '<ul>' + items.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>';
  }
  function formatea(texto) {
    var html = '', items = null;
    escapa(texto).split('\n').forEach(function (l) {
      var m = l.match(/^\s*(?:[-•*]|\d+[.)])\s+(.*)$/);
      if (m) { (items = items || []).push(m[1]); return; }
      if (items) { html += lista(items); items = null; }
      if (l.trim()) html += '<p>' + l + '</p>';
    });
    if (items) html += lista(items);
    return html
      .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
      .replace(/\b(?:https?:\/\/)?((?:www\.)?(?:motoiberia\.asist-ia\.org|aepd\.es)(?:\/[\w./-]*)?)/g, function (_, resto) {
        var limpio = resto.replace(/[.)]+$/, '');
        return '<a href="https://' + limpio + '" target="_blank" rel="noopener">' + limpio + '</a>' + resto.slice(limpio.length);
      })
      .replace(/\b(AsesoramientoAsistia@outlook\.es)\b/g, '<a href="mailto:$1">$1</a>');
  }

  document.addEventListener('DOMContentLoaded', function () {
    var raiz = document.createElement('div');
    raiz.className = 'mi-asis' + (CHAT_LIBRE ? ' mi-asis--chat' : '');
    raiz.innerHTML =
      '<button type="button" class="mi-asis__abrir" aria-expanded="false" aria-controls="mi-asis-panel">' +
        '<img class="mi-asis__cara" src="img/athenea/base.webp" width="40" height="40" alt=""><span>Pregunta a Athenea</span></button>' +
      '<section class="mi-asis__panel" id="mi-asis-panel" role="dialog" aria-label="Athenea, asistente de MotoIberia" hidden>' +
        '<header class="mi-asis__cab">' +
          avatarHTML('mi-avatar--cab') +
          '<div><p class="mi-asis__nombre">Athenea</p><p class="mi-asis__sub">' + (CHAT_LIBRE ? 'Asistente con IA' : 'Asistente virtual') + '</p></div>' +
          (habla ? '<button type="button" class="mi-asis__voz" aria-pressed="true" title="Athenea te responde en voz alta">Voz</button>' : '') +
          '<button type="button" class="mi-asis__cerrar" aria-label="Cerrar"></button>' +
        '</header>' +
        '<div class="mi-asis__charla" aria-live="polite"></div>' +
        '<div class="mi-asis__opciones" role="group" aria-label="Preguntas rápidas"></div>' +
        (CHAT_LIBRE ?
        '<form class="mi-asis__form">' +
          '<label class="mi-asis__oculto" for="mi-asis-texto">Escribe tu pregunta</label>' +
          '<input id="mi-asis-texto" class="mi-asis__texto" type="text" maxlength="400" autocomplete="off" enterkeyhint="send" placeholder="Escribe tu pregunta…">' +
          '<button type="submit" class="mi-asis__enviar" aria-label="Enviar"></button>' +
        '</form>' : '') +
        '<p class="mi-asis__sello">' + (CHAT_LIBRE ? 'Asistente con IA · información orientativa' : 'Respuestas predefinidas · información orientativa') + '. Lo que vale es la <a href="privacidad.html">Política de Privacidad</a> y los <a href="terminos.html">Términos</a>.' + (CHAT_LIBRE ? ' No escribas datos personales.' : '') + '</p>' +
      '</section>';
    document.body.appendChild(raiz);

    var abrir = raiz.querySelector('.mi-asis__abrir');
    var panel = raiz.querySelector('.mi-asis__panel');
    var charla = raiz.querySelector('.mi-asis__charla');
    var opciones = raiz.querySelector('.mi-asis__opciones');
    var voz = raiz.querySelector('.mi-asis__voz');
    var form = raiz.querySelector('.mi-asis__form');
    var texto = raiz.querySelector('.mi-asis__texto');
    var enviar = raiz.querySelector('.mi-asis__enviar');
    var saludado = false;
    caras = Array.prototype.slice.call(raiz.querySelectorAll('.mi-avatar'));
    var historial = [];  // solo la charla libre: es lo que la función necesita
    var ocupada = false;

    function burbuja(html, quien) {
      var b = document.createElement('div');
      b.className = 'mi-asis__msg mi-asis__msg--' + quien;
      b.innerHTML = html;
      charla.appendChild(b);
      charla.scrollTop = charla.scrollHeight;
      return b;
    }
    function escribiendo() {
      var b = burbuja('<span class="mi-asis__puntos"><i></i><i></i><i></i></span>', 'app');
      b.setAttribute('aria-hidden', 'true');
      return b;
    }
    function rellena(b, html) {
      b.removeAttribute('aria-hidden');
      b.innerHTML = html;
      charla.scrollTop = charla.scrollHeight;
    }

    /* El texto de la respuesta aparece palabra a palabra, al ritmo de la voz
       si suena; la charla baja siguiendo la última palabra. */
    var revelando = null;
    function revela(b, html, conAudio, alTerminar) {
      if (revelando) revelando.fin();
      b.removeAttribute('aria-hidden');
      b.innerHTML = html;
      var andador = document.createTreeWalker(b, NodeFilter.SHOW_TEXT), nodos = [], nd;
      while ((nd = andador.nextNode())) nodos.push(nd);
      nodos.forEach(function (t) {
        var trozo = document.createDocumentFragment();
        t.nodeValue.split(/(\s+)/).forEach(function (w) {
          if (!w) return;
          if (/^\s+$/.test(w)) { trozo.appendChild(document.createTextNode(w)); return; }
          var sp = document.createElement('span');
          sp.className = 'mi-pal';
          sp.textContent = w;
          trozo.appendChild(sp);
        });
        t.parentNode.replaceChild(trozo, t);
      });
      var pal = b.querySelectorAll('.mi-pal'), n = pal.length, i = 0, t0 = Date.now(), id;
      function sigue() {
        var u = pal[i - 1];
        if (!u) return;
        /* Posición real en pantalla, no offsetTop: la animación de entrada
           de la burbuja cambiaba la referencia de offsetTop y la charla no
           bajaba nunca (medido el 02/10: 36 palabras dichas, 8 a la vista). */
        var sobra = u.getBoundingClientRect().bottom + 12 - charla.getBoundingClientRect().bottom;
        if (sobra > 0) charla.scrollTop += sobra;
      }
      function hasta(m) {
        while (i < Math.min(m, n)) pal[i++].classList.add('is-v');
        sigue();
        if (i >= n) fin();
      }
      function fin() {
        if (!revelando || revelando.id !== id) return;
        clearInterval(id);
        revelando = null;
        while (i < n) pal[i++].classList.add('is-v');
        if (alTerminar) alTerminar();
      }
      if (quieto || !n) { revelando = { id: 0, fin: fin }; id = 0; fin(); return; }
      id = setInterval(function () {
        var p = conAudio ? progresoVoz() : null;
        if (p !== null) {
          hasta(Math.ceil(n * p));
        } else if (conAudio && conVoz && habla && Date.now() - t0 < 2500) {
          // esperando a que arranque la voz
        } else {
          hasta(i + 1);
        }
      }, 60);
      revelando = { id: id, fin: fin };
    }

    PREGUNTAS.forEach(function (p, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'mi-asis__op';
      b.textContent = p[0];
      b.addEventListener('click', function () {
        calla();
        burbuja('', 'tu').textContent = p[0];
        var e = escribiendo();
        di(i + 1);
        setTimeout(function () { revela(e, p[1], true); }, quieto ? 0 : 650);
      });
      opciones.appendChild(b);
    });

    if (form) form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var pregunta = texto.value.trim();
      if (!pregunta || ocupada) return;
      calla();
      if (revelando) revelando.fin();
      desbloquea();
      ocupada = true;
      enviar.disabled = true;
      texto.value = '';
      burbuja('', 'tu').textContent = pregunta;
      var e = escribiendo();
      fetch(URL_ATHENEA, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pregunta: pregunta, historial: historial.slice(-6), voz: conVoz })
      })
        .then(function (r) { return r.json().catch(function () { return {}; }); })
        .then(function (j) {
          var resp = j.respuesta || 'Se me ha calado el motor un momento. Prueba otra vez en unos segundos.';
          var aviso = null;
          if (!j.error) {
            historial.push({ rol: 'usuario', texto: pregunta }, { rol: 'athenea', texto: resp });
            if (!j.motivo) anotaUso();
            var quedan = LIMITE_DIA - usadas();
            if (quedan > 0 && quedan <= 3) aviso = 'Te quedan ' + quedan + (quedan === 1 ? ' pregunta' : ' preguntas') + ' libres por hoy. Las rápidas no cuentan.';
          }
          // El aviso, al terminar: si sale antes, la charla salta al fondo.
          revela(e, formatea(resp), !!j.audio, aviso ? function () { burbuja(aviso, 'aviso'); } : null);
          suena(j);
        })
        .catch(function () {
          rellena(e, 'No he podido conectar. Revisa la conexión y vuelve a probar.');
        })
        .then(function () {
          ocupada = false;
          enviar.disabled = false;
        });
    });

    function muestra(si) {
      panel.hidden = !si;
      abrir.setAttribute('aria-expanded', si ? 'true' : 'false');
      raiz.classList.toggle('is-abierto', si);
      if (si) {
        if (!saludado) {
          saludado = true;
          burbuja(CHAT_LIBRE
            ? 'Hola, soy <b>Athenea</b>. Elige una pregunta rápida o escríbeme lo que quieras saber de la app.'
            : 'Hola, soy <b>Athenea</b>. Elige una pregunta y te respondo.', 'app');
          di(0);
        }
        /* El foco va a la primera pregunta, no a la casilla: en el móvil,
           enfocar la casilla abre el teclado y tapa medio panel. */
        opciones.querySelector('button').focus({ preventScroll: true });
      } else {
        calla();
        abrir.focus();
      }
    }
    abrir.addEventListener('click', function () { muestra(panel.hidden); });
    raiz.querySelector('.mi-asis__cerrar').addEventListener('click', function () { muestra(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !panel.hidden) muestra(false);
    });
    if (voz) {
      voz.addEventListener('click', function () {
        conVoz = !conVoz;
        voz.setAttribute('aria-pressed', conVoz ? 'true' : 'false');
        if (!conVoz) calla();
      });
    }
  });
})();
