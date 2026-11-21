export function activarCarrusel(avisos, crearTarjeta) {
  if (!avisos.length) return;
  const seccion = document.getElementById("carrusel");
  const contenedor = document.getElementById("carrusel-avisos");
  const tarjetas = avisos.map((aviso, indice) => crearTarjeta(aviso, "carrusel", indice));
  tarjetas.forEach((tarjeta, indice) => { tarjeta.hidden = indice !== 0; });
  contenedor.append(...tarjetas);
  document.getElementById("carrusel-vacio").hidden = true;
  document.getElementById("carrusel-tarjetas").hidden = false;
  if (tarjetas.length < 2) return;

  const pausa = document.getElementById("carrusel-pausa");
  const posicion = document.getElementById("carrusel-posicion");
  const anuncio = document.getElementById("carrusel-anuncio");
  const movimiento = matchMedia("(prefers-reduced-motion: reduce)");
  let indice = 0;
  let auto = !movimiento.matches;
  let punteroDentro = false;
  let visible = false;
  let temporizador;

  function mostrar(nuevoIndice) {
    tarjetas[indice].hidden = true;
    indice = (nuevoIndice + tarjetas.length) % tarjetas.length;
    tarjetas[indice].hidden = false;
    posicion.textContent = (indice + 1) + " / " + tarjetas.length;
  }

  function programar() {
    clearTimeout(temporizador);
    if (auto && visible && !punteroDentro && !document.hidden && !document.getElementById("visor").open
        && !seccion.contains(document.activeElement)) {
      temporizador = setTimeout(() => {
        mostrar(indice + 1);
        programar();
      }, 7000);
    }
  }

  function ajustarPausa() {
    pausa.textContent = auto ? "Pausar" : "Reproducir";
    programar();
  }

  function avanzar(pasos) {
    mostrar(indice + pasos);
    anuncio.textContent = "Aviso " + (indice + 1) + " de " + tarjetas.length + ". " + avisos[indice].titulo;
    programar();
  }

  function abrirAvisoEnlazado() {
    const destino = tarjetas.findIndex(tarjeta => "#" + tarjeta.id === location.hash);
    if (destino < 0) return;
    auto = false;
    mostrar(destino);
    ajustarPausa();
    tarjetas[destino].scrollIntoView({ block: "start" });
  }

  mostrar(0);
  pausa.closest(".carrusel-controles").hidden = false;
  pausa.addEventListener("click", () => { auto = !auto; ajustarPausa(); });
  document.getElementById("carrusel-anterior").addEventListener("click", () => avanzar(-1));
  document.getElementById("carrusel-siguiente").addEventListener("click", () => avanzar(1));
  seccion.addEventListener("mouseenter", () => { punteroDentro = true; programar(); });
  seccion.addEventListener("mouseleave", () => { punteroDentro = false; programar(); });
  seccion.addEventListener("focusin", programar);
  seccion.addEventListener("focusout", () => queueMicrotask(programar));
  document.addEventListener("visibilitychange", programar);
  const observador = new IntersectionObserver(([entrada]) => {
    visible = entrada.isIntersecting;
    programar();
  });
  observador.observe(seccion);
  document.getElementById("visor").addEventListener("close", programar);
  window.addEventListener("hashchange", abrirAvisoEnlazado);
  movimiento.addEventListener("change", evento => {
    if (evento.matches) auto = false;
    ajustarPausa();
  });
  ajustarPausa();
  abrirAvisoEnlazado();
}
