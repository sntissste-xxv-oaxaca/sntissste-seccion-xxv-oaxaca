import { enlaceSeguro, validarContenido } from "./contenido.js";
import { activarCarrusel } from "./carrusel.js";
import { activarBuscador, activarMenuMovil, activarTextoGrande, idRegistro, mostrarImagen } from "./interaccion.js";

const estado = document.querySelector("#estado-publico");
activarTextoGrande();
activarMenuMovil();
for (const logo of document.querySelectorAll(".escudos img")) {
  if (logo.complete && !logo.naturalWidth) logo.hidden = true;
  else logo.addEventListener("error", () => { logo.hidden = true; }, { once: true });
}
const formatoFecha = new Intl.DateTimeFormat("es-MX", { dateStyle: "long", timeZone: "UTC" });
const mensajes = {
  noticias: "Aún no hay noticias publicadas.",
  comunicados: "Aún no hay comunicados publicados.",
  documentos: "Aún no hay documentos publicados.",
  directorio: "Aún no hay registros publicados en el directorio.",
  enlaces: "Aún no hay enlaces publicados.",
};

function nodo(tipo, texto, clase) {
  const elemento = document.createElement(tipo);
  if (texto) elemento.textContent = texto;
  if (clase) elemento.className = clase;
  return elemento;
}

function agregarEnlace(padre, url, texto) {
  const destino = enlaceSeguro(url);
  if (!destino) return;
  const enlace = nodo("a", texto);
  enlace.href = destino;
  enlace.target = "_blank";
  enlace.rel = "noopener noreferrer";
  padre.append(enlace);
}

function agregarCorreo(padre, correo) {
  if (!correo) return;
  const enlace = nodo("a", correo);
  enlace.href = "mailto:" + encodeURIComponent(correo).replace("%40", "@");
  const renglon = nodo("p");
  renglon.append(enlace);
  padre.append(renglon);
}

function tarjeta(item, clave, indice) {
  const id = idRegistro(clave, indice);
  if (clave === "preguntas") {
    const detalle = nodo("details");
    detalle.id = id;
    detalle.append(nodo("summary", item.titulo), nodo("p", item.texto));
    return detalle;
  }
  const card = nodo("article", "", "tarjeta");
  card.id = id;
  if (item.categoria) card.append(nodo("span", item.categoria, "categoria"));
  card.append(nodo("h3", item.titulo));
  if (item.fecha) {
    const fecha = nodo("time", formatoFecha.format(new Date(item.fecha + "T12:00:00Z")));
    fecha.dateTime = item.fecha;
    card.append(fecha);
  }
  if (item.nombre) card.append(nodo("p", item.nombre));
  if (item.texto) card.append(nodo("p", item.texto));
  mostrarImagen(card, item.cartelLocal || enlaceSeguro(item.imagen), item.alt);
  if (item.telefono) card.append(nodo("p", "Teléfono: " + item.telefono));
  agregarCorreo(card, item.correo);
  agregarEnlace(card, item.url, clave === "documentos" ? "Abrir PDF en Google Drive ↗" : (item.boton || "Consultar enlace ↗"));
  return card;
}

function renderizar(datos) {
  document.querySelector("#introduccion").textContent = datos.portada.introduccion;
  const foto = document.getElementById("portada-foto");
  foto.hidden = !mostrarImagen(foto, datos.portada.cartelLocal || enlaceSeguro(datos.portada.imagen), datos.portada.alt, {
    inmediata: true,
    alFallar: () => { foto.hidden = true; },
  });
  activarCarrusel(datos.carrusel, tarjeta);
  const aviso = document.querySelector("#destacado");
  if (datos.portada.titulo) {
    aviso.append(nodo("p", "Aviso destacado", "categoria"), nodo("h2", datos.portada.titulo));
    if (datos.portada.texto) aviso.append(nodo("p", datos.portada.texto));
    agregarEnlace(aviso, datos.portada.url, datos.portada.boton || "Consultar aviso ↗");
    aviso.hidden = false;
  }
  for (const lista of document.querySelectorAll("[data-seccion]")) {
    const clave = lista.dataset.seccion;
    const registros = datos[clave];
    registros.forEach((item, indice) => lista.append(tarjeta(item, clave, indice)));
    if (!registros.length && mensajes[clave]) lista.append(nodo("p", mensajes[clave], "vacio"));
  }
  document.querySelector("#faq").hidden = !datos.preguntas.length;
  const { direccion, horario, telefono, correo, facebook } = datos.contacto;
  const contactos = document.querySelector("#contactos");
  if (direccion) contactos.append(nodo("p", direccion));
  if (horario) contactos.append(nodo("p", "Horario: " + horario));
  if (telefono) {
    const renglon = nodo("p", "Teléfono: ");
    const numero = telefono.replace(/[\s().-]/g, "");
    if (/^\+?\d{7,15}$/.test(numero)) {
      const llamada = nodo("a", telefono);
      llamada.href = "tel:" + numero;
      renglon.append(llamada);
    } else {
      renglon.append(telefono);
    }
    contactos.append(renglon);
  }
  agregarCorreo(contactos, correo);
  agregarEnlace(contactos, facebook, "Facebook ↗");
  document.querySelector("#datos-contacto").hidden = !contactos.childElementCount;
  document.querySelector("#secciones").hidden = false;
  activarBuscador(datos);
  estado.hidden = true;
  const ancla = document.getElementById(location.hash.slice(1));
  if (ancla) ancla.scrollIntoView();
}

try {
  const respuesta = await fetch(new URL("../datos.json", import.meta.url), { cache: "no-cache" });
  if (!respuesta.ok) throw Error("No se pudo cargar datos.json.");
  renderizar(validarContenido(await respuesta.json()));
} catch (error) {
  estado.textContent = "El contenido no está disponible en este momento. Vuelve a cargar la página para intentarlo otra vez.";
  console.error(error);
}
