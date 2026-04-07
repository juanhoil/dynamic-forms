import React, { useState } from 'react';
import HttpRequestModal from './components/HttpRequestModal';

// Lista de configuraciones predefinidas
const CONFIGURATIONS = [
  {
    id: 'default',
    name: '🌐 Default - GET Todo',
    description: 'Petición GET básica a JSONPlaceholder',
    config: {
      method: 'GET',
      url: 'https://jsonplaceholder.typicode.com/todos/1',
      body: '{\n  \n}',
      queryParams: [{ id: 1, key: '', value: '' }],
      jsonSchema: null
    }
  },
  {
    id: 'post',
    name: '📝 POST - Crear Post',
    description: 'Crear un nuevo post con body JSON',
    config: {
      method: 'POST',
      url: 'https://jsonplaceholder.typicode.com/posts',
      body: JSON.stringify({
        title: 'Mi Nuevo Post',
        body: 'Contenido del post aquí...',
        userId: 1
      }, null, 2),
      queryParams: [{ id: 1, key: '', value: '' }],
      jsonSchema: null
    }
  },
  {
    id: 'put',
    name: '✏️ PUT - Actualizar Post',
    description: 'Actualizar un post existente',
    config: {
      method: 'PUT',
      url: 'https://jsonplaceholder.typicode.com/posts/1',
      body: JSON.stringify({
        id: 1,
        title: 'Post Actualizado',
        body: 'Nuevo contenido...',
        userId: 1
      }, null, 2),
      queryParams: [{ id: 1, key: '', value: '' }],
      jsonSchema: null
    }
  },
  {
    id: 'delete',
    name: '🗑️ DELETE - Eliminar Post',
    description: 'Eliminar un post por ID',
    config: {
      method: 'DELETE',
      url: 'https://jsonplaceholder.typicode.com/posts/1',
      body: '{\n  \n}',
      queryParams: [{ id: 1, key: '', value: '' }],
      jsonSchema: null
    }
  },
  {
    id: 'users',
    name: '👥 GET - Lista de Usuarios',
    description: 'Obtener lista de usuarios con query params',
    config: {
      method: 'GET',
      url: 'https://jsonplaceholder.typicode.com/users',
      body: '{\n  \n}',
      queryParams: [
        { id: 1, key: '_limit', value: '5' }
      ],
      jsonSchema: null
    }
  },
  {
    id: 'pokeapi',
    name: '⚡ GET - Pokémon (PokeAPI)',
    description: 'Consultar información de un Pokémon',
    config: {
      method: 'GET',
      url: 'https://pokeapi.co/api/v2/pokemon/pikachu',
      body: '{\n  \n}',
      queryParams: [{ id: 1, key: '', value: '' }],
      jsonSchema: null
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
      {config.config.method} {config.config.url.substring(0, 40)}...
    </div>
  </div>
);

const ExampleHR1 = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [savedConfig, setSavedConfig] = useState(null);
  const [selectedConfigId, setSelectedConfigId] = useState('default');

  const selectedConfig = CONFIGURATIONS.find(c => c.id === selectedConfigId)?.config || CONFIGURATIONS[0].config;

  // Callback para recibir cambios en tiempo real
  const handleConfigChange = (config) => {
    console.log('Configuración actual:', config);
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
        initialConfig={selectedConfig}
        onConfigChange={handleConfigChange}
      />
    </div>
  );
};

export default ExampleHR1;
