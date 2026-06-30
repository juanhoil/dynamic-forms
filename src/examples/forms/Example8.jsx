import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Form from '@rjsf/mui';
import validator from '@rjsf/validator-ajv8';
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
        ...(t.dataRole ? { 'dataRole  ': t.dataRole } : {}),
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
    <div className="mx-auto min-h-screen max-w-[1400px] bg-slate-50 px-4 py-8 text-gray-950">
      <header className="mb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-gray-950">
              Ejemplo 8: Layout de 3 Columnas
            </h1>
            <p className="mt-2 max-w-3xl text-base leading-7 text-gray-600">
              Editor visual del schema, configuración de data y vista previa del formulario.
            </p>
          </div>
          <button
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800"
            onClick={handleSaveConfig}
            type="button"
          >
            <SaveIcon />
            Guardar configuración
          </button>
        </div>
      </header>

      <div className={`grid gap-6 ${editorOpen ? 'lg:grid-cols-3' : ''}`}>
        {editorOpen && (
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm lg:col-span-2">
            <div className="mb-5">
              <div className="relative mb-4 flex items-center justify-center">
                <h2 className="text-xl font-semibold text-gray-900">Editor de Formulario</h2>
                <button
                  className="absolute right-0 rounded-lg px-3 py-1.5 text-xl leading-none text-gray-500 transition hover:bg-red-50 hover:text-red-600"
                  onClick={() => setEditorOpen(false)}
                  title="Cerrar editor"
                  type="button"
                >
                  x
                </button>
              </div>

              <div className="flex flex-wrap justify-center gap-2">
                <button
                  className="rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-violet-50 hover:text-violet-700"
                  onClick={() => setUiSchemaModalOpen(true)}
                  type="button"
                >
                  UI Schema
                </button>
                <button
                  className="rounded-lg border border-orange-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-orange-50 hover:text-orange-700"
                  onClick={() => setAdvancedModalOpen(true)}
                  type="button"
                >
                  JSON Schema
                </button>
                <button
                  className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-sky-50 hover:text-sky-700"
                  onClick={openDataEditor}
                  type="button"
                >
                  Data
                </button>
                <button
                  className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-emerald-50 hover:text-emerald-700"
                  onClick={handleCopyOutput}
                  title="Copiar configForm"
                  type="button"
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


            <div className="min-h-[400px] overflow-hidden rounded-xl border border-gray-200 bg-white text-gray-950 [color-scheme:light]">
              <CustomJsonSchema schema={schema} onChange={handleSchemaChange} />
            </div>
          </section>
        )}

        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="relative mb-4 flex items-center justify-center">
            <h2 className="text-xl font-semibold text-gray-900">Vista Previa</h2>
            {!editorOpen && (
              <button
                className="absolute right-0 rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-blue-50 hover:text-blue-700"
                onClick={() => setEditorOpen(true)}
                title="Abrir editor"
                type="button"
              >
                Editar
              </button>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 text-gray-950 [color-scheme:light]">
            <Form
              schema={schema}
              uiSchema={uiSchema}
              formData={formData}
              validator={validator}
              onChange={({ formData: fd }) => setFormData(fd)}
            />
          </div>

          <div className="mt-8">
            <h3 className="mb-3 text-xl font-semibold text-gray-900">Form Data (JSON):</h3>
            <pre className="max-h-[400px] overflow-auto whitespace-pre-wrap break-words rounded-lg border border-gray-200 bg-gray-50 p-4 font-mono text-sm text-gray-800">
              {loading ? 'Consultando endpoints...' : JSON.stringify(formData, null, 2)}
            </pre>
          </div>
        </section>
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
        <div className="min-h-[500px]">
          <JsonSchemaBuilder schema={schema} setSchema={handleSchemaChange} />
        </div>
      </Modal>

      <Modal open={uiSchemaModalOpen} onClose={() => setUiSchemaModalOpen(false)}>
        <div className="min-h-[500px]">
          <UiSchemaEditor uiSchema={uiSchema} onChange={setUiSchema} />
        </div>
      </Modal>

      {toastMsg && (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-[99999] -translate-x-1/2 rounded-full bg-blue-600 px-5 py-2 text-sm font-medium text-white shadow-lg">
          {toastMsg}
        </div>
      )}
    </div>
  );
};

export default Example8;