// ---------------------------------------------------------------------------
// Helpers puros de acceso/escritura por "pointer" y clonado. Compartidos por
// el motor de resolución. Sin dependencias externas.
// ---------------------------------------------------------------------------

type AnyRecord = Record<string, any>;

export const clone = <T>(value: T): T =>
  typeof structuredClone === 'function'
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));

export const resolvePointer = (data: any, pointer: any): any => {
  if (!pointer || pointer === '/' || pointer === '$root') return data;
  if (pointer === 'root' && Array.isArray(data)) return data;
  if (typeof pointer !== 'string') return pointer;
  return pointer
    .split('/')
    .filter(Boolean)
    .reduce((acc, key) => acc?.[key], data);
};

export const setValue = (obj: any, pointer: string, value: any): any => {
  const parts = pointer.split('/').filter(Boolean);
  if (!parts.length) return obj;

  const next = { ...obj };
  let current: AnyRecord = next;
  for (let index = 0; index < parts.length - 1; index++) {
    const part = parts[index];
    current[part] = { ...(current[part] || {}) };
    current = current[part];
  }
  current[parts[parts.length - 1]] = value;
  return next;
};

export const isEmptyValue = (value: any): boolean =>
  value === undefined ||
  value === null ||
  (typeof value === 'string' && value.trim() === '');
