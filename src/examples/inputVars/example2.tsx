import React, { useMemo, useState } from 'react';
import InputVars from './components/InputVars';
import Rendered from './components/Rendered';
import {
  generateVariablesByJsonSchema,
  type JsonSchemaNode,
} from './utils/GenVarsByJsonschemas';
import type { InputVarTypeFilter } from './interface.inputVars';

const schema: JsonSchemaNode = {
  "title": "Generated Schema",
  "description": "Generated from JSON data",
  "group": "Tema",
  "type": "object",
  "properties": {
    "data": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": {
            "type": "integer"
          },
          "cliente_id": {
            "type": "integer"
          },
          "tema_padre_id": {
            "oneOf": [
              {
                "type": "null"
              },
              {
                "type": "integer"
              }
            ]
          },
          "posicion": {
            "type": "integer"
          },
          "nombre": {
            "type": "string"
          },
          "activo": {
            "type": "boolean"
          },
          "ruta": {
            "oneOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ]
          },
          "consecutivo": {
            "type": "string"
          }
        },
        "required": [
          "activo",
          "cliente_id",
          "consecutivo",
          "id",
          "nombre",
          "posicion",
          "ruta",
          "tema_padre_id"
        ]
      },
      "minItems": 0
    },
    "total": {
      "type": "integer"
    },
    "page": {
      "type": "integer"
    },
    "limit": {
      "type": "integer"
    }
  },
  "required": [
    "data",
    "limit",
    "page",
    "total"
  ]
};
const variables: JsonSchemaNode = {
  type: 'object',
  properties: {
    descripcion: {
      type: 'string',
    },
    selectcion: {
      type: 'array',
      enum:[],
      enumNames:[]
    },
  }
}
const ejemploArray: JsonSchemaNode = {
  "type": "array",
  "items": {
    "type": "string"
  }
}
const valuesEjemploArray = [
  "123e4567-e89b-12d3-a456-426614174000",
  "123e4567-e89b-12d3-a456-426614174001",
  "123e4567-e89b-12d3-a456-426614174002",
  "123e4567-e89b-12d3-a456-426614174003",
]
const ejemploArrayJson: JsonSchemaNode = {
  "title": "Generated Schema",
  "description": "Generated from JSON data",
  "type": "array",
  "items": {
    "type": "object",
    "properties": {
      "id": {
        "type": "integer"
      },
      "guid": {
        "type": "string",
        "format": "uuid"
      },
      "nombre": {
        "type": "string"
      }
    },
    "required": [
      "guid",
      "id",
      "nombre"
    ]
  },
  "minItems": 0
}
const valuesEjemploArrayJson = [
  {
    id: 1,
    guid: "123e4567-e89b-12d3-a456-426614174000",
    nombre: "Endoso Tipo A - Amparar Coberturas Adicionales",
  },
  {
    id: 2,
    guid: "123e4567-e89b-12d3-a456-426614174001",
    nombre: "Amparar Cobertura",
  },
  {
    id: 3,
    guid: "123e4567-e89b-12d3-a456-426614174002",
    nombre: "Modificar cobertura",
  },
  {
    id: 4,
    guid: "123e4567-e89b-12d3-a456-426614174003",
    nombre: "Eliminar Cobertura",
  },
];

