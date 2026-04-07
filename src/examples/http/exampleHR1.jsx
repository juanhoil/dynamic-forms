import React, { useState } from 'react';
import HttpRequestModal from './components/HttpRequestModal';

const ExampleHR1 = () => {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">HTTP Requests</h1>
        <p className="page-description">
          Realiza peticiones HTTP con una interfaz tipo Postwoman/Postman
        </p>
      </div>

      <div className="panel">
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '3rem',
            gap: '1.5rem'
          }}
        >
          <div style={{ fontSize: '4rem' }}>🌐</div>

          <h2 style={{ margin: 0, color: '#333' }}>HTTP Request Client</h2>

          <p style={{ color: '#666', textAlign: 'center', maxWidth: '500px' }}>
            Una herramienta para probar APIs. Soporta GET, POST, PUT, DELETE y PATCH.
            Añade query params, headers y body JSON.
          </p>

          <button
            onClick={() => setModalOpen(true)}
            style={{
              padding: '1rem 2rem',
              backgroundColor: '#1976d2',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
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
            <span>New HTTP Request</span>
          </button>

          <div
            style={{
              marginTop: '2rem',
              padding: '1.5rem',
              backgroundColor: '#f5f5f5',
              borderRadius: '8px',
              width: '100%',
              maxWidth: '600px'
            }}
          >
            <h4 style={{ margin: '0 0 1rem 0', color: '#333' }}>Características:</h4>
            <ul style={{ margin: 0, paddingLeft: '1.5rem', color: '#666', lineHeight: 1.8 }}>
              <li>✅ Métodos HTTP: GET, POST, PUT, DELETE, PATCH</li>
              <li>✅ Query Parameters dinámicos</li>
              <li>✅ Body JSON con editor</li>
              <li>✅ Respuesta formateada con syntax highlighting</li>
              <li>✅ Tiempo de respuesta y código de estado</li>
            </ul>
          </div>
        </div>
      </div>

      <HttpRequestModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
};

export default ExampleHR1;
