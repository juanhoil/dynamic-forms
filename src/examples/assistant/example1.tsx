import React, { useRef, useState } from 'react';

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

// Contrato unificado que devuelven TODAS las tools del MCP.
type McpResult = {
  ok?: boolean;
  changed?: boolean;
  data?: AnyRecord;
  schema?: JsonSchema;
  uiSchema?: AnyRecord;
  delta?: { data?: AnyRecord; schema?: Partial<JsonSchema> };
  dependentWatchFields?: string[];
  warnings?: Array<{ status?: number; error?: boolean; message: string }>;
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

type OpenAiToolCall = {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
};

type OpenAiMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  name?: string;
  tool_calls?: OpenAiToolCall[];
  tool_call_id?: string;
};

const API_BASE = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3000';
const OPENAI_API_KEY = (import.meta as any).env?.VITE_OPENAI_API_KEY ?? '';
const OPENAI_MODEL = (import.meta as any).env?.VITE_OPENAI_MODEL ?? 'gpt-4o-mini';

const MCP_TOOL = {
  Init: 'form_init',
  Dependent: 'form_dependent',
  Submit: 'form_submit',
} as const;

const MAX_TOOL_ROUNDS = 6;
const DEFAULT_FORM_ID = 1;
const DEFAULT_USER_ID = 1;

const SYSTEM_PROMPT = `
Eres un agente de formularios FENIX que reemplaza el modal/formulario visual.
Guias al usuario para completar el formulario y luego lo envias.

Herramientas (usalas via function calling):
- form_dependent: aplica cambios de campos y recalcula dependencias. En "data" pasa SOLO los campos que cambian, ej {"cp":"64000"}. Llamala cada vez que el usuario proporcione o cambie un valor.
- form_submit: envia el formulario. Usala SOLO cuando el usuario pida guardar/enviar y no falten requeridos ni haya valores invalidos.

Reglas:
- Usa solo propiedades que existan en el schema; no inventes campos.
- Si un campo tiene enum, usa exactamente uno de los valores permitidos.
- Tras cada tool revisa el resultado (data, schema, warnings) y pide el siguiente dato faltante o corrige valores invalidos (por ejemplo si "colonia" cambio de opciones y el valor ya no es valido).
- Responde en español, breve y claro.
- El sistema inyecta sessionId, formId y schema: no los pidas ni los pases tu.
`.trim();

const createSessionId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const parseJson = (value: string | undefined | null): AnyRecord => {
  if (!value) return {};
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
};

const readMcpText = (value: any): McpResult => {
  const text = value?.content?.[0]?.text;
  return (typeof text === 'string' ? parseJson(text) : value) as McpResult;
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
  return (
    missing[0] ||
    invalid[0] ||
    editableFields(schema).find(([name]) => formData[name] === undefined)?.[0]
  );
};

