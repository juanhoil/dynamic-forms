import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Form from '@rjsf/mui';
import validator from '@rjsf/validator-ajv8';
import './example8/example8.css';
import { CustomJsonSchema, JsonSchemaBuilder } from '../jsonSchemasBuilder2/components';

// Capa editor (componentes)
import TargetModal from './example8/editor/TargetModal';
import { targetsFromSchema } from './example8/editor/targetsAdapter';

// Capa utils / ui
import { buildMappingJSON } from './example8/utils/mapping';
import { CopyIcon, SaveIcon } from './example8/ui/icons';

// Hook con service inyectable
import { useJsonHyperSchema } from './example8/hooks/useJsonHyperSchema';

// Schema principal
import { shcemaNewDireccion as schemaDireccion } from './shcemas';

// Componentes E6 reutilizados
import Modal from './componetsE6/Modal';
import UiSchemaEditor from './componetsE6/UiSchemaEditor';

const Example8 = () => {
  // ── Estado del editor ──
  const initialTargets = useMemo(() => targetsFromSchema(schemaDireccion), []);
  const [targets, setTargets] = useState(initialTargets);
  const [nextId, setNextId] = useState({ t: initialTargets.length + 1 });
  const [editingTargetId, setEditingTargetId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  // ── Estado de schema / uiSchema ──
  const baseSchema = useMemo(() => {
    const { links, ...rest } = schemaDireccion;
    return rest;
  }, []);
  const [schema, setSchema] = useState(baseSchema);
  const [uiSchema, setUiSchema] = useState({});
  const [advancedModalOpen, setAdvancedModalOpen] = useState(false);
  const [uiSchemaModalOpen, setUiSchemaModalOpen] = useState(false);

  const handleSchemaChange = useCallback((next) => {
    setSchema(
      next && next.type === 'object' && next.additionalProperties === undefined
        ? { ...next, additionalProperties: false }
        : next
    );
  }, []);

  // ── Construcción del schema final ──
  const buildLinksFromTargets = useCallback(() => {
    return targets.map((t) => {
      const out = buildMappingJSON(t);
      let valueTest;
      if (t.testJSON) {
        try { valueTest = JSON.parse(t.testJSON); } catch { /* ignore */ }
      }
      return {
        rel: t.rel || t.method.toLowerCase(),
        href: t.url || t.name,
        method: t.method,
        name: t.name,
        description: t.description,
        ...(t.dataRole ? { 'x-data-role': t.dataRole } : {}),
        ...(t.templatePointers && Object.keys(t.templatePointers).length
          ? { templatePointers: t.templatePointers }
          : {}),
        request: {
          ...(t.request || {}),
          method: t.method,
          url: t.url,
        },
        response: {
          jsonSchema: out.targetSchema,
          responseMapping: out['x-responseMapping'],
          ...(valueTest !== undefined ? { testValues: valueTest } : {}),
        },
        targetSchema: out.targetSchema,
        'x-responseMapping': out['x-responseMapping'],
        ...(valueTest !== undefined ? { valueTest } : {}),
      };
    });
  }, [targets]);

  const finalSchema = useMemo(
    () => ({ ...schema, links: buildLinksFromTargets() }),
    [schema, buildLinksFromTargets]
  );

  // ── Estado del formulario (live preview con useJsonHyperSchema) ──
  const [formData, setFormData] = useState({});
  const handleHyperUpdate = useCallback((newData, newSchema) => {
    setFormData(newData);
    if (newSchema) setSchema(newSchema);
  }, []);
  const { loading } = useJsonHyperSchema(finalSchema, formData, handleHyperUpdate);

  // ── Estado UI ──
  const [editorOpen, setEditorOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(''), 1800);
    return () => clearTimeout(t);
  }, [toastMsg]);

  const showToast = useCallback((msg) => setToastMsg(msg), []);

  // ── Acciones del editor de targets ──
  const openAddTarget = useCallback(() => {
    setEditingTargetId(null);
    setModalOpen(true);
  }, []);
  const openEditTarget = useCallback((id) => {
    setEditingTargetId(id);
    setModalOpen(true);
  }, []);
  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditingTargetId(null);
  }, []);

  const handleSaveTarget = useCallback(
    (payload) => {
      setTargets((prev) => {
        if (editingTargetId) {
          return prev.map((t) =>
            t.id === editingTargetId ? { ...t, ...payload, id: t.id } : t
          );
        }
        const newId = `t${nextId.t}`;
        setNextId((p) => ({ t: p.t + 1 }));
        return [...prev, { ...payload, id: newId }];
      });
      closeModal();
    },
    [editingTargetId, nextId.t, closeModal]
  );

  const handleDeleteTarget = useCallback(
    (target) => {
      if (!window.confirm(`¿Eliminar el endpoint "${target.name}"?`)) return;
      setTargets((prev) => prev.filter((t) => t.id !== target.id));
      closeModal();
    },
    [closeModal]
  );

  // ── Acciones de export ──
  const handleSaveConfig = useCallback(() => {
    const config = {
      schema: finalSchema,
      uiSchema,
      inputValues: formData,
    };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'configForm.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Guardado ✓');
  }, [finalSchema, uiSchema, formData, showToast]);

  const handleCopyOutput = useCallback(() => {
    const payload = { schema: finalSchema, uiSchema };
    navigator.clipboard
      .writeText(JSON.stringify(payload, null, 2))
      .then(() => showToast('Copiado ✓'))
      .catch(() => showToast('No se pudo copiar'));
  }, [finalSchema, uiSchema, showToast]);

  const editingTarget = targets.find((t) => t.id === editingTargetId) || null;
  const openDataEditor = useCallback(() => {
    const firstTarget = targets[0];
    if (firstTarget?.id) {
      openEditTarget(firstTarget.id);
      return;
    }
    openAddTarget();
  }, [targets, openAddTarget, openEditTarget]);

  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">Ejemplo 8: Layout de 3 Columnas</h1>
        <p className="page-description">
          Editor visual del schema, configuración de data y vista previa del formulario.
        </p>
        <button
          onClick={handleSaveConfig}
          style={{
            background: '#2e7d32',
            color: 'white',
            border: 'none',
            fontSize: '0.9rem',
            cursor: 'pointer',
            padding: '0.5rem 1.2rem',
            borderRadius: '6px',
            lineHeight: 1,
            transition: 'background-color 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            marginTop: '0.75rem',
            marginLeft: 'auto',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#1b5e20'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#2e7d32'; }}
        >
          <SaveIcon />
          Guardar configuración
        </button>
      </div>

      <div
        className="playground-container"
        style={{
          gridTemplateColumns: editorOpen ? '1fr 1fr 1fr' : '1fr',
        }}
      >
        {editorOpen && (
          <div className="panel" style={{ gridColumn: 'span 2' }}>
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', marginBottom: '0.75rem' }}>
                <h2 className="panel-title" style={{ marginBottom: 0, textAlign: 'center' }}>
                  Editor de Formulario
                </h2>
                <button
                  onClick={() => setEditorOpen(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '1.5rem',
                    cursor: 'pointer',
                    color: '#666',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    lineHeight: 1,
                    transition: 'background-color 0.2s, color 0.2s',
                    position: 'absolute',
                    right: 0,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#ffebee';
                    e.currentTarget.style.color = '#d32f2f';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#666';
                  }}
                  title="Cerrar editor"
                >
                  x
                </button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setUiSchemaModalOpen(true)}
                  style={{
                    background: 'none',
                    border: '1px solid #ddd',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    color: '#666',
                    padding: '0.4rem 0.7rem',
                    borderRadius: '6px',
                    lineHeight: 1,
                    transition: 'background-color 0.2s, color 0.2s, border-color 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f3e8ff';
                    e.currentTarget.style.color = '#7c3aed';
                    e.currentTarget.style.borderColor = '#7c3aed';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#666';
                    e.currentTarget.style.borderColor = '#ddd';
                  }}
                >
                  UI Schema
                </button>
                <button
                  onClick={() => setAdvancedModalOpen(true)}
                  style={{
                    background: 'none',
                    border: '1px solid #ddd',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    color: '#666',
                    padding: '0.4rem 0.7rem',
                    borderRadius: '6px',
                    lineHeight: 1,
                    transition: 'background-color 0.2s, color 0.2s, border-color 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#fff3e0';
                    e.currentTarget.style.color = '#e65100';
                    e.currentTarget.style.borderColor = '#e65100';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#666';
                    e.currentTarget.style.borderColor = '#ddd';
                  }}
                >
                  JSON Schema
                </button>
                <button
                  onClick={openDataEditor}
                  style={{
                    background: 'none',
                    border: '1px solid #ddd',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    color: '#666',
                    padding: '0.4rem 0.7rem',
                    borderRadius: '6px',
                    lineHeight: 1,
                    transition: 'background-color 0.2s, color 0.2s, border-color 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#e0f2fe';
                    e.currentTarget.style.color = '#0369a1';
                    e.currentTarget.style.borderColor = '#0369a1';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#666';
                    e.currentTarget.style.borderColor = '#ddd';
                  }}
                >
                  Data
                </button>
                <button
                  onClick={handleCopyOutput}
                  title="Copiar configForm"
                  style={{
                    background: 'none',
                    border: '1px solid #ddd',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    color: '#666',
                    padding: '0.4rem 0.7rem',
                    borderRadius: '6px',
                    lineHeight: 1,
                    transition: 'background-color 0.2s, color 0.2s, border-color 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#ecfdf5';
                    e.currentTarget.style.color = '#047857';
                    e.currentTarget.style.borderColor = '#047857';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#666';
                    e.currentTarget.style.borderColor = '#ddd';
                  }}
                >
                  <CopyIcon />
                  Copiar JSON
                </button>
              </div>
            </div>



            <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Links / Data</h3>
                  <p className="text-xs text-gray-500">
                    Edita los endpoints que alimentan este formulario.
                  </p>
                </div>
                <button
                  className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                  onClick={openAddTarget}
                  type="button"
                >
                  + Data
                </button>
              </div>

              {targets.length ? (
                <div className="flex flex-col gap-2">
                  {targets.map((target) => {
                    const mappingCount = Object.keys(target.assignments || {}).length;

                    return (
                      <button
                        key={target.id}
                        className="flex w-full items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-left transition hover:border-blue-300 hover:bg-blue-50"
                        onClick={() => openEditTarget(target.id)}
                        type="button"
                      >
                        <span className="min-w-12 rounded-md border border-gray-200 bg-white px-2 py-1 text-center font-mono text-[11px] font-bold text-gray-700">
                          {target.method || 'GET'}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-gray-900">
                            {target.name || target.rel || target.url || 'Endpoint sin nombre'}
                          </span>
                          <span className="block truncate font-mono text-xs text-gray-500">
                            {target.url || target.href || 'Sin URL configurada'}
                          </span>
                        </span>
                        <span className="rounded-full border border-gray-200 bg-white px-2 py-1 text-xs text-gray-500">
                          {mappingCount} mapeos
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-5 text-center text-sm text-gray-500">
                  No hay links configurados todavía.
                </div>
              )}
            </div>

            <div className="xrm-jsonjoy-host" style={{ width: '100%', minHeight: '400px' }}>
              <CustomJsonSchema
                schema={schema}
                onChange={handleSchemaChange}
              />
            </div>
          </div>
        )}

        <div className="panel">
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', marginBottom: '1rem' }}>
            <h2 className="panel-title" style={{ marginBottom: 0, textAlign: 'center' }}>
              Vista Previa
            </h2>
            {!editorOpen && (
              <button
                onClick={() => setEditorOpen(true)}
                style={{
                  background: 'none',
                  border: '1px solid #ddd',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  color: '#666',
                  padding: '0.4rem 0.6rem',
                  borderRadius: '6px',
                  lineHeight: 1,
                  transition: 'background-color 0.2s, color 0.2s, border-color 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  position: 'absolute',
                  right: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#e3f2fd';
                  e.currentTarget.style.color = '#1976d2';
                  e.currentTarget.style.borderColor = '#1976d2';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#666';
                  e.currentTarget.style.borderColor = '#ddd';
                }}
                title="Abrir editor"
              >
                Editar
              </button>
            )}
          </div>

          <div className="xrm-preview-host">
            <Form
              schema={schema}
              uiSchema={uiSchema}
              formData={formData}
              validator={validator}
              onChange={({ formData: fd }) => setFormData(fd)}
            />
          </div>

          <div style={{ marginTop: '2rem' }}>
            <h3 className="panel-title">Form Data (JSON):</h3>
            <div className="json-output">
              {loading ? 'Consultando endpoints...' : JSON.stringify(formData, null, 2)}
            </div>
          </div>
      </div>
      </div>

      <TargetModal
        key={editingTargetId || 'new-target'}
        open={modalOpen}
        target={editingTarget}
        onClose={closeModal}
        onSave={handleSaveTarget}
        onDelete={handleDeleteTarget}
      />

      <Modal open={advancedModalOpen} onClose={() => setAdvancedModalOpen(false)}>
        <div style={{ minHeight: 500 }}>
          <JsonSchemaBuilder schema={schema} setSchema={handleSchemaChange} />
        </div>
      </Modal>

      <Modal open={uiSchemaModalOpen} onClose={() => setUiSchemaModalOpen(false)}>
        <div style={{ minHeight: 500 }}>
          <UiSchemaEditor uiSchema={uiSchema} onChange={setUiSchema} />
        </div>
      </Modal>

      {toastMsg && <div className="xrm-toast">{toastMsg}</div>}
    </div>
  );
};

export default Example8;