import React from 'react';

const ResponseSection = ({ response, loading, error }) => {
  const { statusCode, content, time } = response || {};

  const getStatusColor = (code) => {
    if (!code) return '#666';
    if (code >= 200 && code < 300) return '#4caf50';
    if (code >= 300 && code < 400) return '#ff9800';
    if (code >= 400) return '#f44336';
    return '#666';
  };

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
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
            <span>Sending request...</span>
          </div>
        )}

        {!loading && error && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '200px',
              color: '#f44336'
            }}
          >
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

export default ResponseSection;
