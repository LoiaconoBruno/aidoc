// Interfaz: entrada, conversión, pestañas de salida, descarga y validación.
(() => {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  let paquete = null;
  let pestana = "texto";
  let nombre = "documento";

  $("v-max").textContent = $("max").value + " caracteres";
  $("max").addEventListener("input", () => { $("v-max").textContent = $("max").value + " caracteres"; if (paquete) convertir(); });

  function convertir() {
    const contenido = $("fuente").value;
    if (!contenido.trim()) { $("vista").innerHTML = '<p class="muted">No hay contenido para convertir.</p>'; return; }
    paquete = Aidoc.convertir(contenido, { tipo: $("tipo").value, fuente: nombre, maxCaracteres: Number($("max").value) });
    const m = paquete.medicion;
    const stat = (k, v) => `<div class="stat"><div class="k">${k}</div><div class="v">${v}</div></div>`;
    $("stats").innerHTML = stat("Tokens del original", m.tokensOriginal.toLocaleString("es-AR"))
      + stat("Tokens del texto canónico", m.tokensTexto.toLocaleString("es-AR"))
      + stat("Ahorro", Math.round(m.ahorro * 100) + " %")
      + stat("Secciones", paquete.secciones.length)
      + stat("Fragmentos", paquete.fragmentos.length)
      + stat("Tablas / imágenes", `${paquete.tablas.length} / ${paquete.imagenes.length}`);
    $("descargar").disabled = false;
    $("nombre-archivo").textContent = `${nombre}.aidoc.json · tipo detectado: ${paquete.metadatos.tipoOriginal} · idioma: ${paquete.metadatos.idioma}`;
    mostrar();
  }

  function mostrar() {
    document.querySelectorAll("[data-tab]").forEach((b) => b.classList.toggle("activo", b.dataset.tab === pestana));
    if (!paquete) { $("vista").innerHTML = '<p class="muted">Convertí algo para ver el resultado.</p>'; return; }
    if (pestana === "texto") $("vista").innerHTML = `<pre class="salida">${esc(paquete.texto)}</pre>`;
    if (pestana === "estructura") {
      $("vista").innerHTML = `<ul class="arbol">${paquete.secciones.map((s) =>
        `<li style="padding-left:${Math.max(0, s.nivel - 1) * 18}px">${s.nivel ? "#".repeat(s.nivel) + " " : ""}${esc(s.titulo)} <span class="small muted">[${s.inicio}–${s.fin}]</span></li>`).join("")}</ul>`
        + (paquete.tablas.length ? `<h3>Tablas</h3>${paquete.tablas.map((t) => `<p class="small">${t.encabezados.map(esc).join(" · ")} — ${t.filas.length} filas</p>`).join("")}` : "")
        + (paquete.imagenes.length ? `<h3>Imágenes</h3>${paquete.imagenes.map((i) => `<p class="small">${esc(i.alt || "(sin texto alternativo)")} <span class="muted">${esc(i.src)}</span></p>`).join("")}` : "")
        + (paquete.enlaces.length ? `<h3>Enlaces</h3>${paquete.enlaces.map((l) => `<p class="small">${esc(l.texto)} <span class="muted">${esc(l.url)}</span></p>`).join("")}` : "");
    }
    if (pestana === "fragmentos") {
      $("vista").innerHTML = paquete.fragmentos.map((f) =>
        `<div class="frag"><div class="meta">${f.id} · ${esc(f.ruta.join(" › ") || "(sin sección)")} · ${f.tokensEstimados} tokens · ${f.hash.slice(0, 23)}…</div>${esc(f.texto.slice(0, 280))}${f.texto.length > 280 ? "…" : ""}</div>`).join("");
    }
    if (pestana === "json") $("vista").innerHTML = `<pre class="salida">${esc(JSON.stringify(paquete, null, 2))}</pre>`;
  }

  document.querySelectorAll("[data-tab]").forEach((b) => b.addEventListener("click", () => { pestana = b.dataset.tab; mostrar(); }));
  $("convertir").addEventListener("click", convertir);
  $("ejemplo").addEventListener("click", () => { $("fuente").value = EJEMPLO_HTML; $("tipo").value = "auto"; nombre = "ejemplo-janssen"; convertir(); });
  $("abrir-btn").addEventListener("click", () => $("abrir").click());
  $("abrir").addEventListener("change", async () => {
    const f = $("abrir").files[0];
    if (!f) return;
    $("fuente").value = await f.text();
    nombre = f.name.replace(/\.[^.]+$/, "");
    convertir();
    $("abrir").value = "";
  });
  $("descargar").addEventListener("click", () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(paquete, null, 2)], { type: "application/json" }));
    a.download = `${nombre}.aidoc.json`; a.click(); URL.revokeObjectURL(a.href);
  });
  $("validar-btn").addEventListener("click", () => $("validar").click());
  $("validar").addEventListener("change", async () => {
    const f = $("validar").files[0];
    if (!f) return;
    try {
      const errores = Aidoc.validar(JSON.parse(await f.text()));
      $("validacion").innerHTML = errores.length
        ? `<span style="color:var(--bad)">${errores.length} ${errores.length === 1 ? "problema" : "problemas"}:</span><br>${errores.slice(0, 8).map(esc).join("<br>")}`
        : `<span style="color:var(--ok)">${esc(f.name)}: válido e íntegro.</span>`;
    } catch (e) { $("validacion").innerHTML = `<span style="color:var(--bad)">No es un JSON válido: ${esc(e.message)}</span>`; }
    $("validar").value = "";
  });
  mostrar();
})();
