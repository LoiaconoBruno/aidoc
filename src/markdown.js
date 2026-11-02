// HTML → Markdown canónico, sin DOM (funciona igual en el navegador y en Node).
// Cubre lo que importa para que una IA lea un documento: títulos, párrafos,
// listas, enlaces, énfasis, código, citas, tablas e imágenes. Descarta
// script, style, nav y el resto de lo que no es contenido.
const Markdown = (() => {
  const ENTIDADES = {
    amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
    aacute: "á", eacute: "é", iacute: "í", oacute: "ó", uacute: "ú", ntilde: "ñ", uuml: "ü",
    Aacute: "Á", Eacute: "É", Iacute: "Í", Oacute: "Ó", Uacute: "Ú", Ntilde: "Ñ", Uuml: "Ü",
    iquest: "¿", iexcl: "¡", laquo: "«", raquo: "»", mdash: "—", ndash: "–", hellip: "…", copy: "©", deg: "°",
  };
  const DESCARTAR = new Set(["script", "style", "noscript", "head", "nav", "svg", "template", "iframe", "form", "button"]);
  const BLOQUES = new Set(["p", "div", "section", "article", "main", "header", "footer", "aside", "figure", "figcaption", "address", "body", "html"]);

  function decodificar(s) {
    return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
      if (e[0] === "#") return String.fromCodePoint(e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
      return ENTIDADES[e] ?? m;
    });
  }

  function atributo(attrs, nombre) {
    const m = new RegExp(`\\b${nombre}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i").exec(attrs);
    return m ? decodificar(m[2] ?? m[3] ?? m[4] ?? "") : "";
  }

  function desdeHtml(html) {
    const titulo = (/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html) || [])[1];
    // "Modo lectura": si la página marca su contenido con <main> o <article>, solo eso.
    const principal = /<(main|article)\b[^>]*>([\s\S]*)<\/\1>/i.exec(html);
    if (principal) html = principal[2];
    const re = /<!--[\s\S]*?-->|<!doctype[^>]*>|<\/?([a-zA-Z][a-zA-Z0-9]*)([^>]*)>|[^<]+/gi;
    const pila = [{ texto: "" }];          // buffers para enlaces y celdas
    const add = (s) => { pila[pila.length - 1].texto += s; };
    const listas = [];
    let pre = 0, descartar = null, tabla = null;
    let m;
    while ((m = re.exec(html))) {
      const [todo, nombre, attrs = ""] = m;
      if (descartar) {
        if (nombre && todo.startsWith("</") && nombre.toLowerCase() === descartar) descartar = null;
        continue;
      }
      if (!nombre) {
        if (todo.startsWith("<!")) continue;
        const t = decodificar(todo);
        add(pre ? t : t.replace(/\s+/g, " "));
        continue;
      }
      const tag = nombre.toLowerCase();
      const cierra = todo.startsWith("</");
      if (!cierra && DESCARTAR.has(tag) && !todo.endsWith("/>")) { descartar = tag; continue; }
      if (/^h[1-6]$/.test(tag)) { add(cierra ? "\n\n" : `\n\n${"#".repeat(Number(tag[1]))} `); continue; }
      if (BLOQUES.has(tag)) { add("\n\n"); continue; }
      switch (tag) {
        case "br": add(pre ? "\n" : "  \n"); break;
        case "hr": add("\n\n---\n\n"); break;
        case "strong": case "b": add("**"); break;
        case "em": case "i": add("*"); break;
        case "code": if (!pre) add("`"); break;
        case "pre": if (cierra) { pre--; add("\n```\n\n"); } else { pre++; add("\n\n```\n"); } break;
        case "blockquote": add(cierra ? "\n\n" : "\n\n> "); break;
        case "ul": case "ol":
          if (cierra) { listas.pop(); add("\n\n"); } else { listas.push({ tipo: tag, n: 0 }); add("\n"); }
          break;
        case "li":
          if (!cierra) {
            const l = listas[listas.length - 1] || { tipo: "ul", n: 0 };
            l.n++;
            add(`\n${"  ".repeat(Math.max(0, listas.length - 1))}${l.tipo === "ol" ? l.n + "." : "-"} `);
          }
          break;
        case "a":
          if (cierra) {
            const b = pila.length > 1 && pila[pila.length - 1].href !== undefined ? pila.pop() : null;
            if (b) { const txt = b.texto.trim(); add(b.href ? `[${txt || b.href}](${b.href})` : txt); }
          } else pila.push({ texto: "", href: atributo(attrs, "href") });
          break;
        case "img": add(`![${atributo(attrs, "alt")}](${atributo(attrs, "src")})`); break;
        case "table":
          if (!cierra) { tabla = { filas: [], fila: null }; add("\n\n"); }
          else if (tabla) {
            const filas = tabla.filas.filter((f) => f.length);
            tabla = null;
            if (filas.length) {
              const ancho = Math.max(...filas.map((f) => f.length));
              const linea = (f) => "| " + Array.from({ length: ancho }, (_, i) => (f[i] || "").replace(/\|/g, "\\|")).join(" | ") + " |";
              add(linea(filas[0]) + "\n|" + " --- |".repeat(ancho) + "\n" + filas.slice(1).map(linea).join("\n") + "\n\n");
            }
          }
          break;
        case "tr": if (tabla) { if (!cierra) tabla.fila = []; else if (tabla.fila) { tabla.filas.push(tabla.fila); tabla.fila = null; } } break;
        case "td": case "th":
          if (tabla) {
            if (!cierra) pila.push({ texto: "", celda: true });
            else if (pila[pila.length - 1].celda) { const c = pila.pop(); (tabla.fila || (tabla.fila = [])).push(c.texto.replace(/\s+/g, " ").trim()); }
          }
          break;
        default: break;
      }
    }
    while (pila.length > 1) { const b = pila.pop(); pila[pila.length - 1].texto += b.texto; }
    let md = normalizar(pila[0].texto);
    if (titulo && !/^#\s/m.test(md)) md = `# ${decodificar(titulo).trim()}\n\n${md}`;
    return md;
  }

  // Limpia espacios: sin espacios al final de línea, a lo sumo una línea en blanco seguida.
  function normalizar(md) {
    const lineas = md.replace(/\r\n?/g, "\n").split("\n");
    const out = [];
    let enCodigo = false;
    for (let l of lineas) {
      if (l.trim().startsWith("```")) enCodigo = !enCodigo;
      if (!enCodigo) {
        l = l.replace(/[ \t]+$/, "");
        if (!/^\s*([-*]|\d+\.)\s/.test(l)) l = l.replace(/^[ \t]+/, ""); // la sangría de las listas anidadas se queda
      }
      out.push(l);
    }
    return out.join("\n").replace(/\n{3,}/g, "\n\n").replace(/\*\*\s*\*\*/g, "").trim() + "\n";
  }

  function desdeTexto(txt) {
    return normalizar(txt);
  }

  // Secciones a partir de los títulos (# ...), fuera de los bloques de código.
  // Cada una va desde su título hasta el título siguiente (de cualquier nivel).
  function secciones(md) {
    const lineas = md.split("\n");
    const res = [];
    const ruta = [];
    let pos = 0, enCodigo = false;
    const abrir = (nivel, titulo, inicio) => {
      while (ruta.length && ruta[ruta.length - 1].nivel >= nivel) ruta.pop();
      ruta.push({ nivel, titulo });
      res.push({ id: "s" + (res.length + 1), nivel, titulo, ruta: ruta.map((r) => r.titulo), inicio, fin: md.length });
    };
    for (const l of lineas) {
      if (l.trim().startsWith("```")) enCodigo = !enCodigo;
      const h = !enCodigo && /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(l);
      if (h) {
        if (!res.length && md.slice(0, pos).trim()) res.push({ id: "s0", nivel: 0, titulo: "(inicio)", ruta: [], inicio: 0, fin: pos });
        if (res.length) res[res.length - 1].fin = Math.min(res[res.length - 1].fin, pos);
        abrir(h[1].length, h[2], pos);
      }
      pos += l.length + 1;
    }
    if (!res.length) res.push({ id: "s0", nivel: 0, titulo: "(documento)", ruta: [], inicio: 0, fin: md.length });
    return res;
  }

  function tablas(md) {
    const out = [];
    const lineas = md.split("\n");
    for (let i = 0; i + 1 < lineas.length; i++) {
      if (/^\s*\|.*\|\s*$/.test(lineas[i]) && /^\s*\|(\s*:?-{3,}:?\s*\|)+\s*$/.test(lineas[i + 1])) {
        const celdas = (l) => l.trim().slice(1, -1).split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, "|"));
        const encabezados = celdas(lineas[i]);
        const filas = [];
        let j = i + 2;
        while (j < lineas.length && /^\s*\|.*\|\s*$/.test(lineas[j])) filas.push(celdas(lineas[j++]));
        out.push({ encabezados, filas });
        i = j - 1;
      }
    }
    return out;
  }

  function enlaces(md) {
    const out = [];
    const re = /(!?)\[([^\]]*)\]\(([^)\s]+)\)/g;
    let m;
    while ((m = re.exec(md))) out.push({ imagen: m[1] === "!", texto: m[2], url: m[3] });
    return out;
  }

  return { decodificar, desdeHtml, desdeTexto, normalizar, secciones, tablas, enlaces };
})();

if (typeof module !== "undefined") module.exports = Markdown;
