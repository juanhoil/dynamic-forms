import { memo } from 'react';

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
  readonly?: boolean;
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
      return raw === 'true';
    default:
      return raw;
  }
}

const PropertyExtraEditor = memo(({
  schema,
  onChange,
  field = 'default',
  readonly = false,
}: PropertyExtraEditorProps) => {
  const holder = getPropertiesHolder(schema);
  const properties: Record<string, Json> | undefined = holder?.properties;

  if (!properties || Object.keys(properties).length === 0) {
    return null;
  }

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
              type === 'boolean' ? (
                <select
                  disabled={readonly}
                  value={currentValue === undefined ? '' : String(currentValue)}
                  onChange={(e) => handleChange(e.target.value)}
                  className="h-8 text-xs border border-gray-300 rounded-md px-2 min-w-[120px] disabled:bg-gray-50"
                >
                  <option value="">—</option>
                  <option value="true">true</option>
                  <option value="false">false</option>
                </select>
              ) : (
                <input
                  type={type === 'number' || (type as string) === 'integer' ? 'number' : 'text'}
                  disabled={readonly}
                  value={currentValue === undefined ? '' : String(currentValue)}
                  onChange={(e) => handleChange(e.target.value)}
                  placeholder={field}
                  className="h-8 text-xs border border-gray-300 rounded-md px-2 min-w-[150px] disabled:bg-gray-50"
                />
              )
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
    <div className="flex flex-col gap-1 p-2">
      <div className="text-xs font-semibold text-gray-500 px-1 pb-1">
        {field}
      </div>
      {renderRows(properties, basePath, 0)}
    </div>
  );
});

PropertyExtraEditor.displayName = 'PropertyExtraEditor';

export default PropertyExtraEditor;
