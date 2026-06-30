import React, { useEffect, useMemo, useRef, useState } from 'react';
import { schemaPlainProps, findAllArraySources } from '../utils/schema';
import { renderTpl } from '../utils/template';
import { esc, hl } from '../ui/text';
import { TrashIcon, PlayIcon, PlusIcon, CheckIcon } from '../ui/icons';
import InputVars from '@/examples/inputVars/components/InputVars';

const toVarOptions = (vars) =>
  (vars || [])
    .filter((v) => v && v !== '$item')
    .map((v) => ({
      label: v,
      value: `{{${v}}}`,
      type: 'string',
      color: '#1565c0',
      group: 'Response',
    }));

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
  const plainProps = useMemo(() => schemaPlainProps(schemaRaw), [schemaRaw]);
  const arraySources = useMemo(() => findAllArraySources(schemaRaw), [schemaRaw]);
  const responseVars = useMemo(() => toVarOptions(plainProps), [plainProps]);

  const def = baseSchema[field];
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
          <InputVars
            type="input"
            value={asgn.sourceTpl || ''}
            variables={responseVars}
            onChange={(next) => onValueChange('sourceTpl', next)}
            placeholder="ej: {{nombre}} {{apaterno}}"
          />
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
                  <InputVars
                    type="input"
                    value={asgn.valueTpl && asgn.valueTpl !== '$item' ? asgn.valueTpl : ''}
                    variables={toVarOptions(src.itemProps)}
                    onChange={(next) => onValueChange('valueTpl', next)}
                    placeholder="ej: {{guid}}"
                  />
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
                  <InputVars
                    type="input"
                    value={asgn.labelTpl && asgn.labelTpl !== '$item' ? asgn.labelTpl : ''}
                    variables={toVarOptions(src.itemProps)}
                    onChange={(next) => onValueChange('labelTpl', next)}
                    placeholder="ej: {{nombre}} {{apaterno}}"
                  />
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

const ResponseMappingEditor = ({
  schema,
  testJSON,
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
      onAssignmentsChange((prev) => ({ ...prev, [field]: { type: 'default', sourceTpl: '' } }));
      return;
    }

    const arraySources = findAllArraySources(schema);
    const first = arraySources[0];
    onAssignmentsChange((prev) => ({
      ...prev,
      [field]: first
        ? {
            type: 'select',
            enumSource: first.key,
            valueTpl: first.isSimple ? '$item' : '',
            labelTpl: first.isSimple ? '$item' : '',
          }
        : { type: 'select', enumSource: '', valueTpl: '', labelTpl: '' },
    }));
  };

  const onFieldArraySourceChange = (field, key) => {
    const arraySources = findAllArraySources(schema);
    const src = arraySources.find((a) => a.key === key);
    onAssignmentsChange((prev) => ({
      ...prev,
      [field]: {
        ...prev[field],
        enumSource: key,
        valueTpl: src?.isSimple ? '$item' : '',
        labelTpl: src?.isSimple ? '$item' : '',
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

  const handleRunTest = () => {
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
    Object.entries(assignments).forEach(([field, asgn]) => {
      if (!asgn) return;
      const def = { ...baseSchema[field] };
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
  const availableFields = Object.entries(baseSchema).filter(([field]) => !assignments[field]);

  return (
    <div className="xrm-rm-block">
      <div className="xrm-rm-head">
        <span className="xrm-rm-hint">Elige qué campos del formulario alimenta este endpoint</span>
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
              baseSchema={baseSchema}
              onTypeChange={(type) => onFieldTypeChange(field, type)}
              onArraySourceChange={(key) => onFieldArraySourceChange(field, key)}
              onValueChange={(key, value) => updateDraft(field, key, value)}
              onRemove={() => removeField(field)}
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
            availableFields.map(([field, def]) => (
              <div key={field} className="xrm-afm-item" onClick={() => addField(field)}>
                <span>{field}</span>
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
  );
};

export default ResponseMappingEditor;
