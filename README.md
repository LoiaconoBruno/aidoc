# aidoc: estructura para IAs

Conversor y especificación v0.1 de un **paquete "pre-digerido" para IAs**, para la idea "lenguaje de estructuración nativo para IAs". La propuesta: *digerir una vez, usar muchas veces*. Quien produce un documento genera también una versión estructurada para máquinas, y cualquier IA la usa sin repetir el trabajo de extraer todo.

La página convierte HTML, Markdown o texto en un paquete `.aidoc.json` con:

- **texto canónico** en Markdown, sin menús, scripts ni estilos;
- **metadatos**: título, idioma, fuente, tipo original, fecha y huella SHA-256 del original;
- **secciones** con su ruta de títulos y su posición en el texto;
- **fragmentos** listos para búsqueda, cortados entre párrafos, cada uno con su huella SHA-256 y sus tokens estimados;
- **tablas** (encabezados y filas), **enlaces** e **imágenes**, con lugar reservado para su descripción y su texto detectado;
- una **medición**: tokens del original contra los del texto canónico.

También **valida** un `.aidoc.json`: revisa la forma y que cada fragmento coincida con el texto y con su huella.

## Por qué

Leer un formato es barato; lo caro es **interpretarlo**. El estándar tiene que guardar esa interpretación, no los datos crudos. Este es el conversor de referencia y el borrador de la especificación que la idea pedía como primer paso, con la medición de tokens "crudo contra convertido".

## Instalación

No hace falta instalar nada. Es una página estática sin dependencias. Para correr los tests hace falta Node 18 o más nuevo.

## Uso

Abrí `index.html` con doble clic. Todo se procesa en el navegador.

Ejemplo:

1. Apretá **Cargar ejemplo**: es una página HTML sobre el efecto Janssen con todo el ruido típico de la web (menú, banner, scripts de analítica, estilos y pie).
2. La medición muestra **493 tokens** en el original y **183** en el texto canónico: **63 %** de ahorro. Tipo detectado: `text/html`; idioma: `es`.
3. En **Estructura** aparecen 3 secciones (`# El efecto Janssen en silos`, `## Cómo se calcula`, `## Valores típicos`), una tabla con encabezados Material · Densidad (kg/m³) · μ, una imagen y un enlace.
4. En **Fragmentos** hay 3, cada uno con su ruta de títulos, tokens y huella SHA-256.
5. **Descargar .aidoc.json** guarda el paquete. **Elegir archivo .aidoc.json** lo valida: si alguien altera un fragmento, la validación avisa que no coincide con el texto ni con su huella.

También podés pegar contenido propio o abrir un `.html`, `.md` o `.txt`.

## Cómo funciona

- **HTML → Markdown** sin DOM, con un tokenizador propio: títulos, párrafos, listas (con anidación), énfasis, código, citas, tablas, imágenes y enlaces. Descarta `script`, `style`, `nav`, `form` y similares. Si la página marca su contenido con `<main>` o `<article>`, usa solo eso ("modo lectura").
- **Secciones:** cada título de Markdown abre una sección que llega hasta el título siguiente. Lo que hay antes del primer título es la sección `(inicio)`.
- **Fragmentos:** se cortan dentro de cada sección, hasta el máximo de caracteres, preferentemente entre párrafos.
- **SHA-256** implementado en JavaScript (sin depender de `crypto.subtle`), verificado contra los vectores de prueba estándar.
- **Tokens:** estimación gruesa de 1 token ≈ 4 caracteres; sirve para comparar, no para facturar.

La especificación formal es [`spec/aidoc-0.1.schema.json`](spec/aidoc-0.1.schema.json) (JSON Schema 2020-12). La lógica está en `src/markdown.js` y `src/aidoc.js`, sin DOM, y se testea con:

```bash
npm test
```

## Limitaciones

- Solo texto: no transcribe audio ni video, ni describe imágenes ni les hace OCR (deja los campos `descripcion` y `textoDetectado` en `null`).
- No lee PDF ni archivos de Office. Para eso existen Docling y MarkItDown: la idea es compararlos.
- El conversor de HTML es simple: páginas armadas con JavaScript, o con estructuras raras, pueden salir incompletas.
- La validación integrada revisa forma e integridad, pero no implementa JSON Schema completo.
- La estimación de tokens es aproximada y no corresponde a ningún modelo en particular.
- Embeddings: no se incluyen, porque los vectores de un modelo no le sirven a otro.

## Próximos pasos

- Probar Docling y MarkItDown con 5 archivos propios y comparar tokens, tiempo y calidad contra este conversor.
- Medir con un tokenizador real en lugar de la estimación.
- Agregar descripciones de imágenes y transcripciones con modelos, guardando qué modelo las generó.
- Escribir el resumen del paper: el problema, trabajos relacionados (llms.txt, Schema.org, Docling, MarkItDown), la especificación y la evaluación.

## Licencia

MIT
