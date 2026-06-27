import React, { useState } from 'react';
import HttpRequestModal from './components/HttpRequestModal';

// Lista de configuraciones predefinidas
const CONFIGURATIONS = [
  {
    id: 'init-todo',
    name: '🌐 Default - GET All',
    description: 'Petición GET básica a JSONPlaceholder',
    dataRole: "init", // init, catalog, dependent, submit
    request: {
      method: 'GET',
      url: 'https://jsonplaceholder.typicode.com/posts',
      headers: {},
      body: {},
      queryVariables: {},
      testValues: {},
      externalVariables: {}
    },
    response: {
      jsonSchema: {},
      testValues: {},
      responseMapping: {}
    }
  },
  {
    id: 'init-one',
    name: '🌐 Default - GET ONE',
    description: 'Petición GET básica a JSONPlaceholder',
    dataRole: "init", // init, catalog, dependent, submit
    request: {
      method: 'GET',
      url: 'https://jsonplaceholder.typicode.com/posts/{{id}}',
      headers: {},
      body: {},
      queryVariables: {},
      testValues: { id: 1},
      externalVariables: { type: 'object', properties: { id: { type: 'number' } } }
    },
    response: {
      jsonSchema: {},
      testValues: {},
      responseMapping: {}
    }
  },
  {
    id: 'submit-post',
    name: '📝 POST - Crear Post',
    description: 'Crear un nuevo post con body JSON',
    dataRole: "submit", // init, catalog, dependent, submit
    request: {
      method: 'POST',
      url: 'https://jsonplaceholder.typicode.com/posts',
      headers: { type: 'object', properties: { 'Content-Type': { type: 'string', default: 'application/json' } } },
      body: {
        type: 'object',
        properties: {
          title:  { type: 'string' },
          body:   { type: 'string' },
          userId: { type: 'number' }
        }
      },
      queryVariables: {},
      testValues: { userId: 1, title: 'Mi Nuevo Post', body: 'Contenido del post aquí...' },
      externalVariables: {}
    },
    response: {
      jsonSchema: {},
      testValues: {},
      responseMapping: {}
    }
  },
  {
    id: 'update-post',
    name: '🌐 Default - PUT Post',
    description: 'Petición PUT básica a JSONPlaceholder',
    dataRole: 'submit', // init, catalog, dependent, submit
    request: {
      method: 'PUT',
      url: 'https://jsonplaceholder.typicode.com/posts/{{id}}',
      headers: {
        type: 'object',
        properties: {
          'Content-Type': {
            type: 'string',
            default: 'application/json; charset=UTF-8'
          }
        }
      },
      body: {
        type: 'object',
        properties: {
          id: {
            type: 'number'
          },
          title: {
            type: 'string'
          },
          body: {
            type: 'string'
          },
          userId: {
            type: 'number'
          }
        }
      },
      queryVariables: {},
      testValues: {
        id: 1,
        title: 'foo',
        body: 'bar',
        userId: 1
      },
      externalVariables: {
        type: 'object',
        properties: {
          id: {
            type: 'number'
          }
        }
      }
    },
    response: {
      jsonSchema: {},
      testValues: {},
      responseMapping: {}
    }
  }
];

const ConfigCard = ({ config, isSelected, onSelect }) => (
  <div
    onClick={onSelect}
    style={{
      padding: '1rem',
      borderRadius: '8px',
      border: isSelected ? '2px solid #1976d2' : '2px solid #e0e0e0',
      backgroundColor: isSelected ? '#e3f2fd' : '#fafafa',
      cursor: 'pointer',
      transition: 'all 0.2s',
      textAlign: 'left'
    }}
    onMouseEnter={(e) => {
      if (!isSelected) {
        e.currentTarget.style.borderColor = '#90caf9';
        e.currentTarget.style.backgroundColor = '#f5f5f5';
      }
    }}
    onMouseLeave={(e) => {
      if (!isSelected) {
        e.currentTarget.style.borderColor = '#e0e0e0';
        e.currentTarget.style.backgroundColor = '#fafafa';
      }
    }}
  >
    <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.25rem', color: '#333' }}>
      {config.name}
    </div>
    <div style={{ fontSize: '0.8rem', color: '#666' }}>
      {config.description}
    </div>
    <div style={{ marginTop: '0.5rem', fontSize: '0.7rem', color: '#1976d2', fontFamily: 'monospace' }}>
      {config.request.method} {config.request.url.substring(0, 40)}...
    </div>
  </div>
);

