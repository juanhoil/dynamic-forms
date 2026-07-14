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

import type { JsonSchema, HyperSchemaLink } from '../types.js';

/** Config de un formulario tal como se guarda: schema (hyperSchema) + uiSchema. */
export interface FormConfig {
  id: number;
  name: string;
  description: string;
  externalVariables?: JsonSchema; //variables externas
  formSchema: JsonSchema; //configuracion del formulario
  dataSource?: HyperSchemaLink[];//[link1, link2, link3, ...] //mapping: { key: value } //GET, POST, PUT, PATCH, DELETE
  submit?: HyperSchemaLink; //POST, PUT, PATCH, DELETE
  uiSchema?: Record<string, unknown>;
}
export interface FormConfigLite {
  id: number;
  name: string;
  description: string;
}

const config1: FormConfig = {
  id: 1,
  name: "Formulario 1",
  description: "Formulario 1",
  "formSchema": {
    "type": "object",
    "properties": {
      "id": {
        "type": "number",
        "title": "ID",
        "readOnly": true
        },
        "title": {
          "type": "string",
          "title": "Título"
        },
        "body": {
          "type": "string"
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
  },
  "dataSource": [
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
  ],
  'submit':  {
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
            "default": "application/json"
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
  },
  "uiSchema": {}
};

const config2: FormConfig = {
  id: 2,
  name: "Formulario 2",
  description: "Formulario 2",
  "formSchema": {
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
  },
  "externalVariables": {
    "type": "object",
    "properties": {
      "userId": {
        "type": "number"
      }
    }
  },
  "dataSource": [
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
  ],
  "uiSchema": {}
}
const config3: FormConfig = {
  id: 3,
  name: "Formulario 3",
  description: "Formulario 3",
  "formSchema": {
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
        "type": "string"
      },
      "planId": {
        "type": "string",
        "title": "Selecciona un Plan",
        "description": "Elige el plan que mejor se adapte a tus necesidades"
      }
    },
    "required": [
      "CP"
    ],
  },
  "externalVariables": {
    "type": "object",
    "properties": {
      "userId": {
        "type": "number"
      }
    }
  },
  "dataSource": [
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
        "testValues": {
          "userId": 1
        }
      },
      "response": {
        "jsonSchema": {
          "type": "object",
          "properties": {
            "cp": {
              "type": "string"
            },
            "state": {
              "type": "string"
            },
            "city": {
              "type": "string"
            },
            "municipality": {
              "type": "string"
            },
            "settlements": {
              "type": "array",
              "items": {
                "type": "string"
              }
            }
          }
        },
        "testValues": {
          "cp": "97380",
          "state": "Yucatan",
          "city": "Merida",
          "municipality": "Acanceh",
          "settlements": [
            "Santiago",
            "San Cristobal",
            "San Juan"
          ]
        },
        "responseMapping": {
          "CP.default": "{{cp}}",
          "Estado.default": "{{state}}",
          "Ciudad.default": "{{city}}",
          "Municipio.default": "{{municipality}}",
          "Colonia.enum": {
            "source": "settlements"
          }
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
        "url": "https://api-gateway-qa.fenixbywoow.com/api/v1/sepomex/ubicacion?codigoPostal={{CP}}",
        "headers": {},
        "body": {},
        "queryVariables": {},
        "templatePointers": {
          "type": "object",
          "properties": {
            "CP": {
              "type": "string",
              "minLength": 5,
              "title": "Código Postal"
            }
          },
          "required": [
            "CP"
          ]
        },
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
            "codigoPostal": {
              "type": "string"
            },
            "estado": {
              "type": "string"
            },
            "codigoEstado": {
              "type": "string"
            },
            "municipio": {
              "type": "string"
            },
            "codigoMunicipio": {
              "type": "string"
            },
            "colonias": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "label": {
                    "type": "string"
                  },
                  "value": {
                    "type": "string"
                  }
                },
                "required": [
                  "label",
                  "value"
                ]
              },
              "minItems": 0
            }
          },
          "required": [
            "codigoEstado",
            "codigoMunicipio",
            "codigoPostal",
            "colonias",
            "estado",
            "municipio"
          ]
        },
        "testValues": {
          "codigoPostal": "97380",
          "estado": "Yucatán",
          "codigoEstado": "31",
          "municipio": "Acanceh",
          "codigoMunicipio": "002",
          "colonias": [
            {
              "label": "Acanceh",
              "value": "0303"
            },
            {
              "label": "Canicab",
              "value": "0304"
            },
            {
              "label": "El Zapotal",
              "value": "1807"
            },
            {
              "label": "Santiago",
              "value": "0001"
            },
            {
              "label": "Ticopó",
              "value": "0305"
            }
          ]
        },
        "responseMapping": {
          "Estado.default": "{{estado}}",
          "Municipio.default": "{{municipio}}",
          "Colonia.enum": {
            "source": "colonias",
            "item": {
              "value": "{{value}}",
              "label": "{{label}}"
            }
          }
        }
      }
    }
  ],
  "uiSchema": {}
};

