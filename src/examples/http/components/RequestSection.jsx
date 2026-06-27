import React, { useState, useRef, useEffect, useMemo } from 'react';
import QueryParams from './QueryParams';
import { resolveTemplates, unresolvedTokens } from '../utils/resolveTemplates.js';
import { getVariablesByJsonSchema } from '../utils/getVariablesByJsonSchema.js';

const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
const dataRoles = ['init', 'catalog', 'dependent', 'submit'];
const PROP_TYPES = ['string', 'number', 'boolean'];

// ---------------------------------------------------------------------------
// Adapters between JSON Schema shape and the QueryParams row shape.
//
// `queryParams` in the link config is now a JSON Schema object:
//   { type: 'object', properties: { <key>: { type: 'string'|'number'|... } } }
//
// `QueryParams` component still works with an array of rows. These two
// helpers convert back and forth without forcing QueryParams to know about
// JSON Schema.
// ---------------------------------------------------------------------------

const pairsFromSchema = (schema, testValues = {}) => {
  const props = schema?.properties;
  if (!props || typeof props !== 'object') return [];
  return Object.entries(props).map(([key, prop], i) => ({
    id: i + 1,
    key,
    value: testValues[key] != null ? String(testValues[key]) : '',
    type: prop?.type || 'string'
  }));
};

const schemaFromPairs = (pairs) => ({
  type: 'object',
  properties: Object.fromEntries(
    (pairs || [])
      .filter((p) => p.key && p.key.trim() !== '')
      .map((p) => [p.key.trim(), { type: p.type || 'string' }])
  )
});

// ---------------------------------------------------------------------------
// External-variables schema editor helpers.
// ---------------------------------------------------------------------------

const nextVarName = (props) => {
  let i = 1;
  while (`var${i}` in (props || {})) i++;
  return `var${i}`;
};

const setExternalSchema = (link, setLink, updater) => {
  setLink((prev) => {
    const current = prev.config.externalVariables || { type: 'object', properties: {} };
    const nextProps = updater(current.properties || {});
    return {
      ...prev,
      config: {
        ...prev.config,
        externalVariables: { type: 'object', properties: nextProps }
      }
    };
  });
};

const isValidUrl = (string) => {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
};

