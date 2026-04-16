import React from 'react';
import { Link } from 'react-router-dom';
import { navigation } from '../routes';

/**
 * SectionCard - Componente reutilizable para mostrar una sección
 */
const SectionCard = ({ title, icon, links, color }) => (
  <div className="section-card" style={{ borderTop: `4px solid ${color}` }}>
    <div className="section-card-header">
      <span className="section-card-icon" style={{ backgroundColor: color }}>
        {icon}
      </span>
      <h3 className="section-card-title">{title}</h3>
    </div>
    <ul className="section-card-links">
      {links.map((link) => (
        <li key={link.path}>
          <Link to={link.path} className="section-card-link">
            <span className="section-card-bullet" style={{ color }}>•</span>
            <span className="section-card-label">{link.label}</span>
            <span className="section-card-arrow">→</span>
          </Link>
        </li>
      ))}
    </ul>
  </div>
);

/**
 * Home page with modern dashboard-style layout
 * Displays organized sections for Forms, Chats, and HTTP Requests
 */
const Home = () => {
  const sections = [
    {
      key: 'forms',
      icon: '📝',
      color: '#1976d2',
      ...navigation.forms,
    },
    {
      key: 'chats',
      icon: '💬',
      color: '#388e3c',
      ...navigation.chats,
    },
    {
      key: 'http',
      icon: '🌐',
      color: '#7b1fa2',
      ...navigation.http,
    },
    {
      key: 'workflow',
      icon: '🔗',
      color: '#ff9800',
      ...navigation.workflow,
    },
  ];

  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">RJSF Playground</h1>
        <p className="page-description">
          Explora ejemplos interactivos de React, formularios dinámicos, chats y peticiones HTTP
        </p>
      </div>

      <div className="sections-grid">
        {sections.map((section) => (
          <SectionCard
            key={section.key}
            title={section.title}
            icon={section.icon}
            links={section.links}
            color={section.color}
          />
        ))}
      </div>

      <div className="panel" style={{ marginTop: '2rem' }}>
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

        <h3 style={{ marginTop: '1.5rem', marginBottom: '0.75rem' }}>
          Características:
        </h3>
        <div className="features-grid">
          <div className="feature-item">
            <span className="feature-icon">✅</span>
            <span>Editor en vivo de JSON Schema y UI Schema</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">✅</span>
            <span>Visualización en tiempo real del formulario</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">✅</span>
            <span>formData actualizado dinámicamente</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">✅</span>
            <span>Validaciones automáticas basadas en el schema</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">✅</span>
            <span>Ejemplos didácticos y prácticos</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">✅</span>
            <span>Chats interactivos y peticiones HTTP</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">✅</span>
            <span>Visualización de flujos con React Flow</span>
          </div>
        </div>

        <h3 style={{ marginTop: '1.5rem', marginBottom: '0.75rem' }}>
          Tecnologías usadas:
        </h3>
        <div className="tech-stack">
          <span className="tech-badge">⚛️ React 18</span>
          <span className="tech-badge">⚡ Vite</span>
          <span className="tech-badge">📋 @rjsf/core</span>
          <span className="tech-badge">🎨 @rjsf/mui</span>
          <span className="tech-badge">🔄 React Router</span>
          <span className="tech-badge">🎯 Material-UI</span>
          <span className="tech-badge">🔗 React Flow</span>
        </div>
      </div>
    </div>
  );
};

export default Home;
