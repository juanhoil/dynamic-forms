import React, { useCallback, useState } from 'react';
import Form from '@rjsf/mui';
import validator from '@rjsf/validator-ajv8';
import { useJsonHyperSchema } from './hooks/useJsonHyperSchema';

const schema = {
  type: 'object',
  properties: {
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
  },
  required: ['CP'],
  "links": [
    {
      "rel": "getUserDetail",
      "href": "https://fenix.free.beeceptor.com/user-detail",
      "isDataInput":"1",
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
      "rel": "search",
      "href": "https://axa-portal-backend.qatiprotec.com/api/tiprotec/direccion/cp{?cp}",
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
        "/Estado": "/state",
        "/Ciudad": "/city",
        "/Municipio": "/municipality",
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
      </div>
    </div>
  );
};

export default Example7;
