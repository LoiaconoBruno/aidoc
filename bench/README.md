# Comparativa: aidoc, Docling y MarkItDown

Convierte 5 documentos reales con las tres herramientas y mide tokens, tiempo y calidad. Los resultados están en [`resultados.md`](resultados.md) (tablas) y [`resultados.json`](resultados.json) (datos), y las salidas de cada herramienta en [`salidas/`](salidas/), para revisarlas a mano.

## Cómo correrla

Hace falta Python 3.13, [uv](https://docs.astral.sh/uv/) y Node 22. Desde la raíz del proyecto:

```bash
uv venv bench/.venv --python 3.13
```

```bash
VIRTUAL_ENV=bench/.venv uv pip install -r bench/requirements.txt
```

```bash
bench/.venv/bin/python bench/correr.py
```

Docling instala PyTorch (el entorno ocupa alrededor de 1,2 GB). Con `--claude` y la variable `ANTHROPIC_API_KEY`, los tokens también se cuentan con el endpoint `count_tokens` de la API de Anthropic (gratuito) para `claude-opus-5-5`. Los números publicados se midieron sin esa opción.

## Qué se mide

**Tokens.** Del archivo original y de la salida de cada herramienta, con el tokenizador `o200k_base` de tiktoken. Es un tokenizador real y público, pero es el de los modelos de OpenAI: sirve para comparar las tres herramientas entre sí, no para saber cuánto cuesta un documento en Claude. Para eso está la opción `--claude`.

**Tiempo.** Mediana de 5 conversiones después de una de calentamiento. No cuenta el arranque: importar Docling y crear su conversor tarda segundos, y se informa aparte. aidoc corre en Node y las otras dos en Python, así que el tiempo compara herramientas, no lenguajes.

**Calidad.** Se arma una referencia a partir del original y se mide cuánto llega a la salida:

- **Contenido:** la parte de la página que es el documento, elegida a mano para cada uno con un selector CSS (columna `contenido` de [`documentos.json`](documentos.json)), sin `script`, `style`, `noscript` ni `template`. En el RFC y en el Markdown, el documento entero.
- **Títulos:** de los títulos del contenido (`h1` a `h6`, o los `span.h1`… del RFC), cuántos aparecen como título de Markdown (`#`) en la salida. Se comparan en minúsculas, sin signos de Markdown, y alcanza con que el título original esté incluido en la línea de la salida.
- **Tablas:** de las tablas del contenido (sin contar las anidadas), cuántas aparecen como tabla de Markdown. Una tabla cuenta si alguna fila de tabla de la salida contiene su primera celda no vacía.
- **Enlaces:** de los destinos de los enlaces del contenido (sin anclas internas `#…`, `javascript:` ni `mailto:`), cuántos aparecen en la salida. Los destinos se comparan resueltos contra la URL de la página y decodificados, para que `./rfc4627` y `rfc4627`, o `Vehículo` y `Veh%C3%ADculo`, cuenten como el mismo enlace.
- **Palabras del contenido:** de las palabras distintas de 4 letras o más del contenido, qué porcentaje aparece en la salida.
- **Ruido que se cuela:** de las palabras que aparecen en la página fuera del contenido (menús, barras laterales, pies) y nunca dentro, qué porcentaje aparece en la salida. Cuanto más bajo, mejor. No se mide en el RFC ni en el Markdown, que no tienen nada alrededor.

## Cómo leer los resultados

- **Tokens:** aidoc y Docling quedan parejos en Wikipedia y en Python. En MDN, aidoc deja bastante menos porque lee solo el `<main>` de la página. En el RFC, MarkItDown deja menos tokens que las otras dos, pero pierde casi la mitad de los enlaces, que en ese HTML están dentro de un `<pre>`.
- **Títulos:** ninguna herramienta reconoce los títulos del RFC, que están marcados como `<span class="h2">` y no como `<h2>`. Por eso las tres quedan en 80 %.
- **Palabras del contenido:** las tres conservan todo el texto. La medida no distingue entre herramientas, pero confirma que ninguna pierde contenido.
- **Ruido:** aidoc deja pasar el 100 % en la página de Python, que no marca su contenido con `<main>` ni `<article>`: sin esa marca, aidoc no tiene cómo separar la barra lateral.
- **Tiempo:** aidoc es el más rápido, pero hace menos. No analiza la disposición visual de la página, no tiene modelos y solo lee HTML y Markdown.

## Límites de la comparativa

- Son 5 documentos, elegidos para cubrir casos distintos (artículo, referencia técnica, tutorial, HTML heredado y Markdown), no una muestra representativa de la web.
- La referencia de cada documento la definí yo, con un selector por documento. Otra persona podría elegir otro contenido.
- La calidad mide estructura y presencia de texto, no si un modelo responde mejor con una salida que con otra. Eso queda para una evaluación con preguntas y respuestas.
- El arreglo de los títulos de tabla (`caption`) en aidoc salió de esta comparativa: antes, aidoc perdía 2 de las 3 tablas de Wikipedia.

## Documentos y licencias

Cada documento conserva su licencia y se guarda sin modificaciones, tal como se descargó el 10 de noviembre de 2026.

| Archivo | Fuente | Licencia |
|---|---|---|
| `docs/wikipedia-codigo-qr.html` | [Código QR, Wikipedia en español](https://es.wikipedia.org/wiki/C%C3%B3digo_QR), autores de Wikipedia | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| `docs/mdn-table.html` | [`<table>`: The Table element, MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/table), Mozilla y colaboradores | [CC BY-SA 2.5](https://creativecommons.org/licenses/by-sa/2.5/) |
| `docs/python-estructuras.html` | [5. Data Structures, tutorial de Python](https://docs.python.org/3/tutorial/datastructures.html), Python Software Foundation | [Licencia de la documentación de Python](https://docs.python.org/3/license.html) |
| `docs/rfc8259.html` | [RFC 8259](https://www.rfc-editor.org/rfc/rfc8259.html), T. Bray (ed.), IETF, 2017 | [IETF Trust Legal Provisions](https://trustee.ietf.org/documents/trust-legal-provisions/) |
| `docs/markitdown-readme.md` | [README de MarkItDown](https://github.com/microsoft/markitdown/blob/ed178952a6672abdfd35b5f9e76a80b6cefc086e/README.md), Microsoft | [MIT](https://github.com/microsoft/markitdown/blob/ed178952a6672abdfd35b5f9e76a80b6cefc086e/LICENSE) |

Las salidas de [`salidas/`](salidas/) son conversiones de esos documentos y quedan bajo la misma licencia que cada original.
