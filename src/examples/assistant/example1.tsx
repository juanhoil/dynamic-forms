import React, { useState } from 'react';

type AnyRecord = Record<string, any>;

type ChatRole = 'user' | 'assistant' | 'tool';

type ChatMessage = {
  role: ChatRole;
  content: string;
  name?: string;
};

type JsonSchema = {
  type?: string;
  title?: string;
  description?: string;
  readOnly?: boolean;
  enum?: unknown[];
  enumNames?: string[];
  properties?: Record<string, JsonSchema>;
  required?: string[];
};

type McpTool = {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
};

type RoleResponse = {
  schema?: JsonSchema;
  jsonSchema?: JsonSchema;
  jschema?: JsonSchema;
  uiSchema?: AnyRecord;
  formData?: AnyRecord;
  dataInit?: AnyRecord;
  dataform?: AnyRecord;
  dataformUpdate?: AnyRecord;
  jschemaUpdate?: Partial<JsonSchema>;
  dependentWatchFields?: string[];
  warnings?: Array<{ status?: number; error?: boolean; message: string }>;
  changed?: boolean;
};

type FormAgentState = {
  schema: JsonSchema;
  uiSchema: AnyRecord;
  dataInit: AnyRecord;
  formData: AnyRecord;
  dependentWatchFields: string[];
  sessionId: string;
  lastDependentWatchKey: string;
};

type AssistantIntent = {
  intent: 'update' | 'submit' | 'question';
  updates: AnyRecord;
  answer?: string;
};

const API_BASE = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3000';
const OPENAI_API_KEY = (import.meta as any).env?.VITE_OPENAI_API_KEY ?? '';
const OPENAI_MODEL = (import.meta as any).env?.VITE_OPENAI_MODEL ?? 'gpt-4o-mini';

const MCP_TOOL = {
  ConfigGet: 'form_config_get',
  Init: 'form_init',
  Dependent: 'form_dependent',
  Submit: 'form_submit',
} as const;

const DEFAULT_FORM_ID = 1;
const DEFAULT_USER_ID = 1;

const SYSTEM_PROMPT = `
Eres un agente de formularios FENIX. Tu trabajo es reemplazar el modal/form visual:
1. Pedir al usuario los datos editables del formulario.
2. Interpretar mensajes del usuario como cambios en formData.
3. Detectar si quiere guardar/enviar y entonces marcar intent submit.
4. No inventar campos: usa solo las propiedades del schema.
Devuelve SIEMPRE JSON con esta forma:
{"intent":"update|submit|question","updates":{},"answer":"texto opcional"}
`.trim();

const createSessionId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const parseJson = (value: string | undefined): AnyRecord => {
  if (!value) return {};
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
};

const readMcpText = (value: any) => {
  const text = value?.content?.[0]?.text;
  return typeof text === 'string' ? parseJson(text) : value;
};

const buildWatchKey = (fields: string[], data: AnyRecord) =>
  JSON.stringify(fields.map((field) => [field, data?.[field]]));

const fieldLabel = (name: string, schema?: JsonSchema) => schema?.title || name;

const editableFields = (schema?: JsonSchema) =>
  Object.entries(schema?.properties || {}).filter(([, field]) => !field.readOnly);

const missingRequiredFields = (schema: JsonSchema, formData: AnyRecord) =>
  (schema.required || []).filter((field) => {
    const value = formData[field];
    return value === undefined || value === null || value === '';
  });

const invalidEnumFields = (schema: JsonSchema, formData: AnyRecord) =>
  editableFields(schema)
    .filter(([name, field]) => {
      const value = formData[name];
      return value !== undefined && field.enum?.length && !field.enum.includes(value);
    })
    .map(([name]) => name);

const getNextTargetField = (schema: JsonSchema, formData: AnyRecord) => {
  const missing = missingRequiredFields(schema, formData);
  const invalid = invalidEnumFields(schema, formData);
  return missing[0] || invalid[0] || editableFields(schema).find(([name]) => formData[name] === undefined)?.[0];
};

