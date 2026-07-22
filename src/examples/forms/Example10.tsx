import React, { useCallback, useState } from 'react';
import ServerFormHyperschema, {
  formatServerFormError,
  formatServerFormIssue,
  type ServerFormRunningContext,
} from './example8/components/ServerFormHyperschema';

const CONFIG_ID = 4;
const API_BASE =
  (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3000';

type StatusTone = 'info' | 'success' | 'error';

const STATUS_TONE: Record<StatusTone, { border: string; background: string; color: string; spinner: string }> = {
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
};

type StatusBannerProps = {
  title: string;
  description: string;
  tone?: StatusTone;
};

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

type SubmitFeedback = { tone: 'success' | 'error'; title: string; description: string };

const Example10 = () => {
  const [userContext, setUserContext] = useState({ idPoliza: 1 });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitFeedback, setSubmitFeedback] = useState<SubmitFeedback | null>(null);
  const [runningStatus, setRunningStatus] = useState<ServerFormRunningContext>({
    loading: true,
    issues: [],
    schemaWithoutLinks: null,
  });

  const handleSubmit = useCallback(async (submit: () => Promise<unknown>) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setSubmitFeedback(null);
    try {
      const result = await submit();
      console.log('result', result);
      setSubmitFeedback({
        tone: 'success',
        title: 'Publicación actualizada',
        description: 'El backend ejecutó el link submit (PUT) en JSONPlaceholder.',
      });
    } catch (error) {
      setSubmitFeedback({
        tone: 'error',
        title: 'Error al guardar',
        description: formatServerFormError(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting]);

  const handleRunning = useCallback((ctx: ServerFormRunningContext) => {
    setRunningStatus(ctx);
  }, []);

  const issues = runningStatus.issues;
  const errors = issues.filter((issue) => issue.error);
  const warnings = issues.filter((issue) => !issue.error);

  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">Ejemplo 10: Editar publicación (resuelto en backend)</h1>
        <p className="page-description">
          Misma configuración que el Ejemplo 9, pero los links se resuelven en el
          servidor (<code>POST {API_BASE}/api/forms/init</code> y <code>/submit</code>).
        </p>
      </div>

      <div className="panel">
        {runningStatus.loading && !isSubmitting && (
          <StatusBanner
            title="Procesando formulario en el backend"
            description="Ejecutando la operación server-side y actualizando el schema del formulario."
          />
        )}
        {isSubmitting && (
          <StatusBanner
            title="Guardando publicación"
            description="El backend está ejecutando el link submit (PUT)."
          />
        )}
        {errors.length > 0 && !runningStatus.loading && (
          <StatusBanner
            tone="error"
            title="Error del motor"
            description={errors.map(formatServerFormIssue).join(' · ')}
          />
        )}
        {warnings.length > 0 && (
          <StatusBanner
            tone="info"
            title="Avisos del motor"
            description={warnings.map(formatServerFormIssue).join(' · ')}
          />
        )}
        {submitFeedback && (
          <StatusBanner
            tone={submitFeedback.tone}
            title={submitFeedback.title}
            description={submitFeedback.description}
          />
        )}

        <ServerFormHyperschema
          configId={CONFIG_ID}
          options={{ context: userContext }}
          disabled={isSubmitting}
          running={handleRunning}
          onSubmit={({ submit }) => handleSubmit(submit)}
        />
      </div>
    </div>
  );
};

export default Example10;
