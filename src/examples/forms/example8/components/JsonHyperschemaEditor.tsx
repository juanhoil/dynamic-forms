import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Form from '@rjsf/mui';
import validator from '@rjsf/validator-ajv8';
import { CustomJsonSchema, JsonSchemaBuilder } from '../../../jsonSchemasBuilder2/components';
import ConfigHyperSchemaModal from '../editor/ConfigHyperSchemaModal';
import { CopyIcon, DatabaseIcon, PlayIcon, SaveIcon } from '../ui/icons';
import { useJsonHyperSchema } from '../hooks/useJsonHyperSchema';
import Modal from './Modal';
import UiSchemaEditor from './UiSchemaEditor';
import { EnumDataType, EnumHyperSchemaLinkRole } from '../../types';
import type { HyperSchemaConfig, HyperSchemaLink, JsonHyperSchema, JsonSchema } from '../../types';

export type EditorConfig = HyperSchemaConfig & { uiSchema?: Record<string, any> };

export type JsonHyperschemaEditorProps = {
  baseConfig?: EditorConfig;
  log?: Record<string, any>;
};

const EMPTY_FORM_SCHEMA: JsonHyperSchema = { type: 'object', properties: {} };
const EMPTY_EXTERNAL_VARIABLES: JsonSchema = { type: 'object', properties: {} };

// Métodos y roles permitidos según el tipo de link.
const SUBMIT_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];
const SUBMIT_ROLES = [EnumHyperSchemaLinkRole.SUBMIT];
const DATA_SOURCE_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
const DATA_SOURCE_ROLES = [
  EnumHyperSchemaLinkRole.INIT, 
  EnumHyperSchemaLinkRole.CATALOG, 
  EnumHyperSchemaLinkRole.DEPENDENT];

// Deja el link listo para el config: sin externalVariables por link (ahora
// son globales) pero conservando request/response/mapping.
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
  return Object.keys(link.response?.responseMapping || {}).length;
};

