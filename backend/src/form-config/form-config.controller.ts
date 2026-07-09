// ---------------------------------------------------------------------------
// GET /api/form-config/get/:id   (default id = 1)
//
// Devuelve la configuración guardada, pero SIN los `links`: el front solo
// conoce el JSON Schema del formulario + el uiSchema, nunca los links.
// ---------------------------------------------------------------------------

import { Controller, Get, Inject, Param, ParseIntPipe } from '@nestjs/common';
import { FormConfigService, type PublicFormConfig } from './form-config.service.js';
import { DEFAULT_FORM_CONFIG_ID } from './form-config.data.js';

interface FormConfigResponse extends PublicFormConfig {
  id: number;
}

@Controller('form-config')
export class FormConfigController {
  constructor(
    @Inject(FormConfigService) private readonly configs: FormConfigService
  ) {}

  @Get('get/:id')
  getById(@Param('id', ParseIntPipe) id: number): FormConfigResponse {
    return { id, ...this.configs.getPublicConfig(id) };
  }

  @Get('get')
  getDefault(): FormConfigResponse {
    return {
      id: DEFAULT_FORM_CONFIG_ID,
      ...this.configs.getPublicConfig(DEFAULT_FORM_CONFIG_ID),
    };
  }
}
