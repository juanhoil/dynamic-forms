import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Form from '@rjsf/mui';
import validator from '@rjsf/validator-ajv8';
import type { FormProps, IChangeEvent } from '@rjsf/core';
import type { JsonHyperSchema } from '../../types';

type AnyRecord = Record<string, any>;

const DEFAULT_API_BASE =
  (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3000';

const createSessionId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

type FormRole = 'init' | 'dependent' | 'submit';

export type ServerFormIssue = {
  status?: number;
  error: boolean;
  message: string;
};

type RoleResponse = {
  schema?: JsonHyperSchema;
  uiSchema?: Record<string, unknown>;
  formData?: AnyRecord;
  dependentWatchFields?: string[];
  warnings?: ServerFormIssue[];
  changed?: boolean;
};

export type ServerFormRunningContext = {
  loading: boolean;
  issues: ServerFormIssue[];
  schemaWithoutLinks: JsonHyperSchema | null;
};

export type ServerFormSubmitContext = {
  submit: () => Promise<RoleResponse>;
};

type ServerFormOptions = {
  values?: AnyRecord;
  dependentDebounceMs?: number;
};

type RjsfPassthroughProps = Omit<
  FormProps<AnyRecord, any, any>,
  'schema' | 'validator' | 'formData' | 'uiSchema' | 'onChange' | 'onSubmit' | 'disabled'
>;

type ServerFormHyperschemaProps = RjsfPassthroughProps & {
  configId: number;
  apiBase?: string;
  options?: ServerFormOptions;
  disabled?: boolean;
  running?: (context: ServerFormRunningContext) => void;
  onFormData?: (formData: AnyRecord) => void;
  onActiveSchema?: (schema: JsonHyperSchema) => void;
  onChange?: FormProps<AnyRecord, any, any>['onChange'];
  onSubmit?: (context: ServerFormSubmitContext) => void | Promise<void>;
};

class BackendApiError extends Error {
  constructor(readonly issue: ServerFormIssue) {
    super(issue.message);
    this.name = 'BackendApiError';
  }
}

export const formatServerFormIssue = (issue: ServerFormIssue) => {
  const prefix = issue.status ? `[${issue.status}] ` : '';
  return `${prefix}${issue.message}`;
};

export const formatServerFormError = (error: unknown) => {
  if (error instanceof BackendApiError) return formatServerFormIssue(error.issue);
  if (error instanceof Error) return error.message;
  return String(error);
};

const toServerFormIssue = (error: unknown): ServerFormIssue =>
  error instanceof BackendApiError
    ? error.issue
    : { status: 500, error: true, message: formatServerFormError(error) };

const buildWatchKey = (fields: string[], data: AnyRecord) =>
  JSON.stringify(fields.map((field) => [field, data?.[field]]));

const resolveOnBackend = async (
  apiBase: string,
  configId: number,
  role: FormRole,
  sessionId: string,
  payload: AnyRecord
): Promise<RoleResponse> => {
  const response = await fetch(`${apiBase}/api/forms/${role}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: configId, sessionId, ...payload }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    let issue: ServerFormIssue = {
      status: response.status,
      error: true,
      message: text || response.statusText,
    };
    if (text) {
      try {
        const parsed = JSON.parse(text) as Partial<ServerFormIssue>;
        issue = {
          status: parsed.status || response.status,
          error: parsed.error ?? true,
          message: parsed.message || issue.message,
        };
      } catch {
        // Texto plano del servidor: se usa como message.
      }
    }
    throw new BackendApiError(issue);
  }

  const text = await response.text();
  return text ? JSON.parse(text) : { changed: false };
};

export function ServerFormHyperschema({
  configId,
  apiBase = DEFAULT_API_BASE,
  options = {},
  disabled = false,
  running,
  onFormData,
  onActiveSchema,
  onChange,
  onSubmit,
  ...formProps
}: ServerFormHyperschemaProps) {
  const { values = {}, dependentDebounceMs = 700 } = options;
  const valuesKey = JSON.stringify(values);
  const runtimeValues = useMemo(() => values, [valuesKey]);
  const [schema, setSchema] = useState<JsonHyperSchema | null>(null);
  const [uiSchema, setUiSchema] = useState<Record<string, unknown>>({});
  const [formData, setFormData] = useState<AnyRecord>({});
  const [loading, setLoading] = useState(true);
  const [initIssues, setInitIssues] = useState<ServerFormIssue[]>([]);
  const [dependentIssues, setDependentIssues] = useState<ServerFormIssue[]>([]);
  const [dependentWatchFields, setDependentWatchFields] = useState<string[]>([]);
  const sessionId = useRef(createSessionId());
  const dependentRequestId = useRef(0);
  const lastDependentWatchKey = useRef('');
  const userChangedFormRef = useRef(false);
  const schemaReady = Boolean(schema);

  const applySchema = useCallback(
    (nextSchema?: JsonHyperSchema) => {
      if (!nextSchema) return;
      setSchema(nextSchema);
      onActiveSchema?.(nextSchema);
    },
    [onActiveSchema]
  );

  const applyFormData = useCallback(
    (nextFormData: AnyRecord) => {
      setFormData(nextFormData);
      onFormData?.(nextFormData);
    },
    [onFormData]
  );

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setInitIssues([]);
      try {
        const result = await resolveOnBackend(apiBase, configId, 'init', sessionId.current, {
          values: runtimeValues,
        });
        if (cancelled) return;
        applySchema(result.schema);
        setUiSchema(result.uiSchema || {});
        const initialData = result.formData || {};
        const watchFields = result.dependentWatchFields || [];
        applyFormData(initialData);
        setDependentWatchFields(watchFields);
        setInitIssues(result.warnings || []);
        lastDependentWatchKey.current = buildWatchKey(watchFields, initialData);
      } catch (err) {
        if (!cancelled) setInitIssues([toServerFormIssue(err)]);
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
  }, [apiBase, applyFormData, applySchema, configId, runtimeValues]);

  const handleChange = useCallback(
    (event: IChangeEvent<AnyRecord, any, any>, id?: string) => {
      userChangedFormRef.current = true;
      applyFormData(event.formData || {});
      onChange?.(event, id);
    },
    [applyFormData, onChange]
  );

  useEffect(() => {
    if (!schemaReady || loading || disabled) return undefined;
    if (!userChangedFormRef.current) return undefined;
    if (dependentWatchFields.length === 0) return undefined;

    const watchKey = buildWatchKey(dependentWatchFields, formData);
    if (watchKey === lastDependentWatchKey.current) return undefined;

    const requestId = dependentRequestId.current + 1;
    dependentRequestId.current = requestId;
    lastDependentWatchKey.current = watchKey;

    const timer = window.setTimeout(async () => {
      setLoading(true);
      setDependentIssues([]);
      try {
        const result = await resolveOnBackend(apiBase, configId, 'dependent', sessionId.current, {
          formData,
        });
        if (dependentRequestId.current !== requestId) return;
        if (result.changed === false || !result.schema) return;
        applySchema(result.schema);
        if (result.formData) {
          userChangedFormRef.current = false;
          applyFormData(result.formData);
          lastDependentWatchKey.current = buildWatchKey(dependentWatchFields, result.formData);
        }
        setDependentIssues(result.warnings || []);
      } catch (err) {
        if (dependentRequestId.current !== requestId) return;
        setDependentIssues([toServerFormIssue(err)]);
      } finally {
        if (dependentRequestId.current === requestId) {
          setLoading(false);
        }
      }
    }, dependentDebounceMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    apiBase,
    applyFormData,
    applySchema,
    configId,
    dependentDebounceMs,
    dependentWatchFields,
    disabled,
    formData,
    loading,
    schemaReady,
  ]);

  const submit = useCallback(async () => {
    setLoading(true);
    try {
      const result = await resolveOnBackend(apiBase, configId, 'submit', sessionId.current, {
        formData,
        values: runtimeValues,
      });
      applySchema(result.schema);
      if (result.formData) applyFormData(result.formData);
      return result;
    } finally {
      setLoading(false);
    }
  }, [apiBase, applyFormData, applySchema, configId, formData, runtimeValues]);

  const handleSubmit = () => onSubmit?.({ submit });

  const issues = useMemo(
    () => [...initIssues, ...dependentIssues],
    [dependentIssues, initIssues]
  );

  useEffect(() => {
    running?.({
      loading,
      issues,
      schemaWithoutLinks: schema,
    });
  }, [issues, loading, running, schema]);

  if (!schema) return null;

  return (
    <Form
      {...formProps}
      schema={schema}
      uiSchema={uiSchema}
      formData={formData}
      validator={validator}
      disabled={disabled}
      onChange={handleChange}
      onSubmit={handleSubmit}
    />
  );
}

export default ServerFormHyperschema;
