import { HttpException, Inject, Injectable } from '@nestjs/common';
import { FormConfigService } from '../../form-config/form-config.service.js';
import {
  type HyperSchemaConfig,
  type JsonHyperSchema,
  type ResolveOptions,
  type ResolveWarning,
} from '../../index.js';
import { FormsSessionService } from '../forms-session.service.js';
import { FormsService } from '../forms.service.js';
import { getDependentWatchFields } from '../formsDependentWatch.util.js';
import { hasErrorWarning, toResolveWarning } from './mcp-warnings.util.js';

type AnyRecord = Record<string, any>;

export enum FormsMcpTool {
  login = 'login',
  CreateSession = 'form_create_session',
  Init = 'form_init',
  Dependent = 'form_dependent',
  Submit = 'form_submit',
}

export type FormsMcpToolName = FormsMcpTool;

export type FormsMcpToolCall = {
  name: FormsMcpToolName;
  arguments?: AnyRecord;
};

// ---------------------------------------------------------------------------
// Contrato unificado de respuesta. TODAS las tools devuelven esta forma para
// que cualquier consumidor MCP la parsee igual, sin adivinar segun la tool.
// ---------------------------------------------------------------------------
type McpFormResult = {
  ok: boolean;
  changed: boolean;
  sessionId?: string;
  data?: AnyRecord;
  schema?: JsonHyperSchema;
  uiSchema?: Record<string, unknown>;
  delta?: { data: AnyRecord; schema: Partial<JsonHyperSchema> };
  dependentWatchFields?: string[];
  warnings: ResolveWarning[];
  /** Solo en submit: datos crudos de la respuesta HTTP + schema declarado. */
  response?: { data: unknown; responseSchema: unknown };
};

const toOptions = (args: AnyRecord = {}): ResolveOptions => ({
  useTestValues: args.useTestValues,
  values: args.values,
});

const normalizeArgs = (args: AnyRecord = {}): AnyRecord => {
  const values = args.values ?? args.value;
  const formData = args.formData ?? args.data ?? args.dataform ?? args.dataForm;
  const schema = args.schema ?? args.jschema ?? args.jSchema ?? args.jsonSchema;
  const normalizedValues =
    values && typeof values === 'object'
      ? {
          ...values,
          ...(values.userid !== undefined && values.userId === undefined
            ? { userId: values.userid }
            : {}),
        }
      : values;

  return {
    ...args,
    id: args.id ?? args.formId,
    sessionId: args.sessionId ?? args.sesionId,
    formData,
    schema,
    values: normalizedValues,
  };
};

const buildResult = (partial: Partial<McpFormResult>): McpFormResult => {
  const warnings = partial.warnings ?? [];
  return {
    ok: partial.ok ?? !hasErrorWarning(warnings),
    changed: partial.changed ?? false,
    ...(partial.sessionId !== undefined ? { sessionId: partial.sessionId } : {}),
    ...(partial.data !== undefined ? { data: partial.data } : {}),
    ...(partial.schema !== undefined ? { schema: partial.schema } : {}),
    ...(partial.uiSchema !== undefined ? { uiSchema: partial.uiSchema } : {}),
    ...(partial.delta !== undefined ? { delta: partial.delta } : {}),
    ...(partial.dependentWatchFields !== undefined
      ? { dependentWatchFields: partial.dependentWatchFields }
      : {}),
    warnings,
  };
};

const deepEqual = (left: unknown, right: unknown) =>
  JSON.stringify(left) === JSON.stringify(right);

const buildDataDelta = (previous: AnyRecord, next: AnyRecord): AnyRecord =>
  Object.fromEntries(
    Object.entries(next || {}).filter(([key, value]) => !deepEqual(previous?.[key], value))
  );

const buildSchemaDelta = (
  previous: JsonHyperSchema | undefined,
  next: JsonHyperSchema
): Partial<JsonHyperSchema> => {
  const update: Partial<JsonHyperSchema> = {};
  const previousProperties = previous?.properties || {};
  const nextProperties = next.properties || {};
  const changedProperties = Object.fromEntries(
    Object.entries(nextProperties).filter(
      ([key, value]) => !deepEqual(previousProperties[key], value)
    )
  );

  if (Object.keys(changedProperties).length) {
    update.properties = changedProperties;
  }
  if (!deepEqual(previous?.required, next.required)) {
    update.required = next.required;
  }

  return update;
};

@Injectable()
export class FormsMcpService {
  constructor(
    @Inject(FormsService) private readonly forms: FormsService,
    @Inject(FormConfigService) private readonly configs: FormConfigService,
    @Inject(FormsSessionService) private readonly sessions: FormsSessionService
  ) {}

  listTools() {
    return [
      {
        name: FormsMcpTool.CreateSession,
        description:
          'Crea un identificador de sesión para una nueva instancia de formulario. Devuelve { ok, changed, sessionId, warnings }.',
        inputSchema: {
          type: 'object',
          properties: {},
          additionalProperties: false,
        },
      },
      {
        name: FormsMcpTool.Init,
        description:
          'Recibe formId, sessionId y values. Devuelve { ok, changed, data, schema, uiSchema, dependentWatchFields, warnings }.',
        inputSchema: this.initInputSchema(),
      },
      {
        name: FormsMcpTool.Dependent,
        description:
          'Recibe data y schema actuales. Recalcula dependencias y devuelve el contrato unificado con delta:{ data, schema }.',
        inputSchema: this.formStateInputSchema(),
      },
      {
        name: FormsMcpTool.Submit,
        description:
          'Recibe data y schema actuales. Ejecuta submit y devuelve el contrato unificado { ok, changed, data, schema, warnings }.',
        inputSchema: this.formStateInputSchema(),
      },
    ];
  }

