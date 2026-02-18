import React from 'react';

const SchemaTitle = ({ value, onChange }) => {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <label
        htmlFor="schema-title"
        style={{ display: 'block', fontSize: '0.85rem', color: '#555', marginBottom: '0.25rem', fontWeight: 600 }}
      >
        Título
      </label>
      <input
        id="schema-title"
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Título del formulario"
        style={{
          width: '100%',
          padding: '0.5rem 0.75rem',
          fontSize: '1rem',
          border: '1px solid #ddd',
          borderRadius: '6px',
          outline: 'none',
          transition: 'border-color 0.2s',
        }}
        onFocus={(e) => { e.target.style.borderColor = '#1976d2'; }}
        onBlur={(e) => { e.target.style.borderColor = '#ddd'; }}
      />
    </div>
  );
};

export default SchemaTitle;
