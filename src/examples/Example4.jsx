import React, { useState } from 'react';
import { PreviewModalWidget } from '../components/widgets';
import { PlaygroundContainer, SchemaEditorPanel } from '../components/playground';
import Form from '@rjsf/mui';
import validator from '@rjsf/validator-ajv8';

const Example4 = () => {
  const initialSchema = {
    title: 'Subir Documentos',
    type: 'object',
    properties: {
      imagen: {
        type: 'string',
        title: 'Imagen JPG',
        description: 'Sube una imagen (JPG, PNG)',
        format: 'data-url'
      },
      documento: {
        type: 'string',
        title: 'Documento DOC',
        description: 'Sube un documento (DOC, DOCX)',
        format: 'data-url'
      },
      pdf: {
        type: 'string',
        title: 'Archivo PDF',
        description: 'Sube un archivo PDF',
        format: 'data-url'
      }
    }
  };

  const initialUiSchema = {
    imagen: {
      'ui:widget': 'previewModal',
      'ui:options': {
        accept: 'image/*'
      }
    },
    documento: {
      'ui:widget': 'previewModal',
      'ui:options': {
        accept: '.doc,.docx'
      }
    },
    pdf: {
      'ui:widget': 'previewModal',
      'ui:options': {
        accept: '.pdf'
      }
    }
  };

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

  const customWidgets = {
    previewModal: PreviewModalWidget
  };

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

  const handleSubmit = ({ formData: submitData }) => {
    console.log('Documentos enviados:', submitData);
    alert('Documentos enviados correctamente!');
  };

  const handleChange = ({ formData: newFormData }) => {
    setFormData(newFormData);
  };

  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">Ejemplo 4: Subir Documentos</h1>
        <p className="page-description">
          Formulario simple para subir 3 tipos de documentos con preview y modal.
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
                widgets={customWidgets}
                onChange={handleChange}
                onSubmit={handleSubmit}
              />
            </div>
          )}

          {/* Form Data Output */}
          <div style={{ marginTop: '2rem' }}>
            <h3 className="panel-title">Form Data (JSON):</h3>
            <div className="json-output">
              {JSON.stringify({
                ...formData,
                imagen: formData.imagen ? formData.imagen.substring(0, 50) + '... [base64 truncado]' : undefined,
                documento: formData.documento ? formData.documento.substring(0, 50) + '... [base64 truncado]' : undefined,
                pdf: formData.pdf ? formData.pdf.substring(0, 50) + '... [base64 truncado]' : undefined
              }, null, 2)}
            </div>
          </div>
        </div>
      </PlaygroundContainer>
    </div>
  );
};

export default Example4;
