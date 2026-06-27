import React from 'react';
import { SchemaVisualEditor } from 'jsonjoy-builder';

// ---------------------------------------------------------------------------
// SchemaEditor
//
// Editor genérico para cualquier JSON Schema con forma { type:'object',
// properties:{} }. Reemplaza a BodyEditor / ParamsEditor /
// ExternalVariablesEditor, que eran idénticos salvo por el texto.
//
// Props:
//   - schema:       el JSON Schema a editar.
//   - onChange:     callback que recibe el schema normalizado.
//   - title:        encabezado opcional.
//   - description:  texto/JSX descriptivo opcional.
//   - testValues:   si se pasa, muestra cuántas propiedades tienen valor.
//   - minHeight:    alto mínimo del contenedor del editor visual.
// ---------------------------------------------------------------------------

// The empty/neutral schema is `{}` (matches anything) rather than a forced
// object: a schema is not always an object — it can be an array, which is
// declared differently ({ type: 'array', items: ... }). We pass through any
// object value as-is and only coerce null/non-object inputs to `{}`.
const EMPTY_SCHEMA = {};

const normalizeSchema = (schema) =>
  schema && typeof schema === 'object' ? schema : EMPTY_SCHEMA;

const SchemaEditor = ({
  schema,
  onChange,
  title,
  description,
  testValues,
  minHeight = 220,
  readOnly = false
}) => {
  const value = normalizeSchema(schema);
  const declared = Object.keys(value.properties || {});
  const filledCount = declared.reduce(
    (acc, k) => acc + (testValues && testValues[k] !== undefined ? 1 : 0),
    0
  );

  return (
    <div>
      {title && (
        <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: '#333' }}>
          {title}
        </h4>
      )}
      {description && (
        <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.7rem', color: '#666' }}>
          {description}
          {testValues && declared.length > 0 && (
            <>
              {' · '}
              <strong style={{ color: filledCount === declared.length ? '#2e7d32' : '#e65100' }}>
                {filledCount}/{declared.length}
              </strong>
              {' con valor en testValues'}
            </>
          )}
        </p>
      )}
      <div
        style={{
          border: '1px solid #ddd',
          borderRadius: '4px',
          padding: '0.5rem',
          backgroundColor: '#fafafa',
          minHeight
        }}
      >
        <SchemaVisualEditor
          schema={value}
          readOnly={readOnly}
          onChange={(next) => onChange(normalizeSchema(next))}
        />
      </div>
    </div>
  );
};

export default SchemaEditor;
