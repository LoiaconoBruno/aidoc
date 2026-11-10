// Validador de JSON Schema 2020-12, sin dependencias (navegador y Node).
//
// Implementa las palabras clave de validación y de aplicación que usan los
// esquemas comunes:
//   type, enum, const, multipleOf, maximum, exclusiveMaximum, minimum,
//   exclusiveMinimum, maxLength, minLength, pattern, maxItems, minItems,
//   uniqueItems, maxContains, minContains, maxProperties, minProperties,
//   required, dependentRequired, prefixItems, items, contains, properties,
//   patternProperties, additionalProperties, propertyNames, allOf, anyOf,
//   oneOf, not, if/then/else, $defs y $ref a una parte del mismo documento ("#/...").
// "format" es una anotación, como pide 2020-12; con { formatos: true } se exige
// "date-time" (RFC 3339).
// No implementa: unevaluatedItems, unevaluatedProperties, dependentSchemas,
// $anchor, $dynamicRef ni referencias a otros documentos. Si un esquema las usa,
// lanza un error en vez de validar a medias.
// Se prueba contra el JSON-Schema-Test-Suite oficial (test/json-schema-test-suite/).
const Esquema = (() => {
  const SOPORTADAS = new Set([
    "$schema", "$id", "$comment", "$defs", "$ref", "title", "description", "default", "examples",
    "deprecated", "readOnly", "writeOnly", "format",
    "type", "enum", "const", "multipleOf", "maximum", "exclusiveMaximum", "minimum", "exclusiveMinimum",
    "maxLength", "minLength", "pattern", "maxItems", "minItems", "uniqueItems", "maxContains", "minContains",
    "maxProperties", "minProperties", "required", "dependentRequired",
    "prefixItems", "items", "contains", "properties", "patternProperties", "additionalProperties", "propertyNames",
    "allOf", "anyOf", "oneOf", "not", "if", "then", "else",
  ]);
  const NO_SOPORTADAS = new Set(["unevaluatedItems", "unevaluatedProperties", "dependentSchemas", "$anchor", "$dynamicRef", "$dynamicAnchor", "$recursiveRef", "$recursiveAnchor", "$vocabulary"]);

  const tiene = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const esObjeto = (x) => x !== null && typeof x === "object" && !Array.isArray(x);
  const tipoDe = (x) => (x === null ? "null" : Array.isArray(x) ? "array" : typeof x === "number" ? (Number.isInteger(x) ? "integer" : "number") : typeof x);
  const largo = (s) => [...s].length;   // en puntos de código, no en unidades UTF-16
  const puntero = (partes) => partes.map((p) => "/" + String(p).replace(/~/g, "~0").replace(/\//g, "~1")).join("");

  function iguales(a, b) {
    if (a === b) return true;
    if (typeof a === "number" && typeof b === "number") return a === b;
    if (Array.isArray(a)) return Array.isArray(b) && a.length === b.length && a.every((x, i) => iguales(x, b[i]));
    if (esObjeto(a)) {
      if (!esObjeto(b)) return false;
      const ka = Object.keys(a), kb = Object.keys(b);
      return ka.length === kb.length && ka.every((k) => tiene(b, k) && iguales(a[k], b[k]));
    }
    return false;
  }

  function esTipo(x, t) {
    if (t === "integer") return typeof x === "number" && Number.isInteger(x);
    if (t === "number") return typeof x === "number" && Number.isFinite(x);
    if (t === "object") return esObjeto(x);
    if (t === "array") return Array.isArray(x);
    if (t === "null") return x === null;
    return typeof x === t;
  }

  // RFC 3339, sección 5.6, con segundo intercalar solo a las 23:59:60 UTC.
  function fechaHora(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})[Tt](\d{2}):(\d{2}):(\d{2})(\.\d+)?(?:[Zz]|([+-])(\d{2}):(\d{2}))$/.exec(s);
    if (!m) return false;
    const [, a, me, d, h, mi, se, , signo, oh, om] = m.map((v) => v);
    const anio = +a, mes = +me, dia = +d, hora = +h, minuto = +mi, segundo = +se;
    if (mes < 1 || mes > 12 || dia < 1) return false;
    const bisiesto = (anio % 4 === 0 && anio % 100 !== 0) || anio % 400 === 0;
    const dias = [31, bisiesto ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mes - 1];
    if (dia > dias || hora > 23 || minuto > 59 || segundo > 60) return false;
    if (signo && (+oh > 23 || +om > 59)) return false;
    if (segundo === 60) {
      const desfase = signo ? (signo === "+" ? 1 : -1) * (+oh * 60 + +om) : 0;
      const utc = (((hora * 60 + minuto - desfase) % 1440) + 1440) % 1440;
      if (utc !== 23 * 60 + 59) return false;
    }
    return true;
  }

  function resolver(raiz, ref) {
    if (ref === "#") return raiz;
    if (!ref.startsWith("#/")) throw new Error(`$ref no soportado: ${ref} (solo referencias dentro del mismo documento, como "#/$defs/x")`);
    let nodo = raiz;
    for (const crudo of ref.slice(2).split("/")) {
      const parte = decodeURIComponent(crudo).replace(/~1/g, "/").replace(/~0/g, "~");
      if (nodo === null || typeof nodo !== "object" || !tiene(nodo, parte)) throw new Error(`$ref apunta a algo que no existe: ${ref}`);
      nodo = nodo[parte];
    }
    return nodo;
  }

  // Devuelve una lista de errores { ruta, palabra, mensaje }. Lista vacía = válido.
  function validar(esquema, dato, opciones = {}) {
    const raiz = esquema;
    const formatos = Boolean(opciones.formatos);
    let profundidad = 0;

    function v(s, x, ruta) {
      if (s === true) return [];
      if (s === false) return [{ ruta: puntero(ruta), palabra: "false", mensaje: "el esquema no admite ningún valor acá" }];
      if (!esObjeto(s)) throw new Error("Un esquema tiene que ser un objeto o un booleano");
      for (const k of Object.keys(s)) if (NO_SOPORTADAS.has(k)) throw new Error(`Palabra clave no soportada: ${k}`);
      if (++profundidad > 500) throw new Error("Referencias circulares sin fin");
      const e = [];
      const err = (palabra, mensaje, r = ruta) => e.push({ ruta: puntero(r), palabra, mensaje });
      try {
        if ("$ref" in s) e.push(...v(resolver(raiz, s.$ref), x, ruta));

        if ("type" in s) {
          const tipos = Array.isArray(s.type) ? s.type : [s.type];
          if (!tipos.some((t) => esTipo(x, t))) err("type", `tiene que ser ${tipos.join(" o ")}, y es ${tipoDe(x)}`);
        }
        if ("enum" in s && !s.enum.some((o) => iguales(o, x))) err("enum", `tiene que ser uno de: ${s.enum.map((o) => JSON.stringify(o)).join(", ")}`);
        if ("const" in s && !iguales(s.const, x)) err("const", `tiene que ser ${JSON.stringify(s.const)}`);

        if (typeof x === "number") {
          if ("multipleOf" in s) {
            const q = x / s.multipleOf;
            if (!Number.isFinite(q) || Math.abs(q - Math.round(q)) > 1e-9 * Math.max(1, Math.abs(q))) err("multipleOf", `tiene que ser múltiplo de ${s.multipleOf}`);
          }
          if ("maximum" in s && x > s.maximum) err("maximum", `tiene que ser como mucho ${s.maximum}`);
          if ("exclusiveMaximum" in s && x >= s.exclusiveMaximum) err("exclusiveMaximum", `tiene que ser menor que ${s.exclusiveMaximum}`);
          if ("minimum" in s && x < s.minimum) err("minimum", `tiene que ser al menos ${s.minimum}`);
          if ("exclusiveMinimum" in s && x <= s.exclusiveMinimum) err("exclusiveMinimum", `tiene que ser mayor que ${s.exclusiveMinimum}`);
        }

        if (typeof x === "string") {
          if ("maxLength" in s && largo(x) > s.maxLength) err("maxLength", `tiene que tener como mucho ${s.maxLength} caracteres`);
          if ("minLength" in s && largo(x) < s.minLength) err("minLength", `tiene que tener al menos ${s.minLength} caracteres`);
          if ("pattern" in s && !new RegExp(s.pattern, "u").test(x)) err("pattern", `no cumple el patrón ${s.pattern}`);
          if (formatos && s.format === "date-time" && !fechaHora(x)) err("format", "no es una fecha y hora RFC 3339 válida");
        }

        if (Array.isArray(x)) {
          if ("maxItems" in s && x.length > s.maxItems) err("maxItems", `tiene que tener como mucho ${s.maxItems} elementos`);
          if ("minItems" in s && x.length < s.minItems) err("minItems", `tiene que tener al menos ${s.minItems} elementos`);
          if (s.uniqueItems === true) {
            for (let i = 0; i < x.length; i++) for (let j = i + 1; j < x.length; j++) {
              if (iguales(x[i], x[j])) { err("uniqueItems", `los elementos ${i} y ${j} son iguales`); i = x.length; break; }
            }
          }
          const prefijo = Array.isArray(s.prefixItems) ? s.prefixItems : [];
          prefijo.forEach((sub, i) => { if (i < x.length) e.push(...v(sub, x[i], [...ruta, i])); });
          if ("items" in s) for (let i = prefijo.length; i < x.length; i++) e.push(...v(s.items, x[i], [...ruta, i]));
          if ("contains" in s) {
            const cumplen = x.filter((el) => v(s.contains, el, []).length === 0).length;
            const min = "minContains" in s ? s.minContains : 1;
            if (cumplen < min) err("contains", `tiene que tener al menos ${min} elemento${min === 1 ? "" : "s"} que cumpla${min === 1 ? "" : "n"} "contains"`);
            if ("maxContains" in s && cumplen > s.maxContains) err("maxContains", `tiene que tener como mucho ${s.maxContains} elementos que cumplan "contains"`);
          }
        }

        if (esObjeto(x)) {
          const claves = Object.keys(x);
          if ("maxProperties" in s && claves.length > s.maxProperties) err("maxProperties", `tiene que tener como mucho ${s.maxProperties} propiedades`);
          if ("minProperties" in s && claves.length < s.minProperties) err("minProperties", `tiene que tener al menos ${s.minProperties} propiedades`);
          for (const k of s.required || []) if (!tiene(x, k)) err("required", `falta la propiedad "${k}"`);
          for (const [k, deps] of Object.entries(s.dependentRequired || {})) {
            if (tiene(x, k)) for (const d of deps) if (!tiene(x, d)) err("dependentRequired", `si está "${k}", tiene que estar "${d}"`);
          }
          const props = s.properties || {};
          const patrones = Object.entries(s.patternProperties || {}).map(([p, sub]) => [new RegExp(p, "u"), sub]);
          for (const k of claves) {
            let cubierta = false;
            if (tiene(props, k)) { cubierta = true; e.push(...v(props[k], x[k], [...ruta, k])); }
            for (const [re, sub] of patrones) if (re.test(k)) { cubierta = true; e.push(...v(sub, x[k], [...ruta, k])); }
            if (!cubierta && "additionalProperties" in s) {
              const sub = v(s.additionalProperties, x[k], [...ruta, k]);
              if (s.additionalProperties === false) err("additionalProperties", `la propiedad "${k}" no está permitida`, [...ruta, k]);
              else e.push(...sub);
            }
            if ("propertyNames" in s && v(s.propertyNames, k, []).length) err("propertyNames", `el nombre de propiedad "${k}" no es válido`);
          }
        }

        if ("allOf" in s) s.allOf.forEach((sub) => e.push(...v(sub, x, ruta)));
        if ("anyOf" in s && !s.anyOf.some((sub) => v(sub, x, ruta).length === 0)) err("anyOf", "no cumple ninguna de las opciones de anyOf");
        if ("oneOf" in s) {
          const n = s.oneOf.filter((sub) => v(sub, x, ruta).length === 0).length;
          if (n !== 1) err("oneOf", n === 0 ? "no cumple ninguna de las opciones de oneOf" : `cumple ${n} opciones de oneOf y tiene que cumplir exactamente una`);
        }
        if ("not" in s && v(s.not, x, ruta).length === 0) err("not", "cumple un esquema que tiene que no cumplir");
        if ("if" in s) {
          const ok = v(s.if, x, ruta).length === 0;
          if (ok && "then" in s) e.push(...v(s.then, x, ruta));
          if (!ok && "else" in s) e.push(...v(s.else, x, ruta));
        }
      } finally {
        profundidad--;
      }
      return e;
    }

    return v(esquema, dato, []);
  }

  // ¿El esquema usa solo palabras clave soportadas y referencias internas? (lo usan los tests)
  function soportado(esquema) {
    let ok = true;
    (function recorrer(s, enValor) {
      if (!ok || s === null || typeof s !== "object") return;
      if (Array.isArray(s)) { s.forEach((x) => recorrer(x, enValor)); return; }
      for (const [k, val] of Object.entries(s)) {
        if (enValor) { recorrer(val, false); continue; }
        if (NO_SOPORTADAS.has(k) || (k.startsWith("$") && !SOPORTADAS.has(k))) { ok = false; return; }
        if (k === "$ref" && !(val === "#" || String(val).startsWith("#/"))) { ok = false; return; }
        if (k === "$id" && s !== esquema) { ok = false; return; }
        if (k === "enum" || k === "const" || k === "default" || k === "examples") continue;
        recorrer(val, k === "properties" || k === "patternProperties" || k === "$defs" || k === "dependentRequired");
      }
    })(esquema, false);
    return ok;
  }

  return { validar, soportado, iguales, fechaHora, SOPORTADAS };
})();

if (typeof module !== "undefined") module.exports = Esquema;
