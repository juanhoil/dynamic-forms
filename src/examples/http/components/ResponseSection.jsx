import React, { useState, useEffect } from 'react';
import JsonSchemaSuggest from './JsonSchemaSuggest';

// ---------------------------------------------------------------------------
// ResponseSection
//
// Response-side counterpart of RequestSection: owns the tab navigation
// (Response / JSON Schema Suggest / Debug Config) and renders the matching
// content. The raw response rendering (status + body) is the "Response" tab.
//
// Props: link, response, loading, error.
// ---------------------------------------------------------------------------

const getStatusColor = (code) => {
  if (!code) return '#666';
  if (code >= 200 && code < 300) return '#4caf50';
  if (code >= 300 && code < 400) return '#ff9800';
  if (code >= 400) return '#f44336';
  return '#666';
};

const centeredBox = (color) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: '200px',
  color
});

const ResponseView = ({ response, loading, error }) => {
  const { statusCode, content, time } = response || {};

  return (
    <div style={{ marginTop: '1rem' }}>
      {/* Response Header */}
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
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Response</span>
          {statusCode && (
            <span
              style={{
                padding: '0.25rem 0.5rem',
                backgroundColor: getStatusColor(statusCode),
                color: 'white',
                borderRadius: '4px',
                fontSize: '0.75rem',
                fontWeight: 600
              }}
            >
              {statusCode}
            </span>
          )}
        </div>

        {time !== null && time !== undefined && (
          <span style={{ fontSize: '0.875rem', color: '#666' }}>
            Time: {time}s
          </span>
        )}
      </div>

      {/* Response Body */}
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
        {loading && (
          <div style={centeredBox('#666')}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
            <span>Sending request...</span>
          </div>
        )}

        {!loading && error && (
          <div style={centeredBox('#f44336')}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚠️</div>
            <span>Could not send request!</span>
            {content && (
              <pre
                style={{
                  marginTop: '1rem',
                  padding: '1rem',
                  backgroundColor: '#ffebee',
                  borderRadius: '4px',
                  color: '#d32f2f',
                  fontSize: '0.75rem',
                  maxWidth: '100%',
                  overflow: 'auto'
                }}
              >
                {typeof content === 'string' ? content : JSON.stringify(content, null, 2)}
              </pre>
            )}
          </div>
        )}

        {!loading && !error && !content && (
          <div style={centeredBox('#666')}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🚀</div>
            <span>Fire a request to see the response</span>
          </div>
        )}

        {!loading && !error && content && (
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
            {typeof content === 'string'
              ? content
              : JSON.stringify(content, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
};

const ResponseSection = ({ link, response, loading, error }) => {
  const [activeTab, setActiveTab] = useState('response');

  const tabs = [
    { id: 'response', label: 'Response' },
    ...(link.response?.jsonSchema ? [{ id: 'schema', label: 'JSON Schema Suggest' }] : []),
    { id: 'debug', label: 'Debug Config' }
  ];

  // Reset to the Response tab when the selected link changes.
  useEffect(() => {
    setActiveTab('response');
  }, [link?.id]);

  // Fall back when the active tab is no longer available (e.g. the inferred
  // schema disappeared after a new request).
  const currentTab = tabs.some((t) => t.id === activeTab) ? activeTab : 'response';

  return (
    <div>
      {/* Navbar Tabs */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid #ddd',
          marginTop: '1.5rem',
          marginBottom: '0.5rem'
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'none',
              border: 'none',
              borderBottom: currentTab === tab.id ? '2px solid #1976d2' : '2px solid transparent',
              color: currentTab === tab.id ? '#1976d2' : '#666',
              fontWeight: currentTab === tab.id ? 600 : 400,
              cursor: 'pointer',
              fontSize: '0.875rem',
              transition: 'all 0.2s'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {currentTab === 'response' && (
        <ResponseView response={response} loading={loading} error={error} />
      )}

      {currentTab === 'schema' && (
        <JsonSchemaSuggest schema={link.response?.jsonSchema} response={response} />
      )}

      {currentTab === 'debug' && (
        <div style={{ marginTop: '1rem' }}>
          <h4 style={{ margin: '0 0 0.5rem 0', color: '#333' }}>Link Config:</h4>
          <pre
            style={{
              margin: 0,
              fontFamily: "'Courier New', monospace",
              fontSize: '0.75rem',
              lineHeight: 1.5,
              color: '#d4d4d4',
              backgroundColor: '#1e1e1e',
              padding: '1rem',
              borderRadius: '4px',
              overflow: 'auto',
              maxHeight: '400px'
            }}
          >
            {JSON.stringify(link, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default ResponseSection;
