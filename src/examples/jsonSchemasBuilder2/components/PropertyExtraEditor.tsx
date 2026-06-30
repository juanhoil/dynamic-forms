import { memo, useState } from 'react';
import { Pencil, Eye, Brain, Trash2, Braces, Brackets, FileBracesCorner } from 'lucide-react';
import JsonSchemaBuilder from './JsonSchemaBuilder';
import Button from './Button';
import { typeColors, typeLabels } from './baseSchemaVisualEditor';
import { InferSchemaDialog } from 'jsonjoy-builder';
import BaseSchemaVisualEditor from './baseSchemaVisualEditor';
import InputVars, { InputVarOption } from '@/examples/inputVars/components/InputVars';
type Json = any;

interface PropertyExtraEditorProps {
  /** JSON Schema controlado (object o array de objects) */
  schema: Json;
  /** Callback con el schema actualizado */
  onChange?: (schema: Json) => void;
  /**
   * Keyword del JSON Schema a editar por cada propiedad.
   * Por defecto `default`, pero puede ser `examples`, `title`, etc.
   */
  field?: string;
  readOnly?: boolean;
  /**
   * Vista usada al pulsar el lápiz para editar la estructura de los campos:
   *   - `'custom'`: editor `CustomJsonSchema` (un solo panel).
   *   - `'all'`:    `JsonSchemaBuilder` (doble panel: editor + visualizador JSON).
   */
  view?: 'custom' | 'all';
  variables?: InputVarOption[];
}

type SchemaPropertyType = 'string' | 'number' | 'boolean' | 'object' | 'array';

const typeBadge: Record<string, { bg: string; text: string }> = {
  string: { bg: 'bg-blue-100', text: 'text-blue-600' },
  number: { bg: 'bg-purple-100', text: 'text-purple-600' },
  integer: { bg: 'bg-purple-100', text: 'text-purple-600' },
  boolean: { bg: 'bg-green-100', text: 'text-green-700' },
  object: { bg: 'bg-orange-100', text: 'text-orange-700' },
  array: { bg: 'bg-pink-100', text: 'text-pink-700' },
};

// Devuelve el contenedor de propiedades del schema (object directo o array.items)
function getPropertiesHolder(schema: Json): Json | null {
  if (!schema || typeof schema !== 'object') return null;
  if (schema.type === 'array') {
    return schema.items && typeof schema.items === 'object' ? schema.items : null;
  }
  return schema;
}

// Actualiza inmutablemente un valor dentro de schema siguiendo un path de propiedades.
// path = ['properties', name, 'properties', child, ...]
function setDeep(schema: Json, path: string[], value: Json): Json {
  if (path.length === 0) return value;
  const [head, ...rest] = path;
  const current = schema && typeof schema === 'object' ? schema : {};
  return {
    ...current,
    [head]: setDeep(current[head], rest, value),
  };
}

// Convierte el texto del input al tipo adecuado según el type de la propiedad.
function coerceValue(raw: string, type: SchemaPropertyType): Json {
  if (raw === '') return undefined;
  switch (type) {
    case 'number':
    case 'integer' as SchemaPropertyType: {
      const n = Number(raw);
      return Number.isNaN(n) ? raw : n;
    }
    case 'boolean':
      if (raw === 'true') return true;
      if (raw === 'false') return false;
      return raw;
    default:
      return raw;
  }
}

