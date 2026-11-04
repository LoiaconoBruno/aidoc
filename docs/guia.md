# Documentos pre-digeridos para IAs: paper de uso y guía de la idea

## Resumen

Este documento acompaña a **aidoc**, un conversor y una especificación (versión 0.1) de un paquete "pre-digerido" para inteligencias artificiales. La idea de fondo es *digerir una vez, usar muchas veces*: quien produce un documento genera también una versión estructurada para máquinas, y cualquier IA la usa sin repetir el trabajo de extraer todo. La herramienta convierte HTML, Markdown o texto en un archivo `.aidoc.json` con texto canónico, metadatos, secciones, fragmentos con huella SHA-256, tablas, enlaces, imágenes y una medición de tokens, y valida paquetes existentes.

La primera parte es un paper de uso: entrada, botones, pestañas, el ejemplo del efecto Janssen resuelto con los números de la herramienta, el formato del paquete y los límites. La segunda es una guía de la idea, que recorre la larga historia de separar contenido de presentación (de SGML y HTML a la web semántica de Berners-Lee, Hendler y Lassila y a Schema.org), la limpieza de páginas web (Kohlschütter y la detección de "boilerplate"), la tokenización de los modelos de lenguaje (la codificación por pares de bytes de Gage y de Sennrich, Haddow y Birch), la generación aumentada por recuperación de Lewis y colaboradores y el problema de la información "perdida en el medio" de Liu y colaboradores, las funciones de hash criptográficas y el direccionamiento por contenido (Merkle, Git, IPFS), la procedencia de los datos (W3C PROV, Dublin Core, OAIS) y las propuestas contemporáneas más cercanas: llms.txt de Jeremy Howard, Docling de IBM y MarkItDown de Microsoft. La tesis es que **leer un formato es barato; lo caro es interpretarlo**, y que un estándar útil tiene que guardar esa interpretación, no los datos crudos.

## Parte I. Paper de uso

### 1. Qué es la herramienta

