// Copied from jsonjoy-builder to avoid internal import issues
// Original: node_modules/jsonjoy-builder/dist/lib/schema-inference.js

import type { JsonSchema, JsonSchemaLike, JsonValue } from './types';

const asObjectSchema = (schema: JsonSchemaLike): JsonSchema => {
  return typeof schema === 'boolean' ? {} : schema;
};

function mergeSchemas(
  schema1: JsonSchemaLike,
  schema2: JsonSchemaLike
): JsonSchemaLike {
  const s1 = asObjectSchema(schema1);
  const s2 = asObjectSchema(schema2);
  if (JSON.stringify(s1) === JSON.stringify(s2)) return schema1;
  if ('integer' === s1.type && 'number' === s2.type) {
    return { type: 'number' };
  }
  if ('number' === s1.type && 'integer' === s2.type) {
    return { type: 'number' };
  }
  const existingOneOf = Array.isArray(s1.oneOf) ? s1.oneOf : [s1];
  const newSchemaToAdd = s2;
  if (
    !existingOneOf.some(
      (s) => JSON.stringify(s) === JSON.stringify(newSchemaToAdd)
    )
  ) {
    const mergedOneOf = [...existingOneOf, newSchemaToAdd];
    const uniqueSchemas = [
      ...new Map(mergedOneOf.map((s) => [JSON.stringify(s), s])).values(),
    ];
    if (1 === uniqueSchemas.length) return uniqueSchemas[0];
    return { oneOf: uniqueSchemas };
  }
  return s1.oneOf ? s1 : { oneOf: [s1] };
}

function inferObjectSchema(obj: Record<string, JsonValue>): JsonSchema {
  const properties: Record<string, JsonSchemaLike> = {};
  const required: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    properties[key] = inferSchema(value);
    if (null != value) required.push(key);
  }
  return {
    type: 'object',
    properties,
    required: required.length > 0 ? required.sort() : undefined,
  };
}

function processArrayOfObjects(itemSchemas: JsonSchemaLike[]): JsonSchema {
  const mergedProperties: Record<string, JsonSchemaLike> = {};
  const propertyCounts: Record<string, number> = {};
  const totalItems = itemSchemas.length;
  for (const schema of itemSchemas) {
    const objSchema = asObjectSchema(schema);
    if (objSchema.properties) {
      for (const [key, value] of Object.entries(objSchema.properties)) {
        propertyCounts[key] = (propertyCounts[key] || 0) + 1;
        if (key in mergedProperties) {
          mergedProperties[key] = mergeSchemas(mergedProperties[key], value);
        } else {
          mergedProperties[key] = value;
        }
      }
    }
  }
  const requiredProps = Object.entries(propertyCounts)
    .filter(([, count]) => count === totalItems)
    .map(([key]) => key);
  return {
    type: 'object',
    properties: mergedProperties,
    required: requiredProps.length > 0 ? requiredProps.sort() : undefined,
  };
}

function inferArraySchema(obj: JsonValue[]): JsonSchema {
  if (0 === obj.length) return { type: 'array', items: {} };
  const itemSchemas = obj.map((item) => inferSchema(item));
  const firstItemSchema = asObjectSchema(itemSchemas[0]);
  const allSameType = itemSchemas.every(
    (schema) => asObjectSchema(schema).type === firstItemSchema.type
  );
  if (allSameType) {
    if ('object' === firstItemSchema.type) {
      const itemsSchema = processArrayOfObjects(itemSchemas);
      return { type: 'array', items: itemsSchema, minItems: 0 };
    }
    return { type: 'array', items: itemSchemas[0], minItems: 0 };
  }
  const uniqueSchemas = [
    ...new Map(itemSchemas.map((s) => [JSON.stringify(s), s])).values(),
  ];
  if (
    1 === uniqueSchemas.length &&
    'object' === asObjectSchema(uniqueSchemas[0]).type
  ) {
    return { type: 'array', items: uniqueSchemas[0], minItems: 0 };
  }
  return {
    type: 'array',
    items: 1 === uniqueSchemas.length ? uniqueSchemas[0] : { oneOf: uniqueSchemas },
    minItems: 0,
  };
}

function inferStringSchema(str: string): JsonSchema {
  const formats: Record<string, RegExp> = {
    date: /^\d{4}-\d{2}-\d{2}$/,
    'date-time':
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/,
    email: /^[^@]+@[^@]+\.[^@]+$/,
    uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    uri: /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i,
  };
  for (const [format, regex] of Object.entries(formats)) {
    if (regex.test(str)) return { type: 'string', format };
  }
  return { type: 'string' };
}

function inferNumberSchema(num: number): JsonSchema {
  return Number.isInteger(num) ? { type: 'integer' } : { type: 'number' };
}

function inferSchema(obj: JsonValue): JsonSchema {
  if (null === obj) return { type: 'null' };
  const type = Array.isArray(obj) ? 'array' : typeof obj;
  switch (type) {
    case 'object':
      return inferObjectSchema(obj as Record<string, JsonValue>);
    case 'array':
      return inferArraySchema(obj as JsonValue[]);
    case 'string':
      return inferStringSchema(obj as string);
    case 'number':
      return inferNumberSchema(obj as number);
    case 'boolean':
      return { type: 'boolean' };
    default:
      return {};
  }
}

export function createSchemaFromJson(jsonObject: JsonValue): JsonSchema {
  const inferredSchema = inferSchema(jsonObject);
  const rootSchema = asObjectSchema(inferredSchema);
  const finalSchema: JsonSchema = {
    title: 'Generated Schema',
    description: 'Generated from JSON data',
  };
  if ('object' === rootSchema.type || rootSchema.properties) {
    finalSchema.type = 'object';
    finalSchema.properties = rootSchema.properties;
    if (rootSchema.required) finalSchema.required = rootSchema.required;
  } else if ('array' === rootSchema.type || rootSchema.items) {
    finalSchema.type = 'array';
    finalSchema.items = rootSchema.items;
    if (undefined !== rootSchema.minItems) finalSchema.minItems = rootSchema.minItems;
    if (undefined !== rootSchema.maxItems) finalSchema.maxItems = rootSchema.maxItems;
  } else if (rootSchema.type) {
    finalSchema.type = 'object';
    finalSchema.properties = { value: rootSchema };
    finalSchema.required = ['value'];
    finalSchema.title = 'Generated Schema (Primitive Root)';
    finalSchema.description = 'Input was a primitive value, wrapped in an object.';
  } else {
    finalSchema.type = 'object';
  }
  return finalSchema;
}
