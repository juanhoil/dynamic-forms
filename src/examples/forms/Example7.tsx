import React, { useCallback, useState } from 'react';
import { FormHyperschema } from './example8/components/FormHyperschema';
import type { JsonHyperSchema } from './types';
const formConfig = {
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
const schema: JsonHyperSchema = formConfig.schema as JsonHyperSchema;
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
  const user = { userId: 1 };
  const [loading, setLoading] = useState(false);
  const [dataInput, setDataInput] = useState<unknown>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const handleSubmit = useCallback((submit: () => Promise<any>) => {
    const result = submit();
    console.log(result);
  }, []);
  const handleRunning = useCallback(
    (ctx: { loading: boolean }) => setLoading(ctx.loading),
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
          hyperSchema={schema}
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
        </div>
      </div>
    </div>
  );
};

export default Example7;
