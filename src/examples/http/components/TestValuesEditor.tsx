import React, { useState, useEffect, useMemo } from 'react';
import { syncTestValues, getDeclaredVariables } from '../utils/syncTestValues';
import type { InputVarOption } from '@/examples/inputVars/components/InputVars';
import type { HttpConfig } from '../utils/types';

interface TestValuesEditorProps {
  config?: Partial<HttpConfig>;
  testValues?: Record<string, unknown>;
  values?: Record<string, unknown>;
  variables?: InputVarOption[];
  onChange: (values: Record<string, unknown>) => void;
}

interface TestValueVariable {
  name: string;
  path: string;
  type: string;
  color?: string;
  group?: string;
  hasDefault?: boolean;
  defaultValue?: unknown;
}

// ---------------------------------------------------------------------------
// TestValuesEditor
//
// Renders the concrete values used to resolve `{{...}}` tokens at request time.
//
// Receives the whole request `config` and derives, on its own, the declared
// variables (getDeclaredVariables) and the mapped values (syncTestValues), so
// the parent does not need to pre-compute anything.
//
// Two views:
//   - "Fields" (default): one row per declared variable showing its name, a
//     type badge and a value input typed accordingly. Values are written back
//     into testValues by name.
//   - "Raw JSON": the full testValues object as editable JSON, for power users
//     or values not tied to a declared variable.
// ---------------------------------------------------------------------------

const TYPE_COLORS = {
  string:  { bg: '#e3f2fd', fg: '#1565c0' },
  number:  { bg: '#e8f5e9', fg: '#2e7d32' },
  integer: { bg: '#e8f5e9', fg: '#2e7d32' },
  boolean: { bg: '#f3e5f5', fg: '#6a1b9a' },
  object:  { bg: '#fff3e0', fg: '#e65100' },
  array:   { bg: '#e0f2f1', fg: '#00695c' }
};

const TypeBadge = ({ type }) => {
  const c = TYPE_COLORS[type] || { bg: '#eee', fg: '#555' };
  return (
    <span
      style={{
        padding: '0.1rem 0.45rem',
        borderRadius: '999px',
        backgroundColor: c.bg,
        color: c.fg,
        fontSize: '0.65rem',
        fontWeight: 700,
        fontFamily: 'monospace',
        textTransform: 'lowercase'
      }}
    >
      {type}
    </span>
  );
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.4rem 0.6rem',
  border: '1px solid #ddd',
  borderRadius: '4px',
  fontSize: '0.8rem',
  fontFamily: 'monospace',
  outline: 'none',
  boxSizing: 'border-box'
};

const emptyForType = (type: string) => {
  switch (type) {
    case 'number':
    case 'integer':
      return 0;
    case 'boolean':
      return false;
    case 'array':
      return [];
    case 'object':
      return {};
    default:
      return '';
  }
};

const getNameFromVariable = (variable: InputVarOption) =>
  variable.path || variable.value?.replace(/^\{\{|\}\}$/g, '') || variable.label;

const getPathParts = (path: string): string[] =>
  path
    .replace(/\[\]/g, '')
    .split('.')
    .map((part) => part.trim())
    .filter(Boolean);

const getValueAtPath = (values: Record<string, unknown>, path: string): unknown => {
  const parts = getPathParts(path);
  if (parts.length === 0) return undefined;

  return parts.reduce<unknown>((current, part) => {
    if (current === null || typeof current !== 'object') return undefined;
    return (current as Record<string, unknown>)[part];
  }, values);
};

const setValueAtPath = (
  values: Record<string, unknown>,
  path: string,
  value: unknown
): Record<string, unknown> => {
  const parts = getPathParts(path);
  if (parts.length === 0) return values;

  const setNested = (current: unknown, index: number): unknown => {
    const key = parts[index];
    const source =
      current && typeof current === 'object' && !Array.isArray(current)
        ? (current as Record<string, unknown>)
        : {};

    if (index === parts.length - 1) {
      return { ...source, [key]: value };
    }

    return { ...source, [key]: setNested(source[key], index + 1) };
  };

  return setNested(values, 0) as Record<string, unknown>;
};

const hexToRgba = (hex?: string, alpha = 0.14) => {
  if (!hex || !/^#([0-9a-fA-F]{6})$/.test(hex)) return 'transparent';
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const mapInputVariables = (variables: InputVarOption[]) =>
  variables.map((variable) => ({
    name: getNameFromVariable(variable),
    path: getNameFromVariable(variable),
    type: variable.type || 'string',
    color: variable.color,
    group: variable.group,
    hasDefault: variable.hasDefault,
    defaultValue: variable.defaultValue,
  }));

const mapDeclaredVariables = (variables): TestValueVariable[] =>
  variables.map((variable) => ({
    name: variable.name,
    path: variable.name,
    type: variable.type,
    hasDefault: variable.hasDefault,
    defaultValue: variable.default,
  }));

// Value input for object/array variables: edits the value as JSON with a local
// draft so the user can type invalid intermediate states without losing focus.
const JsonValueInput = ({ value, onChange }) => {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState(() => JSON.stringify(value ?? null));
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!focused) {
      setDraft(JSON.stringify(value ?? null));
      setError(false);
    }
  }, [value, focused]);

  return (
    <input
      value={draft}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onChange={(e) => {
        const text = e.target.value;
        setDraft(text);
        try {
          onChange(JSON.parse(text));
          setError(false);
        } catch {
          setError(true);
        }
      }}
      style={{ ...inputStyle, borderColor: error ? '#d32f2f' : '#ddd' }}
    />
  );
};

