import React, { useCallback, useState } from 'react';
import Form from '@rjsf/mui';
import validator from '@rjsf/validator-ajv8';
import { useJsonHyperSchema } from './hooks/useJsonHyperSchema';
//corre  json-server --watch json.json --port 5000
const schema = {
  type: 'object',
  properties: {
    nombre: {
      type: 'string',
      title: 'Nombre',
      default: 'Juan Pérez',
    },  
    CP: {
      type: 'string',
      minLength: 5,
      title: 'Código Postal',
    },
    Estado: {
      type: 'string',
      readOnly: true,
    },
    Ciudad: {
      type: 'string'
    },
    Municipio: {
      type: 'string',
      readOnly: true,
    },
    Colonia: {
      type: 'string',
      enum: [],
    },
    planId: {
      type: 'string',
      title: 'Selecciona un Plan',
      description: 'Elige el plan que mejor se adapte a tus necesidades',
      enum: [],
      enumNames: [],
    },
  },
  required: ['CP'],
  "links": [
    {
      "rel": "getUserDetail",
      "href": "https://fenix.free.beeceptor.com/user-detail",
      "method": "GET",
      "x-data-role": "init",
      "targetSchema": {
        "type": "object",
        "properties": {
          "cp": { "type": "string" },
          "state": { "type": "string" },
          "city": { "type": "string" },
          "municipality": { "type": "string" },
          "settlements": { "type": "string"}
        }
      },
      "x-responseMapping": {
        "/CP": "/cp",
        "/Estado": "/state",
        "/Ciudad": "/city",
        "/Municipio": "/municipality",
        "/Colonia": "/settlements"
      }
    },
    {
      "rel": "getPlans",
      "href": "https://axa-portal-backend.tiprotec.com.mx/api/plan",
      "method": "GET",
      "x-data-role": "catalog",
      "targetSchema": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "id": { "type": "number" },
            "nombre": { "type": "string" }
          }
        }
      },
      "x-responseMapping": {
        "/planId/enum": {
          "path": "/",
          "itemValue": "/id",
          "stringify": true
        },
        "/planId/enumNames": {
          "path": "/",
          "itemValue": "/nombre"
        }
      }
    },
    {
      "rel": "search",
      "href": "https://axa-portal-backend.qatiprotec.com.mx/api/tiprotec/direccion/cp{?cp}",
      "method": "GET",
      "x-data-role": "dependent",
      "templatePointers": { "cp": "/CP" },
      "targetSchema": {
        "type": "object",
        "properties": {
          "state": { "type": "string" },
          "city": { "type": "string" },
          "municipality": { "type": "string" },
          "settlements": { "type": "array", "items": { "type": "string" } }
        }
      },
      "x-responseMapping": {
        "/Estado/default": "/state",
        "/Ciudad/default": "/city",
        "/Municipio/default": "/municipality",
        "/Colonia/enum": "/settlements"
      }
    }
  ]
};
const Example7 = () => {
  const [formData, setFormData] = useState({});
  const [activeSchema, setActiveSchema] = useState(schema);

  const handleHyperSchemaUpdate = useCallback((newData, newSchema) => {
    setFormData(newData);

    if (newSchema) {
      setActiveSchema(newSchema);
    }
  }, []);

  const { loading, dataInput } = useJsonHyperSchema(
    schema,
    formData,
    handleHyperSchemaUpdate
  );

  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">Ejemplo 7</h1>
      </div>

      <div className="panel">
        {loading && <div className="loading">Consultando código postal...</div>}
        <Form
          schema={activeSchema}
          formData={formData}
          validator={validator}
          onChange={({ formData: newFormData }) => setFormData(newFormData)}
        />

        <div className="playground-container">
          <div>
            <h3 className="panel-title">Data Input</h3>
            <div className="json-output">
              {dataInput
                ? JSON.stringify(dataInput, null, 2)
                : 'Aun no se han ejecutado los links isDataInput.'}
            </div>
          </div>

          <div>
            <h3 className="panel-title">Data Output</h3>
            <div className="json-output">
              {Object.keys(formData).length
                ? JSON.stringify(formData, null, 2)
                : 'El formulario aun no tiene datos.'}
            </div>
          </div>
        </div>
        <div className="playground-container">
          <div>
            <h3 className="panel-title">Hyper Schema</h3>
            <div className="json-output">
              {JSON.stringify(activeSchema, null, 2)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Example7;
