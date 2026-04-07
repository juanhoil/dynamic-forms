import React from 'react';

const QueryParams = ({ pairs, setPairs }) => {
  const addQueryParamField = () => {
    setPairs([
      ...pairs,
      {
        id: Math.floor(Math.random() * 2000),
        key: '',
        value: '',
      },
    ]);
  };

  const deleteField = (id) => {
    const updatedPairs = pairs.filter((pair) => pair.id !== id);
    setPairs(updatedPairs);
  };

  const updatePair = (event, id, type) => {
    let tempPairs = [...pairs];
    const pairIndex = pairs.findIndex((pair) => pair.id === id);
    tempPairs[pairIndex] = { ...tempPairs[pairIndex], [type]: event.target.value };
    setPairs(tempPairs);
  };

  return (
    <div style={{ padding: '0.5rem' }}>
      <h4 style={{ marginBottom: '0.5rem', fontSize: '0.875rem', color: '#666' }}>Query Params</h4>

      <div style={{
        display: 'flex',
        width: '100%',
        fontSize: '0.875rem',
        border: '1px solid #ddd',
        borderBottom: 'none',
        backgroundColor: '#f5f5f5',
        fontWeight: 600
      }}>
        <span style={{ flex: 1, padding: '0.5rem', borderRight: '1px solid #ddd' }}>Key</span>
        <span style={{ flex: 1, padding: '0.5rem' }}>Value</span>
      </div>

      {pairs.map((pair) => (
        <div
          key={pair.id}
          style={{
            display: 'flex',
            width: '100%',
            border: '1px solid #ddd',
            borderTop: 'none',
            alignItems: 'center',
            position: 'relative'
          }}
        >
          <input
            style={{
              flex: 1,
              padding: '0.5rem',
              border: 'none',
              borderRight: '1px solid #ddd',
              outline: 'none',
              fontSize: '0.875rem'
            }}
            type="text"
            placeholder="key"
            value={pair.key}
            onChange={(event) => updatePair(event, pair.id, 'key')}
          />
          <input
            style={{
              flex: 1,
              padding: '0.5rem',
              border: 'none',
              outline: 'none',
              fontSize: '0.875rem'
            }}
            type="text"
            placeholder="value"
            value={pair.value}
            onChange={(event) => updatePair(event, pair.id, 'value')}
          />
          <button
            onClick={() => deleteField(pair.id)}
            style={{
              position: 'absolute',
              right: '0.5rem',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#999',
              fontSize: '1rem'
            }}
            title="Delete"
          >
            ×
          </button>
        </div>
      ))}

      <button
        onClick={addQueryParamField}
        style={{
          marginTop: '0.5rem',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: '#666',
          fontSize: '1.25rem',
          padding: '0.25rem'
        }}
        title="Add param"
      >
        +
      </button>
    </div>
  );
};

export default QueryParams;
