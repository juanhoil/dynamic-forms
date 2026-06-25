import React, { useState } from 'react';
import { PreviewModalWidget } from '../../components/widgets';
import { PlaygroundContainer, SchemaEditorPanel } from '../../components/playground';
import Form from '@rjsf/mui';
import validator from '@rjsf/validator-ajv8';

const Example4 = () => {
  const initialSchema = {
    "title": "Subir Documentos",
    "type": "object",
    "required": [
      "identificacionOficial",
      "constanciaSituacionFiscal",
      "comprobanteDomicilio",
      "cartaSolicitud",
      "facturaDocumentoPropiedad",
      "autorizacionAsegurado"
    ],
    "properties": {
      "identificacionOficial": {
        "type": "string",
        "format": "data-url",
        "title": "Identificación oficial",
        "x-fileSDK": "S3"
      },

      "constanciaSituacionFiscal": {
        "type": "string",
        "format": "data-url",
        "title": "Constancia de situación fiscal",
        "x-fileSDK": "S3"
      },

      "comprobanteDomicilio": {
        "type": "string",
        "format": "data-url",
        "title": "Comprobante de domicilio",
        "x-fileSDK": "S3"
      },

      "cartaSolicitud": {
        "type": "string",
        "format": "data-url",
        "title": "Carta solicitud",
        "x-fileSDK": "S3"
      },

      "facturaDocumentoPropiedad": {
        "type": "string",
        "format": "data-url",
        "title": "Factura o documento de propiedad",
        "x-fileSDK": "S3"
      },

      "autorizacionAsegurado": {
        "type": "string",
        "format": "data-url",
        "title": "Autorización del asegurado",
        "x-fileSDK": "S3"
      }
    }
  };

  const initialUiSchema = {
    'ui:description':
      'Carga los documentos requeridos en formato PDF, JPG, PNG, DOC o DOCX.',
  
    identificacionOficial: {
      'ui:widget': 'previewModal',
      'ui:placeholder': 'Sube identificación oficial',
      'ui:help': 'INE, pasaporte o cédula profesional',
      'ui:options': {
        accept: 'image/*,.pdf,.doc,.docx',
        showPreview: true,
        showRemove: true
      }
    },
  
    constanciaSituacionFiscal: {
      'ui:widget': 'previewModal',
      'ui:placeholder': 'Sube constancia de situación fiscal',
      'ui:help': 'Documento SAT actualizado',
      'ui:options': {
        accept: 'image/*,.pdf,.doc,.docx',
        showPreview: true,
        showRemove: true
      }
    },
  
    comprobanteDomicilio: {
      'ui:widget': 'previewModal',
      'ui:placeholder': 'Sube comprobante de domicilio',
      'ui:help': 'Recibo no mayor a 3 meses',
      'ui:options': {
        accept: 'image/*,.pdf,.doc,.docx',
        showPreview: true,
        showRemove: true
      }
    },
  
    cartaSolicitud: {
      'ui:widget': 'previewModal',
      'ui:placeholder': 'Sube carta solicitud',
      'ui:help': 'Carta firmada por el asegurado',
      'ui:options': {
        accept: 'image/*,.pdf,.doc,.docx',
        showPreview: true,
        showRemove: true
      }
    },
  
    facturaDocumentoPropiedad: {
      'ui:widget': 'previewModal',
      'ui:placeholder': 'Sube factura o documento de propiedad',
      'ui:help': 'Factura, carta factura o documento legal',
      'ui:options': {
        accept: 'image/*,.pdf,.doc,.docx',
        showPreview: true,
        showRemove: true
      }
    },
  
    autorizacionAsegurado: {
      'ui:widget': 'previewModal',
      'ui:placeholder': 'Sube autorización del asegurado',
      'ui:help': 'Documento firmado de autorización',
      'ui:options': {
        accept: 'image/*,.pdf,.doc,.docx',
        showPreview: true,
        showRemove: true
      }
    },
  
    'ui:order': [
      'identificacionOficial',
      'constanciaSituacionFiscal',
      'comprobanteDomicilio',
      'cartaSolicitud',
      'facturaDocumentoPropiedad',
      'autorizacionAsegurado'
    ]
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
