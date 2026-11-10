// aidoc v0.1: un paquete "pre-digerido" para IAs.
// Digerir una vez, usar muchas veces: texto canónico en Markdown, metadatos,
// secciones, tablas, enlaces, imágenes (con lugar para su descripción) y
// fragmentos listos para búsqueda, cada uno con su huella SHA-256.
// La especificación formal está en spec/aidoc-0.1.schema.json (JSON Schema 2020-12).
const Aidoc = (() => {
  const MD = typeof Markdown !== "undefined" ? Markdown : require("./markdown.js");
  const JS = typeof Esquema !== "undefined" ? Esquema : require("./esquema.js");
  const ESQUEMA = typeof EsquemaAidoc !== "undefined" ? EsquemaAidoc : require("./esquema-aidoc.js");
  const METODO_ESTIMADO = "1 token ≈ 4 caracteres";
  const VERSION = "0.1";

  // --- SHA-256 en JavaScript puro (síncrono, sin depender de crypto.subtle) ---
  const K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]);
  function sha256(texto) {
    const datos = new TextEncoder().encode(texto);
    const largo = datos.length;
    const total = Math.ceil((largo + 9) / 64) * 64;
    const buf = new Uint8Array(total);
    buf.set(datos);
    buf[largo] = 0x80;
    const bits = largo * 8;
    const dv = new DataView(buf.buffer);
    dv.setUint32(total - 8, Math.floor(bits / 2 ** 32));
    dv.setUint32(total - 4, bits >>> 0);
    const H = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
    const W = new Uint32Array(64);
    const rot = (x, n) => (x >>> n) | (x << (32 - n));
    for (let off = 0; off < total; off += 64) {
      for (let i = 0; i < 16; i++) W[i] = dv.getUint32(off + i * 4);
      for (let i = 16; i < 64; i++) {
        const s0 = rot(W[i - 15], 7) ^ rot(W[i - 15], 18) ^ (W[i - 15] >>> 3);
        const s1 = rot(W[i - 2], 17) ^ rot(W[i - 2], 19) ^ (W[i - 2] >>> 10);
        W[i] = (W[i - 16] + s0 + W[i - 7] + s1) >>> 0;
      }
      let [a, b, c, d, e, f, g, h] = H;
      for (let i = 0; i < 64; i++) {
        const S1 = rot(e, 6) ^ rot(e, 11) ^ rot(e, 25);
        const t1 = (h + S1 + ((e & f) ^ (~e & g)) + K[i] + W[i]) >>> 0;
        const S0 = rot(a, 2) ^ rot(a, 13) ^ rot(a, 22);
        const t2 = (S0 + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
        h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
      }
      H[0] += a; H[1] += b; H[2] += c; H[3] += d; H[4] += e; H[5] += f; H[6] += g; H[7] += h;
    }
    return Array.from(H, (x) => x.toString(16).padStart(8, "0")).join("");
  }

  // Estimación gruesa: ~4 caracteres por token. Sirve para comparar, no para facturar.
  const tokens = (s) => Math.ceil(s.length / 4);

  function idioma(texto) {
    const palabras = texto.toLowerCase().match(/[a-záéíóúñü]+/g) || [];
    const es = new Set(["el", "la", "los", "las", "de", "que", "y", "en", "un", "una", "por", "con", "para", "es", "del", "se", "no", "como", "más"]);
    const en = new Set(["the", "of", "and", "to", "in", "is", "that", "for", "it", "with", "as", "on", "this", "are", "be", "by"]);
    let a = 0, b = 0;
    for (const p of palabras) { if (es.has(p)) a++; if (en.has(p)) b++; }
    if (a + b < 5) return "desconocido";
    return a >= b ? "es" : "en";
  }

  function detectarTipo(contenido) {
    if (/<(html|body|p|div|h[1-6]|article|section)[\s>]/i.test(contenido)) return "text/html";
    if (/^#{1,6}\s|\n#{1,6}\s|\[[^\]]+\]\([^)]+\)|^\s*[-*]\s/m.test(contenido)) return "text/markdown";
    return "text/plain";
  }

  // Parte cada sección en fragmentos de hasta maxCaracteres, cortando entre párrafos.
  function fragmentar(texto, secs, maxCaracteres = 1200) {
    const out = [];
    for (const s of secs) {
      let i = s.inicio;
      const fin = s.fin;
      while (i < fin) {
        let j = Math.min(fin, i + maxCaracteres);
        if (j < fin) {
          const corte = texto.lastIndexOf("\n\n", j);
          if (corte > i + maxCaracteres * 0.3) j = corte + 2;
        }
        const crudo = texto.slice(i, j);
        const ini = i + (crudo.length - crudo.trimStart().length);
        const fragmento = crudo.trim();
        if (fragmento) out.push({ id: "f" + (out.length + 1), seccion: s.id, ruta: s.ruta, inicio: ini, fin: ini + fragmento.length, texto: fragmento, hash: "sha256:" + sha256(fragmento), tokensEstimados: tokens(fragmento) });
        i = j;
      }
    }
    return out;
  }

  function convertir(contenido, { tipo = "auto", fuente = "", maxCaracteres = 1200, creado = new Date().toISOString() } = {}) {
    const t = tipo === "auto" ? detectarTipo(contenido) : tipo;
    const texto = t === "text/html" ? MD.desdeHtml(contenido) : MD.desdeTexto(contenido);
    const secs = MD.secciones(texto);
    const links = MD.enlaces(texto);
    const primerTitulo = secs.find((s) => s.nivel > 0);
    const tOrig = tokens(contenido), tTexto = tokens(texto);
    return {
      aidoc: VERSION,
      metadatos: {
        titulo: primerTitulo ? primerTitulo.titulo : (texto.split("\n")[0] || "").slice(0, 120),
        idioma: idioma(texto),
        fuente,
        tipoOriginal: t,
        creado,
        hashOriginal: "sha256:" + sha256(contenido),
        caracteresOriginal: contenido.length,
      },
      texto,
      secciones: secs.map(({ id, nivel, titulo, ruta, inicio, fin }) => ({ id, nivel, titulo, ruta, inicio, fin })),
      fragmentos: fragmentar(texto, secs, maxCaracteres),
      tablas: MD.tablas(texto),
      enlaces: links.filter((l) => !l.imagen).map(({ texto: tx, url }) => ({ texto: tx, url })),
      imagenes: links.filter((l) => l.imagen).map(({ texto: alt, url }) => ({ alt, src: url, descripcion: null, textoDetectado: null, descripcionModelo: null })),
      medicion: { metodo: METODO_ESTIMADO, tokensOriginal: tOrig, tokensTexto: tTexto, ahorro: tOrig ? 1 - tTexto / tOrig : 0 },
    };
  }

  // Validación completa: primero el esquema JSON (spec/aidoc-0.1.schema.json, con
  // "date-time" exigido), después la integridad que un esquema no puede expresar:
  // que cada sección y fragmento caiga dentro del texto, que cada fragmento coincida
  // con su parte del texto y con su huella, y que los identificadores no se repitan.
  // Devuelve una lista de problemas en castellano; vacía si el paquete es válido.
  function validar(p) {
    let errores;
    try {
      errores = JS.validar(ESQUEMA, p, { formatos: true }).map((e) => `${e.ruta || "(raíz)"}: ${e.mensaje}`);
    } catch (err) {
      return [`No se pudo validar: ${err.message}`];
    }
    if (errores.length) return errores;
    const largo = p.texto.length;
    const secciones = new Map();
    for (const s of p.secciones) {
      if (secciones.has(s.id)) errores.push(`Sección repetida: ${s.id}`);
      secciones.set(s.id, s);
      if (s.inicio > s.fin || s.fin > largo) errores.push(`${s.id}: el rango [${s.inicio}, ${s.fin}) no cae dentro del texto`);
    }
    const ids = new Set();
    for (const f of p.fragmentos) {
      if (ids.has(f.id)) errores.push(`Fragmento repetido: ${f.id}`);
      ids.add(f.id);
      if (p.texto.slice(f.inicio, f.fin) !== f.texto) errores.push(`${f.id}: no coincide con el texto canónico en [${f.inicio}, ${f.fin})`);
      if (f.hash !== "sha256:" + sha256(f.texto)) errores.push(`${f.id}: la huella no coincide`);
      const s = secciones.get(f.seccion);
      if (!s) errores.push(`${f.id}: sección inexistente ${f.seccion}`);
      else if (f.inicio < s.inicio || f.fin > s.fin) errores.push(`${f.id}: queda fuera de su sección ${s.id}`);
    }
    return errores;
  }

  // Reemplaza la estimación por un conteo real, guardando qué tokenizador se usó.
  function conConteo(p, { modelo, tokensOriginal, tokensTexto }) {
    const medicion = {
      metodo: `count_tokens de la API de Anthropic (${modelo})`,
      modelo,
      tokensOriginal,
      tokensTexto,
      ahorro: tokensOriginal ? 1 - tokensTexto / tokensOriginal : 0,
    };
    return { ...p, medicion };
  }

  // Guarda la descripción de una imagen y qué modelo la generó.
  function conDescripcion(p, indice, { descripcion, textoDetectado = null, modelo }) {
    const imagenes = p.imagenes.map((img, i) => (i === indice ? { ...img, descripcion, textoDetectado, descripcionModelo: modelo } : img));
    return { ...p, imagenes };
  }

  return { VERSION, METODO_ESTIMADO, ESQUEMA, sha256, tokens, idioma, detectarTipo, fragmentar, convertir, validar, conConteo, conDescripcion };
})();

if (typeof module !== "undefined") module.exports = Aidoc;
