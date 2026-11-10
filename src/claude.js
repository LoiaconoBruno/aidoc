// Llamadas a la API de Claude desde el navegador, con la key de quien usa la página.
// La key no sale de tu navegador salvo hacia api.anthropic.com, y no hay servidor intermedio.
//
// Por qué fetch y no el SDK oficial: la página se abre con doble clic (file://) y usa
// scripts clásicos, sin paso de build; el SDK de TypeScript se distribuye como módulo
// npm y necesita un empaquetador. Las llamadas siguen la forma documentada de la API
// (encabezado anthropic-version y, desde el navegador, el mismo encabezado de acceso
// directo que manda el SDK con dangerouslyAllowBrowser).
const Claude = (() => {
  const API = "https://api.anthropic.com/v1";
  const VERSION_API = "2026-10-21";
  // Precios en US$ por millón de tokens (platform.claude.com/docs/en/about-claude/pricing, noviembre de 2026).
  const MODELOS = [
    { id: "claude-opus-5-5", nombre: "Claude Opus 5.5", entrada: 4, salida: 20 },
    { id: "claude-haiku-5-5", nombre: "Claude Haiku 5.5", entrada: 0.1, salida: 0.5 },
  ];
  const modelo = (id) => MODELOS.find((m) => m.id === id) || MODELOS[0];

  class ErrorApi extends Error {
    constructor(mensaje, estado) { super(mensaje); this.name = "ErrorApi"; this.estado = estado; }
  }

  function encabezados(key, betas = []) {
    const h = {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": VERSION_API,
      "anthropic-dangerous-direct-browser-access": "true",
    };
    if (betas.length) h["anthropic-beta"] = betas.join(",");
    return h;
  }

  async function pedir(ruta, key, cuerpo, { betas = [], fetch: f = globalThis.fetch } = {}) {
    if (!key || !key.trim()) throw new ErrorApi("Falta tu key de la API de Anthropic.", 0);
    let r;
    try {
      r = await f(`${API}${ruta}`, { method: "POST", headers: encabezados(key.trim(), betas), body: JSON.stringify(cuerpo) });
    } catch (e) {
      throw new ErrorApi(`No se pudo conectar con la API (${e.message}). Revisá tu conexión.`, 0);
    }
    let datos = null;
    try { datos = await r.json(); } catch { /* respuesta sin JSON */ }
    if (!r.ok) {
      const detalle = datos && datos.error && datos.error.message ? datos.error.message : `HTTP ${r.status}`;
      const motivo = r.status === 401 ? "La key no es válida o fue revocada."
        : r.status === 403 ? "La key no tiene permiso para esto."
        : r.status === 429 ? "Llegaste al límite de pedidos por minuto. Esperá un momento y probá de nuevo."
        : r.status >= 500 ? "La API tuvo un problema. Probá de nuevo en un rato."
        : "La API rechazó el pedido.";
      throw new ErrorApi(`${motivo} (${detalle})`, r.status);
    }
    return datos;
  }

  // Tokens reales de un texto para un modelo, con el endpoint gratuito de conteo.
  // El número incluye los pocos tokens fijos del formato de un mensaje.
  async function contarTokens(key, idModelo, texto, opciones = {}) {
    if (!texto) return 0;
    const d = await pedir("/messages/count_tokens", key, {
      model: idModelo,
      messages: [{ role: "user", content: texto }],
    }, opciones);
    if (typeof d.input_tokens !== "number") throw new ErrorApi("La respuesta del conteo no trae input_tokens.", 200);
    return d.input_tokens;
  }

  const FORMATO = {
    type: "json_schema",
    schema: {
      type: "object",
      properties: {
        descripcion: { type: "string" },
        textoDetectado: { type: "string" },
      },
      required: ["descripcion", "textoDetectado"],
      additionalProperties: false,
    },
  };

  function instruccion(idioma, alt) {
    const lengua = idioma === "en" ? "inglés" : "español";
    return `Describí esta imagen para alguien que no la ve y la encuentra dentro de un documento. `
      + `Escribí de 1 a 3 oraciones en ${lengua}, concretas, sin empezar con "La imagen muestra". `
      + `Si la imagen tiene texto legible, copialo tal cual en textoDetectado; si no tiene, dejá textoDetectado vacío.`
      + (alt ? ` El texto alternativo que trae el documento es: "${alt}".` : "");
  }

  // imagen: { url } (http/https, la API la descarga) o { base64, tipo } (image/png, image/jpeg, image/gif o image/webp).
  // Devuelve { descripcion, textoDetectado, modelo, costo } con el modelo que efectivamente respondió.
  async function describirImagen(key, idModelo, imagen, { idioma = "es", alt = "", fetch } = {}) {
    const fuente = imagen.url
      ? { type: "url", url: imagen.url }
      : { type: "base64", media_type: imagen.tipo, data: imagen.base64 };
    const cuerpo = {
      model: idModelo,
      max_tokens: 4000,
      output_config: { effort: "low", format: FORMATO },
      messages: [{ role: "user", content: [{ type: "image", source: fuente }, { type: "text", text: instruccion(idioma, alt) }] }],
    };
    const betas = [];
    // Claude Opus 5.5 puede rechazar un pedido por sus clasificadores de seguridad; con
    // fallbacks "default", la API lo reintenta en el modelo que recomienda Anthropic.
    if (idModelo === "claude-opus-5-5") { cuerpo.fallbacks = "default"; betas.push("server-side-fallback-2026-07-01"); }
    const r = await pedir("/messages", key, cuerpo, { betas, fetch });
    if (r.stop_reason === "refusal") throw new ErrorApi("El modelo no quiso describir esta imagen.", 200);
    if (r.stop_reason === "max_tokens") throw new ErrorApi("La respuesta se cortó antes de terminar. Probá de nuevo.", 200);
    const bloque = (r.content || []).find((b) => b.type === "text");
    if (!bloque) throw new ErrorApi("La respuesta no trae texto.", 200);
    let salida;
    try { salida = JSON.parse(bloque.text); } catch { throw new ErrorApi("La respuesta no es el JSON pedido.", 200); }
    const usado = modelo(r.model);
    const u = r.usage || {};
    const costo = ((u.input_tokens || 0) * usado.entrada + (u.output_tokens || 0) * usado.salida) / 1e6;
    return {
      descripcion: String(salida.descripcion || "").trim(),
      textoDetectado: salida.textoDetectado && salida.textoDetectado.trim() ? salida.textoDetectado.trim() : null,
      modelo: r.model || idModelo,
      costo,
    };
  }

  // Costo estimado de describir una imagen: tokens visuales (⌈ancho/28⌉ × ⌈alto/28⌉, sin achicar)
  // más unos 200 tokens de instrucción y unos 300 de respuesta.
  function costoEstimado(idModelo, ancho = 1000, alto = 1000) {
    const m = modelo(idModelo);
    const visuales = Math.ceil(ancho / 28) * Math.ceil(alto / 28);
    return ((visuales + 200) * m.entrada + 300 * m.salida) / 1e6;
  }

  return { MODELOS, VERSION_API, ErrorApi, encabezados, contarTokens, describirImagen, costoEstimado, instruccion };
})();

if (typeof module !== "undefined") module.exports = Claude;
