import React, { useState, useRef, useEffect, useMemo } from 'react';
import { unresolvedTokens } from '@/examples/inputVars/utils/TemplateExpressionEngineCEL';
import { buildScope } from '../utils/buildRequest';
import { getVariablesByJsonSchema } from '../utils/getVariablesByJsonSchema';
import { syncTestValues } from '../utils/syncTestValues';
import TestValuesEditor from './TestValuesEditor';
import { CustomJsonSchema, PropertyExtraEditor } from '@/examples/jsonSchemasBuilder2/components';
import InputVars, { type InputVarOption } from '@/examples/inputVars/components/InputVars';
import Rendered from '@/examples/inputVars/components/Rendered';


const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
const dataRoles = ['init', 'catalog', 'dependent', 'submit'];

const METHOD_STYLES = {
  GET: { bg: '#e0f2fe', fg: '#0369a1', border: '#7dd3fc' },
  POST: { bg: '#dcfce7', fg: '#15803d', border: '#86efac' },
  PUT: { bg: '#fef3c7', fg: '#b45309', border: '#fcd34d' },
  PATCH: { bg: '#ede9fe', fg: '#7c3aed', border: '#c4b5fd' },
  DELETE: { bg: '#fee2e2', fg: '#b91c1c', border: '#fca5a5' },
};

// Descripción de cada tab, usada como tooltip (title) en los botones del nav.
const TAB_HINTS = {
  'Query Variables':
    'Declara las variables de la query string como un JSON Schema. No se agregan solas: se insertan en la URL como tokens {{var}} y se resuelven desde testValues. Ej: todos/?id={{id}} → todos/?id=1.',
  Headers:
    'Declara las headers como un JSON Schema. Cada propiedad del schema se envía en el header usando su valor en testValues.',
  Body:
    'Define el payload del request como un JSON Schema. Cada propiedad del schema se envía en el body usando su valor en testValues.',
  'External Variables':
    'Declarado como JSON Schema. Cada variable (nombre + tipo) se lee en runtime via {{externalVariables.X}}. Los valores por defecto viven en testValues.',
  'Test Values':
    'Valores concretos para probar la request. Las variables salen de los otros tabs con su tipo.',
};

const VARIABLE_SOURCES = {
  form: {
    group: 'Form',
    color: '#7C3AED', // Violeta
  },
  query: {
    group: 'Query',
    color: '#2563EB', // Azul
  },
  external: {
    group: 'External',
    color: '#059669', // Verde
  },
  headers: {
    group: 'Headers',
    color: '#EA580C', // Naranja
    hasDefault: true,
  },
  body: {
    group: 'Body',
    color: '#DC2626', // Rojo
  },
};

const isValidUrl = (string) => {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
};

const getStatusColor = (code) => {
  if (!code) return '#757575';
  if (code >= 200 && code < 300) return '#4caf50';
  if (code >= 300 && code < 400) return '#ff9800';
  return '#f44336';
};

const getSchemaTypeAtPath = (schema, path) => {
  const parts = path.split('.');
  let current = schema;
  for (const part of parts) {
    current = current?.properties?.[part];
    if (!current) return undefined;
  }
  return typeof current.type === 'string' ? current.type : undefined;
};

const getSchemaNodeAtPath = (schema, path) => {
  const parts = path.split('.');
  let current = schema;
  for (const part of parts) {
    current = current?.properties?.[part];
    if (!current) return undefined;
  }
  return current;
};

const variablesFromSchema = ({
  schema,
  group,
  color,
  hasDefault = false,
}: {
  schema: any;
  group: string;
  color: string;
  hasDefault?: boolean;
}): InputVarOption[] =>
  getVariablesByJsonSchema(schema).map((name) => {
    const schemaNode = getSchemaNodeAtPath(schema, name);
    const schemaHasDefault = Object.prototype.hasOwnProperty.call(
      schemaNode || {},
      'default'
    );

    return {
      label: name,
      value: `{{${name}}}`,
      type: getSchemaTypeAtPath(schema, name),
      color,
      group,
      hasDefault: hasDefault && schemaHasDefault,
      defaultValue: hasDefault && schemaHasDefault ? schemaNode?.default : undefined,
    };
  });

