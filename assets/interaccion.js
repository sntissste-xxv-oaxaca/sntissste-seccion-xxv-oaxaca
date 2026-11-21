const visor = document.getElementById("visor");
const imagenAmpliada = document.getElementById("imagen-visor");
document.getElementById("cerrar-visor").addEventListener("click", () => visor.close());
visor.addEventListener("close", () => imagenAmpliada.removeAttribute("src"));

export function mostrarImagen(padre, fuente, descripcion, { inmediata = false, alFallar } = {}) {
  if (!fuente) return false;
  const figura = document.createElement("figure");
  figura.className = "media-publica";
  const imagen = document.createElement("img");
  imagen.className = "cartel";
  imagen.alt = descripcion;
  imagen.loading = inmediata ? "eager" : "lazy";
  imagen.decoding = "async";
  if (inmediata) imagen.fetchPriority = "high";
  imagen.addEventListener("error", () => {
    figura.remove();
    alFallar?.();
  }, { once: true });
  const abrir = document.createElement("button");
  abrir.type = "button";
  abrir.className = "boton boton-secundario";
  abrir.textContent = "Ampliar imagen";
  abrir.addEventListener("click", () => {
    imagenAmpliada.src = fuente;
    imagenAmpliada.alt = descripcion;
    visor.showModal();
  });
  figura.append(imagen, abrir);
  padre.append(figura);
  imagen.src = fuente;
  return true;
}

export function activarMenuMovil() {
  const boton = document.getElementById("menu-boton");
  const menu = document.getElementById("menu-principal");
  const pantalla = matchMedia("(max-width: 640px)");
  function mostrar(abierto) {
    menu.hidden = pantalla.matches && !abierto;
    boton.setAttribute("aria-expanded", String(pantalla.matches && abierto));
  }
  function ajustarPantalla() {
    const focoEnMenu = menu.contains(document.activeElement);
    if (pantalla.matches) {
      boton.hidden = false;
      mostrar(false);
      if (focoEnMenu) boton.focus();
    } else {
      mostrar(true);
      if (document.activeElement === boton) menu.querySelector("a").focus();
      boton.hidden = true;
    }
  }
  boton.addEventListener("click", () => mostrar(menu.hidden));
  menu.addEventListener("click", evento => {
    const enlace = evento.target.closest("a[href^='#']");
    if (!enlace || !pantalla.matches || evento.ctrlKey || evento.metaKey || evento.shiftKey || evento.altKey) return;
    mostrar(false);
    const destino = document.getElementById(enlace.hash.slice(1));
    if (!destino || destino.closest("[hidden]")) {
      boton.focus();
      return;
    }
    destino.tabIndex = -1;
    destino.focus({ preventScroll: true });
  });
  boton.closest("header").addEventListener("keydown", evento => {
    if (evento.key !== "Escape" || !pantalla.matches || menu.hidden) return;
    mostrar(false);
    boton.focus();
  });
  pantalla.addEventListener("change", ajustarPantalla);
  ajustarPantalla();
}

export function activarTextoGrande() {
  const boton = document.getElementById("tamano-texto");
  const clave = "sntissste-xxv-texto-grande";
  function aplicar(activo) {
    document.documentElement.classList.toggle("letra-grande", activo);
    boton.setAttribute("aria-pressed", String(activo));
  }
  try { aplicar(localStorage.getItem(clave) === "true"); } catch {}
  boton.addEventListener("click", () => {
    const activo = boton.getAttribute("aria-pressed") !== "true";
    aplicar(activo);
    try { localStorage.setItem(clave, String(activo)); } catch {}
  });
  boton.hidden = false;
}

const grupos = {
  carrusel: ["Avisos recientes", "carrusel", "carteles avisos"],
  noticias: ["Noticias", "noticias", "información publicaciones"],
  comunicados: ["Comunicados", "comunicados", "avisos oficiales"],
  documentos: ["Documentos y descargas", "descargas", "PDF archivos formatos"],
  directorio: ["Directorio seccional", "directorio", "contacto teléfonos áreas"],
  enlaces: ["Enlaces institucionales", "enlaces", "portales servicios sitios"],
  preguntas: ["Preguntas frecuentes", "faq", "ayuda dudas"],
};

function normalizar(valor) {
  return valor.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

export function idRegistro(clave, indice) {
  return "registro-" + clave + "-" + (indice + 1);
}

export function activarBuscador(datos) {
  const form = document.getElementById("buscador");
  const campo = document.getElementById("consulta");
  const resultados = document.getElementById("resultados-busqueda");
  const estado = document.getElementById("estado-busqueda");
  const limpiar = document.getElementById("limpiar-busqueda");
  const indice = [];
  for (const [clave, [titulo, id, palabras]] of Object.entries(grupos)) {
    if (clave === "preguntas" && !datos.preguntas.length) continue;
    indice.push({ titulo, id, grupo: "", texto: normalizar(titulo + " " + palabras) });
    datos[clave].forEach((item, posicion) => {
      const partes = [item.titulo, item.nombre, item.categoria, item.texto, item.alt, item.boton];
      indice.push({
        titulo: item.nombre ? item.titulo + " · " + item.nombre : item.titulo,
        id: idRegistro(clave, posicion),
        grupo: titulo,
        texto: normalizar(partes.filter(Boolean).join(" ")),
      });
    });
  }
  if (datos.portada.titulo) {
    indice.push({ titulo: datos.portada.titulo, id: "destacado", grupo: "Aviso destacado",
      texto: normalizar(datos.portada.titulo + " " + datos.portada.texto) });
  }

  form.addEventListener("submit", evento => {
    evento.preventDefault();
    const terminos = normalizar(campo.value.trim()).split(/\s+/u).filter(Boolean);
    const coincidencias = terminos.length ? indice.filter(item => terminos.every(termino => item.texto.includes(termino))) : [];
    const elementos = coincidencias.slice(0, 12).map(item => {
      const li = document.createElement("li");
      const enlace = document.createElement("a");
      enlace.href = "#" + item.id;
      enlace.textContent = item.titulo;
      if (item.grupo) {
        const etiqueta = document.createElement("span");
        etiqueta.textContent = item.grupo;
        enlace.append(etiqueta);
      }
      enlace.addEventListener("click", evento => {
        if (evento.ctrlKey || evento.metaKey || evento.shiftKey || evento.altKey) return;
        const destino = document.getElementById(item.id);
        if (!destino) return;
        evento.preventDefault();
        if (location.hash !== enlace.hash) history.pushState(null, "", enlace.hash);
        window.dispatchEvent(new Event("hashchange"));
        if (destino instanceof HTMLDetailsElement) destino.open = true;
        destino.tabIndex = -1;
        destino.focus({ preventScroll: true });
        destino.scrollIntoView({ block: "start" });
      });
      li.append(enlace);
      return li;
    });
    resultados.replaceChildren(...elementos);
    resultados.hidden = !elementos.length;
    limpiar.hidden = false;
    if (!terminos.length) estado.textContent = "Escribe lo que quieres buscar.";
    else if (!elementos.length) estado.textContent = "No encontramos resultados. Prueba con otra palabra.";
    else estado.textContent = coincidencias.length > elementos.length
      ? "Se muestran " + elementos.length + " de " + coincidencias.length + " resultados."
      : (elementos.length === 1 ? "1 resultado." : elementos.length + " resultados.");
  });

  form.addEventListener("reset", () => {
    resultados.replaceChildren();
    resultados.hidden = limpiar.hidden = true;
    estado.textContent = "";
    campo.focus();
  });
  form.hidden = false;
}
