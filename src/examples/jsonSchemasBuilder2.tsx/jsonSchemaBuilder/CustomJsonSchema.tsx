import { memo, useState } from 'react';
import { ChevronRight, Brackets, Braces, FileBracesCorner, Trash2, Brain } from 'lucide-react';
import { SchemaInferencer, SchemaVisualEditor } from 'jsonjoy-builder';
import Button from './Button';
import PropertyExtraEditor from './PropertyExtraEditor';

type SchemaPropertyType = 'string' | 'number' | 'boolean' | 'object' | 'array';

interface SchemaProperty {
  name: string;
  type: SchemaPropertyType;
  required: boolean;
  properties?: SchemaProperty[];
  items?: { type: SchemaPropertyType; properties?: SchemaProperty[] };
}

interface CustomJsonSchemaProps {
  schema: any;
  onChange?: (schema: any) => void;
  readonly?: boolean;
  /**
   * Si se define, muestra un editor adicional por propiedad para este keyword
   * del JSON Schema (ej. 'default', 'examples', 'title'), ya que jsonjoy-builder
   * no permite editarlo de forma nativa.
   */
  extraField?: string;
}

const typeColors: Record<SchemaPropertyType, { bg: string; text: string }> = {
  string: { bg: 'bg-blue-100', text: 'text-blue-600' },
  number: { bg: 'bg-purple-100', text: 'text-purple-600' },
  boolean: { bg: 'bg-green-100', text: 'text-green-700' },
  object: { bg: 'bg-orange-100', text: 'text-orange-700' },
  array: { bg: 'bg-pink-100', text: 'text-pink-700' },
};

const typeLabels: Record<SchemaPropertyType, string> = {
  string: 'Text',
  number: 'Number',
  boolean: 'Boolean',
  object: 'Object',
  array: 'Array',
};

// --- Parse schema to internal format ---

function parseSchema(schema: any): { type: SchemaPropertyType; properties: SchemaProperty[] } {
  if (!schema || typeof schema !== 'object') {
    return { type: 'object', properties: [] };
  }

  const type = (schema.type || 'object') as SchemaPropertyType;

  if (type === 'array') {
    const items = schema.items || { type: 'string' };
    if (items.type === 'object' && items.properties) {
      const requiredSet = new Set<string>(items.required || []);
      const properties = Object.entries(items.properties).map(([name, def]: [string, any]) =>
        parseProperty(name, def, requiredSet.has(name))
      );
      return { type: 'array', properties };
    }
    // For primitive array items, show the item type
    return {
      type: 'array',
      properties: [{
        name: 'items',
        type: items.type as SchemaPropertyType,
        required: true,
      }]
    };
  }

  if (type === 'object') {
    const requiredSet = new Set<string>(schema.required || []);
    const properties: SchemaProperty[] = [];
    if (schema.properties) {
      for (const [name, def] of Object.entries(schema.properties)) {
        properties.push(parseProperty(name, def as any, requiredSet.has(name)));
      }
    }
    return { type: 'object', properties };
  }

  // Primitive types (string, number, boolean)
  return { type, properties: [] };
}

function parseProperty(name: string, def: any, required: boolean): SchemaProperty {
  const type = (def?.type || 'string') as SchemaPropertyType;
  const prop: SchemaProperty = { name, type, required };

  if (type === 'object' && def.properties) {
    const reqSet = new Set<string>(def.required || []);
    prop.properties = Object.entries(def.properties).map(([n, d]: [string, any]) =>
      parseProperty(n, d, reqSet.has(n))
    );
  }

  if (type === 'array' && def.items) {
    const itemType = def.items.type as SchemaPropertyType;
    if (itemType === 'object' && def.items.properties) {
      const reqSet = new Set<string>(def.items.required || []);
      prop.items = {
        type: itemType,
        properties: Object.entries(def.items.properties).map(([n, d]: [string, any]) =>
          parseProperty(n, d, reqSet.has(n))
        ),
      };
    } else {
      prop.items = { type: itemType };
    }
  }

  return prop;
}

// --- Component ---

