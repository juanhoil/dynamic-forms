import React, { useState, useEffect } from 'react';
import Form from '@rjsf/mui';
import validator from '@rjsf/validator-ajv8';
import { SchemaVisualEditor, SchemaInferencer, JsonSchemaEditor } from 'jsonjoy-builder';
import 'jsonjoy-builder/styles.css';
import Modal from './componetsE6/Modal';
import SchemaTitle from './componetsE6/SchemaTitle';
import UiSchemaEditor from './componetsE6/UiSchemaEditor';
import { configForm, inputValues } from './example6Schema';

const TrashIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);

const CodeIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </svg>
);

const RemoveButton = (props) => (
  <button
    type="button"
    onClick={props.onClick}
    onMouseEnter={(e) => {
      e.currentTarget.style.color = '#d32f2f';
      e.currentTarget.style.backgroundColor = '#ffebee';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.color = '#999';
      e.currentTarget.style.backgroundColor = 'transparent';
    }}
    title="Eliminar"
  >
    <TrashIcon />
  </button>
);

const Example6 = () => {
  const [editorOpen, setEditorOpen] = useState(false);
  const [formData, setFormData] = useState({});
  const [schema, setSchemaRaw] = useState(configForm.schema);
  const [inferDialogOpen, setInferDialogOpen] = useState(false);

  const setSchema = (newSchema) => {
    setFormData({});
    if (newSchema && newSchema.type === 'object' && newSchema.additionalProperties === undefined) {
      setSchemaRaw({ ...newSchema, additionalProperties: false });
    } else {
      setSchemaRaw(newSchema);
    }
  };
  const setInitialFormDataValues = () => {
    if (configForm.inputValues) {
      setFormData(configForm.inputValues);
    }
  };

  useEffect(() => {
    //setInitialFormDataValues();
  }, []);

  const [advancedModalOpen, setAdvancedModalOpen] = useState(false);
  const [uiSchemaEditorOpen, setUiSchemaEditorOpen] = useState(false);
  const [currentUiSchema, setCurrentUiSchema] = useState(configForm.uiSchema);

  const handleFormChange = ({ formData: newFormData }) => {
    setFormData(newFormData);
  };
  const handleSubmit = ({ formData: submitData }) => {
    console.log('Form submitted:', submitData);
  };
  const handleInferSchema = () => {
    setInferDialogOpen(true);
  };
  const handleAdvancedClick = () => {
    setAdvancedModalOpen(true);
  };
  const handleSaveConfig = () => {
    const config = {
      ...configForm,
      schema,
      uiSchema: currentUiSchema,
    };
    console.log('Configuración guardada:', config);
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'configForm.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">Ejemplo 6: Layout de 3 Columnas</h1>
        <p className="page-description">
          Layout base con 3 columnas en blanco listas para personalizar.
        </p>
        <button
          onClick={handleSaveConfig}
          style={{
            background: '#2e7d32',
            color: 'white',
            border: 'none',
            fontSize: '0.9rem',
            cursor: 'pointer',
            padding: '0.5rem 1.2rem',
            borderRadius: '6px',
            lineHeight: 1,
            transition: 'background-color 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            marginTop: '0.75rem',
            marginLeft: 'auto',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#1b5e20'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#2e7d32'; }}
        >
          💾 Guardar configuración
        </button>
      </div>

      <div
        className="playground-container"
        style={{
          gridTemplateColumns: editorOpen ? '1fr 1fr 1fr' : '1fr',
        }}
      >
        {/* Panel del Editor (visible solo cuando está abierto) */}
        {editorOpen && (
          <div className="panel" style={{ gridColumn: 'span 2' }}>
            <div style={{ marginBottom: '1rem' }}>
              {/* Título y botón cerrar */}
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', marginBottom: '0.75rem' }}>
                <h2 className="panel-title" style={{ marginBottom: 0, textAlign: 'center' }}>
                  Editor de Formulario
                </h2>
                <button
                  onClick={() => setEditorOpen(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '1.5rem',
                    cursor: 'pointer',
                    color: '#666',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    lineHeight: 1,
                    transition: 'background-color 0.2s, color 0.2s',
                    position: 'absolute',
                    right: 0,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#ffebee';
                    e.currentTarget.style.color = '#d32f2f';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#666';
                  }}
                  title="Cerrar editor"
                >
                  ✕
                </button>
              </div>

              {/* Botones de acción */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                <button
                    onClick={() => setUiSchemaEditorOpen(true)}
                    style={{
                      background: 'none',
                      border: '1px solid #ddd',
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      color: '#666',
                      padding: '0.4rem 0.7rem',
                      borderRadius: '6px',
                      lineHeight: 1,
                      transition: 'background-color 0.2s, color 0.2s, border-color 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f3e8ff';
                      e.currentTarget.style.color = '#7c3aed';
                      e.currentTarget.style.borderColor = '#7c3aed';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = '#666';
                      e.currentTarget.style.borderColor = '#ddd';
                    }}
                    title="UI Schema Editor"
                  >
                    <CodeIcon />
                  <span style={{ fontSize: '0.85rem' }}>
                    Editar UI Formulario
                  </span>
                </button>
                <button
                  onClick={handleInferSchema}
                  style={{
                    background: 'none',
                    border: '1px solid #ddd',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    color: '#666',
                    padding: '0.4rem 0.7rem',
                    borderRadius: '6px',
                    lineHeight: 1,
                    transition: 'background-color 0.2s, color 0.2s, border-color 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f3e8ff';
                    e.currentTarget.style.color = '#7c3aed';
                    e.currentTarget.style.borderColor = '#7c3aed';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#666';
                    e.currentTarget.style.borderColor = '#ddd';
                  }}
                  title="Inferir schema desde JSON"
                >
                  <CodeIcon />
                  <span style={{ fontSize: '0.85rem' }}>Inferir desde JSON</span>
                </button>
                <button
                  onClick={handleAdvancedClick}
                  style={{
                    background: 'none',
                    border: '1px solid #ddd',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    color: '#666',
                    padding: '0.4rem 0.7rem',
                    borderRadius: '6px',
                    lineHeight: 1,
                    transition: 'background-color 0.2s, color 0.2s, border-color 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#fff3e0';
                    e.currentTarget.style.color = '#e65100';
                    e.currentTarget.style.borderColor = '#e65100';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#666';
                    e.currentTarget.style.borderColor = '#ddd';
                  }}
                  title="Editor JSON avanzado"
                >
                  ⚙ <span style={{ fontSize: '0.85rem' }}>Avanzado</span>
                </button>
              </div>
            </div>
            <div className="jsonjoy" style={{ width: '100%', minHeight: '400px' }}>
              <SchemaTitle
                value={schema.title}
                onChange={(title) => setSchema({ ...schema, title })}
              />
              <SchemaVisualEditor
                schema={schema}
                onChange={setSchema}
                readOnly={false}
              />
            </div>
          </div>
        )}

        {/* Columna Preview */}
        <div className="panel">
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', marginBottom: '1rem' }}>
            {!editorOpen && (
              <button
                onClick={() => setEditorOpen(true)}
                style={{
                  background: 'none',
                  border: '1px solid #ddd',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  color: '#666',
                  padding: '0.4rem 0.6rem',
                  borderRadius: '6px',
                  lineHeight: 1,
                  transition: 'background-color 0.2s, color 0.2s, border-color 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  position: 'absolute',
                  right: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#e3f2fd';
                  e.currentTarget.style.color = '#1976d2';
                  e.currentTarget.style.borderColor = '#1976d2';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#666';
                  e.currentTarget.style.borderColor = '#ddd';
                }}
                title="Abrir editor"
              >
                ✎ <span style={{ fontSize: '0.85rem' }}>Editar</span>
              </button>
            )}
          </div>

          <div style={{ width: configForm.styles.width, maxWidth: configForm.styles.maxWidth, margin: '0 auto' }}>
            <style>{`#root__title { text-align: center; }`}</style>
            <Form
              schema={schema}
              uiSchema={currentUiSchema}
              formData={formData}
              validator={validator}
              onChange={handleFormChange}
              onSubmit={handleSubmit}
              templates={{ ButtonTemplates: { RemoveButton } }}
            />
          </div>

          <div style={{ marginTop: '2rem' }}>
            <h3 className="panel-title">Form Data (JSON):</h3>
            <div className="json-output">
              {JSON.stringify(formData, null, 2)}
            </div>
          </div>
        </div>
      </div>

      {/* Schema Inferencer Dialog */}
      <SchemaInferencer
        open={inferDialogOpen}
        onOpenChange={setInferDialogOpen}
        onSchemaInferred={setSchema}
      />

      {/* Advanced JSON Schema Editor Modal */}
      <Modal open={advancedModalOpen} onClose={() => setAdvancedModalOpen(false)}>
        <div style={{ minHeight: '500px' }}>
          <SchemaTitle
            value={schema.title}
            onChange={(title) => setSchema({ ...schema, title })}
          />
          <JsonSchemaEditor
            schema={schema}
            readOnly={false}
            setSchema={setSchema}
          />
        </div>
      </Modal>
      {/* UI Schema Editor Modal */}
      <Modal open={uiSchemaEditorOpen} onClose={() => setUiSchemaEditorOpen(false)}>
        <div style={{ minHeight: '500px' }}>
          <UiSchemaEditor
            uiSchema={currentUiSchema}
            onChange={setCurrentUiSchema}
          />
        </div>
      </Modal>  
    </div>
  );
};

export default Example6;
