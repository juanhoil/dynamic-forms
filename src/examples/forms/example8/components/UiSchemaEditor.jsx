import React, { useEffect, useState } from 'react';

const UiSchemaEditor = ({ uiSchema, onChange }) => {
  const [jsonText, setJsonText] = useState(JSON.stringify(uiSchema, null, 2));
  const [error, setError] = useState(null);

  useEffect(() => {
    setJsonText(JSON.stringify(uiSchema, null, 2));
  }, [uiSchema]);

  const handleChange = (event) => {
    const text = event.target.value;
    setJsonText(text);
    try {
      const parsed = JSON.parse(text);
      setError(null);
      onChange(parsed);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label
          htmlFor="uischema-editor"
          style={{ fontSize: '0.85rem', color: '#555', fontWeight: 600 }}
        >
          UI Schema (JSON)
        </label>
        <a
          href="https://rjsf-tailwind.vercel.app/"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: '0.8rem',
            color: '#1976d2',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem',
            padding: '0.2rem 0.5rem',
            borderRadius: '4px',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(event) => { event.currentTarget.style.backgroundColor = '#e3f2fd'; }}
          onMouseLeave={(event) => { event.currentTarget.style.backgroundColor = 'transparent'; }}
        >
          <span>?</span> Consultar referencia RJSF
        </a>
      </div>
      <textarea
        id="uischema-editor"
        value={jsonText}
        onChange={handleChange}
        spellCheck={false}
        style={{
          flex: 1,
          minHeight: '400px',
          fontFamily: "'Courier New', monospace",
          fontSize: '0.875rem',
          padding: '1rem',
          border: `1px solid ${error ? '#d32f2f' : '#ddd'}`,
          borderRadius: '6px',
          outline: 'none',
          resize: 'vertical',
          backgroundColor: '#f9f9f9',
          transition: 'border-color 0.2s',
          lineHeight: 1.5,
          tabSize: 2,
        }}
        onFocus={(event) => { if (!error) event.target.style.borderColor = '#1976d2'; }}
        onBlur={(event) => { if (!error) event.target.style.borderColor = '#ddd'; }}
      />
      {error && (
        <div style={{
          color: '#d32f2f',
          fontSize: '0.8rem',
          padding: '0.4rem 0.6rem',
          backgroundColor: '#ffebee',
          borderRadius: '4px',
        }}>
          JSON inválido: {error}
        </div>
      )}
    </div>
  );
};

export default UiSchemaEditor;
