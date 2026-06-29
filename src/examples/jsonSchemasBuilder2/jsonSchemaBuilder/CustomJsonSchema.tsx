import { memo, useState } from 'react';
import { Brackets, Braces, FileBracesCorner, Trash2, Brain } from 'lucide-react';
import { SchemaInferencer } from 'jsonjoy-builder';
import Button from './Button';
import BaseSchemaVisualEditor, { typeColors, typeLabels } from './baseSchemaVisualEditor';

interface CustomJsonSchemaProps {
  schema: any;
  onChange?: (schema: any) => void;
  readOnly?: boolean;
}

// --- Component ---

const CustomJsonSchema = memo(({
  schema,
  onChange,
  readOnly = false,
}: CustomJsonSchemaProps) => {
  const [isInferencerOpen, setIsInferencerOpen] = useState(false);
  const schemaType = schema?.type as keyof typeof typeColors | undefined;

  return (
    <div className="w-full h-full flex flex-col bg-white border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border-b border-gray-200">
        {
          schemaType ?
            <>
              {schemaType === 'array' ? (
                <div className='flex gap-2 py-1.5'>
                  <Brackets className="w-4 h-4 text-pink-600 shrink-0" />
                  <span className="text-sm font-semibold text-gray-700 truncate">Array Schema</span>
                </div>
              ) : schemaType === 'object' ? (
                <div className='flex gap-2 py-1.5'>
                  <Braces className="w-4 h-4 text-orange-600 shrink-0" />
                  <span className="text-sm font-semibold text-gray-700 truncate">Object Schema</span>
                </div>
              ) : (
                <div className='flex gap-2 py-1.5 items-center'>
                  <FileBracesCorner className={`w-4 h-4 ${typeColors[schemaType].text} shrink-0`} />
                  <span className="text-sm font-semibold text-gray-700 truncate">{typeLabels[schemaType]} Schema</span>
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
            !readOnly &&
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
          {!readOnly && schema && (
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
      <BaseSchemaVisualEditor
        schema={schema}
        onChange={onChange}
        readOnly={readOnly}
      />
    </div>
  );
});

CustomJsonSchema.displayName = 'CustomJsonSchema';

export default CustomJsonSchema;
