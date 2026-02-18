import React, { useState } from 'react';
import Form from '@rjsf/mui';
import validator from '@rjsf/validator-ajv8';
import { PlaygroundContainer, SchemaEditorPanel } from '../components/playground';

/**
 * FormPlayground - Reusable layout for RJSF examples
 *
 * Features:
 * - Editable JSON Schema and UI Schema panels
 * - Real-time form rendering
 * - Live formData display
 * - Error handling for invalid JSON
 *
 * @param {Object} props
 * @param {string} props.title - Page title
 * @param {string} props.description - Page description
 * @param {Object} props.initialSchema - Initial JSON Schema
 * @param {Object} props.initialUiSchema - Initial UI Schema
 * @param {Object} props.initialFormData - Initial form data
 * @param {Function} props.onSubmit - Optional submit handler
 */
const FormPlayground = ({
  title,
  description,
  initialSchema,
  initialUiSchema = {},
  initialFormData = {},
  onSubmit
}) => {
  // State for schema, uiSchema, and formData
  const [schema, setSchema] = useState(initialSchema);
  const [uiSchema, setUiSchema] = useState(initialUiSchema);
  const [formData, setFormData] = useState(initialFormData);

  // State for JSON editor text values
  const [schemaText, setSchemaText] = useState(
    JSON.stringify(initialSchema, null, 2)
  );
  const [uiSchemaText, setUiSchemaText] = useState(
    JSON.stringify(initialUiSchema, null, 2)
  );

  // Error states
  const [schemaError, setSchemaError] = useState('');
  const [uiSchemaError, setUiSchemaError] = useState('');

  /**
   * Handle schema text changes
   * Validates and updates schema state
   */
  const handleSchemaChange = (e) => {
    const value = e.target.value;
    setSchemaText(value);

    try {
      const parsed = JSON.parse(value);
      setSchema(parsed);
      setSchemaError('');
    } catch (err) {
      setSchemaError(`Error de sintaxis JSON: ${err.message}`);
    }
  };

  /**
   * Handle UI schema text changes
   * Validates and updates uiSchema state
   */
  const handleUiSchemaChange = (e) => {
    const value = e.target.value;
    setUiSchemaText(value);

    try {
      const parsed = JSON.parse(value);
      setUiSchema(parsed);
      setUiSchemaError('');
    } catch (err) {
      setUiSchemaError(`Error de sintaxis JSON: ${err.message}`);
    }
  };

  /**
   * Handle form data changes
   * Updates formData state in real-time
   */
  const handleFormChange = ({ formData }) => {
    setFormData(formData);
  };

  /**
   * Handle form submission
   */
  const handleSubmit = ({ formData }) => {
    console.log('Form submitted:', formData);
    if (onSubmit) {
      onSubmit(formData);
    }
  };

  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">{title}</h1>
        <p className="page-description">{description}</p>
      </div>

      <PlaygroundContainer>
        {/* Left Panel: Schema Editors */}
        <SchemaEditorPanel
          schemaText={schemaText}
          uiSchemaText={uiSchemaText}
          schemaError={schemaError}
          uiSchemaError={uiSchemaError}
          onSchemaChange={handleSchemaChange}
          onUiSchemaChange={handleUiSchemaChange}
        />

        {/* Right Panel: Form and Output */}
        <div className="panel">
          <h2 className="panel-title">Formulario y Datos</h2>

          {/* Rendered Form */}
          {!schemaError && (
            <div className="form-panel">
              <Form
                schema={schema}
                uiSchema={uiSchema}
                formData={formData}
                validator={validator}
                onChange={handleFormChange}
                onSubmit={handleSubmit}
              />
            </div>
          )}

          {/* Form Data Output */}
          <div style={{ marginTop: '2rem' }}>
            <h3 className="panel-title">Form Data (JSON):</h3>
            <div className="json-output">
              {JSON.stringify(formData, null, 2)}
            </div>
          </div>
        </div>
      </PlaygroundContainer>
    </div>
  );
};

export default FormPlayground;