const nextQuestion = (schema: JsonSchema, formData: AnyRecord) => {
  const invalid = invalidEnumFields(schema, formData);
  const target = getNextTargetField(schema, formData);
  if (!target) return 'Ya tengo los datos principales. Puedes indicar cambios o decir "guardar" para enviar.';

  const field = schema.properties?.[target];
  const options = field?.enum?.length
    ? ` Opciones: ${field.enum.map((item, index) => `${item}${field.enumNames?.[index] ? ` (${field.enumNames[index]})` : ''}`).join(', ')}.`
    : '';
  const currentValue = formData[target];
  const invalidText = invalid.includes(target)
    ? ` El valor actual "${currentValue}" ya no es válido.`
    : '';
  return `Dime el valor para "${fieldLabel(target, field)}".${invalidText}${options}`;
};

const summarizeFields = (schema: JsonSchema, formData: AnyRecord) =>
  editableFields(schema)
    .map(([name, field]) => `- ${fieldLabel(name, field)} (${name}): ${formData[name] ?? 'pendiente'}`)
    .join('\n');

const JsonPanel = ({ title, value }: { title: string; value: unknown }) => (
  <section
    style={{
      border: '1px solid #e5e7eb',
      borderRadius: '14px',
      overflow: 'hidden',
      background: '#ffffff',
      boxShadow: '0 10px 24px rgba(15, 23, 42, 0.06)',
      minWidth: 0,
    }}
  >
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.75rem 1rem',
        background: 'linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)',
        borderBottom: '1px solid #e5e7eb',
      }}
    >
      <strong style={{ color: '#1e293b' }}>{title}</strong>
    </div>
    <pre
      style={{
        margin: 0,
        padding: '1rem',
        maxHeight: '360px',
        overflow: 'auto',
        whiteSpace: 'pre-wrap',
        fontSize: '0.8125rem',
        lineHeight: 1.5,
        background: '#0f172a',
        color: '#e2e8f0',
      }}
    >
      {JSON.stringify(value, null, 2)}
    </pre>
  </section>
);

const FieldSummaryPanel = ({ schema, formData }: { schema: JsonSchema; formData: AnyRecord }) => (
  <section
    style={{
      border: '1px solid #dbeafe',
      borderRadius: '14px',
      background: '#eff6ff',
      padding: '1rem',
      color: '#1e3a8a',
    }}
  >
    <h3 style={{ marginTop: 0, marginBottom: '0.75rem' }}>Resumen actual</h3>
    <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
      {summarizeFields(schema, formData)}
    </pre>
  </section>
);

const coerceValue = (value: unknown, schema?: JsonSchema) => {
  if (schema?.type === 'number' || schema?.type === 'integer') {
    const numeric = Number(value);
    return Number.isNaN(numeric) ? value : numeric;
  }
  if (schema?.type === 'boolean') {
    if (typeof value === 'boolean') return value;
    return ['true', 'si', 'sí', '1'].includes(String(value).toLowerCase());
  }
  return value;
};

const matchesEnumOption = (value: string, schema?: JsonSchema) => {
  if (!schema?.enum?.length) return false;
  const normalized = value.trim().toLowerCase();
  return schema.enum.some((option, index) => {
    const enumName = schema.enumNames?.[index];
    return (
      String(option).toLowerCase() === normalized ||
      String(enumName || '').toLowerCase() === normalized ||
      String(enumName || '').toLowerCase().includes(normalized)
    );
  });
};

const resolveFieldName = (schema: JsonSchema, name: string) => {
  if (schema.properties?.[name]) return name;
  return Object.keys(schema.properties || {}).find(
    (field) => field.toLowerCase() === name.toLowerCase()
  );
};

const applySchemaUpdate = (schema: JsonSchema, update?: Partial<JsonSchema>): JsonSchema => {
  if (!update) return schema;
  return {
    ...schema,
    ...update,
    properties: {
      ...(schema.properties || {}),
      ...(update.properties || {}),
    },
  };
};

const localIntent = (message: string, schema?: JsonSchema): AssistantIntent => {
  const normalized = message.toLowerCase();
  const intent = /\b(guardar|enviar|submit|actualizar|finalizar)\b/.test(normalized)
    ? 'submit'
    : 'update';
  const updates: AnyRecord = {};

  const jsonStart = message.indexOf('{');
  const jsonEnd = message.lastIndexOf('}');
  if (jsonStart >= 0 && jsonEnd > jsonStart) {
    Object.assign(updates, parseJson(message.slice(jsonStart, jsonEnd + 1)));
  }

  for (const [name, field] of editableFields(schema)) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = message.match(new RegExp(`${escaped}\\s*[:=]\\s*([^,\\n]+)`, 'i'));
    if (match?.[1]) updates[name] = coerceValue(match[1].trim(), field);
  }

  return { intent, updates };
};

