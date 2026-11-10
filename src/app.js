// Interfaz: entrada (soltar, elegir, pegar), conversión, medición, vista dividida,
// estructura y fragmentos navegables, imágenes, validación y conexión opcional con Claude.
(() => {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const num = (n) => n.toLocaleString("es-AR");
  const dolares = (x) => "US$" + (x < 0.01 ? x.toLocaleString("es-AR", { maximumSignificantDigits: 2 }) : x.toLocaleString("es-AR", { maximumFractionDigits: 3 }));

  const estado = { contenido: "", nombre: "documento", paquete: null, pestana: "texto", marcado: null };

  /* Almacenamiento: la key queda en este navegador (sesión o, si lo pedís, permanente). */

  const CLAVE_KEY = "aidoc:key", CLAVE_MODELO = "aidoc:modelo";
  const leer = (almacen, k) => { try { return window[almacen].getItem(k); } catch { return null; } };
  const escribir = (almacen, k, v) => { try { v == null ? window[almacen].removeItem(k) : window[almacen].setItem(k, v); } catch { /* sin almacenamiento */ } };

  function iniciarClaude() {
    $("modelo").innerHTML = Claude.MODELOS.map((m) => `<option value="${m.id}">${esc(m.nombre)}</option>`).join("");
    const guardado = leer("localStorage", CLAVE_MODELO);
    if (guardado && Claude.MODELOS.some((m) => m.id === guardado)) $("modelo").value = guardado;
    const recordada = leer("localStorage", CLAVE_KEY);
    $("key").value = recordada || leer("sessionStorage", CLAVE_KEY) || "";
    $("recordar").checked = Boolean(recordada);
    ayudaModelo();
  }

  function guardarKey() {
    const k = $("key").value.trim();
    if ($("recordar").checked) { escribir("localStorage", CLAVE_KEY, k || null); escribir("sessionStorage", CLAVE_KEY, null); }
    else { escribir("sessionStorage", CLAVE_KEY, k || null); escribir("localStorage", CLAVE_KEY, null); }
  }

  function ayudaModelo() {
    const m = Claude.MODELOS.find((x) => x.id === $("modelo").value);
    $("modelo-ayuda").textContent = `US$${m.entrada.toLocaleString("es-AR")} / US$${m.salida.toLocaleString("es-AR")} por millón de tokens de entrada / salida. `
      + `Describir una imagen de 1000 × 1000 px cuesta unos ${dolares(Claude.costoEstimado(m.id))}.`;
    if (estado.paquete) pintarImagenes();
  }

  const key = () => $("key").value.trim();
  const modelo = () => $("modelo").value;

  const AYUDA_KEY = $("key-ayuda").textContent;
  function pedirKey(mensaje) {
    $("key-ayuda").textContent = mensaje;
    $("key-ayuda").classList.add("campo__ayuda--aviso");
    $("claude").scrollIntoView({ behavior: "smooth", block: "start" });
    $("key").focus({ preventScroll: true });
  }
  $("key").addEventListener("input", () => {
    $("key-ayuda").textContent = AYUDA_KEY;
    $("key-ayuda").classList.remove("campo__ayuda--aviso");
  });

  /* Avisos */

  function aviso(texto, tipo = "error") {
    const a = $("aviso");
    a.hidden = !texto;
    a.className = `aviso aviso--${tipo}`;
    a.textContent = texto || "";
  }

  /* Entrada */

  async function leerArchivo(archivo) {
    if (!archivo) return;
    aviso("");
    let texto;
    try { texto = await archivo.text(); } catch { aviso("No pude leer ese archivo."); return; }
    if (/\.json$/i.test(archivo.name) || /^\s*\{/.test(texto)) { validarArchivo(archivo.name, texto); return; }
    if (!/\.(html?|md|markdown|txt)$/i.test(archivo.name) && !/^text\//.test(archivo.type)) {
      aviso(`"${archivo.name}" no parece un .html, .md o .txt. Si es un PDF o un Word, convertilo primero con Docling o MarkItDown.`);
      return;
    }
    estado.contenido = texto;
    estado.nombre = archivo.name.replace(/\.[^.]+$/, "") || "documento";
    convertir();
  }

  const zona = $("soltar");
  ["dragenter", "dragover"].forEach((ev) => zona.addEventListener(ev, (e) => { e.preventDefault(); zona.classList.add("activo"); }));
  ["dragleave", "dragend"].forEach((ev) => zona.addEventListener(ev, () => zona.classList.remove("activo")));
  zona.addEventListener("drop", (e) => {
    e.preventDefault();
    zona.classList.remove("activo");
    leerArchivo(e.dataTransfer.files[0]);
  });
  // Soltar fuera de la zona no tiene que abrir el archivo en la pestaña.
  window.addEventListener("dragover", (e) => e.preventDefault());
  window.addEventListener("drop", (e) => e.preventDefault());

  $("archivo").addEventListener("change", () => { leerArchivo($("archivo").files[0]); $("archivo").value = ""; });

  $("pegar-btn").addEventListener("click", () => {
    const abierto = $("pegar").hidden;
    $("pegar").hidden = !abierto;
    $("pegar-btn").setAttribute("aria-expanded", String(abierto));
    if (abierto) $("fuente").focus();
  });

  $("convertir").addEventListener("click", () => {
    if (!$("fuente").value.trim()) { aviso("Pegá algo para convertir."); $("fuente").focus(); return; }
    estado.contenido = $("fuente").value;
    estado.nombre = "documento";
    convertir();
  });

  function cargarEjemplo() {
    estado.contenido = EJEMPLO_HTML;
    estado.nombre = "ejemplo-janssen";
    $("tipo").value = "auto";
    convertir();
  }
  $("ejemplo").addEventListener("click", () => { cargarEjemplo(); $("resultado").scrollIntoView({ behavior: "smooth", block: "start" }); });

  $("max").addEventListener("input", () => { $("v-max").textContent = $("max").value; });
  $("max").addEventListener("change", () => { if (estado.contenido) convertir(); });
  $("tipo").addEventListener("change", () => { if (estado.contenido) convertir(); });

  /* Conversión */

  function convertir() {
    aviso("");
    estado.paquete = Aidoc.convertir(estado.contenido, {
      tipo: $("tipo").value,
      fuente: estado.nombre,
      maxCaracteres: Number($("max").value),
    });
    estado.marcado = null;
    $("resultado").hidden = false;
    $("contar-estado").textContent = "";
    pintarTodo();
  }

  function pintarTodo() {
    pintarMedicion();
    $("original").textContent = estado.contenido;
    pintarTexto();
    pintarEstructura();
    pintarFragmentos();
    pintarImagenes();
    pintarJson();
    mostrarPestana(estado.pestana, false);
  }

  function pintarMedicion() {
    const p = estado.paquete, m = p.medicion, real = Boolean(m.modelo);
    const md = p.metadatos;
    $("archivo-nombre").textContent = `${estado.nombre}.aidoc.json · ${md.tipoOriginal} · idioma: ${md.idioma}`;
    $("tok-original").textContent = num(m.tokensOriginal);
    $("tok-texto").textContent = num(m.tokensTexto);
    $("ahorro").textContent = `${Math.round(m.ahorro * 100)} %`;
    $("metodo").textContent = real ? `Conteo real · ${nombreModelo(m.modelo)}` : "Estimación · 1 token ≈ 4 caracteres";
    $("metodo").className = real ? "chip chip--acento" : "chip";
    $("contar").textContent = real ? "Volver a contar" : "Contar con Claude";
    const prefijo = real ? "" : "≈ ";
    $("chip-original").textContent = `${prefijo}${num(m.tokensOriginal)} tokens`;
    $("chip-texto").textContent = `${prefijo}${num(m.tokensTexto)} tokens`;
    const items = [
      ["sección", "secciones", p.secciones.length], ["fragmento", "fragmentos", p.fragmentos.length], ["tabla", "tablas", p.tablas.length],
      ["imagen", "imágenes", p.imagenes.length], ["enlace", "enlaces", p.enlaces.length],
    ];
    $("resumen").innerHTML = items.map(([uno, varios, v]) => `<li><b>${num(v)}</b> ${v === 1 ? uno : varios}</li>`).join("");
    const errores = Aidoc.validar(p);
    $("validez").textContent = errores.length ? `✗ ${errores.length} problema${errores.length === 1 ? "" : "s"} con el esquema` : "✓ Cumple aidoc 0.1";
    $("validez").className = `chip ${errores.length ? "chip--error" : "chip--ok"}`;
  }

  const nombreModelo = (id) => (Claude.MODELOS.find((m) => m.id === id) || { nombre: id }).nombre;

  function pintarTexto() {
    const t = estado.paquete.texto, r = estado.marcado;
    $("texto").innerHTML = r
      ? esc(t.slice(0, r.inicio)) + `<mark class="resaltado" id="resaltado">${esc(t.slice(r.inicio, r.fin))}</mark>` + esc(t.slice(r.fin))
      : esc(t);
  }

  function pintarEstructura() {
    const p = estado.paquete;
    $("arbol").innerHTML = p.secciones.map((s, i) => `<li><button type="button" data-seccion="${i}" style="padding-left:calc(var(--e-3) + ${Math.max(0, s.nivel - 1)} * var(--e-4))"${estado.marcado && estado.marcado.tipo === "s" && estado.marcado.i === i ? ' aria-current="true"' : ""}>`
      + `<span class="arbol__nivel">${s.nivel ? "#".repeat(s.nivel) : "¶"}</span>${esc(s.titulo)}`
      + `<span class="arbol__rango">${esc(s.id)} · caracteres ${num(s.inicio)} a ${num(s.fin)}</span></button></li>`).join("");
    let extras = "";
    if (p.tablas.length) {
      extras += `<h4>Tablas</h4>` + p.tablas.map((t) => `<div class="tabla-scroll"><table class="tabla-mini"><thead><tr>${t.encabezados.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead>`
        + `<tbody>${t.filas.slice(0, 5).map((f) => `<tr>${f.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`
        + (t.filas.length > 5 ? `<p class="campo__ayuda">y ${t.filas.length - 5} filas más</p>` : "")).join("");
    }
    if (p.enlaces.length) extras += `<h4>Enlaces</h4><ul>${p.enlaces.map((l) => `<li>${esc(l.texto || "(sin texto)")} <span class="fragmento__meta">${esc(l.url)}</span></li>`).join("")}</ul>`;
    $("extras").innerHTML = extras;
  }

  function pintarFragmentos() {
    $("fragmentos").innerHTML = estado.paquete.fragmentos.map((f, i) => {
      const resumen = f.texto.length > 220 ? f.texto.slice(0, 220) + "…" : f.texto;
      return `<li><button type="button" class="fragmento" data-fragmento="${i}"${estado.marcado && estado.marcado.tipo === "f" && estado.marcado.i === i ? ' aria-current="true"' : ""}>`
        + `<span class="fragmento__meta">${esc(f.id)} · ${esc(f.ruta.join(" › ") || "(sin sección)")} · ≈ ${num(f.tokensEstimados)} tokens · ${esc(f.hash.slice(0, 19))}…</span>`
        + `<span class="fragmento__texto">${esc(resumen)}</span></button></li>`;
    }).join("");
  }

  function pintarJson() {
    $("json").textContent = JSON.stringify(estado.paquete, null, 2);
  }

  function pintarImagenes() {
    const p = estado.paquete;
    if (!p) return;
    const m = Claude.MODELOS.find((x) => x.id === modelo());
    $("imagenes-ayuda").textContent = p.imagenes.length
      ? `Con tu key, ${m.nombre} describe cada imagen y lee su texto (unos ${dolares(Claude.costoEstimado(m.id))} por imagen de 1000 × 1000 px). El paquete guarda qué modelo lo hizo.`
      : "Este documento no tiene imágenes.";
    $("imagenes").innerHTML = p.imagenes.map((img, i) => {
      const remota = /^https?:\/\//i.test(img.src) || /^data:image\//i.test(img.src);
      const hecha = img.descripcion
        ? `<p class="imagen__descripcion">${esc(img.descripcion)}</p>`
          + (img.textoDetectado ? `<p class="campo__ayuda">Texto en la imagen: ${esc(img.textoDetectado)}</p>` : "")
          + `<span class="chip chip--acento">${esc(nombreModelo(img.descripcionModelo))}</span>`
        : "";
      return `<li class="imagen"><p class="imagen__alt">${esc(img.alt || "(sin texto alternativo)")}</p>`
        + `<code class="imagen__src">${esc(img.src)}</code>${hecha}`
        + `<div class="acciones" style="justify-content:flex-start"><button type="button" class="btn" data-describir="${i}">${img.descripcion ? "Describir de nuevo" : remota ? "Describir con Claude" : "Elegir la imagen y describir"}</button></div>`
        + (remota ? "" : `<p class="campo__ayuda">La ruta es relativa al documento original: elegí el archivo de la imagen para mandarlo.</p>`)
        + `<p class="campo__ayuda imagen__estado" id="imagen-estado-${i}" aria-live="polite"></p></li>`;
    }).join("");
  }

  /* Navegación: estructura y fragmentos marcan su parte del texto */

  function marcar(tipo, i) {
    const p = estado.paquete;
    const r = tipo === "s" ? p.secciones[i] : p.fragmentos[i];
    estado.marcado = { tipo, i, inicio: r.inicio, fin: r.fin };
    pintarTexto();
    pintarEstructura();
    pintarFragmentos();
    mostrarPestana("texto", true);
    const m = $("resaltado");
    if (m) {
      const caja = $("texto");
      caja.scrollTop = Math.max(0, m.offsetTop - caja.offsetTop - 24);
      caja.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  $("arbol").addEventListener("click", (e) => { const b = e.target.closest("[data-seccion]"); if (b) marcar("s", Number(b.dataset.seccion)); });
  $("fragmentos").addEventListener("click", (e) => { const b = e.target.closest("[data-fragmento]"); if (b) marcar("f", Number(b.dataset.fragmento)); });

  /* Pestañas accesibles: flechas, Inicio y Fin */

  const PESTANAS = ["texto", "estructura", "fragmentos", "imagenes", "json"];

  function mostrarPestana(nombre, foco) {
    estado.pestana = nombre;
    for (const n of PESTANAS) {
      const tab = $(`tab-${n}`), activa = n === nombre;
      tab.setAttribute("aria-selected", String(activa));
      tab.tabIndex = activa ? 0 : -1;
      $(`p-${n}`).hidden = !activa;
    }
    if (foco) $(`tab-${nombre}`).focus({ preventScroll: true });
  }

  function teclasPestanas(lista, nombres, activar) {
    lista.addEventListener("keydown", (e) => {
      const i = nombres.indexOf(e.target.dataset.nombre);
      if (i < 0) return;
      const destino = { ArrowRight: (i + 1) % nombres.length, ArrowLeft: (i - 1 + nombres.length) % nombres.length, Home: 0, End: nombres.length - 1 }[e.key];
      if (destino === undefined) return;
      e.preventDefault();
      activar(nombres[destino], true);
    });
  }

  for (const n of PESTANAS) {
    $(`tab-${n}`).dataset.nombre = n;
    $(`tab-${n}`).addEventListener("click", () => mostrarPestana(n, false));
  }
  teclasPestanas($("pestanas"), PESTANAS, mostrarPestana);

  // En pantallas angostas, un selector elige entre el original y el resultado.
  function ver(cual, foco) {
    $("vista").dataset.ver = cual;
    for (const n of ["original", "resultado"]) {
      const b = $(`ver-${n}`);
      b.setAttribute("aria-selected", String(n === cual));
      b.tabIndex = n === cual ? 0 : -1;
    }
    if (foco) $(`ver-${cual}`).focus();
  }
  $("ver-original").dataset.nombre = "original";
  $("ver-resultado").dataset.nombre = "resultado";
  $("ver-original").addEventListener("click", () => ver("original"));
  $("ver-resultado").addEventListener("click", () => ver("resultado"));
  teclasPestanas(document.querySelector(".vista__selector"), ["original", "resultado"], ver);
  ver("resultado");

  /* Descarga */

  $("descargar").addEventListener("click", () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(estado.paquete, null, 2)], { type: "application/json" }));
    a.download = `${estado.nombre}.aidoc.json`;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });

  /* Validación de un .aidoc.json */

  function validarArchivo(nombre, texto) {
    const salida = $("validacion-salida");
    $("validacion").hidden = false;
    let paquete;
    try { paquete = JSON.parse(texto); }
    catch (e) { salida.innerHTML = `<p class="aviso aviso--error">${esc(nombre)} no es un JSON válido: ${esc(e.message)}</p>`; return; }
    const errores = Aidoc.validar(paquete);
    salida.innerHTML = errores.length
      ? `<p class="aviso aviso--error"><b>${esc(nombre)}</b>: ${errores.length} problema${errores.length === 1 ? "" : "s"}.</p><ul>${errores.slice(0, 50).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`
        + (errores.length > 50 ? `<p class="campo__ayuda">y ${errores.length - 50} más.</p>` : "")
      : `<p class="aviso aviso--ok"><b>${esc(nombre)}</b> es válido: cumple el esquema aidoc 0.1 (JSON Schema 2020-12) y cada fragmento coincide con el texto y con su huella.</p>`;
    $("validacion").scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  /* Claude: conteo real de tokens */

  $("contar").addEventListener("click", async () => {
    if (!key()) { pedirKey("Para contar tokens reales, poné tu key de la API de Anthropic."); return; }
    const p = estado.paquete, m = modelo(), boton = $("contar");
    boton.disabled = true;
    $("contar-estado").textContent = `Contando con ${nombreModelo(m)}…`;
    try {
      const [tokensOriginal, tokensTexto] = await Promise.all([
        Claude.contarTokens(key(), m, estado.contenido),
        Claude.contarTokens(key(), m, p.texto),
      ]);
      if (estado.paquete !== p) return;   // se convirtió otra cosa mientras tanto
      estado.paquete = Aidoc.conConteo(p, { modelo: m, tokensOriginal, tokensTexto });
      pintarMedicion();
      pintarJson();
      $("contar-estado").textContent = "Cada número incluye los pocos tokens fijos del formato de un mensaje. Los fragmentos siguen con la estimación.";
    } catch (e) {
      $("contar-estado").textContent = e.message;
    } finally {
      boton.disabled = false;
    }
  });

  /* Claude: descripción de imágenes */

  let imagenPendiente = null;

  async function aBase64(archivo) {
    const bmp = await createImageBitmap(archivo);
    const escala = Math.min(1, 1568 / Math.max(bmp.width, bmp.height));   // el lado largo que procesa el modelo sin achicar
    const lienzo = document.createElement("canvas");
    lienzo.width = Math.round(bmp.width * escala);
    lienzo.height = Math.round(bmp.height * escala);
    lienzo.getContext("2d").drawImage(bmp, 0, 0, lienzo.width, lienzo.height);
    const tipo = archivo.type === "image/png" ? "image/png" : "image/jpeg";
    const url = lienzo.toDataURL(tipo, 0.9);
    return { base64: url.slice(url.indexOf(",") + 1), tipo };
  }

  async function describir(i, imagen) {
    const p = estado.paquete, img = p.imagenes[i], salida = $(`imagen-estado-${i}`);
    const boton = document.querySelector(`[data-describir="${i}"]`);
    if (boton) boton.disabled = true;
    if (salida) salida.textContent = `Describiendo con ${nombreModelo(modelo())}…`;
    try {
      const r = await Claude.describirImagen(key(), modelo(), imagen, { idioma: p.metadatos.idioma, alt: img.alt });
      if (estado.paquete !== p) return;
      estado.paquete = Aidoc.conDescripcion(p, i, r);
      pintarImagenes();
      pintarJson();
      pintarMedicion();
      const nueva = $(`imagen-estado-${i}`);
      if (nueva) nueva.textContent = `Listo. Costó ${dolares(r.costo)}.`;
    } catch (e) {
      if (salida) salida.textContent = e.message;
      if (boton) boton.disabled = false;
    }
  }

  $("imagenes").addEventListener("click", (e) => {
    const b = e.target.closest("[data-describir]");
    if (!b) return;
    if (!key()) { pedirKey("Para describir imágenes, poné tu key de la API de Anthropic."); return; }
    const i = Number(b.dataset.describir), src = estado.paquete.imagenes[i].src;
    if (/^https?:\/\//i.test(src)) { describir(i, { url: src }); return; }
    const datos = /^data:(image\/(?:png|jpeg|gif|webp));base64,(.+)$/i.exec(src);
    if (datos) { describir(i, { tipo: datos[1].toLowerCase(), base64: datos[2] }); return; }
    imagenPendiente = i;
    $("imagen-archivo").click();
  });

  $("imagen-archivo").addEventListener("change", async () => {
    const archivo = $("imagen-archivo").files[0], i = imagenPendiente;
    $("imagen-archivo").value = "";
    imagenPendiente = null;
    if (!archivo || i == null) return;
    try { describir(i, await aBase64(archivo)); }
    catch { const s = $(`imagen-estado-${i}`); if (s) s.textContent = "No pude abrir esa imagen. Probá con un PNG, JPG, GIF o WebP."; }
  });

  /* Ajustes de Claude */

  $("key").addEventListener("change", guardarKey);
  $("recordar").addEventListener("change", guardarKey);
  $("olvidar").addEventListener("click", () => {
    $("key").value = "";
    $("recordar").checked = false;
    escribir("localStorage", CLAVE_KEY, null);
    escribir("sessionStorage", CLAVE_KEY, null);
    $("key").focus();
  });
  $("modelo").addEventListener("change", () => { escribir("localStorage", CLAVE_MODELO, modelo()); ayudaModelo(); });

  iniciarClaude();
  if (new URLSearchParams(location.search).has("ejemplo")) cargarEjemplo();
})();
