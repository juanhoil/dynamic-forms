import React from 'react';

/**
 * SchemaEditorPanel - Panel izquierdo con editores de JSON Schema y UI Schema
 *
 * Componente controlado que maneja la edición de schemas con validación JSON.
 *
 * @param {string} schemaText - Texto del JSON Schema
 * @param {string} uiSchemaText - Texto del UI Schema
 * @param {string} schemaError - Error de validación del JSON Schema
 * @param {string} uiSchemaError - Error de validación del UI Schema
 * @param {Function} onSchemaChange - Handler para cambios en JSON Schema
 * @param {Function} onUiSchemaChange - Handler para cambios en UI Schema
 * @param {string} [title='Configuración de Schemas'] - Título del panel
 * @param {string} [schemaLabel='JSON Schema:'] - Label del editor de JSON Schema
 * @param {string} [uiSchemaLabel='UI Schema:'] - Label del editor de UI Schema
 * @param {string} [minHeight='300px'] - Altura mínima de los editores
 * @param {boolean} [readOnly=false] - Hace los editores de solo lectura
 */
export const SchemaEditorPanel = ({
  schemaText,
  uiSchemaText,
  schemaError,
  uiSchemaError,
  onSchemaChange,
  onUiSchemaChange,
  title = 'Configuración de Schemas',
  schemaLabel = 'JSON Schema:',
  uiSchemaLabel = 'UI Schema:',
  minHeight = '300px',
  readOnly = false
}) => {
  return (
    <div className="panel">
      <h2 className="panel-title">{title}</h2>

      <div className="editor-container">
        {/* JSON Schema Editor */}
        <div className="editor-group">
          <label className="editor-label">{schemaLabel}</label>
          
          <textarea
            className="json-editor"
            value={schemaText}
            onChange={onSchemaChange}
            spellCheck="false"
            readOnly={readOnly}
            style={{ minHeight }}
          />
          {schemaError && (
            <div className="error-message">{schemaError}</div>
          )}
        </div>

        {/* UI Schema Editor */}
        <div className="editor-group">
          <label className="editor-label">{uiSchemaLabel}</label>
          <textarea
            className="json-editor"
            value={uiSchemaText}
            onChange={onUiSchemaChange}
            spellCheck="false"
            readOnly={readOnly}
            style={{ minHeight }}
          />
          {uiSchemaError && (
            <div className="error-message">{uiSchemaError}</div>
          )}
        </div>
      </div>
    </div>
  );
};