const inferPendingFieldUpdate = (
  message: string,
  schema: JsonSchema,
  formData: AnyRecord
): AnyRecord => {
  const trimmed = message.trim();
  if (!trimmed || trimmed.includes('?')) return {};
  if (/[{}:=]/.test(trimmed)) return {};

  const target = getNextTargetField(schema, formData);
  if (!target) return {};

  const field = schema.properties?.[target];
  const looksLikeSingleValue = !/\s/.test(trimmed);
  const isKnownEnumOption = matchesEnumOption(trimmed, field);
  if (!looksLikeSingleValue && !isKnownEnumOption) return {};

  return { [target]: coerceValue(trimmed, field) };
};

const callMcp = async (method: string, params?: AnyRecord) => {
  const response = await fetch(`${API_BASE}/api/forms/mcp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params }),
  });
  const payload = await response.json();
  if (!response.ok || payload.error) throw new Error(JSON.stringify(payload.error ?? payload, null, 2));
  return payload.result;
};

const loadMcpTools = async (): Promise<McpTool[]> => {
  const result = await callMcp('tools/list');
  return Array.isArray(result?.tools) ? result.tools : [];
};

const callMcpTool = async (name: string, args: AnyRecord) => {
  const result = await callMcp('tools/call', { name, arguments: args });
  const payload = readMcpText(result) as RoleResponse;
  return {
    ...payload,
    schema: payload.schema ?? payload.jschema ?? payload.jsonSchema,
    formData: payload.formData ?? payload.dataform ?? payload.dataInit,
  } as RoleResponse;
};

const extractIntentWithOpenAi = async (
  message: string,
  schema: JsonSchema,
  formData: AnyRecord
): Promise<AssistantIntent> => {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: JSON.stringify({
            userMessage: message,
            schemaProperties: schema.properties || {},
            required: schema.required || [],
            currentFormData: formData,
            missingFields: missingRequiredFields(schema, formData),
            invalidEnumFields: invalidEnumFields(schema, formData),
          }),
        },
      ],
    }),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(JSON.stringify(payload, null, 2));
  return { updates: {}, ...parseJson(payload.choices?.[0]?.message?.content) } as AssistantIntent;
};

const extractIntent = async (
  message: string,
  schema: JsonSchema,
  formData: AnyRecord
) => {
  try {
    if (OPENAI_API_KEY) {
      return await extractIntentWithOpenAi(message, schema, formData);
    }
  } catch {
    // Si el modelo falla, el agente conserva un parser local básico.
  }
  return localIntent(message, schema);
};

const ExampleAssistant1 = () => {
  const [formId, setFormId] = useState(DEFAULT_FORM_ID);
  const [userId, setUserId] = useState(DEFAULT_USER_ID);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [tools, setTools] = useState<McpTool[]>([]);
  const [agentState, setAgentState] = useState<FormAgentState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const appendMessage = (message: ChatMessage) => {
    setMessages((current) => [...current, message]);
  };

  const initAgent = async () => {
    setLoading(true);
    setError(null);
    setMessages([]);
    try {
      const loadedTools = await loadMcpTools();
      setTools(loadedTools);
      const sessionId = createSessionId();
      const result = await callMcpTool(MCP_TOOL.Init, {
        formId,
        sessionId,
        values: { userId },
        useTestValues: false,
      });
      const schema = result.schema || {};
      const formData = result.formData || {};
      const dependentWatchFields = result.dependentWatchFields || [];
      setAgentState({
        schema,
        uiSchema: result.uiSchema || {},
        dataInit: formData,
        formData,
        dependentWatchFields,
        sessionId,
        lastDependentWatchKey: buildWatchKey(dependentWatchFields, formData),
      });
      appendMessage({
        role: 'assistant',
        content: `Formulario inicializado.\n\n${summarizeFields(schema, formData)}\n\n${nextQuestion(schema, formData)}`,
      });
      if (result.warnings?.length) {
        appendMessage({
          role: 'tool',
          name: MCP_TOOL.Init,
          content: result.warnings.map((warning) => warning.message).join('\n'),
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inicializando el agente.');
    } finally {
      setLoading(false);
    }
  };

  const applyDependentIfNeeded = async (state: FormAgentState, formData: AnyRecord) => {
    if (!state.dependentWatchFields.length) return { state: { ...state, formData }, changed: false };

    const watchKey = buildWatchKey(state.dependentWatchFields, formData);
    if (watchKey === state.lastDependentWatchKey) {
      return { state: { ...state, formData }, changed: false };
    }

    const result = await callMcpTool(MCP_TOOL.Dependent, {
      formId,
      sessionId: state.sessionId,
      jschema: state.schema,
      dataform: formData,
      values: { userId },
      useTestValues: false,
    });

    if (result.changed === false) {
      return {
        state: { ...state, formData, lastDependentWatchKey: watchKey },
        changed: false,
      };
    }

    const nextSchema = result.schema || applySchemaUpdate(state.schema, result.jschemaUpdate);
    const nextData = {
      ...formData,
      ...(result.formData || {}),
      ...(result.dataformUpdate || {}),
    };
    return {
      state: {
        ...state,
        schema: nextSchema,
        formData: nextData,
        lastDependentWatchKey: buildWatchKey(state.dependentWatchFields, nextData),
      },
      changed: true,
      warnings: result.warnings || [],
    };
  };

  const submitForm = async (state: FormAgentState) => {
    const missing = missingRequiredFields(state.schema, state.formData);
    const invalid = invalidEnumFields(state.schema, state.formData);
    if (missing.length || invalid.length) {
      return {
        state,
        content: [
          missing.length ? `Aún faltan campos requeridos: ${missing.join(', ')}.` : '',
          invalid.length ? `Hay campos con valores inválidos: ${invalid.join(', ')}.` : '',
          nextQuestion(state.schema, state.formData),
        ].filter(Boolean).join('\n'),
      };
    }

    const result = await callMcpTool(MCP_TOOL.Submit, {
      formId,
      sessionId: state.sessionId,
      jschema: state.schema,
      dataform: state.formData,
      values: { userId },
      useTestValues: false,
    });

    const nextState = {
      ...state,
      schema: result.schema || state.schema,
      formData: result.formData || state.formData,
    };
    return {
      state: nextState,
      content: `Listo, ejecuté submit del formulario.\n\n${summarizeFields(nextState.schema, nextState.formData)}`,
      warnings: result.warnings || [],
    };
  };

  const sendMessage = async () => {
    if (!input.trim() || !agentState) return;
    const userMessage = input.trim();
    setInput('');
    setLoading(true);
    setError(null);
    appendMessage({ role: 'user', content: userMessage });

    try {
      const intent = await extractIntent(userMessage, agentState.schema, agentState.formData);
      const pendingFieldUpdate =
        Object.keys(intent.updates || {}).length === 0
          ? inferPendingFieldUpdate(userMessage, agentState.schema, agentState.formData)
          : {};
      const updates = {
        ...(intent.updates || {}),
        ...pendingFieldUpdate,
      };
      let nextState = agentState;

      if (Object.keys(updates).length) {
        const coercedUpdates = Object.entries(updates).reduce<AnyRecord>(
          (updates, [name, value]) => {
            const fieldName = resolveFieldName(agentState.schema, name);
            if (!fieldName) return updates;
            updates[fieldName] = coerceValue(value, agentState.schema.properties?.[fieldName]);
            return updates;
          },
          {}
        );
        const nextData = { ...agentState.formData, ...coercedUpdates };
        const dependent = await applyDependentIfNeeded(agentState, nextData);
        nextState = dependent.state;
        setAgentState(nextState);
        appendMessage({
          role: 'tool',
          name: dependent.changed ? MCP_TOOL.Dependent : 'local_change',
          content: JSON.stringify(coercedUpdates, null, 2),
        });
        if (dependent.warnings?.length) {
          appendMessage({
            role: 'tool',
            name: MCP_TOOL.Dependent,
            content: dependent.warnings.map((warning) => warning.message).join('\n'),
          });
        }
      }

      if (intent.intent === 'submit') {
        const submitted = await submitForm(nextState);
        setAgentState(submitted.state);
        appendMessage({ role: 'tool', name: MCP_TOOL.Submit, content: 'submit ejecutado' });
        if (submitted.warnings?.length) {
          appendMessage({
            role: 'tool',
            name: MCP_TOOL.Submit,
            content: submitted.warnings.map((warning) => warning.message).join('\n'),
          });
        }
        appendMessage({ role: 'assistant', content: submitted.content });
        return;
      }

      const inferredPendingField = Object.keys(pendingFieldUpdate).length > 0;
      const answer =
        !inferredPendingField && intent.answer
          ? intent.answer
          : `Actualicé el formulario.\n\n${summarizeFields(nextState.schema, nextState.formData)}\n\n${nextQuestion(
              nextState.schema,
              nextState.formData
            )}`;
      appendMessage({ role: 'assistant', content: answer });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error procesando mensaje.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">Assistant Example 1: agente de formulario MCP</h1>
        <p className="page-description">
          El agente reemplaza el modal: pide datos, interpreta cambios, ejecuta dependent cuando aplica y sabe hacer submit.
        </p>
      </div>

      <div className="panel" style={{ display: 'grid', gap: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
          <label style={{ display: 'grid', gap: '0.5rem' }}>
            <strong>formId</strong>
            <input type="number" value={formId} onChange={(event) => setFormId(Number(event.target.value))} />
          </label>
          <label style={{ display: 'grid', gap: '0.5rem' }}>
            <strong>userid</strong>
            <input type="number" value={userId} onChange={(event) => setUserId(Number(event.target.value))} />
          </label>
        </div>

        <div
          style={{
            border: '1px solid #bfdbfe',
            borderRadius: '14px',
            background: '#eff6ff',
            padding: '1rem',
            color: '#1e3a8a',
          }}
        >
          Modelo activo: <strong>OpenAI ({OPENAI_MODEL})</strong>. MCP: <code>{API_BASE}/api/forms/mcp</code>. Si no hay
          <code> VITE_OPENAI_API_KEY</code> o falla la llamada, se usa un parser local básico.
        </div>

        <button onClick={initAgent} disabled={loading} type="button">
          {loading ? 'Procesando...' : 'Inicializar agente'}
        </button>

        {error && (
          <pre style={{ padding: '1rem', borderRadius: '12px', background: '#fef2f2', color: '#991b1b', whiteSpace: 'pre-wrap' }}>
            {error}
          </pre>
        )}
      </div>

      <div className="panel" style={{ marginTop: '1.5rem' }}>
        <h2 className="panel-title">Chat del agente</h2>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {messages.map((message, index) => (
            <article key={`${message.role}-${index}`} style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '1rem' }}>
              <strong>{message.name ? `${message.role}: ${message.name}` : message.role}</strong>
              <pre style={{ margin: '0.75rem 0 0', whiteSpace: 'pre-wrap', overflow: 'auto' }}>{message.content}</pre>
            </article>
          ))}
          {!messages.length && <p>Inicializa el agente para empezar a pedir datos del formulario.</p>}
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void sendMessage();
            }}
            disabled={!agentState || loading}
            placeholder='Ej: CP=64000 planId=1 o "guardar"'
            style={{ flex: 1 }}
          />
          <button onClick={sendMessage} disabled={!agentState || loading || !input.trim()} type="button">
            Enviar
          </button>
        </div>
      </div>

      <div className="panel" style={{ marginTop: '1.5rem' }}>
        <h2 className="panel-title">Estado del formulario</h2>
        {agentState ? (
          <div style={{ display: 'grid', gap: '1rem' }}>
            <FieldSummaryPanel schema={agentState.schema} formData={agentState.formData} />
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '1rem',
              }}
            >
              <JsonPanel title="dataInit" value={agentState.dataInit} />
              <JsonPanel title="dataCurrent" value={agentState.formData} />
            </div>
            <JsonPanel title="jsonSchema" value={agentState.schema} />
          </div>
        ) : (
          <p>No hay formulario activo.</p>
        )}
      </div>

      <div className="panel" style={{ marginTop: '1.5rem' }}>
        <h2 className="panel-title">Tools MCP detectadas</h2>
        {tools.length ? (
          <ul>
            {tools.map((tool) => (
              <li key={tool.name}>
                <strong>{tool.name}</strong>: {tool.description}
              </li>
            ))}
          </ul>
        ) : (
          <p>Aún no se han cargado tools.</p>
        )}
      </div>
    </div>
  );
};

export default ExampleAssistant1;
