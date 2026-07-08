import React, { useCallback, useRef, useState } from 'react';
import {
  FormHyperschema,
  formatLinkRunError,
} from './example8/components/FormHyperschema';
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
          url: 'https://jsonplaceholder.typicode.com/posts/{{id}}',
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

export const hyperSchema: JsonHyperSchema = formConfig.schema as JsonHyperSchema;

type StatusBannerProps = {
  title: string;
  description: string;
  tone?: 'info' | 'success' | 'error';
};

type SubmitFeedback = {
  tone: 'success' | 'error';
  title: string;
  description: string;
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

type Example9RunningNotificationsProps = {
  loading: boolean;
  error: unknown;
  isSubmitting: boolean;
  submitFeedback: SubmitFeedback | null;
};

const Example9RunningNotifications = ({
  loading,
  error,
  isSubmitting,
  submitFeedback,
}: Example9RunningNotificationsProps) => (
  <>
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
    {error && !loading && (
      <StatusBanner
        tone="error"
        title="Error en HyperSchema"
        description={formatLinkRunError(error)}
      />
    )}
    {submitFeedback && (
      <StatusBanner
        tone={submitFeedback.tone}
        title={submitFeedback.title}
        description={submitFeedback.description}
      />
    )}
  </>
);

const Example9 = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitFeedback, setSubmitFeedback] = useState<SubmitFeedback | null>(null);
  const [runningStatus, setRunningStatus] = useState<{ loading: boolean; error: unknown }>({
    loading: false,
    error: null,
  });
  const submitLoading = useRef(false);

  const handleSubmit = useCallback(async (submit: () => Promise<any>) => {
    if (submitLoading.current) return;

    submitLoading.current = true;
    setIsSubmitting(true);
    setSubmitFeedback(null);

    try {
      const result = await submit();
      console.log('result', result);
      if (result.ok) {
        setSubmitFeedback({
          tone: 'success',
          title: 'Publicación actualizada',
          description: 'El PUT se ejecutó correctamente en JSONPlaceholder.',
        });
      } else {
        setSubmitFeedback({
          tone: 'error',
          title: 'Error al guardar',
          description: formatLinkRunError(result.error),
        });
      }
    } finally {
      submitLoading.current = false;
      setIsSubmitting(false);
    }
  }, []);
  const handleRunning = useCallback(
    (ctx: { loading: boolean; error: unknown }) => {
      setRunningStatus((prev) =>
        prev.loading === ctx.loading && prev.error === ctx.error ? prev : ctx
      );
    },
    []
  );

  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">Ejemplo 9: Editar publicación</h1>
        <p className="page-description">
          Carga un post con GET e actualízalo con PUT en JSONPlaceholder.
        </p>
      </div>

      <div className="panel">
        <Example9RunningNotifications
          {...runningStatus}
          isSubmitting={isSubmitting}
          submitFeedback={submitFeedback}
        />
        <FormHyperschema
          hyperSchema={hyperSchema}
          options={{values: { id: 1 } }}
          disabled={isSubmitting}
          onSubmit={({ submit }) => handleSubmit(submit)}
          running={(ctx) => (handleRunning(ctx))}
        />
      </div>
    </div>
  );
};

export default Example9;