const config4: FormConfig = {
  id: 4,
  name: "cambio de domicilio 4",
  description: "cambio de domicilio 4",
  "formSchema": {
    "type": "object",
    "properties": {
      "cp": {
        "type": "string",
        "description": ""
      },
      "estado": {
        "type": "string",
        "description": ""
      },
      "ciudad": {
        "type": "string",
        "description": ""
      },
      "municipio": {
        "type": "string",
        "description": ""
      },
      "colonia": {
        "type": "string",
        "description": ""
      },
      "calle": {
        "type": "string",
        "description": ""
      },
      "numeroExterior": {
        "type": "string",
        "description": ""
      },
      "numeroInterior": {
        "type": "string",
        "description": ""
      }
    },
    "additionalProperties": false,
    "required": [
      "cp",
      "estado",
      "ciudad",
      "municipio",
      "colonia",
      "calle",
      "numeroExterior",
      "numeroInterior"
    ]
  },
  "externalVariables": {
    "type": "object",
    "properties": {
      "idPoliza": {
        "type": "string",
        "description": ""
      }
    }
  },
  "dataSource": [
    {
      "id": "t1",
      "name": "https://api-gateway-qa.fenixbywoow.com/api/v1/poliza/{{idPoliza}}/asegurado/direccion",
      "description": "",
      "dataRole": "init",
      "request": {
        "method": "GET",
        "url": "https://api-gateway-qa.fenixbywoow.com/api/v1/poliza/{{idPoliza}}/detalle/asegurado/direccion",
        "headers": {},
        "body": {},
        "queryVariables": {},
        "templatePointers": {},
        "testValues": {
          "idPoliza": "E161B73E-F36B-1410-859F-0079B48729EB",
          "cp": "",
          "estado": "",
          "ciudad": "",
          "municipio": "",
          "colonia": "",
          "calle": "",
          "numeroExterior": "",
          "numeroInterior": ""
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
            "estado": {
              "type": "string"
            },
            "ciudad": {
              "type": "string"
            },
            "municipio": {
              "type": "string"
            },
            "colonia": {
              "type": "string"
            },
            "calle": {
              "type": "string"
            },
            "numeroExterior": {
              "type": "string"
            }
          },
          "required": [
            "calle",
            "ciudad",
            "colonia",
            "cp",
            "estado",
            "municipio",
            "numeroExterior"
          ]
        },
        "testValues": {
          "cp": "",
          "estado": "",
          "ciudad": "",
          "municipio": "",
          "colonia": "",
          "calle": "",
          "numeroExterior": ""
        },
        "responseMapping": {
          "cp.default": "{{cp}}",
          "estado.default": "{{estado}}",
          "ciudad.default": "{{ciudad}}",
          "municipio.default": "{{municipio}}",
          "colonia.default": "{{colonia}}",
          "calle.default": "{{calle}}",
          "numeroExterior.default": "{{numeroExterior}}"
        }
      }
    },
    {
      "id": "t2",
      "name": "https://api-gateway-qa.fenixbywoow.com/api/v1/sepomex/ubicacion?codigoPostal={{cp}}",
      "description": "",
      "dataRole": "dependent",
      "request": {
        "method": "GET",
        "url": "https://api-gateway-qa.fenixbywoow.com/api/v1/sepomex/ubicacion?codigoPostal={{cp}}",
        "headers": {},
        "body": {},
        "queryVariables": {},
        "templatePointers": {
          "type": "object",
          "properties": {
            "cp": {
              "type": "string",
              "description": ""
            }
          },
          "required": [
            "cp"
          ]
        },
        "testValues": {
          "idPoliza": "",
          "cp": "97380",
          "estado": "",
          "ciudad": "",
          "municipio": "",
          "colonia": "",
          "calle": "",
          "numeroExterior": "",
          "numeroInterior": ""
        }
      },
      "response": {
        "jsonSchema": {
          "title": "Generated Schema",
          "description": "Generated from JSON data",
          "type": "object",
          "properties": {
            "codigoPostal": {
              "type": "string"
            },
            "estado": {
              "type": "string"
            },
            "codigoEstado": {
              "type": "string"
            },
            "municipio": {
              "type": "string"
            },
            "codigoMunicipio": {
              "type": "string"
            },
            "colonias": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "label": {
                    "type": "string"
                  },
                  "value": {
                    "type": "string"
                  }
                },
                "required": [
                  "label",
                  "value"
                ]
              },
              "minItems": 0
            }
          },
          "required": [
            "codigoEstado",
            "codigoMunicipio",
            "codigoPostal",
            "colonias",
            "estado",
            "municipio"
          ]
        },
        "testValues": {
          "codigoPostal": "97380",
          "estado": "Yucatán",
          "codigoEstado": "31",
          "municipio": "Acanceh",
          "codigoMunicipio": "002",
          "colonias": [
            {
              "label": "Acanceh",
              "value": "0303"
            },
            {
              "label": "Canicab",
              "value": "0304"
            },
            {
              "label": "El Zapotal",
              "value": "1807"
            },
            {
              "label": "Santiago",
              "value": "0001"
            },
            {
              "label": "Ticopó",
              "value": "0305"
            }
          ]
        },
        "responseMapping": {
          "estado.default": "{{estado}}",
          "municipio.default": "{{municipio}}",
          "colonia.enum": {
            "source": "colonias",
            "item": {
              "value": "{{value}}",
              "label": "{{label}}"
            }
          }
        }
      }
    }
  ],
  "submit": {
    "id": "t3",
    "name": "https://api-gateway-qa.fenixbywoow.com/api/v1/poliza/{{idPoliza}}/asegurado/direccion",
    "description": "",
    "dataRole": "submit",
    "request": {
      "method": "PUT",
      "url": "https://api-gateway-qa.fenixbywoow.com/api/v1/poliza/{{idPoliza}}/asegurado/direccion",
      "headers": {
        "type": "object",
        "properties": {
          "Content-Type": {
            "type": "string",
            "description": "",
            "default": "application/json"
          }
        },
        "required": []
      },
      "body": {
        "type": "object",
        "properties": {
          "cp": {
            "type": "string",
            "description": "",
            "default": "{{cp}}"
          },
          "estado": {
            "type": "string",
            "description": "",
            "default": "{{estado}}"
          },
          "ciudad": {
            "type": "string",
            "description": "",
            "default": "{{ciudad}}"
          },
          "municipio": {
            "type": "string",
            "description": "",
            "default": "{{municipio}}"
          },
          "colonia": {
            "type": "string",
            "description": "",
            "default": "{{colonia}}"
          },
          "calle": {
            "type": "string",
            "description": "",
            "default": "{{calle}}"
          },
          "numeroExterior": {
            "type": "string",
            "description": "",
            "default": "{{numeroExterior}}"
          },
          "numeroInterior": {
            "type": "string",
            "description": "",
            "default": "{{numeroInterior}}"
          }
        },
        "required": [
          "cp",
          "estado",
          "ciudad",
          "municipio",
          "colonia",
          "calle",
          "numeroExterior"
        ]
      },
      "queryVariables": {},
      "templatePointers": {},
      "testValues": {
        "idPoliza": "E161B73E-F36B-1410-859F-0079B48729EB",
        "cp": "03100",
        "estado": "Ciudad de Mexico",
        "ciudad": "Ciudad de Mexico",
        "municipio": "Benito Juarez",
        "colonia": "Del Valle",
        "calle": "Av. Insurgentes Sur",
        "numeroExterior": "1234",
        "numeroInterior": "5b"
      }
    },
    "response": {
      "jsonSchema": {
        "title": "Generated Schema",
        "description": "Generated from JSON data",
        "type": "object",
        "properties": {
          "id": {
            "type": "string",
            "format": "uuid"
          },
          "idPoliza": {
            "type": "string",
            "format": "uuid"
          },
          "timestamp": {
            "type": "string",
            "format": "date-time"
          },
          "observaciones": {
            "type": "string"
          }
        },
        "required": [
          "id",
          "idPoliza",
          "observaciones",
          "timestamp"
        ]
      },
      "testValues": {
        "id": "20d6eb0b-2a8d-405b-a092-740c721999f4",
        "idPoliza": "E161B73E-F36B-1410-859F-0079B48729EB",
        "timestamp": "2026-07-13T21:32:53.677Z",
        "observaciones": "Direccion del asegurado actualizada parcialmente. Campos: cp, estado, ciudad, municipio, colonia, calle, numeroExterior, numeroInterior."
      },
      "responseMapping": {}
    }
  },
  "uiSchema": {}
}

const formConfigs = [
  config1,
  config2,
  config3,
  config4,
];

export const DEFAULT_FORM_CONFIG_ID = 1;

export const getFormConfig = (id: number): FormConfig => {
  return formConfigs.find(item => item.id === id) ?? config1;
};

export const getAllFormConfigsLite = (): FormConfigLite[] => {
  return formConfigs.map(item => ({
    id: item.id,
    name: item.name,
    description: item.description,
  }));
};
