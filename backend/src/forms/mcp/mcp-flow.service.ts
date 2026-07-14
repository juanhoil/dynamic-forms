import { HttpException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { FormConfigService } from '../../form-config/form-config.service.js';
import {
  type HyperSchemaConfig,
  type JsonHyperSchema,
  type JsonSchema,
  type ResolveOptions,
  type ResolveWarning,
} from '../../index.js';
import { FormsService } from '../forms.service.js';
import { getDependentWatchFields } from '../formsDependentWatch.util.js';
import { asWarnings, hasErrorWarning, toResolveWarning } from './mcp-warnings.util.js';

type AnyRecord = Record<string, any>;

export enum McpFlowTool {
  Start = 'flow_start',
  Current = 'flow_current',
  Answer = 'flow_answer',
  Dependent = 'flow_dependent',
  /** Avanza de paso: submit del form actual; si hay otro form, init y pasa a él. */
  NextStep = 'flow_next_step',
  /** Alias de flow_next_step (mismo comportamiento). */
  Submit = 'flow_submit',
  Back = 'flow_back',
}

export type McpFlowToolName = McpFlowTool;

export type McpFlowToolCall = {
  name: McpFlowToolName;
  arguments?: AnyRecord;
};

export type McpFlowProgress = {
  /** Índice 1-based del campo actual dentro del formulario en curso. */
  current: number;
  /** Total de campos interactivos del formulario en curso. */
  total: number;
};

export type McpFlowCurrentForm = {
  formId: number;
  /** Índice 1-based del formulario en el flujo (1 o 2). */
  index: number;
  /** Cantidad de formularios del flujo (1 o 2). */
  total: number;
  name?: string;
};

/**
 * Contrato del MCP flow: desglosa formSchema campo a campo.
 * Reutiliza init / dependent / submit del motor de formularios.
 */
export type McpFlowResult = {
  ok: boolean;
  changed: boolean;
  sessionId: string;
  currentForm: McpFlowCurrentForm;
  fields: JsonSchema;
  values: AnyRecord;
  progress: McpFlowProgress;
  dependentWatchFields: string[];
  /** true cuando el formulario en curso ya no tiene campos pendientes. */
  formDone: boolean;
  /** true cuando todos los formularios del flujo terminaron (next_step/submit del último). */
  done: boolean;
  /** true si el último answer tocó un campo de dependentWatchFields. */
  shouldRunDependent?: boolean;
  /**
   * Próxima tool recomendada:
   * flow_answer | flow_dependent | flow_next_step | null (flujo terminado).
   * flow_next_step = submit del form actual (+ init del siguiente si aplica).
   */
  nextStep: 'flow_answer' | 'flow_dependent' | 'flow_next_step' | null;
  fieldKey?: string;
  warnings: ResolveWarning[];
};

type FormRuntime = {
  formId: number;
  name: string;
  schema: JsonHyperSchema;
  values: AnyRecord;
  fieldKeys: string[];
  index: number;
  dependentWatchFields: string[];
  submitted: boolean;
};

type FlowSession = {
  sessionId: string;
  formIds: number[];
  formIndex: number;
  forms: FormRuntime[];
  externalValues: AnyRecord;
  useTestValues?: boolean;
  updatedAt: number;
};

const SESSION_TTL_MS = 30 * 60 * 1000;
const MAX_FORMS = 2;

const toOptions = (args: AnyRecord = {}): ResolveOptions => ({
  useTestValues: args.useTestValues,
  values: args.values,
});

@Injectable()
export class McpFlowService {
  private readonly sessions = new Map<string, FlowSession>();

  constructor(
    @Inject(FormsService) private readonly forms: FormsService,
    @Inject(FormConfigService) private readonly configs: FormConfigService
  ) {}

  listTools() {
    return [
      {
        name: McpFlowTool.Start,
        description:
          'Inicia un flujo campo-a-campo con 1 o 2 formIds. Ejecuta init del primer form y devuelve el primer campo + currentForm + dependentWatchFields.',
        inputSchema: {
          type: 'object',
          required: ['formIds'],
          properties: {
            formIds: {
              type: 'array',
              minItems: 1,
              maxItems: 2,
              items: { type: 'number' },
              description: 'Hasta 2 ids de configuración de formulario.',
            },
            sessionId: { type: 'string', description: 'Opcional; si no se envía se genera qs_*.' },
            values: { type: 'object', description: 'Variables externas de runtime (ej. userId).' },
            useTestValues: { type: 'boolean', description: 'Usar testValues del schema. Default false.' },
            data: { type: 'object', description: 'formData inicial opcional para el primer form.' },
          },
        },
      },
      {
        name: McpFlowTool.Current,
        description:
          'Devuelve el campo actual, progress, currentForm y dependentWatchFields.',
        inputSchema: this.sessionInputSchema(),
      },
      {
        name: McpFlowTool.Answer,
        description:
          'Responde el campo actual y avanza. Si el campo está en dependentWatchFields, conviene llamar flow_dependent después.',
        inputSchema: {
          type: 'object',
          required: ['sessionId'],
          properties: {
            sessionId: { type: 'string' },
            value: {
              description: 'Valor del campo actual (escalar) o { [fieldKey]: value }.',
            },
            data: { type: 'object', description: 'Alias de value como objeto.' },
          },
        },
      },
      {
        name: McpFlowTool.Dependent,
        description:
          'Ejecuta dependent del formulario en curso (reutiliza el motor). Actualiza schema/values y el campo actual.',
        inputSchema: {
          type: 'object',
          required: ['sessionId'],
          properties: {
            sessionId: { type: 'string' },
            data: { type: 'object', description: 'Patch opcional de formData antes de dependent.' },
            values: { type: 'object', description: 'Variables externas opcionales.' },
            useTestValues: { type: 'boolean' },
          },
        },
      },
      {
        name: McpFlowTool.NextStep,
        description:
          'Siguiente paso del flujo (= submit). Ejecuta submit del form en curso; si hay un segundo form, hace init y pasa a su primer campo. Alias: flow_submit.',
        inputSchema: {
          type: 'object',
          required: ['sessionId'],
          properties: {
            sessionId: { type: 'string' },
            data: { type: 'object', description: 'Patch opcional de formData antes de submit.' },
            values: { type: 'object' },
            useTestValues: { type: 'boolean' },
          },
        },
      },
      {
        name: McpFlowTool.Back,
        description: 'Retrocede un campo dentro del formulario en curso.',
        inputSchema: this.sessionInputSchema(),
      },
    ];
  }

  async callTool(call: McpFlowToolCall): Promise<McpFlowResult> {
    const args = this.normalizeArgs(call.arguments || {});
    switch (call.name) {
      case McpFlowTool.Start:
        return this.start(args);
      case McpFlowTool.Current:
        return this.current(args);
      case McpFlowTool.Answer:
        return this.answer(args);
      case McpFlowTool.Dependent:
        return this.dependent(args);
      case McpFlowTool.NextStep:
      case McpFlowTool.Submit:
        return this.nextStep(args);
      case McpFlowTool.Back:
        return this.back(args);
      default:
        throw new HttpException(
          { status: 404, error: true, message: `Tool MCP flow no soportada: ${call.name}` },
          404
        );
    }
  }

  toMcpContent(value: unknown) {
    return {
      content: [{ type: 'text', text: JSON.stringify(value, null, 2) }],
    };
  }

  toMcpError(error: unknown) {
    return {
      isError: true,
      content: [{ type: 'text', text: JSON.stringify(toResolveWarning(error), null, 2) }],
    };
  }

  private async start(args: AnyRecord): Promise<McpFlowResult> {
    const formIds = this.parseFormIds(args);
    const sessionId =
      typeof args.sessionId === 'string' && args.sessionId.trim()
        ? args.sessionId.trim()
        : this.createSessionId();

    this.cleanup();
    const session: FlowSession = {
      sessionId,
      formIds,
      formIndex: 0,
      forms: [],
      externalValues: { ...(args.values ?? {}) },
      useTestValues: args.useTestValues,
      updatedAt: Date.now(),
    };
    this.sessions.set(sessionId, session);

    try {
      const warnings = await this.initFormAt(session, 0, args.formData ?? {});
      return this.toResult(session, { changed: true, warnings });
    } catch (error) {
      // Errores del motor → warnings[] (mismo contrato que forms-mcp).
      if (session.forms[0]) {
        return this.toResult(session, { changed: false, warnings: asWarnings(error) });
      }
      throw error;
    }
  }

  private current(args: AnyRecord): McpFlowResult {
    const session = this.requireSession(args);
    return this.toResult(session, { changed: false, warnings: [] });
  }

  private answer(args: AnyRecord): McpFlowResult {
    const session = this.requireSession(args);
    const form = this.currentFormRuntime(session);

    if (form.index >= form.fieldKeys.length) {
      return this.toResult(session, { changed: false, warnings: [] });
    }

    if (args.value === undefined && args.formData === undefined) {
      return this.toResult(session, {
        changed: false,
        warnings: asWarnings(
          new HttpException(
            { status: 400, error: true, message: 'value (o data) es requerido para flow_answer.' },
            400
          )
        ),
      });
    }

    const fieldKey = form.fieldKeys[form.index];
    const raw = args.value !== undefined ? args.value : args.formData;
    form.values = {
      ...form.values,
      [fieldKey]: this.resolveAnswerValue(fieldKey, raw),
    };
    form.index += 1;
    session.updatedAt = Date.now();

    const shouldRunDependent = form.dependentWatchFields.includes(fieldKey);
    return this.toResult(session, { changed: true, warnings: [], shouldRunDependent });
  }

  private async dependent(args: AnyRecord): Promise<McpFlowResult> {
    const session = this.requireSession(args);
    const form = this.currentFormRuntime(session);
    if (form.submitted) {
      return this.toResult(session, {
        changed: false,
        warnings: asWarnings(
          new HttpException(
            { status: 400, error: true, message: 'El formulario actual ya fue enviado.' },
            400
          )
        ),
      });
    }

    try {
      form.values = { ...form.values, ...(args.formData ?? {}) };
      const config = this.buildWorkingConfig(form);
      const result = await this.forms.dependent(config, form.values, this.sessionOptions(session, args));

      form.schema = result.schemaWithoutLinks;
      form.values = result.data;
      form.fieldKeys = this.extractFieldKeys(form.schema, this.readUiOrder(form.formId));
      form.index = Math.min(form.index, form.fieldKeys.length);
      form.dependentWatchFields = getDependentWatchFields(config.dataSource ?? []);
      session.updatedAt = Date.now();

      return this.toResult(session, { changed: true, warnings: result.warnings });
    } catch (error) {
      return this.toResult(session, { changed: false, warnings: asWarnings(error) });
    }
  }

  /** next_step ≡ submit del form actual; si hay otro form, init y avanza. */
  private async nextStep(args: AnyRecord): Promise<McpFlowResult> {
    const session = this.requireSession(args);
    const form = this.currentFormRuntime(session);

    try {
      form.values = { ...form.values, ...(args.formData ?? {}) };
      const config = this.buildWorkingConfig(form);
      const result = await this.forms.submit(config, form.values, this.sessionOptions(session, args));

      form.schema = result.schemaWithoutLinks;
      form.values = result.data;
      form.submitted = true;
      form.index = form.fieldKeys.length;
      session.updatedAt = Date.now();

      const warnings = [...result.warnings];

      if (session.formIndex + 1 < session.formIds.length) {
        try {
          const nextWarnings = await this.initFormAt(session, session.formIndex + 1, {});
          warnings.push(...nextWarnings);
          return this.toResult(session, { changed: true, warnings });
        } catch (error) {
          warnings.push(...asWarnings(error));
          return this.toResult(session, { changed: true, warnings });
        }
      }

      return this.toResult(session, { changed: true, warnings, done: true });
    } catch (error) {
      return this.toResult(session, { changed: false, warnings: asWarnings(error) });
    }
  }

  private back(args: AnyRecord): McpFlowResult {
    const session = this.requireSession(args);
    const form = this.currentFormRuntime(session);
    if (form.submitted) {
      return this.toResult(session, {
        changed: false,
        warnings: asWarnings(
          new HttpException(
            {
              status: 400,
              error: true,
              message: 'No se puede retroceder: el formulario ya fue enviado.',
            },
            400
          )
        ),
      });
    }
    if (form.index > 0) {
      form.index -= 1;
      session.updatedAt = Date.now();
    }
    return this.toResult(session, { changed: true, warnings: [] });
  }

  private async initFormAt(
    session: FlowSession,
    formIndex: number,
    formData: AnyRecord
  ): Promise<ResolveWarning[]> {
    const formId = session.formIds[formIndex];
    const engine = this.configs.getEngineConfig(formId);
    const publicConfig = this.configs.getPublicConfig(formId);
    const meta = this.configs.getFormConfigFull(formId);

    const result = await this.forms.init(engine, formData, {
      useTestValues: session.useTestValues,
      values: session.externalValues,
    });

    const runtime: FormRuntime = {
      formId,
      name: meta.name,
      schema: result.schemaWithoutLinks,
      values: result.data,
      fieldKeys: this.extractFieldKeys(result.schemaWithoutLinks, this.readUiOrderFrom(publicConfig.uiSchema)),
      index: 0,
      dependentWatchFields: getDependentWatchFields(engine.dataSource ?? []),
      submitted: false,
    };

    session.forms[formIndex] = runtime;
    session.formIndex = formIndex;
    session.updatedAt = Date.now();
    return result.warnings;
  }

  private toResult(
    session: FlowSession,
    opts: {
      changed: boolean;
      warnings: ResolveWarning[];
      done?: boolean;
      shouldRunDependent?: boolean;
    }
  ): McpFlowResult {
    const form = this.currentFormRuntime(session);
    const total = form.fieldKeys.length;
    const formDone = form.submitted || form.index >= total;
    const done = Boolean(opts.done) || (form.submitted && session.formIndex + 1 >= session.formIds.length);
    const current = formDone ? total : form.index + 1;
    const fieldKey = formDone ? undefined : form.fieldKeys[form.index];

    const shouldRunDependent = Boolean(opts.shouldRunDependent);
    const nextStep: McpFlowResult['nextStep'] = done
      ? null
      : shouldRunDependent
        ? 'flow_dependent'
        : formDone
          ? 'flow_next_step'
          : 'flow_answer';

    return {
      ok: !hasErrorWarning(opts.warnings),
      changed: opts.changed,
      sessionId: session.sessionId,
      currentForm: {
        formId: form.formId,
        index: session.formIndex + 1,
        total: session.formIds.length,
        name: form.name,
      },
      fields: fieldKey
        ? this.buildFieldSchema(form.schema, fieldKey)
        : { type: 'object', properties: {} },
      values: { ...form.values },
      progress: { current: total === 0 ? 0 : current, total },
      dependentWatchFields: [...form.dependentWatchFields],
      formDone,
      done,
      nextStep,
      ...(shouldRunDependent ? { shouldRunDependent: true } : {}),
      ...(fieldKey ? { fieldKey } : {}),
      warnings: opts.warnings,
    };
  }

  private buildWorkingConfig(form: FormRuntime): HyperSchemaConfig {
    const stored = this.configs.getEngineConfig(form.formId);
    return {
      formSchema: form.schema,
      externalVariables: stored.externalVariables,
      dataSource: stored.dataSource,
      submit: stored.submit,
    };
  }

  private sessionOptions(session: FlowSession, args: AnyRecord): ResolveOptions {
    return toOptions({
      useTestValues: args.useTestValues ?? session.useTestValues,
      values: { ...session.externalValues, ...(args.values ?? {}) },
    });
  }

  private currentFormRuntime(session: FlowSession): FormRuntime {
    const form = session.forms[session.formIndex];
    if (!form) {
      throw new HttpException(
        { status: 500, error: true, message: 'Estado de formulario inválido en el flujo.' },
        500
      );
    }
    return form;
  }

  private parseFormIds(args: AnyRecord): number[] {
    const raw = args.formIds ?? (args.formId !== undefined ? [args.formId] : args.id !== undefined ? [args.id] : null);
    if (!Array.isArray(raw) || raw.length === 0) {
      throw new HttpException(
        { status: 400, error: true, message: 'formIds es requerido (1 o 2 ids).' },
        400
      );
    }
    if (raw.length > MAX_FORMS) {
      throw new HttpException(
        { status: 400, error: true, message: `Máximo ${MAX_FORMS} formIds por flujo.` },
        400
      );
    }
    const formIds = raw.map((id) => Number(id));
    if (formIds.some((id) => !Number.isFinite(id))) {
      throw new HttpException(
        { status: 400, error: true, message: 'formIds debe ser un arreglo de números.' },
        400
      );
    }
    // Valida que existan las configs.
    for (const id of formIds) {
      this.configs.getEngineConfig(id);
    }
    return formIds;
  }

  private normalizeArgs(args: AnyRecord): AnyRecord {
    const formData = args.formData ?? args.data ?? args.dataform ?? args.dataForm;
    const values =
      args.values && typeof args.values === 'object'
        ? {
            ...args.values,
            ...(args.values.userid !== undefined && args.values.userId === undefined
              ? { userId: args.values.userid }
              : {}),
          }
        : args.values;

    return {
      ...args,
      sessionId: args.sessionId ?? args.sesionId,
      formData,
      values,
      formIds: args.formIds,
      formId: args.formId ?? args.id,
    };
  }

  private buildFieldSchema(schema: JsonHyperSchema, fieldKey: string): JsonSchema {
    const property = schema.properties?.[fieldKey];
    if (!property) {
      throw new HttpException(
        { status: 400, error: true, message: `Campo "${fieldKey}" no existe en el schema.` },
        400
      );
    }
    const required =
      Array.isArray(schema.required) && schema.required.includes(fieldKey) ? [fieldKey] : undefined;
    return {
      type: 'object',
      properties: { [fieldKey]: property },
      ...(required ? { required } : {}),
    };
  }

  private extractFieldKeys(schema: JsonHyperSchema, uiOrder?: string[]): string[] {
    const properties = schema.properties ?? {};
    const allKeys = Object.keys(properties);
    const ordered = this.applyOrder(allKeys, uiOrder);
    return ordered.filter((key) => {
      const prop = properties[key] as JsonSchema | undefined;
      return prop && prop.readOnly !== true;
    });
  }

  private applyOrder(keys: string[], uiOrder?: string[]): string[] {
    if (!uiOrder?.length) return keys;
    const set = new Set(keys);
    const fromOrder = uiOrder.filter((key) => set.has(key));
    const rest = keys.filter((key) => !fromOrder.includes(key));
    return [...fromOrder, ...rest];
  }

  private readUiOrder(formId: number): string[] | undefined {
    try {
      const { uiSchema } = this.configs.getPublicConfig(formId);
      return this.readUiOrderFrom(uiSchema);
    } catch {
      return undefined;
    }
  }

  private readUiOrderFrom(uiSchema: Record<string, unknown> | undefined): string[] | undefined {
    const order = uiSchema?.['ui:order'];
    return Array.isArray(order) ? (order as string[]) : undefined;
  }

  private resolveAnswerValue(fieldKey: string, value: unknown): unknown {
    if (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      fieldKey in (value as AnyRecord)
    ) {
      return (value as AnyRecord)[fieldKey];
    }
    return value;
  }

  private requireSession(args: AnyRecord): FlowSession {
    this.cleanup();
    const sessionId = args.sessionId;
    if (typeof sessionId !== 'string' || !sessionId.trim()) {
      throw new HttpException({ status: 400, error: true, message: 'sessionId es requerido.' }, 400);
    }
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new NotFoundException(`No existe el flujo MCP "${sessionId}"`);
    }
    session.updatedAt = Date.now();
    return session;
  }

  private createSessionId(): string {
    const uuid =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 6)}`;
    return `qs_${uuid.slice(0, 13)}`;
  }

  private cleanup() {
    const now = Date.now();
    for (const [id, session] of this.sessions.entries()) {
      if (now - session.updatedAt > SESSION_TTL_MS) {
        this.sessions.delete(id);
      }
    }
  }

  private sessionInputSchema() {
    return {
      type: 'object',
      required: ['sessionId'],
      properties: {
        sessionId: { type: 'string', description: 'UUID del flujo (qs_*).' },
      },
    };
  }
}
