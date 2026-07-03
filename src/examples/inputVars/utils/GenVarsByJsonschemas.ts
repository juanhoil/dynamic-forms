import type { InputVarOption } from '../components/InputVars';

type JsonSchemaType = 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array' | 'null';

export interface JsonSchemaNode {
  type?: JsonSchemaType | JsonSchemaType[];
  title?: string;
  label?: string;
  color?: string;
  group?: string;
  default?: unknown;
  properties?: Record<string, JsonSchemaNode>;
  items?: JsonSchemaNode | JsonSchemaNode[];
  [key: string]: unknown;
}

export interface GeneratedSchemaVariables {
  variables: InputVarOption[];
  text: string;
}

interface GenerateOptions {
  group?: string;
  color?: string;
  rootName?: string;
}

interface DataVariable {
  label: string;
  path: string;
  value: string;
  type: string;
}

const DEFAULT_GROUP = 'Schema';
const DEFAULT_COLOR = '#2563EB';

export function buildVariables(data: unknown): DataVariable[] {
  const variables: DataVariable[] = [];

  walk(data);

  return variables;

  function walk(value: unknown, path = '') {
    if (value === null || value === undefined) {
      variables.push({
        label: lastPathSegment(path),
        path,
        value: `{{${toCelExpression(path)}}}`,
        type: 'null',
      });
      return;
    }

    if (Array.isArray(value)) {
      variables.push({
        label: lastPathSegment(path),
        path,
        value: `{{${toCelExpression(path)}}}`,
        type: 'array',
      });

      if (value.length === 0) return;
      walk(value[0], `${path}[]`);
      return;
    }

    if (typeof value === 'object') {
      for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
        const next = path ? `${path}.${key}` : key;
        walk(val, next);
      }
      return;
    }

    variables.push({
      label: lastPathSegment(path),
      path,
      value: `{{${toCelExpression(path)}}}`,
      type: typeof value,
    });
  }
}

export function buildVariablesFromJsonSchema(
  schema: JsonSchemaNode,
  options: GenerateOptions = {}
): InputVarOption[] {
  const variables: InputVarOption[] = [];
  const rootType = getSchemaType(schema);
  const rootName = options.rootName || 'root';
  const root = rootType === 'array' ? schema : getObjectSchema(schema);

  if (!root) return variables;

  const rootGroup =
    options.group ||
    getMetadata(root, 'group') ||
    (typeof root.title === 'string' && root.title.trim() ? root.title : undefined) ||
    DEFAULT_GROUP;
  const rootColor = options.color || getMetadata(root, 'color') || DEFAULT_COLOR;

  if (rootType === 'array') {
    variables.push({
      label: getVariableLabel(rootName, root),
      path: rootName,
      value: `{{${rootName}}}`,
      type: 'array',
      color: rootColor,
      group: rootGroup,
      hasDefault: Object.prototype.hasOwnProperty.call(root, 'default'),
      defaultValue: root.default,
    });

    const itemSchema = getArrayItemSchema(root);
    if (itemSchema?.properties) {
      const itemGroup = getMetadata(itemSchema, 'group') || `${getVariableLabel(rootName, root)} items`;
      const itemColor = getMetadata(itemSchema, 'color') || rootColor;
      walkProperties(itemSchema.properties, `${rootName}[]`, { group: itemGroup, color: itemColor }, 1);
    }

    return variables;
  }

  if (!root.properties) return variables;

  walkProperties(root.properties, '', { group: rootGroup, color: rootColor }, 0);
  return variables;

  function walkProperties(
    properties: Record<string, JsonSchemaNode>,
    parentPath: string,
    inherited: GenerateOptions,
    arrayDepth: number
  ) {
    for (const [key, propertySchema] of Object.entries(properties)) {
      const nextPath = parentPath ? `${parentPath}.${key}` : key;
      const type = getSchemaType(propertySchema);
      const group = getMetadata(propertySchema, 'group') || inherited.group || DEFAULT_GROUP;
      const color = getMetadata(propertySchema, 'color') || inherited.color || DEFAULT_COLOR;

      variables.push({
        label: getVariableLabel(key, propertySchema),
        path: nextPath,
        value: `{{${toCelExpression(nextPath)}}}`,
        type,
        color,
        group,
        hasDefault: Object.prototype.hasOwnProperty.call(propertySchema, 'default'),
        defaultValue: propertySchema.default,
      });

      if (type === 'object' && propertySchema.properties) {
        walkProperties(propertySchema.properties, nextPath, { group, color }, arrayDepth);
      }

      if (type === 'array') {
        const itemSchema = getArrayItemSchema(propertySchema);
        if (itemSchema?.properties) {
          const itemGroup =
            getMetadata(itemSchema, 'group') || `${getVariableLabel(key, propertySchema)} items`;
          const itemColor = getMetadata(itemSchema, 'color') || color;
          walkProperties(
            itemSchema.properties,
            `${nextPath}[]`,
            { group: itemGroup, color: itemColor },
            arrayDepth + 1
          );
        }
      }
    }
  }
}

export function generateVariablesByJsonSchema(
  schema: JsonSchemaNode,
  options?: GenerateOptions
): GeneratedSchemaVariables {
  const variables = buildVariablesFromJsonSchema(schema, options);
  const text = variables.map((variable) => `${variable.label}: ${variable.value}`).join('\n');

  return { variables, text };
}

export function toCelExpression(path: string): string {
  if (!path) return '';

  const parts = path.split('.');

  const build = (index: number, baseExpression: string, arrayDepth: number): string => {
    const part = parts[index];
    if (!part) return baseExpression;

    if (part.endsWith('[]')) {
      const arrayName = part.slice(0, -2);
      const arrayExpression = joinPath(baseExpression, arrayName);
      const alias = String.fromCharCode(97 + arrayDepth);
      const itemExpression = build(index + 1, alias, arrayDepth + 1);

      return `${arrayExpression}.map(${alias}, ${itemExpression})`;
    }

    return build(index + 1, joinPath(baseExpression, part), arrayDepth);
  };

  return build(0, '', 0);
}

function getObjectSchema(schema: JsonSchemaNode): JsonSchemaNode | null {
  if (getSchemaType(schema) === 'array') return getArrayItemSchema(schema);
  return schema;
}

function getArrayItemSchema(schema: JsonSchemaNode): JsonSchemaNode | null {
  const items = schema.items;
  if (!items) return null;
  return Array.isArray(items) ? items[0] : items;
}

function getSchemaType(schema: JsonSchemaNode): string {
  const type = Array.isArray(schema.type) ? schema.type[0] : schema.type;
  if (type) return type;
  if (schema.properties) return 'object';
  if (schema.items) return 'array';
  return 'string';
}

function getVariableLabel(key: string, schema: JsonSchemaNode): string {
  return String(getMetadata(schema, 'label') || schema.title || key);
}

function getMetadata(schema: JsonSchemaNode, key: 'label' | 'color' | 'group'): string | undefined {
  const direct = schema[key];
  const extended = schema[`x-${key}`];
  const value = typeof direct === 'string' ? direct : extended;

  return typeof value === 'string' && value.trim() ? value : undefined;
}

function joinPath(baseExpression: string, key: string): string {
  return baseExpression ? `${baseExpression}.${key}` : key;
}

function lastPathSegment(path: string): string {
  return path.replace(/\[\]$/g, '').split('.').pop()?.replace(/\[\]$/g, '') || '';
}