import React, { useEffect, useState } from 'react';
import { findAllArraySources, parsedSchema } from '../utils/schema';
import { sampleFromSchema } from '../utils/sample';
import {
  ChevronIcon,
  CloseIcon,
} from '../ui/icons';
import { shcemaNewDireccion as schemaDireccion } from '../../shcemas';
import BaseConfigHTTP from '@/examples/http/components/BaseConfigHTTP';
import ResponseMappingEditor from './ResponseMappingEditor';
import { assignmentsFromMapping } from '../utils/mapping';
import type {
  ResponseMapping,
  ResponseMappingAssignments,
} from '../utils/mapping';
import type {
  HyperSchemaLink,
  JsonSchema,
} from '@/examples/forms/types';

type AssignmentMap = ResponseMappingAssignments;
type LinkDraft = Record<string, any> &
  Partial<Omit<HyperSchemaLink, 'request' | 'response' | 'assignments'>> & {
    request?: Record<string, any>;
    response?: Record<string, any>;
    assignments?: AssignmentMap | Record<string, unknown>;
  };

interface ConfigHyperSchemaModalProps {
  open: boolean;
  linkConfig?: LinkDraft | null;
  onClose: () => void;
  onSave: (link: LinkDraft) => void;
  onDelete: (link: LinkDraft) => void;
}

const BASE_SCHEMA = (schemaDireccion.properties || {}) as Record<string, JsonSchema>;

const responseSchemaToString = (schema: unknown) =>
  schema && typeof schema === 'object' && Object.keys(schema).length
    ? JSON.stringify(schema, null, 2)
    : '';

const schemaToString = (schema: unknown) =>
  typeof schema === 'string' ? schema : responseSchemaToString(schema);

const parseMaybeJSON = <T,>(value: unknown): T | undefined => {
  if (!value || typeof value !== 'string') return value as T | undefined;
  try {
    return JSON.parse(value) as T;
  } catch {
    return undefined;
  }
};

const cloneJSON = <T,>(value: T): T => JSON.parse(JSON.stringify(value || {})) as T;

const linkToHttpConfig = (source?: LinkDraft | null): LinkDraft => {
  const request = (source?.request || {}) as Record<string, any>;
  const response = (source?.response || {}) as Record<string, any>;
  const responseSchema = source?.schema || response.jsonSchema || source?.targetSchema || '';
  const responseTestValues =
    source?.testJSON !== undefined
      ? parseMaybeJSON(source.testJSON)
      : response.testValues ?? source?.valueTest;

  return {
    id: source?.id || 'link-draft',
    name: source?.name || '',
    description: source?.description || '',
    dataRole: source?.dataRole || 'init',
    response: {
      ...response,
      jsonSchema: parsedSchema(schemaToString(responseSchema)) as JsonSchema,
      testValues: responseTestValues,
      responseMapping:
        response.responseMapping ||
        parseMaybeJSON<ResponseMapping>(source?.responseMapping) ||
        source?.['x-responseMapping'],
    },
    request: {
      method: source?.method || request.method || 'GET',
      url: source?.url || request.url || source?.href || '',
      headers: request.headers || {},
      body: request.body || {},
      queryVariables: request.queryVariables || {},
      externalVariables: request.externalVariables || {},
      testValues: request.testValues || {},
    },
  };
};

export default function ConfigHyperSchemaModal({
  open,
  linkConfig,
  onClose,
  onSave,
  onDelete,
}: ConfigHyperSchemaModalProps) {
  const linkKey = linkConfig?.id || 'new-link';
  const [link, setLink] = useState<LinkDraft | null>(() => linkConfig || null);
  const [schema, setSchema] = useState('');
  const [testJSON, setTestJSON] = useState('');
  const [assignments, setAssignments] = useState<AssignmentMap>({});
  const [openAcc, setOpenAcc] = useState({ http: true, responseMapping: false });
  const [hydratedlinkKey, setHydratedlinkKey] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setHydratedlinkKey(null);
      return;
    }
    const nextHttpConfig = linkToHttpConfig(linkConfig);
    const targetSchemaRaw = schemaToString(
      linkConfig?.schema ||
      linkConfig?.response?.jsonSchema ||
      linkConfig?.targetSchema ||
      nextHttpConfig.response?.jsonSchema
    );
    const responseTestValues =
      linkConfig?.testJSON ||
      linkConfig?.response?.testValues ||
      linkConfig?.valueTest;
    const initialTest =
      typeof responseTestValues === 'string'
        ? responseTestValues
        : responseTestValues !== undefined
          ? JSON.stringify(responseTestValues, null, 2)
          : targetSchemaRaw
            ? JSON.stringify(sampleFromSchema(targetSchemaRaw), null, 2)
            : '';
    const initialAssignments =
      (linkConfig?.assignments as AssignmentMap | undefined) ||
      assignmentsFromMapping(
        linkConfig?.response?.responseMapping ||
        linkConfig?.['x-responseMapping'] ||
        linkConfig?.responseMapping
      );

    setLink(nextHttpConfig);
    setSchema(targetSchemaRaw);
    setTestJSON(initialTest);
    setAssignments(cloneJSON(initialAssignments));
    setOpenAcc({ http: true, responseMapping: false });
    setHydratedlinkKey(linkKey);
  }, [open, linkConfig, linkKey]);

  const handleHttpConfigChange = (next: LinkDraft) => {
    setLink(next);

    if (next?.response && 'jsonSchema' in next.response) {
      setSchema(responseSchemaToString(next.response.jsonSchema));
    }
    if (next?.response && 'testValues' in next.response) {
      const testValues = next.response.testValues;
      setTestJSON(testValues !== undefined ? JSON.stringify(testValues, null, 2) : '');
    }
  };

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

    const cleanAssignments: AssignmentMap = {};
    const arraySources = findAllArraySources(schema);
    Object.entries(assignments).forEach(([field, asgn]) => {
      if (!asgn) return;
      if (asgn.type === 'default' && !asgn.sourceTpl) return;
      if (asgn.type === 'select') {
        const src = arraySources.find((source) => source.key === asgn.enumSource);
        if (src?.isSimple) {
          cleanAssignments[field] = { ...asgn, valueTpl: '', labelTpl: '' };
          return;
        }
        if (!asgn.valueTpl || !asgn.labelTpl) return;
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
        jsonSchema: parsedSchema(schema) as JsonSchema,
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
      className="fixed inset-0 z-[10] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
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
              {linkConfig ? 'Editar link' : 'Registrar link'}
            </div>
            <div className="mt-1 text-sm text-gray-500">
              Define el link y elige qué campos del formulario alimenta
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
                {hydratedlinkKey === linkKey ? (
                  <BaseConfigHTTP
                    httpConfig={link as Partial<HyperSchemaLink> | null}
                    formSchema={schemaDireccion}
                    onConfigChange={(next) => handleHttpConfigChange(next as LinkDraft)}
                  />
                ) : (
                  <div className="px-6 py-8 text-sm text-gray-500">
                    Cargando configuración...
                  </div>
                )}
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
                  schema={parsedSchema(schema) as JsonSchema}
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
          {link && (
            <button
              className="mr-auto rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
              onClick={() => onDelete(link)}
              type="button"
            >
              Eliminar link
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
