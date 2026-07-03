import { memo } from 'react';
import { Braces, Brackets } from 'lucide-react';
import { SchemaFieldsEditor, type JsonSchema, es } from 'jsonjoy-builder';
import Button from './Button';
import type {
  BaseSchemaVisualEditorProps,
  JsonSchemaEditableType,
  JsonSchemaNode,
  ParsedSchema,
  ParsedSchemaProperty,
} from './interface.JsonSchemaBuilder';

export type SchemaPropertyType = JsonSchemaEditableType;

export type SchemaProperty = ParsedSchemaProperty;

export const typeColors: Record<SchemaPropertyType, { bg: string; text: string }> = {
  string: { bg: 'bg-blue-100', text: 'text-blue-600' },
  number: { bg: 'bg-purple-100', text: 'text-purple-600' },
  integer: { bg: 'bg-purple-100', text: 'text-purple-600' },
  boolean: { bg: 'bg-green-100', text: 'text-green-700' },
  object: { bg: 'bg-orange-100', text: 'text-orange-700' },
  array: { bg: 'bg-pink-100', text: 'text-pink-700' },
};

export const typeLabels: Record<SchemaPropertyType, string> = {
  string: 'Text',
  number: 'Number',
  integer: 'Integer',
  boolean: 'Boolean',
  object: 'Object',
  array: 'Array',
};

const toEditableType = (type: unknown): SchemaPropertyType => {
  if (
    type === 'string' ||
    type === 'number' ||
    type === 'integer' ||
    type === 'boolean' ||
    type === 'object' ||
    type === 'array'
  ) {
    return type;
  }
  return 'string';
};

const isJsonSchemaNode = (schema: JsonSchemaNode | boolean | undefined): schema is JsonSchemaNode =>
  Boolean(schema && typeof schema === 'object');

const getFirstItemSchema = (
  items: JsonSchemaNode | JsonSchemaNode[] | boolean | undefined
): JsonSchemaNode => {
  if (Array.isArray(items)) return items[0] || { type: 'string' };
  return isJsonSchemaNode(items) ? items : { type: 'string' };
};

// --- Parse schema to internal format ---

export function parseSchema(schema: JsonSchemaNode | null): ParsedSchema {
  if (!schema || typeof schema !== 'object') {
    return { type: 'object', properties: [] };
  }

  const type = toEditableType(Array.isArray(schema.type) ? schema.type[0] : schema.type || 'object');

  if (type === 'array') {
    const items = getFirstItemSchema(schema.items);
    if (items.type === 'object' && items.properties) {
      const requiredSet = new Set<string>(items.required || []);
      const properties = Object.entries(items.properties).map(([name, def]) =>
        parseProperty(name, def, requiredSet.has(name))
      );
      return { type: 'array', properties };
    }
    // For primitive array items, show the item type
    return {
      type: 'array',
      properties: [{
        name: 'items',
        type: toEditableType(Array.isArray(items.type) ? items.type[0] : items.type),
        required: true,
      }]
    };
  }

  if (type === 'object') {
    const requiredSet = new Set<string>(schema.required || []);
    const properties: SchemaProperty[] = [];
    if (schema.properties) {
      for (const [name, def] of Object.entries(schema.properties)) {
        properties.push(parseProperty(name, def, requiredSet.has(name)));
      }
    }
    return { type: 'object', properties };
  }

  // Primitive types (string, number, boolean)
  return { type, properties: [] };
}

export function parseProperty(name: string, def: JsonSchemaNode | boolean, required: boolean): SchemaProperty {
  if (!isJsonSchemaNode(def)) {
    return { name, type: 'object', required };
  }

  const type = toEditableType(Array.isArray(def?.type) ? def.type[0] : def?.type || 'string');
  const prop: SchemaProperty = { name, type, required };

  if (type === 'object' && def.properties) {
    const reqSet = new Set<string>(def.required || []);
    prop.properties = Object.entries(def.properties).map(([n, d]) =>
      parseProperty(n, d, reqSet.has(n))
    );
  }

  if (type === 'array' && def.items) {
    const itemSchema = getFirstItemSchema(def.items);
    const itemType = toEditableType(Array.isArray(itemSchema.type) ? itemSchema.type[0] : itemSchema.type);
    if (itemType === 'object' && itemSchema.properties) {
      const reqSet = new Set<string>(itemSchema.required || []);
      prop.items = {
        type: itemType,
        properties: Object.entries(itemSchema.properties).map(([n, d]) =>
          parseProperty(n, d, reqSet.has(n))
        ),
      };
    } else {
      prop.items = { type: itemType };
    }
  }

  return prop;
}

// Cuerpo del editor visual del schema:
//   - object / array  → SchemaBuilder de jsonjoy-builder.
//   - tipo primitivo  → mensaje de "valor único".
//   - sin schema      → selector de tipo (Object / Array) o "No properties".
const BaseSchemaVisualEditor = memo(({
  schema,
  onChange,
  readOnly = false,
}: BaseSchemaVisualEditorProps) => {
  const parsed = parseSchema(schema);

  return (
    <div className="flex flex-col gap-1 flex-1 min-h-0 h-full">
      {schema?.type ? (
        parsed.type === 'array' ? (
          <div className="h-full [&_.jsonjoy]:h-full [&_.jsonjoy]:min-h-[340px]">
            <SchemaFieldsEditor
              readOnly={readOnly}
              value={(schema.items || { type: 'object', properties: {} }) as JsonSchema}
              locale={es}
              onChange={
                onChange
                  ? (newItemsSchema) => {
                      onChange({
                        type: 'array',
                        items: newItemsSchema,
                      });
                    }
                  : () => {}
              }
            />
          </div>
        ) : parsed.type === 'object' ? (
          <div className="h-full [&_.jsonjoy]:h-full [&_.jsonjoy]:min-h-[340px]">
            <SchemaFieldsEditor
              readOnly={readOnly}
              value={schema as JsonSchema}
              locale={es}
              onChange={onChange || (() => {})}
            />
          </div>
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
      ) : (
        <>
          {!readOnly && (
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
          {readOnly && (
            <div className="py-6 text-center text-sm text-gray-400">
              No properties defined
            </div>
          )}
        </>
      )}
    </div>
  );
});

BaseSchemaVisualEditor.displayName = 'BaseSchemaVisualEditor';

export default BaseSchemaVisualEditor;
