#!/usr/bin/env python3
"""Comparativa de conversores a Markdown para IAs: aidoc, Docling y MarkItDown.

Convierte los 5 documentos de bench/documentos.json con cada herramienta y mide:

- tokens: del original y de cada salida, con el tokenizador o200k_base (tiktoken).
  Con --claude y la variable ANTHROPIC_API_KEY, también con el conteo de la API
  de Anthropic (claude-opus-5-5), que es gratuito.
- tiempo: mediana de 5 conversiones después de una de calentamiento, sin contar
  el arranque del programa ni la carga de modelos.
- calidad: cuánto de la estructura y del contenido del original llega a la salida
  (títulos, tablas, enlaces, palabras) y cuánto ruido de la página se cuela.
  Las definiciones exactas están en bench/README.md.

Uso, desde la raíz del proyecto:
    uv venv bench/.venv && VIRTUAL_ENV=bench/.venv uv pip install -r bench/requirements.txt
    bench/.venv/bin/python bench/correr.py [--claude]

Escribe bench/salidas/*.md, bench/resultados.json y bench/resultados.md, y
actualiza la tabla del README entre las marcas <!-- bench:inicio --> y <!-- bench:fin -->.
"""
import json
import os
import platform
import re
import statistics
import subprocess
import sys
import time
import unicodedata
from importlib.metadata import version
from pathlib import Path
from urllib.parse import unquote, urljoin

import tiktoken
from bs4 import BeautifulSoup

BENCH = Path(__file__).resolve().parent
RAIZ = BENCH.parent
REPETICIONES = 5
ENC = tiktoken.get_encoding("o200k_base")
HERRAMIENTAS = ["aidoc", "Docling", "MarkItDown"]
MODELO_CLAUDE = "claude-opus-5-5"


def tokens(texto):
    return len(ENC.encode(texto, disallowed_special=()))


def normalizar(s):
    s = unicodedata.normalize("NFKC", s).lower()
    s = re.sub(r"[*_`#\[\]()!|>~\\¶]", " ", s)
    return re.sub(r"\s+", " ", s).strip()


PALABRA = re.compile(r"[^\W\d_]{4,}")


def palabras(texto):
    """Palabras distintas de 4 letras o más, sin distinguir mayúsculas."""
    return set(PALABRA.findall(unicodedata.normalize("NFKC", texto).lower()))


def sin_codigo(md):
    """Quita los bloques de código cercados, para no confundir comentarios con títulos."""
    return re.sub(r"^(```|~~~).*?^\1\s*$", "", md, flags=re.M | re.S)


def titulos_md(md):
    return [m.group(1).strip() for m in re.finditer(r"^#{1,6}\s+(.+?)\s*#*\s*$", sin_codigo(md), re.M)]


def tablas_md(md):
    """Primera celda no vacía de cada tabla Markdown (fila de encabezado + separador)."""
    lineas = md.splitlines()
    primeras = []
    for i in range(len(lineas) - 1):
        if lineas[i].lstrip().startswith("|") and re.match(r"^\s*\|?\s*:?-{3,}", lineas[i + 1]):
            celdas = [c.strip() for c in lineas[i].strip().strip("|").split("|")]
            primera = next((c for c in celdas if len(normalizar(c)) >= 2), None)
            if primera:
                primeras.append(primera)
    return primeras


def destino(base, url):
    """Una URL resuelta contra la página y decodificada: dos formas de escribir el mismo enlace dan lo mismo."""
    return unquote(urljoin(base, url.strip())).rstrip("/")


def enlaces_md(md, base):
    """Destinos de los enlaces e imágenes de un Markdown, más las URLs sueltas."""
    # El destino puede tener paréntesis balanceados, como .../El_País_(Uruguay).
    urls = re.findall(r"\]\(\s*<?((?:[^()\s<>]|\([^()\s]*\))+)>?(?:\s+\"[^\"]*\")?\s*\)", md)
    urls += re.findall(r"<(https?://[^>\s]+)>", md)
    urls += re.findall(r"https?://[^\s)\]>\"'`|]+", md)
    return {destino(base, u) for u in urls}


