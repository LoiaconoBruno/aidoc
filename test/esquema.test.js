// El validador de JSON Schema contra el JSON-Schema-Test-Suite oficial (draft 2020-12),
// y la validación completa de un paquete aidoc contra spec/aidoc-0.1.schema.json.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const E = require("../src/esquema.js");
const A = require("../src/aidoc.js");
const EJEMPLO = require("../src/ejemplo.js");

const SUITE = path.join(__dirname, "json-schema-test-suite");

test("JSON-Schema-Test-Suite 2020-12: pasan todos los casos con palabras clave soportadas", () => {
  let corridos = 0, saltados = 0;
  const fallas = [];
  for (const archivo of fs.readdirSync(SUITE).filter((f) => f.endsWith(".json")).sort()) {
    const formatos = archivo === "date-time.json";   // optional/format/date-time.json: format como aserción
    for (const grupo of JSON.parse(fs.readFileSync(path.join(SUITE, archivo), "utf8"))) {
      if (!E.soportado(grupo.schema)) { saltados += grupo.tests.length; continue; }
      for (const caso of grupo.tests) {
        corridos++;
        let valido;
        try { valido = E.validar(grupo.schema, caso.data, { formatos }).length === 0; } catch (e) { valido = `error: ${e.message}`; }
        if (valido !== caso.valid) fallas.push(`${archivo} › ${grupo.description} › ${caso.description}`);
      }
    }
  }
  assert.deepEqual(fallas, []);
  assert.equal(corridos, 970);
  assert.equal(saltados, 42, "casos con unevaluated*, $anchor, $id internos o referencias a otros documentos");
});

test("lo que no implementa lo dice, no lo valida a medias", () => {
  assert.throws(() => E.validar({ unevaluatedProperties: false }, {}), /no soportada/);
  assert.throws(() => E.validar({ $ref: "https://example.com/x.json" }, 1), /no soportado/);
  assert.equal(E.soportado({ $defs: { a: { type: "string" } }, $ref: "#/$defs/a" }), true);
});

test("los errores dicen dónde y qué", () => {
  const esquema = { type: "object", required: ["a"], properties: { b: { type: "array", items: { type: "integer", minimum: 0 } } } };
  const e = E.validar(esquema, { b: [1, -2, "x"] });
  assert.deepEqual(e.map((x) => [x.ruta, x.palabra]), [["", "required"], ["/b/1", "minimum"], ["/b/2", "type"]]);
});

test("la copia del esquema que usa el navegador es idéntica a spec/", () => {
  const spec = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "spec", "aidoc-0.1.schema.json"), "utf8"));
  assert.deepEqual(A.ESQUEMA, spec);
  assert.equal(spec.$schema, "https://json-schema.org/draft/2020-12/schema");
  assert.ok(E.soportado(spec));
});

test("validar: el paquete del ejemplo cumple el esquema completo", () => {
  const p = A.convertir(EJEMPLO, { fuente: "ejemplo.html", creado: "2026-11-10T12:00:00.000Z" });
  assert.deepEqual(E.validar(A.ESQUEMA, p, { formatos: true }), []);
  assert.deepEqual(A.validar(p), []);
});

test("validar: detecta errores que una revisión de forma no ve", () => {
  const base = () => A.convertir(EJEMPLO, { creado: "2026-11-10T12:00:00Z" });
  const casos = [
    [(p) => { p.metadatos.creado = "10/11/2026"; }, /\/metadatos\/creado: no es una fecha/],
    [(p) => { p.metadatos.tipoOriginal = "application/pdf"; }, /\/metadatos\/tipoOriginal: tiene que ser uno de/],
    [(p) => { p.secciones[0].nivel = 7; }, /\/secciones\/0\/nivel: tiene que ser como mucho 6/],
    [(p) => { p.fragmentos[0].hash = "sha256:XYZ"; }, /\/fragmentos\/0\/hash: no cumple el patrón/],
    [(p) => { p.tablas[0].filas[0][1] = 780; }, /\/tablas\/0\/filas\/0\/1: tiene que ser string/],
    [(p) => { p.imagenes[0].descripcionModelo = 5; }, /\/imagenes\/0\/descripcionModelo: tiene que ser string o null/],
    [(p) => { p.aidoc = "0.2"; }, /\/aidoc: tiene que ser "0.1"/],
    [(p) => { delete p.enlaces; }, /\(raíz\): falta la propiedad "enlaces"/],
    [(p) => { p.secciones[1].fin = p.texto.length + 10; }, /no cae dentro del texto/],
    [(p) => { p.fragmentos[1].id = p.fragmentos[0].id; }, /Fragmento repetido/],
  ];
  for (const [romper, esperado] of casos) {
    const p = base();
    romper(p);
    const errores = A.validar(p);
    assert.ok(errores.some((x) => esperado.test(x)), `${esperado}: ${errores.join(" | ")}`);
  }
});

test("conConteo y conDescripcion guardan de dónde salió cada dato y siguen siendo válidos", () => {
  let p = A.convertir(EJEMPLO, { creado: "2026-11-10T12:00:00Z" });
  p = A.conConteo(p, { modelo: "claude-opus-5-5", tokensOriginal: 600, tokensTexto: 200 });
  assert.equal(p.medicion.modelo, "claude-opus-5-5");
  assert.match(p.medicion.metodo, /count_tokens/);
  assert.equal(p.medicion.ahorro, 1 - 200 / 600);
  p = A.conDescripcion(p, 0, { descripcion: "Un silo visto en corte.", textoDetectado: null, modelo: "claude-haiku-5-5" });
  assert.equal(p.imagenes[0].descripcionModelo, "claude-haiku-5-5");
  assert.deepEqual(A.validar(p), []);
});

test("fecha y hora RFC 3339", () => {
  for (const ok of ["2026-11-10T12:00:00Z", "2026-11-10T12:00:00.123-03:00", "2024-02-29T00:00:00Z", "1998-12-31T23:59:60Z"]) assert.ok(E.fechaHora(ok), ok);
  for (const mal of ["2026-11-10", "2023-02-29T00:00:00Z", "2026-11-10T24:00:00Z", "2026-11-10T12:00:00", "1998-12-31T23:58:60Z"]) assert.equal(E.fechaHora(mal), false, mal);
});
