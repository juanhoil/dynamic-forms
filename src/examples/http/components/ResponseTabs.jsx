import React, { useState, useEffect } from 'react';
import ResponseSection from './ResponseSection';
import JsonSchemaSuggest from './JsonSchemaSuggest';

// ---------------------------------------------------------------------------
// ResponseTabs
//
// Response-side counterpart of RequestSection: owns the tab navigation and
// renders the matching content (Response, JSON Schema Suggest, Debug Config).
// The actual response rendering still lives in `ResponseSection`, used here as
// the inner view for the "Response" tab.
//
// Props: link, response, loading, error.
// ---------------------------------------------------------------------------

const ResponseTabs = ({ link, response, loading, error }) => {
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
        <ResponseSection response={response} loading={loading} error={error} />
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

export default ResponseTabs;