const ExampleHR1 = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [savedConfig, setSavedConfig] = useState(null);
  const [selectedConfigId, setSelectedConfigId] = useState('default');

  const selectedCard = CONFIGURATIONS.find(c => c.id === selectedConfigId) || CONFIGURATIONS[0];
  const selectedConfig = selectedCard.request;

  // Callback para recibir cambios en tiempo real
  const handleConfigChange = (config) => {
    setSavedConfig(config);
  };

  const openModal = () => {
    setModalOpen(true);
  };

  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">HTTP Requests</h1>
        <p className="page-description">
          Realiza peticiones HTTP con una interfaz tipo Postwoman/Postman
        </p>
      </div>

      <div className="panel">
        <div style={{ padding: '1.5rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '3rem' }}>🌐</div>
            <h2 style={{ margin: '0.5rem 0', color: '#333' }}>HTTP Request Client</h2>
            <p style={{ color: '#666', margin: 0 }}>
              Selecciona una configuración predefinida o abre una nueva petición
            </p>
          </div>

          {/* Grid de configuraciones */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem'
          }}>
            {CONFIGURATIONS.map((config) => (
              <ConfigCard
                key={config.id}
                config={config}
                isSelected={selectedConfigId === config.id}
                onSelect={() => setSelectedConfigId(config.id)}
              />
            ))}
          </div>

          {/* Botón para abrir modal */}
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <button
              onClick={openModal}
              style={{
                padding: '1rem 2rem',
                backgroundColor: '#1976d2',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 2px 8px rgba(25, 118, 210, 0.3)',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(25, 118, 210, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(25, 118, 210, 0.3)';
              }}
            >
              <span>➕</span>
              <span>Abrir "{CONFIGURATIONS.find(c => c.id === selectedConfigId)?.name.split(' ').slice(1).join(' ') || 'Default'}"</span>
            </button>
          </div>

          {/* Preview de la configuración seleccionada */}
          <div
            style={{
              padding: '1rem',
              backgroundColor: '#263238',
              borderRadius: '8px',
              marginBottom: '1rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', color: '#90a4ae', fontWeight: 600 }}>PREVIEW</span>
              <span style={{ fontSize: '0.7rem', color: '#4caf50' }}>● {selectedConfig.method}</span>
            </div>
            <pre
              style={{
                margin: 0,
                fontSize: '0.75rem',
                color: '#aed581',
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all'
              }}
            >
              {JSON.stringify(selectedConfig, null, 2)}
            </pre>
          </div>

          {/* Configuración en tiempo real */}
          {savedConfig && (
            <div
              style={{
                padding: '1rem',
                backgroundColor: '#e3f2fd',
                borderRadius: '8px',
                borderLeft: '4px solid #1976d2'
              }}
            >
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#1565c0', fontSize: '0.85rem' }}>
                Configuración Actual del Modal (Tiempo Real):
              </h4>
              <pre
                style={{
                  margin: 0,
                  fontSize: '0.7rem',
                  backgroundColor: '#1e1e1e',
                  color: '#d4d4d4',
                  padding: '0.75rem',
                  borderRadius: '4px',
                  overflow: 'auto',
                  maxHeight: '150px'
                }}
              >
                {JSON.stringify(savedConfig, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>

      <HttpRequestModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        httpConfig={selectedCard}
        onConfigChange={handleConfigChange}
      />
    </div>
  );
};

export default ExampleHR1;