const JsonHyperschemaEditor = ({
  baseConfig = { formSchema: EMPTY_FORM_SCHEMA },
  log = { dataInput: {}, dataOutput: {} },
}: JsonHyperschemaEditorProps = {}) => {
  const baseConfigInicial = baseConfig;
  const { dataInput: dataInputInicial = {} } = log;

  // Estado del modelo dividido.
  const [formSchema, setFormSchema] = useState<JsonHyperSchema>(
    (baseConfigInicial.formSchema || EMPTY_FORM_SCHEMA) as JsonHyperSchema
  );
  const [externalVariables, setExternalVariables] = useState<JsonSchema>(
    (baseConfigInicial.externalVariables || EMPTY_EXTERNAL_VARIABLES) as JsonSchema
  );
  const [dataSource, setDataSource] = useState<HyperSchemaLink[]>(baseConfigInicial.dataSource || []);
  const [submit, setSubmit] = useState<HyperSchemaLink | null>(baseConfigInicial.submit || null);
  const [formUiSchema, setFormUiSchema] = useState<Record<string, any>>(baseConfigInicial.uiSchema || {});

  const [activePreviewSchema, setActivePreviewSchema] = useState<JsonHyperSchema>(
    (baseConfigInicial.formSchema || EMPTY_FORM_SCHEMA) as JsonHyperSchema
  );
  const [formData, setFormData] = useState(dataInputInicial);

  const [nextId, setNextId] = useState({ t: (baseConfigInicial.dataSource || []).length + 1 });
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [linkType, setLinkType] = useState<EnumDataType>(EnumDataType.DATA_SOURCES);
  const [modalOpen, setModalOpen] = useState(false);
  const [advancedModalOpen, setAdvancedModalOpen] = useState(false);
  const [uiSchemaModalOpen, setUiSchemaModalOpen] = useState(false);
  const [externalModalOpen, setExternalModalOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const handleSchemaChange = useCallback((next: JsonHyperSchema) => {
    const normalized =
      next && next.type === 'object' && next.additionalProperties === undefined
        ? { ...next, additionalProperties: false }
        : next;
    setFormSchema(normalized);
    setActivePreviewSchema(normalized);
  }, []);

  // Lista visible de links: dataSource (lectura) + submit (único).
  const links = useMemo<HyperSchemaLink[]>(
    () => [...dataSource, ...(submit ? [submit] : [])],
    [dataSource, submit]
  );

  const finalConfig = useMemo<HyperSchemaConfig>(
    () => ({
      formSchema,
      externalVariables,
      dataSource: dataSource.map(cleanLinkForConfig),
      submit: submit ? cleanLinkForConfig(submit) : null,
    }),
    [formSchema, externalVariables, dataSource, submit]
  );

  const externalVariableNames = useMemo(() => {
    const properties = (externalVariables?.properties || {}) as Record<string, any>;
    return Object.entries(properties).map(([name, def]) => ({
      name,
      type: Array.isArray(def?.type) ? def.type[0] : def?.type || 'string',
    }));
  }, [externalVariables]);

  const handleHyperUpdate = useCallback((newData: any, newSchema?: JsonHyperSchema) => {
    setFormData(newData);
    if (newSchema) setActivePreviewSchema(newSchema);
  }, []);

  const { loading, start, submit: runSubmit } = useJsonHyperSchema(
    finalConfig,
    formData,
    handleHyperUpdate,
    { autoStart: false, useTestValues: true }
  );

  const finalBaseConfig = useMemo(
    () => ({
      ...baseConfigInicial,
      ...finalConfig,
      uiSchema: formUiSchema,
    }),
    [baseConfigInicial, finalConfig, formUiSchema]
  );

  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(''), 1800);
    return () => clearTimeout(t);
  }, [toastMsg]);

  const showToast = useCallback((msg: string) => setToastMsg(msg), []);

  const handleStartHyperSchema = useCallback(async () => {
    const result = await start();
    showToast(result?.ok ? 'HyperSchema inicializado' : 'No se pudo inicializar');
  }, [showToast, start]);

  const handleSubmitHyperSchema = useCallback(async () => {
    const result = await runSubmit();
    showToast(result?.ok ? 'Formulario enviado' : 'No se pudo enviar');
  }, [showToast, runSubmit]);

  // Alta de un data source (links de lectura: init / catalog / dependent).
  const openAddDataSource = useCallback(() => {
    setLinkType(EnumDataType.DATA_SOURCES);
    setEditingLinkId(null);
    setModalOpen(true);
  }, []);

  // Alta/edición del submit (único). Si ya existe, se edita en lugar de crear otro.
  const openSubmit = useCallback(() => {
    setLinkType(EnumDataType.SUBMIT);
    setEditingLinkId(submit?.id ?? null);
    setModalOpen(true);
  }, [submit]);

  const openEditLink = useCallback(
    (id: string) => {
      const target = links.find((l) => l.id === id);
      setLinkType(target?.dataRole === 'submit' ? EnumDataType.SUBMIT : EnumDataType.DATA_SOURCES);
      setEditingLinkId(id);
      setModalOpen(true);
    },
    [links]
  );
  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditingLinkId(null);
  }, []);

  const modalMethodOptions = linkType === EnumDataType.SUBMIT ? SUBMIT_METHODS : DATA_SOURCE_METHODS;
  const modalDataRoleOptions = linkType === EnumDataType.SUBMIT ? SUBMIT_ROLES : DATA_SOURCE_ROLES;

  const handleSaveLink = useCallback(
    (payload: any) => {
      const id = editingLinkId || `t${nextId.t}`;
      if (!editingLinkId) setNextId((p) => ({ t: p.t + 1 }));
      const link: HyperSchemaLink = { ...payload, id };
      const isSubmit = payload.dataRole === 'submit';

      if (isSubmit) {
        // submit es único; quítalo de dataSource si estaba ahí.
        setDataSource((prev) => prev.filter((l) => l.id !== id));
        setSubmit(link);
      } else {
        setSubmit((prev) => (prev && prev.id === id ? null : prev));
        setDataSource((prev) => {
          const existed = prev.some((l) => l.id === id);
          return existed ? prev.map((l) => (l.id === id ? link : l)) : [...prev, link];
        });
      }
      closeModal();
    },
    [editingLinkId, nextId.t, closeModal]
  );

  const handleDeleteLink = useCallback(
    (link: HyperSchemaLink) => {
      if (!window.confirm(`¿Eliminar el endpoint "${link.name}"?`)) return;
      setDataSource((prev) => prev.filter((item) => item.id !== link.id));
      setSubmit((prev) => (prev && prev.id === link.id ? null : prev));
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

  return (
    <div className="text-gray-950">
      <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
        <button
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800"
          onClick={handleSaveConfig}
          type="button"
        >
          <SaveIcon />
          Guardar configuración
        </button>
      </div>

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
                  className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-amber-50 hover:text-amber-700"
                  onClick={() => setExternalModalOpen(true)}
                  type="button"
                >
                  Variables externas
                </button>
                <button
                  className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                  onClick={openAddDataSource}
                  type="button"
                >
                  <DatabaseIcon />
                  + Data sources
                </button>
                <button
                  className="inline-flex items-center gap-2 rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-xs font-semibold text-purple-700 transition hover:bg-purple-100"
                  onClick={openSubmit}
                  type="button"
                >
                  <DatabaseIcon />
                  {submit ? 'Editar submit' : '+ Submit'}
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
                    dataSource (lectura) y un único submit alimentan este formulario.
                  </p>
                </div>
              </div>

              {externalVariableNames.length > 0 && (
                <div className="mb-3 rounded-lg border border-amber-100 bg-amber-50/60 px-3 py-2">
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                    Variables externas (globales)
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {externalVariableNames.map((variable) => (
                      <span
                        key={variable.name}
                        className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-white px-2 py-0.5 font-mono text-[11px] text-amber-700"
                      >
                        {variable.name}
                        <span className="text-amber-400">{variable.type}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {links.length ? (
                <div className="flex flex-col gap-2">
                  {links.map((link) => {
                    const mappingCount = getLinkMappingCount(link);
                    const isSubmit = link.dataRole === 'submit';

                    return (
                      <button
                        key={link.id}
                        className="flex w-full items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-left transition hover:border-blue-300 hover:bg-blue-50"
                        onClick={() => openEditLink(link.id as string)}
                        type="button"
                      >
                        <span className="min-w-12 rounded-md border border-gray-200 bg-white px-2 py-1 text-center font-mono text-[11px] font-bold text-gray-700">
                          {link.request?.method}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-gray-900">
                            {link.name || link.rel || link.request?.url || 'Endpoint sin nombre'}
                          </span>
                          <span className="block truncate font-mono text-xs text-gray-500">
                            {link.request?.url}
                          </span>
                        </span>
                        {isSubmit ? (
                          <span className="rounded-full border border-purple-200 bg-purple-50 px-2 py-1 text-xs font-semibold text-purple-700">
                            submit
                          </span>
                        ) : (
                          <span className="rounded-full border border-gray-200 bg-white px-2 py-1 text-xs text-gray-500">
                            {mappingCount} mapeos
                          </span>
                        )}
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
        key={editingLinkId || `new-${linkType}`}
        open={modalOpen}
        linkConfig={editingLink}
        formSchema={formSchema}
        externalVariables={externalVariables}
        method={modalMethodOptions}
        dataRole={modalDataRoleOptions}
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

      <Modal open={externalModalOpen} onClose={() => setExternalModalOpen(false)}>
        <div className="min-h-[500px]">
          <div className="mb-3">
            <h3 className="text-lg font-semibold text-gray-900">Variables externas (globales)</h3>
            <p className="text-sm text-gray-500">
              Declara las variables externas compartidas por todos los links (ej. userId, tokens).
            </p>
          </div>
          <CustomJsonSchema schema={externalVariables} onChange={setExternalVariables} />
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

export default JsonHyperschemaEditor;