const nextQuestion = (schema: JsonSchema, formData: AnyRecord) => {
  const invalid = invalidEnumFields(schema, formData);
  const target = getNextTargetField(schema, formData);
  if (!target) return 'Ya tengo los datos principales. Puedes indicar cambios o decir "guardar" para enviar.';

  const field = schema.properties?.[target];
  const options = field?.enum?.length
    ? ` Opciones: ${field.enum
        .map((item, index) => `${item}${field.enumNames?.[index] ? ` (${field.enumNames[index]})` : ''}`)
        .join(', ')}.`
    : '';
  const currentValue = formData[target];
  const invalidText = invalid.includes(target) ? ` El valor actual "${currentValue}" ya no es válido.` : '';
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
    <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{summarizeFields(schema, formData)}</pre>
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
  return Object.keys(schema.properties || {}).find((field) => field.toLowerCase() === name.toLowerCase());
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

// Normaliza el patch del modelo: resuelve nombres de campo y coacciona tipos.
const coercePatch = (schema: JsonSchema, patch: AnyRecord = {}): AnyRecord =>
  Object.entries(patch).reduce<AnyRecord>((acc, [name, value]) => {
    const fieldName = resolveFieldName(schema, name);
    if (!fieldName) return acc;
    acc[fieldName] = coerceValue(value, schema.properties?.[fieldName]);
    return acc;
  }, {});

// ¿El patch modifica algun campo declarado en dependentWatchFields? Solo en
// ese caso tiene sentido llamar a form_dependent.
const dependentWatchChanged = (state: FormAgentState, patch: AnyRecord = {}): boolean => {
  if (!state.dependentWatchFields.length) return false;
  const nextData = { ...state.formData, ...patch };
  return buildWatchKey(state.dependentWatchFields, nextData) !== state.lastDependentWatchKey;
};

// Fija valores en formData sin ir al backend (cambio que no dispara dependent).
const mergeLocalData = (state: FormAgentState, patch: AnyRecord = {}): FormAgentState => {
  const formData = { ...state.formData, ...patch };
  return {
    ...state,
    formData,
    lastDependentWatchKey: buildWatchKey(state.dependentWatchFields, formData),
  };
};

// Aplica el contrato unificado al estado del agente. El backend devuelve el
// `data`/`schema` completos; `delta` (de form_dependent) se usa como respaldo.
const applyResultToState = (state: FormAgentState, result: McpResult): FormAgentState => {
  const schema = result.schema ?? applySchemaUpdate(state.schema, result.delta?.schema);
  const formData = result.data ?? { ...state.formData, ...(result.delta?.data || {}) };
  return {
    ...state,
    schema,
    formData,
    lastDependentWatchKey: buildWatchKey(state.dependentWatchFields, formData),
  };
};

const localIntent = (message: string, schema?: JsonSchema) => {
  const normalized = message.toLowerCase();
  const intent: 'submit' | 'update' = /\b(guardar|enviar|submit|actualizar|finalizar)\b/.test(normalized)
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

const inferPendingFieldUpdate = (message: string, schema: JsonSchema, formData: AnyRecord): AnyRecord => {
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

const callMcpTool = async (name: string, args: AnyRecord): Promise<McpResult> => {
  const result = await callMcp('tools/call', { name, arguments: args });
  return readMcpText(result);
};

// Parametros que ve el LLM: solo lo que el modelo debe decidir. sessionId,
// formId y schema los inyecta el sistema en runtime.
const toolParametersForLlm = (name: string) => {
  if (name === MCP_TOOL.Dependent) {
    return {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          description: 'Solo los campos del formulario que cambian, ej {"cp":"64000"}.',
        },
      },
      required: ['data'],
    };
  }
  if (name === MCP_TOOL.Submit) {
    return {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          description: 'Campos finales opcionales a fijar antes de enviar.',
        },
      },
    };
  }
  return { type: 'object', properties: {} };
};

const buildOpenAiTools = (tools: McpTool[]) =>
  tools.map((tool) => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: toolParametersForLlm(tool.name),
    },
  }));

