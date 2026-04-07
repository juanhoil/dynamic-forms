import React, { useState, useEffect } from 'react';
import { PlaygroundContainer, SchemaEditorPanel } from '../../components/playground';
import Form from '@rjsf/mui';
import validator from '@rjsf/validator-ajv8';

/**
 * Example 3: Código Postal Lookup
 *
 * Demonstrates:
 * - Two-stage form (CP input → Location details)
 * - Automatic API fetch when CP is valid
 * - Dynamic schema updates based on API response
 * - Populating multiple fields from a single API call
 * - Mapping settlements array to select options
 */

const API_BASE_URL = 'https://axa-portal-backend.qatiprotec.com/api/tiprotec/direccion/cp';

/**
 * Custom wrapper component to handle CP lookup
 */
const Example3 = () => {
  const [cpData, setCpData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentCp, setCurrentCp] = useState('');

  // Form state management
  const [formData, setFormData] = useState({});
  const [schemaText, setSchemaText] = useState('');
  const [uiSchemaText, setUiSchemaText] = useState('');
  const [schemaError, setSchemaError] = useState('');
  const [uiSchemaError, setUiSchemaError] = useState('');

  /**
   * Fetch location data from API based on postal code
   */
  const fetchCpData = async (cp) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE_URL}?cp=${cp}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Validate response has required data
      if (!data.state || !data.municipality) {
        throw new Error('Datos incompletos en la respuesta');
      }

      setCpData(data);
      setCurrentCp(cp);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching CP data:', err);
      setError(`Error al consultar CP: ${err.message}`);
      setCpData(null);
      setLoading(false);
    }
  };

  // Build dynamic schema based on whether we have CP data
  const buildSchema = () => {
    // Base schema with CP input
    const baseSchema = {
      title: 'Información de Domicilio',
      type: 'object',
      required: ['cp'],
      properties: {
        cp: {
          type: 'string',
          title: 'Código Postal',
          description: 'Ingresa tu código postal (5 dígitos)',
          pattern: '^[0-9]{5}$',
          minLength: 5,
          maxLength: 5
        }
      }
    };

    // If we have CP data, add the location fields
    if (cpData) {
      baseSchema.required.push('estado', 'municipio', 'asentamiento');

      baseSchema.properties.estado = {
        type: 'string',
        title: 'Estado',
        default: cpData.state,
        readOnly: true
      };

      baseSchema.properties.municipio = {
        type: 'string',
        title: 'Municipio',
        default: cpData.municipality,
        readOnly: true
      };

      baseSchema.properties.ciudad = {
        type: 'string',
        title: 'Ciudad',
        default: cpData.city || 'N/A',
        readOnly: true
      };

      // Settlements as select dropdown
      if (cpData.settlements && cpData.settlements.length > 0) {
        baseSchema.properties.asentamiento = {
          type: 'string',
          title: 'Colonia / Asentamiento',
          description: 'Selecciona tu colonia',
          //examples: cpData.settlements,
          enum: cpData.settlements,
          enumNames: cpData.settlements
        };
      } else {
        baseSchema.properties.asentamiento = {
          type: 'string',
          title: 'Colonia / Asentamiento',
          description: 'Ingresa tu colonia manualmente'
        };
      }

      // Add additional address fields
      baseSchema.properties.calle = {
        type: 'string',
        title: 'Calle',
        description: 'Nombre de la calle'
      };

      baseSchema.properties.numeroExterior = {
        type: 'string',
        title: 'Número Exterior',
        description: 'Número exterior'
      };

      baseSchema.properties.numeroInterior = {
        type: 'string',
        title: 'Número Interior (opcional)',
        description: 'Departamento, suite, etc.'
      };
    }

    return baseSchema;
  };

  const buildUiSchema = () => {
    const uiSchema = {
      cp: {
        'ui:placeholder': '12345',
        'ui:help': 'Ingresa 5 dígitos para buscar automáticamente'
      }
    };

    if (cpData) {
      uiSchema.estado = {
        'ui:readonly': true,
        'ui:disabled': true
      };

      uiSchema.municipio = {
        'ui:readonly': true,
        'ui:disabled': true
      };

      uiSchema.ciudad = {
        'ui:readonly': true,
        'ui:disabled': true
      };

      uiSchema.asentamiento = {
        'ui:placeholder': 'Selecciona una colonia'
      };

      uiSchema.calle = {
        'ui:placeholder': 'Ej: Av. Insurgentes'
      };

      uiSchema.numeroExterior = {
        'ui:placeholder': 'Ej: 123'
      };

      uiSchema.numeroInterior = {
        'ui:placeholder': 'Ej: Depto 4B'
      };
    }

    return uiSchema;
  };

  const buildInitialFormData = () => {
    const formData = {
      cp: currentCp || ''
    };

    if (cpData) {
      formData.estado = cpData.state;
      formData.municipio = cpData.municipality;
      formData.ciudad = cpData.city || 'N/A';
    }

    return formData;
  };

  // Update schemas when cpData changes
  useEffect(() => {
    const newSchema = buildSchema();
    const newUiSchema = buildUiSchema();
    const newFormData = buildInitialFormData();

    setSchemaText(JSON.stringify(newSchema, null, 2));
    setUiSchemaText(JSON.stringify(newUiSchema, null, 2));
    setFormData(newFormData);
  }, [cpData, currentCp]);

  const handleSchemaChange = (e) => {
    const value = e.target.value;
    setSchemaText(value);
    try {
      JSON.parse(value);
      setSchemaError('');
    } catch (err) {
      setSchemaError(`Error de sintaxis JSON: ${err.message}`);
    }
  };

  const handleUiSchemaChange = (e) => {
    const value = e.target.value;
    setUiSchemaText(value);
    try {
      JSON.parse(value);
      setUiSchemaError('');
    } catch (err) {
      setUiSchemaError(`Error de sintaxis JSON: ${err.message}`);
    }
  };

  /**
   * Custom form change handler to detect CP changes
   */
  const handleFormChange = ({ formData: newFormData }) => {
    setFormData(newFormData);

    // If CP changed and is valid (5 digits), fetch data
    if (newFormData.cp && newFormData.cp.length === 5 && /^\d{5}$/.test(newFormData.cp)) {
      if (newFormData.cp !== currentCp) {
        fetchCpData(newFormData.cp);
      }
    }
  };

  const handleSubmit = (formData) => {
    console.log('Form Data:', formData);

    const summary = `
      Formulario enviado:

      📍 Ubicación:
      - CP: ${formData.cp}
      - Estado: ${formData.estado || 'N/A'}
      - Municipio: ${formData.municipio || 'N/A'}
      - Ciudad: ${formData.ciudad || 'N/A'}
      - Asentamiento: ${formData.asentamiento || 'N/A'}

      🏠 Dirección:
      - Calle: ${formData.calle || 'N/A'}
      - Número Ext: ${formData.numeroExterior || 'N/A'}
      - Número Int: ${formData.numeroInterior || 'N/A'}
    `.trim();

    alert(summary);
  };

  const schema = schemaError ? buildSchema() : (() => {
    try {
      return JSON.parse(schemaText);
    } catch {
      return buildSchema();
    }
  })();

  const uiSchema = uiSchemaError ? buildUiSchema() : (() => {
    try {
      return JSON.parse(uiSchemaText);
    } catch {
      return buildUiSchema();
    }
  })();

  return (
    <>
      {loading && (
        <div className="container">
          <div className="loading">
            <h3>Consultando código postal...</h3>
            <p>Por favor espera un momento.</p>
          </div>
        </div>
      )}

      {error && (
        <div className="container">
          <div className="error">
            <h3>Error</h3>
            <p>{error}</p>
            <button
              onClick={() => {
                setError(null);
                setCpData(null);
                setCurrentCp('');
              }}
              style={{
                marginTop: '1rem',
                padding: '0.5rem 1rem',
                backgroundColor: '#1976d2',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Intentar con otro CP
            </button>
          </div>
        </div>
      )}

      <div className="container">
        <div className="page-header">
          <h1 className="page-title">Ejemplo 3: Búsqueda por Código Postal</h1>
          <p className="page-description">
            {cpData
              ? `Código postal ${currentCp} encontrado: ${cpData.state}, ${cpData.municipality}. ${cpData.settlements.length} colonias disponibles.`
              : 'Ingresa tu código postal (5 dígitos) para buscar automáticamente tu estado, municipio y colonias disponibles.'}
          </p>
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

            {!schemaError && (
              <div className="form-panel">
                <Form
                  schema={schema}
                  uiSchema={uiSchema}
                  formData={formData}
                  validator={validator}
                  onChange={handleFormChange}
                  onSubmit={({ formData }) => handleSubmit(formData)}
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
    </>
  );
};

export default Example3;
