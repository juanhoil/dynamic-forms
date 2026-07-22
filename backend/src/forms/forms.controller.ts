// ---------------------------------------------------------------------------
// Endpoints del motor de HyperSchema. El front referencia la config guardada
// por `id` (default 1); NUNCA envía ni recibe los `links`.
//
//   POST /api/forms/init       → init + catalog → { sessionId, schema (sin links), uiSchema, formData }
//   POST /api/forms/dependent  → links dependientes (requiere sessionId) → { schema (sin links) }
//   POST /api/forms/submit     → links de envío (requiere sessionId) → { formData, ... }
//
// El debounce de los links `dependent` vive en el cliente: estos endpoints
// solo resuelven bajo demanda.
// ---------------------------------------------------------------------------

import {
  Body,
  Controller,
  HttpException,
  HttpCode,
  Inject,
  InternalServerErrorException,
  Post,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FormsService } from './forms.service.js';
import { FormConfigService } from '../form-config/form-config.service.js';
import { FormsSessionService } from './forms-session.service.js';
import { FormPayloadDto, FormSessionPayloadDto } from './dto/resolve-form.dto.js';
import { getDependentWatchFields } from './formsDependentWatch.util.js';
import { LinkExecutionError, type HyperSchemaConfig, type JsonHyperSchema, type JsonSchema, type ResolveOptions, type ResolveWarning } from '../index.js';

/**
 * Forma estándar de todas las respuestas del motor:
 *   - form:     data + schema (sin links) del formulario.
 *   - response: solo en submit, respuesta HTTP cruda + schema declarado.
 */
interface StandardFormResponse {
  form: {
    data: Record<string, unknown>;
    schema?: JsonHyperSchema;
  };
  response?: {
    data: unknown;
    schema: JsonSchema | null;
  };
}

/** Respuesta de init: forma estándar + uiSchema + campos de sesión. */
interface InitResponse extends StandardFormResponse {
  sessionId: string;
  uiSchema: Record<string, unknown>;
  dependentWatchFields: string[];
  warnings: ResolveWarning[];
}

/** Respuesta de dependent/submit: forma estándar + avisos y flag de cambios. */
interface SchemaResponse extends StandardFormResponse {
  warnings: ResolveWarning[];
  changed?: boolean;
}

@ApiTags('Forms REST') // uso prod
//uso creacion 
@Controller('forms')
export class FormsController {
  constructor(
    @Inject(FormsService) private readonly forms: FormsService,
    @Inject(FormConfigService) private readonly configs: FormConfigService,
    @Inject(FormsSessionService) private readonly sessions: FormsSessionService
  ) {}

  @Post('init')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Inicializa un formulario',
    description:
      'Ejecuta links init/catalog, asigna una sesión (como form_create_session del MCP) y responde schema sin links, uiSchema y formData.',
  })
  @ApiBody({ type: FormPayloadDto })
  @ApiResponse({ status: 200, description: 'Formulario inicializado con sessionId asignado.' })
  async init(@Body() dto: FormPayloadDto): Promise<InitResponse> {
    try {
      const sessionId = this.sessions.createSessionId();
      const config = this.configs.getEngineConfig(dto.id);
      const { uiSchema } = this.configs.getPublicConfig(dto.id);
      const result = await this.forms.init(config, dto.formData ?? {}, this.toOptions(dto));
      this.sessions.createOrUpdate(
        sessionId,
        config.dataSource ?? [],
        result.form.schema,
        result.form.data
      );
      return {
        sessionId,
        form: {
          data: result.form.data,
          schema: result.form.schema,
        },
        uiSchema,
        dependentWatchFields: getDependentWatchFields(config.dataSource ?? []),
        warnings: result.warnings,
      };
    } catch (error) {
      this.throwStandardError(error);
    }
  }

  @Post('dependent')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Resuelve dependencias del formulario',
    description: 'Ejecuta dependent solo cuando cambiaron los campos declarados en templatePointers.',
  })
  @ApiBody({ type: FormSessionPayloadDto })
  @ApiResponse({ status: 200, description: 'Schema actualizado o respuesta vacía si no hubo cambios.' })
  async dependent(@Body() dto: FormSessionPayloadDto): Promise<SchemaResponse | undefined> {
    try {
      const storedConfig = this.configs.getEngineConfig(dto.id);
      const formData = dto.formData ?? {};
      if (!this.sessions.shouldRunDependent(dto.sessionId, storedConfig.dataSource ?? [], formData)) {
        return undefined;
      }

      const config = this.buildWorkingConfig(dto);
      const result = await this.forms.dependent(config, dto.formData ?? {}, this.toOptions(dto));
      this.sessions.createOrUpdate(
        dto.sessionId,
        storedConfig.dataSource ?? [],
        result.form.schema,
        result.form.data
      );
      return {
        form: {
          data: result.form.data,
          schema: result.form.schema,
        },
        warnings: result.warnings,
        changed: true,
      };
    } catch (error) {
      this.throwStandardError(error);
    }
  }

  @Post('submit')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Ejecuta submit del formulario',
    description: 'Ejecuta links submit usando la sesión/schema activo sin exponer links al front.',
  })
  @ApiBody({ type: FormSessionPayloadDto })
  @ApiResponse({ status: 200, description: 'Resultado de submit con schema sin links.' })
  async submit(@Body() dto: FormSessionPayloadDto): Promise<SchemaResponse> {
    try {
      const config = this.buildWorkingConfig(dto);
      const result = await this.forms.submit(config, dto.formData ?? {}, this.toOptions(dto));
      this.sessions.createOrUpdate(
        dto.sessionId,
        this.configs.getEngineConfig(dto.id).dataSource ?? [],
        result.form.schema,
        result.form.data
      );
      return {
        form: {
          data: result.form.data,
          //schema: result.form.schema,
        },
        warnings: result.warnings,
        //changed: true,
        ...(result.response ? { response: result.response } : {}),
      };
    } catch (error) {
      this.throwStandardError(error);
    }
  }

  private toOptions(dto: FormPayloadDto): ResolveOptions {
    return { useTestValues: dto.useTestValues, context: dto.context };
  }

  /**
   * Config del motor con el formSchema público activo que manda el front (o el
   * de la sesión), reinyectando dataSource/submit/externalVariables guardados.
   * Así dependent/submit preservan enums/defaults ya calculados por init/catalog
   * sin exponer links ni re-ejecutar catálogos.
   */
  private buildWorkingConfig(dto: FormSessionPayloadDto): HyperSchemaConfig {
    const stored = this.configs.getEngineConfig(dto.id);
    const formSchema =
      (dto.schema ?? this.sessions.getSchema(dto.sessionId) ?? stored.formSchema) as JsonHyperSchema;
    return {
      formSchema,
      externalVariables: stored.externalVariables,
      dataSource: stored.dataSource,
      submit: stored.submit,
    };
  }

  private throwStandardError(error: unknown): never {
    if (error instanceof LinkExecutionError) {
      throw new HttpException(
        {
          status: error.status,
          error: true,
          message: error.message,
        },
        error.status
      );
    }

    if (error instanceof HttpException) {
      throw error;
    }

    throw new InternalServerErrorException({
      status: 500,
      error: true,
      message: 'fallo general del sistema',
    });
  }
}
