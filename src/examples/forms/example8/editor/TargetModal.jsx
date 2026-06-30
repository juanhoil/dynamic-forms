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
    <div className="xrm-overlay open" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="xrm-modal" role="dialog" aria-modal="true">
        <div className="xrm-modal-head">
          <div>
            <div className="xrm-modal-title">{target ? 'Editar endpoint' : 'Registrar endpoint'}</div>
            <div className="xrm-modal-sub">Define el endpoint y elige qué campos del formulario alimenta</div>
          </div>
          <button className="xrm-modal-close" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>

        <div className="xrm-modal-body">
          <div className={`xrm-acc ${openAcc.http ? 'open' : ''}`}>
            <div className="xrm-acc-head" onClick={openHttp}>
              <ChevronIcon />
              <span className="xrm-acc-title">HTTP</span>
              <div className="xrm-spacer" />
              <span className="xrm-acc-summary">{methodLabel}</span>
            </div>
            {openAcc.http && (
            <div className="xrm-acc-body" style={{ padding: 0 }}>
              <BaseConfigHTTP
                httpConfig={link}
                formSchema={schemaDireccion}
                onConfigChange={handleHttpConfigChange}
              />
            </div>
            )}
          </div>
        </div>

        {/* Response mapping block */}
        <div className={`xrm-acc ${openAcc.responseMapping && hasResponseValues ? 'open' : ''}`}>
          <div
            className="xrm-acc-head"
            onClick={openResponseMapping}
            style={!hasResponseValues ? { opacity: 0.55, cursor: 'not-allowed' } : undefined}
            title={!hasResponseValues ? 'Ejecuta HTTP para obtener valores de respuesta antes de mapear.' : undefined}
          >
            <ChevronIcon />
            <span className="xrm-rm-title">x-responseMapping</span>
            <div className="xrm-spacer" />
            <span className="xrm-acc-summary">
              {hasResponseValues ? `${mappedFields.length} mapeos` : 'sin valores de response'}
            </span>
          </div>

          {openAcc.responseMapping && hasResponseValues && (
            <ResponseMappingEditor
              schema={schema}
              testJSON={testJSON}
              assignments={assignments}
              onAssignmentsChange={setAssignments}
              baseSchema={BASE_SCHEMA}
            />
          )}
        </div>

        <div className="xrm-modal-foot">
          {target && (
            <button
              className="xrm-btn xrm-btn-danger"
              style={{ marginRight: 'auto' }}
              onClick={() => onDelete(target)}
            >
              Eliminar endpoint
            </button>
          )}
          <button className="xrm-btn xrm-btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button className="xrm-btn xrm-btn-accent" onClick={handleSave}>
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}