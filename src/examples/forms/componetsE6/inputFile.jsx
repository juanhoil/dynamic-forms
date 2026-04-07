//import { FileWidget } from '@rjsf/core';
//   <form
//   widgets={{ FileWidget: CustomFileWidget }} agregaesto en el formulario de ejemplo 6
import { useCallback } from 'react';
import { TrashIcon } from '@rjsf/mui';

const TrashIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);

const CustomFileWidget = (props) => {
  const { id, value, onChange, options } = props;
  const accept = options?.accept || '*';

  const handleChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result);
    reader.readAsDataURL(file);
  }, [onChange]);

  const handleRemove = useCallback(() => {
    onChange(undefined);
  }, [onChange]);

  const fileName = value
    ? decodeURIComponent(value.split(';')[0]?.split('/').pop() || 'archivo')
    : null;

  return (
    <div>
      <input
        id={id}
        type="file"
        accept={accept}
        onChange={handleChange}
        style={{ marginBottom: '0.5rem' }}
      />
      {value && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
          <span style={{ fontSize: '0.875rem', color: '#333' }}>{fileName}</span>
          <button
            type="button"
            onClick={handleRemove}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#999',
              padding: '4px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              transition: 'color 0.2s, background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#d32f2f';
              e.currentTarget.style.backgroundColor = '#ffebee';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#999';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            title="Eliminar archivo"
          >
            <TrashIcon />
          </button>
        </div>
      )}
    </div>
  );
};