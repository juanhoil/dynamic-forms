import React, { useEffect, useMemo, useRef, useState } from 'react';
import { parsedSchema, schemaPlainProps, findAllArraySources } from '../utils/schema';
import { renderTpl } from '../utils/template';
import { sampleFromSchema } from '../utils/sample';
import { esc, hl } from '../ui/text';
import {
  ChevronIcon,
  CloseIcon,
  TrashIcon,
  PlayIcon,
  PlusIcon,
  CheckIcon,
} from '../ui/icons';
import { shcemaNewDireccion as schemaDireccion } from '../../shcemas';
import { CustomJsonSchema } from '@/examples/jsonSchemasBuilder2/components';

const BASE_SCHEMA = schemaDireccion.properties || {};

const METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
const DATA_ROLES = ['', 'init', 'catalog', 'dependent', 'submit'];
const REQUEST_TABS = [
  { id: 'queryVariables', label: 'Query Variables' },
  { id: 'headers', label: 'Headers' },
  { id: 'body', label: 'Body' },
  { id: 'externalVariables', label: 'External Variables' },
  { id: 'testValues', label: 'Test Values' },
];

const REQUEST_TAB_HINTS = {
  queryVariables:
    'Declara las variables de la query string como JSON Schema. Se insertan como tokens {{var}} y se resuelven desde testValues.',
  headers:
    'Declara los headers como JSON Schema. Cada propiedad se envía como header usando su valor en testValues.',
  body:
    'Define el payload del request como JSON Schema. Cada propiedad se envía en el body usando su valor en testValues.',
  externalVariables:
    'Variables externas como JSON Schema. Se leen en runtime via {{externalVariables.X}}; sus valores viven en testValues.',
};

const EMPTY_REQUEST = {
  headers: {},
  body: {},
  queryVariables: {},
  externalVariables: {},
  testValues: {},
};

