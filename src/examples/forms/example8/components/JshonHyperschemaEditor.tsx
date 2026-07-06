import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Form from '@rjsf/mui';
import validator from '@rjsf/validator-ajv8';
import { CustomJsonSchema, JsonSchemaBuilder } from '../../../jsonSchemasBuilder2/components';
import ConfigHyperSchemaModal from '../editor/ConfigHyperSchemaModal';
import { CopyIcon, PlayIcon, SaveIcon } from '../ui/icons';
import { useJsonHyperSchema } from '../hooks/useJsonHyperSchema';
import Modal from '../../componetsE6/Modal';
import UiSchemaEditor from '../../componetsE6/UiSchemaEditor';
import type { HyperSchemaLink, JsonHyperSchema } from '../../types';

export type JshonHyperschemaEditorProps = {
  baseConfig?: {
    schema?: JsonHyperSchema;
    uiSchema?: Record<string, any>;
    [key: string]: any;
  };
  log?: Record<string, any>;
};

const cleanLinkForConfig = (link: HyperSchemaLink): HyperSchemaLink => {
  const request = (link.request || {}) as Partial<HyperSchemaLink['request']>;
  const response = (link.response || {}) as Partial<HyperSchemaLink['response']>;
  const cleanLink: HyperSchemaLink = {
    id: link.id,
    name: link.name || '',
    description: link.description || '',
    dataRole: link.dataRole,
    request: {
      method: request.method || link.method || 'GET',
      url: request.url || link.url || link.href || '',
      headers: request.headers || {},
      body: request.body || {},
      queryVariables: request.queryVariables || {},
      externalVariables: request.externalVariables || {},
      templatePointers: request.templatePointers,
      testValues: request.testValues || {},
    },
    response: {
      jsonSchema: response.jsonSchema,
      testValues: response.testValues,
      responseMapping: response.responseMapping || {},
    },
  };

  if (link.rel) cleanLink.rel = link.rel;
  if (link.href) cleanLink.href = link.href;
  if (link.targetSchema) cleanLink.targetSchema = link.targetSchema;

  return cleanLink;
};

const getLinkMappingCount = (link: HyperSchemaLink) => {
  const assignmentsCount = Object.keys(link.assignments || {}).length;
  if (assignmentsCount) return assignmentsCount;

  return Object.keys(link.response.responseMapping).length;
};

