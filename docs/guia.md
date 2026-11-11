# Documentos pre-digeridos para IAs: paper de uso y guía de la idea

## Resumen

Este documento acompaña a **aidoc**, un conversor y una especificación (versión 0.1) de un paquete "pre-digerido" para inteligencias artificiales. La idea de fondo es *digerir una vez, usar muchas veces*: quien produce un documento genera también una versión estructurada para máquinas, y cualquier IA la usa sin repetir el trabajo de extraer todo. La herramienta convierte HTML, Markdown o texto en un archivo `.aidoc.json` con texto canónico, metadatos, secciones, fragmentos con huella SHA-256, tablas, enlaces, imágenes y una medición de tokens. Valida paquetes contra su especificación en JSON Schema 2020-12 y, con la key de quien la usa, cuenta tokens con el tokenizador real de Claude y describe imágenes con un modelo. Una comparativa con Docling y MarkItDown en cinco documentos reales mide tokens, tiempo y calidad.

La primera parte es un paper de uso: la entrada, la medición, la vista dividida, el ejemplo del efecto Janssen resuelto con los números de la herramienta, la validación, la conexión con Claude, la comparativa y los límites. La segunda es una guía de la idea, que recorre la larga historia de separar contenido de presentación (de SGML y HTML a la web semántica de Berners-Lee, Hendler y Lassila y a Schema.org), la limpieza de páginas web (Kohlschütter y la detección de "boilerplate"), la tokenización de los modelos de lenguaje (la codificación por pares de bytes de Sennrich, Haddow y Birch), la generación aumentada por recuperación de Lewis y colaboradores y el problema de la información "perdida en el medio" de Liu y colaboradores, las funciones de hash criptográficas y el direccionamiento por contenido (Merkle, Git, IPFS), la procedencia de los datos (W3C PROV, Dublin Core, OAIS) y las propuestas contemporáneas más cercanas: llms.txt de Jeremy Howard, Docling de IBM y MarkItDown de Microsoft. La tesis es que **leer un formato es barato; lo caro es interpretarlo**, y que un estándar útil tiene que guardar esa interpretación, no los datos crudos.

## Parte I. Paper de uso

### 1. Qué es la herramienta

