import React, { useCallback, useRef, useState } from 'react';
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
          url: 'https://jsonplaceholder.typicode.com/post/1',
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
              id: { type: 'number' },
              title: { type: 'string' },
              body: { type: 'string' },
              userId: { type: 'number' },
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

type StatusBannerProps = {
  title: string;
  description: string;
  tone?: 'info' | 'success' | 'error';
};

const STATUS_TONE = {
  info: {
    border: '#bfdbfe',
    background: 'linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%)',
    color: '#1e3a8a',
    spinner: '#2563eb',
  },
  success: {
    border: '#bbf7d0',
    background: 'linear-gradient(135deg, #ecfdf5 0%, #f8fafc 100%)',
    color: '#14532d',
    spinner: '#16a34a',
  },
  error: {
    border: '#fecaca',
    background: 'linear-gradient(135deg, #fef2f2 0%, #f8fafc 100%)',
    color: '#991b1b',
    spinner: '#dc2626',
  },
} as const;

const StatusBanner = ({ title, description, tone = 'info' }: StatusBannerProps) => {
  const palette = STATUS_TONE[tone];

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.875rem',
        marginBottom: '1rem',
        padding: '0.875rem 1rem',
        border: `1px solid ${palette.border}`,
        borderRadius: '14px',
        background: palette.background,
        color: palette.color,
        boxShadow: '0 10px 24px rgba(37, 99, 235, 0.10)',
      }}
    >
      {tone === 'info' && (
        <span
          aria-hidden="true"
          style={{
            width: '22px',
            height: '22px',
            border: `3px solid ${palette.border}`,
            borderTopColor: palette.spinner,
            borderRadius: '999px',
            animation: 'spin 0.8s linear infinite',
            flex: '0 0 auto',
          }}
        />
      )}
      <span style={{ display: 'grid', gap: '0.125rem' }}>
        <strong style={{ fontSize: '0.925rem', lineHeight: 1.2 }}>{title}</strong>
        <span style={{ color: '#64748b', fontSize: '0.8125rem' }}>{description}</span>
      </span>
      <style>{'@keyframes spin { to { transform: rotate(360deg); } }'}</style>
    </div>
  );
};

const Example9 = () => {
  const [formData, setFormData] = useState({});
  const [activeSchema, setActiveSchema] = useState(schema);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitFeedback, setSubmitFeedback] = useState<{
    tone: 'success' | 'error';
    title: string;
    description: string;
  } | null>(null);
  const submitLoading = useRef(false);

  const handleHyperSchemaUpdate = useCallback((newData, newSchema) => {
    if (newSchema) {
      setActiveSchema(newSchema);
    }

    setFormData(newData);
  }, []);

  const { loading, dataInput, submit } = useJsonHyperSchema(
    schema,
    formData,
    handleHyperSchemaUpdate,
    { useTestValues: false, autoStart: true }
  );

  const handleSubmit = useCallback(async () => {
    if (submitLoading.current) return;

    submitLoading.current = true;
    setIsSubmitting(true);
    setSubmitFeedback(null);

    try {
      const result = await submit();
      console.log('result', result);
      if (result) {
        setSubmitFeedback({
          tone: 'success',
          title: 'Publicación actualizada',
          description: 'El PUT se ejecutó correctamente en JSONPlaceholder.',
        });
      } else {
        setSubmitFeedback({
          tone: 'error',
          title: 'No se pudo guardar',
          description: 'El link submit falló. Revisa la consola para más detalle.',
        });
      }
    } catch (err) {
      setSubmitFeedback({
        tone: 'error',
        title: 'Error al guardar',
        description: err instanceof Error ? err.message : 'Ocurrió un error inesperado.',
      });
    } finally {
      submitLoading.current = false;
      setIsSubmitting(false);
    }
  }, [submit]);

  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">Ejemplo 9: Editar publicación</h1>
        <p className="page-description">
          Carga un post con GET e actualízalo con PUT en JSONPlaceholder.
        </p>
      </div>

      <div className="panel">
        {loading && !isSubmitting && (
          <StatusBanner
            title="Consultando datos del formulario"
            description="Ejecutando los links configurados y actualizando los campos disponibles."
          />
        )}
        {isSubmitting && (
          <StatusBanner
            title="Guardando publicación"
            description="Enviando el PUT con los datos del formulario."
          />
        )}
        {submitFeedback && (
          <StatusBanner
            tone={submitFeedback.tone}
            title={submitFeedback.title}
            description={submitFeedback.description}
          />
        )}
        <Form
          schema={activeSchema}
          formData={formData}
          validator={validator}
          disabled={loading || isSubmitting}
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
