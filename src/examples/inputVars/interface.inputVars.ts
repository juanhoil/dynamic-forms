import type { valueType } from '@/examples/jsonSchemasBuilder2/components/interface.JsonSchemaBuilder';
export type {
  InputVarTypeBadgeClass,
  InputVarTypeBadgeColor,
  valueType,
} from '@/examples/jsonSchemasBuilder2/components/interface.JsonSchemaBuilder';
export {
  TYPES_BADGE_CLASSES,
  TYPES_BADGE_COLORS,
} from '@/examples/jsonSchemasBuilder2/components/interface.JsonSchemaBuilder';

export type InputVarTypeFilter = valueType | `-${valueType}`;
export type InputVarTypeFilterValue = InputVarTypeFilter | InputVarTypeFilter[];
export type InputVarTypeOrderValue = valueType | valueType[];

export const FILTER_OPTIONS = {
  string: 'string',
  number: 'number',
  integer: 'integer',
  boolean: 'boolean',
  object: 'object',
  array: 'array',
  '-string': '-string',
  '-number': '-number',
  '-integer': '-integer',
  '-boolean': '-boolean',
  '-object': '-object',
  '-array': '-array',
} as const satisfies Record<InputVarTypeFilter, InputVarTypeFilter>;

export interface InputVarOption {
  label: string;
  value: string;
  path?: string;
  type?: valueType | string;
  color?: string;
  group?: string;
  hasDefault?: boolean;
  defaultValue?: unknown;
}