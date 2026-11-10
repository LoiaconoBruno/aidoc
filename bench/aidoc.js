// Convierte un archivo con aidoc y mide el tiempo de conversión (sin contar el arranque de Node).
// Uso: node bench/aidoc.js <archivo> [repeticiones]
// Salida (JSON): { texto, ms: [tiempos], valido, fragmentos }
const fs = require("node:fs");
const path = require("node:path");
const { performance } = require("node:perf_hooks");
const Aidoc = require("../src/aidoc.js");

const [, , archivo, rep = "5"] = process.argv;
const contenido = fs.readFileSync(archivo, "utf8");
const tipo = /\.md$/i.test(archivo) ? "text/markdown" : "text/html";
const opciones = { tipo, fuente: path.basename(archivo), creado: "2026-11-10T00:00:00Z" };

Aidoc.convertir(contenido, opciones);   // una vuelta de calentamiento
const ms = [];
let paquete;
for (let i = 0; i < Number(rep); i++) {
  const t0 = performance.now();
  paquete = Aidoc.convertir(contenido, opciones);
  ms.push(performance.now() - t0);
}
process.stdout.write(JSON.stringify({ texto: paquete.texto, ms, valido: Aidoc.validar(paquete).length === 0, fragmentos: paquete.fragmentos.length }));
