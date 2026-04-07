import React from 'react';
import 'jsonjoy-builder/styles.css';

const JsonSchemaSuggest = ({ schema, response }) => {
  const copyToClipboard = () => {
    if (schema) {
      navigator.clipboard.writeText(JSON.stringify(schema, null, 2));
    }
  };

  return (
    <div style={{ marginTop: '1rem' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.75rem 1rem',
          backgroundColor: '#f5f5f5',
          borderRadius: '4px',
          marginBottom: '0.5rem'
        }}
      >
        <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>
          JSON Schema Suggest
        </span>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {schema && (
            <button
              onClick={copyToClipboard}
              style={{
                padding: '0.375rem 0.75rem',
                backgroundColor: '#4caf50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '0.75rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}
            >
              <span>📋</span>
              <span>Copy</span>
            </button>
          )}
          <span
            style={{
              padding: '0.375rem 0.75rem',
              backgroundColor: schema ? '#e8f5e9' : '#fff3e0',
              color: schema ? '#2e7d32' : '#e65100',
              border: 'none',
              borderRadius: '4px',
              fontSize: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}
          >
            {schema ? '✅ Schema Generated' : '⏳ No Schema'}
          </span>
        </div>
      </div>

      {/* Schema Display */}
      <div
        style={{
          minHeight: '200px',
          maxHeight: '400px',
          overflow: 'auto',
          backgroundColor: '#1e1e1e',
          borderRadius: '4px',
          padding: '1rem'
        }}
      >
        {!response?.content && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '200px',
              color: '#666'
            }}
          >
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📝</div>
            <span>Send a request to generate JSON Schema</span>
          </div>
        )}

        {response?.content && !schema && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '200px',
              color: '#666'
            }}
          >
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚠️</div>
            <span>Response is not valid JSON - cannot generate schema</span>
          </div>
        )}

        {schema && (
          <pre
            style={{
              margin: 0,
              fontFamily: "'Courier New', monospace",
              fontSize: '0.875rem',
              lineHeight: 1.5,
              color: '#d4d4d4',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word'
            }}
          >
            {JSON.stringify(schema, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
};

export default JsonSchemaSuggest;