const VariablesTab = ({ link, setLink }) => {
  const { config } = link;
  // externalVariables is now a JSON Schema — only testValues carry concrete
  // values that can resolve {{...}} tokens.
  const scope = useMemo(() => ({
    form: {},
    ...(config.testValues || {})
  }), [config.testValues]);

  const resolved = useMemo(
    () => resolveTemplates(config, scope),
    [config, scope]
  );

  const missingInUrl = useMemo(
    () => unresolvedTokens(config.url || '', scope),
    [config.url, scope]
  );

  const updateExternalVar = (key, newKey, newType) => {
    setLink((prev) => {
      const cur = prev.config.externalVariables || { type: 'object', properties: {} };
      const props = { ...(cur.properties || {}) };
      const entry = props[key] || {};
      delete props[key];
      const finalKey = (newKey || '').trim() || key;
      props[finalKey] = { ...entry, type: newType || entry.type || 'string' };
      return {
        ...prev,
        config: { ...prev.config, externalVariables: { type: 'object', properties: props } }
      };
    });
  };

  const addExternalVar = () => {
    setLink((prev) => {
      const cur = prev.config.externalVariables || { type: 'object', properties: {} };
      const props = { ...(cur.properties || {}) };
      const name = nextVarName(props);
      props[name] = { type: 'string' };
      return {
        ...prev,
        config: { ...prev.config, externalVariables: { type: 'object', properties: props } }
      };
    });
  };

  const removeExternalVar = (key) => {
    setLink((prev) => {
      const cur = prev.config.externalVariables || { type: 'object', properties: {} };
      const props = { ...(cur.properties || {}) };
      delete props[key];
      return {
        ...prev,
        config: { ...prev.config, externalVariables: { type: 'object', properties: props } }
      };
    });
  };

  const [editingTestValues, setEditingTestValues] = useState(false);
  const [testValuesDraft, setTestValuesDraft] = useState(
    JSON.stringify(config.testValues || {}, null, 2)
  );
  const [testValuesError, setTestValuesError] = useState(null);

  useEffect(() => {
    if (!editingTestValues) {
      setTestValuesDraft(JSON.stringify(config.testValues || {}, null, 2));
      setTestValuesError(null);
    }
  }, [config.testValues, editingTestValues]);

  const commitTestValues = () => {
    try {
      const parsed = JSON.parse(testValuesDraft || '{}');
      setLink(prev => ({
        ...prev,
        config: { ...prev.config, testValues: parsed }
      }));
      setTestValuesError(null);
      setEditingTestValues(false);
    } catch (e) {
      setTestValuesError(`Invalid JSON: ${e.message}`);
    }
  };

  const externalEntries = Object.entries(
    (config.externalVariables && config.externalVariables.properties) || {}
  );

  return (
    <div style={{ padding: '0.5rem' }}>
      <div
        style={{
          padding: '0.75rem',
          marginBottom: '1rem',
          backgroundColor: '#fff3e0',
          borderLeft: '3px solid #e65100',
          borderRadius: '4px',
          fontSize: '0.75rem',
          color: '#5d4037'
        }}
      >
        <strong>Note:</strong> These values resolve <code>{'{{...}}'}</code>{' '}
        placeholders only when testing the request from this editor. They are
        not runtime data.
      </div>

      {/* externalVariables */}
      <h4 style={{ marginBottom: '0.5rem', fontSize: '0.85rem', color: '#333' }}>
        externalVariables
      </h4>
      <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.7rem', color: '#666' }}>
        Read at runtime from <code>{'{{externalVariables.X}}'}</code> — empty
        defaults are fine, the editor only needs values to send test requests.
      </p>
      <div style={{
        display: 'flex',
        fontSize: '0.75rem',
        fontWeight: 600,
        color: '#555',
        borderBottom: '1px solid #ddd',
        padding: '0.25rem 0'
      }}>
        <span style={{ flex: 1 }}>Key</span>
        <span style={{ flex: 1 }}>Default</span>
        <span style={{ width: '1.5rem' }} />
      </div>
      {externalEntries.length === 0 && (
        <div style={{ padding: '0.5rem', fontSize: '0.75rem', color: '#999', fontStyle: 'italic' }}>
          No external variables declared.
        </div>
      )}
      {externalEntries.map(([key, value], idx) => (
        <div
          key={`${key}-${idx}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            borderBottom: '1px solid #f0f0f0',
            padding: '0.25rem 0'
          }}
        >
          <input
            defaultValue={key}
            onBlur={(e) => updateExternalVar(key, e.target.value, value)}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              padding: '0.25rem',
              fontSize: '0.8rem',
              background: 'transparent',
              fontFamily: 'monospace'
            }}
          />
          <input
            defaultValue={value == null ? '' : String(value)}
            onBlur={(e) => updateExternalVar(key, key, e.target.value)}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              padding: '0.25rem',
              fontSize: '0.8rem',
              background: 'transparent'
            }}
          />
          <button
            onClick={() => removeExternalVar(key)}
            style={{
              width: '1.5rem',
              background: 'none',
              border: 'none',
              color: '#999',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
            title="Remove"
          >
            ×
          </button>
        </div>
      ))}
      <button
        onClick={addExternalVar}
        style={{
          marginTop: '0.5rem',
          padding: '0.3rem 0.7rem',
          background: 'none',
          border: '1px dashed #bdbdbd',
          borderRadius: '4px',
          color: '#666',
          cursor: 'pointer',
          fontSize: '0.75rem'
        }}
      >
        + Add variable
      </button>

      {/* testValues */}
      <h4 style={{ margin: '1.25rem 0 0.5rem 0', fontSize: '0.85rem', color: '#333' }}>
        testValues
      </h4>
      <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.7rem', color: '#666' }}>
        Concrete values used ONLY to test the request from this editor. They
        do not represent real runtime data.
      </p>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
        {!editingTestValues ? (
          <button
            onClick={() => setEditingTestValues(true)}
            style={{
              padding: '0.3rem 0.7rem',
              background: '#fff',
              border: '1px solid #1976d2',
              borderRadius: '4px',
              color: '#1976d2',
              cursor: 'pointer',
              fontSize: '0.75rem'
            }}
          >
            ✏️ Edit JSON
          </button>
        ) : (
          <>
            <button
              onClick={commitTestValues}
              style={{
                padding: '0.3rem 0.7rem',
                background: '#2e7d32',
                border: 'none',
                borderRadius: '4px',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '0.75rem'
              }}
            >
              ✓ Save
            </button>
            <button
              onClick={() => {
                setTestValuesDraft(JSON.stringify(config.testValues || {}, null, 2));
                setTestValuesError(null);
                setEditingTestValues(false);
              }}
              style={{
                padding: '0.3rem 0.7rem',
                background: '#fff',
                border: '1px solid #999',
                borderRadius: '4px',
                color: '#666',
                cursor: 'pointer',
                fontSize: '0.75rem'
              }}
            >
              Cancel
            </button>
          </>
        )}
      </div>
      {editingTestValues ? (
        <>
          <textarea
            value={testValuesDraft}
            onChange={(e) => {
              setTestValuesDraft(e.target.value);
              setTestValuesError(null);
            }}
            style={{
              width: '100%',
              minHeight: '120px',
              padding: '0.5rem',
              fontFamily: "'Courier New', monospace",
              fontSize: '0.8rem',
              border: testValuesError ? '1px solid #d32f2f' : '1px solid #ddd',
              borderRadius: '4px',
              outline: 'none',
              resize: 'vertical'
            }}
          />
          {testValuesError && (
            <div style={{ marginTop: '0.25rem', fontSize: '0.7rem', color: '#d32f2f' }}>
              {testValuesError}
            </div>
          )}
        </>
      ) : (
        <pre
          style={{
            margin: 0,
            padding: '0.5rem',
            backgroundColor: '#1e1e1e',
            color: '#d4d4d4',
            borderRadius: '4px',
            fontSize: '0.75rem',
            overflow: 'auto',
            maxHeight: '120px'
          }}
        >
          {JSON.stringify(config.testValues || {}, null, 2)}
        </pre>
      )}

      {/* Resolved request preview */}
      <h4 style={{ margin: '1.25rem 0 0.5rem 0', fontSize: '0.85rem', color: '#333' }}>
        Resolved request preview
      </h4>
      <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.7rem', color: '#666' }}>
        What the request would look like with <code>form = {`{}`}</code>, the
        current <code>externalVariables</code>, and the <code>testValues</code>{' '}
        above.
      </p>
      {missingInUrl.length > 0 && (
        <div
          style={{
            padding: '0.5rem 0.75rem',
            marginBottom: '0.5rem',
            backgroundColor: '#ffebee',
            borderLeft: '3px solid #d32f2f',
            borderRadius: '4px',
            fontSize: '0.7rem',
            color: '#b71c1c'
          }}
        >
          ⚠ Unresolved placeholders in URL:{' '}
          {missingInUrl.map(p => <code key={p} style={{ marginRight: '0.35rem' }}>{`{{${p}}}`}</code>)}
        </div>
      )}
      <pre
        style={{
          margin: 0,
          padding: '0.75rem',
          backgroundColor: '#263238',
          color: '#aed581',
          borderRadius: '4px',
          fontSize: '0.75rem',
          overflow: 'auto',
          maxHeight: '220px'
        }}
      >
        {JSON.stringify(resolved, null, 2)}
      </pre>
    </div>
  );
};

const RequestSection = ({ link, setLink, onSend, loading }) => {
  const { config, name, description, dataRole } = link;
  const { method, url, body, queryParams } = config;
  const [currentTab, setCurrentTab] = useState('Params');
  const [notValidUrl, setNotValidUrl] = useState(false);
  const urlInputRef = useRef(null);

  const tabs = ['Params', 'Headers', 'Body', 'Variables'];

  const scope = useMemo(() => ({
    form: {},
    ...(config.externalVariables || {}),
    ...(config.testValues || {})
  }), [config.externalVariables, config.testValues]);

  const missingInUrl = useMemo(
    () => unresolvedTokens(url || '', scope),
    [url, scope]
  );

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

  const handleMethodChange = (e) => {
    setLink({ ...link, config: { ...config, method: e.target.value } });
  };

  const handleUrlChange = (e) => {
    setNotValidUrl(false);
    setLink({ ...link, config: { ...config, url: e.target.value } });
  };

  const handleBodyText = (text) => {
    try {
      const parsed = text.trim() === '' ? {} : JSON.parse(text);
      setLink({ ...link, config: { ...config, body: parsed } });
      return null;
    } catch (e) {
      return `Invalid JSON: ${e.message}`;
    }
  };

  const handleQueryParamsChange = (newParams) => {
    setLink({ ...link, config: { ...config, queryParams: newParams } });
  };

  const handleNameChange = (e) => {
    setLink({ ...link, name: e.target.value });
  };

  const handleDescriptionChange = (e) => {
    setLink({ ...link, description: e.target.value });
  };

  const handleDataRoleChange = (e) => {
    setLink({ ...link, dataRole: e.target.value });
  };

  const bodyText = JSON.stringify(body ?? {}, null, 2);
  const [bodyDraft, setBodyDraft] = useState(bodyText);
  const [bodyError, setBodyError] = useState(null);

  useEffect(() => {
    setBodyDraft(JSON.stringify(body ?? {}, null, 2));
    setBodyError(null);
  }, [body]);

  const onBodyChange = (e) => {
    const text = e.target.value;
    setBodyDraft(text);
    const err = handleBodyText(text);
    setBodyError(err);
  };

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
          placeholder="https://api.example.com/users/{{externalVariables.userId}}"
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
        {currentTab === 'Params' && (
          <QueryParams pairs={queryParams} setPairs={handleQueryParamsChange} />
        )}

        {currentTab === 'Headers' && (
          <div style={{ padding: '1rem', color: '#666', textAlign: 'center' }}>
            Headers feature coming soon...
          </div>
        )}

        {currentTab === 'Body' && (
          <div>
            <textarea
              value={bodyDraft}
              onChange={onBodyChange}
              placeholder={'{\n  "key": "value"\n}'}
              style={{
                width: '100%',
                minHeight: '200px',
                padding: '1rem',
                fontFamily: "'Courier New', monospace",
                fontSize: '0.875rem',
                border: `1px solid ${bodyError ? '#d32f2f' : '#ddd'}`,
                borderRadius: '4px',
                resize: 'vertical',
                outline: 'none',
                backgroundColor: '#1e1e1e',
                color: '#d4d4d4'
              }}
            />
            {bodyError && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#d32f2f' }}>
                {bodyError}
              </div>
            )}
          </div>
        )}

        {currentTab === 'Variables' && (
          <VariablesTab link={link} setLink={setLink} />
        )}
      </div>
    </div>
  );
};

export default RequestSection;