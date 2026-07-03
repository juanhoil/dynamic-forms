import React, { useEffect, useMemo, useRef, useState } from 'react';
import { findAllArraySources } from '../utils/schema';
import { esc, hl } from '../ui/text';
import { TrashIcon, PlayIcon, PlusIcon, CheckIcon } from '../ui/icons';
import InputVars from '@/examples/inputVars/components/InputVars';
import { buildVariablesFromJsonSchema } from '@/examples/inputVars/utils/GenVarsByJsonschemas';
import { resolveItemTemplate, resolveSource } from '../hooks/useJsonHyperSchema';

const responseVarOptions = (schema) =>
  buildVariablesFromJsonSchema(schema, {
    group: 'Response',
    color: '#1565c0',
  });


const itemVarOptions = (itemSchema) =>
  buildVariablesFromJsonSchema(itemSchema, {
    group: 'Item',
    color: '#059669',
  });

const uniqueByValue = (variables) =>
  Array.from(new Map(variables.map((variable) => [variable.value, variable])).values());

const nonArrayVars = (variables) =>
  variables.filter(
    (variable) =>
      variable.type?.toLowerCase() !== 'array' &&
      !variable.path?.includes('[]')
  );

function FieldMappingBlock({
  field,
  asgn,
  schemaRaw,
  baseSchema,
  onTypeChange,
  onArraySourceChange,
  onValueChange,
  onRemove,
}) {
  const arraySources = useMemo(() => findAllArraySources(schemaRaw), [schemaRaw]);
  const responseVars = useMemo(() => responseVarOptions(schemaRaw), [schemaRaw]);
  const defaultVars = useMemo(
    () => uniqueByValue([...nonArrayVars(responseVars)]),
    [responseVars]
  );

  const def = baseSchema[field];
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm" id={`xrm-fmrow-${field}`}>
      <div className="flex items-center gap-3">
        <span className="font-mono text-sm font-semibold text-gray-900">{field}</span>
        <span className="text-xs text-gray-500">{esc(def?.title || def?.type || '')}</span>
        <div className="flex-1" />
        <button
          className="rounded-md p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
          title="Quitar mapeo"
          onClick={onRemove}
          type="button"
        >
          <TrashIcon />
        </button>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <span className="w-28 shrink-0 text-right text-xs font-medium text-gray-500">Tipo</span>
        <select
          className="w-full max-w-[220px] rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          value={asgn.type}
          onChange={(e) => onTypeChange(e.target.value)}
        >
          <option value="default">default (valor plano)</option>
          <option value="select">select (array)</option>
        </select>
      </div>

      {asgn.type === 'default' ? (
        <div className="mt-3 flex items-center gap-3">
          <span className="w-28 shrink-0 text-right text-xs font-medium text-gray-500">Valor</span>
          <InputVars
            type="input"
            value={asgn.sourceTpl || ''}
            variables={defaultVars}
            onChange={(next) => onValueChange('sourceTpl', next)}
            placeholder="ej: {{nombre}} {{apaterno}}"
          />
          <button
            className="rounded-md px-2 py-1 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
            title="Limpiar valor"
            onClick={() => onValueChange('sourceTpl', '')}
            type="button"
          >
            ✕
          </button>
        </div>
      ) : (
        <>
          <div className="mt-3 flex items-center gap-3">
            <span className="w-28 shrink-0 text-right text-xs font-medium text-gray-500">Array fuente</span>
            <select
              className="w-full max-w-[220px] rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              value={asgn.enumSource || ''}
              onChange={(e) => onArraySourceChange(e.target.value)}
            >
              {arraySources.length === 0 ? (
                <option value="">— no hay arrays en este schema —</option>
              ) : (
                arraySources.map((a) => (
                  <option key={a.key} value={a.key}>
                    {a.key === 'root' ? 'root (la respuesta es un array)' : a.key}
                  </option>
                ))
              )}
            </select>
          </div>

          {(() => {
            const src = arraySources.find((a) => a.key === asgn.enumSource);
            if (!src) return <div className="mt-3 text-xs text-gray-500">No hay arrays disponibles en este target.</div>;
            if (src.isSimple) {
              return (
                <div className="mt-3 flex items-center gap-2 text-xs text-emerald-600">
                  <CheckIcon />
                  Array de valores simples detectado. El enum y el label salen del path seleccionado.
                </div>
              );
            }
            return (
              <>
                <div className="mt-3 flex items-center gap-2 text-xs text-emerald-600">
                  <CheckIcon />
                  Array de objetos detectado
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <span className="w-28 shrink-0 text-right text-xs font-medium text-gray-500">Id</span>
                  <InputVars
                    type="input"
                    value={asgn.valueTpl || ''}
                    variables={uniqueByValue([...itemVarOptions(src.itemSchema)])}
                    onChange={(next) => onValueChange('valueTpl', next)}
                    placeholder="ej: {{guid}}"
                  />
                  <button
                    className="rounded-md px-2 py-1 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                    title="Limpiar value"
                    onClick={() => onValueChange('valueTpl', '')}
                    type="button"
                  >
                    ✕
                  </button>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <span className="w-28 shrink-0 text-right text-xs font-medium text-gray-500">label</span>
                  <InputVars
                    type="input"
                    value={asgn.labelTpl || ''}
                    variables={uniqueByValue([...itemVarOptions(src.itemSchema)])}
                    onChange={(next) => onValueChange('labelTpl', next)}
                    placeholder="ej: {{nombre}} {{apaterno}}"
                  />
                  <button
                    className="rounded-md px-2 py-1 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                    title="Limpiar label"
                    onClick={() => onValueChange('labelTpl', '')}
                    type="button"
                  >
                    ✕
                  </button>
                </div>
              </>
            );
          })()}
        </>
      )}

      <div className="mt-3 flex items-center gap-2 text-xs text-sky-600">
        <CheckIcon />
        Puedes escribir texto libre o combinar variables {`{{a}} {{b}}`}
      </div>
    </div>
  );
}