aidoc es una página estática sin dependencias que se abre desde la [demo en vivo](https://loiaconobruno.github.io/aidoc/) o con doble clic en `index.html`. Todo se procesa en el navegador: el contenido no sale de la computadora.

La página tiene tres zonas:

1. **Entrada:** "Cargar ejemplo", "Abrir archivo" (acepta `.html`, `.md` y `.txt`), un área de texto para pegar contenido, el deslizador "Tamaño máximo de cada fragmento" (200 a 3000 caracteres, 1200 por defecto) y el botón "Convertir". Debajo, "Elegir archivo .aidoc.json" para validar un paquete.
2. **Medición:** tokens del original, tokens del texto canónico, ahorro, tipo detectado e idioma.
3. **Resultado,** en cuatro pestañas: Texto canónico, Estructura, Fragmentos y Paquete JSON, con el botón "Descargar .aidoc.json".

La lógica está en `src/markdown.js` (HTML a Markdown) y `src/aidoc.js` (el paquete), sin acceso al DOM. La especificación formal está en `spec/aidoc-0.1.schema.json`. Los tests se corren con `npm test` (Node 18 o más nuevo).

### 2. Instalación

```bash
git clone https://github.com/LoiaconoBruno/aidoc.git
cd aidoc
npm test
```

Después se abre `index.html` con doble clic.

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
| `imagenes` | Texto alternativo, origen y dos campos reservados: `descripcion` y `textoDetectado` (en la versión 0.1, siempre `null`) |
| `medicion` | Método de estimación, tokens del original, tokens del texto y ahorro |

### 4. Ejemplo resuelto

1. **Cargar ejemplo.** Es una página HTML sobre el efecto Janssen con todo el ruido típico de la web: menú de navegación, un banner, scripts de analítica, estilos y pie de página. Tiene 1972 caracteres.
2. **Convertir.** La medición muestra **493 tokens** en el original y **183** en el texto canónico: **63 %** de ahorro. Tipo detectado: `text/html`; idioma: `es`.
3. **Texto canónico.** Empieza así:

```
# El efecto Janssen en silos

En un tubo lleno de grano, las paredes sostienen parte del peso por **rozamiento**. Por eso la presión en el fondo deja de crecer: es el *efecto Janssen*, descripto en 1895.

## Cómo se calcula
...
```

El menú, el banner, los scripts y el pie desaparecieron. El énfasis (negrita, cursiva), los títulos, la fórmula en un bloque de código y la lista se conservan en Markdown.

4. **Estructura.** Tres secciones:

| Id | Nivel | Título | Ruta | Posición |
|---|---|---|---|---|
| s1 | 1 | El efecto Janssen en silos | El efecto Janssen en silos | 0–205 |
| s2 | 2 | Cómo se calcula | El efecto Janssen en silos › Cómo se calcula | 205–464 |
| s3 | 2 | Valores típicos | El efecto Janssen en silos › Valores típicos | 464–729 |

Una tabla con encabezados Material · Densidad (kg/m³) · μ y dos filas (Arroz, 800, 0,4; Trigo, 780, 0,35). Una imagen con texto alternativo "Corte de un silo con las fuerzas sobre las paredes". Un enlace a la Wikipedia.

5. **Fragmentos.** Tres, uno por sección (ninguna supera los 1200 caracteres). El primero va de la posición 0 a la 203, con la ruta `["El efecto Janssen en silos"]` y una huella `sha256:d93da4…`.
6. **Descargar y validar.** "Descargar .aidoc.json" guarda el paquete. "Elegir archivo .aidoc.json" lo valida: revisa la forma y que cada fragmento coincida con el texto en la posición indicada y con su huella. Si alguien altera un fragmento (por ejemplo, cambia "1895" por "1985"), la validación avisa que no coincide.

### 5. Cómo leer los resultados

- **El ahorro** mide cuánto ruido se sacó. En páginas web reales, con publicidad, menús y scripts, suele ser mucho mayor que en el ejemplo. En un Markdown limpio, cercano a cero.
- **Los fragmentos** son las unidades que un sistema de búsqueda le pasaría a una IA. Su ruta de títulos le da contexto: un fragmento que dice "Arroz, 800, 0,4" es mucho más útil si se sabe que está en "Valores típicos" de un texto sobre el efecto Janssen.
- **Las huellas** permiten verificar que un fragmento no fue alterado y reconocer fragmentos idénticos en documentos distintos sin compararlos letra por letra.
- **Los tokens** son una estimación gruesa (1 token ≈ 4 caracteres): sirven para comparar, no para calcular costos de un modelo concreto.

#### 5.1 Preguntas frecuentes

**¿Por qué Markdown y no HTML limpio?** Porque Markdown es el formato que los modelos de lenguaje manejan con más naturalidad (gran parte de su entrenamiento incluye texto en Markdown) y ocupa menos tokens que el HTML equivalente: `## Título` en vez de `<h2>Título</h2>`.

**¿Qué pasa si la página tiene `<main>` o `<article>`?** El conversor usa solo ese contenido ("modo lectura") y descarta el resto. Es la convención de HTML5 para marcar el contenido principal.

**¿Por qué el tamaño de fragmento por defecto es 1200 caracteres?** Es un compromiso habitual en sistemas de búsqueda para IAs: unos 300 tokens, suficientes para contener una idea completa y chicos como para que varios entren en el contexto de un modelo. Se puede cambiar con el deslizador.

**¿Por qué no hay embeddings (vectores) en el paquete?** Porque los vectores que produce un modelo no le sirven a otro: cada modelo tiene su propio espacio. Un paquete con vectores quedaría atado a un modelo. El texto, en cambio, lo puede usar cualquiera.

**¿Cómo detecta el idioma?** Cuenta palabras funcionales muy frecuentes del español (el, la, de, que, y…) y del inglés (the, of, and, to…). Si hay menos de cinco en total, dice "desconocido". Es una heurística simple que funciona bien con textos de unas decenas de palabras en esos dos idiomas.

#### 5.2 Un vistazo al paquete

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
  "imagenes": [ { "alt": "Corte de un silo…", "src": "silo.jpg", "descripcion": null, "textoDetectado": null } ],
  "medicion": { "metodo": "1 token ≈ 4 caracteres", "tokensOriginal": 493, "tokensTexto": 183, "ahorro": 0.63 }
}
```

Lo que se ve de un vistazo: el texto es uno solo, y todo lo demás apunta a posiciones dentro de él. Los fragmentos no repiten un texto "parecido": son, por construcción, pedazos exactos del texto canónico, y la huella lo garantiza.

#### 5.3 Recorrido guiado

1. **Cargá el ejemplo** y mirá primero el HTML en el área de texto. Contá cuántas líneas son de menú, scripts y estilos.
2. **Convertí** y compará con el texto canónico. *¿Qué se perdió que importe?* Nada del contenido; *¿qué se perdió que no importe?* Todo lo demás.
3. **Mirá Estructura** y fijate cómo la tabla HTML quedó en encabezados y filas, sin estilos.
4. **Bajá el tamaño de fragmento a 200** y convertí de nuevo. Mirá cómo se cortan las secciones y si algún corte separa una idea.
5. **Pegá un Markdown propio** (por ejemplo, un README) y mirá el ahorro: debería ser casi cero, porque Markdown ya es el formato canónico.
6. **Descargá el paquete, alteralo y validalo.** Cambiá una letra de un fragmento con un editor de texto y elegí el archivo en "Elegir archivo .aidoc.json".

### 6. Limitaciones

- Solo texto: no transcribe audio ni video, ni describe imágenes ni les hace reconocimiento de caracteres (los campos `descripcion` y `textoDetectado` quedan en `null`).
- No lee PDF ni archivos de Office.
- El conversor de HTML es simple: páginas armadas con JavaScript, o con estructuras raras, pueden salir incompletas.
- La validación integrada revisa forma e integridad, pero no implementa JSON Schema completo.
- La estimación de tokens es aproximada y no corresponde a ningún modelo en particular.
- No incluye embeddings.

## Parte II. Guía de la idea

### 7. La idea: un lenguaje nativo para IAs

La idea original se llamaba "lenguaje de estructuración nativo para IAs". Partía de una observación sobre cómo las IAs consumen documentos hoy: cada vez que un modelo lee una página web, un PDF o una planilla, alguien (el modelo mismo o un programa intermedio) tiene que extraer el texto, sacar el ruido, reconocer los títulos, entender las tablas y describir las imágenes. Ese trabajo se repite cada vez que cualquier IA lee ese documento.

La propuesta es invertir el orden: que quien **produce** el documento genere, una sola vez, una versión estructurada y verificable para máquinas, y que todas las IAs usen esa versión. Es la lógica de *digerir una vez, usar muchas veces*.

La herramienta convierte esa idea en dos cosas concretas: una **especificación** (qué tiene que contener la versión para máquinas) y un **conversor de referencia** (un programa que la genera a partir de documentos comunes). También mide lo que se gana, en tokens. Esta guía cuenta de dónde vienen las piezas de la especificación y qué propuestas parecidas existen.

### 8. Separar contenido de presentación: una historia larga

#### 8.1 SGML y la marcación genérica

La idea de que un documento debería describir su **estructura** (esto es un título, esto es una cita) y no su **apariencia** (esto va en negrita de 14 puntos) es de los años sesenta. William Tunnicliffe la presentó en 1967 bajo el nombre de **codificación genérica**. Charles Goldfarb, Edward Mosher y Raymond Lorie la desarrollaron en IBM como GML (1969), y Goldfarb lideró después su estandarización como **SGML** (*Standard Generalized Markup Language*), norma ISO 8879 de 1986. Goldfarb la explicó en *The SGML Handbook* (1990).

La lógica de SGML es la misma que la de la idea: si el documento dice qué es cada parte, cualquier programa puede presentarlo, indexarlo o transformarlo sin adivinar.

#### 8.2 HTML y lo que la web hizo con él

Tim Berners-Lee diseñó HTML en 1990-1991 como una aplicación simple de SGML para el CERN. Los primeros documentos HTML eran casi pura estructura. Pero a medida que la web creció, HTML se llenó de presentación (tablas para maquetar, etiquetas de fuente, colores) y después de comportamiento (scripts). Una página web moderna tiene, a menudo, más código de menús, publicidad, analítica y estilos que contenido. El ejemplo de la herramienta, con 493 tokens de los que solo 183 son contenido, es una página web chica y bastante limpia; en páginas reales, la proporción de ruido es mucho mayor.

Las hojas de estilo CSS (Håkon Wium Lie, 1994) y las etiquetas semánticas de HTML5 (`<main>`, `<article>`, `<nav>`, `<aside>`, 2014) fueron intentos de volver a separar contenido de presentación. El conversor de la herramienta aprovecha esas etiquetas: usa `<main>` o `<article>` si existen y descarta `<nav>`, `<form>`, `<script>` y `<style>`.

#### 8.3 Markdown

En 2004, John Gruber, con la colaboración de Aaron Swartz, publicó **Markdown**: una sintaxis para escribir texto con estructura que se lee bien sin procesar (`#` para títulos, `*` para énfasis, `-` para listas) y se convierte fácilmente a HTML. Markdown se volvió el formato de facto de la documentación técnica, los foros y los repositorios de código. Como la especificación original era ambigua, John MacFarlane y colaboradores publicaron en 2014 **CommonMark**, una especificación rigurosa con miles de casos de prueba.

