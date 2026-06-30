declare module 'jsonjoy-builder' {
  import type { ComponentType } from 'react';

  export type JsonSchema = Record<string, unknown>;

  export const SchemaBuilder: ComponentType<{
    value: JsonSchema;
    onChange: (schema: JsonSchema) => void;
    readOnly?: boolean;
    className?: string;
    autoFocus?: boolean;
  }>;

  export const SchemaJsonEditor: ComponentType<{
    value: JsonSchema;
    onChange: (schema: JsonSchema) => void;
    readOnly?: boolean;
    className?: string;
    autoFocus?: boolean;
  }>;

  export const InferSchemaDialog: ComponentType<{
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onInfer: (schema: JsonSchema) => void;
    autoFocus?: boolean;
  }>;
}