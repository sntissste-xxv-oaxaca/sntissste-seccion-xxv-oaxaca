// Campos compartidos por el sitio público y el panel.
const campo = (clave, etiqueta, tipo = "text", requerido = false) => ({ clave, etiqueta, tipo, requerido });
const titulo = campo("titulo", "Título", "text", true);
const categoria = campo("categoria", "Categoría");
const texto = campo("texto", "Descripción o contenido", "textarea");
const url = campo("url", "Enlace HTTPS");
const boton = campo("boton", "Texto del enlace");
const fecha = campo("fecha", "Fecha", "date");
const cartel = [campo("imagen", "Enlace HTTPS directo a la imagen"), campo("alt", "Descripción de la imagen para lectores de pantalla")];
const foto = [campo("cartelLocal", "Subir imagen desde tu equipo", "imagenLocal"), ...cartel];

export const portadaCampos = [campo("introduccion", "Texto de bienvenida", "textarea", true),
  campo("titulo", "Título del aviso destacado"), campo("texto", "Texto del aviso destacado", "textarea"), url, boton, ...foto];
export const contactoCampos = [campo("direccion", "Dirección", "textarea"), campo("horario", "Horario"),
  campo("telefono", "Teléfono"), campo("correo", "Correo electrónico", "email"), campo("facebook", "Enlace HTTPS a Facebook")];
export const LIMITE_CARTEL = 220000;
export const secciones = {
  carrusel: { nombre: "Carrusel de avisos", campos: [titulo, fecha, categoria, texto,
    campo("cartelLocal", "Subir cartel desde tu equipo", "imagenLocal"), ...cartel, url, boton] },
  noticias: { nombre: "Noticias", campos: [titulo, fecha, categoria, texto, ...foto, url, boton] },
  comunicados: { nombre: "Comunicados", campos: [titulo, fecha, categoria, texto, ...foto, url, boton] },
  documentos: { nombre: "Documentos PDF", campos: [titulo, fecha, categoria, texto, campo("url", "Enlace del archivo PDF en Google Drive", "url", true)] },
  directorio: { nombre: "Directorio", campos: [campo("titulo", "Cargo o área", "text", true), campo("nombre", "Nombre"), texto, campo("telefono", "Teléfono"), campo("correo", "Correo electrónico", "email"), url, boton] },
  enlaces: { nombre: "Enlaces institucionales", campos: [titulo, categoria, texto, campo("url", "Enlace HTTPS", "url", true), boton] },
  preguntas: { nombre: "Preguntas frecuentes", campos: [campo("titulo", "Pregunta", "text", true), campo("texto", "Respuesta", "textarea", true)] },
};

export function enlaceSeguro(valor) {
  try {
    const url = new URL(valor);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : "";
  } catch {
    return "";
  }
}

export function enlaceDrive(valor) {
  const seguro = enlaceSeguro(valor);
  if (!seguro) return "";
  const url = new URL(seguro);
  if (url.hostname !== "drive.google.com" || url.port) return "";
  const archivo = /^\/file\/d\/[\w-]+(?:\/(?:view|preview|edit))?\/?$/.test(url.pathname);
  const enlaceConId = /^\/(?:open|uc)\/?$/.test(url.pathname) && /^[\w-]+$/.test(url.searchParams.get("id") || "");
  return archivo || enlaceConId ? seguro : "";
}

function validarCampos(datos, campos, seccion) {
  if (!datos || typeof datos !== "object" || Array.isArray(datos)) throw Error(seccion + ": formato inválido.");
  const registro = {};
  for (const campo of campos) {
    const valor = typeof datos[campo.clave] === "string" ? datos[campo.clave].trim() : "";
    const etiqueta = seccion + " · " + campo.etiqueta;
    const limite = campo.tipo === "imagenLocal" ? LIMITE_CARTEL : campo.tipo === "textarea" ? 10000 : 2048;
    if (valor.length > limite) throw Error(etiqueta + ": supera el máximo de " + limite + " caracteres.");
    if (campo.requerido && !valor) throw Error(etiqueta + ": completa este campo.");
    if (campo.tipo === "imagenLocal" && valor && !/^data:image\/webp;base64,[A-Za-z0-9+/]+={0,2}$/.test(valor)) {
      throw Error(etiqueta + ": vuelve a cargar la imagen desde el panel.");
    }
    if (valor && ["url", "imagen", "facebook"].includes(campo.clave)) {
      const valido = seccion.startsWith("Documentos PDF ·") ? enlaceDrive(valor) : enlaceSeguro(valor);
      if (!valido) throw Error(etiqueta + ": introduce el enlace HTTPS correspondiente al archivo o página.");
    }
    if (valor && campo.tipo === "email" && !/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(valor)) {
      throw Error(etiqueta + ": introduce un correo válido.");
    }
    if (valor && campo.tipo === "date") {
      const fecha = new Date(valor + "T12:00:00Z");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(valor) || Number.isNaN(fecha.getTime()) || fecha.toISOString().slice(0, 10) !== valor) {
        throw Error(etiqueta + ": introduce una fecha válida.");
      }
    }
    registro[campo.clave] = valor;
  }
  if ((registro.imagen || registro.cartelLocal) && !registro.alt) throw Error(seccion + ": describe la imagen para lectores de pantalla.");
  return registro;
}

export function validarContenido(datos) {
  if (datos?.version !== 1) throw Error("El archivo de contenido no tiene una versión compatible.");
  const contenido = {
    version: 1,
    portada: validarCampos(datos.portada, portadaCampos, "Portada"),
    contacto: validarCampos(datos.contacto, contactoCampos, "Contacto"),
  };
  if (!contenido.portada.titulo && (contenido.portada.texto || contenido.portada.url || contenido.portada.boton)) {
    throw Error("Portada: agrega un título al aviso destacado o vacía sus campos.");
  }
  for (const [clave, { nombre, campos }] of Object.entries(secciones)) {
    if (clave === "carrusel" && datos.carrusel === undefined) {
      contenido.carrusel = [];
      continue;
    }
    if (!Array.isArray(datos[clave])) throw Error(nombre + ": la sección debe ser una lista.");
    contenido[clave] = datos[clave].map((fila, indice) => validarCampos(fila, campos, nombre + " · " + (indice + 1)));
  }
  return contenido;
}
