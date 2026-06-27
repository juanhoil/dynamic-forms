import React, { useState, useRef, useEffect, useMemo } from 'react';
import { unresolvedTokens } from '../utils/resolveTemplates.js';
import { getVariablesByJsonSchema } from '../utils/getVariablesByJsonSchema.js';
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
  const { config, name, description, dataRole } = link;
  const { method, url, body, queryVariables, externalVariables, testValues } = config;
  const [currentTab, setCurrentTab] = useState('Query Variables');
  const [notValidUrl, setNotValidUrl] = useState(false);
  const urlInputRef = useRef(null);

  const tabs = ['Query Variables', 'Headers', 'Body', 'External Variables', 'Test Values'];

  const scope = useMemo(() => ({
    form: {},
    ...(config.testValues || {})
  }), [config.testValues]);

  const missingInUrl = useMemo(
    () => unresolvedTokens(url || '', scope),
    [url, scope]
  );

  // Discover all variables declared across body, queryVariables, and
  // externalVariables schemas — used to render the "available" chips below.
  const availableVariables = useMemo(
    () => getVariablesByJsonSchema([
      config.externalVariables,
      config.queryVariables,
      config.body
    ]),
    [config.externalVariables, config.queryVariables, config.body]
  );

  const insertAtCursor = (token) => {
    const el = urlInputRef.current;
    if (!el) return;
    const start = el.selectionStart ?? url.length;
    const end = el.selectionEnd ?? url.length;
    const next = url.slice(0, start) + token + url.slice(end);
    setLink({ ...link, config: { ...config, url: next } });
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

  // Patch a single key inside config without rewriting every handler.
  const updateConfig = (patch) =>
    setLink({ ...link, config: { ...config, ...patch } });

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
                Declara las variables de la query string como un JSON Schema. El
                <strong> nombre</strong> de cada propiedad es el nombre del query
                param (literal) y su <strong>valor</strong> se toma de <code>testValues</code>.
                Ej: propiedad <code>userId</code> → <code>?userId=1</code>.
              </>
            }
          />
        )}

        {currentTab === 'Headers' && (
          <div style={{ padding: '1rem', color: '#666', textAlign: 'center' }}>
            Headers feature coming soon...
          </div>
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
            testValues={testValues}
            onChange={(next) => updateConfig({ testValues: next })}
          />
        )}
      </div>
    </div>
  );
};

export default RequestSection;