const RequestSection = ({ link, setLink, onSend, loading, response, formSchema = null }) => {
  const { request, name, description, dataRole } = link;
  const { method, url, body, queryVariables, externalVariables, testValues, headers } = request;
  const [notValidUrl, setNotValidUrl] = useState(false);
  const urlInputRef = useRef(null);
  const tabs = [ 'Headers', 'Body', 'External Variables', 'Test Values']; //'Query Variables',
  const [currentTab, setCurrentTab] = useState(tabs[0]);
  // Same scope used by buildRequest, so editor validation matches the real
  // request (single CEL engine for editor, preview and runtime).
  const scope = useMemo(() => buildScope(request.testValues), [request.testValues]);

  // unresolvedTokens is async (CEL evaluates asynchronously), so we resolve it
  // in an effect and keep the result in state instead of a synchronous memo.
  const [missingInUrl, setMissingInUrl] = useState([]);
  useEffect(() => {
    let cancelled = false;
    unresolvedTokens(url || '', scope).then((missing) => {
      if (!cancelled) setMissingInUrl(missing);
    });
    return () => { cancelled = true; };
  }, [url, scope]);

  // Transient status badge under the method/URL row: shows after each request
  // and auto-hides after 10 seconds.
  const [statusVisible, setStatusVisible] = useState(false);
  useEffect(() => {
    if (!response || !response.statusCode) return;
    setStatusVisible(true);
    const t = setTimeout(() => setStatusVisible(false), 10000);
    return () => clearTimeout(t);
  }, [response]);

  const urlVariableOptions = useMemo<InputVarOption[]>(
    () =>
      [
        { schema: formSchema, ...VARIABLE_SOURCES.form },
        { schema: externalVariables, ...VARIABLE_SOURCES.external },
      ].flatMap(variablesFromSchema),
    [externalVariables, queryVariables, formSchema]
  );
  
  const testValuesVariableOptions = useMemo<InputVarOption[]>(
    () =>
      [
        { schema: body, ...VARIABLE_SOURCES.body },
        { schema: formSchema, ...VARIABLE_SOURCES.form},
        { schema: headers, ...VARIABLE_SOURCES.headers },
        { schema: externalVariables, ...VARIABLE_SOURCES.external },
      ].flatMap(variablesFromSchema),
    [externalVariables, queryVariables, formSchema]
  );
  // testValues is the aggregation of every declared variable across the tabs.
  // Whenever a schema changes, ensure testValues holds exactly those variables
  // (preserving existing values, applying schema defaults for new ones).
  useEffect(() => {
    setLink((prev) => {
      const merged = syncTestValues(prev.request, prev.request.testValues);
      if (JSON.stringify(merged) === JSON.stringify(prev.request.testValues || {})) {
        return prev;
      }
      return { ...prev, request: { ...prev.request, testValues: merged } };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request.queryVariables, request.headers, request.body, request.externalVariables]);

  useEffect(() => {
    const listener = async (event) => {
      if (event.code === 'Enter' || event.code === 'NumpadEnter') {
        event.preventDefault();
        if (document.activeElement !== urlInputRef.current) return;
        await handleSend();
      }
    };
    document.addEventListener('keydown', listener);
    return () => {
      document.removeEventListener('keydown', listener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [link, loading]);

  const handleSend = async () => {
    if (!isValidUrl(url)) {
      setNotValidUrl(true);
      return;
    }
    setNotValidUrl(false);
    await onSend();
  };

  // Patch a single key inside request without rewriting every handler.
  const updateConfig = (patch) =>
    setLink({ ...link, request: { ...request, ...patch } });

  const handleMethodChange = (e) => updateConfig({ method: e.target.value });

  const handleNameChange = (e) => setLink({ ...link, name: e.target.value });

  const handleDescriptionChange = (e) =>
    setLink({ ...link, description: e.target.value });

  const handleDataRoleChange = (e) => setLink({ ...link, dataRole: e.target.value });
  const methodStyle = METHOD_STYLES[method] || METHOD_STYLES.GET;

  return (
    <div style={{ borderBottom: '1px solid #ddd' }}>
      {/* Meta row: name + description + dataRole */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 2fr 140px',
        gap: '0.5rem',
        marginBottom: '0.75rem'
      }}>
        <input
          value={name || ''}
          onChange={handleNameChange}
          placeholder="Link name"
          style={{
            padding: '0.5rem 0.75rem',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '0.85rem',
            outline: 'none'
          }}
        />
        <input
          value={description || ''}
          onChange={handleDescriptionChange}
          placeholder="Description (optional)"
          style={{
            padding: '0.5rem 0.75rem',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '0.85rem',
            outline: 'none'
          }}
        />
        <select
          value={dataRole || ''}
          onChange={handleDataRoleChange}
          style={{
            padding: '0.5rem 0.75rem',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '0.85rem',
            backgroundColor: 'white',
            outline: 'none',
            cursor: 'pointer',
            fontWeight: 600
          }}
        >
          {dataRoles.map(r => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      {/* Header with method, URL, and send button */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '1rem' }}>
        <select
          value={method}
          onChange={handleMethodChange}
          style={{
            height: '40px',
            padding: '0 1rem',
            border: `1px solid ${methodStyle.border}`,
            borderRadius: '4px',
            backgroundColor: methodStyle.bg,
            color: methodStyle.fg,
            fontSize: '0.875rem',
            fontWeight: 800,
            cursor: 'pointer',
            outline: 'none'
          }}
        >
          {methods.map((m) => {
            const optionStyle = METHOD_STYLES[m] || METHOD_STYLES.GET;
            return (
              <option
                key={m}
                value={m}
                style={{
                  backgroundColor: optionStyle.bg,
                  color: optionStyle.fg,
                  fontWeight: 700,
                }}
              >
                {m}
              </option>
            );
          })}
        </select>

        <InputVars
          ref={urlInputRef}
          type="input"
          value={url}
          onChange={(nextUrl) => {
            setNotValidUrl(false);
            updateConfig({ url: nextUrl });
          }}
          variables={urlVariableOptions}
          dataValues={testValues}
          placeholder="https://api.example.com/users/{{userId}}"
          style={{ flex: 1 }}
          frameStyle={{
            flex: 1,
            border: `1px solid ${notValidUrl || missingInUrl.length > 0 ? '#d32f2f' : '#ddd'}`,
            borderRadius: '4px',
            fontSize: '0.875rem',
            backgroundColor: notValidUrl ? '#ffebee' : 'white'
          }}
          buttonLabel="Variables {{ }}"
          buttonTitle="Agregar variable a la URL"
          title={
            missingInUrl.length > 0
              ? `Unresolved: ${missingInUrl.map(p => `{{${p}}}`).join(', ')}`
              : undefined
          }
        />
        <button
          onClick={handleSend}
          disabled={loading}
          style={{
            height: '40px',
            padding: '0 1.5rem',
            backgroundColor: loading ? '#999' : '#1976d2',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          {loading ? (
            <>
              <span>⏹</span>
              <span>Cancel</span>
            </>
          ) : (
            <>
              <span>➤</span>
              <span>Send</span>
            </>
          )}
        </button>
      </div>

      <Rendered value={url} values={testValues} label="URL preview" />

      {/* Transient response status (auto-hides after 10s) */}
      {statusVisible && response?.statusCode && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.75rem',
            color: '#666',
            animation: 'fadeIn 0.2s ease'
          }}
        >
          <span style={{ fontWeight: 600, color: '#333' }}>Response</span>
          <span
            style={{
              padding: '0.15rem 0.5rem',
              backgroundColor: getStatusColor(response.statusCode),
              color: 'white',
              borderRadius: '4px',
              fontWeight: 700
            }}
          >
            {response.statusCode}
          </span>
          {response.time !== null && response.time !== undefined && (
            <span>Time: {response.time}s</span>
          )}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid #ddd' }}>
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setCurrentTab(tab)}
            title={TAB_HINTS[tab]}
            style={{
              padding: '0.75rem 1rem',
              background: 'none',
              border: 'none',
              borderBottom: currentTab === tab ? '2px solid #1976d2' : '2px solid transparent',
              color: currentTab === tab ? '#1976d2' : '#666',
              fontWeight: currentTab === tab ? 600 : 400,
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ minHeight: '200px', padding: '1rem 0' }}>
        
        {/* {currentTab === 'Query Variables' && (
          <PropertyExtraEditor
            schema={queryVariables}
            variables={urlVariableOptions}
            onChange={(next) => updateConfig({ queryVariables: next })}
          />
        )} */}

        {currentTab === 'Headers' && (
          <PropertyExtraEditor
            schema={headers}
            variables={urlVariableOptions}
            onChange={(next) => updateConfig({ headers: next })}
          />
        )}

        {currentTab === 'Body' && (
          <PropertyExtraEditor
            schema={body}
            variables={urlVariableOptions}
            onChange={(next) => updateConfig({ body: next })}
          />
        )}

        {currentTab === 'External Variables' && (
          <CustomJsonSchema
            schema={externalVariables}
            onChange={(next) => updateConfig({ externalVariables: next })}
            />
        )}

        {currentTab === 'Test Values' && (
          <TestValuesEditor
            variables={testValuesVariableOptions}
            values={testValues}
            onChange={(next) => updateConfig({ testValues: next })}
          />
        )}
      </div>
    </div>
  );
};

export default RequestSection;