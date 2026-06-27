import React, { useState, useEffect, useMemo } from 'react';
import { syncTestValues, getDeclaredVariables } from '../utils/syncTestValues.js';

// ---------------------------------------------------------------------------
// TestValuesEditor
//
// Renders the concrete values used to resolve `{{...}}` tokens at request time.
//
// Receives the whole request `config` and derives, on its own, the declared
// variables (getDeclaredVariables) and the mapped values (syncTestValues), so
// the parent does not need to pre-compute anything.
//
// Two views:
//   - "Fields" (default): one row per declared variable showing its name, a
//     type badge and a value input typed accordingly. Values are written back
//     into testValues by name.
//   - "Raw JSON": the full testValues object as editable JSON, for power users
//     or values not tied to a declared variable.
// ---------------------------------------------------------------------------

const TYPE_COLORS = {
  string:  { bg: '#e3f2fd', fg: '#1565c0' },
  number:  { bg: '#e8f5e9', fg: '#2e7d32' },
  integer: { bg: '#e8f5e9', fg: '#2e7d32' },
  boolean: { bg: '#f3e5f5', fg: '#6a1b9a' },
  object:  { bg: '#fff3e0', fg: '#e65100' },
  array:   { bg: '#e0f2f1', fg: '#00695c' }
};

const TypeBadge = ({ type }) => {
  const c = TYPE_COLORS[type] || { bg: '#eee', fg: '#555' };
  return (
    <span
      style={{
        padding: '0.1rem 0.45rem',
        borderRadius: '999px',
        backgroundColor: c.bg,
        color: c.fg,
        fontSize: '0.65rem',
        fontWeight: 700,
        fontFamily: 'monospace',
        textTransform: 'lowercase'
      }}
    >
      {type}
    </span>
  );
};

const inputStyle = {
  width: '100%',
  padding: '0.4rem 0.6rem',
  border: '1px solid #ddd',
  borderRadius: '4px',
  fontSize: '0.8rem',
  fontFamily: 'monospace',
  outline: 'none',
  boxSizing: 'border-box'
};

// Value input for object/array variables: edits the value as JSON with a local
// draft so the user can type invalid intermediate states without losing focus.
const JsonValueInput = ({ value, onChange }) => {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState(() => JSON.stringify(value ?? null));
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!focused) {
      setDraft(JSON.stringify(value ?? null));
      setError(false);
    }
  }, [value, focused]);

  return (
    <input
      value={draft}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onChange={(e) => {
        const text = e.target.value;
        setDraft(text);
        try {
          onChange(JSON.parse(text));
          setError(false);
        } catch {
          setError(true);
        }
      }}
      style={{ ...inputStyle, borderColor: error ? '#d32f2f' : '#ddd' }}
    />
  );
};

const ValueInput = ({ type, value, onChange }) => {
  if (type === 'boolean') {
    return (
      <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem' }}>
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span style={{ color: '#666' }}>{String(!!value)}</span>
      </label>
    );
  }

  if (type === 'number' || type === 'integer') {
    return (
      <input
        type="number"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        style={inputStyle}
      />
    );
  }

  if (type === 'object' || type === 'array') {
    return <JsonValueInput value={value} onChange={onChange} />;
  }

  return (
    <input
      type="text"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder="admite {{variable}}"
      style={inputStyle}
    />
  );
};

const RawJsonEditor = ({ testValues, onChange, onDone }) => {
  const [draft, setDraft] = useState(JSON.stringify(testValues || {}, null, 2));
  const [error, setError] = useState(null);

  const save = () => {
    try {
      onChange(JSON.parse(draft || '{}'));
      setError(null);
      onDone();
    } catch (e) {
      setError(`Invalid JSON: ${e.message}`);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <button onClick={save} style={btnStyle('#2e7d32', '#fff', 'none')}>✓ Save</button>
        <button onClick={onDone} style={btnStyle('#fff', '#666', '1px solid #999')}>Cancel</button>
      </div>
      <textarea
        value={draft}
        onChange={(e) => { setDraft(e.target.value); setError(null); }}
        style={{
          width: '100%',
          minHeight: '160px',
          padding: '0.5rem',
          fontFamily: "'Courier New', monospace",
          fontSize: '0.8rem',
          border: error ? '1px solid #d32f2f' : '1px solid #ddd',
          borderRadius: '4px',
          outline: 'none',
          resize: 'vertical',
          boxSizing: 'border-box'
        }}
      />
      {error && (
        <div style={{ marginTop: '0.25rem', fontSize: '0.7rem', color: '#d32f2f' }}>{error}</div>
      )}
    </div>
  );
};

const btnStyle = (bg, fg, border) => ({
  padding: '0.3rem 0.7rem',
  background: bg,
  border,
  borderRadius: '4px',
  color: fg,
  cursor: 'pointer',
  fontSize: '0.75rem'
});

const TestValuesEditor = ({ config = {}, testValues, onChange }) => {
  const [rawMode, setRawMode] = useState(false);
  const values = testValues || {};
  // Declared variables (name + type) derived from every schema in the config.
  const variables = useMemo(() => getDeclaredVariables(config), [config]);

  // Mapped values used to render the fields: preserves user edits and falls
  // back to schema defaults / type-based empties for newly declared variables.
  const mappedValues = useMemo(
    () => syncTestValues(config, values),
    [config, values]
  );

  const setValue = (name, val) => onChange({ ...values, [name]: val });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', margin: '0 0 0.5rem 0' }}>
        <h4 style={{ margin: 0, fontSize: '0.85rem', color: '#333' }}></h4>
        <button
          onClick={() => setRawMode((v) => !v)}
          style={btnStyle('#fff', '#1976d2', '1px solid #1976d2')}
        >
          {rawMode ? '☰ Vista de campos' : '✏️ JSON crudo'}
        </button>
      </div>
      <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.7rem', color: '#666' }}>
        Valores concretos para probar la request. Las variables salen de los
        tabs (Query Variables, Headers, Body, External Variables) con su tipo.
      </p>

      {rawMode ? (
        <RawJsonEditor
          testValues={values}
          onChange={onChange}
          onDone={() => setRawMode(false)}
        />
      ) : variables.length === 0 ? (
        <div style={{ fontSize: '0.75rem', color: '#999', padding: '0.5rem 0' }}>
          No hay variables declaradas todavía. Declara propiedades en los otros
          tabs y aparecerán aquí para asignarles un valor.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {variables.map((v) => (
            <div
              key={v.name}
              style={{
                display: 'grid',
                gridTemplateColumns: '180px 70px 1fr',
                gap: '0.5rem',
                alignItems: 'center'
              }}
            >
              <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#333', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {v.name}
              </span>
              <TypeBadge type={v.type} />
              <ValueInput
                type={v.type}
                value={mappedValues[v.name]}
                onChange={(val) => setValue(v.name, val)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TestValuesEditor;