const chatCompletion = async (messages: OpenAiMessage[], tools: ReturnType<typeof buildOpenAiTools>) => {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0,
      messages,
      tools,
      tool_choice: 'auto',
    }),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(JSON.stringify(payload, null, 2));
  return payload.choices?.[0]?.message as OpenAiMessage;
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

  const historyRef = useRef<OpenAiMessage[]>([]);
  const llmToolsRef = useRef<McpTool[]>([]);

  const appendMessage = (message: ChatMessage) => {
    setMessages((current) => [...current, message]);
  };

  // Inyecta los argumentos administrados por el sistema. El modelo solo aporta
  // los campos de `data`; nunca decide sessionId/formId/schema.
  const injectSystemArgs = (_name: string, rawArgs: AnyRecord, state: FormAgentState): AnyRecord => {
    return {
      formId,
      sessionId: state.sessionId,
      schema: state.schema,
      data: { ...state.formData, ...(rawArgs?.data || {}) },
      values: { userId },
      useTestValues: false,
    };
  };

  const initAgent = async () => {
    setLoading(true);
    setError(null);
    setMessages([]);
    try {
      const loadedTools = await loadMcpTools();
      setTools(loadedTools);
      llmToolsRef.current = loadedTools.filter(
        (tool) => tool.name === MCP_TOOL.Dependent || tool.name === MCP_TOOL.Submit
      );

      const sessionId = createSessionId();
      const result = await callMcpTool(MCP_TOOL.Init, {
        formId,
        sessionId,
        values: { userId },
        useTestValues: false,
      });
      const schema = result.schema || {};
      const formData = result.data || {};
      const dependentWatchFields = result.dependentWatchFields || [];
      const nextState: FormAgentState = {
        schema,
        uiSchema: result.uiSchema || {},
        dataInit: formData,
        formData,
        dependentWatchFields,
        sessionId,
        lastDependentWatchKey: buildWatchKey(dependentWatchFields, formData),
      };
      setAgentState(nextState);
      historyRef.current = [{ role: 'system', content: SYSTEM_PROMPT }];
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

  // Turno con function-calling real: el modelo decide cuando llamar
  // form_dependent/form_submit; ejecutamos la tool y le devolvemos el resultado.
  const runFunctionCallingTurn = async (userMessage: string, initial: FormAgentState) => {
    let working = initial;
    const history = historyRef.current;
    history.push({
      role: 'user',
      content: JSON.stringify({
        userMessage,
        schemaProperties: working.schema.properties || {},
        required: working.schema.required || [],
        currentFormData: working.formData,
        missingFields: missingRequiredFields(working.schema, working.formData),
        invalidEnumFields: invalidEnumFields(working.schema, working.formData),
      }),
    });

    const openAiTools = buildOpenAiTools(llmToolsRef.current);

    for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
      const message = await chatCompletion(history, openAiTools);
      history.push(message);

      const toolCalls = message.tool_calls || [];
      if (!toolCalls.length) {
        if (message.content) appendMessage({ role: 'assistant', content: message.content });
        return;
      }

      for (const call of toolCalls) {
        const rawArgs = parseJson(call.function?.arguments);
        const patch = coercePatch(working.schema, rawArgs?.data);
        appendMessage({
          role: 'tool',
          name: call.function.name,
          content: JSON.stringify(rawArgs, null, 2),
        });

        let toolContent: string;
        try {
          // Respeta dependentWatchFields: si el cambio no toca un campo watch,
          // fijamos el valor localmente sin llamar al MCP.
          if (call.function.name === MCP_TOOL.Dependent && !dependentWatchChanged(working, patch)) {
            working = mergeLocalData(working, patch);
            setAgentState(working);
            toolContent = JSON.stringify({
              ok: true,
              changed: false,
              data: working.formData,
              note: 'Sin cambios en dependentWatchFields: no se ejecuto form_dependent.',
            });
          } else {
            const args = injectSystemArgs(call.function.name, { ...rawArgs, data: patch }, working);
            const result = await callMcpTool(call.function.name, args);
            working = applyResultToState(working, result);
            setAgentState(working);
            if (result.warnings?.length) {
              appendMessage({
                role: 'tool',
                name: call.function.name,
                content: result.warnings.map((warning) => warning.message).join('\n'),
              });
            }
            toolContent = JSON.stringify({
              ok: result.ok,
              changed: result.changed,
              data: working.formData,
              schema: working.schema,
              warnings: result.warnings || [],
            });
          }
        } catch (err) {
          toolContent = JSON.stringify({
            ok: false,
            error: err instanceof Error ? err.message : String(err),
          });
        }

        history.push({ role: 'tool', tool_call_id: call.id, content: toolContent });
      }
    }

    appendMessage({
      role: 'assistant',
      content: 'Se alcanzó el máximo de pasos automáticos. Indica el siguiente dato o di "guardar".',
    });
  };

  // Fallback determinista sin API key: parser local + dependent/submit directos.
  const runLocalTurn = async (userMessage: string, initial: FormAgentState) => {
    const intent = localIntent(userMessage, initial.schema);
    const pendingFieldUpdate =
      Object.keys(intent.updates || {}).length === 0
        ? inferPendingFieldUpdate(userMessage, initial.schema, initial.formData)
        : {};
    const rawUpdates = { ...(intent.updates || {}), ...pendingFieldUpdate };

    let working = initial;

    if (Object.keys(rawUpdates).length) {
      const coercedUpdates = Object.entries(rawUpdates).reduce<AnyRecord>((acc, [name, value]) => {
        const fieldName = resolveFieldName(initial.schema, name);
        if (!fieldName) return acc;
        acc[fieldName] = coerceValue(value, initial.schema.properties?.[fieldName]);
        return acc;
      }, {});
      if (dependentWatchChanged(initial, coercedUpdates)) {
        const nextData = { ...initial.formData, ...coercedUpdates };
        const result = await callMcpTool(MCP_TOOL.Dependent, {
          formId,
          sessionId: initial.sessionId,
          schema: initial.schema,
          data: nextData,
          values: { userId },
          useTestValues: false,
        });
        working = applyResultToState({ ...working, formData: nextData }, result);
        setAgentState(working);
        appendMessage({ role: 'tool', name: MCP_TOOL.Dependent, content: JSON.stringify(coercedUpdates, null, 2) });
        if (result.warnings?.length) {
          appendMessage({
            role: 'tool',
            name: MCP_TOOL.Dependent,
            content: result.warnings.map((warning) => warning.message).join('\n'),
          });
        }
      } else {
        working = mergeLocalData(working, coercedUpdates);
        setAgentState(working);
        appendMessage({ role: 'tool', name: 'local_change', content: JSON.stringify(coercedUpdates, null, 2) });
      }
    }

    if (intent.intent === 'submit') {
      const missing = missingRequiredFields(working.schema, working.formData);
      const invalid = invalidEnumFields(working.schema, working.formData);
      if (missing.length || invalid.length) {
        appendMessage({
          role: 'assistant',
          content: [
            missing.length ? `Aún faltan campos requeridos: ${missing.join(', ')}.` : '',
            invalid.length ? `Hay campos con valores inválidos: ${invalid.join(', ')}.` : '',
            nextQuestion(working.schema, working.formData),
          ]
            .filter(Boolean)
            .join('\n'),
        });
        return;
      }
      const result = await callMcpTool(MCP_TOOL.Submit, {
        formId,
        sessionId: working.sessionId,
        schema: working.schema,
        data: working.formData,
        values: { userId },
        useTestValues: false,
      });
      working = applyResultToState(working, result);
      setAgentState(working);
      appendMessage({ role: 'tool', name: MCP_TOOL.Submit, content: 'submit ejecutado' });
      if (result.warnings?.length) {
        appendMessage({
          role: 'tool',
          name: MCP_TOOL.Submit,
          content: result.warnings.map((warning) => warning.message).join('\n'),
        });
      }
      appendMessage({
        role: 'assistant',
        content: `Listo, ejecuté submit del formulario.\n\n${summarizeFields(working.schema, working.formData)}`,
      });
      return;
    }

    appendMessage({
      role: 'assistant',
      content: `Actualicé el formulario.\n\n${summarizeFields(working.schema, working.formData)}\n\n${nextQuestion(
        working.schema,
        working.formData
      )}`,
    });
  };

  const sendMessage = async () => {
    if (!input.trim() || !agentState) return;
    const userMessage = input.trim();
    setInput('');
    setLoading(true);
    setError(null);
    appendMessage({ role: 'user', content: userMessage });

    try {
      if (OPENAI_API_KEY) {
        await runFunctionCallingTurn(userMessage, agentState);
      } else {
        await runLocalTurn(userMessage, agentState);
      }
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
          El agente usa function-calling real: el modelo decide cuándo llamar form_dependent y form_submit del MCP.
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
          {OPENAI_API_KEY ? (
            <>
              Modo: <strong>function-calling con OpenAI ({OPENAI_MODEL})</strong>. El modelo invoca las tools del MCP.
            </>
          ) : (
            <>
              Sin <code>VITE_OPENAI_API_KEY</code>: modo <strong>fallback local</strong> (parser determinista sobre el
              MCP).
            </>
          )}{' '}
          MCP: <code>{API_BASE}/api/forms/mcp</code>.
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
            placeholder='Ej: "el CP es 64000" o "guardar"'
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
