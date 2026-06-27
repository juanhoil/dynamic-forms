import React, { useEffect, useState } from 'react';
import RequestSection from './RequestSection';
import ResponseSection from './ResponseSection';
import apiClient from '../utils/apiClient';
import { createSchemaFromJson } from '../utils/schemaInference.js';
import { buildRequest } from '../utils/buildRequest.js';

const DATA_ROLE_STYLES = {
  init:      { bg: '#1976d2', fg: '#fff', label: 'init' },
  catalog:   { bg: '#2e7d32', fg: '#fff', label: 'catalog' },
  dependent: { bg: '#e65100', fg: '#fff', label: 'dependent' },
  submit:    { bg: '#6a1b9a', fg: '#fff', label: 'submit' }
};

const DataRolePill = ({ role }) => {
  const style = DATA_ROLE_STYLES[role] || { bg: '#757575', fg: '#fff', label: role || '?' };
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

// Ensure the link always has a usable shape: when a request sub-field has no
// configuration (null / missing), it defaults to `{}`. testValues defaults to
// an empty object too. Unknown fields are preserved.
const normalizeLink = (cfg) => {
  const base = cfg || {};
  const req = base.request || {};
  return {
    name: 'New link',
    description: '',
    dataRole: 'init',
    response: { jsonSchema: null, responseMapping: null },
    ...base,
    request: {
      ...req,
      method: req.method || 'GET',
      url: req.url || '',
      headers: req.headers ?? {},
      body: req.body ?? {},
      queryVariables: req.queryVariables ?? {},
      externalVariables: req.externalVariables ?? {},
      testValues: req.testValues ?? {}
    }
  };
};

const HttpRequestModal = ({
  open,
  onClose,
  httpConfig = null,
  onConfigChange = null
}) => {
  const [link, setLink] = useState(() => normalizeLink(httpConfig));

  // Keep internal state in sync when the parent swaps the selected link
  // (e.g. user clicks a different card and reopens the modal).
  useEffect(() => {
    setLink(normalizeLink(httpConfig));
    setResponse(null);
    setError(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [httpConfig?.id]);

  const updateLink = (updater) => {
    setLink(prev => (typeof updater === 'function' ? updater(prev) : updater));
  };

  // Notify the parent AFTER render, not inside the setLink updater. Calling the
  // parent's setState from within the updater updates another component during
  // this component's render phase ("Cannot update a component while rendering
  // a different component").
  useEffect(() => {
    if (onConfigChange) onConfigChange(link);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [link]);

  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  if (!open) return null;

  const handleSend = async () => {
    setLoading(true);
    setError(false);

    try {
      // testValues is the single source of values: {{tokens}} in the URL
      // (path and query string), body and headers are resolved from it.
      const { method, url, data, headers } = await buildRequest(
        link.request,
        link.request.testValues
      );

      const result = await apiClient({
        method,
        url,
        data,
        headers
      });

      let responseContent;
      let schema = link.response?.jsonSchema;

      if (typeof result.data === 'object' && result.data !== null) {
        responseContent = JSON.stringify(result.data, null, 2);
        try {
          schema = createSchemaFromJson(result.data);
        } catch (e) {
          console.error('Failed to generate schema:', e);
        }
      } else {
        responseContent = String(result.data);
      }

      setResponse({
        statusCode: result.status,
        content: responseContent,
        time: result.duration ? (result.duration / 1000).toFixed(3) : 0,
        error: false
      });

      // Persist inferred schema AND the actual response values back into the
      // link, so the parent and the "JSON Schema Suggest" tab stay in sync.
      // response.testValues captures the concrete data from each request.
      updateLink(prev => ({
        ...prev,
        response: {
          ...(prev.response || {}),
          jsonSchema: schema,
          testValues: result.data
        }
      }));
    } catch (err) {
      let errorContent = err.message;
      let statusCode = err.response?.status || 0;

      if (err.response?.data) {
        if (typeof err.response.data === 'object') {
          errorContent = JSON.stringify(err.response.data, null, 2);
        } else {
          errorContent = String(err.response.data);
        }
      }

      setResponse({
        statusCode,
        content: errorContent,
        time: err.duration ? (err.duration / 1000).toFixed(3) : 0,
        error: true
      });
      setError(true);
    } finally {
      setLoading(false);
    }
  };

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
          overflow: 'auto',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
        }}
      >
        {/* Modal Header */}
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

        {/* Modal Content */}
        <div style={{ padding: '1.5rem' }}>
          <RequestSection
            link={link}
            setLink={updateLink}
            onSend={handleSend}
            loading={loading}
            response={response}
          />

          <ResponseSection
            link={link}
            response={response}
            loading={loading}
            error={error}
          />
        </div>
      </div>
    </div>
  );
};

export default HttpRequestModal;