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
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Cambio de Asegurado",
  "type": "object",
  "required": [
    "tipoPersona",
    "datosGenerales",
    "domicilio",
    "contacto",
    "motivoCambio"
  ],
  "properties": {
    "tipoPersona": {
      "type": "string",
      "title": "Tipo de Persona",
      "enum": [
        "FISICA",
        "MORAL"
      ],
      "enumNames": [
        "Persona Física",
        "Persona Moral"
      ]
    },

    "datosGenerales": {
      "type": "object",
      "oneOf": [
        {
          "title": "Persona Física",
          "required": [
            "nombre",
            "apellidoPaterno",
            "rfc",
            "curp",
            "fechaNacimiento",
            "genero",
            "estadoCivil",
            "ocupacion"
          ],
          "properties": {
            "nombre": {
              "type": "string",
              "minLength": 2,
              "maxLength": 100
            },
            "apellidoPaterno": {
              "type": "string",
              "minLength": 2,
              "maxLength": 60
            },
            "apellidoMaterno": {
              "type": "string",
              "maxLength": 60
            },
            "rfc": {
              "type": "string",
              "pattern": "^[A-ZÑ&]{4}\\d{6}[A-Z0-9]{3}$"
            },
            "curp": {
              "type": "string",
              "pattern": "^[A-Z]{4}\\d{6}[HM][A-Z]{5}[A-Z0-9]{2}$"
            },
            "fechaNacimiento": {
              "type": "string",
              "format": "date"
            },
            "genero": {
              "type": "string",
              "enum": [
                "M",
                "F",
                "X"
              ],
              "enumNames": [
                "Masculino",
                "Femenino",
                "No especificado"
              ]
            },
            "estadoCivil": {
              "type": "string",
              "enum": [
                "SOLTERO",
                "CASADO",
                "DIVORCIADO",
                "VIUDO",
                "UNION_LIBRE"
              ],
              "enumNames": [
                "Soltero(a)",
                "Casado(a)",
                "Divorciado(a)",
                "Viudo(a)",
                "Unión Libre"
              ]
            },
            "ocupacion": {
              "type": "string",
              "enum": [
                "EMPLEADO",
                "INDEPENDIENTE",
                "EMPRESARIO",
                "HOGAR",
                "ESTUDIANTE",
                "JUBILADO",
                "DESEMPLEADO",
                "OTRO"
              ],
              "enumNames": [
                "Empleado",
                "Independiente",
                "Empresario",
                "Hogar",
                "Estudiante",
                "Jubilado",
                "Desempleado",
                "Otro"
              ]
            }
          }
        },

        {
          "title": "Persona Moral",
          "required": [
            "razonSocial",
            "rfc",
            "giroEmpresarial",
            "representanteLegal"
          ],
          "properties": {
            "razonSocial": {
              "type": "string",
              "minLength": 3,
              "maxLength": 150
            },
            "rfc": {
              "type": "string",
              "pattern": "^[A-ZÑ&]{3}\\d{6}[A-Z0-9]{3}$"
            },
            "giroEmpresarial": {
              "type": "string",
              "enum": [
                "COMERCIO",
                "SERVICIOS",
                "MANUFACTURA",
                "TRANSPORTE",
                "CONSTRUCCION",
                "TECNOLOGIA",
                "SALUD",
                "FINANCIERO",
                "OTRO"
              ],
              "enumNames": [
                "Comercio",
                "Servicios",
                "Manufactura",
                "Transporte",
                "Construcción",
                "Tecnología",
                "Salud",
                "Financiero",
                "Otro"
              ]
            },
            "representanteLegal": {
              "type": "string",
              "minLength": 5,
              "maxLength": 120
            }
          }
        }
      ]
    },

    "domicilio": {
      "type": "object",
      "required": [
        "calle",
        "numeroExterior",
        "colonia",
        "codigoPostal",
        "ciudad",
        "estado",
        "pais"
      ],
      "properties": {
        "calle": {
          "type": "string",
          "maxLength": 120
        },
        "numeroExterior": {
          "type": "string",
          "maxLength": 20
        },
        "numeroInterior": {
          "type": "string",
          "maxLength": 20
        },
        "colonia": {
          "type": "string",
          "maxLength": 80
        },
        "codigoPostal": {
          "type": "string",
          "pattern": "^\\d{5}$"
        },
        "ciudad": {
          "type": "string",
          "maxLength": 80
        },
        "estado": {
          "type": "string",
          "maxLength": 80
        },
        "pais": {
          "type": "string",
          "maxLength": 80,
          "default": "México"
        }
      }
    },

    "contacto": {
      "type": "object",
      "required": [
        "telefonoCelular",
        "correoElectronico"
      ],
      "properties": {
        "telefonoCelular": {
          "type": "string",
          "pattern": "^\\d{10}$"
        },
        "telefonoAlterno": {
          "type": "string",
          "pattern": "^\\d{10}$"
        },
        "correoElectronico": {
          "type": "string",
          "format": "email"
        }
      }
    },

    "motivoCambio": {
      "type": "object",
      "required": [
        "tipoMotivo"
      ],
      "properties": {
        "tipoMotivo": {
          "type": "string",
          "enum": [
            "COMPRA_VENTA",
            "CESION_DERECHOS",
            "CORRECCION_CAPTURA",
            "CAMBIO_EMPRESARIAL",
            "OTRO"
          ],
          "enumNames": [
            "Compra/venta del vehículo",
            "Cesión de derechos",
            "Corrección de captura",
            "Cambio empresarial",
            "Otro"
          ]
        },
        "descripcionAdicional": {
          "type": "string",
          "maxLength": 500
        }
      }
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
