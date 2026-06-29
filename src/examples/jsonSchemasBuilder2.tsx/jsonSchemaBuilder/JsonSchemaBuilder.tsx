import React, { useState, useCallback, useEffect } from "react";
import { JsonSchemaVisualizer } from "jsonjoy-builder";
import "jsonjoy-builder/styles.css";
import CustomJsonSchema from "./CustomJsonSchema";

interface JsonSchemaBuilderProps {
  schema: any;
  setSchema?: (schema: any) => void;
  editable?: boolean;
  /**
   * Keyword adicional del JSON Schema a editar por propiedad (ej. 'default').
   * jsonjoy-builder no lo soporta de forma nativa.
   */
  extraField?: string;
}

// Limpiar description vacíos del schema recursivamente
function cleanEmptyDescriptions(schema: any): any {
  if (!schema || typeof schema !== 'object') {
    return schema;
  }

  if (Array.isArray(schema)) {
    return schema.map(cleanEmptyDescriptions);
  }

  const cleaned: any = {};
  for (const [key, value] of Object.entries(schema)) {
    if (key === 'description' && value === '') {
      // Skip empty descriptions
      continue;
    }
    cleaned[key] = cleanEmptyDescriptions(value);
  }

  return cleaned;
}

const JsonSchemaBuilder: React.FC<JsonSchemaBuilderProps> = ({ schema: externalSchema, setSchema, editable = true, extraField }) => {
  // Estado local para sincronización bidireccional entre paneles
  const [localSchema, setLocalSchema] = useState(externalSchema);

  // Sincronizar estado local cuando cambia el schema externo
  useEffect(() => {
    setLocalSchema(externalSchema);
  }, [externalSchema]);

  // Handler que actualiza estado local y propaga al padre
  const handleSchemaChange = useCallback((newSchema: any) => {
    // Limpiar descriptions vacíos antes de guardar
    const cleanedSchema = cleanEmptyDescriptions(newSchema);
    setLocalSchema(cleanedSchema);
    if (setSchema) {
      setSchema(cleanedSchema);
    }
  }, [setSchema]);

  return (
    <div className="flex flex-row w-full h-[50vh]">
      <div className={`w-1/2 h-full overflow-auto border-r border-gray-200 ${editable ? '' : 'pointer-events-none'} `}>
        <CustomJsonSchema
          schema={localSchema}
          onChange={handleSchemaChange}
          readonly={!editable}
          extraField={extraField}
        />
      </div>
      <div className={`w-1/2 h-full overflow-auto ${editable ? '' : 'pointer-events-none'} `}>
        <JsonSchemaVisualizer
          schema={localSchema}
          onChange={handleSchemaChange}
          className="h-full!"
        />
      </div>
    </div>
  );
};

export default JsonSchemaBuilder;
