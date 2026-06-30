import React, { useEffect, useState } from 'react';
import { parsedSchema } from '../utils/schema';
import { sampleFromSchema } from '../utils/sample';
import {
  ChevronIcon,
  CloseIcon,
} from '../ui/icons';
import { shcemaNewDireccion as schemaDireccion } from '../../shcemas';
import BaseConfigHTTP from '@/examples/http/components/BaseConfigHTTP';
import ResponseMappingEditor from './ResponseMappingEditor';

const BASE_SCHEMA = schemaDireccion.properties || {};

const responseSchemaToString = (schema) =>
  schema && typeof schema === 'object' && Object.keys(schema).length
    ? JSON.stringify(schema, null, 2)
    : '';

const parseMaybeJSON = (value) => {
  if (!value || typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
};

const targetToHttpConfig = (target) => {
  const request = target?.request || {};
  return {
    id: target?.id || 'target-draft',
    name: target?.name || '',
    description: target?.description || '',
    dataRole: target?.dataRole || 'init',
    response: {
      jsonSchema: parsedSchema(target?.schema || ''),
      testValues: parseMaybeJSON(target?.testJSON),
      responseMapping: parseMaybeJSON(target?.responseMapping),
    },
    request: {
      method: target?.method || request.method || 'GET',
      url: target?.url || request.url || '',
      headers: request.headers || {},
      body: request.body || {},
      queryVariables: request.queryVariables || {},
      externalVariables: request.externalVariables || {},
      testValues: request.testValues || {},
    },
  };
};

// ─────────────────────────────────────────────────────────────
// Modal principal
// ─────────────────────────────────────────────────────────────

export default function TargetModal({ open, target, onClose, onSave, onDelete }) {
  const [link, setLink] = useState(() => target);
  const [schema, setSchema] = useState('');
  const [testJSON, setTestJSON] = useState('');
  const [assignments, setAssignments] = useState({});
  const [openAcc, setOpenAcc] = useState({ http: true, responseMapping: false });

  useEffect(() => {
    if (!open) return;
    const nextHttpConfig = targetToHttpConfig(target);
    setLink(nextHttpConfig);
    setSchema(target?.schema || '');
    const targetSchemaRaw = target?.schema || '';
    const initialTest =
      target?.testJSON ||
      (targetSchemaRaw ? JSON.stringify(sampleFromSchema(targetSchemaRaw), null, 2) : '');
    setTestJSON(initialTest);
    setAssignments(target ? JSON.parse(JSON.stringify(target.assignments || {})) : {});
    setOpenAcc({ http: true, responseMapping: false });
  }, [open, target]);

  const handleHttpConfigChange = (next) => {
    setLink(next);

    if (next?.response && 'jsonSchema' in next.response) {
      setSchema(responseSchemaToString(next.response.jsonSchema));
    }
    if (next?.response && 'testValues' in next.response) {
      const testValues = next.response.testValues;
      setTestJSON(testValues !== undefined ? JSON.stringify(testValues, null, 2) : '');
    }
  };

  // Regenerar testJSON automáticamente cuando el usuario edita el schema
  // y el testJSON actual está vacío.
  useEffect(() => {
    if (!open) return;
    if (testJSON.trim()) return;
    if (!schema.trim()) return;
    setTestJSON(JSON.stringify(sampleFromSchema(schema), null, 2));
  }, [open, schema, testJSON]);

  if (!open) return null;

  const openHttp = () => setOpenAcc((p) => ({ ...p, http: !p.http, responseMapping: false }));
  const openResponseMapping = () => {
    if (!hasResponseValues) return;
    setOpenAcc((p) => ({ ...p, responseMapping: !p.responseMapping, http: false }));
  };

  const hasResponseValues = Boolean(testJSON.trim());
  const methodLabel = link?.name || link?.request?.url || link?.request?.method || 'GET';

  const handleSave = () => {
    if (!link?.request?.url?.trim()) {
      alert('La URL es requerida (sección HTTP).');
      return;
    }

    const cleanAssignments = {};
    Object.entries(assignments).forEach(([field, asgn]) => {
      if (!asgn) return;
      if (asgn.type === 'default' && !asgn.sourceTpl) return;
      if (
        asgn.type === 'select' &&
        asgn.valueTpl !== '$item' &&
        (!asgn.valueTpl || !asgn.labelTpl)
      ) {
        return;
      }
      cleanAssignments[field] = asgn;
    });

    onSave({
      ...link,
      method: link.request.method || 'GET',
      url: link.request.url.trim(),
      name: (link.name || link.request.url).trim(),
      response: {
        ...(link.response || {}),
        jsonSchema: parsedSchema(schema),
        testValues: parseMaybeJSON(testJSON),
      },
      schema: schema.trim(),
      testJSON: testJSON.trim(),
      assignments: cleanAssignments,
    });
  };

  const mappedFields = Object.keys(assignments);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="flex max-h-[92vh] w-[min(1100px,96vw)] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white text-gray-950 shadow-2xl"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex shrink-0 items-start gap-3 border-b border-gray-200 bg-white px-6 py-4">
          <div>
            <div className="text-base font-semibold text-gray-950">
              {target ? 'Editar endpoint' : 'Registrar endpoint'}
            </div>
            <div className="mt-1 text-sm text-gray-500">
              Define el endpoint y elige qué campos del formulario alimenta
            </div>
          </div>
          <button
            className="ml-auto rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
            onClick={onClose}
            type="button"
            aria-label="Cerrar modal"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-white">
          <section className="border-b border-gray-200">
            <button
              className="flex w-full items-center gap-3 bg-white px-6 py-4 text-left transition hover:bg-gray-50"
              onClick={openHttp}
              type="button"
            >
              <span className={`text-gray-400 transition-transform ${openAcc.http ? 'rotate-90' : ''}`}>
                <ChevronIcon />
              </span>
              <span className="text-sm font-semibold tracking-wide text-gray-700">HTTP</span>
              <span className="flex-1" />
              <span className="max-w-[50%] truncate font-mono text-xs text-gray-500">
                {methodLabel}
              </span>
            </button>
            {openAcc.http && (
              <div className="bg-white">
                <BaseConfigHTTP
                  httpConfig={link}
                  formSchema={schemaDireccion}
                  onConfigChange={handleHttpConfigChange}
                />
              </div>
            )}
          </section>

          <section className="border-b border-gray-200">
            <button
              className={`flex w-full items-center gap-3 px-6 py-4 text-left transition ${
                hasResponseValues
                  ? 'bg-white hover:bg-gray-50'
                  : 'cursor-not-allowed bg-gray-50 opacity-60'
              }`}
              onClick={openResponseMapping}
              title={!hasResponseValues ? 'Ejecuta HTTP para obtener valores de respuesta antes de mapear.' : undefined}
              type="button"
            >
              <span className={`text-gray-400 transition-transform ${openAcc.responseMapping && hasResponseValues ? 'rotate-90' : ''}`}>
                <ChevronIcon />
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-700">
                x-responseMapping
              </span>
              <span className="flex-1" />
              <span className="max-w-[50%] truncate font-mono text-xs text-gray-500">
                {hasResponseValues ? `${mappedFields.length} mapeos` : 'sin valores de response'}
              </span>
            </button>

            {openAcc.responseMapping && hasResponseValues && (
              <div className="bg-white p-4">
                <ResponseMappingEditor
                  schema={schema}
                  testJSON={testJSON}
                  assignments={assignments}
                  onAssignmentsChange={setAssignments}
                  baseSchema={BASE_SCHEMA}
                />
              </div>
            )}
          </section>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">
          {target && (
            <button
              className="mr-auto rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
              onClick={() => onDelete(target)}
              type="button"
            >
              Eliminar endpoint
            </button>
          )}
          <button
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
            onClick={onClose}
            type="button"
          >
            Cancelar
          </button>
          <button
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            onClick={handleSave}
            type="button"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}