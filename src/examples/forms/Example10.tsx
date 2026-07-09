// ---------------------------------------------------------------------------
// Ejemplo 10: misma configuración que el Ejemplo 9, pero la resolución de los
// links (init/submit) la hace el BACKEND (hyperschema-engine expuesto por
// NestJS), no el cliente.
//
// Flujo:
//   1. Al montar: POST /api/forms/init con el hyperSchema → el backend ejecuta
//      los links `init`/`catalog`, aplica los mappings y devuelve el JSON
//      Schema ya resuelto (sin links) + la data.
//   2. Se renderiza con RJSF puro (sin el hook useJsonHyperSchema).
//   3. Al enviar: POST /api/forms/submit con { hyperSchema, formData }.
//
// Requiere el backend corriendo (cd backend && npm start).
// ---------------------------------------------------------------------------

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Form from '@rjsf/mui';
import validator from '@rjsf/validator-ajv8';
import type { IChangeEvent } from '@rjsf/core';
import type { JsonHyperSchema } from './types';

type AnyRecord = Record<string, any>;

const API_BASE =
  (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3000';

// Id de la configuración guardada en el backend (form-config/get/1).
// El front NO conoce el hyperSchema ni los links: solo referencia la config.
const CONFIG_ID = 1;

const createSessionId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

type FormRole = 'init' | 'dependent' | 'submit';

type RoleResponse = {
  // Solo init/resolve devuelven uiSchema y formData; dependent/submit solo schema.
  schema?: JsonHyperSchema;
  uiSchema?: Record<string, unknown>;
  formData?: AnyRecord;
  dependentWatchFields?: string[];
  warnings?: string[];
  changed?: boolean;
};

const buildWatchKey = (fields: string[], data: AnyRecord) =>
  JSON.stringify(fields.map((field) => [field, data?.[field]]));

// Llama al motor de HyperSchema en el backend para un rol concreto.
const resolveOnBackend = async (
  role: FormRole,
  sessionId: string,
  payload: AnyRecord
): Promise<RoleResponse> => {
  const response = await fetch(`${API_BASE}/api/forms/${role}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: CONFIG_ID, sessionId, ...payload }),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`HTTP ${response.status} — ${text || response.statusText}`);
  }
  const text = await response.text();
  return text ? JSON.parse(text) : { changed: false };
};

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
  const [schema, setSchema] = useState<JsonHyperSchema | null>(null);
  const [uiSchema, setUiSchema] = useState<Record<string, unknown>>({});
  const [formData, setFormData] = useState<AnyRecord>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dependentLoading, setDependentLoading] = useState(false);
  const [dependentError, setDependentError] = useState<string | null>(null);
  const [dependentWarnings, setDependentWarnings] = useState<string[]>([]);
  const [dependentWatchFields, setDependentWatchFields] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitFeedback, setSubmitFeedback] = useState<SubmitFeedback | null>(null);
  const sessionId = useRef(createSessionId());
  const dependentRequestId = useRef(0);
  const lastDependentWatchKey = useRef('');
  const userChangedFormRef = useRef(false);
  const schemaReady = Boolean(schema);

  // Carga inicial: el backend resuelve los links init/catalog y devuelve
  // schema (sin links) + uiSchema + data.
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const result = await resolveOnBackend('init', sessionId.current, { values: { userId: 1 } });
        if (cancelled) return;
        if (result.schema) setSchema(result.schema);
        setUiSchema(result.uiSchema || {});
        const initialData = result.formData || {};
        const watchFields = result.dependentWatchFields || [];
        setFormData(initialData);
        setDependentWatchFields(watchFields);
        lastDependentWatchKey.current = buildWatchKey(watchFields, initialData);
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : String(error));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const frame = window.requestAnimationFrame(() => {
      load();
    });
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
    };
  }, []);

  const handleChange = useCallback((event: IChangeEvent<AnyRecord>) => {
    userChangedFormRef.current = true;
    setFormData(event.formData || {});
  }, []);

  // Links dependent: el backend recibe la data actual y responde solo con el
  // schema público (sin links). El debounce evita una request por tecla.
  useEffect(() => {
    if (!schemaReady || loading || isSubmitting) return undefined;
    if (!userChangedFormRef.current) return undefined;
    if (dependentWatchFields.length === 0) return undefined;

    const watchKey = buildWatchKey(dependentWatchFields, formData);
    if (watchKey === lastDependentWatchKey.current) return undefined;

    const requestId = dependentRequestId.current + 1;
    dependentRequestId.current = requestId;
    lastDependentWatchKey.current = watchKey;

    const timer = window.setTimeout(async () => {
      setDependentLoading(true);
      setDependentError(null);
      try {
        const result = await resolveOnBackend('dependent', sessionId.current, { formData });
        if (dependentRequestId.current !== requestId) return;
        if (result.changed === false || !result.schema) return;
        setSchema(result.schema);
        if (result.formData) {
          userChangedFormRef.current = false;
          setFormData(result.formData);
          lastDependentWatchKey.current = buildWatchKey(dependentWatchFields, result.formData);
        }
        setDependentWarnings(result.warnings || []);
      } catch (error) {
        if (dependentRequestId.current !== requestId) return;
        setDependentError(error instanceof Error ? error.message : String(error));
      } finally {
        if (dependentRequestId.current === requestId) {
          setDependentLoading(false);
        }
      }
    }, 700);

    return () => {
      window.clearTimeout(timer);
    };
  }, [dependentWatchFields, formData, isSubmitting, loading, schemaReady]);

  const handleSubmit = useCallback(async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setSubmitFeedback(null);
    try {
      // submit solo devuelve el schema (sin links); la data ya la tiene el front.
      const result = await resolveOnBackend('submit', sessionId.current, {
        formData,
        values: { id: formData.id ?? 1 },
      });
      if (result.schema) setSchema(result.schema);
      setSubmitFeedback({
        tone: 'success',
        title: 'Publicación actualizada',
        description: 'El backend ejecutó el link submit (PUT) en JSONPlaceholder.',
      });
    } catch (error) {
      setSubmitFeedback({
        tone: 'error',
        title: 'Error al guardar',
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, isSubmitting, schema]);

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
        {loading && (
          <StatusBanner
            title="Resolviendo formulario en el backend"
            description="Ejecutando los links init/catalog en el servidor y construyendo el schema."
          />
        )}
        {isSubmitting && (
          <StatusBanner
            title="Guardando publicación"
            description="El backend está ejecutando el link submit (PUT)."
          />
        )}
        {dependentLoading && !isSubmitting && (
          <StatusBanner
            title="Resolviendo dependencias"
            description="Ejecutando los links dependent en el backend con la data actual del formulario."
          />
        )}
        {loadError && !loading && (
          <StatusBanner
            tone="error"
            title="No se pudo resolver el formulario"
            description={`${loadError}. ¿Está corriendo el backend? (cd backend && npm start)`}
          />
        )}
        {dependentError && !dependentLoading && (
          <StatusBanner
            tone="error"
            title="Error resolviendo dependencias"
            description={dependentError}
          />
        )}
        {dependentWarnings.length > 0 && (
          <StatusBanner
            tone="info"
            title="Variables externas faltantes"
            description={dependentWarnings.join(' · ')}
          />
        )}
        {submitFeedback && (
          <StatusBanner
            tone={submitFeedback.tone}
            title={submitFeedback.title}
            description={submitFeedback.description}
          />
        )}

        {schema && (
          <Form
            schema={schema}
            uiSchema={uiSchema}
            formData={formData}
            validator={validator}
            disabled={isSubmitting}
            onChange={handleChange}
            onSubmit={() => handleSubmit()}
          />
        )}
      </div>
    </div>
  );
};

export default Example10;