const ResponseMappingEditor = ({
  schema,
  testJSON,
  inputValues = {},
  assignments,
  onAssignmentsChange,
  baseSchema,
}) => {
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showTestResult, setShowTestResult] = useState(false);
  const [testResultHTML, setTestResultHTML] = useState('');
  const [testError, setTestError] = useState('');
  const addFieldRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (addFieldRef.current && !addFieldRef.current.contains(e.target)) {
        setShowAddMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const updateDraft = (field, key, value) => {
    onAssignmentsChange((prev) => ({ ...prev, [field]: { ...prev[field], [key]: value } }));
  };

  const onFieldTypeChange = (field, newType) => {
    if (newType === 'default') {
      onAssignmentsChange((prev) => ({
        ...prev,
        [field]: {
          type: 'default',
          sourceTpl: prev[field]?.sourceTpl || '',
        },
      }));
      return;
    }

    const arraySources = findAllArraySources(schema);
    const first = arraySources[0];
    onAssignmentsChange((prev) => {
      const current = prev[field] || {};
      return {
        ...prev,
        [field]: {
          type: 'select',
          enumSource: current.enumSource || first?.key || '',
          valueTpl: current.valueTpl || '',
          labelTpl: current.labelTpl || '',
        },
      };
    });
  };

  const onFieldArraySourceChange = (field, key) => {
    onAssignmentsChange((prev) => ({
      ...prev,
      [field]: {
        ...prev[field],
        enumSource: key,
      },
    }));
  };

  const removeField = (field) => {
    onAssignmentsChange((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const addField = (field) => {
    onAssignmentsChange((prev) => ({ ...prev, [field]: { type: 'default', sourceTpl: '' } }));
    setShowAddMenu(false);
  };

  const handleRunTest = async () => {
    setShowTestResult(true);
    const trimmed = testJSON.trim();
    if (!trimmed) {
      setTestError('No hay JSON de prueba. Ejecuta HTTP para obtener datos de respuesta.');
      setTestResultHTML('');
      return;
    }

    let raw;
    try {
      raw = JSON.parse(trimmed);
    } catch (e) {
      setTestError(`JSON inválido: ${e.message}`);
      setTestResultHTML('');
      return;
    }

    setTestError('');
    const applied = {};
    for (const [field, asgn] of Object.entries(assignments)) {
      if (!asgn) continue;
      const def = { ...baseSchema[field] };
      if (asgn.type === 'default') {
        def.default = await resolveSource(raw, asgn.sourceTpl, inputValues);
      } else if (asgn.type === 'select') {
        const sourceArray = await resolveSource(
          raw,
          { path: asgn.enumSource || 'root' },
          inputValues
        );
        const arr = Array.isArray(sourceArray) ? sourceArray : [];
        const src = findAllArraySources(schema).find((source) => source.key === asgn.enumSource);
        if (src?.isSimple || !asgn.valueTpl || !asgn.labelTpl) {
          def.enum = arr;
          def.enumNames = arr;
        } else {
          def.enum = await Promise.all(
            arr.map((item) => resolveItemTemplate(item, asgn.valueTpl, raw, inputValues))
          );
          def.enumNames = await Promise.all(
            arr.map((item) => resolveItemTemplate(item, asgn.labelTpl, raw, inputValues))
          );
        }
      }
      applied[field] = def;
    }
    setTestResultHTML(hl(JSON.stringify(applied, null, 2)));
  };

  const mappedFields = Object.keys(assignments);
  const availableFields = Object.entries(baseSchema).filter(([field]) => !assignments[field]);

  return (
    <div className="flex max-h-[40vh] flex-col gap-4 overflow-y-auto rounded-xl border border-gray-200 bg-gray-50 p-4">
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500">Elige qué campos del formulario alimenta este endpoint</span>
        <div className="flex-1" />
        <button
          className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
          onClick={handleRunTest}
          type="button"
        >
          <PlayIcon />
          Probar
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {!mappedFields.length ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-5 text-center text-sm text-gray-500">
            Ningún campo mapeado todavía. Usa "Mapear campo del formulario" para empezar.
          </div>
        ) : (
          mappedFields.map((field) => (
            <FieldMappingBlock
              key={field}
              field={field}
              asgn={assignments[field]}
              schemaRaw={schema}
              baseSchema={baseSchema}
              onTypeChange={(type) => onFieldTypeChange(field, type)}
              onArraySourceChange={(key) => onFieldArraySourceChange(field, key)}
              onValueChange={(key, value) => updateDraft(field, key, value)}
              onRemove={() => removeField(field)}
            />
          ))
        )}
      </div>

      <div className="relative" ref={addFieldRef}>
        <button
          className="inline-flex items-center gap-2 rounded-lg border border-dashed border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-600 transition hover:border-blue-400 hover:text-blue-600"
          onClick={() => setShowAddMenu((p) => !p)}
          type="button"
        >
          <PlusIcon size={11} />
          Mapear campo del formulario
        </button>
        {showAddMenu && (
          <div className="absolute left-0 top-[calc(100%+6px)] z-30 max-h-64 w-64 overflow-y-auto rounded-xl border border-gray-200 bg-white py-1 shadow-xl">
            {!availableFields.length ? (
              <div className="px-3 py-3 text-center text-sm text-gray-500">Todos los campos ya están mapeados.</div>
            ) : (
              availableFields.map(([field, def]) => (
                <button
                  key={field}
                  className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left font-mono text-sm text-gray-800 transition hover:bg-blue-50 hover:text-blue-700"
                  onClick={() => addField(field)}
                  type="button"
                >
                  <span>{field}</span>
                  <span className="font-sans text-xs text-gray-400">{esc(def.title || def.type)}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {showTestResult && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
            Resultado aplicado al schema base
          </div>
          {testError ? (
            <div className="text-sm text-red-600">{esc(testError)}</div>
          ) : (
            <div
              className="whitespace-pre-wrap break-words font-mono text-xs leading-6 text-gray-800"
              dangerouslySetInnerHTML={{ __html: testResultHTML }}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default ResponseMappingEditor;
