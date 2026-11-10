# Resultados de la comparativa

**Tokens de la salida** (entre paréntesis, respecto del original):

| Documento | Original | aidoc | Docling | MarkItDown |
|---|---:|---:|---:|---:|
| Código QR (Wikipedia en español) | 49.670 | 10.503 (21 %) | 10.472 (21 %) | 14.199 (29 %) |
| MDN: el elemento `<table>` | 69.846 | 13.550 (19 %) | 20.087 (29 %) | 22.209 (32 %) |
| 5. Data Structures (tutorial de Python) | 34.152 | 8.484 (25 %) | 8.833 (26 %) | 9.258 (27 %) |
| RFC 8259: The JSON Data Interchange Format | 10.599 | 8.393 (79 %) | 8.540 (81 %) | 7.133 (67 %) |
| README de MarkItDown (Markdown) | 4.765 | 4.761 (100 %) | 4.692 (98 %) | 4.765 (100 %) |

**Tiempo de conversión**, sin contar el arranque:

| Documento | aidoc | Docling | MarkItDown |
|---|---:|---:|---:|
| Código QR (Wikipedia en español) | 7,8 ms | 121 ms | 45 ms |
| MDN: el elemento `<table>` | 10 ms | 198 ms | 65 ms |
| 5. Data Structures (tutorial de Python) | 7,5 ms | 161 ms | 58 ms |
| RFC 8259: The JSON Data Interchange Format | 3,2 ms | 41 ms | 12 ms |
| README de MarkItDown (Markdown) | 2,3 ms | 100 ms | 4,7 ms |

**Calidad**, sumando los 5 documentos (palabras y ruido: promedio):

| Herramienta | Títulos | Tablas | Enlaces | Palabras del contenido | Ruido que se cuela |
|---|---:|---:|---:|---:|---:|
| aidoc | 80 % | 100 % | 100 % | 100 % | 51 % |
| Docling | 80 % | 100 % | 93 % | 100 % | 78 % |
| MarkItDown | 80 % | 100 % | 95 % | 100 % | 100 % |

Medido el 2026-11-10 en macOS (Darwin 25.5.0), arm64, con aidoc 0.2.0, Docling 2.150.0 y MarkItDown 0.1.9. Tokens con o200k_base (tiktoken); tiempo: mediana de 5 conversiones.


## Detalle por documento


### Código QR (Wikipedia en español)

165.438 caracteres, 49.670 tokens en el original. Referencia: 18 títulos, 3 tablas, 144 enlaces, 809 palabras distintas del contenido; 158 palabras que solo aparecen fuera del contenido.


| Herramienta | Tokens | Caracteres | Tiempo | Títulos | Tablas | Enlaces | Palabras | Ruido |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| aidoc | 10.503 | 35.532 | 7,8 ms | 18/18 | 3/3 | 144/144 | 100 % | 49 % |
| Docling | 10.472 | 36.064 | 121 ms | 18/18 | 3/3 | 125/144 | 100 % | 68 % |
| MarkItDown | 14.199 | 47.179 | 45 ms | 18/18 | 3/3 | 141/144 | 100 % | 100 % |


### MDN: el elemento `<table>`

247.819 caracteres, 69.846 tokens en el original. Referencia: 43 títulos, 2 tablas, 75 enlaces, 679 palabras distintas del contenido; 254 palabras que solo aparecen fuera del contenido.


| Herramienta | Tokens | Caracteres | Tiempo | Títulos | Tablas | Enlaces | Palabras | Ruido |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| aidoc | 13.550 | 45.955 | 10 ms | 42/43 | 2/2 | 75/75 | 100 % | 5 % |
| Docling | 20.087 | 70.077 | 198 ms | 42/43 | 2/2 | 75/75 | 100 % | 65 % |
| MarkItDown | 22.209 | 74.035 | 65 ms | 43/43 | 2/2 | 75/75 | 100 % | 100 % |


### 5. Data Structures (tutorial de Python)

110.941 caracteres, 34.152 tokens en el original. Referencia: 14 títulos, 0 tablas, 30 enlaces, 663 palabras distintas del contenido; 33 palabras que solo aparecen fuera del contenido.


| Herramienta | Tokens | Caracteres | Tiempo | Títulos | Tablas | Enlaces | Palabras | Ruido |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| aidoc | 8.484 | 30.107 | 7,5 ms | 14/14 | — | 30/30 | 100 % | 100 % |
| Docling | 8.833 | 31.269 | 161 ms | 14/14 | — | 30/30 | 100 % | 100 % |
| MarkItDown | 9.258 | 32.176 | 58 ms | 14/14 | — | 30/30 | 100 % | 100 % |


### RFC 8259: The JSON Data Interchange Format

37.946 caracteres, 10.599 tokens en el original. Referencia: 24 títulos, 0 tablas, 28 enlaces, 677 palabras distintas del contenido; sin ruido que medir.


| Herramienta | Tokens | Caracteres | Tiempo | Títulos | Tablas | Enlaces | Palabras | Ruido |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| aidoc | 8.393 | 31.370 | 3,2 ms | 0/24 | — | 28/28 | 100 % | — |
| Docling | 8.540 | 31.864 | 41 ms | 0/24 | — | 28/28 | 100 % | — |
| MarkItDown | 7.133 | 28.371 | 12 ms | 0/24 | — | 15/28 | 100 % | — |


### README de MarkItDown (Markdown)

21.397 caracteres, 4.765 tokens en el original. Referencia: 23 títulos, 2 tablas, 18 enlaces, 649 palabras distintas del contenido; sin ruido que medir.


| Herramienta | Tokens | Caracteres | Tiempo | Títulos | Tablas | Enlaces | Palabras | Ruido |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| aidoc | 4.761 | 21.389 | 2,3 ms | 23/23 | 2/2 | 18/18 | 100 % | — |
| Docling | 4.692 | 21.553 | 100 ms | 23/23 | 2/2 | 16/18 | 99 % | — |
| MarkItDown | 4.765 | 21.397 | 4,7 ms | 23/23 | 2/2 | 18/18 | 100 % | — |


Arranque (importar y crear el conversor, una vez): Docling 5.298 ms, MarkItDown 193 ms. En aidoc el tiempo se mide dentro de Node, también sin contar el arranque.
