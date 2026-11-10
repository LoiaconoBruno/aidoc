// Las llamadas a la API, con un fetch simulado: forma del pedido, encabezados y manejo de respuestas.
// No llaman a la API real (no hay key en los tests).
const test = require("node:test");
const assert = require("node:assert/strict");
const C = require("../src/claude.js");

function falso(respuesta, estado = 200) {
  const llamadas = [];
  const f = async (url, init) => {
    llamadas.push({ url, init, cuerpo: JSON.parse(init.body) });
    return { ok: estado >= 200 && estado < 300, status: estado, json: async () => respuesta };
  };
  return { f, llamadas };
}

test("contarTokens usa count_tokens con la key, la versión y el acceso desde el navegador", async () => {
  const { f, llamadas } = falso({ input_tokens: 183 });
  const n = await C.contarTokens("sk-ant-prueba", "claude-opus-5-5", "Hola", { fetch: f });
  assert.equal(n, 183);
  const [ll] = llamadas;
  assert.equal(ll.url, "https://api.anthropic.com/v1/messages/count_tokens");
  assert.equal(ll.init.method, "POST");
  assert.equal(ll.init.headers["x-api-key"], "sk-ant-prueba");
  assert.equal(ll.init.headers["anthropic-version"], "2026-10-21");
  assert.equal(ll.init.headers["anthropic-dangerous-direct-browser-access"], "true");
  assert.deepEqual(ll.cuerpo, { model: "claude-opus-5-5", messages: [{ role: "user", content: "Hola" }] });
});

test("contarTokens: texto vacío no llama, y sin key avisa", async () => {
  const { f, llamadas } = falso({ input_tokens: 1 });
  assert.equal(await C.contarTokens("k", "claude-opus-5-5", "", { fetch: f }), 0);
  assert.equal(llamadas.length, 0);
  await assert.rejects(C.contarTokens("", "claude-opus-5-5", "x", { fetch: f }), /Falta tu key/);
});

test("los errores HTTP se explican", async () => {
  await assert.rejects(C.contarTokens("k", "m", "x", { fetch: falso({ error: { message: "invalid x-api-key" } }, 401).f }), /no es válida.*invalid x-api-key/);
  await assert.rejects(C.contarTokens("k", "m", "x", { fetch: falso({}, 429).f }), /límite de pedidos/);
  await assert.rejects(C.contarTokens("k", "m", "x", { fetch: async () => { throw new Error("offline"); } }), /No se pudo conectar/);
});

test("describirImagen con Opus 5.5: imagen por URL, salida estructurada, fallback y modelo que respondió", async () => {
  const { f, llamadas } = falso({
    model: "claude-opus-5-5",
    stop_reason: "end_turn",
    content: [{ type: "thinking", thinking: "" }, { type: "text", text: '{"descripcion":"Corte de un silo con flechas de presión.","textoDetectado":"P(z)"}' }],
    usage: { input_tokens: 1500, output_tokens: 100 },
  });
  const r = await C.describirImagen("k", "claude-opus-5-5", { url: "https://ejemplo.com/silo.jpg" }, { idioma: "es", alt: "Corte de un silo", fetch: f });
  assert.deepEqual(r, { descripcion: "Corte de un silo con flechas de presión.", textoDetectado: "P(z)", modelo: "claude-opus-5-5", costo: (1500 * 4 + 100 * 20) / 1e6 });
  const { cuerpo, init } = llamadas[0];
  assert.equal(cuerpo.model, "claude-opus-5-5");
  assert.equal(cuerpo.fallbacks, "default");
  assert.equal(init.headers["anthropic-beta"], "server-side-fallback-2026-07-01");
  assert.equal(cuerpo.output_config.format.type, "json_schema");
  assert.equal(cuerpo.output_config.effort, "low");
  assert.equal("thinking" in cuerpo, false, "Opus 5.5 no acepta desactivar el razonamiento");
  assert.deepEqual(cuerpo.messages[0].content[0], { type: "image", source: { type: "url", url: "https://ejemplo.com/silo.jpg" } });
  assert.match(cuerpo.messages[0].content[1].text, /español.*Corte de un silo/s);
});

test("describirImagen con Haiku 5.5: base64, sin fallback, texto vacío pasa a null", async () => {
  const { f, llamadas } = falso({
    model: "claude-haiku-5-5", stop_reason: "end_turn",
    content: [{ type: "text", text: '{"descripcion":"Un gráfico de barras.","textoDetectado":"  "}' }],
    usage: { input_tokens: 1000, output_tokens: 50 },
  });
  const r = await C.describirImagen("k", "claude-haiku-5-5", { base64: "AAAA", tipo: "image/png" }, { idioma: "en", fetch: f });
  assert.equal(r.textoDetectado, null);
  assert.equal(r.modelo, "claude-haiku-5-5");
  assert.equal("fallbacks" in llamadas[0].cuerpo, false);
  assert.equal(llamadas[0].init.headers["anthropic-beta"], undefined);
  assert.deepEqual(llamadas[0].cuerpo.messages[0].content[0].source, { type: "base64", media_type: "image/png", data: "AAAA" });
  assert.match(llamadas[0].cuerpo.messages[0].content[1].text, /inglés/);
});

test("describirImagen: si respondió el modelo de respaldo, se guarda ese; un rechazo se informa", async () => {
  const resp = { model: "claude-opus-5", stop_reason: "end_turn", content: [{ type: "text", text: '{"descripcion":"x","textoDetectado":""}' }], usage: {} };
  assert.equal((await C.describirImagen("k", "claude-opus-5-5", { url: "https://a.b/c.png" }, { fetch: falso(resp).f })).modelo, "claude-opus-5");
  await assert.rejects(C.describirImagen("k", "claude-opus-5-5", { url: "https://a.b/c.png" }, { fetch: falso({ stop_reason: "refusal", content: [] }).f }), /no quiso/);
});

test("costo estimado por imagen de 1000×1000 px", () => {
  // 36 × 36 = 1.296 tokens visuales + 200 de instrucción; 300 de respuesta.
  assert.equal(C.costoEstimado("claude-opus-5-5"), (1496 * 4 + 300 * 20) / 1e6);
  assert.equal(C.costoEstimado("claude-haiku-5-5"), (1496 * 0.1 + 300 * 0.5) / 1e6);
});