const PropertyExtraEditor = memo(({
  schema,
  onChange,
  field = 'default',
  readOnly = false,
  view = 'custom',
  variables = [],
}: PropertyExtraEditorProps) => {
  // Si el schema viene vacío (sin propiedades declaradas), arranca en edición.
  const [editing, setEditing] = useState(() => {
    const props = getPropertiesHolder(schema)?.properties;
    return !props || Object.keys(props).length === 0;
  });
  const [isInferencerOpen, setIsInferencerOpen] = useState(false);
  const schemaType = schema?.type as keyof typeof typeColors | undefined;

  const holder = getPropertiesHolder(schema);
  const properties: Record<string, Json> | undefined = holder?.properties;
  const hasProperties = !!properties && Object.keys(properties).length > 0;

  // basePath: ruta hasta el contenedor de properties dentro del schema raíz
  const basePath = schema?.type === 'array' ? ['items', 'properties'] : ['properties'];

  const renderRows = (
    props: Record<string, Json>,
    pathToProperties: string[],
    depth: number,
  ) =>
    Object.entries(props).map(([name, def]: [string, Json]) => {
      const type = (def?.type || 'string') as SchemaPropertyType;
      const badge = typeBadge[type] || typeBadge.string;
      const currentValue = def?.[field];
      const propPath = [...pathToProperties, name];

      const handleChange = (raw: string) => {
        if (!onChange) return;
        const value = coerceValue(raw, type);
        const valuePath = [...propPath, field];
        // Si queda undefined, lo seteamos y luego limpiamos abajo
        let next = setDeep(schema, valuePath, value);
        if (value === undefined) {
          // Eliminar la clave en vez de dejar undefined
          next = setDeep(schema, propPath, (() => {
            const clone = { ...def };
            delete clone[field];
            return clone;
          })());
        }
        onChange(next);
      };

      const nestedProps: Record<string, Json> | undefined =
        type === 'object'
          ? def.properties
          : type === 'array' && def.items?.type === 'object'
            ? def.items.properties
            : undefined;

      const nestedPath =
        type === 'object'
          ? [...propPath, 'properties']
          : [...propPath, 'items', 'properties'];

      const editableLeaf = type !== 'object' && type !== 'array';

      return (
        <div key={`${propPath.join('.')}`} className="w-full">
          <div
            className="flex items-center gap-2 py-1.5 px-2 border border-gray-200 rounded-lg"
            style={{ paddingLeft: `${8 + depth * 12}px` }}
          >
            <span className="text-sm font-medium text-gray-700 flex-1 min-w-0 truncate">
              {name}
            </span>
            <span className={`text-xs px-2 py-1 rounded-lg font-medium whitespace-nowrap ${badge.bg} ${badge.text}`}>
              {type}
            </span>

            {editableLeaf ? (
              <InputVars
                type="input"
                disabled={readOnly}
                value={currentValue === undefined ? '' : String(currentValue)}
                variables={variables}
                orderType={type}
                onChange={handleChange}
                placeholder={type === 'boolean' ? 'true / false / variable' : field}
                className="min-w-[300px] max-w-[400px]"
                frameStyle={{
                  minHeight: 32,
                  borderColor: '#d1d5db',
                  borderRadius: 6,
                }}
                buttonLabel="{{ }}"
                buttonTitle={`Agregar variable recomendada para ${type}`}
                buttonClassName="h-6 px-2 text-[11px]"
              />
            ) : (
              <span className="text-xs text-gray-400 italic min-w-[150px] text-right">
                ({type})
              </span>
            )}
          </div>

          {nestedProps && Object.keys(nestedProps).length > 0 && (
            <div className="border-l border-gray-200 ml-4 mt-1 flex flex-col gap-1">
              {renderRows(nestedProps, nestedPath, depth + 1)}
            </div>
          )}
        </div>
      );
    });

  return (
    <div className="w-full bg-white border border-gray-100 overflow-hidden">
      {/* Header al estilo de CustomJsonSchema / JsonSchemaBuilder */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border-b border-gray-200">
        <div className="flex gap-2 py-1.5 items-center">
          {/* Logo según el tipo de schema */}
          {schemaType === 'array' ? (
            <Brackets className="w-4 h-4 text-pink-600 shrink-0" />
          ) : schemaType === 'object' ? (
            <Braces className="w-4 h-4 text-orange-600 shrink-0" />
          ) : (
            <FileBracesCorner
              className={`w-4 h-4 shrink-0 ${schemaType ? typeColors[schemaType].text : 'text-gray-700'}`}
            />
          )}
  
          {/* Tipo de schema al final */}
          {schemaType && (
            <span className="text-xs font-medium text-gray-400 truncate">
              {typeLabels[schemaType]} Schema
            </span>
          )}
        </div>
        {!readOnly && (
          <div className="flex justify-end items-center gap-1 ml-auto">
            <Button
              onClick={() => setEditing((v) => !v)}
              className="ml-auto p-1.5 text-gray-400 hover:text-blue-500! hover:bg-blue-50! rounded transition-colors bg-gray-50! cursor-default!"
              title={editing ? `Ver / editar ${field}` : 'Editar campos'}
            >
              {editing ? (
                <Eye className="w-3.5 h-3.5" />
              ) : (
                <Pencil className="w-3.5 h-3.5" />
              )}
            </Button>

            <Button
              onClick={() => setIsInferencerOpen(true)}
              className="p-1.5 text-gray-400 hover:text-pink-500! hover:bg-pink-50! rounded transition-colors bg-gray-50! cursor-default!"
              title="Infer schema"
            >
              <Brain className="w-3.5 h-3.5" />
            </Button>

            <InferSchemaDialog
              open={isInferencerOpen}
              onOpenChange={setIsInferencerOpen}
              onInfer={(inferredSchema) => {
                // Eliminar propiedades no deseadas del schema generado
                if (inferredSchema && typeof inferredSchema === 'object') {
                  const cleanSchema = inferredSchema as Record<string, any>;
                  delete cleanSchema.$schema;
                  delete cleanSchema.title;
                  delete cleanSchema.description;
                }
                onChange?.(inferredSchema);
                setIsInferencerOpen(false);
              }}
            />

            {schema && (
              <Button
                onClick={() => onChange?.(null)}
                className="p-1.5 text-gray-400 hover:text-red-500! hover:bg-red-50! rounded transition-colors bg-gray-50! cursor-default!"
                title="Clear schema"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Cuerpo */}
      {editing ? (
        view === 'all' ? (
          <JsonSchemaBuilder
            schema={schema}
            setSchema={(next) => onChange?.(next)}
            readOnly={readOnly}
          />
        ) : (
          <div className="p-2">
            <BaseSchemaVisualEditor
              schema={schema}
              onChange={onChange}
              readOnly={readOnly}
            />
          </div>
        )
      ) : hasProperties ? (
        <div className="flex flex-col gap-1 p-2">
          {renderRows(properties!, basePath, 0)}
        </div>
      ) : (
        <div className="py-6 px-4 text-center text-sm text-gray-400">
          No hay propiedades. Usa el lápiz para editar los campos.
        </div>
      )}
    </div>
  );
});

PropertyExtraEditor.displayName = 'PropertyExtraEditor';

export default PropertyExtraEditor;
