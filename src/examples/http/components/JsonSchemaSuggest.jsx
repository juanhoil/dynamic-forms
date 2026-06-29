import React from 'react';
import 'jsonjoy-builder/styles.css';
import SchemaEditor from './SchemaEditor';

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
          backgroundColor: schema ? '#fff' : '#1e1e1e',
          borderRadius: '4px',
          padding: '1rem'
        }}
      >
        {schema && (
          <SchemaEditor
            schema={schema}
            onChange={() => {}}
            readOnly={true}
            minHeight={180}
          />
        )}
      </div>
    </div>
  );
};

export default JsonSchemaSuggest;