Para los modelos de lenguaje, Markdown tiene una ventaja doble: es compacto (pocos símbolos de marcación) y está masivamente presente en sus datos de entrenamiento. Por eso el texto canónico de aidoc es Markdown.

### 9. La web semántica y Schema.org

#### 9.1 Berners-Lee, Hendler y Lassila, 2001

En mayo de 2001, Tim Berners-Lee, James Hendler y Ora Lassila publicaron en *Scientific American* (284(5), 34–43) un artículo titulado *The Semantic Web*. Proponían una web en la que el contenido estuviera marcado con significado legible por máquinas, de modo que **agentes de software** pudieran entenderlo y actuar: buscar un médico que atienda cerca, con turno disponible, que acepte cierta obra social. Es, casi palabra por palabra, la promesa de los agentes de IA actuales.

La web semántica desarrolló estándares (RDF, OWL, SPARQL) pero tuvo una adopción limitada fuera de ámbitos especializados. Una de las razones fue el costo: marcar el significado de todo era trabajo extra para quien publicaba, sin beneficio inmediato.

#### 9.2 Schema.org, 2011

En 2011, Google, Microsoft, Yahoo y Yandex lanzaron **Schema.org**, un vocabulario compartido para marcar datos estructurados en páginas web: una receta, un evento, un producto, una persona. Ramanathan Guha, Dan Brickley y Steve Macbeth contaron su evolución en *Communications of the ACM* (59(2), 44–51, 2016). Schema.org sí se adoptó masivamente, por una razón concreta: los buscadores usaban esos datos para mostrar resultados enriquecidos (estrellas, precios, horarios), y eso daba tráfico.

La lección para la idea es directa: un formato para máquinas se adopta si quien publica obtiene algo a cambio. Para aidoc, el incentivo sería que las IAs citen, encuentren y usen mejor el contenido de quien publica el paquete.

### 10. Sacar el ruido: la limpieza de páginas web

#### 10.1 El problema del "boilerplate"

En la recuperación de información se llama *boilerplate* al contenido repetitivo de una página que no es el contenido principal: menús, encabezados, pies, publicidad, enlaces relacionados. Christian Kohlschütter, Peter Fankhauser y Wolfgang Nejdl mostraron en 2010 (*Proceedings of the Third ACM International Conference on Web Search and Data Mining*, 441–450) que se puede detectar con rasgos muy simples del texto, como la cantidad de palabras de cada bloque y la densidad de enlaces: los bloques de contenido tienen oraciones largas y pocos enlaces; los menús, palabras sueltas y muchos enlaces.

#### 10.2 El modo lectura

En 2009, la empresa Arc90 publicó **Readability**, un programa que extraía el artículo principal de una página y lo mostraba limpio. Su lógica (puntuar cada bloque según la cantidad de texto, comas y párrafos, y penalizar los que tienen clases como "sidebar" o "comment") inspiró los "modos lectura" de Safari, Firefox y otros navegadores. El conversor de aidoc usa una versión mínima de esa idea: si la página marca su contenido con `<main>` o `<article>`, se queda solo con eso.

#### 10.3 Por qué esto importa para una IA

Una IA que lee una página sin limpiar gasta tokens (y por lo tanto dinero y espacio de contexto) en menús y scripts, y corre el riesgo de confundir un enlace del menú con contenido. Además, si la página tiene texto oculto o instrucciones disimuladas en partes que un humano no ve, la IA puede leerlas: es una de las vías de la **inyección de instrucciones**, un problema de seguridad conocido de los sistemas basados en modelos de lenguaje. Un texto canónico generado por quien publica, verificado con huellas, reduce ese riesgo, aunque no lo elimina.

### 11. Tokens: la unidad de cuenta de las IAs

#### 11.1 Qué es un token

Los modelos de lenguaje no leen letras ni palabras sino **tokens**: fragmentos de texto de longitud variable, típicamente partes de palabras. "efecto" puede ser un token; "rozamiento" puede ser dos o tres. El costo de usar un modelo, su velocidad y la cantidad de texto que puede considerar a la vez (su **ventana de contexto**) se miden en tokens.

#### 11.2 La codificación por pares de bytes

La técnica de tokenización más usada viene de un algoritmo de compresión. Philip Gage publicó en 1994 la **codificación por pares de bytes** (BPE) en *The C Users Journal* (12(2), 23–38): reemplazar repetidamente el par de bytes más frecuente por un símbolo nuevo. Rico Sennrich, Barry Haddow y Alexandra Birch la adaptaron en 2016 para traducción automática (*Proceedings of the 54th Annual Meeting of the Association for Computational Linguistics*, 1715–1725): empezando por caracteres, se fusionan los pares más frecuentes hasta tener un vocabulario de decenas de miles de unidades. El resultado es que las palabras frecuentes son un token y las raras se arman con varios.

Una consecuencia práctica es que el mismo texto ocupa distinta cantidad de tokens según el idioma: los tokenizadores entrenados con mucho inglés son más eficientes en inglés que en español. La regla gruesa de 1 token ≈ 4 caracteres que usa aidoc es una aproximación para inglés; en español suele haber algo más de tokens por carácter. Medir con un tokenizador real es uno de los próximos pasos del proyecto.

#### 11.3 Lo que cuesta el ruido

Con la estimación de la herramienta, el ejemplo pasa de 493 a 183 tokens. Si mil IAs leen esa página una vez cada una, la diferencia es de 310 000 tokens. Si la página tiene un millón de lecturas por IAs, de 310 millones. La propuesta de digerir una vez es, en el fondo, una cuenta de escala: el costo de generar el paquete se paga una vez; el ahorro se cobra en cada lectura.

#### 11.4 ¿Las ventanas de contexto enormes vuelven inútil la limpieza?

Los modelos de lenguaje pasaron de ventanas de contexto de unos pocos miles de tokens (2020) a cientos de miles y hasta millones (2024-2026). Una objeción razonable a la idea es: si un modelo puede leer un libro entero de una vez, ¿para qué limpiar y fragmentar?