def referencia(doc, crudo):
    """Lo que el original contiene y una buena conversión tendría que conservar."""
    if doc["archivo"].endswith(".md"):
        enlaces = {u for u in re.findall(r"\]\((https?://[^)\s]+)", crudo)}
        return {"titulos": titulos_md(crudo), "tablas": tablas_md(crudo), "enlaces": enlaces,
                "palabras": palabras(crudo), "ruido": None}
    sopa = BeautifulSoup(crudo, "html.parser")
    for t in sopa(["script", "style", "noscript", "template"]):
        t.decompose()
    principal = sopa.select_one(doc["contenido"]) if doc["contenido"] else sopa
    titulos = [t.get_text(" ", strip=True) for t in principal.select(doc["titulos"])]
    tablas = []
    for tabla in principal.find_all("table"):
        if tabla.find_parent("table"):
            continue
        celdas = [c.get_text(" ", strip=True) for c in tabla.find_all(["th", "td"])]
        primera = next((c for c in celdas if len(normalizar(c)) >= 2), None)
        if primera:
            tablas.append(primera)
    enlaces = set()
    for a in principal.find_all("a", href=True):
        h = a["href"].strip()
        if h and not h.startswith(("#", "javascript:", "mailto:")):
            enlaces.add(h)
    texto = principal.get_text(" ", strip=True)
    ruido = None
    if doc["contenido"]:
        principal.extract()
        ruido = palabras(sopa.get_text(" ", strip=True)) - palabras(texto)
    return {"titulos": titulos, "tablas": tablas, "enlaces": enlaces, "palabras": palabras(texto), "ruido": ruido}


def calidad(doc, ref, salida):
    lineas_titulo = [normalizar(t) for t in titulos_md(salida)]
    destinos = enlaces_md(salida, doc["url"])
    titulos = [t for t in ref["titulos"] if len(normalizar(t)) >= 2]
    filas = [normalizar(l) for l in salida.splitlines() if l.lstrip().startswith("|")]
    return {
        "titulos": [sum(1 for t in titulos if any(normalizar(t) in l for l in lineas_titulo)), len(titulos)],
        "tablas": [sum(1 for c in ref["tablas"] if any(normalizar(c) in f for f in filas)), len(ref["tablas"])],
        "enlaces": [sum(1 for h in ref["enlaces"] if destino(doc["url"], h) in destinos), len(ref["enlaces"])],
        "cobertura": len(ref["palabras"] & palabras(salida)) / len(ref["palabras"]),
        "ruido": (len(ref["ruido"] & palabras(salida)) / len(ref["ruido"])) if ref["ruido"] else None,
    }


def medir(convertir, ruta):
    convertir(ruta)   # calentamiento
    tiempos, salida = [], ""
    for _ in range(REPETICIONES):
        t0 = time.perf_counter()
        salida = convertir(ruta)
        tiempos.append((time.perf_counter() - t0) * 1000)
    return salida, tiempos


def con_aidoc(ruta):
    r = subprocess.run(["node", str(BENCH / "aidoc.js"), str(ruta), str(REPETICIONES)], capture_output=True, text=True, check=True)
    datos = json.loads(r.stdout)
    if not datos["valido"]:
        raise RuntimeError(f"aidoc generó un paquete inválido para {ruta}")
    return datos["texto"], datos["ms"]


