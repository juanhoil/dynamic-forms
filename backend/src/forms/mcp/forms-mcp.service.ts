import { HttpException, Inject, Injectable } from '@nestjs/common';
import { FormConfigService } from '../../form-config/form-config.service.js';
import { LinkExecutionError, type JsonHyperSchema, type ResolveOptions } from '../../index.js';
import { FormsSessionService } from '../forms-session.service.js';
import { FormsService } from '../forms.service.js';
import { getDependentWatchFields } from '../formsDependentWatch.util.js';

type AnyRecord = Record<string, any>;

export enum FormsMcpTool {
  ConfigGet = 'form_config_get',
  Init = 'form_init',
  Dependent = 'form_dependent',
  Submit = 'form_submit',
}

export type FormsMcpToolName = FormsMcpTool;

export type FormsMcpToolCall = {
  name: FormsMcpToolName;
  arguments?: AnyRecord;
};

const toOptions = (args: AnyRecord = {}): ResolveOptions => ({
  useTestValues: args.useTestValues,
  values: args.values ?? args.value,
});

const normalizeArgs = (args: AnyRecord = {}): AnyRecord => {
  const values = args.values ?? args.value;
  const formData = args.formData ?? args.dataform ?? args.dataForm;
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

const toMcpFormResult = ({
  schema,
  formData,
  uiSchema,
  dependentWatchFields,
  warnings,
  changed,
  init = false,
}: {
  schema?: JsonHyperSchema;
  formData?: AnyRecord;
  uiSchema?: Record<string, unknown>;
  dependentWatchFields?: string[];
  warnings?: unknown[];
  changed?: boolean;
  init?: boolean;
}) => ({
  ...(init ? { dataInit: formData, jsonSchema: schema } : { dataform: formData, jschema: schema }),
  // Compatibilidad con consumidores existentes.
  schema,
  formData,
  uiSchema,
  dependentWatchFields,
  warnings,
  changed,
});

const deepEqual = (left: unknown, right: unknown) =>
  JSON.stringify(left) === JSON.stringify(right);

const buildDataformUpdate = (previous: AnyRecord, next: AnyRecord): AnyRecord =>
  Object.fromEntries(
    Object.entries(next || {}).filter(([key, value]) => !deepEqual(previous?.[key], value))
  );

const buildJschemaUpdate = (
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
        name: FormsMcpTool.ConfigGet,
        description: 'Devuelve la configuracion publica del formulario: schema sin links + uiSchema.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Id numerico de la configuracion. Default: 0.' },
          },
        },
      },
      {
        name: FormsMcpTool.Init,
        description: 'Recibe formId, sessionId y values. Devuelve dataInit y jsonSchema iniciales.',
        inputSchema: this.initInputSchema(),
      },
      {
        name: FormsMcpTool.Dependent,
        description: 'Recibe dataform y jschema actuales. Devuelve solo dataformUpdate y jschemaUpdate.',
        inputSchema: this.formStateInputSchema(),
      },
      {
        name: FormsMcpTool.Submit,
        description: 'Recibe dataform y jschema actuales. Ejecuta submit y devuelve dataform y jschema.',
        inputSchema: this.formStateInputSchema(),
      },
    ];
  }

  async callTool(call: FormsMcpToolCall) {
    const args = normalizeArgs(call.arguments || {});
    switch (call.name) {
      case FormsMcpTool.ConfigGet:
        return this.config(args);
      case FormsMcpTool.Init:
        return this.init(args);
      case FormsMcpTool.Dependent:
        return this.dependent(args);
      case FormsMcpTool.Submit:
        return this.submit(args);
      default:
        throw new HttpException({ status: 404, error: true, message: `Tool MCP no soportada: ${call.name}` }, 404);
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

  private config(args: AnyRecord) {
    return {
      id: args.id ?? 0,
      ...this.configs.getPublicConfig(args.id),
    };
  }

  private async init(args: AnyRecord) {
    const hyperSchema = this.configs.getHyperSchema(args.id);
    const { uiSchema } = this.configs.getPublicConfig(args.id);
    const result = await this.forms.init(hyperSchema, args.formData ?? {}, toOptions(args));
    this.sessions.createOrUpdate(
      this.requireSessionId(args),
      hyperSchema,
      result.schemaWithoutLinks,
      result.data
    );
    return toMcpFormResult({
      init: true,
      schema: result.schemaWithoutLinks,
      uiSchema,
      formData: result.data,
      dependentWatchFields: getDependentWatchFields(hyperSchema),
      warnings: result.warnings,
    });
  }

  private async dependent(args: AnyRecord) {
    const sessionId = this.requireSessionId(args);
    const storedHyperSchema = this.configs.getHyperSchema(args.id);
    const formData = this.mergeSessionFormData(args);
    if (!this.sessions.shouldRunDependent(sessionId, storedHyperSchema, formData)) {
      return {
        dataformUpdate: {},
        jschemaUpdate: {},
        warnings: [],
        changed: false,
      };
    }

    const hyperSchema = this.buildWorkingSchema(args);
    const result = await this.forms.dependent(hyperSchema, formData, toOptions(args));
    this.sessions.createOrUpdate(sessionId, storedHyperSchema, result.schemaWithoutLinks, result.data);
    return {
      dataformUpdate: buildDataformUpdate(formData, result.data),
      jschemaUpdate: buildJschemaUpdate(args.schema, result.schemaWithoutLinks),
      warnings: result.warnings,
      changed: true,
    };
  }

  private async submit(args: AnyRecord) {
    const sessionId = this.requireSessionId(args);
    const hyperSchema = this.buildWorkingSchema(args);
    const formData = this.mergeSessionFormData(args);
    const result = await this.forms.submit(hyperSchema, formData, toOptions(args));
    this.sessions.createOrUpdate(
      sessionId,
      this.configs.getHyperSchema(args.id),
      result.schemaWithoutLinks,
      result.data
    );
    return toMcpFormResult({
      schema: result.schemaWithoutLinks,
      formData: result.data,
      warnings: result.warnings,
      changed: true,
    });
  }

  private mergeSessionFormData(args: AnyRecord): AnyRecord {
    const sessionId = this.requireSessionId(args);
    return {
      ...this.sessions.getFormData(sessionId),
      ...(args.formData ?? {}),
    };
  }

  private buildWorkingSchema(args: AnyRecord): JsonHyperSchema {
    const storedHyperSchema = this.configs.getHyperSchema(args.id);
    return {
      ...(args.schema ?? this.sessions.getSchema(this.requireSessionId(args)) ?? storedHyperSchema),
      links: storedHyperSchema.links,
    };
  }

  private requireSessionId(args: AnyRecord): string {
    if (typeof args.sessionId === 'string' && args.sessionId.trim()) return args.sessionId;
    throw new HttpException({ status: 400, error: true, message: 'sessionId es requerido.' }, 400);
  }

  private toIssue(error: unknown) {
    if (error instanceof LinkExecutionError) {
      return { status: error.status, error: true, message: error.message };
    }
    if (error instanceof HttpException) {
      const status = error.getStatus();
      const response = error.getResponse();
      if (response && typeof response === 'object' && 'message' in response) {
        return {
          status,
          error: true,
          message: String((response as AnyRecord).message),
        };
      }
      return { status, error: true, message: error.message };
    }
    return { status: 500, error: true, message: 'fallo general del sistema' };
  }

  private initInputSchema() {
    return {
      type: 'object',
      required: ['formId', 'sessionId'],
      properties: {
        formId: { type: 'number', description: 'Id numerico de la configuracion.' },
        sessionId: { type: 'string', description: 'UUID de instancia de formulario.' },
        sesionId: { type: 'string', description: 'Alias tolerado de sessionId.' },
        values: { type: 'object', description: 'Variables externas de runtime.' },
        value: { type: 'object', description: 'Alias de values para asistentes.' },
        useTestValues: { type: 'boolean', description: 'Usar testValues del schema.' },
      },
    };
  }

  private formStateInputSchema() {
    return {
      type: 'object',
      required: ['sessionId', 'dataform', 'jschema'],
      properties: {
        formId: { type: 'number', description: 'Id numerico de la configuracion.' },
        sessionId: { type: 'string', description: 'UUID de instancia de formulario.' },
        sesionId: { type: 'string', description: 'Alias tolerado de sessionId.' },
        dataform: { type: 'object', description: 'Datos actuales del formulario.' },
        jschema: { type: 'object', description: 'JSON Schema actual del formulario, sin links.' },
        values: { type: 'object', description: 'Variables externas de runtime.' },
        value: { type: 'object', description: 'Alias de values para asistentes.' },
        useTestValues: { type: 'boolean', description: 'Usar testValues del schema.' },
      },
    };
  }
}