Hay tres respuestas. La primera es el **costo**: aunque el modelo pueda leer un millón de tokens, cada token se paga, en dinero y en tiempo de respuesta. Un ahorro del 63 % es un ahorro del 63 % con cualquier ventana. La segunda es la **calidad**: el trabajo de Liu y colaboradores (sección 12.3) y muchos posteriores muestran que, con contextos largos, los modelos usan peor la información del medio y se distraen con contenido irrelevante. Menos ruido da mejores respuestas, no solo más baratas. La tercera es la **escala**: una IA que responde preguntas sobre millones de documentos no puede ponerlos todos en su contexto, por grande que sea. Necesita buscar, y para buscar necesita fragmentos.

Las ventanas grandes sí cambian algo: hacen menos crítico el tamaño exacto de los fragmentos y permiten pasar secciones completas en vez de pedazos. Por eso el tamaño de fragmento de aidoc es configurable, y por eso el paquete guarda también las secciones completas con sus posiciones: un sistema con ventana grande puede usar secciones; uno con ventana chica, fragmentos.

### 12. Fragmentos y búsqueda: cómo usan las IAs los documentos

#### 12.1 Generación aumentada por recuperación

En 2020, Patrick Lewis y colaboradores de Facebook AI presentaron la **generación aumentada por recuperación** (RAG, por su sigla en inglés) en *Advances in Neural Information Processing Systems* (33, 9459–9474). La idea es que un modelo, en vez de responder solo con lo que aprendió en su entrenamiento, primero **busque** fragmentos relevantes en una colección de documentos y después genere la respuesta usándolos. Es la arquitectura de la mayoría de los asistentes que responden sobre documentos de una empresa o de un usuario.

Para que RAG funcione, los documentos tienen que estar partidos en **fragmentos** (*chunks*) de tamaño manejable. Cómo se cortan importa mucho: un corte en mitad de una oración o de una tabla produce fragmentos sin sentido; un corte que separa un dato de su contexto produce respuestas erróneas.

#### 12.2 Cómo corta aidoc

El conversor corta cada **sección** en fragmentos de hasta el tamaño máximo, preferentemente entre párrafos (busca un doble salto de línea en el tramo final permitido, y solo corta en otro lado si el párrafo es más largo que el máximo). Nunca mezcla dos secciones en un fragmento. Y cada fragmento lleva su **ruta de títulos**: la lista de títulos que lo contienen. Así, un fragmento de la tabla de valores típicos lleva consigo la información de que está en "El efecto Janssen en silos › Valores típicos".

Esa ruta resuelve un problema conocido: un fragmento aislado pierde el contexto que el documento le daba. Anthropic publicó en 2024 una técnica llamada *contextual retrieval*, que agrega a cada fragmento un breve resumen de su contexto antes de indexarlo, y reportó mejoras importantes en la búsqueda. La ruta de títulos de aidoc es una versión mínima y determinista de esa idea, que no requiere un modelo.

#### 12.3 Perdidos en el medio

Nelson Liu y colaboradores mostraron en *Lost in the middle: How language models use long contexts* (*Transactions of the Association for Computational Linguistics*, 12, 157–173, 2024) que los modelos de lenguaje usan mejor la información que está al principio o al final de su contexto que la que está en el medio. Con contextos largos y ruidosos, la información relevante puede perderse. Pasarle a un modelo fragmentos limpios y relevantes, en vez de páginas enteras con ruido, no es solo una cuestión de costo: mejora las respuestas.

### 13. Huellas: verificar sin comparar

#### 13.1 Funciones de hash

Una **función de hash criptográfica** toma un texto de cualquier longitud y devuelve una cadena de longitud fija, la **huella** (*digest*), con tres propiedades: es fácil de calcular, es prácticamente imposible encontrar otro texto con la misma huella, y un cambio mínimo en el texto cambia la huella por completo. **SHA-256**, de la familia SHA-2 diseñada por la Agencia de Seguridad Nacional de Estados Unidos y publicada por el NIST en 2001 (hoy en la norma FIPS 180-4, 2015), produce huellas de 256 bits, que se escriben como 64 caracteres hexadecimales.

aidoc implementa SHA-256 en JavaScript, sin depender de la función del navegador (`crypto.subtle`, que no está disponible en todos los contextos, por ejemplo al abrir la página desde un archivo local), y uno de los tests lo verifica contra los vectores de prueba estándar del NIST.

#### 13.2 Para qué sirven en el paquete

- **Integridad:** si alguien modifica un fragmento, su huella deja de coincidir. La validación de aidoc lo detecta.
- **Identidad del original:** la huella del documento original en los metadatos permite saber si el paquete corresponde a una versión determinada. Si el original cambia, la huella cambia, y cualquier sistema puede saber que el paquete quedó viejo.
- **Deduplicación:** dos fragmentos con la misma huella son idénticos, aunque estén en documentos distintos. Un sistema que indexa millones de documentos puede guardar una sola vez cada fragmento repetido (avisos legales, pies de página, citas).

#### 13.3 Direccionamiento por contenido