const values = {
  "data": [
  {
  "id": 1,
  "cliente_id": 1,
  "tema_padre_id": null,
  "posicion": 1,
  "nombre": "Endoso Tipo A - Amparar Coberturas Adicionales",
  "activo": true,
  "ruta": "/soporte",
  "consecutivo": "1"
  },
  {
  "id": 2,
  "cliente_id": 1,
  "tema_padre_id": 1,
  "posicion": 1,
  "nombre": "Amparar Cobertura",
  "activo": true,
  "ruta": null,
  "consecutivo": "1.1"
  },
  {
  "id": 3,
  "cliente_id": 1,
  "tema_padre_id": 1,
  "posicion": 2,
  "nombre": "Modificar cobertura",
  "activo": true,
  "ruta": null,
  "consecutivo": "1.2"
  },
  {
  "id": 4,
  "cliente_id": 1,
  "tema_padre_id": 1,
  "posicion": 3,
  "nombre": "Eliminar Cobertura",
  "activo": true,
  "ruta": null,
  "consecutivo": "1.3"
  },
  {
  "id": 17,
  "cliente_id": 1,
  "tema_padre_id": 1,
  "posicion": 4,
  "nombre": "Leer cobertura",
  "activo": true,
  "ruta": null,
  "consecutivo": "1.4"
  },
  {
  "id": 5,
  "cliente_id": 1,
  "tema_padre_id": null,
  "posicion": 2,
  "nombre": "Endoso Tipo B - Modificación de Datos",
  "activo": true,
  "ruta": null,
  "consecutivo": "2"
  },
  {
  "id": 6,
  "cliente_id": 1,
  "tema_padre_id": 5,
  "posicion": 1,
  "nombre": "Cambio de Asegurado",
  "activo": true,
  "ruta": null,
  "consecutivo": "2.1"
  },
  {
  "id": 7,
  "cliente_id": 1,
  "tema_padre_id": 5,
  "posicion": 2,
  "nombre": "Cambio de Domicilio",
  "activo": true,
  "ruta": null,
  "consecutivo": "2.2"
  },
  {
  "id": 19,
  "cliente_id": 1,
  "tema_padre_id": 5,
  "posicion": 3,
  "nombre": "Cambio dummy",
  "activo": true,
  "ruta": "",
  "consecutivo": "2.3"
  },
  {
  "id": 21,
  "cliente_id": 1,
  "tema_padre_id": 19,
  "posicion": 1,
  "nombre": "Dummy",
  "activo": true,
  "ruta": "",
  "consecutivo": "2.3.1"
  },
  {
  "id": 20,
  "cliente_id": 1,
  "tema_padre_id": 5,
  "posicion": 4,
  "nombre": "Prueba QA",
  "activo": true,
  "ruta": "",
  "consecutivo": "2.4"
  }
  ],
  "total": 11,
  "page": 1,
  "limit": 100
  };

interface ExampleSectionProps {
  step: string;
  title: string;
  description: string;
  children: React.ReactNode;
}

const sectionStyle: React.CSSProperties = {
  display: 'grid',
  gap: 10,
  border: '1px solid #e5e7eb',
  borderRadius: 14,
  padding: 16,
  background: '#fff',
};

const codeBlockStyle: React.CSSProperties = {
  margin: 0,
  whiteSpace: 'pre-wrap',
  border: '1px solid #e5e7eb',
  borderRadius: 10,
  padding: 12,
  background: '#f9fafb',
  color: '#374151',
  fontSize: 12.5,
  lineHeight: 1.55,
  overflowX: 'auto',
};

const ExampleSection = ({ step, title, description, children }: ExampleSectionProps) => (
  <section style={sectionStyle}>
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 26,
          height: 26,
          borderRadius: 999,
          background: '#111827',
          color: '#fff',
          fontSize: 12,
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {step}
      </span>
      <div>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111827' }}>
          {title}
        </h2>
        <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 13, lineHeight: 1.5 }}>
          {description}
        </p>
      </div>
    </div>
    {children}
  </section>
);

