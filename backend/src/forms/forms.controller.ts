// ---------------------------------------------------------------------------
// Endpoints del motor de HyperSchema. El front referencia la config guardada
// por `id` (default 1); NUNCA envía ni recibe los `links`.
//
//   POST /api/forms/init       → init + catalog → { schema (sin links), uiSchema, formData }
//   POST /api/forms/dependent  → links dependientes → { schema (sin links) }
//   POST /api/forms/submit     → links de envío     → { schema (sin links) }
//   POST /api/forms/resolve    → roles arbitrarios (body.roles)
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
import { FormPayloadDto, ResolveFormDto } from './dto/resolve-form.dto.js';
import { getDependentWatchFields } from './formsDependentWatch.util.js';
import { LinkExecutionError, type JsonHyperSchema, type ResolveOptions, type ResolveWarning } from '../index.js';

/** Respuesta de init: schema del form (sin links) + uiSchema + data resuelta. */
interface InitResponse {
  schema: JsonHyperSchema;
  uiSchema: Record<string, unknown>;
  formData: Record<string, unknown>;
  dependentWatchFields: string[];
  warnings: ResolveWarning[];
}

/** Respuesta de dependent/submit: solo el schema del form, sin links. */
interface SchemaResponse {
  schema: JsonHyperSchema;
  formData: Record<string, unknown>;
  warnings: ResolveWarning[];
  changed?: boolean;
}

@ApiTags('Forms REST')
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
    description: 'Ejecuta links init/catalog, guarda la sesión y responde schema sin links, uiSchema y formData.',
  })
  @ApiBody({ type: FormPayloadDto })
  @ApiResponse({ status: 200, description: 'Formulario inicializado.' })
  async init(@Body() dto: FormPayloadDto): Promise<InitResponse> {
    try {
      const hyperSchema = this.configs.getHyperSchema(dto.id);
      const { uiSchema } = this.configs.getPublicConfig(dto.id);
      const result = await this.forms.init(hyperSchema, dto.formData ?? {}, this.toOptions(dto));
      this.sessions.createOrUpdate(
        dto.sessionId,
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
  @ApiBody({ type: FormPayloadDto })
  @ApiResponse({ status: 200, description: 'Schema actualizado o respuesta vacía si no hubo cambios.' })
  async dependent(@Body() dto: FormPayloadDto): Promise<SchemaResponse | undefined> {
    try {
      const storedHyperSchema = this.configs.getHyperSchema(dto.id);
      const formData = dto.formData ?? {};
      if (!this.sessions.shouldRunDependent(dto.sessionId, storedHyperSchema, formData)) {
        return undefined;
      }

      const hyperSchema = this.buildWorkingSchema(dto);
      const result = await this.forms.dependent(hyperSchema, dto.formData ?? {}, this.toOptions(dto));
      this.sessions.createOrUpdate(
        dto.sessionId,
        storedHyperSchema,
        result.schemaWithoutLinks,
        result.data
      );
      return {
        schema: result.schemaWithoutLinks,
        formData: result.data,
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
  @ApiBody({ type: FormPayloadDto })
  @ApiResponse({ status: 200, description: 'Resultado de submit con schema sin links.' })
  async submit(@Body() dto: FormPayloadDto): Promise<SchemaResponse> {
    try {
      const hyperSchema = this.buildWorkingSchema(dto);
      const result = await this.forms.submit(hyperSchema, dto.formData ?? {}, this.toOptions(dto));
      this.sessions.createOrUpdate(
        dto.sessionId,
        this.configs.getHyperSchema(dto.id),
        result.schemaWithoutLinks,
        result.data
      );
      return {
        schema: result.schemaWithoutLinks,
        formData: result.data,
        warnings: result.warnings,
        changed: true,
      };
    } catch (error) {
      this.throwStandardError(error);
    }
  }

  @Post('resolve')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Resuelve roles arbitrarios',
    description: 'Endpoint técnico para ejecutar roles específicos del motor.',
  })
  @ApiBody({ type: ResolveFormDto })
  @ApiResponse({ status: 200, description: 'Resultado de resolución por roles.' })
  async resolve(@Body() dto: ResolveFormDto): Promise<InitResponse> {
    try {
      const hyperSchema = this.buildWorkingSchema(dto);
      const { uiSchema } = this.configs.getPublicConfig(dto.id);
      const result = await this.forms.run(
        hyperSchema,
        dto.formData ?? {},
        dto.roles ?? ['init', 'catalog'],
        this.toOptions(dto)
      );
      return {
        schema: result.schemaWithoutLinks,
        uiSchema,
        formData: result.data,
        dependentWatchFields: getDependentWatchFields(hyperSchema),
        warnings: result.warnings,
      };
    } catch (error) {
      this.throwStandardError(error);
    }
  }

  private toOptions(dto: FormPayloadDto): ResolveOptions {
    return { useTestValues: dto.useTestValues, values: dto.values };
  }

  /**
   * Usa el schema público activo que manda el front, pero reinyecta los links
   * guardados internamente. Así dependent/submit preservan enums/defaults ya
   * calculados por init/catalog sin exponer links ni re-ejecutar catálogos.
   */
  private buildWorkingSchema(dto: FormPayloadDto): JsonHyperSchema {
    const storedHyperSchema = this.configs.getHyperSchema(dto.id);
    return {
      ...(dto.schema ?? this.sessions.getSchema(dto.sessionId) ?? storedHyperSchema),
      links: storedHyperSchema.links,
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
