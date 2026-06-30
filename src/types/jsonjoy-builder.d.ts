declare module 'jsonjoy-builder' {
  import type { ComponentType } from 'react';

  export type JsonSchema = Record<string, unknown>;
  export const es: Record<string, string>;

  export const SchemaBuilder: ComponentType<{
    value: JsonSchema;
    onChange: (schema: JsonSchema) => void;
    readOnly?: boolean;
    className?: string;
    autoFocus?: boolean;
    locale?: Record<string, string>;
  }>;

  export const SchemaJsonEditor: ComponentType<{
    value: JsonSchema;
    onChange: (schema: JsonSchema) => void;
    readOnly?: boolean;
    className?: string;
    autoFocus?: boolean;
    locale?: Record<string, string>;
  }>;

  export const SchemaFieldsEditor: ComponentType<{
    value: JsonSchema;
    onChange: (schema: JsonSchema) => void;
    readOnly?: boolean;
    className?: string;
    autoFocus?: boolean;
    locale?: Record<string, string>;
  }>;

  export const InferSchemaDialog: ComponentType<{
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onInfer: (schema: JsonSchema) => void;
    autoFocus?: boolean;
  }>;
}