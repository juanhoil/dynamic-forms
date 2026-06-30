import React, { useState, useRef, useEffect, useMemo } from 'react';
import { unresolvedTokens } from '../utils/template';
import { buildScope } from '../utils/buildRequest';
import { getVariablesByJsonSchema } from '../utils/getVariablesByJsonSchema';
import { syncTestValues } from '../utils/syncTestValues';
import TestValuesEditor from './TestValuesEditor';
import { CustomJsonSchema, PropertyExtraEditor } from '@/examples/jsonSchemasBuilder2/jsonSchemaBuilder';


const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
const dataRoles = ['init', 'catalog', 'dependent', 'submit'];

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

const VARIABLE_SOURCE_STYLES = {
  formSchema: {
    label: 'Form',
    border: '#a78bfa',
    bg: '#f3e8ff',
    fg: '#6d28d9',
  },
  queryVariables: {
    label: 'Query',
    border: '#90caf9',
    bg: '#e3f2fd',
    fg: '#1565c0',
  },
  externalVariables: {
    label: 'External',
    border: '#80cbc4',
    bg: '#e0f2f1',
    fg: '#00695c',
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

const RequestSection = ({ link, setLink, onSend, loading, response, formSchema = null }) => {
  const { request, name, description, dataRole } = link;
  const { method, url, body, queryVariables, externalVariables, testValues, headers } = request;
  const [currentTab, setCurrentTab] = useState('Query Variables');
  const [notValidUrl, setNotValidUrl] = useState(false);
  const urlInputRef = useRef(null);

  const tabs = ['Query Variables', 'Headers', 'Body', 'External Variables', 'Test Values'];

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

  // Discover all variables declared across the request schemas — used to
  // render the "available" chips below.
  const availableVariables = useMemo(() => {
    const sources = [
      { id: 'formSchema', schema: formSchema },
      { id: 'queryVariables', schema: queryVariables },
      { id: 'externalVariables', schema: externalVariables },
    ] as const;

    return sources.flatMap(({ id, schema }) =>
      getVariablesByJsonSchema(schema).map((name) => ({
        name,
        source: id,
        style: VARIABLE_SOURCE_STYLES[id],
      }))
    );
  }, [externalVariables, queryVariables, formSchema]);
console.log('availableVariables', availableVariables);
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

  const insertAtCursor = (token) => {
    const el = urlInputRef.current;
    if (!el) return;
    const start = el.selectionStart ?? url.length;
    const end = el.selectionEnd ?? url.length;
    const next = url.slice(0, start) + token + url.slice(end);
    setLink({ ...link, request: { ...request, url: next } });
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + token.length;
      el.setSelectionRange(pos, pos);
    });
  };

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

  const handleUrlChange = (e) => {
    setNotValidUrl(false);
    updateConfig({ url: e.target.value });
  };

  const handleNameChange = (e) => setLink({ ...link, name: e.target.value });

  const handleDescriptionChange = (e) =>
    setLink({ ...link, description: e.target.value });

  const handleDataRoleChange = (e) => setLink({ ...link, dataRole: e.target.value });

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
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <select
          value={method}
          onChange={handleMethodChange}
          style={{
            padding: '0.75rem 1rem',
            border: '1px solid #ddd',
            borderRadius: '4px',
            backgroundColor: 'white',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: 'pointer',
            outline: 'none'
          }}
        >
          {methods.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>

        <input
          ref={urlInputRef}
          type="url"
          value={url}
          onChange={handleUrlChange}
          placeholder="https://api.example.com/users/{{userId}}"
          style={{
            flex: 1,
            padding: '0.75rem 1rem',
            border: `1px solid ${notValidUrl || missingInUrl.length > 0 ? '#d32f2f' : '#ddd'}`,
            borderRadius: '4px',
            fontSize: '0.875rem',
            outline: 'none',
            backgroundColor: notValidUrl ? '#ffebee' : 'white'
          }}
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
            padding: '0.75rem 1.5rem',
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

      {/* Transient response status (auto-hides after 10s) */}
      {statusVisible && response?.statusCode && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginTop: '-0.5rem',
            marginBottom: '1rem',
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

      {/* Available variables (extracted from JSON Schemas) */}
      {availableVariables.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.35rem',
            alignItems: 'center',
            marginBottom: '0.75rem',
            fontSize: '0.7rem',
            color: '#555'
          }}
        >
          <span style={{ color: '#666' }}>Available variables:</span>
          {availableVariables.map((v) => (
            <button
              key={`${v.source}:${v.name}`}
              type="button"
              onClick={() => insertAtCursor(`{{${v.name}}}`)}
              title={`Insert {{${v.name}}} into URL (${v.style.label})`}
              style={{
                padding: '0.15rem 0.5rem',
                borderRadius: '999px',
                border: `1px solid ${v.style.border}`,
                backgroundColor: v.style.bg,
                color: v.style.fg,
                cursor: 'pointer',
                fontSize: '0.7rem',
                fontFamily: 'monospace',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              <span style={{ opacity: 0.7, fontFamily: 'system-ui', fontWeight: 700 }}>
                {v.style.label}
              </span>
              <span>{`{{${v.name}}}`}</span>
            </button>
          ))}
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
        {currentTab === 'Query Variables' && (
          <PropertyExtraEditor schema={queryVariables} onChange={(next) => updateConfig({ queryVariables: next })} />
        )}

        {currentTab === 'Headers' && (
          <PropertyExtraEditor schema={headers} onChange={(next) => updateConfig({ headers: next })} />
        )}

        {currentTab === 'Body' && (
          <PropertyExtraEditor schema={body} onChange={(next) => updateConfig({ body: next })} />
        )}

        {currentTab === 'External Variables' && (
          <CustomJsonSchema
            schema={externalVariables}
            onChange={(next) => updateConfig({ externalVariables: next })}
            />
        )}

        {currentTab === 'Test Values' && (
          <TestValuesEditor
            config={request}
            testValues={testValues}
            onChange={(next) => updateConfig({ testValues: next })}
          />
        )}
      </div>
    </div>
  );
};

export default RequestSection;