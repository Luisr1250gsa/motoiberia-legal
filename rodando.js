/* La cinta de fotos de «Carreteras»: el botón la para y la vuelve a mover.
   El movimiento lo pone el CSS (solo si movimiento.js ha marcado la página
   con .mi-mov, o sea sin «reducir movimiento»); aquí solo se cambia el
   estado. Sin este archivo la cinta se mueve igual y se para con el ratón
   o al enfocarla. */
(function () {
  var cinta = document.querySelector('.mi-cinta');
  if (!cinta) return;
  var boton = cinta.querySelector('.mi-cinta__pausa');
  boton.addEventListener('click', function () {
    var pausada = cinta.classList.toggle('is-pausada');
    boton.setAttribute('aria-pressed', pausada ? 'true' : 'false');
    boton.textContent = pausada ? 'Mover fotos' : 'Pausar fotos';
  });
})();
