import React, { useState } from 'react';
import RequestSection from './RequestSection';
import ResponseSection from './ResponseSection';
import JsonSchemaSuggest from './JsonSchemaSuggest';
import apiClient from '../utils/apiClient';
import { createSchemaFromJson } from '../utils/schemaInference.js';
import Ajv from 'ajv';


const HttpRequestModal = ({ open, onClose }) => {
  const [requestData, setRequestData] = useState({
    method: 'GET',
    url: 'https://jsonplaceholder.typicode.com/todos/1',
    body: '{\n  \n}',
    queryParams: [
      { id: 1, key: '', value: '' }
    ],
    jsonSchema: null
  });

  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [activeTab, setActiveTab] = useState('response');

  // Only show schema tab if there's jsonSchema
  const tabs = [
    { id: 'response', label: 'Response' },
    ...(requestData.jsonSchema ? [{ id: 'schema', label: 'JSON Schema Suggest' }] : []),
    { id: 'debug', label: 'Debug Config' }
  ];

  if (!open) return null;

  const keyValuePairsToObject = (pairs) => {
    const obj = {};
    pairs.forEach((pair) => {
      if (pair.key) {
        obj[pair.key] = pair.value;
      }
    });
    return obj;
  };

  const handleUrlChange = (newUrl) => {
    // Reset schema when URL changes (URL is already updated by RequestSection)
    if (newUrl !== requestData.url) {
      setRequestData(prev => ({ ...prev, jsonSchema: null }));
    }
  };

  const handleSend = async () => {
    setLoading(true);
    setError(false);

    try {
      const params = keyValuePairsToObject(requestData.queryParams);
      let data = null;

      if (requestData.method !== 'GET' && requestData.method !== 'DELETE') {
        try {
          data = JSON.parse(requestData.body);
        } catch (e) {
          data = requestData.body;
        }
      }

      const result = await apiClient({
        method: requestData.method.toLowerCase(),
        url: requestData.url,
        params,
        data
      });

      let responseContent;
      let schema = requestData.jsonSchema;

      if (typeof result.data === 'object') {
        responseContent = JSON.stringify(result.data, null, 2);

        if (schema) {
          // Validate response against existing schema
          try {
            const ajv = new Ajv({ strict: false });
            const validate = ajv.compile(schema);
            const valid = validate(result.data);
            if (!valid) {
              console.log('Schema validation errors:', validate.errors);
            }
          } catch (e) {
            console.error('Schema compilation error:', e.message);
          }
        } else {
          // Generate schema from response
          try {
            schema = createSchemaFromJson(result.data);
          } catch (e) {
            console.error('Failed to generate schema:', e);
          }
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

      // Save schema to requestData
      setRequestData(prev => ({ ...prev, jsonSchema: schema }));
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
        zIndex: 1000
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
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>
            HTTP Request
          </h2>
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
            requestData={requestData}
            setRequestData={setRequestData}
            onSend={handleSend}
            loading={loading}
            onUrlChange={handleUrlChange}
          />

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
                  borderBottom: activeTab === tab.id ? '2px solid #1976d2' : '2px solid transparent',
                  color: activeTab === tab.id ? '#1976d2' : '#666',
                  fontWeight: activeTab === tab.id ? 600 : 400,
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
          {activeTab === 'response' && (
            <ResponseSection
              response={response}
              loading={loading}
              error={error}
            />
          )}

          {activeTab === 'schema' && (
            <JsonSchemaSuggest schema={requestData.jsonSchema} response={response} />
          )}

          {activeTab === 'debug' && (
            <div style={{ marginTop: '1rem' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#333' }}>Request Config:</h4>
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
                {JSON.stringify(requestData, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HttpRequestModal;