Ralph Merkle propuso en 1979 los **árboles de hash** (patentados en 1982 y publicados en *Advances in Cryptology — CRYPTO '87*, 1988): una estructura en la que cada nodo guarda la huella de sus hijos, de modo que la huella de la raíz verifica todo el conjunto. Linus Torvalds diseñó en 2005 el sistema de control de versiones **Git** sobre esa idea: cada archivo, cada directorio y cada versión se identifican por la huella de su contenido. Juan Benet propuso en 2014 **IPFS**, un sistema de archivos distribuido en el que los archivos se piden por su huella, no por su ubicación.

Un paquete aidoc, con huellas por fragmento y por original, está a un paso de ese modelo: un fragmento podría citarse por su huella, y cualquiera podría verificar que la cita es exacta.

### 14. Metadatos y procedencia: saber de dónde viene

#### 14.1 Dublin Core

En 1995, en un taller en Dublin, Ohio, bibliotecarios e informáticos acordaron un conjunto mínimo de quince elementos para describir recursos digitales: título, creador, tema, descripción, editor, colaborador, fecha, tipo, formato, identificador, fuente, idioma, relación, cobertura y derechos. El **Dublin Core** se convirtió en la norma ISO 15836. Los metadatos de aidoc (título, idioma, fuente, tipo original, fecha) son un subconjunto de esa tradición.

#### 14.2 OAIS y la preservación

El **modelo OAIS** (*Open Archival Information System*, norma ISO 14721, primera versión de 2003) define cómo un archivo digital debe guardar información para que siga siendo usable en el futuro. Una de sus ideas centrales es que, junto con los datos, hay que guardar la **información de representación** (cómo interpretarlos) y la **información de procedencia** (de dónde vienen y qué transformaciones sufrieron). Un paquete aidoc es, en ese lenguaje, un paquete de información con su interpretación incluida.

#### 14.3 Quién generó qué

Uno de los próximos pasos del proyecto es agregar descripciones de imágenes y transcripciones generadas por modelos, guardando **qué modelo** las generó. Es una exigencia de procedencia: un texto escrito por el autor y una descripción generada por una IA no tienen el mismo valor, y quien use el paquete tiene que poder distinguirlos. El W3C publicó en 2013 el modelo **PROV** para representar la procedencia de datos (entidades, actividades y agentes), y desde 2021 la Coalición para la Procedencia y Autenticidad del Contenido (C2PA) desarrolla estándares para certificar el origen de imágenes y videos, incluidos los generados por IA. Un aidoc futuro podría usar esos modelos para marcar cada campo con su origen.

### 15. Propuestas contemporáneas

#### 15.1 llms.txt

En septiembre de 2024, Jeremy Howard, cofundador de fast.ai, propuso **llms.txt**: un archivo en la raíz de un sitio web, en Markdown, que resume el sitio para modelos de lenguaje y enlaza a versiones en Markdown de las páginas más importantes. Es una idea emparentada con `robots.txt` (que dice a los buscadores qué pueden indexar) y con `sitemap.xml`. Varios sitios de documentación técnica lo adoptaron rápidamente.

llms.txt y aidoc comparten la premisa (que los sitios ofrezcan una versión para IAs) pero difieren en el alcance: llms.txt es un índice en texto libre; aidoc es un paquete estructurado por documento, con secciones, fragmentos, huellas y medición. Podrían complementarse: un llms.txt podría enlazar a los `.aidoc.json` de cada página.

#### 15.2 Docling

IBM Research publicó en 2024 **Docling** (Christoph Auer y colaboradores, *Docling Technical Report*, arXiv:2408.09869), un conversor de código abierto que transforma PDF, Word, PowerPoint e imágenes en Markdown o JSON estructurado, usando modelos de visión para reconocer el diseño de la página, las tablas y las fórmulas. Docling resuelve el problema más difícil, el de los PDF, que aidoc no aborda.

#### 15.3 MarkItDown

Microsoft publicó en 2024 **MarkItDown**, una biblioteca de Python que convierte muchos formatos (PDF, Office, HTML, imágenes, audio) a Markdown pensado para modelos de lenguaje. Es más simple que Docling y prioriza la cobertura de formatos.

#### 15.4 Cómo comparar conversores

El primer próximo paso es comparar aidoc con Docling y MarkItDown en cinco archivos propios. ¿Qué medir?

- **Tokens.** Cuántos tokens tiene la salida, con un tokenizador real. Menos no siempre es mejor: un conversor que pierde contenido también ahorra tokens.
- **Tiempo.** Cuánto tarda cada conversión. Los conversores con modelos de visión son mucho más lentos que uno basado en reglas.
- **Fidelidad del texto.** Cuánto difiere el texto extraído del texto real del documento. Se mide con la **distancia de edición** que Vladimir Levenshtein definió en 1966 (el mínimo de inserciones, borrados y sustituciones de caracteres para pasar de un texto a otro), normalizada por la longitud.
- **Fidelidad de la estructura.** Si los títulos, las listas y las tablas se reconocieron como tales. Para tablas, Xu Zhong, Elaheh ShafieiBavani y Antonio Jimeno Yepes propusieron en 2020 una métrica específica, TEDS (*Tree-Edit-Distance-based Similarity*), que compara la estructura de árbol de la tabla extraída con la real.
- **Utilidad final.** La prueba más directa: hacer las mismas preguntas a un modelo con cada versión del documento y comparar las respuestas. Es más caro de medir, pero es lo que importa.

Una comparación honesta va a mostrar, casi seguro, que aidoc pierde en PDF (no los lee) y gana en verificabilidad (los otros no ponen huellas). La conclusión práctica probablemente sea combinar: usar el mejor conversor para cada formato y envolver su salida en un paquete aidoc.

#### 15.5 Qué aporta aidoc

Docling y MarkItDown son **conversores**. aidoc propone además un **formato de paquete** con dos cosas que ellos no incluyen por defecto: huellas por fragmento (verificación e identidad) y medición explícita del ahorro. Comparar los tres con cinco archivos propios, en tokens, tiempo y calidad, es el primer próximo paso del proyecto. Lo más probable es que la mejor arquitectura combine un conversor potente (Docling para PDF) con el formato de paquete de aidoc.

### 16. La especificación

#### 16.1 JSON y JSON Schema

El paquete es un documento **JSON**, el formato de datos que Douglas Crockford popularizó a principios de los 2000 y que Tim Bray estandarizó en la RFC 8259 (2017). La especificación formal está escrita en **JSON Schema**, en su versión 2020-12, un vocabulario para describir qué forma tiene que tener un documento JSON: qué campos son obligatorios, de qué tipo, con qué restricciones. Un esquema permite que cualquier programa, en cualquier lenguaje, valide un paquete sin depender del conversor de referencia.

#### 16.2 Decisiones de diseño

- **Texto canónico único.** Todas las posiciones (de secciones y fragmentos) se refieren a un solo texto. Eso hace verificable que cada fragmento es exactamente un pedazo del texto, sin reformulaciones.
- **Posiciones en caracteres.** Inicio y fin se miden en caracteres del texto canónico, no en bytes ni en tokens, para que no dependan de la codificación ni del modelo.
- **Campos reservados en `null`.** Las imágenes tienen `descripcion` y `textoDetectado` aunque la versión 0.1 no los complete. Así, una versión futura que los complete sigue siendo compatible con los lectores de la 0.1.
- **Sin vectores.** Por la razón dicha: atarían el paquete a un modelo.
- **Versión explícita.** El campo `aidoc` dice qué versión de la especificación usa el paquete, para que los lectores sepan qué esperar.

#### 16.3 Lo que valida la herramienta

La validación integrada revisa que existan los campos obligatorios con el tipo correcto, que cada fragmento coincida exactamente con el texto canónico entre su inicio y su fin, y que su huella SHA-256 coincida con la de ese texto. No implementa JSON Schema completo; para eso, el esquema publicado se puede usar con cualquier validador estándar.

#### 16.4 Qué podría traer una versión 0.2

La especificación es un borrador. Con lo discutido en esta guía, una versión 0.2 podría agregar, sin romper la compatibilidad con la 0.1:

- **Procedencia por campo:** para cada descripción, transcripción o texto detectado, qué modelo lo generó, cuándo y con qué instrucción.
- **Conversor y versión:** qué programa generó el paquete, para que un tercero pueda reproducir la conversión y comparar huellas.
- **Tokens por tokenizador:** además de la estimación gruesa, el recuento con uno o varios tokenizadores concretos, identificados por nombre.
- **Firma opcional:** una firma digital del paquete completo, con la referencia a la clave pública de quien responde por él.
- **Relaciones entre documentos:** enlaces a otros paquetes por su huella, para que un conjunto de documentos (un manual con varios capítulos, por ejemplo) se pueda recorrer sin volver a las páginas originales.

Cada una de esas extensiones responde a un problema que la versión 0.1 deja abierto, y cada una tiene un antecedente en los estándares citados: PROV para la procedencia, las compilaciones reproducibles para el conversor, la criptografía de clave pública para la firma, el direccionamiento por contenido para las relaciones.

### 17. Más allá del texto: imágenes, audio y video

La versión 0.1 deja en `null` la descripción de las imágenes y su texto detectado, y no maneja audio ni video. Es la parte más costosa de "digerir", y por lo tanto la que más se beneficiaría de hacerse una sola vez.

**Texto en imágenes.** El reconocimiento óptico de caracteres (OCR) tiene una historia larga, desde las máquinas de lectura de los años cincuenta hasta **Tesseract**, un motor de OCR que Ray Smith desarrolló en Hewlett-Packard entre 1985 y 1994, que Google liberó como código abierto en 2005 y que Smith describió en 2007 (*Proceedings of the Ninth International Conference on Document Analysis and Recognition*, 629–633). Hoy los modelos de visión y lenguaje leen texto en imágenes con mucha más robustez. Completar `textoDetectado` con OCR es directo.

**Descripción de imágenes.** El texto alternativo (`alt`) de una imagen es, en el mejor de los casos, una frase escrita por el autor para accesibilidad; en el peor, está vacío. Los modelos multimodales actuales pueden describir imágenes con detalle. Una descripción generada una vez y guardada en el paquete, con la marca del modelo que la generó, le ahorra a cada IA lectora tener que procesar la imagen. Y le da a la página, de paso, una mejor accesibilidad para personas ciegas, si el autor la revisa.

**Audio y video.** Transcribir es caro. Alec Radford y colaboradores presentaron en 2023 **Whisper** (*Proceedings of the 40th International Conference on Machine Learning*, 28492–28518), un modelo de reconocimiento del habla entrenado con 680 000 horas de audio, que transcribe con buena calidad en decenas de idiomas. Una transcripción con marcas de tiempo, guardada en el paquete, convertiría un video de una hora en un texto de unos pocos miles de tokens, buscable y citable.

En los tres casos, la regla de procedencia de la sección 14.3 es indispensable: lo que generó un modelo tiene que estar marcado como tal, con el modelo, la fecha y, si es posible, la instrucción usada. Un lector tiene que poder distinguir lo que dijo el autor de lo que interpretó una máquina.

### 18. Riesgos: un paquete que no coincide con el original

Un formato para máquinas generado por quien publica abre una posibilidad incómoda: que el paquete diga algo distinto de lo que dice la página para humanos. En los buscadores, esa práctica tiene nombre, *cloaking* (mostrar a los robots un contenido y a las personas otro), y Google la penaliza desde hace años. Con IAs, el riesgo es el mismo: un sitio podría ofrecer un paquete con afirmaciones, instrucciones o enlaces que no están en la página visible.

aidoc tiene un mecanismo parcial de defensa: la huella del original en los metadatos. Cualquiera que descargue la página puede calcular su huella y compararla. Si coincide, sabe que el paquete dice corresponder a esa versión. Pero eso no garantiza que el **contenido** del paquete sea una conversión fiel; solo que se refiere a ese original. Para verificar la fidelidad hay que volver a convertir y comparar, lo que anula el ahorro.

Hay dos caminos para reforzar la confianza, ninguno implementado en la versión 0.1:

- **Firmas digitales.** Que el paquete esté firmado con la clave privada de quien lo generó, de modo que cualquiera pueda verificar con la clave pública quién lo produjo. Es la criptografía de clave pública que Whitfield Diffie y Martin Hellman propusieron en 1976 (*IEEE Transactions on Information Theory*, 22, 644–654) y que Ron Rivest, Adi Shamir y Leonard Adleman hicieron práctica en 1978 con RSA (*Communications of the ACM*, 21, 120–126). Una firma dice quién responde por el paquete, no si es fiel.
- **Conversores reproducibles.** Que el paquete indique qué conversor y qué versión lo generaron, de modo que un tercero pueda repetir la conversión y comparar las huellas de los fragmentos. Si el conversor es determinista (como el de aidoc), el resultado tiene que ser idéntico bit a bit. Es la lógica de las **compilaciones reproducibles** en software.

Este riesgo no invalida la idea, pero define su alcance: un paquete aidoc es una ayuda, no una autoridad. Una IA que lo usa debería poder, en caso de duda, volver al original.

### 19. Por qué "digerir una vez" funciona: la memoización

La idea de guardar el resultado de un cálculo caro para no repetirlo tiene un nombre en informática: **memoización**. Donald Michie la propuso en 1968 en *Nature* (218, 19–22) con el título *"Memo" functions and machine learning*: una función que recuerda los resultados que ya calculó y los devuelve directamente la próxima vez que recibe los mismos argumentos. Es la base de los cachés, de la programación dinámica y de buena parte de la eficiencia de los sistemas modernos.

aidoc es memoización a escala de la web: la "función" es interpretar un documento (extraer, limpiar, estructurar, cortar), el "argumento" es el documento identificado por su huella, y el "resultado" es el paquete. La huella del original es lo que hace funcionar el esquema: si el documento cambia, la huella cambia, y el paquete viejo se invalida solo.

La memoización funciona cuando el cálculo es caro, el resultado se reusa mucho y la entrada se puede identificar con precisión. Las tres condiciones se cumplen para documentos públicos leídos por IAs: interpretar un PDF complejo con modelos de visión es caro, muchas IAs leen los mismos documentos, y una huella SHA-256 identifica un documento sin ambigüedad.

### 20. Quién decide qué leen las máquinas

Un formato para IAs plantea una pregunta que no es técnica: si quien publica tiene que decidir cómo leen su contenido las máquinas, también tiene que poder decidir **si** lo leen.

#### 20.1 Robots.txt

En 1994, Martijn Koster propuso en una lista de correo una convención simple: un archivo de texto llamado `robots.txt`, en la raíz de cada sitio, que dijera a los programas que recorren la web (los robots o *crawlers*) qué partes podían visitar y cuáles no. No era un estándar ni tenía fuerza legal; funcionaba porque los buscadores lo respetaban. Durante casi treinta años fue una convención informal, hasta que en 2022 la IETF lo publicó como estándar, el **protocolo de exclusión de robots** (RFC 9309), firmado por Koster, Gary Illyes, Henner Zeller y Lizzi Sassman.

`robots.txt` fue pensado para buscadores, en una época en que dejarse indexar tenía un beneficio claro (aparecer en los resultados). Con el entrenamiento de modelos de lenguaje, el intercambio cambió: los mismos robots, u otros nuevos, recolectan el contenido para entrenar modelos que después pueden responder sin mandar tráfico al sitio original.

#### 20.2 El consentimiento en crisis

Shayne Longpre y colaboradores estudiaron en 2024 cómo cambiaron los archivos `robots.txt` y los términos de servicio de los sitios más usados para entrenar modelos de lenguaje. Encontraron que, en apenas un año, una parte considerable de los sitios más importantes de esas colecciones empezó a restringir el acceso de los robots asociados a empresas de IA, y que esas restricciones eran inconsistentes: los términos de servicio decían una cosa y el `robots.txt` otra. Llamaron al fenómeno una "crisis del consentimiento" en los datos comunes de la web.

Para la idea de aidoc, esto tiene dos lecturas. Por un lado, un formato pre-digerido podría empeorar el problema, al facilitar que las máquinas tomen el contenido. Por otro, podría ser parte de la solución: un paquete que quien publica genera voluntariamente puede incluir **condiciones de uso** explícitas (para qué se permite usarlo, si se permite entrenar, cómo citar), algo que una página web cruda no expresa de manera legible por máquinas. Agregar un campo de licencia y de usos permitidos sería natural en una versión futura de la especificación.

### 21. Medir si un paquete sirve: preguntas y respuestas

La medición de aidoc es de tokens: cuánto ruido se sacó. Pero lo que importa es si una IA **responde mejor** con el paquete que con la página original. Eso se mide con preguntas.

La manera estándar viene de la investigación en comprensión lectora automática. En 2016, Pranav Rajpurkar, Jian Zhang, Konstantin Lopyrev y Percy Liang publicaron SQuAD (*Proceedings of EMNLP*, 2383–2392), un conjunto de más de cien mil preguntas sobre artículos de Wikipedia, cada una con su respuesta marcada en el texto. Un sistema se evalúa por cuántas respuestas encuentra exactamente y por cuánto se superponen sus respuestas con las correctas. SQuAD y sus sucesores fueron durante años el termómetro del progreso en comprensión automática.

Un experimento modesto para aidoc podría seguir esa lógica:

1. Elegir diez páginas reales con ruido (diarios, documentación, tiendas).
2. Escribir, para cada una, cinco preguntas cuya respuesta esté en el contenido principal, y anotar la respuesta correcta.
3. Hacerle las mismas preguntas a un modelo de lenguaje tres veces: con la página cruda, con el texto canónico de aidoc y con los fragmentos que un buscador elegiría a partir del paquete.
4. Medir aciertos, tokens usados y, si se puede, tiempo de respuesta.

El resultado esperable, por la sección 12.3, es que el texto canónico iguale o mejore los aciertos con muchos menos tokens, y que los fragmentos con ruta de títulos funcionen mejor que fragmentos sin contexto. Pero es justamente lo que hay que medir: puede haber casos en los que el conversor pierda información que el modelo habría usado (una tabla mal convertida, un dato en un pie de página). Un experimento así convertiría la tesis de la idea en un resultado, y sería la sección de evaluación del paper que el proyecto se propone escribir.

### 22. Del modelo al código

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
| Validación | `validar` | `src/aidoc.js` |
| Especificación formal | — | `spec/aidoc-0.1.schema.json` |

Los tests verifican: que SHA-256 coincide con los vectores conocidos; que la conversión de HTML a Markdown maneja títulos, énfasis, listas, enlaces, código, tablas e imágenes; que descarta menú, scripts y estilos; que maneja entidades y listas numeradas anidadas; que las secciones tienen ruta e incluyen lo que hay antes del primer título; que convertir el ejemplo da los metadatos, la estructura, las tablas, los enlaces y el ahorro esperados; que los fragmentos respetan el máximo y coinciden con el texto; que la validación detecta un fragmento alterado, y que se detectan bien el tipo y el idioma.

```js
const A = require("./src/aidoc.js");
const paquete = A.convertir("<h1>Hola</h1><p>Un párrafo de prueba con algunas palabras.</p>");
paquete.secciones.length;      // 1
A.validar(paquete);             // sin errores
A.sha256("abc");               // "ba7816bf8f01cfea…"
```

### 23. Ejercicios

1. Convertí una página de un diario con publicidad y medí el ahorro. ¿Es mayor o menor que el del ejemplo? ¿Qué quedó de ruido en el texto canónico?
2. Bajá el tamaño máximo de fragmento a 200 caracteres y convertí el ejemplo. ¿Cuántos fragmentos salen? ¿Alguno corta una idea a la mitad?
3. Descargá el paquete del ejemplo, cambiá a mano una palabra de un fragmento y validalo. ¿Qué dice la validación? Después cambiá la misma palabra también en el texto canónico. ¿Qué dice ahora, y por qué?
4. Calculá, con la regla de 1 token ≈ 4 caracteres, cuántos tokens tiene esta guía. Si mil IAs la leyeran en HTML con un 50 % de ruido, ¿cuántos tokens se ahorrarían con un paquete?
5. Escribí un llms.txt para un sitio que conozcas, enlazando a tres páginas. ¿Qué información pondrías que aidoc no tiene?
6. Proponé cómo debería marcarse, en una versión 0.2 de la especificación, que la descripción de una imagen fue generada por un modelo (cuál, cuándo, con qué instrucción).
7. Probá MarkItDown o Docling con un PDF y compará su salida con lo que haría falta para un paquete aidoc.

### 24. Glosario

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

### 25. Conclusión

La idea de un formato nativo para IAs retoma una tradición de sesenta años: separar el contenido de su presentación, como propusieron Tunnicliffe y Goldfarb con la marcación genérica, y describir su significado para que lo usen máquinas, como propusieron Berners-Lee, Hendler y Lassila con la web semántica. Lo nuevo es el consumidor: modelos de lenguaje que leen en tokens, buscan en fragmentos y se pierden en contextos largos y ruidosos, como mostraron Lewis y colaboradores con RAG y Liu y colaboradores con la información perdida en el medio.

aidoc es una especificación mínima y un conversor de referencia que muestran que la idea es viable: el ejemplo pasa de 493 a 183 tokens, conserva la estructura, corta fragmentos con contexto y los firma con huellas verificables. Es memoización en el sentido de Michie: interpretar una vez, reusar muchas. Su debilidad declarada es el alcance (solo texto, sin PDF), que herramientas como Docling y MarkItDown ya cubren. Los próximos pasos son compararse con ellas, medir con un tokenizador real, agregar descripciones de imágenes con su procedencia y escribir el paper que la idea proponía. Como enseña la historia de Schema.org, el éxito de un formato así no depende de su elegancia técnica sino de que quien publica gane algo al adoptarlo.

## Referencias

- Anthropic. (2024). *Introducing Contextual Retrieval*. https://www.anthropic.com/news/contextual-retrieval
- Auer, C., Lysak, M., Nassar, A., Dolfi, M., Livathinos, N., Vagenas, P., et al. (2024). *Docling Technical Report*. arXiv:2408.09869. https://doi.org/10.48550/arXiv.2408.09869
- Benet, J. (2014). *IPFS — Content Addressed, Versioned, P2P File System*. arXiv:1407.3561. https://doi.org/10.48550/arXiv.1407.3561
- Berners-Lee, T., Hendler, J., & Lassila, O. (2001). The Semantic Web. *Scientific American*, 284(5), 34–43. https://doi.org/10.1038/scientificamerican0501-34
- Bray, T. (Ed.). (2017). *The JavaScript Object Notation (JSON) Data Interchange Format* (RFC 8259). Internet Engineering Task Force. https://doi.org/10.17487/RFC8259
- Diffie, W., & Hellman, M. E. (1976). New directions in cryptography. *IEEE Transactions on Information Theory*, 22(6), 644–654. https://doi.org/10.1109/TIT.1976.1055638
- Gage, P. (1994). A new algorithm for data compression. *The C Users Journal*, 12(2), 23–38.
- Goldfarb, C. F. (1990). *The SGML Handbook*. Oxford University Press. ISBN 978-0-19-853737-3.
- Guha, R. V., Brickley, D., & Macbeth, S. (2016). Schema.org: Evolution of structured data on the web. *Communications of the ACM*, 59(2), 44–51. https://doi.org/10.1145/2844544
- ISO. (2012). *ISO 14721:2012. Space data and information transfer systems — Open archival information system (OAIS) — Reference model*. International Organization for Standardization.
- ISO. (2017). *ISO 15836-1:2017. Information and documentation — The Dublin Core metadata element set*. International Organization for Standardization.
- Kohlschütter, C., Fankhauser, P., & Nejdl, W. (2010). Boilerplate detection using shallow text features. En *Proceedings of the Third ACM International Conference on Web Search and Data Mining* (pp. 441–450). ACM. https://doi.org/10.1145/1718487.1718542
- Koster, M., Illyes, G., Zeller, H., & Sassman, L. (2022). *Robots Exclusion Protocol* (RFC 9309). Internet Engineering Task Force. https://doi.org/10.17487/RFC9309
- Levenshtein, V. I. (1966). Binary codes capable of correcting deletions, insertions, and reversals. *Soviet Physics Doklady*, 10(8), 707–710.
- Lewis, P., Perez, E., Piktus, A., Petroni, F., Karpukhin, V., Goyal, N., et al. (2020). Retrieval-augmented generation for knowledge-intensive NLP tasks. *Advances in Neural Information Processing Systems*, 33, 9459–9474.
- Liu, N. F., Lin, K., Hewitt, J., Paranjape, A., Bevilacqua, M., Petroni, F., & Liang, P. (2024). Lost in the middle: How language models use long contexts. *Transactions of the Association for Computational Linguistics*, 12, 157–173. https://doi.org/10.1162/tacl_a_00638
- Longpre, S., Mahari, R., Lee, A., Lund, C., Oderinwale, H., Brannon, W., et al. (2024). *Consent in Crisis: The Rapid Decline of the AI Data Commons*. arXiv:2407.14933. https://doi.org/10.48550/arXiv.2407.14933
- MacFarlane, J. (2014–2024). *CommonMark Spec*. https://spec.commonmark.org
- Merkle, R. C. (1988). A digital signature based on a conventional encryption function. En *Advances in Cryptology — CRYPTO '87* (pp. 369–378). Springer. https://doi.org/10.1007/3-540-48184-2_32
- Michie, D. (1968). "Memo" functions and machine learning. *Nature*, 218, 19–22. https://doi.org/10.1038/218019a0
- NIST. (2015). *FIPS PUB 180-4: Secure Hash Standard (SHS)*. National Institute of Standards and Technology. https://doi.org/10.6028/NIST.FIPS.180-4
- Radford, A., Kim, J. W., Xu, T., Brockman, G., McLeavey, C., & Sutskever, I. (2023). Robust speech recognition via large-scale weak supervision. En *Proceedings of the 40th International Conference on Machine Learning* (pp. 28492–28518). PMLR.
- Rajpurkar, P., Zhang, J., Lopyrev, K., & Liang, P. (2016). SQuAD: 100,000+ questions for machine comprehension of text. En *Proceedings of the 2016 Conference on Empirical Methods in Natural Language Processing* (pp. 2383–2392). https://doi.org/10.18653/v1/D16-1264
- Rivest, R. L., Shamir, A., & Adleman, L. (1978). A method for obtaining digital signatures and public-key cryptosystems. *Communications of the ACM*, 21(2), 120–126. https://doi.org/10.1145/359340.359342
- Sennrich, R., Haddow, B., & Birch, A. (2016). Neural machine translation of rare words with subword units. En *Proceedings of the 54th Annual Meeting of the Association for Computational Linguistics* (pp. 1715–1725). https://doi.org/10.18653/v1/P16-1162
- Smith, R. (2007). An overview of the Tesseract OCR engine. En *Proceedings of the Ninth International Conference on Document Analysis and Recognition* (vol. 2, pp. 629–633). IEEE. https://doi.org/10.1109/ICDAR.2007.4376991
- W3C. (2013). *PROV-O: The PROV Ontology*. World Wide Web Consortium Recommendation. https://www.w3.org/TR/prov-o/
- Wright, A., Andrews, H., Hutton, B., & Dennis, G. (2022). *JSON Schema: A Media Type for Describing JSON Documents* (draft 2020-12). https://json-schema.org/draft/2020-12/json-schema-core
- Zhong, X., ShafieiBavani, E., & Jimeno Yepes, A. (2020). Image-based table recognition: Data, model, and evaluation. En *Computer Vision — ECCV 2020* (pp. 564–580). Springer. https://doi.org/10.1007/978-3-030-58589-1_34
