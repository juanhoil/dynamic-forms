import React, { useCallback, useState } from 'react';
import Form from '@rjsf/mui';
import validator from '@rjsf/validator-ajv8';
import { useJsonHyperSchema } from './example8/hooks/useJsonHyperSchema';
import type { JsonHyperSchema } from './types';

const formConfig = {
  schema: {
    type: 'object',
    properties: {
      id: {
        type: 'number',
        title: 'ID',
        readOnly: true,
      },
      title: {
        type: 'string',
        title: 'Título',
      },
      body: {
        type: 'string',
        title: 'Contenido',
      },
      userId: {
        type: 'number',
        title: 'Usuario ID',
      },
    },
    required: ['title', 'body', 'userId'],
    links: [
      {
        id: '1',
        name: 'Cargar publicación',
        description: 'Obtiene la publicación a editar',
        dataRole: 'init',
        request: {
          method: 'GET',
          url: 'https://jsonplaceholder.typicode.com/posts/1',
          headers: {
            type: 'object',
            properties: {
              'Content-Type': {
                type: 'string',
                default: 'application/json',
              },
            },
          },
          body: {},
          queryVariables: {},
          externalVariables: {},
          testValues: {},
        },
        response: {
          jsonSchema: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              title: { type: 'string' },
              body: { type: 'string' },
              userId: { type: 'number' },
            },
            required: ['id', 'title', 'body', 'userId'],
          },
          testValues: {
            id: 1,
            title: 'foo',
            body: 'bar',
            userId: 1,
          },
          responseMapping: {
            'id.default': '{{id}}',
            'title.default': '{{title}}',
            'body.default': '{{body}}',
            'userId.default': '{{userId}}',
          },
        },
      },
      {
        id: '2',
        name: 'Guardar publicación',
        description: 'Actualiza la publicación con PUT',
        dataRole: 'submit',
        request: {
          method: 'PUT',
          url: 'https://jsonplaceholder.typicode.com/posts/1',
          headers: {
            type: 'object',
            properties: {
              'Content-Type': {
                type: 'string',
                default: 'application/json; charset=UTF-8',
              },
            },
          },
          body: {
            type: 'object',
            properties: {
              id: {
                type: 'number',
                default: '{{id}}',
              },
              title: {
                type: 'string',
                default: '{{title}}',
              },
              body: {
                type: 'string',
                default: '{{body}}',
              },
              userId: {
                type: 'number',
                default: '{{userId}}',
              },
            },
          },
          queryVariables: {},
          externalVariables: {},
          testValues: {
            id: 1,
            title: 'foo',
            body: 'bar',
            userId: 1,
          },
        },
        response: {
          jsonSchema: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              title: { type: 'string' },
              body: { type: 'string' },
              userId: { type: 'integer' },
            },
          },
          testValues: {
            id: 1,
            title: 'foo',
            body: 'bar',
            userId: 1,
          },
          responseMapping: {},
        },
      },
    ],
  },
  uiSchema: {},
};

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

const Example9 = () => {
  const [formData, setFormData] = useState({});
  const [activeSchema, setActiveSchema] = useState(schema);

  const handleHyperSchemaUpdate = useCallback((newData, newSchema) => {
    if (newSchema) {
      setActiveSchema(newSchema);
    }

    setFormData(newData);
  }, []);

  const { loading, dataInput, submit, start, reset, reload } = useJsonHyperSchema(
    schema,
    formData,
    handleHyperSchemaUpdate,
    { useTestValues: false, autoStart: true }
  );

  const handleSubmit = async () => {
    const result = await submit();
    console.log(result);
    if (result.data.status === 200) {
      console.log('Post actualizado correctamente');
    } else {
      console.log('Error al actualizar el post');
    }
  };

  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">Ejemplo 9: Editar publicación</h1>
        <p className="page-description">
          Carga un post con GET e actualízalo con PUT en JSONPlaceholder.
        </p>
      </div>

      <div className="panel">
        {loading && <LoadingStatus />}
        <Form
          schema={activeSchema}
          formData={formData}
          validator={validator}
          onChange={({ formData: newFormData }) => setFormData(newFormData)}
          onSubmit={handleSubmit}
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

export default Example9;
