import { memo } from 'react';
import VariableBadge from './VariableBadge';
import type { JsonSchemaFieldsProps, JsonSchemaNode } from './interface.JsonSchemaBuilder';

const typeColors: Record<string, string> = {
  string: '#3B82F6',
  number: '#8B5CF6',
  boolean: '#22C55E',
  object: '#F97316',
  array: '#EC4899',
  null: '#6B7280',
};

const typeLabels: Record<string, string> = {
  string: 'Text',
  number: 'Number',
  boolean: 'Yes/No',
  object: 'Object',
  array: 'List',
  null: 'Empty',
};

const asObjectSchema = (value: unknown): JsonSchemaNode | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonSchemaNode) : null;

const normalizeType = (type: JsonSchemaNode['type']): string => {
  const resolved = Array.isArray(type) ? type[0] : type;
  return resolved || 'string';
};

export const JsonSchemaFields = memo(({ schema, showLabel = true }: JsonSchemaFieldsProps) => {
  if (!schema) return null;

  // Handle array type schema
  const isArray = schema.type === 'array';
  const itemsSchema = isArray ? asObjectSchema(schema.items) : null;
  const properties = isArray ? itemsSchema?.properties : schema.properties;
  const required = isArray ? itemsSchema?.required : schema.required;

  if (!properties) return null;

  return (
    <div className='flex flex-col gap-2'>
      {showLabel && (

        <div className='flex items-center gap-2 mb-1'>
          <label className='text-sm font-semibold text-gray-800'>JSON Schema:</label>

          <VariableBadge label={isArray ? 'Array' : 'Object'} color="#99a1af" />
        </div>
      )}
      {Object.entries(properties).map(([fieldName, rawSchema]) => {
        const fieldSchema = asObjectSchema(rawSchema);
        const type = normalizeType(fieldSchema?.type);
        const typeColor = typeColors[type] || '#3B82F6';
        const typeLabel = typeLabels[type] || type.charAt(0).toUpperCase() + type.slice(1);

        return (
          <div key={`field-${fieldName}`} className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">›</span>
            <span className="text-gray-800">{fieldName}</span>
            <VariableBadge label={typeLabel} color={typeColor} />
            {required?.includes(fieldName) && (
              <VariableBadge label="Required" color="#EF4444" />
            )}
          </div>
        );
      })}
    </div>
  );
});

JsonSchemaFields.displayName = 'JsonSchemaFields';

export default JsonSchemaFields;
