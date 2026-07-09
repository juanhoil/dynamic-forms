// ---------------------------------------------------------------------------
// Configuraciones de formulario "guardadas". Simula la persistencia (BD): en
// lugar de que el front envíe el hyperSchema, el backend lo tiene almacenado y
// lo sirve por id (form-config/get/:id, default 1).
//
// Esta config es la misma que exporta el frontend en:
//   src/examples/forms/Example9.tsx  →  export const hyperSchema
// Se replica aquí porque el backend es un proyecto independiente. El front NO
// debe conocer los `links`; solo el JSON Schema del formulario.
// ---------------------------------------------------------------------------

import type { JsonHyperSchema } from '../types.js';

/** Config de un formulario tal como se guarda: schema (hyperSchema) + uiSchema. */
export interface FormConfig {
  schema: JsonHyperSchema;
  uiSchema: Record<string, unknown>;
}
const config2: FormConfig = {
  "schema": {
    "type": "object",
    "properties": {
      "CP": {
        "type": "string",
        "minLength": 5,
        "title": "Código Postal"
      },
      "Estado": {
        "type": "string",
        "readOnly": true
      },
      "Ciudad": {
        "type": "string"
      },
      "Municipio": {
        "type": "string",
        "readOnly": true
      },
      "Colonia": {
        "type": "string",
      },
      "planId": {
        "type": "number",
        "title": "Selecciona un Plan",
        "description": "Elige el plan que mejor se adapte a tus necesidades"
      },
      "polizaId": {
        "type": "string",
        "title": "Selecciona una Poliza",
        "description": "Elige la poliza que mejor se adapte a tus necesidades"
      }
    },
    "required": [
      "CP"
    ],
    "links": [
      {
        "id": "1",
        "name": "Inicializar datos",
        "description": "Obtiene información inicial del usuario",
        "dataRole": "init",
        "request": {
          "method": "GET",
          "url": "https://fenix.free.beeceptor.com/user-detail/{{userId}}",
          "headers": {
            "type": "object",
            "properties": {
              "Content-Type": {
                "type": "string",
                "default": "application/json"
              }
            }
          },
          "body": {},
          "queryVariables": {},
          "externalVariables": {
            "type": "object",
            "properties": {
              "userId": {
                "type": "number"
              }
            }
          },
          "testValues": {
            "userId": 1
          }
        },
        "response": {
          "jsonSchema": {
            "title": "Generated Schema",
            "description": "Generated from JSON data",
            "type": "object",
            "properties": {
              "cp": {
                "type": "string"
              },
              "city": {
                "type": "string"
              },
              "municipality": {
                "type": "string"
              },
              "settlements": {
                "type": "string"
              },
              "state": {
                "type": "string"
              }
            },
            "required": [
              "city",
              "cp",
              "municipality",
              "settlements",
              "state"
            ]
          },
          "testValues": {
            "cp": "97380",
            "city": "Merida",
            "municipality": "Acanceh",
            "settlements": "Santiago",
            "state": "Yucatan"
          },
          "responseMapping": {
            "CP.default": "{{cp}}",
            "Estado.default": "{{state}}",
            "Ciudad.default": "{{city}}",
            "Municipio.default": "{{municipality}}",
            "Colonia.default": "{{settlements}}"
          }
        }
      },
      {
        "id": "2",
        "name": "Catálogo de Planes",
        "description": "Obtiene el catálogo de planes",
        "dataRole": "init",
        "request": {
          "method": "GET",
          "url": "https://axa-portal-backend.tiprotec.com.mx/api/plan",
          "headers": {},
          "body": {},
          "queryVariables": {},
          "externalVariables": {},
          "testValues": {}
        },
        "response": {
          "jsonSchema": {
            "title": "Generated Schema",
            "description": "Generated from JSON data",
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "id": {
                  "type": "integer"
                },
                "guid": {
                  "type": "string",
                  "format": "uuid"
                },
                "nombre": {
                  "type": "string"
                }
              },
              "required": [
                "guid",
                "id",
                "nombre"
              ]
            },
            "minItems": 0
          },
          "testValues": [
            {
              "id": 1,
              "guid": "B5F53BEE-4A83-4C84-BE2C-13F7C42E9F20",
              "nombre": "Anual"
            },
            {
              "id": 2,
              "guid": "FBE0A2ED-0636-44E7-AF80-7D1AECB122C1",
              "nombre": "Único"
            }
          ],
          "responseMapping": {
            "planId.enum": {
              "source": "root",
              "item": {
                "value": "{{id}}",
                "label": "{{id}} {{nombre}}"
              }
            }
          }
        }
      },
      {
        "id": "3",
        "name": "Consultar Código Postal",
        "description": "Obtiene estado, ciudad, municipio y colonias a partir del CP",
        "dataRole": "dependent",
        "request": {
          "method": "GET",
          "url": "https://axa-portal-backend.qatiprotec.com/api/tiprotec/direccion/cp?cp={{CP}}",
          "templatePointers": {
            "type": "object",
            "properties": {
              "CP": {
              "type": "string",
                "minLength": 5
              }
            },
            "required": [
              "CP"
            ]
          },
          "headers": {},
          "body": {},
          "queryVariables": {},
          "externalVariables": {},
          "testValues": {
            "CP": "97380"
          }
        },
        "response": {
          "jsonSchema": {
            "title": "Generated Schema",
            "description": "Generated from JSON data",
            "type": "object",
            "properties": {
              "state": {
                "type": "string"
              },
              "municipality": {
                "type": "string"
              },
              "city": {
                "type": "string"
              },
              "settlements": {
                "type": "array",
                "items": {
                  "type": "string"
                },
                "minItems": 0
              }
            },
            "required": [
              "city",
              "municipality",
              "settlements",
              "state"
            ]
          },
          "testValues": {
            "state": "Yucatan",
            "municipality": "Acanceh",
            "city": "",
            "settlements": [
              "Santiago",
              "Acanceh",
              "Canicab",
              "Ticopo",
              "El Zapotal"
            ]
          },
          "responseMapping": {
            "Estado.default": "{{state}}",
            "Ciudad.default": "{{city}}",
            "Municipio.default": "{{municipality}}",
            "Colonia.enum": {
              "source": "settlements",
              "item": {
                "value": "{{item}}",
                "label": "{{item}}, Merida, {{state}}"
              }
            }
          }
        }
      }
    ]
  },
  "uiSchema": {}
}
const config1: FormConfig = {
  "schema": {
    "type": "object",
    "properties": {
      "id": {
        "type": "number",
        "title": "ID",
        "readOnly": true
    },
    "userId": {
      "type": "number",
      "title": "Usuario ID"
    }
  },
  "required": [
    "title",
    "body",
    "userId"
  ],
  "links": [
    {
      "id": "1",
      "name": "Cargar publicación",
      "description": "Obtiene la publicación a editar",
      "dataRole": "init",
      "request": {
        "method": "GET",
        "url": "https://jsonplaceholder.typicode.com/posts/1",
        "headers": {
          "type": "object",
          "properties": {
            "Content-Type": {
              "type": "string",
              "default": "application/json"
            }
          }
        },
        "body": {},
        "queryVariables": {},
        "externalVariables": {},
        "testValues": {}
      },
      "response": {
        "jsonSchema": {
          "type": "object",
          "properties": {
            "id": {
              "type": "number"
            },
            "title": {
              "type": "string"
            },
            "body": {
              "type": "string"
            },
            "userId": {
              "type": "number"
            }
          },
          "required": [
            "id",
            "title",
            "body",
            "userId"
          ]
        },
        "testValues": {
          "id": 1,
          "title": "foo",
          "body": "bar",
          "userId": 1
        },
        "responseMapping": {
          "id.default": "{{id}}",
          "title.default": "{{title}}",
          "body.default": "{{body}}",
          "userId.default": "{{userId}}"
        }
      }
    },
    {
      "id": "2",
      "name": "Guardar publicación",
      "description": "Actualiza la publicación con PUT",
      "dataRole": "submit",
      "request": {
        "method": "PUT",
        "url": "https://jsonplaceholder.typicode.com/posts/{{id}}",
        "headers": {
          "type": "object",
          "properties": {
            "Content-Type": {
              "type": "string",
              "default": "application/json; charset=UTF-8"
            }
          }
        },
        "body": {
          "type": "object",
          "properties": {
            "id": {
              "type": "number",
              "default": "{{id}}"
            },
            "title": {
              "type": "string",
              "default": "{{title}}"
            },
            "body": {
              "type": "string",
              "default": "{{body}}"
            },
            "userId": {
              "type": "number",
              "default": "{{userId}}"
            }
          }
        },
        "queryVariables": {},
        "externalVariables": {},
        "testValues": {
          "id": 1,
          "title": "foo",
          "body": "bar",
          "userId": 1
        }
      },
      "response": {
        "jsonSchema": {
          "type": "object",
          "properties": {
            "id": {
              "type": "number"
            },
            "title": {
              "type": "string"
            },
            "body": {
              "type": "string"
            },
            "userId": {
              "type": "number"
            }
          }
        },
        "testValues": {
          "id": 1,
          "title": "foo",
          "body": "bar",
          "userId": 1
        },
        "responseMapping": {}
      }
    }
  ],},
  "uiSchema": {}
};

export const DEFAULT_FORM_CONFIG_ID = 0;

const formConfigs = [config1, config2];
export const getFormConfig = (id: number) => {
  return formConfigs[id];
}