const CustomJsonSchema = memo(({
  schema,
  onChange,
  readonly = false,
  extraField,
}: CustomJsonSchemaProps) => {
  const parsed = parseSchema(schema);
  const [isInferencerOpen, setIsInferencerOpen] = useState(false);

  const renderProperty = (prop: SchemaProperty, depth: number = 0) => {
    const hasChildren = prop.type === 'object' && prop.properties?.length;
    const isArrayWithObject = prop.type === 'array' && prop.items?.type === 'object' && prop.items.properties?.length;
    const expandable = hasChildren || isArrayWithObject;
    const typeColor = typeColors[prop.type];

    return (
      <div key={`${prop.name}-${depth}`} className="w-full space-y-0.5 sm:space-y-1">
        <div
          className="flex items-center gap-2 py-1.5 px-2 hover:bg-gray-50 rounded-lg transition-colors border border-gray-300 mx-1"
          style={{ paddingLeft: `${8 + depth * 12}px` }}
        >
          {/* Expand icon or spacer */}
          <div className="w-4 flex items-center justify-center shrink-0">
            {expandable ? (
              <ChevronRight className="w-4 h-4 text-gray-500" />
            ) : null}
          </div>

          {/* Property name - takes available space */}
          <span className="text-sm font-medium text-gray-700 flex-1 min-w-0 truncate">
            {prop.name}
          </span>

          {/* Badges - wrap if needed */}
          <div className='flex items-center gap-1 flex-wrap shrink-0'>
            {/* Type badge */}
            <span className={`text-xs px-2 py-1 rounded-lg font-medium whitespace-nowrap ${typeColor.bg} ${typeColor.text}`}>
              {typeLabels[prop.type]}
            </span>

            {/* Required badge */}
            {prop.required && (
              <span className="text-xs px-2 py-1 rounded-lg font-medium bg-red-100 text-red-500 whitespace-nowrap">
                Required
              </span>
            )}
          </div>
        </div>

        {/* Nested properties for object */}
        {hasChildren && (
          <div className="border-l border-gray-200 ml-4 flex flex-col gap-1">
            {prop.properties!.map(child => renderProperty(child, depth + 1))}
          </div>
        )}

        {/* Nested properties for array of objects */}
        {isArrayWithObject && (
          <div className="border-l border-pink-200 ml-4">
            <div className="flex items-center gap-2 py-1 px-2 text-xs text-pink-600 font-medium" style={{ paddingLeft: `${8 + (depth + 1) * 12}px` }}>
              <Brackets className="w-3 h-3" />
              Array items:
            </div>
            {prop.items!.properties!.map(child => renderProperty(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full bg-white border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border-b border-gray-200">
        {
          schema?.type ?
            <>
              {parsed.type === 'array' ? (
                <div className='flex gap-2 py-1.5'>
                  <Brackets className="w-4 h-4 text-pink-600 shrink-0" />
                  <span className="text-sm font-semibold text-gray-700 truncate">Array Schema</span>
                </div>
              ) : parsed.type === 'object' ? (
                <div className='flex gap-2 py-1.5'>
                  <Braces className="w-4 h-4 text-orange-600 shrink-0" />
                  <span className="text-sm font-semibold text-gray-700 truncate">Object Schema</span>
                </div>
              ) : (
                <div className='flex gap-2 py-1.5 items-center'>
                  <FileBracesCorner className={`w-4 h-4 ${typeColors[parsed.type].text} shrink-0`} />
                  <span className="text-sm font-semibold text-gray-700 truncate">{typeLabels[parsed.type]} Schema</span>
                </div>
              )}
            </> :
            <div className='flex gap-2 py-1.5'>
              <FileBracesCorner className="w-4 h-4 text-gray-700 shrink-0" />
              <span className="text-sm font-semibold text-gray-700 truncate">JSON Schema</span>
            </div>

        }
        <div className='flex justify-end items-center gap-1 ml-auto'>
          {
            !readonly &&
            <>
              <Button
                onClick={() => setIsInferencerOpen(true)}
                className="ml-auto p-1.5 text-gray-400 hover:text-pink-500! hover:bg-pink-50! rounded transition-colors bg-gray-50! cursor-default!"
                title="Infer schema"
              >
                <Brain className="w-3.5 h-3.5" />
              </Button>

              <SchemaInferencer
                open={isInferencerOpen}
                onOpenChange={setIsInferencerOpen}
                onSchemaInferred={(inferredSchema) => {
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
            </>
          }
          {!readonly && schema && (
            <Button
              onClick={() => onChange?.(null)}
              className="ml-auto p-1.5 text-gray-400 hover:text-red-500! hover:bg-red-50! rounded transition-colors bg-gray-50! cursor-default!"
              title="Clear schema"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Properties list */}
      <div className="py-1 flex flex-col gap-1">
        {schema?.type ? <>
          {
            parsed.type === 'array' ? (
              <>
                <SchemaVisualEditor
                  readOnly={readonly}
                  schema={schema.items || { type: 'object', properties: {} }}
                  onChange={onChange ? (newItemsSchema) => {
                    onChange({
                      type: 'array',
                      items: newItemsSchema
                    });
                  } : () => { }}

                />
                {extraField && (
                  <div className="border-t border-gray-200 mt-1">
                    <PropertyExtraEditor
                      schema={schema}
                      onChange={onChange}
                      field={extraField}
                      readonly={readonly}
                    />
                  </div>
                )}
              </>
            ) : parsed.type === 'object' ? (
              <>
                <SchemaVisualEditor
                  readOnly={readonly}
                  schema={schema}
                  onChange={onChange || (() => { })}
                />
                {extraField && (
                  <div className="border-t border-gray-200 mt-1">
                    <PropertyExtraEditor
                      schema={schema}
                      onChange={onChange}
                      field={extraField}
                      readonly={readonly}
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="py-6 px-4 flex flex-col items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded-lg font-medium ${typeColors[parsed.type].bg} ${typeColors[parsed.type].text}`}>
                  {typeLabels[parsed.type]}
                </span>
                <p className="text-sm text-gray-500 text-center">
                  This schema represents a single <b>{typeLabels[parsed.type].toLowerCase()}</b> value.
                </p>
              </div>
            )
          }
        </> : (
          <>
            {!readonly && (
              <div className="py-6 flex flex-col items-center gap-3">
                <span className="text-sm text-gray-400">Select schema type</span>
                <div className="flex gap-3">
                  <Button
                    onClick={() => onChange?.({ type: 'object', properties: { property: { type: 'string' } } })}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-50! hover:bg-blue-100! text-blue-600! rounded-lg text-sm font-medium transition-colors border border-blue-200 cursor-default!"
                  >
                    <Braces className="w-4 h-4" />
                    Object
                  </Button>
                  <Button
                    onClick={() => onChange?.({ type: 'array', items: { type: 'object', properties: { property: { type: 'string' } } } })}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-600 rounded-lg text-sm font-medium transition-colors border border-purple-200 cursor-default!"
                  >
                    <Brackets className="w-4 h-4" />
                    Array
                  </Button>
                </div>
              </div>
            )}
            {readonly && (
              <div className="py-6 text-center text-sm text-gray-400">
                No properties defined
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
});

CustomJsonSchema.displayName = 'CustomJsonSchema';

export default CustomJsonSchema;