  async callTool(call: FormsMcpToolCall): Promise<McpFormResult> {
    const args = normalizeArgs(call.arguments || {});
    switch (call.name) {
      case FormsMcpTool.CreateSession:
        return this.createSession();
      case FormsMcpTool.Init:
        return this.init(args);
      case FormsMcpTool.Dependent:
        return this.dependent(args);
      case FormsMcpTool.Submit:
        return this.submit(args);
      default:
        throw new HttpException(
          { status: 404, error: true, message: `Tool MCP no soportada: ${call.name}` },
          404
        );
    }
  }

  toMcpContent(value: unknown) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(value, null, 2),
        },
      ],
    };
  }

  toMcpError(error: unknown) {
    const issue = this.toIssue(error);
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: JSON.stringify(issue, null, 2),
        },
      ],
    };
  }

  private async init(args: AnyRecord): Promise<McpFormResult> {
    const config = this.configs.getEngineConfig(args.id);
    const { uiSchema } = this.configs.getPublicConfig(args.id);
    const result = await this.forms.init(config, args.formData ?? {}, toOptions(args));
    this.sessions.createOrUpdate(
      this.requireSessionId(args),
      config.dataSource ?? [],
      result.schemaWithoutLinks,
      result.data
    );
    return buildResult({
      changed: true,
      data: result.data,
      schema: result.schemaWithoutLinks,
      uiSchema,
      dependentWatchFields: getDependentWatchFields(config.dataSource ?? []),
      warnings: result.warnings,
    });
  }

  private createSession(): McpFormResult {
    return buildResult({
      changed: false,
      sessionId: this.sessions.createSessionId(),
      warnings: [],
    });
  }

  private async dependent(args: AnyRecord): Promise<McpFormResult> {
    const sessionId = this.requireSessionId(args);
    const storedConfig = this.configs.getEngineConfig(args.id);
    const formData = this.mergeSessionFormData(args);

    if (!this.sessions.shouldRunDependent(sessionId, storedConfig.dataSource ?? [], formData)) {
      return buildResult({
        changed: false,
        data: formData,
        schema: this.sessions.getSchema(sessionId),
        delta: { data: {}, schema: {} },
        warnings: [],
      });
    }

    const config = this.buildWorkingConfig(args);
    const result = await this.forms.dependent(config, formData, toOptions(args));
    this.sessions.createOrUpdate(
      sessionId,
      storedConfig.dataSource ?? [],
      result.schemaWithoutLinks,
      result.data
    );
    return buildResult({
      changed: true,
      data: result.data,
      schema: result.schemaWithoutLinks,
      delta: {
        data: buildDataDelta(formData, result.data),
        schema: buildSchemaDelta(args.schema, result.schemaWithoutLinks),
      },
      warnings: result.warnings,
    });
  }

  private async submit(args: AnyRecord): Promise<McpFormResult> {
    const sessionId = this.requireSessionId(args);
    const config = this.buildWorkingConfig(args);
    const formData = this.mergeSessionFormData(args);
    const result = await this.forms.submit(config, formData, toOptions(args));
    this.sessions.createOrUpdate(
      sessionId,
      this.configs.getEngineConfig(args.id).dataSource ?? [],
      result.schemaWithoutLinks,
      result.data
    );
    return buildResult({
      changed: true,
      data: result.data,
      schema: result.schemaWithoutLinks,
      warnings: result.warnings,
      ...(result.response ? { response: result.response } : {}),
    });
  }

  private mergeSessionFormData(args: AnyRecord): AnyRecord {
    const sessionId = this.requireSessionId(args);
    return {
      ...this.sessions.getFormData(sessionId),
      ...(args.formData ?? {}),
    };
  }

  private buildWorkingConfig(args: AnyRecord): HyperSchemaConfig {
    const stored = this.configs.getEngineConfig(args.id);
    const formSchema =
      (args.schema ?? this.sessions.getSchema(this.requireSessionId(args)) ?? stored.formSchema) as JsonHyperSchema;
    return {
      formSchema,
      externalVariables: stored.externalVariables,
      dataSource: stored.dataSource,
      submit: stored.submit,
    };
  }

  private requireSessionId(args: AnyRecord): string {
    if (typeof args.sessionId === 'string' && args.sessionId.trim()) return args.sessionId;
    throw new HttpException({ status: 400, error: true, message: 'sessionId es requerido.' }, 400);
  }

  private toIssue(error: unknown) {
    return toResolveWarning(error);
  }

  private initInputSchema() {
    return {
      type: 'object',
      required: ['formId', 'sessionId'],
      properties: {
        formId: { type: 'number', description: 'Id numerico de la configuracion.' },
        sessionId: { type: 'string', description: 'UUID de instancia de formulario.' },
        values: { type: 'object', description: 'Variables externas de runtime (ej. userId).' },
        useTestValues: { type: 'boolean', description: 'Usar testValues del schema. Default false.' },
      },
    };
  }

  private formStateInputSchema() {
    return {
      type: 'object',
      required: ['sessionId', 'data', 'schema'],
      properties: {
        formId: { type: 'number', description: 'Id numerico de la configuracion.' },
        sessionId: { type: 'string', description: 'UUID de instancia de formulario.' },
        data: { type: 'object', description: 'Datos actuales del formulario.' },
        schema: { type: 'object', description: 'JSON Schema actual del formulario, sin links.' },
        values: { type: 'object', description: 'Variables externas de runtime (ej. userId).' },
        useTestValues: { type: 'boolean', description: 'Usar testValues del schema. Default false.' },
      },
    };
  }
}
