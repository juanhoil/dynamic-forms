// Copied from jsonjoy-builder to avoid internal import issues
// Original: node_modules/jsonjoy-builder/dist/lib/schema-inference.js

const asObjectSchema = (schema) => {
  return typeof schema === 'boolean' ? {} : schema;
};

function mergeSchemas(schema1, schema2) {
  const s1 = asObjectSchema(schema1);
  const s2 = asObjectSchema(schema2);
  if (JSON.stringify(s1) === JSON.stringify(s2)) return schema1;
  if ("integer" === s1.type && "number" === s2.type) {
    return { type: "number" };
  }
  if ("number" === s1.type && "integer" === s2.type) {
    return { type: "number" };
  }
  const existingOneOf = Array.isArray(s1.oneOf) ? s1.oneOf : [s1];
  const newSchemaToAdd = s2;
  if (!existingOneOf.some((s) => JSON.stringify(s) === JSON.stringify(newSchemaToAdd))) {
    const mergedOneOf = [...existingOneOf, newSchemaToAdd];
    const uniqueSchemas = [...new Map(mergedOneOf.map((s) => [JSON.stringify(s), s])).values()];
    if (1 === uniqueSchemas.length) return uniqueSchemas[0];
    return { oneOf: uniqueSchemas };
  }
  return s1.oneOf ? s1 : { oneOf: [s1] };
}

function inferObjectSchema(obj) {
  const properties = {};
  const required = [];
  for (const [key, value] of Object.entries(obj)) {
    properties[key] = inferSchema(value);
    if (null != value) required.push(key);
  }
  return {
    type: "object",
    properties,
    required: required.length > 0 ? required.sort() : void 0
  };
}

function processArrayOfObjects(itemSchemas) {
  const mergedProperties = {};
  const propertyCounts = {};
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
  const requiredProps = Object.entries(propertyCounts).filter(([_, count]) => count === totalItems).map(([key, _]) => key);
  return {
    type: "object",
    properties: mergedProperties,
    required: requiredProps.length > 0 ? requiredProps.sort() : void 0
  };
}

function inferArraySchema(obj) {
  if (0 === obj.length) return { type: "array", items: {} };
  const itemSchemas = obj.map((item) => inferSchema(item));
  const firstItemSchema = asObjectSchema(itemSchemas[0]);
  const allSameType = itemSchemas.every((schema) => asObjectSchema(schema).type === firstItemSchema.type);
  if (allSameType) {
    if ("object" === firstItemSchema.type) {
      const itemsSchema = processArrayOfObjects(itemSchemas);
      return { type: "array", items: itemsSchema, minItems: 0 };
    }
    return { type: "array", items: itemSchemas[0], minItems: 0 };
  }
  const uniqueSchemas = [...new Map(itemSchemas.map((s) => [JSON.stringify(s), s])).values()];
  if (1 === uniqueSchemas.length && "object" === asObjectSchema(uniqueSchemas[0]).type) {
    return { type: "array", items: uniqueSchemas[0], minItems: 0 };
  }
  return {
    type: "array",
    items: 1 === uniqueSchemas.length ? uniqueSchemas[0] : { oneOf: uniqueSchemas },
    minItems: 0
  };
}

function inferStringSchema(str) {
  const formats = {
    date: /^\d{4}-\d{2}-\d{2}$/,
    "date-time": /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/,
    email: /^[^@]+@[^@]+\.[^@]+$/,
    uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    uri: /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i
  };
  for (const [format, regex] of Object.entries(formats)) {
    if (regex.test(str)) return { type: "string", format };
  }
  return { type: "string" };
}

function inferNumberSchema(num) {
  return Number.isInteger(num) ? { type: "integer" } : { type: "number" };
}

function inferSchema(obj) {
  if (null === obj) return { type: "null" };
  const type = Array.isArray(obj) ? "array" : typeof obj;
  switch (type) {
    case "object":
      return inferObjectSchema(obj);
    case "array":
      return inferArraySchema(obj);
    case "string":
      return inferStringSchema(obj);
    case "number":
      return inferNumberSchema(obj);
    case "boolean":
      return { type: "boolean" };
    default:
      return {};
  }
}

export function createSchemaFromJson(jsonObject) {
  const inferredSchema = inferSchema(jsonObject);
  const rootSchema = asObjectSchema(inferredSchema);
  const finalSchema = {
    title: "Generated Schema",
    description: "Generated from JSON data"
  };
  if ("object" === rootSchema.type || rootSchema.properties) {
    finalSchema.type = "object";
    finalSchema.properties = rootSchema.properties;
    if (rootSchema.required) finalSchema.required = rootSchema.required;
  } else if ("array" === rootSchema.type || rootSchema.items) {
    finalSchema.type = "array";
    finalSchema.items = rootSchema.items;
    if (void 0 !== rootSchema.minItems) finalSchema.minItems = rootSchema.minItems;
    if (void 0 !== rootSchema.maxItems) finalSchema.maxItems = rootSchema.maxItems;
  } else if (rootSchema.type) {
    finalSchema.type = "object";
    finalSchema.properties = { value: rootSchema };
    finalSchema.required = ["value"];
    finalSchema.title = "Generated Schema (Primitive Root)";
    finalSchema.description = "Input was a primitive value, wrapped in an object.";
  } else {
    finalSchema.type = "object";
  }
  return finalSchema;
}