// Editor de testValues del request como JSON crudo (con draft local para
// permitir estados intermedios inválidos sin perder el foco).
function RequestTestValuesEditor({ value, onChange }) {
  const [draft, setDraft] = useState(() => JSON.stringify(value || {}, null, 2));
  const [error, setError] = useState('');

  useEffect(() => {
    setDraft(JSON.stringify(value || {}, null, 2));
    setError('');
  }, [value]);

  return (
    <div className="xrm-f-group">
      <label className="xrm-f-label">testValues (JSON)</label>
      <textarea
        className="xrm-f-textarea"
        rows={8}
        value={draft}
        onChange={(e) => {
          const text = e.target.value;
          setDraft(text);
          try {
            onChange(JSON.parse(text || '{}'));
            setError('');
          } catch (err) {
            setError(err.message);
          }
        }}
        placeholder='{"userId": 1}'
        style={error ? { borderColor: 'var(--rose, #d32f2f)' } : undefined}
      />
      <span className="xrm-f-hint" style={error ? { color: 'var(--rose, #d32f2f)' } : undefined}>
        {error ? `JSON inválido: ${error}` : 'Valores concretos para resolver los {{tokens}} del request.'}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Render schema preview (props detectadas)
// ────────────────────────���────────────────────────────────────

function renderSchemaPreviewHTML(raw) {
  if (!raw) return '<div class="xrm-f-hint">Pega un schema válido arriba para ver sus propiedades aquí.</div>';
  let s;
  try {
    s = JSON.parse(raw);
  } catch (e) {
    return `<div class="xrm-f-hint" style="color:var(--rose)">JSON inválido: ${esc(e.message)}</div>`;
  }
  const propsHTML = (props, indent) =>
    Object.entries(props)
      .map(([k, v]) => {
        const nested = v.properties
          ? ` <span class="xrm-sp-nested">{${Object.keys(v.properties).join(', ')}}</span>`
          : v.items
            ? ` <span class="xrm-sp-nested">[${v.items.type || 'object'}]</span>`
            : '';
        return `<div class="xrm-sp-row" style="padding-left:${indent}px">
        <span class="xrm-sp-key">${esc(k)}</span>
        <span class="xrm-sp-type">${esc(v.type || 'any')}</span>
        ${nested}
      </div>`;
      })
      .join('');

  let html = '';
  if (s.type === 'array' && s.items) {
    html += `<div class="xrm-sp-row"><span class="xrm-sp-key" style="color:var(--green)">[ ] array</span><span class="xrm-sp-type">${esc(s.items.type || 'object')}</span></div>`;
    if (s.items.properties) html += propsHTML(s.items.properties, 12);
  } else if (s.properties) {
    html += propsHTML(s.properties, 0);
  } else {
    html = '<div class="xrm-f-hint">No se detectaron propiedades.</div>';
  }
  return html;
}

// ─────────────────────────────────────────────────────────────
// Variable autocomplete
// ─────────────────────────────────────────────────────────────

/**
 * Devuelve el nombre del setter nativo del value de un input HTML.
 * React usa este truco internamente para detectar cambios programáticos.
 */
const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
  window.HTMLInputElement.prototype,
  'value'
)?.set;

function VariableAutocomplete({ inputId, vars, open, onClose, onInsert }) {
  if (!open) return null;
  if (!vars || !vars.length || (vars.length === 1 && vars[0] === '$item')) {
    return null;
  }

  const handle = (e, v) => {
    e.preventDefault();
    e.stopPropagation();
    const el = document.getElementById(inputId);
    if (!el) return;
    const s = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const v0 = el.value;
    const sep = v0.slice(0, s) && !/\s$/.test(v0.slice(0, s)) ? ' ' : '';
    const text = `{{${v}}}`;
    const newValue = v0.slice(0, s) + sep + text + v0.slice(end);
    const caretPos = s + sep.length + text.length;

    // Truco para que React detecte el cambio en un input controlado:
    // primero mutamos el value usando el setter nativo, luego disparamos
    // el evento `input` para que React ejecute onChange.
    if (nativeInputValueSetter) {
      nativeInputValueSetter.call(el, newValue);
    } else {
      el.value = newValue;
    }
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.focus();
    el.setSelectionRange(caretPos, caretPos);

    if (typeof onInsert === 'function') onInsert(newValue);
    if (typeof onClose === 'function') onClose();
  };

  return (
    <div className="xrm-var-autocomplete open" id={`xrm-va-${inputId}`}>
      {vars.map((v) => (
        <div
          key={v}
          className="xrm-va-item plainvar"
          onMouseDown={(e) => handle(e, v)}
        >
          <PlusIcon size={11} />
          {`{{${v}}}`}
        </div>
      ))}
    </div>
  );
}

// ───────────────────────────���─────────────────────────────────
// Field block (mapeo individual)
// ─────────────────────────────────────────────────────────────

function FieldMappingBlock({
  field,
  asgn,
  schemaRaw,
  onTypeChange,
  onArraySourceChange,
  onValueChange,
  onRemove,
  autoFocusValue,
  activeAutocomplete,
  onOpenAutocomplete,
}) {
  const plainProps = useMemo(() => schemaPlainProps(schemaRaw), [schemaRaw]);
  const arraySources = useMemo(() => findAllArraySources(schemaRaw), [schemaRaw]);

  const def = BASE_SCHEMA[field];
  const valueId = `xrm-fmval-${field}`;
  const labelId = `xrm-fmlbl-${field}`;

  const isOpen = (id) => activeAutocomplete === id;
  const closeAll = () => onOpenAutocomplete(null);

  // Inserta una variable en la posición del cursor del input identificado por `id`.
  // Devuelve el nuevo valor para que el padre lo guarde en su state.
  const insertVar = (id, newValue) => {
    const key = id === valueId
      ? (asgn.type === 'default' ? 'sourceTpl' : 'valueTpl')
      : 'labelTpl';
    onValueChange(key, newValue);
  };

  return (
    <div className="xrm-field-block" id={`xrm-fmrow-${field}`}>
      <div className="xrm-field-block-head">
        <span className="xrm-fb-name">{field}</span>
        <span className="xrm-fb-info">{esc(def?.title || def?.type || '')}</span>
        <div className="xrm-spacer" />
        <button className="xrm-remove-mapping-btn" title="Quitar mapeo" onClick={onRemove}>
          <TrashIcon />
        </button>
      </div>

      <div className="xrm-rm-edit-row">
        <span className="xrm-rm-lbl">Tipo</span>
        <select
          className="xrm-f-select"
          style={{ maxWidth: 200 }}
          value={asgn.type}
          onChange={(e) => onTypeChange(e.target.value)}
        >
          <option value="default">default (valor plano)</option>
          <option value="select">select (array)</option>
        </select>
      </div>

      {asgn.type === 'default' ? (
        <div className="xrm-rm-edit-row">
          <span className="xrm-rm-lbl">Valor</span>
          <div className="xrm-var-input-wrap">
            <input
              className="xrm-f-input"
              id={valueId}
              value={asgn.sourceTpl || ''}
              onChange={(e) => onValueChange('sourceTpl', e.target.value)}
              onFocus={() => onOpenAutocomplete(valueId)}
              onBlur={() => setTimeout(closeAll, 150)}
              placeholder="ej: {{nombre}} {{apaterno}} — clic para ver variables"
              autoComplete="off"
              autoFocus={!!autoFocusValue}
            />
            <VariableAutocomplete
              inputId={valueId}
              vars={plainProps}
              open={isOpen(valueId)}
              onClose={closeAll}
              onInsert={(v) => insertVar(valueId, v)}
            />
          </div>
          <button
            className="xrm-clear-btn"
            title="Limpiar valor"
            onClick={() => onValueChange('sourceTpl', '')}
          >
            ✕
          </button>
        </div>
      ) : (
        <>
          <div className="xrm-rm-edit-row">
            <span className="xrm-rm-lbl">Array fuente</span>
            <select
              className="xrm-f-select"
              style={{ maxWidth: 200 }}
              value={asgn.enumSource || ''}
              onChange={(e) => onArraySourceChange(e.target.value)}
            >
              {arraySources.length === 0 ? (
                <option value="">— no hay arrays en este schema —</option>
              ) : (
                arraySources.map((a) => (
                  <option key={a.key} value={a.key}>
                    {a.key === '$root' ? '$root (la respuesta es un array)' : a.key}
                  </option>
                ))
              )}
            </select>
          </div>

          {(() => {
            const src = arraySources.find((a) => a.key === asgn.enumSource);
            if (!src) return <div className="xrm-f-hint">No hay arrays disponibles en este target.</div>;
            if (src.isSimple) {
              return (
                <div className="xrm-detect-note">
                  <CheckIcon />
                  Array de valores simples detectado → value y label = <b>$item</b> automáticamente
                </div>
              );
            }
            return (
              <>
                <div className="xrm-detect-note">
                  <CheckIcon />
                  Array de objetos detectado
                </div>
                <div className="xrm-rm-edit-row">
                  <span className="xrm-rm-lbl">.enum (value)</span>
                  <div className="xrm-var-input-wrap">
                    <input
                      className="xrm-f-input"
                      id={valueId}
                      value={
                        asgn.valueTpl && asgn.valueTpl !== '$item' ? asgn.valueTpl : ''
                      }
                      onChange={(e) => onValueChange('valueTpl', e.target.value)}
                      onFocus={() => onOpenAutocomplete(valueId)}
                      onBlur={() => setTimeout(closeAll, 150)}
                      placeholder="ej: {{guid}} — clic para ver variables"
                      autoComplete="off"
                    />
                    <VariableAutocomplete
                      inputId={valueId}
                      vars={src.itemProps}
                      open={isOpen(valueId)}
                      onClose={closeAll}
                      onInsert={(v) => insertVar(valueId, v)}
                    />
                  </div>
                  <button
                    className="xrm-clear-btn"
                    title="Limpiar value"
                    onClick={() => onValueChange('valueTpl', '')}
                  >
                    ✕
                  </button>
                </div>
                <div className="xrm-rm-edit-row">
                  <span className="xrm-rm-lbl">.enumNames (label)</span>
                  <div className="xrm-var-input-wrap">
                    <input
                      className="xrm-f-input"
                      id={labelId}
                      value={
                        asgn.labelTpl && asgn.labelTpl !== '$item' ? asgn.labelTpl : ''
                      }
                      onChange={(e) => onValueChange('labelTpl', e.target.value)}
                      onFocus={() => onOpenAutocomplete(labelId)}
                      onBlur={() => setTimeout(closeAll, 150)}
                      placeholder="ej: {{nombre}} {{apaterno}} — clic para ver variables"
                      autoComplete="off"
                    />
                    <VariableAutocomplete
                      inputId={labelId}
                      vars={src.itemProps}
                      open={isOpen(labelId)}
                      onClose={closeAll}
                      onInsert={(v) => insertVar(labelId, v)}
                    />
                  </div>
                  <button
                    className="xrm-clear-btn"
                    title="Limpiar label"
                    onClick={() => onValueChange('labelTpl', '')}
                  >
                    ✕
                  </button>
                </div>
              </>
            );
          })()}
        </>
      )}

      <div className="xrm-detect-note plain">
        <CheckIcon />
        Puedes escribir texto libre o combinar variables {`{{a}} {{b}}`}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Modal principal
// ─────────────────────────────────────────────────────────────

export default function TargetModal({ open, target, onClose, onSave, onDelete }) {
  const [method, setMethod] = useState('GET');
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [dataRole, setDataRole] = useState('');
  const [request, setRequest] = useState(EMPTY_REQUEST);
  const [requestTab, setRequestTab] = useState('queryVariables');
  const [schema, setSchema] = useState('');
  const [testJSON, setTestJSON] = useState('');
  const [assignments, setAssignments] = useState({});
  const [openAcc, setOpenAcc] = useState({ basic: true });
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showTestResult, setShowTestResult] = useState(false);
  const [testResultHTML, setTestResultHTML] = useState('');
  const [testError, setTestError] = useState('');
  const [activeAutocomplete, setActiveAutocomplete] = useState(null);

  useEffect(() => {
    if (!open) return;
    setMethod(target?.method || 'GET');
    setName(target?.name || '');
    setUrl(target?.url || '');
    setDescription(target?.description || '');
    setDataRole(target?.dataRole || '');
    setRequest({
      headers: target?.request?.headers || {},
      body: target?.request?.body || {},
      queryVariables: target?.request?.queryVariables || {},
      externalVariables: target?.request?.externalVariables || {},
      testValues: target?.request?.testValues || {},
    });
    setRequestTab('queryVariables');
    setSchema(target?.schema || '');
    const targetSchemaRaw = target?.schema || '';
    const initialTest =
      target?.testJSON ||
      (targetSchemaRaw ? JSON.stringify(sampleFromSchema(targetSchemaRaw), null, 2) : '');
    setTestJSON(initialTest);
    setAssignments(target ? JSON.parse(JSON.stringify(target.assignments || {})) : {});
    setOpenAcc(target ? {} : { basic: true });
    setShowAddMenu(false);
    setShowTestResult(false);
    setTestResultHTML('');
    setTestError('');
  }, [open, target]);

  const updateRequestSchema = (key, next) =>
    setRequest((p) => ({ ...p, [key]: next || {} }));

  // Regenerar testJSON automáticamente cuando el usuario edita el schema
  // y el testJSON actual está vacío.
  useEffect(() => {
    if (!open) return;
    if (testJSON.trim()) return;
    if (!schema.trim()) return;
    setTestJSON(JSON.stringify(sampleFromSchema(schema), null, 2));
  }, [open, schema, testJSON]);

  // close add-menu when clicking outside
  const addFieldRef = useRef(null);
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (addFieldRef.current && !addFieldRef.current.contains(e.target)) {
        setShowAddMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Referencia estable del schema de respuesta para el editor visual.
  const responseSchemaObj = useMemo(() => parsedSchema(schema), [schema]);

  if (!open) return null;

  const toggleAcc = (key) => setOpenAcc((p) => ({ ...p, [key]: !p[key] }));

  const updateDraft = (field, key, value) => {
    setAssignments((p) => ({ ...p, [field]: { ...p[field], [key]: value } }));
  };

  const onFieldTypeChange = (field, newType) => {
    if (newType === 'default') {
      setAssignments((p) => ({ ...p, [field]: { type: 'default', sourceTpl: '' } }));
    } else {
      const arraySources = findAllArraySources(schema);
      const first = arraySources[0];
      setAssignments((p) => ({
        ...p,
        [field]: first
          ? {
              type: 'select',
              enumSource: first.key,
              valueTpl: first.isSimple ? '$item' : '',
              labelTpl: first.isSimple ? '$item' : '',
            }
          : { type: 'select', enumSource: '', valueTpl: '', labelTpl: '' },
      }));
    }
  };

  const onFieldArraySourceChange = (field, key) => {
    const arraySources = findAllArraySources(schema);
    const src = arraySources.find((a) => a.key === key);
    setAssignments((p) => ({
      ...p,
      [field]: {
        ...p[field],
        enumSource: key,
        valueTpl: src?.isSimple ? '$item' : '',
        labelTpl: src?.isSimple ? '$item' : '',
      },
    }));
  };

  const removeField = (field) => {
    setAssignments((p) => {
      const n = { ...p };
      delete n[field];
      return n;
    });
  };

  const addField = (field) => {
    setAssignments((p) => ({ ...p, [field]: { type: 'default', sourceTpl: '' } }));
    setShowAddMenu(false);
  };

  // ── summaries acordeón ──
  const sObj = parsedSchema(schema);
  const methodLabel = name
    ? `${method} ${name.replace(/^(GET|POST|PUT)\s/, '')}`
    : method;
  const schemaSummary = !schema.trim()
    ? 'vacío'
    : sObj.type === 'array'
      ? 'array'
      : sObj.properties
        ? `${Object.keys(sObj.properties).length} props`
        : 'inválido';
  const testSummary = testJSON.trim() ? 'cargado' : 'vacío';
  const propCount =
    (sObj.properties ? Object.keys(sObj.properties).length : 0) +
    (sObj.items?.properties ? Object.keys(sObj.items.properties).length : 0);
  const propsSummary = propCount ? `${propCount} detectadas` : '';
  const requestSummary = (() => {
    const parts = [];
    if (Object.keys(request.queryVariables?.properties || {}).length) parts.push('query');
    if (Object.keys(request.headers?.properties || {}).length) parts.push('headers');
    if (Object.keys(request.body?.properties || {}).length) parts.push('body');
    return parts.length ? parts.join(', ') : 'sin schema';
  })();

  const handleSave = () => {
    if (!url.trim()) {
      alert('La URL es requerida (sección "Método & ruta").');
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
      )
        return;
      cleanAssignments[field] = asgn;
    });
    onSave({
      method,
      name: name.trim() || url.trim(),
      url: url.trim(),
      description: description.trim(),
      dataRole,
      request,
      schema: schema.trim(),
      testJSON: testJSON.trim(),
      assignments: cleanAssignments,
    });
  };

  const handleRunTest = () => {
    setShowTestResult(true);
    const trimmed = testJSON.trim();
    if (!trimmed) {
      setTestError(
        'No hay JSON de prueba. Pega un ejemplo en la sección "Test JSON" del acordeón.'
      );
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
    Object.entries(assignments).forEach(([field, asgn]) => {
      if (!asgn) return;
      const def = { ...BASE_SCHEMA[field] };
      if (asgn.type === 'default') {
        const dataObj = Array.isArray(raw) ? {} : raw;
        def.default = renderTpl(asgn.sourceTpl, dataObj);
      } else if (asgn.type === 'select') {
        let arr = [];
        if (asgn.enumSource === '$root' && Array.isArray(raw)) arr = raw;
        else if (!Array.isArray(raw) && raw[asgn.enumSource]) arr = raw[asgn.enumSource];
        if (asgn.valueTpl === '$item') {
          def.enum = arr;
        } else {
          def.enum = arr.map((item) => renderTpl(asgn.valueTpl, item));
          def.enumNames = arr.map((item) => renderTpl(asgn.labelTpl, item));
        }
      }
      applied[field] = def;
    });
    setTestResultHTML(hl(JSON.stringify(applied, null, 2)));
  };

  const mappedFields = Object.keys(assignments);
  const availableFields = Object.entries(BASE_SCHEMA).filter(([f]) => !assignments[f]);

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
          {/* Método & ruta */}
          <div className={`xrm-acc ${openAcc.basic ? 'open' : ''}`}>
            <div className="xrm-acc-head" onClick={() => toggleAcc('basic')}>
              <ChevronIcon />
              <span className="xrm-acc-title">Método &amp; ruta</span>
              <div className="xrm-spacer" />
              <span className="xrm-acc-summary">{methodLabel}</span>
            </div>
            <div className="xrm-acc-body">
              <div className="xrm-f-row">
                <div className="xrm-f-group" style={{ maxWidth: 110 }}>
                  <label className="xrm-f-label">Método</label>
                  <select className="xrm-f-select" value={method} onChange={(e) => setMethod(e.target.value)}>
                    {METHODS.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div className="xrm-f-group">
                  <label className="xrm-f-label">URL</label>
                  <input
                    className="xrm-f-input"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="ej: https://api.example.com/cp/{{cp}}"
                  />
                </div>
                <div className="xrm-f-group" style={{ maxWidth: 150 }}>
                  <label className="xrm-f-label">Data role</label>
                  <select className="xrm-f-select" value={dataRole} onChange={(e) => setDataRole(e.target.value)}>
                    {DATA_ROLES.map((r) => (
                      <option key={r || 'none'} value={r}>{r || '— ninguno —'}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="xrm-f-row">
                <div className="xrm-f-group">
                  <label className="xrm-f-label">Nombre</label>
                  <input
                    className="xrm-f-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="ej: Inicializar datos"
                  />
                </div>
                <div className="xrm-f-group">
                  <label className="xrm-f-label">Descripción</label>
                  <input
                    className="xrm-f-input"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Opcional"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Request — toda la configuración como JSON Schema */}
          <div className={`xrm-acc ${openAcc.request ? 'open' : ''}`}>
            <div className="xrm-acc-head" onClick={() => toggleAcc('request')}>
              <ChevronIcon />
              <span className="xrm-acc-title">Request</span>
              <div className="xrm-spacer" />
              <span className="xrm-acc-summary">{method} · {requestSummary}</span>
            </div>
            <div className="xrm-acc-body">
              <div className="xrm-req-tabs" style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', borderBottom: '1px solid var(--line, #e5e7eb)', marginBottom: '0.75rem' }}>
                {REQUEST_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setRequestTab(tab.id)}
                    style={{
                      padding: '0.4rem 0.7rem',
                      background: 'none',
                      border: 'none',
                      borderBottom: requestTab === tab.id ? '2px solid #1976d2' : '2px solid transparent',
                      color: requestTab === tab.id ? '#1976d2' : '#666',
                      fontWeight: requestTab === tab.id ? 600 : 400,
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {requestTab === 'testValues' ? (
                <RequestTestValuesEditor
                  value={request.testValues}
                  onChange={(next) => setRequest((p) => ({ ...p, testValues: next }))}
                />
              ) : (
                <div>
                  <p className="xrm-f-hint" style={{ marginTop: 0 }}>
                    {REQUEST_TAB_HINTS[requestTab]}
                  </p>
                  <CustomJsonSchema
                    schema={request[requestTab]}
                    onChange={(next) => updateRequestSchema(requestTab, next)}
                  />
                </div>
              )}
            </div>
          </div>

          {/* targetSchema */}
          <div className={`xrm-acc ${openAcc.schema ? 'open' : ''}`}>
            <div className="xrm-acc-head" onClick={() => toggleAcc('schema')}>
              <ChevronIcon />
              <span className="xrm-acc-title">targetSchema</span>
              <div className="xrm-spacer" />
              <span className="xrm-acc-summary">{schemaSummary}</span>
            </div>
            <div className="xrm-acc-body">
              <div className="xrm-f-group">
                <label className="xrm-f-label">JSON Schema de la respuesta</label>
                <CustomJsonSchema
                  schema={responseSchemaObj}
                  onChange={(next) =>
                    setSchema(next && Object.keys(next).length ? JSON.stringify(next, null, 2) : '')
                  }
                />
                <span className="xrm-f-hint">Define el JSON Schema de lo que devuelve este endpoint</span>
              </div>
            </div>
          </div>

          {/* Test JSON */}
          <div className={`xrm-acc ${openAcc.test ? 'open' : ''}`}>
            <div className="xrm-acc-head" onClick={() => toggleAcc('test')}>
              <ChevronIcon />
              <span className="xrm-acc-title">Test JSON</span>
              <div className="xrm-spacer" />
              <span className="xrm-acc-summary">{testSummary}</span>
            </div>
            <div className="xrm-acc-body">
              <div className="xrm-f-group">
                <label className="xrm-f-label">Ejemplo de respuesta real</label>
                <textarea
                  className="xrm-f-textarea"
                  rows={9}
                  value={testJSON}
                  onChange={(e) => setTestJSON(e.target.value)}
                  placeholder='{"id":1,"nombre":"Ejemplo"}'
                />
                <span className="xrm-f-hint">Se usa para probar el resultado del mapping abajo</span>
              </div>
            </div>
          </div>

          {/* Propiedades detectadas */}
          <div className={`xrm-acc ${openAcc.props ? 'open' : ''}`}>
            <div className="xrm-acc-head" onClick={() => toggleAcc('props')}>
              <ChevronIcon />
              <span className="xrm-acc-title">Propiedades detectadas</span>
              <div className="xrm-spacer" />
              <span className="xrm-acc-summary">{propsSummary}</span>
            </div>
            <div className="xrm-acc-body">
              <div
                className="xrm-schema-preview"
                dangerouslySetInnerHTML={{ __html: renderSchemaPreviewHTML(schema) }}
              />
            </div>
          </div>
        </div>

        {/* Response mapping block */}
        <div className="xrm-rm-block">
          <div className="xrm-rm-head">
            <span className="xrm-rm-title">x-responseMapping</span>
            <span className="xrm-rm-hint">— elige qué campos del formulario alimenta este endpoint</span>
            <div className="xrm-spacer" />
            <button className="xrm-btn xrm-btn-green" onClick={handleRunTest}>
              <PlayIcon />
              Probar
            </button>
          </div>

          <div className="xrm-rm-fields">
            {!mappedFields.length ? (
              <div className="xrm-rm-empty">
                Ningún campo mapeado todavía. Usa "Mapear campo del formulario" para empezar.
              </div>
            ) : (
              mappedFields.map((field) => (
                <FieldMappingBlock
                  key={field}
                  field={field}
                  asgn={assignments[field]}
                  schemaRaw={schema}
                  onTypeChange={(t) => onFieldTypeChange(field, t)}
                  onArraySourceChange={(k) => onFieldArraySourceChange(field, k)}
                  onValueChange={(key, val) => updateDraft(field, key, val)}
                  onRemove={() => removeField(field)}
                  activeAutocomplete={activeAutocomplete}
                  onOpenAutocomplete={setActiveAutocomplete}
                />
              ))
            )}
          </div>

          <div className="xrm-add-field-wrap" ref={addFieldRef}>
            <button className="xrm-btn xrm-btn-dashed" onClick={() => setShowAddMenu((p) => !p)}>
              <PlusIcon size={11} />
              Mapear campo del formulario
            </button>
            <div className={`xrm-add-field-menu ${showAddMenu ? 'open' : ''}`}>
              {!availableFields.length ? (
                <div className="xrm-afm-empty">Todos los campos ya están mapeados.</div>
              ) : (
                availableFields.map(([f, def]) => (
                  <div key={f} className="xrm-afm-item" onClick={() => addField(f)}>
                    <span>{f}</span>
                    <span className="xrm-afm-type">{esc(def.title || def.type)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {showTestResult && (
            <div className="xrm-test-result">
              <div className="xrm-tr-title">Resultado aplicado al schema base</div>
              {testError ? (
                <div className="xrm-tr-error">{esc(testError)}</div>
              ) : (
                <div
                  className="xrm-tr-code"
                  dangerouslySetInnerHTML={{ __html: testResultHTML }}
                />
              )}
            </div>
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