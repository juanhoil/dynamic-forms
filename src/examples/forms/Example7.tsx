import React, { useCallback, useState } from 'react';
import { FormHyperschema } from './example8/components/FormHyperschema';
import type { HyperSchemaConfig, JsonHyperSchema } from './types';
const formConfig: HyperSchemaConfig = {
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
      "headers": {},
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
const LoadingStatus = () => (
  <div
    role="status"
    aria-live="polite"
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.875rem',
      marginBottom: '1rem',
      padding: '0.875rem 1rem',
      border: '1px solid #bfdbfe',
      borderRadius: '14px',
      background: 'linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%)',
      color: '#1e3a8a',
      boxShadow: '0 10px 24px rgba(37, 99, 235, 0.10)',
    }}
  >
    <span
      aria-hidden="true"
      style={{
        width: '22px',
        height: '22px',
        border: '3px solid #bfdbfe',
        borderTopColor: '#2563eb',
        borderRadius: '999px',
        animation: 'spin 0.8s linear infinite',
        flex: '0 0 auto',
      }}
    />
    <span style={{ display: 'grid', gap: '0.125rem' }}>
      <strong style={{ fontSize: '0.925rem', lineHeight: 1.2 }}>
        Consultando datos del formulario
      </strong>
      <span style={{ color: '#64748b', fontSize: '0.8125rem' }}>
        Ejecutando los links configurados y actualizando los campos disponibles.
      </span>
    </span>
    <style>{'@keyframes spin { to { transform: rotate(360deg); } }'}</style>
  </div>
);

const Example7RunningStatus = ({ loading }: { loading: boolean }) =>
  loading ? <LoadingStatus /> : null;

const Example7 = () => {
  const user = { idPoliza: "E161B73E-F36B-1410-859F-0079B48729EB" };
  const [loading, setLoading] = useState(false);
  const [dataInput, setDataInput] = useState<unknown>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [schemaWithoutLinks, setSchemaWithoutLinks] = useState<JsonHyperSchema | null>(null);
  const handleSubmit = useCallback((submit: () => Promise<any>) => {
    const result = submit();
    console.log(result);
  }, []);
  const handleRunning = useCallback(
    (ctx: { loading: boolean; schemaWithoutLinks: JsonHyperSchema }) => {
      setLoading(ctx.loading);
      setSchemaWithoutLinks(ctx.schemaWithoutLinks);
    },
    []
  );

  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">Ejemplo 7</h1>
      </div>

      <div className="panel">
        <Example7RunningStatus loading={loading} />
        <FormHyperschema
          config={formConfig}
          options={{ values: user }}
          onSubmit={({ submit }) => handleSubmit(submit)}
          running={(ctx) => (handleRunning(ctx))}
          onDataInput={setDataInput}
          onFormData={setFormData}
        />
        <div className="playground-container">
          <div>
            <h3 className="panel-title">Data Init</h3>
            <div className="json-output">
              {dataInput
                ? JSON.stringify(dataInput, null, 2)
                : 'Aun no se han ejecutado los links de inicialización.'}
            </div>
          </div>

          <div>
            <h3 className="panel-title">Data actual</h3>
            <div className="json-output">
              {Object.keys(formData).length
                ? JSON.stringify(formData, null, 2)
                : 'El formulario aun no tiene datos.'}
            </div>
          </div>

          <div>
            <h3 className="panel-title">Schema actual sin links</h3>
            <div className="json-output">
              {schemaWithoutLinks
                ? JSON.stringify(schemaWithoutLinks, null, 2)
                : 'Aun no se ha cargado el esquema del formulario.'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Example7;