const ValueInput = ({ type, value, onChange }) => {
  if (type === 'boolean') {
    return (
      <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem' }}>
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span style={{ color: '#666' }}>{String(!!value)}</span>
      </label>
    );
  }

  if (type === 'number' || type === 'integer') {
    return (
      <input
        type="number"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        style={inputStyle}
      />
    );
  }

  if (type === 'object' || type === 'array') {
    return <JsonValueInput value={value} onChange={onChange} />;
  }

  return (
    <input
      type="text"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder="agrega un valor según el tipo"
      style={inputStyle}
    />
  );
};

const TestValuesEditor = ({
  config = {},
  testValues,
  values: valuesProp,
  variables: variablesProp = [],
  onChange,
}: TestValuesEditorProps) => {
  const values = valuesProp || testValues || {};
  const variables = useMemo(
    () =>
      variablesProp.length > 0
        ? mapInputVariables(variablesProp)
        : mapDeclaredVariables(getDeclaredVariables(config)),
    [config, variablesProp]
  );
  const variableGroups = useMemo(() => {
    const groups = new Map<string, typeof variables>();
    variables.forEach((variable) => {
      const group = variable.group || 'Variables';
      groups.set(group, [...(groups.get(group) || []), variable]);
    });
    return Array.from(groups.entries());
  }, [variables]);

  // Mapped values used to render the fields: preserves user edits and falls
  // back to schema defaults / type-based empties for newly declared variables.
  const mappedValues = useMemo(() => {
    if (variablesProp.length === 0) return syncTestValues(config, values);

    return variables.reduce<Record<string, unknown>>((next, variable) => {
      const currentValue = getValueAtPath(values, variable.path);
      return setValueAtPath(
        next,
        variable.path,
        currentValue !== undefined
          ? currentValue
          : variable.hasDefault
          ? variable.defaultValue
          : emptyForType(variable.type)
      );
    }, {});
  }, [config, values, variables, variablesProp.length]);

  const setValue = (path, val) => onChange(setValueAtPath(mappedValues, path, val));

  return (
    <div>
      <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.7rem', color: '#666' }}>
        Valores concretos para probar la request. Las entradas salen del
        formulario y de External Variables; el body consume esos valores.
      </p>

      {variables.length === 0 ? (
        <div style={{ fontSize: '0.75rem', color: '#999', padding: '0.5rem 0' }}>
          No hay variables declaradas todavía. Declara propiedades en los otros
          tabs y aparecerán aquí para asignarles un valor.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {variableGroups.map(([group, groupVariables]) => {
            const groupColor = groupVariables[0]?.color;
            return (
              <div key={group} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <div
                  style={{
                    alignSelf: 'flex-start',
                    padding: '0.2rem 0.55rem',
                    borderRadius: '999px',
                    backgroundColor: hexToRgba(groupColor),
                    border: groupColor
                      ? `1px solid ${hexToRgba(groupColor, 0.35)}`
                      : '1px solid #e5e7eb',
                    color: groupColor || '#555',
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                  }}
                >
                  {group}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {groupVariables.map((v) => (
                    <div
                      key={`${group}:${v.name}`}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '180px 70px 1fr',
                        gap: '0.5rem',
                        alignItems: 'center'
                      }}
                    >
                      <span
                        title={
                          v.hasDefault
                            ? `${v.path} default: ${JSON.stringify(v.defaultValue)}`
                            : v.path
                        }
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          fontFamily: 'monospace',
                          fontSize: '0.8rem',
                          color: v.color || '#333',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          backgroundColor: hexToRgba(v.color),
                          border: v.color
                            ? `1px solid ${hexToRgba(v.color, 0.35)}`
                            : '1px solid transparent',
                          borderRadius: '6px',
                          padding: '0.25rem 0.5rem',
                        }}
                      >
                        <span
                          style={{
                            minWidth: 0,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {v.path}
                        </span>
                        {v.hasDefault && (
                          <span
                            style={{
                              flexShrink: 0,
                              padding: '0.05rem 0.35rem',
                              borderRadius: '999px',
                              backgroundColor: '#fef3c7',
                              color: '#92400e',
                              border: '1px solid #fcd34d',
                              fontFamily: 'system-ui',
                              fontSize: '0.62rem',
                              fontWeight: 800,
                              textTransform: 'uppercase',
                            }}
                          >
                            default
                          </span>
                        )}
                      </span>
                      <TypeBadge type={v.type} />
                      <ValueInput
                        type={v.type}
                        value={getValueAtPath(mappedValues, v.path)}
                        onChange={(val) => setValue(v.path, val)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TestValuesEditor;