aidoc es una página estática sin dependencias. Se abre desde la [demo en vivo](https://loiaconobruno.github.io/aidoc/) o con doble clic en `index.html`. Todo se procesa en el navegador: el contenido no sale de la computadora, salvo lo que se mande a Claude con una key propia.

La página tiene cuatro zonas:

1. **Entrada:** una zona para soltar un archivo `.html`, `.md` o `.txt` (o un `.aidoc.json` para validarlo), con los botones "Elegir archivo", "Pegar contenido" y "Cargar ejemplo". En "Opciones de conversión" están el tipo de entrada (se detecta solo) y el tamaño máximo de cada fragmento (200 a 3000 caracteres, 1200 por defecto).
2. **Medición:** los tokens del original ("Antes: lo que leía la IA") y del texto canónico ("Después: el texto limpio"), en números grandes, y el ahorro ("Menos para leer"). Debajo, el método de conteo (estimación o conteo real con Claude), una ayuda plegable "¿Qué es un token?", un resumen de lo que tiene el paquete, el botón "Descargar el paquete (.aidoc.json)" y una marca que dice si el paquete cumple la especificación.
3. **Vista dividida:** el original a la izquierda y el paquete a la derecha, en cinco pestañas: Texto, Estructura, Fragmentos, Imágenes y JSON. En el celular, un selector muestra uno u otro.
4. **Opcional: conectar con Claude:** un panel cerrado que se abre con un clic. La key de la API de Anthropic y el modelo.

La lógica está en archivos sin acceso al DOM:

- `src/markdown.js`: el paso de HTML a Markdown.
- `src/aidoc.js`: el paquete.
- `src/esquema.js`: el validador de JSON Schema.
- `src/claude.js`: las llamadas a la API.

La especificación formal está en `spec/aidoc-0.1.schema.json`. Los 25 tests se corren con `npm test`, con Node 22.

La interfaz usa el sistema de diseño común del portafolio: los mismos colores, tipografía, botones y modo oscuro que las otras herramientas.

### 2. Instalación

```bash
git clone https://github.com/LoiaconoBruno/aidoc.git
cd aidoc
npm test
```

Después se abre `index.html` con doble clic. La comparativa necesita Python y se instala aparte (sección 6).

### 3. Qué contiene un paquete `.aidoc.json`

| Campo | Contenido |
|---|---|
| `aidoc` | Versión de la especificación ("0.1") |
| `metadatos` | Título, idioma, fuente, tipo original, fecha de creación, huella SHA-256 del original y cantidad de caracteres del original |
| `texto` | El texto canónico en Markdown |
| `secciones` | Cada sección con su id, nivel, título, ruta de títulos y posición (inicio, fin) en el texto |
| `fragmentos` | Pedazos del texto listos para búsqueda, con id, sección, ruta, posición, texto, huella SHA-256 y tokens estimados |
| `tablas` | Encabezados y filas de cada tabla |
| `enlaces` | Texto y URL de cada enlace |
| `imagenes` | Texto alternativo y origen; `descripcion` y `textoDetectado`, que completa un modelo si se le pide, y `descripcionModelo`, el modelo que lo hizo (o `null`) |
| `medicion` | Método de conteo, tokens del original, tokens del texto, ahorro y, si el conteo es real, el modelo cuyo tokenizador se usó |

Los campos `descripcionModelo` y `medicion.modelo` se sumaron a la especificación 0.1 como opcionales: un paquete que no los tiene sigue siendo válido.

### 4. Ejemplo resuelto

1. **Cargar ejemplo.** Es una página HTML sobre el efecto Janssen con todo el ruido típico de la web: menú de navegación, un banner, scripts de analítica, estilos y pie de página. Tiene 1972 caracteres.
2. **Medición.** **493 tokens** en el original y **183** en el texto canónico: **63 %** de ahorro, con la estimación de 1 token cada 4 caracteres. Tipo detectado: `text/html`; idioma: `es`. Al lado de "Descargar el paquete (.aidoc.json)" aparece "✓ Cumple aidoc 0.1".
3. **Texto canónico.** En la vista dividida, a la izquierda queda el HTML y a la derecha el texto, que empieza así:

```
# El efecto Janssen en silos

En un tubo lleno de grano, las paredes sostienen parte del peso por **rozamiento**. Por eso la presión en el fondo deja de crecer: es el *efecto Janssen*, descripto en 1895.

## Cómo se calcula
...
```

El menú, el banner, los scripts y el pie desaparecieron. El énfasis (negrita, cursiva), los títulos, la fórmula en un bloque de código y la lista se conservan en Markdown.

4. **Estructura.** Tres secciones. Tocar "Cómo se calcula" lleva a la pestaña Texto con esa sección marcada:

| Id | Nivel | Título | Ruta | Posición |
|---|---|---|---|---|
| s1 | 1 | El efecto Janssen en silos | El efecto Janssen en silos | 0–205 |
| s2 | 2 | Cómo se calcula | El efecto Janssen en silos › Cómo se calcula | 205–464 |
| s3 | 2 | Valores típicos | El efecto Janssen en silos › Valores típicos | 464–729 |

Hay además una tabla con encabezados Material · Densidad (kg/m³) · μ y dos filas (Arroz, 800, 0,4; Trigo, 780, 0,35), una imagen con texto alternativo "Corte de un silo con las fuerzas sobre las paredes" y un enlace a la Wikipedia.

5. **Fragmentos.** Tres, uno por sección (ninguna supera los 1200 caracteres). El primero va de la posición 0 a la 203, con la ruta `["El efecto Janssen en silos"]` y una huella `sha256:d93da4…`. Tocar un fragmento lo marca en el texto.
6. **Descargar y validar.** "Descargar el paquete (.aidoc.json)" guarda el paquete. Soltar ese archivo en la zona de entrada lo valida. Si alguien cambia "1895" por "1985" en un fragmento, la validación dice `f1: no coincide con el texto canónico en [0, 203)` y `f1: la huella no coincide`. Si alguien escribe la fecha como "10/11/2026", dice `/metadatos/creado: no es una fecha y hora RFC 3339 válida`.

### 5. Validación y conexión con Claude

#### 5.1 Qué valida

La validación tiene dos capas. La primera es el **esquema**: un validador propio de JSON Schema 2020-12 (`src/esquema.js`, sin dependencias) revisa el paquete contra `spec/aidoc-0.1.schema.json`. Comprueba los campos obligatorios, los tipos, los valores permitidos, los patrones de las huellas y los rangos de los niveles. También exige que `creado` sea una fecha y hora RFC 3339; JSON Schema 2020-12 trata `format` como una anotación, y exigirlo es una opción que aidoc activa.

El validador pasa los 970 casos del JSON-Schema-Test-Suite oficial que usan las palabras clave que implementa. Deja de lado 42 casos que necesitan `unevaluatedProperties`, `unevaluatedItems`, `$anchor`, `$dynamicRef`, identificadores internos o referencias a otros documentos. Si un esquema usa algo de eso, el validador lo dice en vez de validar a medias. La especificación de aidoc no lo usa.

La segunda capa es la **integridad**, que un esquema no puede expresar: que cada fragmento sea exactamente su parte del texto y tenga la huella correcta, que caiga dentro de su sección, que los rangos de las secciones caigan dentro del texto y que no haya identificadores repetidos. Cada problema se informa con su ruta, como `/fragmentos/0/hash: no cumple el patrón`.

#### 5.2 Tokens reales

Sin key, aidoc estima 1 token cada 4 caracteres. Con una key de la API de Anthropic, "Contar con Claude" manda el original y el texto canónico al endpoint `count_tokens`, que según la documentación de Anthropic es gratuito y tiene un límite de pedidos por minuto (Anthropic, s. f.-b). El paquete pasa a decir `"metodo": "count_tokens de la API de Anthropic (claude-opus-5-5)"` y guarda el modelo en `medicion.modelo`. Cada número incluye los pocos tokens fijos del formato de un mensaje. Los fragmentos siguen con la estimación, porque contarlos uno por uno gastaría el límite.

#### 5.3 Descripción de imágenes

En la pestaña Imágenes, "Describir con Claude" le manda la imagen al modelo elegido y le pide, con salida estructurada, una descripción de 1 a 3 oraciones en el idioma del documento y el texto que se lea en la imagen. Las imágenes con URL las descarga la API. Las de ruta relativa, como el `silo.jpg` del ejemplo, se eligen desde la computadora y se achican a 1568 px de lado antes de mandarlas. El paquete guarda la descripción, el texto detectado y, en `descripcionModelo`, el modelo que efectivamente respondió.

Hay dos modelos para elegir:

| Modelo | Entrada / salida (US$ por millón de tokens) | Una imagen de 1000 × 1000 px |
|---|---|---|
| Claude Opus 5.5 | 4 / 20 | unos US$0,012 |
| Claude Haiku 5.5 | 0,10 / 0,50 | unos US$0,0003 |

Los precios son los de la página de precios de Anthropic en noviembre de 2026 (Anthropic, s. f.-a). La estimación por imagen suma los tokens visuales (⌈ancho/28⌉ × ⌈alto/28⌉ = 1296 para 1000 × 1000 px, según la documentación de visión; Anthropic, s. f.-d), unos 200 tokens de instrucción y unos 300 de respuesta. Con Opus 5.5, si los clasificadores de seguridad rechazan el pedido, la API lo reintenta en otro modelo (`fallbacks: "default"`) y el paquete guarda el que respondió.

#### 5.4 La key

La key va directo del navegador a `api.anthropic.com`, sin servidor intermedio. Se guarda en el navegador mientras dura la pestaña, o de forma permanente si se marca "Recordar la key en este navegador"; "Olvidar la key ahora" la borra. Es cómodo, pero no es para producción: cualquiera con acceso a ese navegador puede leerla. Conviene usar una key propia con límite de gasto.

### 6. Comparativa con Docling y MarkItDown

La carpeta `bench/` convierte cinco documentos reales con las tres herramientas: un artículo de Wikipedia en español, una referencia de MDN, un capítulo del tutorial de Python, un RFC en HTML heredado y un README en Markdown. Están guardados en el repositorio con su licencia. Se instala y se corre así:

```bash
uv venv bench/.venv --python 3.13
```

```bash
VIRTUAL_ENV=bench/.venv uv pip install -r bench/requirements.txt
```

```bash
bench/.venv/bin/python bench/correr.py
```

Los tokens se cuentan con `o200k_base`, el tokenizador público de tiktoken. Es el de los modelos de OpenAI, así que sirve para comparar las tres herramientas entre sí, no para calcular costos en Claude; con `--claude` y una key se cuentan también con Claude. El tiempo es la mediana de 5 conversiones, sin contar el arranque. La calidad compara la salida con una referencia armada desde el original: títulos, tablas, enlaces, palabras del contenido y ruido de la página que se cuela. Las definiciones exactas están en `bench/README.md`.

**Tokens de la salida** (entre paréntesis, respecto del original):

| Documento | Original | aidoc | Docling | MarkItDown |
|---|---:|---:|---:|---:|
| Código QR (Wikipedia en español) | 49.670 | 10.503 (21 %) | 10.472 (21 %) | 14.199 (29 %) |
| MDN: el elemento `<table>` | 69.846 | 13.550 (19 %) | 20.087 (29 %) | 22.209 (32 %) |
| 5. Data Structures (tutorial de Python) | 34.152 | 8.484 (25 %) | 8.833 (26 %) | 9.258 (27 %) |
| RFC 8259 | 10.599 | 8.393 (79 %) | 8.540 (81 %) | 7.133 (67 %) |
| README de MarkItDown (Markdown) | 4.765 | 4.761 (100 %) | 4.692 (98 %) | 4.765 (100 %) |

**Calidad**, sumando los cinco documentos:

| Herramienta | Títulos | Tablas | Enlaces | Palabras del contenido | Ruido que se cuela |
|---|---:|---:|---:|---:|---:|
| aidoc | 80 % | 100 % | 100 % | 100 % | 51 % |
| Docling | 80 % | 100 % | 93 % | 100 % | 78 % |
| MarkItDown | 80 % | 100 % | 95 % | 100 % | 100 % |

En tiempo, aidoc tarda entre 2 y 10 ms por documento; Docling, entre 41 y 198 ms; MarkItDown, entre 5 y 65 ms. Las mediciones son del 10 de noviembre de 2026, en una Mac con Apple Silicon, con aidoc 0.2.0, Docling 2.150.0 y MarkItDown 0.1.9.

Cómo leerlo:

- **Tokens:** aidoc y Docling quedan parejos en Wikipedia y en Python. En MDN, aidoc deja bastante menos porque lee solo el `<main>` de la página. En el RFC, MarkItDown deja menos tokens, pero pierde casi la mitad de los enlaces, que ahí están dentro de un `<pre>`.
- **Títulos:** ninguna reconoce los del RFC, que están marcados como `<span class="h2">` y no como `<h2>`.
- **Palabras del contenido:** las tres conservan todo el texto, así que la medida no las distingue.
- **Ruido:** aidoc deja pasar todo el ruido en la página de Python, que no marca su contenido con `<main>` ni `<article>`.
- **Tiempo:** aidoc es el más rápido, pero hace menos: no analiza la disposición visual de la página ni lee PDF.

La comparativa sirvió también para encontrar un error: aidoc pegaba el título de una tabla (`<caption>`) a la primera fila y la tabla Markdown quedaba rota. Perdía así 2 de las 3 tablas de Wikipedia. Ya está corregido y tiene un test.

### 7. Cómo leer los resultados

- **El ahorro** mide cuánto ruido se sacó. En páginas web reales, con publicidad, menús y scripts, suele ser mucho mayor que en el ejemplo: en la comparativa, el texto canónico de Wikipedia y de MDN ocupa alrededor de un quinto del original. En un Markdown limpio, el ahorro es casi cero.
- **Los fragmentos** son las unidades que un sistema de búsqueda le pasaría a una IA. Su ruta de títulos les da contexto: un fragmento que dice "Arroz, 800, 0,4" es mucho más útil si se sabe que está en "Valores típicos" de un texto sobre el efecto Janssen.
- **Las huellas** permiten verificar que un fragmento no fue alterado y reconocer fragmentos idénticos en documentos distintos sin compararlos letra por letra.
- **Los tokens estimados** sirven para comparar, no para calcular costos de un modelo concreto. Para eso está el conteo con Claude.

#### 7.1 Preguntas frecuentes

**¿Por qué Markdown y no HTML limpio?** Porque Markdown es el formato que los modelos de lenguaje manejan con más naturalidad (gran parte de su entrenamiento incluye texto en Markdown) y ocupa menos tokens que el HTML equivalente: `## Título` en vez de `<h2>Título</h2>`.

**¿Qué pasa si la página tiene `<main>` o `<article>`?** El conversor usa solo ese contenido ("modo lectura") y descarta el resto. Es la convención de HTML5 para marcar el contenido principal. Si la página no lo marca, como la del tutorial de Python, el menú lateral entra en el texto.

**¿Por qué el tamaño de fragmento por defecto es 1200 caracteres?** Es un compromiso habitual en sistemas de búsqueda para IAs: unos 300 tokens, suficientes para contener una idea completa y chicos como para que varios entren en el contexto de un modelo. Se puede cambiar en "Opciones de conversión".

**¿Por qué no hay embeddings (vectores) en el paquete?** Porque los vectores que produce un modelo no le sirven a otro: cada modelo tiene su propio espacio. Un paquete con vectores quedaría atado a un modelo. El texto, en cambio, lo puede usar cualquiera.

**¿Cómo detecta el idioma?** Cuenta palabras funcionales muy frecuentes del español (el, la, de, que, y…) y del inglés (the, of, and, to…). Si hay menos de cinco en total, dice "desconocido". Es una heurística simple que funciona bien con textos de unas decenas de palabras en esos dos idiomas.

**¿Por qué la página llama a la API sin el SDK oficial?** Porque se abre con doble clic, sin paso de build, y el SDK de JavaScript se distribuye como módulo que necesita un empaquetador. `src/claude.js` hace los mismos pedidos que el SDK, con el mismo encabezado de acceso desde el navegador. La comparativa, en Python, usa el SDK oficial.

#### 7.2 Un vistazo al paquete

Abreviado, el paquete del ejemplo se ve así (con `…` donde se cortó texto):

```
{
  "aidoc": "0.1",
  "metadatos": {
    "titulo": "El efecto Janssen en silos",
    "idioma": "es",
    "tipoOriginal": "text/html",
    "hashOriginal": "sha256:a8987a…",
    "caracteresOriginal": 1972
  },
  "texto": "# El efecto Janssen en silos\n\nEn un tubo lleno de grano…",
  "secciones": [ { "id": "s1", "nivel": 1, "titulo": "El efecto Janssen en silos", "inicio": 0, "fin": 205 }, … ],
  "fragmentos": [ { "id": "f1", "seccion": "s1", "inicio": 0, "fin": 203, "hash": "sha256:d93da4…" }, … ],
  "tablas": [ { "encabezados": ["Material", "Densidad (kg/m³)", "μ"], "filas": [["Arroz", "800", "0,4"], ["Trigo", "780", "0,35"]] } ],
  "imagenes": [ { "alt": "Corte de un silo…", "src": "silo.jpg", "descripcion": null, "textoDetectado": null, "descripcionModelo": null } ],
  "medicion": { "metodo": "1 token ≈ 4 caracteres", "tokensOriginal": 493, "tokensTexto": 183, "ahorro": 0.63 }
}
```

Lo que se ve de un vistazo: el texto es uno solo, y todo lo demás apunta a posiciones dentro de él. Los fragmentos no repiten un texto "parecido": son, por construcción, pedazos exactos del texto canónico, y la huella lo garantiza.

#### 7.3 Recorrido guiado

1. **Cargá el ejemplo** y mirá el HTML en el panel Original. Contá cuántas líneas son de menú, scripts y estilos.
2. **Compará** con el texto canónico del panel de al lado. *¿Qué se perdió que importe?* Nada del contenido; *¿qué se perdió que no importe?* Todo lo demás.
3. **Mirá Estructura** y tocá cada sección: el texto marca su rango. Fijate cómo la tabla HTML quedó en encabezados y filas, sin estilos.
4. **Bajá el tamaño de fragmento a 200** en "Opciones de conversión". Mirá cómo se cortan las secciones y si algún corte separa una idea.
5. **Soltá un Markdown propio** (por ejemplo, un README) y mirá el ahorro: debería ser casi cero, porque Markdown ya es el formato canónico.
6. **Descargá el paquete, alteralo y soltalo de nuevo.** Cambiá una letra de un fragmento, o la fecha de `creado`, y leé qué dice la validación.
7. **Con una key**, contá con Claude y compará con la estimación: en español, la regla de 4 caracteres por token suele quedarse corta.

### 8. Limitaciones

- No lee PDF ni archivos de Office. Para eso están Docling y MarkItDown.
- El conversor de HTML es simple: las páginas armadas con JavaScript, o con estructuras raras, pueden salir incompletas. Sin `<main>` ni `<article>`, no separa el menú del contenido.
- El validador no implementa todo JSON Schema 2020-12 (sección 5.1).
- El conteo real y la descripción de imágenes no se probaron contra la API real: los tests usan respuestas simuladas, porque el repositorio no tiene una key. La forma de cada pedido sigue la documentación de la API.
- Los tokens de los fragmentos siguen siendo estimados.
- No transcribe audio ni video, y no incluye embeddings.
- La comparativa usa cinco documentos y una referencia definida por el autor; mide estructura, no si un modelo responde mejor.

## Parte II. Guía de la idea

### 9. La idea: un lenguaje nativo para IAs

La idea original se llamaba "lenguaje de estructuración nativo para IAs". Partía de una observación sobre cómo las IAs consumen documentos hoy: cada vez que un modelo lee una página web, un PDF o una planilla, alguien (el modelo mismo o un programa intermedio) tiene que extraer el texto, sacar el ruido, reconocer los títulos, entender las tablas y describir las imágenes. Ese trabajo se repite cada vez que cualquier IA lee ese documento.

La propuesta es invertir el orden: que quien **produce** el documento genere, una sola vez, una versión estructurada y verificable para máquinas, y que todas las IAs usen esa versión. Es la lógica de *digerir una vez, usar muchas veces*.

La herramienta convierte esa idea en dos cosas concretas: una **especificación** (qué tiene que contener la versión para máquinas) y un **conversor de referencia** (un programa que la genera a partir de documentos comunes). También mide lo que se gana, en tokens. Esta guía cuenta de dónde vienen las piezas de la especificación y qué propuestas parecidas existen.

### 10. Separar contenido de presentación: una historia larga

#### 10.1 SGML y la marcación genérica

La idea de que un documento debería describir su **estructura** (esto es un título, esto es una cita) y no su **apariencia** (esto va en negrita de 14 puntos) es de los años sesenta. William Tunnicliffe la presentó en 1967 bajo el nombre de **codificación genérica**. Charles Goldfarb, Edward Mosher y Raymond Lorie la desarrollaron en IBM como GML (1969), y Goldfarb lideró después su estandarización como **SGML** (*Standard Generalized Markup Language*), norma ISO 8879 de 1986. Goldfarb la explicó en *The SGML Handbook* (1990).

La lógica de SGML es la misma que la de la idea: si el documento dice qué es cada parte, cualquier programa puede presentarlo, indexarlo o transformarlo sin adivinar.

#### 10.2 HTML y lo que la web hizo con él

Tim Berners-Lee diseñó HTML en 1990-1991 como una aplicación simple de SGML para el CERN. Los primeros documentos HTML eran casi pura estructura. Pero a medida que la web creció, HTML se llenó de presentación (tablas para maquetar, etiquetas de fuente, colores) y después de comportamiento (scripts). Una página web moderna tiene, a menudo, más código de menús, publicidad, analítica y estilos que contenido. El ejemplo de la herramienta, con 493 tokens de los que solo 183 son contenido, es una página web chica y bastante limpia; en páginas reales, la proporción de ruido es mucho mayor.

Las hojas de estilo CSS (Håkon Wium Lie, 1994) y las etiquetas semánticas de HTML5 (`<main>`, `<article>`, `<nav>`, `<aside>`, 2014) fueron intentos de volver a separar contenido de presentación. El conversor de la herramienta aprovecha esas etiquetas: usa `<main>` o `<article>` si existen y descarta `<nav>`, `<form>`, `<script>` y `<style>`.

#### 10.3 Markdown

En 2004, John Gruber, con la colaboración de Aaron Swartz, publicó **Markdown**: una sintaxis para escribir texto con estructura que se lee bien sin procesar (`#` para títulos, `*` para énfasis, `-` para listas) y se convierte fácilmente a HTML. Markdown se volvió el formato de facto de la documentación técnica, los foros y los repositorios de código. Como la especificación original era ambigua, John MacFarlane y colaboradores publicaron en 2014 **CommonMark**, una especificación rigurosa con miles de casos de prueba.

Para los modelos de lenguaje, Markdown tiene una ventaja doble: es compacto (pocos símbolos de marcación) y está masivamente presente en sus datos de entrenamiento. Por eso el texto canónico de aidoc es Markdown.

### 11. La web semántica y Schema.org

#### 11.1 Berners-Lee, Hendler y Lassila, 2001

En mayo de 2001, Tim Berners-Lee, James Hendler y Ora Lassila publicaron en *Scientific American* (284(5), 34–43) un artículo titulado *The Semantic Web*. Proponían una web en la que el contenido estuviera marcado con significado legible por máquinas, de modo que **agentes de software** pudieran entenderlo y actuar: buscar un médico que atienda cerca, con turno disponible, que acepte cierta obra social. Es, casi palabra por palabra, la promesa de los agentes de IA actuales.

La web semántica desarrolló estándares (RDF, OWL, SPARQL) pero tuvo una adopción limitada fuera de ámbitos especializados. Una de las razones fue el costo: marcar el significado de todo era trabajo extra para quien publicaba, sin beneficio inmediato.

#### 11.2 Schema.org, 2011

En 2011, Google, Microsoft, Yahoo y Yandex lanzaron **Schema.org**, un vocabulario compartido para marcar datos estructurados en páginas web: una receta, un evento, un producto, una persona. Ramanathan Guha, Dan Brickley y Steve Macbeth contaron su evolución en *Communications of the ACM* (59(2), 44–51, 2016). Schema.org sí se adoptó masivamente, por una razón concreta: los buscadores usaban esos datos para mostrar resultados enriquecidos (estrellas, precios, horarios), y eso daba tráfico.

La lección para la idea es directa: un formato para máquinas se adopta si quien publica obtiene algo a cambio. Para aidoc, el incentivo sería que las IAs citen, encuentren y usen mejor el contenido de quien publica el paquete.

### 12. Sacar el ruido: la limpieza de páginas web

#### 12.1 El problema del "boilerplate"

En la recuperación de información se llama *boilerplate* al contenido repetitivo de una página que no es el contenido principal: menús, encabezados, pies, publicidad, enlaces relacionados. Christian Kohlschütter, Peter Fankhauser y Wolfgang Nejdl mostraron en 2010 (*Proceedings of the Third ACM International Conference on Web Search and Data Mining*, 441–450) que se puede detectar con rasgos muy simples del texto, como la cantidad de palabras de cada bloque y la densidad de enlaces: los bloques de contenido tienen oraciones largas y pocos enlaces; los menús, palabras sueltas y muchos enlaces.

#### 12.2 El modo lectura

En 2009, la empresa Arc90 publicó **Readability**, un programa que extraía el artículo principal de una página y lo mostraba limpio. Su lógica (puntuar cada bloque según la cantidad de texto, comas y párrafos, y penalizar los que tienen clases como "sidebar" o "comment") inspiró los "modos lectura" de Safari, Firefox y otros navegadores. El conversor de aidoc usa una versión mínima de esa idea: si la página marca su contenido con `<main>` o `<article>`, se queda solo con eso.

#### 12.3 Por qué esto importa para una IA

Una IA que lee una página sin limpiar gasta tokens (y por lo tanto dinero y espacio de contexto) en menús y scripts, y corre el riesgo de confundir un enlace del menú con contenido. Además, si la página tiene texto oculto o instrucciones disimuladas en partes que un humano no ve, la IA puede leerlas: es una de las vías de la **inyección de instrucciones**, un problema de seguridad conocido de los sistemas basados en modelos de lenguaje. Un texto canónico generado por quien publica, verificado con huellas, reduce ese riesgo, aunque no lo elimina.

### 13. Tokens: la unidad de cuenta de las IAs

#### 13.1 Qué es un token

Los modelos de lenguaje no leen letras ni palabras sino **tokens**: fragmentos de texto de longitud variable, típicamente partes de palabras. "efecto" puede ser un token; "rozamiento" puede ser dos o tres. El costo de usar un modelo, su velocidad y la cantidad de texto que puede considerar a la vez (su **ventana de contexto**) se miden en tokens.

#### 13.2 La codificación por pares de bytes

La técnica de tokenización más usada viene de un algoritmo de compresión: la **codificación por pares de bytes** (BPE), que Philip Gage publicó en 1994 y que reemplaza repetidamente el par de bytes más frecuente por un símbolo nuevo. Rico Sennrich, Barry Haddow y Alexandra Birch la adaptaron en 2016 para traducción automática, partiendo del trabajo de Gage (*Proceedings of the 54th Annual Meeting of the Association for Computational Linguistics*, 1715–1725): empezando por caracteres, se fusionan los pares más frecuentes hasta tener un vocabulario de decenas de miles de unidades. El resultado es que las palabras frecuentes son un token y las raras se arman con varios.

Una consecuencia práctica es que el mismo texto ocupa distinta cantidad de tokens según el idioma: los tokenizadores entrenados con mucho inglés son más eficientes en inglés que en español. La regla gruesa de 1 token ≈ 4 caracteres que usa aidoc sin key es una aproximación para inglés; en español suele haber algo más de tokens por carácter. Por eso aidoc puede contar con el tokenizador real de Claude (sección 5.2), y la comparativa usa `o200k_base`, el tokenizador público de tiktoken (OpenAI, s. f.; sección 6). Cada tokenizador da números distintos para el mismo texto: un conteo de tokens solo tiene sentido si dice con qué tokenizador se hizo, y por eso el paquete lo guarda en `medicion.modelo`.

#### 13.3 Lo que cuesta el ruido

Con la estimación de la herramienta, el ejemplo pasa de 493 a 183 tokens. Si mil IAs leen esa página una vez cada una, la diferencia es de 310 000 tokens. Si la página tiene un millón de lecturas por IAs, de 310 millones. La propuesta de digerir una vez es, en el fondo, una cuenta de escala: el costo de generar el paquete se paga una vez; el ahorro se cobra en cada lectura.

#### 13.4 ¿Las ventanas de contexto enormes vuelven inútil la limpieza?

Los modelos de lenguaje pasaron de ventanas de contexto de unos pocos miles de tokens (2020) a cientos de miles y hasta millones (2024-2026). Una objeción razonable a la idea es: si un modelo puede leer un libro entero de una vez, ¿para qué limpiar y fragmentar?

Hay tres respuestas. La primera es el **costo**: aunque el modelo pueda leer un millón de tokens, cada token se paga, en dinero y en tiempo de respuesta. Un ahorro del 63 % es un ahorro del 63 % con cualquier ventana. La segunda es la **calidad**: el trabajo de Liu y colaboradores (sección 14.3) y muchos posteriores muestran que, con contextos largos, los modelos usan peor la información del medio y se distraen con contenido irrelevante. Menos ruido da mejores respuestas, no solo más baratas. La tercera es la **escala**: una IA que responde preguntas sobre millones de documentos no puede ponerlos todos en su contexto, por grande que sea. Necesita buscar, y para buscar necesita fragmentos.

Las ventanas grandes sí cambian algo: hacen menos crítico el tamaño exacto de los fragmentos y permiten pasar secciones completas en vez de pedazos. Por eso el tamaño de fragmento de aidoc es configurable, y por eso el paquete guarda también las secciones completas con sus posiciones: un sistema con ventana grande puede usar secciones; uno con ventana chica, fragmentos.

### 14. Fragmentos y búsqueda: cómo usan las IAs los documentos

#### 14.1 Generación aumentada por recuperación

En 2020, Patrick Lewis y colaboradores de Facebook AI presentaron la **generación aumentada por recuperación** (RAG, por su sigla en inglés) en *Advances in Neural Information Processing Systems* (33, 9459–9474). La idea es que un modelo, en vez de responder solo con lo que aprendió en su entrenamiento, primero **busque** fragmentos relevantes en una colección de documentos y después genere la respuesta usándolos. Es la arquitectura de la mayoría de los asistentes que responden sobre documentos de una empresa o de un usuario.

Para que RAG funcione, los documentos tienen que estar partidos en **fragmentos** (*chunks*) de tamaño manejable. Cómo se cortan importa mucho: un corte en mitad de una oración o de una tabla produce fragmentos sin sentido; un corte que separa un dato de su contexto produce respuestas erróneas.

#### 14.2 Cómo corta aidoc

El conversor corta cada **sección** en fragmentos de hasta el tamaño máximo, preferentemente entre párrafos (busca un doble salto de línea en el tramo final permitido, y solo corta en otro lado si el párrafo es más largo que el máximo). Nunca mezcla dos secciones en un fragmento. Y cada fragmento lleva su **ruta de títulos**: la lista de títulos que lo contienen. Así, un fragmento de la tabla de valores típicos lleva consigo la información de que está en "El efecto Janssen en silos › Valores típicos".

Esa ruta resuelve un problema conocido: un fragmento aislado pierde el contexto que el documento le daba. Anthropic publicó en 2024 una técnica llamada *contextual retrieval*, que agrega a cada fragmento un breve resumen de su contexto antes de indexarlo, y reportó mejoras importantes en la búsqueda. La ruta de títulos de aidoc es una versión mínima y determinista de esa idea, que no requiere un modelo.

#### 14.3 Perdidos en el medio

Nelson Liu y colaboradores mostraron en *Lost in the middle: How language models use long contexts* (*Transactions of the Association for Computational Linguistics*, 12, 157–173, 2024) que los modelos de lenguaje usan mejor la información que está al principio o al final de su contexto que la que está en el medio. Con contextos largos y ruidosos, la información relevante puede perderse. Pasarle a un modelo fragmentos limpios y relevantes, en vez de páginas enteras con ruido, no es solo una cuestión de costo: mejora las respuestas.

### 15. Huellas: verificar sin comparar

#### 15.1 Funciones de hash

Una **función de hash criptográfica** toma un texto de cualquier longitud y devuelve una cadena de longitud fija, la **huella** (*digest*), con tres propiedades: es fácil de calcular, es prácticamente imposible encontrar otro texto con la misma huella, y un cambio mínimo en el texto cambia la huella por completo. **SHA-256**, de la familia SHA-2 diseñada por la Agencia de Seguridad Nacional de Estados Unidos y publicada por el NIST en 2001 (hoy en la norma FIPS 180-4, 2015), produce huellas de 256 bits, que se escriben como 64 caracteres hexadecimales.

aidoc implementa SHA-256 en JavaScript, sin depender de la función del navegador (`crypto.subtle`, que no está disponible en todos los contextos, por ejemplo al abrir la página desde un archivo local), y uno de los tests lo verifica contra los vectores de prueba estándar del NIST.

#### 15.2 Para qué sirven en el paquete

- **Integridad:** si alguien modifica un fragmento, su huella deja de coincidir. La validación de aidoc lo detecta.
- **Identidad del original:** la huella del documento original en los metadatos permite saber si el paquete corresponde a una versión determinada. Si el original cambia, la huella cambia, y cualquier sistema puede saber que el paquete quedó viejo.
- **Deduplicación:** dos fragmentos con la misma huella son idénticos, aunque estén en documentos distintos. Un sistema que indexa millones de documentos puede guardar una sola vez cada fragmento repetido (avisos legales, pies de página, citas).

#### 15.3 Direccionamiento por contenido

Ralph Merkle propuso en 1979 los **árboles de hash** (patentados en 1982 y publicados en *Advances in Cryptology — CRYPTO '87*, 1988): una estructura en la que cada nodo guarda la huella de sus hijos, de modo que la huella de la raíz verifica todo el conjunto. Linus Torvalds diseñó en 2005 el sistema de control de versiones **Git** sobre esa idea: cada archivo, cada directorio y cada versión se identifican por la huella de su contenido. Juan Benet propuso en 2014 **IPFS**, un sistema de archivos distribuido en el que los archivos se piden por su huella, no por su ubicación.

Un paquete aidoc, con huellas por fragmento y por original, está a un paso de ese modelo: un fragmento podría citarse por su huella, y cualquiera podría verificar que la cita es exacta.

### 16. Metadatos y procedencia: saber de dónde viene

#### 16.1 Dublin Core

En 1995, en un taller en Dublin, Ohio, bibliotecarios e informáticos acordaron un conjunto mínimo de quince elementos para describir recursos digitales: título, creador, tema, descripción, editor, colaborador, fecha, tipo, formato, identificador, fuente, idioma, relación, cobertura y derechos. El **Dublin Core** se convirtió en la norma ISO 15836. Los metadatos de aidoc (título, idioma, fuente, tipo original, fecha) son un subconjunto de esa tradición.

#### 16.2 OAIS y la preservación

El **modelo OAIS** (*Open Archival Information System*, norma ISO 14721, primera versión de 2003) define cómo un archivo digital debe guardar información para que siga siendo usable en el futuro. Una de sus ideas centrales es que, junto con los datos, hay que guardar la **información de representación** (cómo interpretarlos) y la **información de procedencia** (de dónde vienen y qué transformaciones sufrieron). Un paquete aidoc es, en ese lenguaje, un paquete de información con su interpretación incluida.

#### 16.3 Quién generó qué

Uno de los próximos pasos del proyecto es agregar descripciones de imágenes y transcripciones generadas por modelos, guardando **qué modelo** las generó. Es una exigencia de procedencia: un texto escrito por el autor y una descripción generada por una IA no tienen el mismo valor, y quien use el paquete tiene que poder distinguirlos. El W3C publicó en 2013 el modelo **PROV** para representar la procedencia de datos (entidades, actividades y agentes), y desde 2021 la Coalición para la Procedencia y Autenticidad del Contenido (C2PA) desarrolla estándares para certificar el origen de imágenes y videos, incluidos los generados por IA. Un aidoc futuro podría usar esos modelos para marcar cada campo con su origen.

### 17. Propuestas contemporáneas

#### 17.1 llms.txt

En septiembre de 2024, Jeremy Howard, cofundador de fast.ai, propuso **llms.txt** (Howard, 2024): un archivo en la raíz de un sitio web, en Markdown, que resume el sitio para modelos de lenguaje y enlaza a versiones en Markdown de las páginas más importantes. Es una idea emparentada con `robots.txt` (que dice a los buscadores qué pueden indexar) y con `sitemap.xml`. Varios sitios de documentación técnica lo adoptaron rápidamente.

llms.txt y aidoc comparten la premisa (que los sitios ofrezcan una versión para IAs) pero difieren en el alcance: llms.txt es un índice en texto libre; aidoc es un paquete estructurado por documento, con secciones, fragmentos, huellas y medición. Podrían complementarse: un llms.txt podría enlazar a los `.aidoc.json` de cada página.

#### 17.2 Docling

IBM Research publicó en 2024 **Docling** (Christoph Auer y colaboradores, *Docling Technical Report*, arXiv:2408.09869), un conversor de código abierto que transforma PDF, Word, PowerPoint e imágenes en Markdown o JSON estructurado, usando modelos de visión para reconocer el diseño de la página, las tablas y las fórmulas. Docling resuelve el problema más difícil, el de los PDF, que aidoc no aborda.

#### 17.3 MarkItDown

Microsoft publicó en noviembre de 2024 **MarkItDown** (Microsoft, s. f.), una biblioteca de Python que convierte muchos formatos (PDF, Office, HTML, imágenes, audio) a Markdown pensado para modelos de lenguaje. Es más simple que Docling y prioriza la cobertura de formatos.

#### 17.4 Cómo comparar conversores

La sección 6 compara aidoc con Docling y MarkItDown en cinco documentos reales. ¿Qué conviene medir en una comparación así?

- **Tokens.** Cuántos tokens tiene la salida, con un tokenizador real. Menos no siempre es mejor: un conversor que pierde contenido también ahorra tokens.
- **Tiempo.** Cuánto tarda cada conversión. Los conversores con modelos de visión son mucho más lentos que uno basado en reglas.
- **Fidelidad del texto.** Cuánto difiere el texto extraído del texto real del documento. Se mide con la **distancia de edición** que Vladimir Levenshtein definió en 1966 (el mínimo de inserciones, borrados y sustituciones de caracteres para pasar de un texto a otro), normalizada por la longitud.
- **Fidelidad de la estructura.** Si los títulos, las listas y las tablas se reconocieron como tales. Para tablas, Xu Zhong, Elaheh ShafieiBavani y Antonio Jimeno Yepes propusieron en 2020 una métrica específica, TEDS (*Tree-Edit-Distance-based Similarity*), que compara la estructura de árbol de la tabla extraída con la real.
- **Utilidad final.** La prueba más directa: hacer las mismas preguntas a un modelo con cada versión del documento y comparar las respuestas. Es más caro de medir, pero es lo que importa.

La comparativa de la sección 6 mide los tokens con un tokenizador real, el tiempo y una versión simple de la fidelidad: si los títulos, las tablas, los enlaces y las palabras del contenido llegan a la salida, y cuánto ruido se cuela. No calcula la distancia de edición ni TEDS, ni la utilidad final con preguntas y respuestas, que quedan como próximos pasos.

Los resultados muestran que, en HTML, aidoc quedó parejo con Docling en tokens o por debajo, conservó todos los enlaces y fue el más rápido. La excepción en tokens es el RFC, donde MarkItDown deja menos pero pierde casi la mitad de los enlaces. aidoc también tiene límites claros: no lee PDF, y cuando la página no marca su contenido con `<main>` o `<article>`, deja pasar el menú igual que los otros. La conclusión práctica es combinar: usar el mejor conversor para cada formato y envolver su salida en un paquete aidoc.

#### 17.5 Qué aporta aidoc

Docling y MarkItDown son **conversores**. aidoc propone además un **formato de paquete** con dos cosas que ellos no incluyen por defecto: huellas por fragmento (verificación e identidad) y medición explícita del ahorro, con el tokenizador identificado. Suma además una especificación validable y la procedencia de lo que genera un modelo. La mejor arquitectura probablemente combine un conversor potente (Docling para PDF) con el formato de paquete de aidoc.

### 18. La especificación

#### 18.1 JSON y JSON Schema

El paquete es un documento **JSON**, el formato de datos que Douglas Crockford popularizó a principios de los 2000 y que Tim Bray estandarizó en la RFC 8259 (2017). La especificación formal está escrita en **JSON Schema**, en su versión 2020-12, un vocabulario para describir qué forma tiene que tener un documento JSON: qué campos son obligatorios, de qué tipo, con qué restricciones. Un esquema permite que cualquier programa, en cualquier lenguaje, valide un paquete sin depender del conversor de referencia.

#### 18.2 Decisiones de diseño

- **Texto canónico único.** Todas las posiciones (de secciones y fragmentos) se refieren a un solo texto. Eso hace verificable que cada fragmento es exactamente un pedazo del texto, sin reformulaciones.
- **Posiciones en caracteres.** Inicio y fin se miden en caracteres del texto canónico, no en bytes ni en tokens, para que no dependan de la codificación ni del modelo.
- **Campos que se completan después.** Las imágenes tienen `descripcion` y `textoDetectado` en `null` hasta que un modelo los completa, y entonces `descripcionModelo` dice cuál fue. Como los campos nuevos son opcionales, un lector de la 0.1 que no los conoce sigue leyendo el paquete.
- **Sin vectores.** Por la razón dicha: atarían el paquete a un modelo.
- **Versión explícita.** El campo `aidoc` dice qué versión de la especificación usa el paquete, para que los lectores sepan qué esperar.

#### 18.3 Lo que valida la herramienta

La validación tiene dos capas (sección 5.1). Primero, el paquete se revisa contra el esquema con un validador de JSON Schema 2020-12 escrito para aidoc, sin dependencias, que pasa los 970 casos aplicables del JSON-Schema-Test-Suite oficial (JSON Schema, s. f.; Wright, Andrews y Hutton, 2022) y exige que las fechas sean RFC 3339 (Klyne y Newman, 2002). Después se revisa lo que un esquema no puede expresar: que cada fragmento coincida exactamente con el texto canónico entre su inicio y su fin, que su huella SHA-256 coincida con la de ese texto, que caiga dentro de su sección y que los identificadores no se repitan. El esquema publicado también se puede usar con cualquier otro validador de 2020-12.

#### 18.4 Qué podría traer una versión 0.2

La especificación es un borrador. Con lo discutido en esta guía, una versión 0.2 podría agregar, sin romper la compatibilidad con la 0.1:

- **Procedencia completa por campo:** la versión actual ya guarda qué modelo describió cada imagen (`descripcionModelo`). Falta cuándo y con qué instrucción, y lo mismo para transcripciones.
- **Conversor y versión:** qué programa generó el paquete, para que un tercero pueda reproducir la conversión y comparar huellas.
- **Tokens por tokenizador:** la versión actual guarda un conteo y, si es real, el modelo (`medicion.modelo`). Una 0.2 podría guardar varios conteos a la vez, uno por tokenizador.
- **Firma opcional:** una firma digital del paquete completo, con la referencia a la clave pública de quien responde por él.
- **Relaciones entre documentos:** enlaces a otros paquetes por su huella, para que un conjunto de documentos (un manual con varios capítulos, por ejemplo) se pueda recorrer sin volver a las páginas originales.

Cada una de esas extensiones responde a un problema que la versión 0.1 deja abierto, y cada una tiene un antecedente en los estándares citados: PROV para la procedencia, las compilaciones reproducibles para el conversor, la criptografía de clave pública para la firma, el direccionamiento por contenido para las relaciones.

### 19. Más allá del texto: imágenes, audio y video

Por defecto, el paquete deja en `null` la descripción de las imágenes y su texto detectado; con una key, un modelo los completa (sección 5.3). No maneja audio ni video. Es la parte más costosa de "digerir", y por lo tanto la que más se beneficiaría de hacerse una sola vez.

**Texto en imágenes.** El reconocimiento óptico de caracteres (OCR) tiene una historia larga, desde las máquinas de lectura de los años cincuenta hasta **Tesseract**, un motor de OCR que Ray Smith desarrolló en Hewlett-Packard entre 1985 y 1994, que Google liberó como código abierto en 2005 y que Smith describió en 2007 (*Proceedings of the Ninth International Conference on Document Analysis and Recognition*, 629–633). Hoy los modelos de visión y lenguaje leen texto en imágenes con mucha más robustez. Completar `textoDetectado` con OCR es directo.

**Descripción de imágenes.** El texto alternativo (`alt`) de una imagen es, en el mejor de los casos, una frase escrita por el autor para accesibilidad; en el peor, está vacío. Los modelos multimodales actuales pueden describir imágenes con detalle. Una descripción generada una vez y guardada en el paquete, con la marca del modelo que la generó, le ahorra a cada IA lectora tener que procesar la imagen. aidoc lo hace con Claude y salida estructurada: le pide un JSON con la descripción y el texto detectado, en el formato que fija un esquema (Anthropic, s. f.-c), y guarda en `descripcionModelo` el modelo que respondió. Y le da a la página, de paso, una mejor accesibilidad para personas ciegas, si el autor la revisa.

**Audio y video.** Transcribir es caro. Alec Radford y colaboradores presentaron en 2023 **Whisper** (*Proceedings of the 40th International Conference on Machine Learning*, 28492–28518), un modelo de reconocimiento del habla entrenado con 680 000 horas de audio, que transcribe con buena calidad en decenas de idiomas. Una transcripción con marcas de tiempo, guardada en el paquete, convertiría un video de una hora en un texto de unos pocos miles de tokens, buscable y citable.

En los tres casos, la regla de procedencia de la sección 16.3 es indispensable: lo que generó un modelo tiene que estar marcado como tal, con el modelo, la fecha y, si es posible, la instrucción usada. Un lector tiene que poder distinguir lo que dijo el autor de lo que interpretó una máquina.

### 20. Riesgos: un paquete que no coincide con el original

Un formato para máquinas generado por quien publica abre una posibilidad incómoda: que el paquete diga algo distinto de lo que dice la página para humanos. En los buscadores, esa práctica tiene nombre, *cloaking* (mostrar a los robots un contenido y a las personas otro), y Google la penaliza desde hace años. Con IAs, el riesgo es el mismo: un sitio podría ofrecer un paquete con afirmaciones, instrucciones o enlaces que no están en la página visible.

aidoc tiene un mecanismo parcial de defensa: la huella del original en los metadatos. Cualquiera que descargue la página puede calcular su huella y compararla. Si coincide, sabe que el paquete dice corresponder a esa versión. Pero eso no garantiza que el **contenido** del paquete sea una conversión fiel; solo que se refiere a ese original. Para verificar la fidelidad hay que volver a convertir y comparar, lo que anula el ahorro.

Hay dos caminos para reforzar la confianza, ninguno implementado en la versión 0.1:

- **Firmas digitales.** Que el paquete esté firmado con la clave privada de quien lo generó, de modo que cualquiera pueda verificar con la clave pública quién lo produjo. Es la criptografía de clave pública que Whitfield Diffie y Martin Hellman propusieron en 1976 (*IEEE Transactions on Information Theory*, 22, 644–654) y que Ron Rivest, Adi Shamir y Leonard Adleman hicieron práctica en 1978 con RSA (*Communications of the ACM*, 21, 120–126). Una firma dice quién responde por el paquete, no si es fiel.
- **Conversores reproducibles.** Que el paquete indique qué conversor y qué versión lo generaron, de modo que un tercero pueda repetir la conversión y comparar las huellas de los fragmentos. Si el conversor es determinista (como el de aidoc), el resultado tiene que ser idéntico bit a bit. Es la lógica de las **compilaciones reproducibles** en software.

Este riesgo no invalida la idea, pero define su alcance: un paquete aidoc es una ayuda, no una autoridad. Una IA que lo usa debería poder, en caso de duda, volver al original.

### 21. Por qué "digerir una vez" funciona: la memoización

La idea de guardar el resultado de un cálculo caro para no repetirlo tiene un nombre en informática: **memoización**. Donald Michie la propuso en 1968 en *Nature* (218, 19–22) con el título *"Memo" functions and machine learning*: una función que recuerda los resultados que ya calculó y los devuelve directamente la próxima vez que recibe los mismos argumentos. Es la base de los cachés, de la programación dinámica y de buena parte de la eficiencia de los sistemas modernos.

aidoc es memoización a escala de la web: la "función" es interpretar un documento (extraer, limpiar, estructurar, cortar), el "argumento" es el documento identificado por su huella, y el "resultado" es el paquete. La huella del original es lo que hace funcionar el esquema: si el documento cambia, la huella cambia, y el paquete viejo se invalida solo.

La memoización funciona cuando el cálculo es caro, el resultado se reusa mucho y la entrada se puede identificar con precisión. Las tres condiciones se cumplen para documentos públicos leídos por IAs: interpretar un PDF complejo con modelos de visión es caro, muchas IAs leen los mismos documentos, y una huella SHA-256 identifica un documento sin ambigüedad.

### 22. Quién decide qué leen las máquinas

Un formato para IAs plantea una pregunta que no es técnica: si quien publica tiene que decidir cómo leen su contenido las máquinas, también tiene que poder decidir **si** lo leen.

#### 22.1 Robots.txt

En 1994, Martijn Koster propuso en una lista de correo una convención simple: un archivo de texto llamado `robots.txt`, en la raíz de cada sitio, que dijera a los programas que recorren la web (los robots o *crawlers*) qué partes podían visitar y cuáles no. No era un estándar ni tenía fuerza legal; funcionaba porque los buscadores lo respetaban. Durante casi treinta años fue una convención informal, hasta que en 2022 la IETF lo publicó como estándar, el **protocolo de exclusión de robots** (RFC 9309), firmado por Koster, Gary Illyes, Henner Zeller y Lizzi Sassman.

`robots.txt` fue pensado para buscadores, en una época en que dejarse indexar tenía un beneficio claro (aparecer en los resultados). Con el entrenamiento de modelos de lenguaje, el intercambio cambió: los mismos robots, u otros nuevos, recolectan el contenido para entrenar modelos que después pueden responder sin mandar tráfico al sitio original.

#### 22.2 El consentimiento en crisis

Shayne Longpre y colaboradores estudiaron en 2024 cómo cambiaron los archivos `robots.txt` y los términos de servicio de los sitios más usados para entrenar modelos de lenguaje. Encontraron que, en apenas un año, una parte considerable de los sitios más importantes de esas colecciones empezó a restringir el acceso de los robots asociados a empresas de IA, y que esas restricciones eran inconsistentes: los términos de servicio decían una cosa y el `robots.txt` otra. Llamaron al fenómeno una "crisis del consentimiento" en los datos comunes de la web.

Para la idea de aidoc, esto tiene dos lecturas. Por un lado, un formato pre-digerido podría empeorar el problema, al facilitar que las máquinas tomen el contenido. Por otro, podría ser parte de la solución: un paquete que quien publica genera voluntariamente puede incluir **condiciones de uso** explícitas (para qué se permite usarlo, si se permite entrenar, cómo citar), algo que una página web cruda no expresa de manera legible por máquinas. Agregar un campo de licencia y de usos permitidos sería natural en una versión futura de la especificación.

### 23. Medir si un paquete sirve: preguntas y respuestas

La medición de aidoc es de tokens: cuánto ruido se sacó. Pero lo que importa es si una IA **responde mejor** con el paquete que con la página original. Eso se mide con preguntas.

La manera estándar viene de la investigación en comprensión lectora automática. En 2016, Pranav Rajpurkar, Jian Zhang, Konstantin Lopyrev y Percy Liang publicaron SQuAD (*Proceedings of EMNLP*, 2383–2392), un conjunto de más de cien mil preguntas sobre artículos de Wikipedia, cada una con su respuesta marcada en el texto. Un sistema se evalúa por cuántas respuestas encuentra exactamente y por cuánto se superponen sus respuestas con las correctas. SQuAD y sus sucesores fueron durante años el termómetro del progreso en comprensión automática.

Un experimento modesto para aidoc podría seguir esa lógica:

1. Elegir diez páginas reales con ruido (diarios, documentación, tiendas).
2. Escribir, para cada una, cinco preguntas cuya respuesta esté en el contenido principal, y anotar la respuesta correcta.
3. Hacerle las mismas preguntas a un modelo de lenguaje tres veces: con la página cruda, con el texto canónico de aidoc y con los fragmentos que un buscador elegiría a partir del paquete.
4. Medir aciertos, tokens usados y, si se puede, tiempo de respuesta.

El resultado esperable, por la sección 14.3, es que el texto canónico iguale o mejore los aciertos con muchos menos tokens, y que los fragmentos con ruta de títulos funcionen mejor que fragmentos sin contexto. Pero es justamente lo que hay que medir: puede haber casos en los que el conversor pierda información que el modelo habría usado (una tabla mal convertida, un dato en un pie de página). Un experimento así convertiría la tesis de la idea en un resultado, y sería la sección de evaluación del paper que el proyecto se propone escribir.

### 24. Del modelo al código

| Concepto | Función | Archivo |
|---|---|---|
| HTML a Markdown, con tokenizador propio | (conversor) | `src/markdown.js` |
| Versión de la especificación | `VERSION` | `src/aidoc.js` |
| SHA-256 | `sha256` | `src/aidoc.js` |
| Estimación de tokens | `tokens` | `src/aidoc.js` |
| Detección de idioma | `idioma` | `src/aidoc.js` |
| Detección del tipo de entrada | `detectarTipo` | `src/aidoc.js` |
| Corte en fragmentos | `fragmentar` | `src/aidoc.js` |
| Paquete completo | `convertir` | `src/aidoc.js` |
| Validación completa (esquema e integridad) | `validar` | `src/aidoc.js` |
| Conteo real y descripción guardados en el paquete | `conConteo`, `conDescripcion` | `src/aidoc.js` |
| Validador de JSON Schema 2020-12 | `validar`, `soportado`, `fechaHora` | `src/esquema.js` |
| Copia del esquema para el navegador | `EsquemaAidoc` | `src/esquema-aidoc.js` |
| Conteo de tokens con la API | `contarTokens` | `src/claude.js` |
| Descripción de imágenes y costo estimado | `describirImagen`, `costoEstimado` | `src/claude.js` |
| Especificación formal | — | `spec/aidoc-0.1.schema.json` |
| Comparativa con Docling y MarkItDown | — | `bench/correr.py`, `bench/aidoc.js` |

Los tests verifican: que SHA-256 coincide con los vectores conocidos; que la conversión de HTML a Markdown maneja títulos, énfasis, listas, enlaces, código, tablas e imágenes; que descarta menú, scripts y estilos; que maneja entidades y listas numeradas anidadas; que las secciones tienen ruta e incluyen lo que hay antes del primer título; que convertir el ejemplo da los metadatos, la estructura, las tablas, los enlaces y el ahorro esperados; que los fragmentos respetan el máximo y coinciden con el texto; que la validación detecta un fragmento alterado, y que se detectan bien el tipo y el idioma.

Los tests nuevos verifican: que el validador pasa los 970 casos aplicables del JSON-Schema-Test-Suite y avisa cuando un esquema usa algo que no implementa; que los errores dicen la ruta y la palabra clave; que la copia del esquema del navegador es idéntica a la de `spec/`; que la validación detecta diez tipos de daño, de una fecha mal escrita a un fragmento repetido; que los pedidos a la API llevan la key, la versión, el encabezado de acceso desde el navegador, la salida estructurada y el respaldo de Opus 5.5, con respuestas simuladas; que los errores HTTP se explican, y que las tablas con título quedan bien formadas.

```js
const A = require("./src/aidoc.js");
const paquete = A.convertir("<h1>Hola</h1><p>Un párrafo de prueba con algunas palabras.</p>");
paquete.secciones.length;      // 1
A.validar(paquete);             // sin errores
A.sha256("abc");               // "ba7816bf8f01cfea…"

const E = require("./src/esquema.js");
E.validar({ type: "integer", minimum: 0 }, -1);   // [{ ruta: "", palabra: "minimum", mensaje: "tiene que ser al menos 0" }]
```

### 25. Ejercicios

1. Convertí una página de un diario con publicidad y medí el ahorro. ¿Es mayor o menor que el del ejemplo? ¿Qué quedó de ruido en el texto canónico?
2. Bajá el tamaño máximo de fragmento a 200 caracteres y convertí el ejemplo. ¿Cuántos fragmentos salen? ¿Alguno corta una idea a la mitad?
3. Descargá el paquete del ejemplo, cambiá a mano una palabra de un fragmento y validalo. ¿Qué dice la validación? Después cambiá la misma palabra también en el texto canónico. ¿Qué dice ahora, y por qué?
4. Calculá, con la regla de 1 token ≈ 4 caracteres, cuántos tokens tiene esta guía. Si mil IAs la leyeran en HTML con un 50 % de ruido, ¿cuántos tokens se ahorrarían con un paquete?
5. Escribí un llms.txt para un sitio que conozcas, enlazando a tres páginas. ¿Qué información pondrías que aidoc no tiene?
6. El paquete ya guarda en `descripcionModelo` qué modelo describió una imagen. Proponé cómo agregar, en una versión 0.2, cuándo se generó y con qué instrucción, sin romper los paquetes de la 0.1.
7. Probá MarkItDown o Docling con un PDF y compará su salida con lo que haría falta para un paquete aidoc.
8. Agregá un sexto documento a `bench/documentos.json`, con su selector de contenido, y corré la comparativa. ¿Cambia el orden de las herramientas en alguna medida?
9. Escribí un esquema de JSON Schema con `oneOf` que no se pueda cumplir y probalo con `src/esquema.js`. ¿Qué mensaje da?

### 26. Glosario

- **Texto canónico:** la versión limpia y única del contenido, en Markdown, a la que se refieren todas las posiciones del paquete.
- **Boilerplate:** contenido repetitivo de una página que no es el contenido principal.
- **Token:** unidad de texto con la que trabajan los modelos de lenguaje.
- **BPE:** codificación por pares de bytes; algoritmo de tokenización.
- **Ventana de contexto:** cantidad máxima de tokens que un modelo considera a la vez.
- **Fragmento (chunk):** pedazo de un documento preparado para búsqueda.
- **RAG:** generación aumentada por recuperación.
- **Ruta de títulos:** lista de títulos que contienen a un fragmento.
- **Función de hash:** función que asigna a cada texto una huella de longitud fija.
- **SHA-256:** función de hash criptográfica de 256 bits.
- **Direccionamiento por contenido:** identificar datos por su huella en vez de por su ubicación.
- **Procedencia:** información sobre el origen y las transformaciones de un dato.
- **Memoización:** guardar el resultado de un cálculo para reusarlo.
- **JSON Schema:** vocabulario para describir y validar la forma de documentos JSON.
- **JSON-Schema-Test-Suite:** colección oficial de casos de prueba para validadores de JSON Schema.
- **RFC 3339:** formato estándar de fecha y hora, como `2026-11-10T12:00:00Z`.
- **count_tokens:** endpoint de la API de Anthropic que cuenta los tokens de un texto para un modelo, sin generar respuesta.
- **o200k_base:** tokenizador público de los modelos de OpenAI, disponible en la biblioteca tiktoken.
- **Salida estructurada:** respuesta de un modelo restringida a un formato JSON fijado por un esquema.

### 27. Conclusión

La idea de un formato nativo para IAs retoma una tradición de sesenta años: separar el contenido de su presentación, como propusieron Tunnicliffe y Goldfarb con la marcación genérica, y describir su significado para que lo usen máquinas, como propusieron Berners-Lee, Hendler y Lassila con la web semántica. Lo nuevo es el consumidor: modelos de lenguaje que leen en tokens, buscan en fragmentos y se pierden en contextos largos y ruidosos, como mostraron Lewis y colaboradores con RAG y Liu y colaboradores con la información perdida en el medio.

aidoc es una especificación mínima y un conversor de referencia que muestran que la idea es viable: el ejemplo pasa de 493 a 183 tokens, conserva la estructura, corta fragmentos con contexto y los firma con huellas verificables. Es memoización en el sentido de Michie: interpretar una vez, reusar muchas. La comparativa con Docling y MarkItDown en cinco documentos reales mostró que, en HTML, aidoc deja tan pocos tokens como el mejor de los otros, conserva los enlaces y es el más rápido. Su debilidad declarada sigue siendo el alcance (sin PDF), que esas herramientas ya cubren. La validación contra el esquema ya es completa, los tokens se pueden contar con el tokenizador de Claude y las descripciones de imágenes guardan qué modelo las hizo. Los próximos pasos son probar esas llamadas con una key real, medir la utilidad con preguntas y respuestas y escribir la versión 0.2 de la especificación. Como enseña la historia de Schema.org, el éxito de un formato así no depende de su elegancia técnica sino de que quien publica gane algo al adoptarlo.

## Referencias

- Anthropic. (2024). *Introducing Contextual Retrieval*. https://www.anthropic.com/news/contextual-retrieval
- Anthropic. (s. f.-a). *Pricing*. Claude Platform Docs. https://platform.claude.com/docs/en/about-claude/pricing
- Anthropic. (s. f.-b). *Token counting*. Claude Platform Docs. https://platform.claude.com/docs/en/build-with-claude/token-counting
- Anthropic. (s. f.-c). *Structured outputs*. Claude Platform Docs. https://platform.claude.com/docs/en/build-with-claude/structured-outputs
- Anthropic. (s. f.-d). *Vision*. Claude Platform Docs. https://platform.claude.com/docs/en/build-with-claude/vision
- Auer, C., Lysak, M., Nassar, A., Dolfi, M., Livathinos, N., Vagenas, P., et al. (2024). *Docling Technical Report*. arXiv:2408.09869. https://doi.org/10.48550/arXiv.2408.09869
- Benet, J. (2014). *IPFS — Content Addressed, Versioned, P2P File System*. arXiv:1407.3561. https://doi.org/10.48550/arXiv.1407.3561
- Berners-Lee, T., Hendler, J., & Lassila, O. (2001). The Semantic Web. *Scientific American*, 284(5), 34–43. https://doi.org/10.1038/scientificamerican0501-34
- Bray, T. (Ed.). (2017). *The JavaScript Object Notation (JSON) Data Interchange Format* (RFC 8259). Internet Engineering Task Force. https://doi.org/10.17487/RFC8259
- Diffie, W., & Hellman, M. E. (1976). New directions in cryptography. *IEEE Transactions on Information Theory*, 22(6), 644–654. https://doi.org/10.1109/TIT.1976.1055638
- Goldfarb, C. F. (1990). *The SGML Handbook*. Oxford University Press. https://archive.org/details/sgmlhandbook0000gold
- Guha, R. V., Brickley, D., & Macbeth, S. (2016). Schema.org: Evolution of structured data on the web. *Communications of the ACM*, 59(2), 44–51. https://doi.org/10.1145/2844544
- Howard, J. (2024). *The /llms.txt file*. https://llmstxt.org/
- ISO. (2012). *ISO 14721:2012. Space data and information transfer systems — Open archival information system (OAIS) — Reference model*. International Organization for Standardization. https://www.iso.org/standard/57284.html
- ISO. (2017). *ISO 15836-1:2017. Information and documentation — The Dublin Core metadata element set — Part 1: Core elements*. International Organization for Standardization. https://www.iso.org/standard/71339.html
- JSON Schema. (s. f.). *JSON-Schema-Test-Suite* [repositorio]. https://github.com/json-schema-org/JSON-Schema-Test-Suite
- Klyne, G., & Newman, C. (2002). *Date and Time on the Internet: Timestamps* (RFC 3339). Internet Engineering Task Force. https://doi.org/10.17487/RFC3339
- Kohlschütter, C., Fankhauser, P., & Nejdl, W. (2010). Boilerplate detection using shallow text features. En *Proceedings of the Third ACM International Conference on Web Search and Data Mining* (pp. 441–450). ACM. https://doi.org/10.1145/1718487.1718542
- Koster, M., Illyes, G., Zeller, H., & Sassman, L. (2022). *Robots Exclusion Protocol* (RFC 9309). Internet Engineering Task Force. https://doi.org/10.17487/RFC9309
- Levenshtein, V. I. (1966). Binary codes capable of correcting deletions, insertions, and reversals. *Soviet Physics Doklady*, 10(8), 707–710. Original en ruso: *Doklady Akademii Nauk SSSR*, 163(4), 845–848 (1965). https://www.mathnet.ru/eng/dan31411
- Lewis, P., Perez, E., Piktus, A., Petroni, F., Karpukhin, V., Goyal, N., et al. (2020). Retrieval-augmented generation for knowledge-intensive NLP tasks. *Advances in Neural Information Processing Systems*, 33, 9459–9474. https://proceedings.neurips.cc/paper/2020/hash/6b493230205f780e1bc26945df7481e5-Abstract.html
- Liu, N. F., Lin, K., Hewitt, J., Paranjape, A., Bevilacqua, M., Petroni, F., & Liang, P. (2024). Lost in the middle: How language models use long contexts. *Transactions of the Association for Computational Linguistics*, 12, 157–173. https://doi.org/10.1162/tacl_a_00638
- Longpre, S., Mahari, R., Lee, A., Lund, C., Oderinwale, H., Brannon, W., et al. (2024). *Consent in Crisis: The Rapid Decline of the AI Data Commons*. arXiv:2407.14933. https://doi.org/10.48550/arXiv.2407.14933
- MacFarlane, J. (2014–2024). *CommonMark Spec*. https://spec.commonmark.org
- Merkle, R. C. (1988). A digital signature based on a conventional encryption function. En *Advances in Cryptology — CRYPTO '87* (pp. 369–378). Springer. https://doi.org/10.1007/3-540-48184-2_32
- Michie, D. (1968). "Memo" functions and machine learning. *Nature*, 218, 19–22. https://doi.org/10.1038/218019a0
- Microsoft. (s. f.). *MarkItDown* [repositorio]. https://github.com/microsoft/markitdown
- NIST. (2015). *FIPS PUB 180-4: Secure Hash Standard (SHS)*. National Institute of Standards and Technology. https://doi.org/10.6028/NIST.FIPS.180-4
- OpenAI. (s. f.). *tiktoken* [repositorio]. https://github.com/openai/tiktoken
- Radford, A., Kim, J. W., Xu, T., Brockman, G., McLeavey, C., & Sutskever, I. (2023). Robust speech recognition via large-scale weak supervision. En *Proceedings of the 40th International Conference on Machine Learning* (pp. 28492–28518). PMLR. https://proceedings.mlr.press/v202/radford23a.html
- Rajpurkar, P., Zhang, J., Lopyrev, K., & Liang, P. (2016). SQuAD: 100,000+ questions for machine comprehension of text. En *Proceedings of the 2016 Conference on Empirical Methods in Natural Language Processing* (pp. 2383–2392). https://doi.org/10.18653/v1/D16-1264
- Rivest, R. L., Shamir, A., & Adleman, L. (1978). A method for obtaining digital signatures and public-key cryptosystems. *Communications of the ACM*, 21(2), 120–126. https://doi.org/10.1145/359340.359342
- Sennrich, R., Haddow, B., & Birch, A. (2016). Neural machine translation of rare words with subword units. En *Proceedings of the 54th Annual Meeting of the Association for Computational Linguistics* (pp. 1715–1725). https://doi.org/10.18653/v1/P16-1162
- Smith, R. (2007). An overview of the Tesseract OCR engine. En *Proceedings of the Ninth International Conference on Document Analysis and Recognition* (vol. 2, pp. 629–633). IEEE. https://doi.org/10.1109/ICDAR.2007.4376991
- W3C. (2013). *PROV-O: The PROV Ontology*. World Wide Web Consortium Recommendation. https://www.w3.org/TR/prov-o/
- Wright, A., Andrews, H., & Hutton, B. (2022). *JSON Schema Validation: A Vocabulary for Structural Validation of JSON* (draft 2020-12). https://json-schema.org/draft/2020-12/json-schema-validation
- Wright, A., Andrews, H., Hutton, B., & Dennis, G. (2022). *JSON Schema: A Media Type for Describing JSON Documents* (draft 2020-12). https://json-schema.org/draft/2020-12/json-schema-core
- Zhong, X., ShafieiBavani, E., & Jimeno Yepes, A. (2020). Image-based table recognition: Data, model, and evaluation. En *Computer Vision — ECCV 2020* (pp. 564–580). Springer. https://doi.org/10.1007/978-3-030-58589-1_34