def main():
    claude = "--claude" in sys.argv
    if claude and not os.environ.get("ANTHROPIC_API_KEY"):
        sys.exit("--claude necesita la variable ANTHROPIC_API_KEY")
    cliente = None
    if claude:
        from anthropic import Anthropic
        cliente = Anthropic()

    def tokens_claude(texto):
        r = cliente.messages.count_tokens(model=MODELO_CLAUDE, messages=[{"role": "user", "content": texto}])
        return r.input_tokens

    t0 = time.perf_counter()
    from docling.document_converter import DocumentConverter
    docling = DocumentConverter()
    arranque_docling = (time.perf_counter() - t0) * 1000
    t0 = time.perf_counter()
    from markitdown import MarkItDown
    markitdown = MarkItDown()
    arranque_markitdown = (time.perf_counter() - t0) * 1000

    convertidores = {
        "Docling": lambda ruta: docling.convert(str(ruta)).document.export_to_markdown(),
        "MarkItDown": lambda ruta: markitdown.convert(str(ruta)).text_content,
    }

    documentos = json.loads((BENCH / "documentos.json").read_text(encoding="utf-8"))
    (BENCH / "salidas").mkdir(exist_ok=True)
    filas = []
    for doc in documentos:
        ruta = BENCH / doc["archivo"]
        crudo = ruta.read_text(encoding="utf-8")
        ref = referencia(doc, crudo)
        fila = {"id": doc["id"], "titulo": doc["titulo"], "caracteres": len(crudo), "tokensOriginal": tokens(crudo), "herramientas": {},
                "referencia": {"titulos": len(ref["titulos"]), "tablas": len(ref["tablas"]), "enlaces": len(ref["enlaces"]),
                               "palabras": len(ref["palabras"]), "ruido": len(ref["ruido"]) if ref["ruido"] is not None else None}}
        if claude:
            fila["tokensOriginalClaude"] = tokens_claude(crudo)
        for nombre in HERRAMIENTAS:
            if nombre == "aidoc":
                salida, tiempos = con_aidoc(ruta)
            else:
                salida, tiempos = medir(convertidores[nombre], ruta)
            (BENCH / "salidas" / f"{doc['id']}.{nombre.lower()}.md").write_text(salida, encoding="utf-8")
            h = {"tokens": tokens(salida), "caracteres": len(salida), "ms": statistics.median(tiempos),
                 "calidad": calidad(doc, ref, salida)}
            if claude:
                h["tokensClaude"] = tokens_claude(salida)
            fila["herramientas"][nombre] = h
            print(f"{doc['id']:22} {nombre:10} {h['tokens']:7} tokens {h['ms']:9.1f} ms", file=sys.stderr)
        filas.append(fila)

    node = subprocess.run(["node", "--version"], capture_output=True, text=True).stdout.strip()
    resultado = {
        "fecha": time.strftime("%Y-%m-%d"),
        "equipo": (f"macOS (Darwin {platform.release()}), {platform.machine()}" if platform.system() == "Darwin"
                   else f"{platform.system()} {platform.release()}, {platform.machine()}"),
        "versiones": {"aidoc": json.loads((RAIZ / "package.json").read_text())["version"], "docling": version("docling"),
                      "markitdown": version("markitdown"), "tiktoken": version("tiktoken"), "python": platform.python_version(), "node": node},
        "tokenizador": "o200k_base (tiktoken)",
        "claude": MODELO_CLAUDE if claude else None,
        "repeticiones": REPETICIONES,
        "arranqueMs": {"Docling": arranque_docling, "MarkItDown": arranque_markitdown},
        "documentos": filas,
    }
    (BENCH / "resultados.json").write_text(json.dumps(resultado, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    tabla = informe(resultado)
    (BENCH / "resultados.md").write_text(tabla, encoding="utf-8")
    readme = RAIZ / "README.md"
    texto = readme.read_text(encoding="utf-8")
    marcas = re.compile(r"(<!-- bench:inicio -->\n).*?(<!-- bench:fin -->)", re.S)
    if marcas.search(texto):
        readme.write_text(marcas.sub(lambda m: m.group(1) + resumen(resultado) + m.group(2), texto), encoding="utf-8")
    print(tabla)


def pct(a, b):
    return f"{round(100 * a / b)} %" if b else "—"


def frac(par):
    return f"{par[0]}/{par[1]}" if par[1] else "—"


def miles(n):
    return f"{n:,}".replace(",", ".")


def ms(x):
    """Milisegundos con coma decimal: 7,6 ms; 120 ms."""
    return (f"{x:.0f}" if x >= 10 else f"{x:.1f}".replace(".", ",")) + " ms"


def resumen(r):
    """Las tablas que van en el README."""
    claude = r["claude"]
    lineas = ["| Documento | Original | aidoc | Docling | MarkItDown |", "|---|---:|---:|---:|---:|"]
    for d in r["documentos"]:
        h = d["herramientas"]
        celdas = [f"{miles(h[n]['tokens'])} ({pct(h[n]['tokens'], d['tokensOriginal'])})" for n in HERRAMIENTAS]
        lineas.append(f"| {d['titulo']} | {miles(d['tokensOriginal'])} | " + " | ".join(celdas) + " |")
    tok = "\n".join(lineas)

    lineas = ["| Documento | aidoc | Docling | MarkItDown |", "|---|---:|---:|---:|"]
    for d in r["documentos"]:
        h = d["herramientas"]
        lineas.append(f"| {d['titulo']} | " + " | ".join(ms(h[n]["ms"]) for n in HERRAMIENTAS) + " |")
    tiempo = "\n".join(lineas)

    lineas = ["| Herramienta | Títulos | Tablas | Enlaces | Palabras del contenido | Ruido que se cuela |", "|---|---:|---:|---:|---:|---:|"]
    for n in HERRAMIENTAS:
        sumas = {k: [0, 0] for k in ("titulos", "tablas", "enlaces")}
        cob, ruido = [], []
        for d in r["documentos"]:
            c = d["herramientas"][n]["calidad"]
            for k in sumas:
                sumas[k][0] += c[k][0]
                sumas[k][1] += c[k][1]
            cob.append(c["cobertura"])
            if c["ruido"] is not None:
                ruido.append(c["ruido"])
        lineas.append(f"| {n} | " + " | ".join(pct(*sumas[k]) for k in ("titulos", "tablas", "enlaces"))
                      + f" | {round(100 * statistics.mean(cob))} % | {round(100 * statistics.mean(ruido))} % |")
    cal = "\n".join(lineas)
    v = r["versiones"]
    nota = (f"Medido el {r['fecha']} en {r['equipo']}, con aidoc {v['aidoc']}, Docling {v['docling']} y MarkItDown {v['markitdown']}. "
            f"Tokens con {r['tokenizador']}" + (f" y con {claude}" if claude else "") + f"; tiempo: mediana de {r['repeticiones']} conversiones.")
    return (f"**Tokens de la salida** (entre paréntesis, respecto del original):\n\n{tok}\n\n"
            f"**Tiempo de conversión**, sin contar el arranque:\n\n{tiempo}\n\n"
            f"**Calidad**, sumando los 5 documentos (palabras y ruido: promedio):\n\n{cal}\n\n{nota}\n")


def informe(r):
    partes = ["# Resultados de la comparativa\n", resumen(r), "\n## Detalle por documento\n"]
    for d in r["documentos"]:
        rf = d["referencia"]
        ruido_ref = f"{rf['ruido']} palabras que solo aparecen fuera del contenido" if rf["ruido"] is not None else "sin ruido que medir"
        partes.append(f"\n### {d['titulo']}\n\n{miles(d['caracteres'])} caracteres, {miles(d['tokensOriginal'])} tokens en el original. "
                      f"Referencia: {rf['titulos']} títulos, {rf['tablas']} tablas, {rf['enlaces']} enlaces, {rf['palabras']} palabras distintas del contenido; {ruido_ref}.\n")
        partes.append("\n| Herramienta | Tokens | Caracteres | Tiempo | Títulos | Tablas | Enlaces | Palabras | Ruido |\n|---|---:|---:|---:|---:|---:|---:|---:|---:|")
        for n in HERRAMIENTAS:
            h = d["herramientas"][n]
            c = h["calidad"]
            ruido = f"{round(100 * c['ruido'])} %" if c["ruido"] is not None else "—"
            partes.append(f"| {n} | {miles(h['tokens'])} | {miles(h['caracteres'])} | {ms(h['ms'])} | {frac(c['titulos'])} | {frac(c['tablas'])} | "
                          f"{frac(c['enlaces'])} | {round(100 * c['cobertura'])} % | {ruido} |")
        partes.append("")
    a = r["arranqueMs"]
    partes.append(f"\nArranque (importar y crear el conversor, una vez): Docling {miles(round(a['Docling']))} ms, MarkItDown {miles(round(a['MarkItDown']))} ms. "
                  "En aidoc el tiempo se mide dentro de Node, también sin contar el arranque.\n")
    return "\n".join(partes)


if __name__ == "__main__":
    main()