const JshonHyperschemaEditor = ({
  baseConfig = { schema: {} as JsonHyperSchema, uiSchema: {} },
  log = { dataInput: {}, dataOutput: {} },
}: JshonHyperschemaEditorProps = {}) => {
  const baseConfigInicial = baseConfig;
  const formLogInicial = log;
  const {
    schema: schemaConLinksInicial = {},
    uiSchema: uiSchemaInicial = {},
  } = baseConfigInicial;
  const {
    dataInput: dataInputInicial = {},
  } = formLogInicial;

  const { links: linksIniciales = [], ...formSchemaInicial } = schemaConLinksInicial;

  const initialLinks = useMemo(() => linksIniciales, [
    linksIniciales,
  ]);
  const [links, setLinks] = useState<HyperSchemaLink[]>(initialLinks);
  const [nextId, setNextId] = useState({ t: initialLinks.length + 1 });
  const [editingLinkId, setEditingLinkId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [formSchema, setFormSchema] = useState(formSchemaInicial);
  const [activePreviewSchema, setActivePreviewSchema] = useState(formSchemaInicial);
  const [formUiSchema, setFormUiSchema] = useState(uiSchemaInicial);
  const [advancedModalOpen, setAdvancedModalOpen] = useState(false);
  const [uiSchemaModalOpen, setUiSchemaModalOpen] = useState(false);

  const handleSchemaChange = useCallback((next) => {
    const normalized =
      next && next.type === 'object' && next.additionalProperties === undefined
        ? { ...next, additionalProperties: false }
        : next;
    setFormSchema(normalized);
    setActivePreviewSchema(normalized);
  }, []);

  const finalSchema = useMemo(
    () => ({ ...formSchema, links: links.map(cleanLinkForConfig) }),
    [formSchema, links]
  );

  const externalVariables = useMemo(() => {
    const byName = new Map<string, { name: string; type: string; links: string[] }>();
    for (const link of links) {
      const properties = (link.request?.externalVariables as any)?.properties || {};
      for (const [name, rawDef] of Object.entries(properties)) {
        const def = rawDef as any;
        const type = Array.isArray(def?.type) ? def.type[0] : def?.type || 'string';
        const linkLabel = link.name || link.request?.url || link.id || 'sin nombre';
        const existing = byName.get(name);
        if (existing) existing.links.push(linkLabel);
        else byName.set(name, { name, type, links: [linkLabel] });
      }
    }
    return [...byName.values()];
  }, [links]);

  const [formData, setFormData] = useState(dataInputInicial);
  const handleHyperUpdate = useCallback((newData, newSchema) => {
    setFormData(newData);
    if (newSchema) setActivePreviewSchema(newSchema);
  }, []);
  const { loading, start, submit } = useJsonHyperSchema(
    finalSchema,
    formData,
    handleHyperUpdate,
    { autoStart: false, useTestValues: true }
  );

  const finalBaseConfig = useMemo(
    () => ({
      ...baseConfigInicial,
      schema: finalSchema,
      uiSchema: formUiSchema,
    }),
    [baseConfigInicial, finalSchema, formUiSchema]
  );

  const [editorOpen, setEditorOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(''), 1800);
    return () => clearTimeout(t);
  }, [toastMsg]);

  const showToast = useCallback((msg) => setToastMsg(msg), []);
  const handleStartHyperSchema = useCallback(async () => {
    const result = await start();
    showToast(result?.ok ? 'HyperSchema inicializado' : 'No se pudo inicializar');
  }, [showToast, start]);

  const handleSubmitHyperSchema = useCallback(async () => {
    const result = await submit();
    showToast(result?.ok ? 'Formulario enviado' : 'No se pudo enviar');
  }, [showToast, submit]);

  const openAddLink = useCallback(() => {
    setEditingLinkId(null);
    setModalOpen(true);
  }, []);
  const openEditLink = useCallback((id) => {
    setEditingLinkId(id);
    setModalOpen(true);
  }, []);
  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditingLinkId(null);
  }, []);

  const handleSaveLink = useCallback(
    (payload) => {
      setLinks((prev) => {
        if (editingLinkId) {
          return prev.map((t) =>
            t.id === editingLinkId ? { ...t, ...payload, id: t.id } : t
          );
        }
        const newId = `t${nextId.t}`;
        setNextId((p) => ({ t: p.t + 1 }));
        return [...prev, { ...payload, id: newId }];
      });
      closeModal();
    },
    [editingLinkId, nextId.t, closeModal]
  );

  const handleDeleteLink = useCallback(
    (link) => {
      if (!window.confirm(`¿Eliminar el endpoint "${link.name}"?`)) return;
      setLinks((prev) => prev.filter((item) => item.id !== link.id));
      closeModal();
    },
    [closeModal]
  );

  const handleSaveConfig = useCallback(() => {
    const blob = new Blob([JSON.stringify(finalBaseConfig, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'configForm.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Guardado ✓');
  }, [finalBaseConfig, showToast]);

  const handleCopyOutput = useCallback(() => {
    navigator.clipboard
      .writeText(JSON.stringify(finalBaseConfig, null, 2))
      .then(() => showToast('Copiado ✓'))
      .catch(() => showToast('No se pudo copiar'));
  }, [finalBaseConfig, showToast]);

  const editingLink = links.find((link) => link.id === editingLinkId) || null;
  const openDataEditor = useCallback(() => {
    const firstLink = links[0];
    if (firstLink?.id) {
      openEditLink(firstLink.id);
      return;
    }
    openAddLink();
  }, [links, openAddLink, openEditLink]);

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
                  onClick={openAddLink}
                  type="button"
                >
                  + Data
                </button>
              </div>

              {externalVariables.length > 0 && (
                <div className="mb-3 rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-2">
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                    Variables externas de los links
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {externalVariables.map((variable) => (
                      <span
                        key={variable.name}
                        className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-white px-2 py-0.5 font-mono text-[11px] text-emerald-700"
                        title={`Usada en: ${variable.links.join(', ')}`}
                      >
                        {variable.name}
                        <span className="text-emerald-400">{variable.type}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {links.length ? (
                <div className="flex flex-col gap-2">
                  {links.map((link) => {
                    const mappingCount = getLinkMappingCount(link);

                    return (
                      <button
                        key={link.id}
                        className="flex w-full items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-left transition hover:border-blue-300 hover:bg-blue-50"
                        onClick={() => openEditLink(link.id)}
                        type="button"
                      >
                        <span className="min-w-12 rounded-md border border-gray-200 bg-white px-2 py-1 text-center font-mono text-[11px] font-bold text-gray-700">
                          {link.request.method}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-gray-900">
                            {link.name || link.rel || link.request.url || 'Endpoint sin nombre'}
                          </span>
                          <span className="block truncate font-mono text-xs text-gray-500">
                            {link.request.url}
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
              <CustomJsonSchema schema={formSchema} onChange={handleSchemaChange} />
            </div>
          </section>
        )}

        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="relative mb-4 flex items-center justify-center">
            <button
              className="absolute left-0 inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={loading}
              onClick={handleStartHyperSchema}
              title="Inicializar HyperSchema"
              type="button"
            >
              <PlayIcon size={11} />
              {loading ? 'Ejecutando...' : 'Play'}
            </button>
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
              schema={activePreviewSchema}
              uiSchema={formUiSchema}
              formData={formData}
              validator={validator}
              onChange={({ formData: fd }) => setFormData(fd)}
              onSubmit={handleSubmitHyperSchema}
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

      <ConfigHyperSchemaModal
        key={editingLinkId || 'new-link'}
        open={modalOpen}
        linkConfig={editingLink}
        onClose={closeModal}
        onSave={handleSaveLink}
        onDelete={handleDeleteLink}
      />

      <Modal open={advancedModalOpen} onClose={() => setAdvancedModalOpen(false)}>
        <div className="min-h-[500px]">
          <JsonSchemaBuilder schema={formSchema} setSchema={handleSchemaChange} />
        </div>
      </Modal>

      <Modal open={uiSchemaModalOpen} onClose={() => setUiSchemaModalOpen(false)}>
        <div className="min-h-[500px]">
          <UiSchemaEditor uiSchema={formUiSchema} onChange={setFormUiSchema} />
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

export default JshonHyperschemaEditor;
