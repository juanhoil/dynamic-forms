import React, { useState, useRef, useEffect, useMemo } from 'react';
import { unresolvedTokens } from '../utils/template.js';
import { buildScope } from '../utils/buildRequest.js';
import { getVariablesByJsonSchema } from '../utils/getVariablesByJsonSchema.js';
import { syncTestValues } from '../utils/syncTestValues.js';
import SchemaEditor from './SchemaEditor.jsx';
import TestValuesEditor from './TestValuesEditor.jsx';

const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
const dataRoles = ['init', 'catalog', 'dependent', 'submit'];

const isValidUrl = (string) => {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
};

const RequestSection = ({ link, setLink, onSend, loading }) => {
  const { request, name, description, dataRole } = link;
  const { method, url, body, queryVariables, externalVariables, testValues, headers } = request;
  const [currentTab, setCurrentTab] = useState('Query Variables');
  const [tabsOpen, setTabsOpen] = useState(true);
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

  // Discover all variables declared across the request schemas — used to
  // render the "available" chips below.
  const availableVariables = useMemo(
    () => getVariablesByJsonSchema([
      request.externalVariables,
      request.queryVariables,
      request.headers,
      request.body
    ]),
    [request.externalVariables, request.queryVariables, request.headers, request.body]
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
    setTabsOpen(false);
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
              key={v}
              type="button"
              onClick={() => insertAtCursor(`{{${v}}}`)}
              title={`Insert {{${v}}} into URL`}
              style={{
                padding: '0.15rem 0.5rem',
                borderRadius: '999px',
                border: '1px solid #90caf9',
                backgroundColor: '#e3f2fd',
                color: '#1565c0',
                cursor: 'pointer',
                fontSize: '0.7rem',
                fontFamily: 'monospace'
              }}
            >
              {`{{${v}}}`}
            </button>
          ))}
        </div>
      )}

      {/* Collapsible request config */}
      <button
        type="button"
        onClick={() => setTabsOpen((v) => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          width: '100%',
          padding: '0.5rem 0',
          background: 'none',
          border: 'none',
          borderTop: '1px solid #eee',
          cursor: 'pointer',
          color: '#555',
          fontSize: '0.8rem',
          fontWeight: 600
        }}
      >
        <span
          style={{
            display: 'inline-block',
            transition: 'transform 0.2s',
            transform: tabsOpen ? 'rotate(90deg)' : 'rotate(0deg)'
          }}
        >
          ▸
        </span>
        <span>Configuración del request</span>
        <span style={{ marginLeft: 'auto', fontWeight: 400, color: '#999' }}>
          {tabsOpen ? 'Ocultar' : 'Mostrar'}
        </span>
      </button>

      {tabsOpen && (
        <>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid #ddd' }}>
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setCurrentTab(tab)}
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
          <SchemaEditor
            schema={queryVariables}
            onChange={(next) => updateConfig({ queryVariables: next })}
            testValues={testValues}
            description={
              <>
                Declara las variables de la query string como un JSON Schema.
                Estas variables <strong>no</strong> se agregan solas: se insertan
                en la URL como tokens y se resuelven desde <code>testValues</code>.
                <br />
                Ej: URL <code>todos/?id=&#123;&#123;id&#125;&#125;</code> → <code>todos/?id=1</code>.
              </>
            }
          />
        )}

        {currentTab === 'Headers' && (
          <SchemaEditor
            schema={headers}
            onChange={(next) => updateConfig({ headers: next })}
            testValues={testValues}
            minHeight={240}
            description={
              <>
                Declara las headers como un JSON Schema. Cada propiedad del schema se envía en el header usando su valor en <code>testValues</code>.
              </>
            }
          />
        )}

        {currentTab === 'Body' && (
          <SchemaEditor
            schema={body}
            onChange={(next) => updateConfig({ body: next })}
            testValues={testValues}
            minHeight={240}
            description={
              <>
                Define el payload del request como un JSON Schema. Cada propiedad
                del schema se envía en el body usando su valor en <code>testValues</code>.
              </>
            }
          />
        )}

        {currentTab === 'External Variables' && (
          <SchemaEditor
            schema={externalVariables}
            onChange={(next) => updateConfig({ externalVariables: next })}
            title="externalVariables"
            minHeight={120}
            description={
              <>
                Declarado como JSON Schema. Cada variable (nombre + tipo) se lee
                en runtime via <code>{'{{externalVariables.X}}'}</code>. Los
                valores por defecto viven en <code>testValues</code>.
              </>
            }
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
        </>
      )}
    </div>
  );
};

export default RequestSection;