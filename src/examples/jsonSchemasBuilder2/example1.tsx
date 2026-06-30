import React, { useState } from 'react';
import {
  JsonSchemaBuilder,
  CustomJsonSchema,
  JsonSchemaFields,
  PropertyExtraEditor,
  Button,
  VariableBadge
} from './components';

const INITIAL_SCHEMA: any = {
  type: 'object',
  properties: {
    name: { type: 'string', default: 'John Doe' },
    age: { type: 'number', default: 18 },
    isActive: { type: 'boolean', default: true },
    address: {
      type: 'object',
      properties: {
        city: { type: 'string' },
        zip: { type: 'string', default: '00000' },
      },
      required: ['city'],
    },
  },
  required: ['name', 'age'],
};

const Section: React.FC<{
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, description, children }) => (
  <div
    style={{
      border: '1px solid #e0e0e0',
      borderRadius: '8px',
      backgroundColor: '#fff',
      marginBottom: '1.5rem',
      overflow: 'hidden',
    }}
  >
    <div
      style={{
        padding: '0.75rem 1rem',
        borderBottom: '1px solid #eee',
        backgroundColor: '#fafafa',
      }}
    >
      <h3 style={{ margin: 0, fontSize: '1rem', color: '#333' }}>{title}</h3>
      {description && (
        <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: '#666' }}>
          {description}
        </p>
      )}
    </div>
    <div style={{ padding: '1rem' }}>{children}</div>
  </div>
);

const JsonSchemaBuilder2Example: React.FC = () => {
  const [schema, setSchema] = useState<any>(INITIAL_SCHEMA);
  const [editing, setEditing] = useState(true);

  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">JSON Schema Builder 2</h1>
        <p className="page-description">
          Showcase de todos los componentes de <code>jsonSchemaBuilder</code>:
          editor de doble panel, editor/visualizador, lista de campos, editor de
          keywords extra, botón y badge.
        </p>
      </div>
      {/* 1. JsonSchemaBuilder: doble panel editable */}
      <Section
        title="1. JsonSchemaBuilder"
        description="Editor visual (izquierda) + visualizador/editor JSON (derecha) sincronizados de forma bidireccional."
      >
        <JsonSchemaBuilder schema={schema} setSchema={setSchema}/>
      </Section>

      <Section
        title="1.1 JsonSchemaBuilder (readonly)"
        description="Editor visual (izquierda) + visualizador/editor JSON (derecha) sincronizados de forma bidireccional."
      >
        <JsonSchemaBuilder schema={schema} setSchema={setSchema} readOnly={true} />
      </Section>


      {/* 2. CustomJsonSchema */}
      <Section
        title="2. CustomJsonSchema"
        description="El editor extra (PropertyExtraEditor) aparece debajo del editor visual para editar 'default' por propiedad."
      >
        <div style={{ maxHeight: '50vh', overflow: 'auto' }}>
          <CustomJsonSchema schema={schema} onChange={setSchema} />
        </div>
      </Section>

       {/* 2. CustomJsonSchema readonly */}
       <Section
        title="2.1 CustomJsonSchema (readonly)"
        description="Mismo componente en modo solo lectura: sin acciones de edición ni inferencia."
      >
        <div style={{ maxHeight: '40vh', overflow: 'auto' }}>
          <CustomJsonSchema schema={schema} readOnly={true} />
        </div>
      </Section>

        {/* 3. JsonSchemaFields */}
        <Section
        title="3. JsonSchemaFields"
        description="Vista compacta de solo lectura de los campos del schema (nombre, tipo y requerido)."
      >
        <JsonSchemaFields schema={schema} />
      </Section>

      {/* 4. PropertyExtraEditor standalone */}
      <Section
        title="4. PropertyExtraEditor (standalone)"
        description="Editor recursivo por propiedad para un keyword del schema (aquí 'default')."
      >
        <PropertyExtraEditor schema={schema} onChange={setSchema} field="default" />
      </Section>


      {/* 8. Button */}
      <Section
        title="8. Button"
        description="Botón base reutilizado por los componentes."
      >
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <Button onClick={() => alert('¡Click!')}>Botón normal</Button>
          <Button
            onClick={() => alert('¡Click!')}
            className="bg-blue-100! text-blue-700! hover:bg-blue-200!"
          >
            Variante azul
          </Button>
          <Button disabled>Deshabilitado</Button>
        </div>
      </Section>

      {/* 9. VariableBadge */}
      <Section
        title="9. VariableBadge"
        description="Badge de color para mostrar tipos/etiquetas, en distintos tamaños y con opción de remover."
      >
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <VariableBadge label="string" color="#3B82F6" />
          <VariableBadge label="number" color="#8B5CF6" />
          <VariableBadge label="boolean" color="#22C55E" />
          <VariableBadge label="object" color="#F97316" />
          <VariableBadge label="array" color="#EC4899" />
          <VariableBadge label="Required" color="#EF4444" />
          <VariableBadge label="Seleccionado" color="#0891b2" selected />
          <VariableBadge label="Removible" color="#0891b2" onRemove={() => alert('remove')} />
          <VariableBadge label="md" color="#0891b2" size="md" />
          <VariableBadge label="lg" color="#0891b2" size="lg" />
        </div>
      </Section>

      {/* JSON actual */}
      <Section title="Schema actual (JSON)">
        <pre
          style={{
            margin: 0,
            padding: '0.75rem',
            backgroundColor: '#1e1e1e',
            color: '#d4d4d4',
            borderRadius: '4px',
            fontSize: '0.75rem',
            overflow: 'auto',
            maxHeight: '300px',
          }}
        >
          {JSON.stringify(schema, null, 2)}
        </pre>
      </Section>
    </div>
  );
};

export default JsonSchemaBuilder2Example;
