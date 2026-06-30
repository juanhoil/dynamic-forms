import React, { useMemo, useState } from 'react';
import InputVars from './components/InputVars';
import Rendered from './components/Rendered';
import {
  generateVariablesByJsonSchema,
  type JsonSchemaNode,
} from './utils/GenVarsByJsonschemas';

const schema: JsonSchemaNode = {
  type: 'object',
  properties: {
    cliente: {
      type: 'object',
      label: 'Cliente',
      color: '#2563EB',
      group: 'Formulario',
      properties: {
        nombre: {
          type: 'string',
          label: 'Nombre',
          color: '#2563EB',
          group: 'Formulario',
        },
        email: {
          type: 'string',
          label: 'Email',
          color: '#2563EB',
          group: 'Formulario',
        },
      },
    },
    poliza: {
      type: 'object',
      label: 'Póliza',
      color: '#16A34A',
      group: 'Cotización',
      properties: {
        id: {
          type: 'string',
          label: 'Póliza ID',
          color: '#16A34A',
          group: 'Cotización',
        },
        total: {
          type: 'number',
          label: 'Total',
          color: '#16A34A',
          group: 'Cotización',
        },
      },
    },
    coberturas: {
      type: 'array',
      label: 'Coberturas',
      color: '#B45309',
      group: 'Catálogo',
      items: {
        type: 'object',
        properties: {
          nombre: {
            type: 'string',
            label: 'Cobertura',
            color: '#B45309',
            group: 'Catálogo',
          },
          deducible: {
            type: 'number',
            label: 'Deducible',
            color: '#B45309',
            group: 'Catálogo',
          },
        },
      },
    },
  },
};

const values = {
  cliente: {
    nombre: 'Juan Pérez',
    email: 'juan@example.com',
  },
  poliza: {
    id: 'POL-12345',
    total: 15250,
  },
  coberturas: [
    { nombre: 'Daños materiales', deducible: 5 },
    { nombre: 'Robo total', deducible: 10 },
  ],
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

const InputVarsExample2 = () => {
  const generated = useMemo(() => generateVariablesByJsonSchema(schema), []);
  const [text, setText] = useState(
    `Hola {{cliente.nombre}}, tu póliza {{poliza.id}} tiene un total de {{poliza.total}}.\nCoberturas: {{coberturas.map(a, a.nombre)}}`
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
          </ExampleSection>

          <ExampleSection
            step="5"
            title="Render con datos"
            description="Rendered usa el motor CEL para resolver las rutas del template contra un objeto de datos de ejemplo."
          >
            <pre style={codeBlockStyle}>{JSON.stringify(values, null, 2)}</pre>
            <Rendered value={text} values={values} label="texto renderizado" />
          </ExampleSection>

          
        </div>
      </div>
    </div>
  );
};

export default InputVarsExample2;
