import React from 'react';
import BaseConfigHTTP from './BaseConfigHTTP';
import type { HyperSchemaLink, JsonSchema } from '@/examples/forms/types';

const DATA_ROLE_STYLES = {
  init:      { bg: '#1976d2', fg: '#fff', label: 'init' },
  catalog:   { bg: '#2e7d32', fg: '#fff', label: 'catalog' },
  dependent: { bg: '#e65100', fg: '#fff', label: 'dependent' },
  submit:    { bg: '#6a1b9a', fg: '#fff', label: 'submit' }
};

const DataRolePill = ({ role }: { role?: string }) => {
  const style = DATA_ROLE_STYLES[role as keyof typeof DATA_ROLE_STYLES] || {
    bg: '#757575',
    fg: '#fff',
    label: role || '?'
  };
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '0.15rem 0.55rem',
        borderRadius: '999px',
        backgroundColor: style.bg,
        color: style.fg,
        fontSize: '0.7rem',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.04em'
      }}
    >
      {style.label}
    </span>
  );
};

interface HttpRequestModalProps {
  open: boolean;
  onClose: () => void;
  httpConfig?: Partial<HyperSchemaLink> | null;
  formSchema?: JsonSchema | null;
  onConfigChange?: ((config: HyperSchemaLink) => void) | null;
}

const HttpRequestModal = ({
  open,
  onClose,
  formSchema = null,
  httpConfig = null,
  onConfigChange = null
}: HttpRequestModalProps) => {
  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          maxWidth: '90vw',
          width: '1000px',
          maxHeight: '90vh',
          height: '100%',
          overflow: 'auto',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
        }}
      >
        <BaseConfigHTTP
          formSchema={formSchema}
          httpConfig={httpConfig}
          onConfigChange={onConfigChange}
          renderHeader={(link) => (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1rem 1.5rem',
                borderBottom: '1px solid #ddd'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <DataRolePill role={link.dataRole} />
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>
                  {link.name || 'HTTP Request'}
                </h2>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(link, null, 2));
                  }}
                  style={{
                    padding: '0.35rem 0.75rem',
                    backgroundColor: '#f5f5f5',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    color: '#666'
                  }}
                  title="Copiar link actual"
                >
                  💾 Copy
                </button>
              </div>
              <button
                onClick={onClose}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#666',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '4px',
                  lineHeight: 1
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#ffebee';
                  e.currentTarget.style.color = '#d32f2f';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#666';
                }}
                title="Close modal"
              >
                ×
              </button>
            </div>
          )}
        />
      </div>
    </div>
  );
};

export default HttpRequestModal;