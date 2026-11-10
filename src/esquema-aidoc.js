// Copia de spec/aidoc-0.1.schema.json para usarla en el navegador sin pedir archivos (file:// no deja).
// Un test verifica que sea idéntica a la de spec/.
const EsquemaAidoc = {
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "aidoc-0.1.schema.json",
  "title": "aidoc 0.1",
  "description": "Paquete pre-digerido para IAs: la interpretación de un documento (texto canónico, estructura, fragmentos) guardada una vez para que no haya que volver a extraerla.",
  "type": "object",
  "required": [
    "aidoc",
    "metadatos",
    "texto",
    "secciones",
    "fragmentos",
    "tablas",
    "enlaces",
    "imagenes"
  ],
  "properties": {
    "aidoc": {
      "const": "0.1"
    },
    "metadatos": {
      "type": "object",
      "required": [
        "titulo",
        "idioma",
        "tipoOriginal",
        "creado",
        "hashOriginal"
      ],
      "properties": {
        "titulo": {
          "type": "string"
        },
        "idioma": {
          "type": "string",
          "description": "Código ISO 639-1 o \"desconocido\"."
        },
        "fuente": {
          "type": "string",
          "description": "Nombre de archivo o URL de origen."
        },
        "tipoOriginal": {
          "enum": [
            "text/html",
            "text/markdown",
            "text/plain"
          ]
        },
        "creado": {
          "type": "string",
          "format": "date-time"
        },
        "hashOriginal": {
          "type": "string",
          "pattern": "^sha256:[0-9a-f]{64}$"
        },
        "caracteresOriginal": {
          "type": "integer",
          "minimum": 0
        }
      }
    },
    "texto": {
      "type": "string",
      "description": "Texto canónico en Markdown. Todos los desplazamientos (inicio, fin) se refieren a este texto, en unidades de código UTF-16."
    },
    "secciones": {
      "type": "array",
      "items": {
        "type": "object",
        "required": [
          "id",
          "nivel",
          "titulo",
          "ruta",
          "inicio",
          "fin"
        ],
        "properties": {
          "id": {
            "type": "string"
          },
          "nivel": {
            "type": "integer",
            "minimum": 0,
            "maximum": 6,
            "description": "0 para el texto anterior al primer título."
          },
          "titulo": {
            "type": "string"
          },
          "ruta": {
            "type": "array",
            "items": {
              "type": "string"
            },
            "description": "Títulos desde la raíz hasta esta sección."
          },
          "inicio": {
            "type": "integer",
            "minimum": 0
          },
          "fin": {
            "type": "integer",
            "minimum": 0
          }
        }
      }
    },
    "fragmentos": {
      "type": "array",
      "description": "Partes listas para indexar. texto.slice(inicio, fin) tiene que ser igual a texto del fragmento.",
      "items": {
        "type": "object",
        "required": [
          "id",
          "seccion",
          "ruta",
          "inicio",
          "fin",
          "texto",
          "hash"
        ],
        "properties": {
          "id": {
            "type": "string"
          },
          "seccion": {
            "type": "string"
          },
          "ruta": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "inicio": {
            "type": "integer",
            "minimum": 0
          },
          "fin": {
            "type": "integer",
            "minimum": 0
          },
          "texto": {
            "type": "string"
          },
          "hash": {
            "type": "string",
            "pattern": "^sha256:[0-9a-f]{64}$"
          },
          "tokensEstimados": {
            "type": "integer",
            "minimum": 0
          }
        }
      }
    },
    "tablas": {
      "type": "array",
      "items": {
        "type": "object",
        "required": [
          "encabezados",
          "filas"
        ],
        "properties": {
          "encabezados": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "filas": {
            "type": "array",
            "items": {
              "type": "array",
              "items": {
                "type": "string"
              }
            }
          }
        }
      }
    },
    "enlaces": {
      "type": "array",
      "items": {
        "type": "object",
        "required": [
          "texto",
          "url"
        ],
        "properties": {
          "texto": {
            "type": "string"
          },
          "url": {
            "type": "string"
          }
        }
      }
    },
    "imagenes": {
      "type": "array",
      "items": {
        "type": "object",
        "required": [
          "alt",
          "src"
        ],
        "properties": {
          "alt": {
            "type": "string"
          },
          "src": {
            "type": "string"
          },
          "descripcion": {
            "type": [
              "string",
              "null"
            ],
            "description": "Descripción generada (por ejemplo, por un modelo de visión). null si no se hizo."
          },
          "textoDetectado": {
            "type": [
              "string",
              "null"
            ],
            "description": "Texto reconocido en la imagen (OCR). null si no se hizo."
          },
          "descripcionModelo": {
            "type": [
              "string",
              "null"
            ],
            "description": "Modelo que generó la descripción y el texto detectado (por ejemplo, claude-opus-5-5). null si no se generaron con un modelo."
          }
        }
      }
    },
    "medicion": {
      "type": "object",
      "properties": {
        "metodo": {
          "type": "string",
          "description": "Cómo se contaron los tokens: una estimación (\"1 token ≈ 4 caracteres\") o un tokenizador real."
        },
        "tokensOriginal": {
          "type": "integer",
          "minimum": 0
        },
        "tokensTexto": {
          "type": "integer",
          "minimum": 0
        },
        "ahorro": {
          "type": "number"
        },
        "modelo": {
          "type": "string",
          "description": "Modelo cuyo tokenizador se usó, cuando el conteo es real (por ejemplo, claude-opus-5-5)."
        }
      }
    }
  }
};

if (typeof module !== "undefined") module.exports = EsquemaAidoc;
