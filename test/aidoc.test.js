const test = require("node:test");
const assert = require("node:assert/strict");
const MD = require("../src/markdown.js");
const A = require("../src/aidoc.js");
const EJEMPLO = require("../src/ejemplo.js");

test("SHA-256 coincide con los vectores conocidos", () => {
  assert.equal(A.sha256(""), "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  assert.equal(A.sha256("abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  assert.equal(A.sha256("abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq"), "248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1");
  assert.equal(A.sha256("ñ"), require("node:crypto").createHash("sha256").update("ñ").digest("hex"));
});

test("HTML → Markdown: títulos, énfasis, listas, enlaces, código, tablas e imágenes", () => {
  const md = MD.desdeHtml(EJEMPLO);
  assert.match(md, /^# El efecto Janssen en silos$/m);
  assert.match(md, /^## Cómo se calcula$/m);
  assert.match(md, /\*\*rozamiento\*\*/);
  assert.match(md, /\*efecto Janssen\*/);
  assert.match(md, /^- μ: rozamiento/m);
  assert.match(md, /\[la Wikipedia\]\(https:\/\/es\.wikipedia\.org\/wiki\/Efecto_Janssen\)/);
  assert.match(md, /```\nP\(z\) = ρ·g·λ/);
  assert.match(md, /^\| Material \| Densidad \(kg\/m³\) \| μ \|$/m);
  assert.match(md, /!\[Corte de un silo con las fuerzas sobre las paredes\]\(silo\.jpg\)/);
});

test("HTML → Markdown descarta menú, scripts y estilos", () => {
  const md = MD.desdeHtml(EJEMPLO);
  assert.doesNotMatch(md, /gtag|dataLayer|font-family|Ingresar/);
});

test("entidades y listas numeradas anidadas", () => {
  assert.equal(MD.decodificar("Canci&oacute;n &amp; m&#225;s &#x00F1;"), "Canción & más ñ");
  const md = MD.desdeHtml("<ol><li>uno<ul><li>a</li></ul></li><li>dos</li></ol>");
  assert.match(md, /^1\. uno$/m);
  assert.match(md, /^ {2}- a$/m);
  assert.match(md, /^2\. dos$/m);
});

test("secciones con ruta, y lo que hay antes del primer título", () => {
  const s = MD.secciones("intro\n\n# A\ntexto\n## B\nmás\n# C\nfin\n");
  assert.deepEqual(s.map((x) => x.titulo), ["(inicio)", "A", "B", "C"]);
  assert.deepEqual(s[2].ruta, ["A", "B"]);
  assert.deepEqual(s[3].ruta, ["C"]);
  assert.equal(MD.secciones("```\n# no es título\n```\n")[0].titulo, "(documento)");
});

test("convertir el ejemplo: metadatos, estructura, tablas, enlaces y ahorro", () => {
  const p = A.convertir(EJEMPLO, { fuente: "ejemplo.html", creado: "2026-11-02T00:00:00.000Z" });
  assert.equal(p.aidoc, "0.1");
  assert.equal(p.metadatos.tipoOriginal, "text/html");
  assert.equal(p.metadatos.titulo, "El efecto Janssen en silos");
  assert.equal(p.metadatos.idioma, "es");
  assert.deepEqual(p.secciones.map((s) => s.titulo), ["El efecto Janssen en silos", "Cómo se calcula", "Valores típicos"]);
  assert.deepEqual(p.tablas[0].encabezados, ["Material", "Densidad (kg/m³)", "μ"]);
  assert.deepEqual(p.tablas[0].filas[1], ["Trigo", "780", "0,35"]);
  assert.equal(p.imagenes.length, 1);
  assert.equal(p.enlaces[0].url, "https://es.wikipedia.org/wiki/Efecto_Janssen");
  assert.ok(p.medicion.ahorro > 0.5, `ahorro ${p.medicion.ahorro}`);
  assert.deepEqual(A.validar(p), []);
});

test("los fragmentos respetan el máximo y coinciden con el texto", () => {
  const largo = "# T\n\n" + Array.from({ length: 30 }, (_, i) => `Párrafo ${i} ` + "palabra ".repeat(20)).join("\n\n");
  const p = A.convertir(largo, { tipo: "text/markdown", maxCaracteres: 400 });
  assert.ok(p.fragmentos.length > 5);
  for (const f of p.fragmentos) {
    assert.ok(f.texto.length <= 400, `${f.id} mide ${f.texto.length}`);
    assert.equal(p.texto.slice(f.inicio, f.fin), f.texto);
  }
  assert.deepEqual(A.validar(p), []);
});

test("validar detecta un fragmento alterado", () => {
  const p = A.convertir(EJEMPLO, {});
  p.fragmentos[0].texto += " (alterado)";
  const e = A.validar(p);
  assert.ok(e.some((x) => x.includes("no coincide")));
  assert.ok(e.some((x) => x.includes("huella")));
});

test("detectar tipo e idioma", () => {
  assert.equal(A.detectarTipo("<p>hola</p>"), "text/html");
  assert.equal(A.detectarTipo("# Título\n\ntexto"), "text/markdown");
  assert.equal(A.detectarTipo("solo una línea"), "text/plain");
  assert.equal(A.idioma("The cat is on the table and it is for the kids"), "en");
});

test("tablas con título (caption): el título va antes y la tabla queda bien formada", () => {
  const md = MD.desdeHtml("<table>\n  <caption>Capacidad</caption>\n  <tr><th>Modo</th><th>Máximo</th></tr>\n  <tr><td>Numérico</td><td>7089</td></tr>\n</table>");
  assert.match(md, /^\*\*Capacidad\*\*\n\n\| Modo \| Máximo \|\n\| --- \| --- \|\n\| Numérico \| 7089 \|$/m);
  assert.deepEqual(MD.tablas(md)[0], { encabezados: ["Modo", "Máximo"], filas: [["Numérico", "7089"]] });
});
