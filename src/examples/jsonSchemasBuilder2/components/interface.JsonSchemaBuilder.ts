import type { CSSProperties, ReactNode } from 'react';
import type { InputVarOption } from '@/examples/inputVars/interface.inputVars';

export type JsonSchemaPrimitive = string | number | boolean | null;
export type JsonSchemaValue =
  | JsonSchemaPrimitive
  | JsonSchemaValue[]
  | { [key: string]: JsonSchemaValue };
export type valueType = 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array';
export type JsonSchemaPropertyType = valueType | 'null';

export interface JsonSchema {
  type?: JsonSchemaPropertyType | JsonSchemaPropertyType[];
  properties?: Record<string, JsonSchema | boolean>;
  items?: JsonSchema | JsonSchema[] | boolean;
  required?: string[];
  oneOf?: Array<JsonSchema | boolean>;
  anyOf?: Array<JsonSchema | boolean>;
  allOf?: Array<JsonSchema | boolean>;
  format?: string;
  title?: string;
  description?: string;
  default?: unknown;
  enum?: unknown[];
  enumNames?: string[];
  readOnly?: boolean;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  additionalProperties?: boolean | JsonSchema;
  [keyword: string]: unknown;
}

export type JsonSchemaNode = JsonSchema;

export type JsonSchemaEditableType = Exclude<JsonSchemaPropertyType, 'null'>;
export type JsonSchemaBuilderView = 'custom' | 'all';

export interface ParsedSchemaProperty {
  name: string;
  type: JsonSchemaEditableType;
  required: boolean;
  properties?: ParsedSchemaProperty[];
  items?: {
    type: JsonSchemaEditableType;
    properties?: ParsedSchemaProperty[];
  };
}

export interface ParsedSchema {
  type: JsonSchemaEditableType;
  properties: ParsedSchemaProperty[];
}

export interface JsonSchemaBuilderProps {
  schema: JsonSchemaNode | null;
  setSchema?: (schema: JsonSchemaNode | null) => void;
  readOnly?: boolean;
}

export interface CustomJsonSchemaProps {
  schema: JsonSchemaNode | null;
  onChange?: (schema: JsonSchemaNode | null) => void;
  readOnly?: boolean;
}

export interface BaseSchemaVisualEditorProps {
  schema: JsonSchemaNode | null;
  onChange?: (schema: JsonSchemaNode | null) => void;
  readOnly?: boolean;
}

export interface JsonSchemaFieldsProps {
  schema: JsonSchemaNode | null;
  showLabel?: boolean;
}

export interface PropertyExtraEditorProps {
  schema: JsonSchemaNode | null;
  onChange?: (schema: JsonSchemaNode | null) => void;
  field?: string;
  readOnly?: boolean;
  view?: JsonSchemaBuilderView;
  variables?: InputVarOption[];
  onSelectVariable?: (variable: InputVarOption) => void;
  onRemoveVariable?: (variable: InputVarOption) => void;
}

export interface VariableBadgeProps {
  label: string;
  onRemove?: () => void;
  color?: string;
  selected?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  title?: string;
}

export interface ButtonProps {
  title?: string;
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
  children: ReactNode;
  type?: 'button' | 'submit' | 'reset';
}
export const TYPES_BADGE_CLASSES: Record<string, InputVarTypeBadgeClass> = {
  string: { bg: 'bg-blue-100', text: 'text-blue-600' },
  number: { bg: 'bg-purple-100', text: 'text-purple-600' },
  integer: { bg: 'bg-purple-100', text: 'text-purple-600' },
  boolean: { bg: 'bg-green-100', text: 'text-green-700' },
  object: { bg: 'bg-orange-100', text: 'text-orange-700' },
  array: { bg: 'bg-pink-100', text: 'text-pink-700' },
};

export const TYPES_BADGE_COLORS: Record<string, InputVarTypeBadgeColor> = {
  string: { bg: '#dbeafe', text: '#2563eb' },
  number: { bg: '#ede9fe', text: '#7c3aed' },
  integer: { bg: '#ede9fe', text: '#7c3aed' },
  boolean: { bg: '#dcfce7', text: '#15803d' },
  object: { bg: '#ffedd5', text: '#c2410c' },
  array: { bg: '#fce7f3', text: '#db2777' },
};
export interface InputVarTypeBadgeClass {
  bg: string;
  text: string;
}

export interface InputVarTypeBadgeColor {
  bg: string;
  text: string;
}