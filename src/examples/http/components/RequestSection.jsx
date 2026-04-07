import React, { useState, useRef, useEffect } from 'react';
import QueryParams from './QueryParams';

const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

const RequestSection = ({ requestData, setRequestData, onSend, loading, onUrlChange }) => {
  const { method, url, body, queryParams } = requestData;
  const [currentTab, setCurrentTab] = useState('Params');
  const [notValidUrl, setNotValidUrl] = useState(false);
  const urlInputRef = useRef(null);

  const tabs = ['Params', 'Headers', 'Body'];

  const isValidUrl = (string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  useEffect(() => {
    const listener = async (event) => {
      if (event.code === 'Enter' || event.code === 'NumpadEnter') {
        event.preventDefault();
        if (document.activeElement !== urlInputRef.current) return;
        await handleSend();
      }
    };
    document.addEventListener('keydown', listener);
    return () => {
      document.removeEventListener('keydown', listener);
    };
  }, [url, method, body, queryParams]);

  const handleSend = async () => {
    if (!isValidUrl(url)) {
      setNotValidUrl(true);
      return;
    }
    setNotValidUrl(false);
    await onSend();
  };

  const handleMethodChange = (e) => {
    setRequestData({ ...requestData, method: e.target.value });
  };

  const handleUrlChange = (e) => {
    setNotValidUrl(false);
    const newUrl = e.target.value;
    setRequestData({ ...requestData, url: newUrl });
    if (onUrlChange) {
      onUrlChange(newUrl);
    }
  };

  const handleBodyChange = (e) => {
    setRequestData({ ...requestData, body: e.target.value });
  };

  const handleQueryParamsChange = (newParams) => {
    setRequestData({ ...requestData, queryParams: newParams });
  };

  const keyValuePairsToObject = () => {
    const obj = {};
    queryParams.forEach((pair) => {
      if (pair.key) {
        obj[pair.key] = pair.value;
      }
    });
    return obj;
  };

  return (
    <div style={{ borderBottom: '1px solid #ddd' }}>
      {/* Header with method, URL, and send button */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <select
          value={method}
          onChange={handleMethodChange}
          style={{
            padding: '0.75rem 1rem',
            border: '1px solid #ddd',
            borderRadius: '4px',
            backgroundColor: 'white',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: 'pointer',
            outline: 'none'
          }}
        >
          {methods.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>

        <input
          ref={urlInputRef}
          type="url"
          value={url}
          onChange={handleUrlChange}
          placeholder="https://jsonplaceholder.typicode.com/todos/1"
          style={{
            flex: 1,
            padding: '0.75rem 1rem',
            border: `1px solid ${notValidUrl ? '#d32f2f' : '#ddd'}`,
            borderRadius: '4px',
            fontSize: '0.875rem',
            outline: 'none',
            backgroundColor: notValidUrl ? '#ffebee' : 'white'
          }}
        />

        <button
          onClick={handleSend}
          disabled={loading}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: loading ? '#999' : '#1976d2',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          {loading ? (
            <>
              <span>⏹</span>
              <span>Cancel</span>
            </>
          ) : (
            <>
              <span>➤</span>
              <span>Send</span>
            </>
          )}
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid #ddd' }}>
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setCurrentTab(tab)}
            style={{
              padding: '0.75rem 1rem',
              background: 'none',
              border: 'none',
              borderBottom: currentTab === tab ? '2px solid #1976d2' : '2px solid transparent',
              color: currentTab === tab ? '#1976d2' : '#666',
              fontWeight: currentTab === tab ? 600 : 400,
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ minHeight: '200px', padding: '1rem 0' }}>
        {currentTab === 'Params' && (
          <QueryParams pairs={queryParams} setPairs={handleQueryParamsChange} />
        )}

        {currentTab === 'Headers' && (
          <div style={{ padding: '1rem', color: '#666', textAlign: 'center' }}>
            Headers feature coming soon...
          </div>
        )}

        {currentTab === 'Body' && (
          <textarea
            value={body}
            onChange={handleBodyChange}
            placeholder={'{\n  "key": "value"\n}'}
            style={{
              width: '100%',
              minHeight: '200px',
              padding: '1rem',
              fontFamily: "'Courier New', monospace",
              fontSize: '0.875rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
              resize: 'vertical',
              outline: 'none',
              backgroundColor: '#1e1e1e',
              color: '#d4d4d4'
            }}
          />
        )}
      </div>
    </div>
  );
};

export default RequestSection;
