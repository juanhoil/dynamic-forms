import { HttpException, Injectable } from '@nestjs/common';
import { FormConfigService } from '../../form-config/form-config.service.js';
import { LinkExecutionError, type JsonHyperSchema, type ResolveOptions } from '../../index.js';
import { FormsSessionService } from '../forms-session.service.js';
import { FormsService } from '../forms.service.js';
import { getDependentWatchFields } from '../formsDependentWatch.util.js';

type AnyRecord = Record<string, any>;

export type FormsMcpToolName =
  | 'form_config_get'
  | 'form_init'
  | 'form_dependent'
  | 'form_submit';

export type FormsMcpToolCall = {
  name: FormsMcpToolName;
  arguments?: AnyRecord;
};

const toOptions = (args: AnyRecord = {}): ResolveOptions => ({
  useTestValues: args.useTestValues,
  values: args.values,
});

@Injectable()
export class FormsMcpService {
  constructor(
    private readonly forms: FormsService,
    private readonly configs: FormConfigService,
    private readonly sessions: FormsSessionService
  ) {}

  listTools() {
    return [
      {
        name: 'form_config_get',
        description: 'Devuelve la configuracion publica del formulario: schema sin links + uiSchema.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Id numerico de la configuracion. Default: 0.' },
          },
        },
      },
      {
        name: 'forms_init',
        description: 'Ejecuta init + catalog para una configuracion guardada y crea/actualiza una sesion.',
        inputSchema: this.baseInputSchema(),
      },
      {
        name: 'forms_dependent',
        description: 'Ejecuta dependent solo si cambiaron los campos observados por templatePointers.',
        inputSchema: this.baseInputSchema({ requireFormData: true }),
      },
      {
        name: 'forms_submit',
        description: 'Ejecuta los links submit usando la sesion activa.',
        inputSchema: this.baseInputSchema({ requireFormData: true }),
      },
    ];
  }

  async callTool(call: FormsMcpToolCall) {
    const args = call.arguments || {};
    switch (call.name) {
      case 'form_config_get':
        return this.config(args);
      case 'form_init':
        return this.init(args);
      case 'form_dependent':
        return this.dependent(args);
      case 'form_submit':
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
    return {
      schema: result.schemaWithoutLinks,
      uiSchema,
      formData: result.data,
      dependentWatchFields: getDependentWatchFields(hyperSchema),
      warnings: result.warnings,
    };
  }

  private async dependent(args: AnyRecord) {
    const sessionId = this.requireSessionId(args);
    const storedHyperSchema = this.configs.getHyperSchema(args.id);
    const formData = args.formData ?? {};
    if (!this.sessions.shouldRunDependent(sessionId, storedHyperSchema, formData)) {
      return { changed: false };
    }

    const hyperSchema = this.buildWorkingSchema(args);
    const result = await this.forms.dependent(hyperSchema, formData, toOptions(args));
    this.sessions.createOrUpdate(sessionId, storedHyperSchema, result.schemaWithoutLinks, result.data);
    return {
      schema: result.schemaWithoutLinks,
      formData: result.data,
      warnings: result.warnings,
      changed: true,
    };
  }

  private async submit(args: AnyRecord) {
    const sessionId = this.requireSessionId(args);
    const hyperSchema = this.buildWorkingSchema(args);
    const result = await this.forms.submit(hyperSchema, args.formData ?? {}, toOptions(args));
    this.sessions.createOrUpdate(
      sessionId,
      this.configs.getHyperSchema(args.id),
      result.schemaWithoutLinks,
      result.data
    );
    return {
      schema: result.schemaWithoutLinks,
      formData: result.data,
      warnings: result.warnings,
      changed: true,
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

  private baseInputSchema({ requireFormData = false } = {}) {
    return {
      type: 'object',
      required: requireFormData ? ['sessionId', 'formData'] : ['sessionId'],
      properties: {
        id: { type: 'number', description: 'Id numerico de la configuracion. Default: 0.' },
        sessionId: { type: 'string', description: 'UUID de instancia de formulario.' },
        formData: { type: 'object', description: 'Datos actuales del formulario.' },
        values: { type: 'object', description: 'Variables externas de runtime.' },
        useTestValues: { type: 'boolean', description: 'Usar testValues del schema.' },
      },
    };
  }
}
