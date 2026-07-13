import { useCallback, useEffect, useState } from 'react';
import JsonHyperschemaEditor, {
  type EditorConfig,
} from './example8/components/JsonHyperschemaEditor';
import type { JsonHyperSchema } from './types';
const API_BASE = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3000';

type FormConfigLite = {
  id: number;
  name?: string;
  description?: string;
};

let pendingConfigListRequest: Promise<unknown> | null = null;

const fetchConfigList = (): Promise<unknown> => {
  if (!pendingConfigListRequest) {
    pendingConfigListRequest = fetch(`${API_BASE}/api/form-config/get-all`)
      .then((res) =>
        res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))
      )
      .finally(() => {
        pendingConfigListRequest = null;
      });
  }
  return pendingConfigListRequest;
};

type Example8Props = {
  baseConfig?: EditorConfig;
  log?: Record<string, any>;
};

const emptyBaseConfig: EditorConfig = {
  formSchema: { type: 'object', properties: {} } as JsonHyperSchema,
  externalVariables: { type: 'object', properties: {} },
  dataSource: [],
  submit: null,
  uiSchema: {},
};

const defaultFormLog = {
  dataInput: {},
  dataOutput: {},
};

const Example8 = ({ baseConfig, log = defaultFormLog }: Example8Props = {}) => {
  const [configList, setConfigList] = useState<FormConfigLite[]>([]);
  const [configLoading, setConfigLoading] = useState(false);
  const [currentConfigId, setCurrentConfigId] = useState<number | null>(null);
  const [activeConfig, setActiveConfig] = useState<EditorConfig>(
    baseConfig ?? emptyBaseConfig
  );
  const [editorKey, setEditorKey] = useState(0);
  const [toastMsg, setToastMsg] = useState('');

  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(''), 1800);
    return () => clearTimeout(t);
  }, [toastMsg]);

  const showToast = useCallback((msg: string) => setToastMsg(msg), []);

  // Lista de configuraciones disponibles (backend opcional).
  useEffect(() => {
    let active = true;
    fetchConfigList()
      .then((list) => {
        if (active && Array.isArray(list)) setConfigList(list as FormConfigLite[]);
      })
      .catch(() => {
        /* backend opcional: si no responde, solo no se listan configs */
      });
    return () => {
      active = false;
    };
  }, []);

  // Reemplaza la config activa y fuerza un remount del editor para resetearlo.
  const loadConfig = useCallback((config: EditorConfig) => {
    setActiveConfig(config);
    setEditorKey((k) => k + 1);
  }, []);

  const handleOpenConfig = useCallback(
    async (id: number) => {
      setConfigLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/form-config/get/${id}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const config = (await res.json()) as EditorConfig & { name?: string };
        loadConfig(config);
        setCurrentConfigId(id);
        showToast(`Config "${config?.name ?? id}" cargada`);
      } catch {
        showToast('No se pudo cargar la configuración');
      } finally {
        setConfigLoading(false);
      }
    },
    [loadConfig, showToast]
  );

  const handleNewConfig = useCallback(() => {
    loadConfig(emptyBaseConfig);
    setCurrentConfigId(null);
    showToast('Nueva configuración');
  }, [loadConfig, showToast]);

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
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
              value={currentConfigId ?? ''}
              onChange={(e) => {
                const value = e.target.value;
                if (value) void handleOpenConfig(Number(value));
              }}
              disabled={configLoading}
              title="Abrir una configuración existente"
            >
              <option value="">
                {configLoading ? 'Cargando…' : 'Abrir configuración…'}
              </option>
              {configList.map((config) => (
                <option key={config.id} value={config.id}>
                  {config.name || `Config ${config.id}`}
                </option>
              ))}
            </select>
            <button
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm transition hover:bg-blue-50"
              onClick={handleNewConfig}
              type="button"
              title="Empezar una configuración nueva"
            >
              Nuevo
            </button>
          </div>
        </div>
      </header>

      <JsonHyperschemaEditor key={editorKey} baseConfig={activeConfig} log={log} />

      {toastMsg && (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-[99999] -translate-x-1/2 rounded-full bg-blue-600 px-5 py-2 text-sm font-medium text-white shadow-lg">
          {toastMsg}
        </div>
      )}
    </div>
  );
};

export default Example8;