const GeneratedVariablesPreview = ({ variables }: { variables: ReturnType<typeof generateVariablesByJsonSchema> }) => {
  if (variables.variables.length === 0) {
    return (
      <div
        style={{
          border: '1px dashed #d1d5db',
          borderRadius: 10,
          padding: 12,
          color: '#6b7280',
          fontSize: 13,
          background: '#f9fafb',
        }}
      >
        Sin variables generadas para este JSON Schema raíz.
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div
        style={{
          border: '1px solid #e5e7eb',
          borderRadius: 10,
          overflow: 'hidden',
          fontFamily: 'monospace',
          fontSize: 12.5,
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '140px 1fr 1fr 90px',
            gap: 12,
            padding: '8px 12px',
            background: '#f9fafb',
            color: '#6b7280',
            fontWeight: 700,
            borderBottom: '1px solid #e5e7eb',
          }}
        >
          <span>Label</span>
          <span>Value</span>
          <span>Path</span>
          <span>Type</span>
        </div>
        {variables.variables.map((variable) => (
          <div
            key={variable.value}
            style={{
              display: 'grid',
              gridTemplateColumns: '140px 1fr 1fr 90px',
              gap: 12,
              alignItems: 'center',
              padding: '9px 12px',
              borderBottom: '1px solid #f3f4f6',
            }}
          >
            <span style={{ color: variable.color, fontWeight: 700 }}>{variable.label}</span>
            <span>{variable.value}</span>
            <span>{variable.path}</span>
            <span>{variable.type}</span>
          </div>
        ))}
      </div>
      <pre style={codeBlockStyle}>{variables.text || 'Sin template generado'}</pre>
    </div>
  );
};

const InputVarsExample2 = () => {
  const generated = useMemo(() => generateVariablesByJsonSchema(schema), []);
  const [text, setText] = useState(
    `Temas encontrados: {{total}}.\nPágina {{page}} de temas con límite {{limit}}.\nNombres: {{data.map(a, a.nombre)}}`
  );

  const [text2, setText2] = useState('');
  const [textRootArray, setTextRootArray] = useState('Array raíz: {{root}}');
  const [textRootArrayJson, setTextRootArrayJson] = useState(
    `Array raíz: {{root}}\nNombres: {{root.map(a, a.nombre)}}`
  );
  const [type, setType] = useState<InputVarTypeFilter | ''>('');
  const [arrayItemFilter, setArrayItemFilter] = useState('data');
  const arrayItemOptions = useMemo(
    () =>
      generated.variables.filter(
        (variable) => variable.type?.toLowerCase() === 'array' && variable.path
      ),
    [generated.variables]
  );
  const variablesOptions = useMemo(() => generateVariablesByJsonSchema(variables), []);
  const generatedEjemploArray = useMemo(() => generateVariablesByJsonSchema(ejemploArray), []);
  const generatedEjemploArrayJson = useMemo(
    () => generateVariablesByJsonSchema(ejemploArrayJson),
    []
  );

  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">Input Vars desde JSON Schema</h1>
        <p className="page-description">
          Flujo desglosado por las piezas que lo componen: JSON Schema, generación de
          variables, template editable y render final con datos de prueba.
        </p>
      </div>

      <div className="panel">
        <div style={{ maxWidth: 1040, padding: '1.5rem', display: 'grid', gap: '1rem' }}>
          <ExampleSection
            step="1"
            title="Schema origen"
            description="El JSON Schema define las rutas disponibles y trae metadatos visuales por campo: label, color y group."
          >
            <pre style={codeBlockStyle}>{JSON.stringify(schema, null, 2)}</pre>
          </ExampleSection>

          <ExampleSection
            step="2"
            title="Variables generadas"
            description="La utilidad convierte cada propiedad del schema en una opción de InputVars, incluyendo rutas CEL para objetos y arrays."
          >
            <div
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: 10,
                overflow: 'hidden',
                fontFamily: 'monospace',
                fontSize: 12.5,
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '140px 1fr 1fr 90px 110px 110px',
                  gap: 12,
                  padding: '8px 12px',
                  background: '#f9fafb',
                  color: '#6b7280',
                  fontWeight: 700,
                  borderBottom: '1px solid #e5e7eb',
                }}
              >
                <span>Label</span>
                <span>Value</span>
                <span>Path</span>
                <span>Type</span>
                <span>Group</span>
                <span>Color</span>
              </div>
              {generated.variables.map((variable) => (
                <div
                  key={variable.value}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '140px 1fr 1fr 90px 110px 110px',
                    gap: 12,
                    alignItems: 'center',
                    padding: '9px 12px',
                    borderBottom: '1px solid #f3f4f6',
                  }}
                >
                  <span style={{ color: variable.color, fontWeight: 700 }}>{variable.label}</span>
                  <span>{variable.value}</span>
                  <span>{variable.path}</span>
                  <span>{variable.type}</span>
                  <span>{variable.group}</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 999,
                        background: variable.color,
                        border: '1px solid rgba(17, 24, 39, 0.16)',
                      }}
                    />
                    {variable.color}
                  </span>
                </div>
              ))}
            </div>
          </ExampleSection>

          <ExampleSection
            step="3"
            title="Template sugerido"
            description="Además de la lista de variables, el generador devuelve un texto base para detectar o insertar rutas dentro de textos."
          >
            <pre style={codeBlockStyle}>{generated.text}</pre>
          </ExampleSection>

          <ExampleSection
            step="4"
            title="Editor con chips"
            description="InputVars reutiliza las variables generadas para insertar chips con el mismo label, color y group del schema."
          >
            <InputVars
              type="textarea"
              value={text}
              variables={generated.variables}
              dataValues={values}
              placeholder="Escribe un texto y agrega variables del JSON Schema..."
              onChange={setText}
            />
            <div style={{ display: 'grid', gap: 6 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>Texto crudo</div>
              <pre style={codeBlockStyle}>{text}</pre>
            </div>
            <Rendered value={text} values={values} label="Texto crudo renderizado" />
          </ExampleSection>

          <ExampleSection
            step="5"
            title="Render con datos"
            description="fitro por tipo de dato si es array de vuelve solo valores del array o el array completo"
          >
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <label style={{ display: 'grid', gap: 4, fontSize: 12, color: '#374151' }}>
                Tipo
                <select onChange={(e) => setType(e.target.value as InputVarTypeFilter | '')} value={type}>
                  <option value="">todos</option>
                  <option value="string">string</option>
                  <option value="integer">integer</option>
                  <option value="boolean">boolean</option>
                  <option value="array">array</option>
                  <option value="-array">todos menos array</option>
                </select>
              </label>
              <label style={{ display: 'grid', gap: 4, fontSize: 12, color: '#374151' }}>
                Item array
                <select
                  onChange={(e) => setArrayItemFilter(e.target.value)}
                  value={arrayItemFilter}
                >
                  {arrayItemOptions.map((variable) => (
                    <option key={variable.path} value={variable.path}>
                      {variable.path}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <InputVars
              type="input"
              value={text2}
              filterByType={type || undefined}
              filterByArrayItem={arrayItemFilter}
              variables={generated.variables}
              dataValues={values}
              placeholder="Escribe un texto y agrega variables del JSON Schema..."
              onChange={setText2}
            />
            <Rendered value={text2} values={values} label="Texto crudo renderizado" />
          </ExampleSection>

          <ExampleSection
            step="6"
            title="JSON Schema array simple"
            description="Vista del schema tal cual está definido, sin envolverlo ni convertirlo a objeto."
          >
            <pre style={codeBlockStyle}>{JSON.stringify(ejemploArray, null, 2)}</pre>
            <GeneratedVariablesPreview variables={generatedEjemploArray} />
            <InputVars
              type="textarea"
              value={textRootArray}
              variables={generatedEjemploArray.variables}
              dataValues={valuesEjemploArray}
              placeholder="Prueba el valor raíz del array..."
              onChange={setTextRootArray}
            />
            <Rendered
              value={textRootArray}
              values={valuesEjemploArray}
              label="Root array renderizado"
            />
          </ExampleSection>

          <ExampleSection
            step="7"
            title="JSON Schema array de objetos"
            description="Vista del schema tal cual está definido para revisar qué variables produce antes de planear los siguientes cambios."
          >
            <pre style={codeBlockStyle}>{JSON.stringify(ejemploArrayJson, null, 2)}</pre>
            <GeneratedVariablesPreview variables={generatedEjemploArrayJson} />
            <InputVars
              type="textarea"
              value={textRootArrayJson}
              variables={generatedEjemploArrayJson.variables}
              dataValues={valuesEjemploArrayJson}
              placeholder="Prueba el valor raíz del array de objetos..."
              onChange={setTextRootArrayJson}
            />
            <Rendered
              value={textRootArrayJson}
              values={valuesEjemploArrayJson}
              label="Root array JSON renderizado"
            />
          </ExampleSection>

          
        </div>
      </div>
    </div>
  );
};

export default InputVarsExample2;
