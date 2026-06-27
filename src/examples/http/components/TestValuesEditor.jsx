import React, { useState, useEffect } from 'react';

// ---------------------------------------------------------------------------
// TestValuesEditor
//
// Receives a plain object (`testValues`) and an `onChange` callback that
// returns the next object. Renders an inline JSON textarea so the user can
// edit concrete values used to resolve `{{...}}` tokens at request time.
// ---------------------------------------------------------------------------

const TestValuesEditor = ({ testValues, onChange }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(JSON.stringify(testValues || {}, null, 2));
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!editing) {
      setDraft(JSON.stringify(testValues || {}, null, 2));
      setError(null);
    }
  }, [testValues, editing]);

  const commit = () => {
    try {
      const parsed = JSON.parse(draft || '{}');
      onChange(parsed);
      setError(null);
      setEditing(false);
    } catch (e) {
      setError(`Invalid JSON: ${e.message}`);
    }
  };

  return (
    <div>
      <h4 style={{ margin: '1.25rem 0 0.5rem 0', fontSize: '0.85rem', color: '#333' }}>
        testValues
      </h4>
      <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.7rem', color: '#666' }}>
        Valores concretos usados SOLO para probar la request desde este editor.
        No representan datos de runtime.
      </p>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
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
              onClick={commit}
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
                setDraft(JSON.stringify(testValues || {}, null, 2));
                setError(null);
                setEditing(false);
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
      {editing ? (
        <>
          <textarea
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setError(null);
            }}
            style={{
              width: '100%',
              minHeight: '120px',
              padding: '0.5rem',
              fontFamily: "'Courier New', monospace",
              fontSize: '0.8rem',
              border: error ? '1px solid #d32f2f' : '1px solid #ddd',
              borderRadius: '4px',
              outline: 'none',
              resize: 'vertical'
            }}
          />
          {error && (
            <div style={{ marginTop: '0.25rem', fontSize: '0.7rem', color: '#d32f2f' }}>
              {error}
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
          {JSON.stringify(testValues || {}, null, 2)}
        </pre>
      )}
    </div>
  );
};

export default TestValuesEditor;
