import React, { useState } from 'react';
import { PlaygroundContainer, SchemaEditorPanel } from '../../components/playground';
import Form from '@rjsf/mui';
import validator from '@rjsf/validator-ajv8';

/**
 * Example 5: Document Upload with Visual Icons
 *
 * Demonstrates:
 * - File upload with visual document type icons
 * - Custom field templates with icons
 * - INE (Mexican ID) upload
 * - Proof of address (Comprobante de domicilio) upload
 * - Visual feedback with icons and colors
 */

const Example5 = () => {
  // Schema definition
  const initialSchema = {
    title: 'Documentos de Identificación',
    description: 'Sube tus documentos oficiales',
    type: 'object',
    required: ['edad', 'nombreCompleto', 'ine', 'comprobanteDomicilio'],
    properties: {
      edad: {
        type: 'number',
        title: 'Edad',
        description: 'Ingresa tu edad',
        minimum: 18,
        maximum: 80
      },

      nombreCompleto: {
        type: 'string',
        title: 'Nombre Completo',
        description: 'Tal como aparece en tu identificación',
        minLength: 3
      },

      curp: {
        type: 'string',
        title: 'CURP',
        description: 'Clave Única de Registro de Población (18 caracteres)',
        pattern: '^[A-Z]{4}[0-9]{6}[HM][A-Z]{5}[0-9A-Z][0-9]$',
        minLength: 18,
        maxLength: 18
      },

      ine: {
        type: 'string',
        title: 'INE / IFE',
        description: 'Identificación oficial vigente (ambos lados)',
        format: 'data-url'
      },

      comprobanteDomicilio: {
        type: 'string',
        title: 'Comprobante de Domicilio',
        description: 'No mayor a 3 meses (luz, agua, teléfono, gas)',
        format: 'data-url'
      },

      telefono: {
        type: 'string',
        title: 'Teléfono de Contacto',
        description: '10 dígitos',
        pattern: '^[0-9]{10}$'
      }
    }
  };

  const initialUiSchema = {
    nombreCompleto: {
      'ui:placeholder': 'Ej: Juan Pérez García'
    },
    curp: {
      'ui:placeholder': 'PEGJ850101HDFRRS09',
      'ui:help': 'Escribe en MAYÚSCULAS'
    },
    ine: {
      'ui:options': {
        accept: 'image/*,.pdf'
      }
    },
    comprobanteDomicilio: {
      'ui:options': {
        accept: 'image/*,.pdf'
      }
    },
    telefono: {
      'ui:placeholder': '5512345678'
    }
  };

  // State management
  const [schema, setSchema] = useState(initialSchema);
  const [uiSchema, setUiSchema] = useState(initialUiSchema);
  const [formData, setFormData] = useState({});
  const [schemaText, setSchemaText] = useState(
    JSON.stringify(initialSchema, null, 2)
  );
  const [uiSchemaText, setUiSchemaText] = useState(
    JSON.stringify(initialUiSchema, null, 2)
  );
  const [schemaError, setSchemaError] = useState('');
  const [uiSchemaError, setUiSchemaError] = useState('');

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

  const handleFormChange = ({ formData: newFormData }) => {
    setFormData(newFormData);
  };

  const handleSubmit = ({ formData: submitData }) => {
    console.log('Form submitted:', submitData);

    const ineInfo = extractFileInfo(submitData.ine);
    const comprobanteInfo = extractFileInfo(submitData.comprobanteDomicilio);

    alert(`
      Documentos enviados correctamente:

      👤 ${submitData.nombreCompleto}
      📋 CURP: ${submitData.curp || 'No proporcionado'}
      📞 ${submitData.telefono || 'No proporcionado'}

      📄 Documentos:
      ${submitData.ine ? `✅ INE: ${ineInfo?.sizeFormatted}` : '❌ INE: No subido'}
      ${submitData.comprobanteDomicilio ? `✅ Comprobante: ${comprobanteInfo?.sizeFormatted}` : '❌ Comprobante: No subido'}
    `.trim());
  };

  const extractFileInfo = (dataUrl) => {
    if (!dataUrl) return null;
    try {
      const base64Data = dataUrl.split(',')[1];
      const sizeInBytes = Math.ceil((base64Data.length * 3) / 4);
      const sizeInMB = (sizeInBytes / (1024 * 1024)).toFixed(2);
      const sizeInKB = (sizeInBytes / 1024).toFixed(2);
      return {
        size: sizeInBytes,
        sizeFormatted: sizeInBytes > 1024 * 1024 ? `${sizeInMB} MB` : `${sizeInKB} KB`
      };
    } catch {
      return null;
    }
  };

  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">Ejemplo 5: Documentos con Íconos</h1>
        <p className="page-description">
          Sube tus documentos oficiales (INE y comprobante de domicilio) con íconos visuales que te ayudan a identificar qué tipo de documento se requiere.
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
          <h2 className="panel-title">Formulario</h2>

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
            <div className="json-output" style={{ maxHeight: '200px' }}>
              {JSON.stringify({
                ...formData,
                ine: formData.ine ? '[archivo base64 truncado]' : undefined,
                comprobanteDomicilio: formData.comprobanteDomicilio ? '[archivo base64 truncado]' : undefined
              }, null, 2)}
            </div>
          </div>
        </div>
      </PlaygroundContainer>
    </div>
  );
};

/**
 * Document Preview Component
 */
const DocumentPreview = ({ dataUrl }) => {
  if (!dataUrl) return null;

  const isImage = dataUrl.startsWith('data:image/');
  const isPdf = dataUrl.includes('application/pdf');

  return (
    <div style={{
      border: '2px solid #e0e0e0',
      borderRadius: '8px',
      overflow: 'hidden',
      backgroundColor: '#fff'
    }}>
      {isImage && (
        <img
          src={dataUrl}
          alt="Preview"
          style={{
            width: '100%',
            maxHeight: '300px',
            objectFit: 'contain',
            backgroundColor: '#f5f5f5'
          }}
        />
      )}

      {isPdf && (
        <iframe
          src={dataUrl}
          style={{
            width: '100%',
            height: '400px',
            border: 'none'
          }}
          title="PDF Preview"
        />
      )}

      {!isImage && !isPdf && (
        <div style={{
          padding: '2rem',
          textAlign: 'center',
          backgroundColor: '#f5f5f5'
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📄</div>
          <div style={{ color: '#666' }}>Preview no disponible</div>
        </div>
      )}
    </div>
  );
};

export default Example5;
