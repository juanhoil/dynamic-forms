import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Form from '@rjsf/mui';
import validator from '@rjsf/validator-ajv8';
import {
  SchemaVisualEditor,
  SchemaInferencer,
  JsonSchemaEditor,
} from 'jsonjoy-builder';
import 'jsonjoy-builder/styles.css';

import './example8/example8.css';

// Capa editor (componentes)
import SchemaSidebar from './example8/editor/SchemaSidebar';
import DataSourcesSection from './example8/editor/DataSourcesSection';
import TargetsPanel, { DatabaseIcon } from './example8/editor/TargetsPanel';
import OutputPanel from './example8/editor/OutputPanel';
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
  const [inferDialogOpen, setInferDialogOpen] = useState(false);
  const [advancedModalOpen, setAdvancedModalOpen] = useState(false);
  const [uiSchemaModalOpen, setUiSchemaModalOpen] = useState(false);

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
        href: t.name,
        method: t.method,
        ...(t.dataRole ? { 'x-data-role': t.dataRole } : {}),
        ...(t.templatePointers && Object.keys(t.templatePointers).length
          ? { templatePointers: t.templatePointers }
          : {}),
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
  const [mainTab, setMainTab] = useState('editor');
  const [rightTab, setRightTab] = useState('targets');
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
            t.id === editingTargetId ? { ...t, ...payload } : t
          );
        }
        const newId = `t${nextId.t}`;
        setNextId((p) => ({ t: p.t + 1 }));
        return [...prev, { id: newId, ...payload }];
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
  const requiredFields = Array.isArray(schema.required) ? schema.required : [];

  return (
    <div className="xrm-page">
      <div className="xrm-page-header">
        <h1 className="xrm-page-title">Editar Formulario</h1>
        <p className="xrm-page-description">
          Configura el <code>links[]</code> del jsonHyperSchema y los mappings
          <code> x-responseMapping</code> por endpoint. La vista previa se actualiza en vivo.
        </p>
      </div>

      <div className="xrm-app">
        <div className="xrm-topbar">
          <span className="xrm-topbar-logo">xRM</span>
          <div className="xrm-vsep" />
          <span className="xrm-topbar-title">Editor de Formularios Dinámicos</span>
          <div className="xrm-spacer" />

          <div className="xrm-main-tabs">
            <button
              className={`xrm-main-tab ${mainTab === 'editor' ? 'active' : ''}`}
              onClick={() => setMainTab('editor')}
            >
              Editor
            </button>
            <button
              className={`xrm-main-tab ${mainTab === 'preview' ? 'active' : ''}`}
              onClick={() => setMainTab('preview')}
            >
              Vista Previa
            </button>
          </div>

          <div className="xrm-vsep" />

          <button className="xrm-tbtn" onClick={() => setUiSchemaModalOpen(true)}>
            UI Schema
          </button>
          <button className="xrm-tbtn" onClick={() => setAdvancedModalOpen(true)}>
            JSON Schema
          </button>
          <button className="xrm-tbtn" onClick={() => setInferDialogOpen(true)}>
            Inferir desde JSON
          </button>
          <button className="xrm-tbtn" onClick={handleCopyOutput} title="Copiar configForm">
            <CopyIcon />
            Copiar JSON
          </button>
          <button className="xrm-tbtn primary" onClick={handleSaveConfig}>
            <SaveIcon />
            Guardar configuración
          </button>
        </div>

        <div className="xrm-workspace">
          <SchemaSidebar
            targets={targets}
            requiredFields={requiredFields}
            onOpenTarget={openEditTarget}
          />

          <div className="xrm-center">
            {mainTab === 'editor' ? (
              <div className="xrm-cbody">
                <section className="xrm-section">
                  <div className="xrm-section-head">
                    <div>
                      <div className="xrm-section-title">Initial data sources</div>
                      <div className="xrm-section-sub">
                        {targets.length} source{targets.length === 1 ? '' : 's'} configured
                      </div>
                    </div>
                    <button className="xrm-tbtn" onClick={openAddTarget}>
                      + Agregar endpoint
                    </button>
                  </div>
                  <DataSourcesSection
                    targets={targets}
                    onOpenTarget={openEditTarget}
                    onDeleteTarget={handleDeleteTarget}
                  />
                </section>

                <section className="xrm-section">
                  <div className="xrm-section-head">
                    <div>
                      <div className="xrm-section-title">JSON Schema</div>
                      <div className="xrm-section-sub">
                        Editor visual de las propiedades del formulario
                      </div>
                    </div>
                  </div>
                  <div className="xrm-jsonjoy-host">
                    <SchemaVisualEditor
                      schema={schema}
                      onChange={(next) =>
                        setSchema(
                          next && next.type === 'object' && next.additionalProperties === undefined
                            ? { ...next, additionalProperties: false }
                            : next
                        )
                      }
                    />
                  </div>
                </section>
              </div>
            ) : (
              <div className="xrm-cbody">
                <section className="xrm-section">
                  <div className="xrm-section-head">
                    <div>
                      <div className="xrm-section-title">Vista Previa</div>
                      <div className="xrm-section-sub">
                        {loading ? 'Consultando endpoints…' : 'Formulario en vivo con los mappings aplicados'}
                      </div>
                    </div>
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
                  <details className="xrm-debug">
                    <summary>formData</summary>
                    <pre>{JSON.stringify(formData, null, 2)}</pre>
                  </details>
                </section>
              </div>
            )}
          </div>

          <div className="xrm-rpanel">
            <div className="xrm-rp-tabs">
              <button
                className={`xrm-rp-tab ${rightTab === 'targets' ? 'active' : ''}`}
                onClick={() => setRightTab('targets')}
              >
                <DatabaseIcon />
                Targets
              </button>
              <button
                className={`xrm-rp-tab ${rightTab === 'output' ? 'active' : ''}`}
                onClick={() => setRightTab('output')}
              >
                Output
              </button>
            </div>
            <div className="xrm-rp-body">
              {rightTab === 'targets' ? (
                <TargetsPanel
                  targets={targets}
                  onOpenTarget={openEditTarget}
                  onAddTarget={openAddTarget}
                />
              ) : (
                <OutputPanel targets={targets} />
              )}
            </div>
          </div>
        </div>
      </div>

      <TargetModal
        open={modalOpen}
        target={editingTarget}
        onClose={closeModal}
        onSave={handleSaveTarget}
        onDelete={handleDeleteTarget}
      />

      <SchemaInferencer
        open={inferDialogOpen}
        onOpenChange={setInferDialogOpen}
        onSchemaInferred={(s) =>
          setSchema(
            s && s.type === 'object' && s.additionalProperties === undefined
              ? { ...s, additionalProperties: false }
              : s
          )
        }
      />

      <Modal open={advancedModalOpen} onClose={() => setAdvancedModalOpen(false)}>
        <div style={{ minHeight: 500 }}>
          <JsonSchemaEditor schema={schema} readOnly={false} setSchema={setSchema} />
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