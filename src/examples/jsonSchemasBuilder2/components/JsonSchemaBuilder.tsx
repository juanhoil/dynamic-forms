import React, { useState, useCallback, useEffect } from "react";
import { SchemaJsonEditor } from "jsonjoy-builder";
import CustomJsonSchema from "./CustomJsonSchema";
import type { JsonSchemaBuilderProps, JsonSchemaNode } from './interface.JsonSchemaBuilder';

// Limpiar description vacíos del schema recursivamente
function cleanEmptyDescriptions(schema: JsonSchemaNode | null): JsonSchemaNode | null {
  if (!schema || typeof schema !== 'object') {
    return schema;
  }

  if (Array.isArray(schema)) {
    return schema.map(cleanEmptyDescriptions);
  }

  const cleaned: JsonSchemaNode = {};
  for (const [key, value] of Object.entries(schema)) {
    if (key === 'description' && value === '') {
      // Skip empty descriptions
      continue;
    }
    cleaned[key] = cleanEmptyDescriptions(value);
  }

  return cleaned;
}

const JsonSchemaBuilder: React.FC<JsonSchemaBuilderProps> = ({ schema: externalSchema, setSchema, readOnly = false }) => {
  // Estado local para sincronización bidireccional entre paneles
  const [localSchema, setLocalSchema] = useState(externalSchema);

  // Sincronizar estado local cuando cambia el schema externo
  useEffect(() => {
    setLocalSchema(externalSchema);
  }, [externalSchema]);

  // Handler que actualiza estado local y propaga al padre
  const handleSchemaChange = useCallback((newSchema: JsonSchemaNode | null) => {
    // Limpiar descriptions vacíos antes de guardar
    const cleanedSchema = cleanEmptyDescriptions(newSchema);
    setLocalSchema(cleanedSchema);
    if (setSchema) {
      setSchema(cleanedSchema);
    }
  }, [setSchema]);

  return (
    <div className="flex flex-row w-full h-[50vh]">
      <div className={`w-1/2 h-full overflow-auto border-r border-gray-200 ${readOnly ? 'pointer-events-none' : ''} `}>
        <CustomJsonSchema
          schema={localSchema}
          onChange={handleSchemaChange}
          readOnly={readOnly}
        />
      </div>
      <div className={`w-1/2 h-full overflow-auto ${readOnly ? 'pointer-events-none' : ''} `}>
        <SchemaJsonEditor
          value={localSchema}
          onChange={handleSchemaChange}
          readOnly={readOnly}
          className="h-full!"
        />
      </div>
    </div>
  );
};

export default JsonSchemaBuilder;
