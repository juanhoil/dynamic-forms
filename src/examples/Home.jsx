import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Home page with introduction and navigation to examples
 */
const Home = () => {
  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">Bienvenido a RJSF Playground</h1>
        <p className="page-description">
          Proyecto educativo para explorar react-jsonschema-form
        </p>
      </div>

      <div className="panel">
        <h2 className="panel-title">Acerca de este proyecto</h2>
        <p style={{ marginBottom: '1rem', lineHeight: '1.6' }}>
          Este proyecto demuestra el uso de{' '}
          <a
            href="https://rjsf-team.github.io/react-jsonschema-form/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#1976d2', textDecoration: 'none' }}
          >
            react-jsonschema-form (RJSF)
          </a>
          , una librería que permite generar formularios React automáticamente
          a partir de JSON Schema.
        </p>

        <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>
          Características:
        </h3>
        <ul style={{ marginLeft: '1.5rem', lineHeight: '2' }}>
          <li>✅ Editor en vivo de JSON Schema y UI Schema</li>
          <li>✅ Visualización en tiempo real del formulario</li>
          <li>✅ Muestra formData actualizado dinámicamente</li>
          <li>✅ Validaciones automáticas basadas en el schema</li>
          <li>✅ Ejemplos didácticos y prácticos</li>
        </ul>

        <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Ejemplos:</h3>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <Link
            to="/example1"
            style={{
              display: 'block',
              padding: '1rem',
              backgroundColor: '#1976d2',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '4px',
              fontWeight: '600',
              transition: 'background-color 0.2s'
            }}
          >
            Ejemplo 1: Todos los Tipos
          </Link>

          <Link
            to="/example2"
            style={{
              display: 'block',
              padding: '1rem',
              backgroundColor: '#1976d2',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '4px',
              fontWeight: '600',
              transition: 'background-color 0.2s'
            }}
          >
            Ejemplo 2: API Catálogo
          </Link>

          <Link
            to="/example3"
            style={{
              display: 'block',
              padding: '1rem',
              backgroundColor: '#1976d2',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '4px',
              fontWeight: '600',
              transition: 'background-color 0.2s'
            }}
          >
            Ejemplo 3: Código Postal
          </Link>

          <Link
            to="/example4"
            style={{
              display: 'block',
              padding: '1rem',
              backgroundColor: '#1976d2',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '4px',
              fontWeight: '600',
              transition: 'background-color 0.2s'
            }}
          >
            Ejemplo 4: Subir Archivos
          </Link>

          <Link
            to="/example5"
            style={{
              display: 'block',
              padding: '1rem',
              backgroundColor: '#1976d2',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '4px',
              fontWeight: '600',
              transition: 'background-color 0.2s'
            }}
          >
            Ejemplo 5: Documentos ID
          </Link>
        </div>

        <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>
          Tecnologías usadas:
        </h3>
        <ul style={{ marginLeft: '1.5rem', lineHeight: '2' }}>
          <li>⚛️ React 18</li>
          <li>⚡ Vite</li>
          <li>📋 @rjsf/core + @rjsf/mui</li>
          <li>🎨 Material-UI theme</li>
          <li>🔄 React Router</li>
        </ul>
      </div>
    </div>
  );
};

export default Home;
