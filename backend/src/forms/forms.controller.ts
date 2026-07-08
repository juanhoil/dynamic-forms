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

import { Body, Controller, HttpCode, Inject, Post } from '@nestjs/common';
import { FormsService } from './forms.service.js';
import { FormConfigService } from '../form-config/form-config.service.js';
import { FormPayloadDto, ResolveFormDto } from './dto/resolve-form.dto.js';
import type { JsonHyperSchema, ResolveOptions } from '../index.js';

/** Respuesta de init: schema del form (sin links) + uiSchema + data resuelta. */
interface InitResponse {
  schema: JsonHyperSchema;
  uiSchema: Record<string, unknown>;
  formData: Record<string, unknown>;
  warnings: string[];
}

/** Respuesta de dependent/submit: solo el schema del form, sin links. */
interface SchemaResponse {
  schema: JsonHyperSchema;
  formData: Record<string, unknown>;
  warnings: string[];
}

@Controller('forms')
export class FormsController {
  constructor(
    @Inject(FormsService) private readonly forms: FormsService,
    @Inject(FormConfigService) private readonly configs: FormConfigService
  ) {}

  @Post('init')
  @HttpCode(200)
  async init(@Body() dto: FormPayloadDto): Promise<InitResponse> {
    const hyperSchema = this.configs.getHyperSchema(dto.id);
    const { uiSchema } = this.configs.getPublicConfig(dto.id);
    const result = await this.forms.init(hyperSchema, dto.formData ?? {}, this.toOptions(dto));
    return {
      schema: result.schemaWithoutLinks,
      uiSchema,
      formData: result.data,
      warnings: result.warnings,
    };
  }

  @Post('dependent')
  @HttpCode(200)
  async dependent(@Body() dto: FormPayloadDto): Promise<SchemaResponse> {
    const hyperSchema = this.configs.getHyperSchema(dto.id);
    const result = await this.forms.dependent(hyperSchema, dto.formData ?? {}, this.toOptions(dto));
    return {
      schema: result.schemaWithoutLinks,
      formData: result.data,
      warnings: result.warnings,
    };
  }

  @Post('submit')
  @HttpCode(200)
  async submit(@Body() dto: FormPayloadDto): Promise<SchemaResponse> {
    const hyperSchema = this.configs.getHyperSchema(dto.id);
    const result = await this.forms.submit(hyperSchema, dto.formData ?? {}, this.toOptions(dto));
    return {
      schema: result.schemaWithoutLinks,
      formData: result.data,
      warnings: result.warnings,
    };
  }

  @Post('resolve')
  @HttpCode(200)
  async resolve(@Body() dto: ResolveFormDto): Promise<InitResponse> {
    const hyperSchema = this.configs.getHyperSchema(dto.id);
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
      warnings: result.warnings,
    };
  }

  private toOptions(dto: FormPayloadDto): ResolveOptions {
    return { useTestValues: dto.useTestValues, values: dto.values };
  }
}
