// ---------------------------------------------------------------------------
// GET /api/form-config/get/:id   (default id = 1)
//
// Devuelve la configuración guardada, pero SIN los `links`: el front solo
// conoce el JSON Schema del formulario + el uiSchema, nunca los links.
// ---------------------------------------------------------------------------

import { Controller, Get, Inject, Param, ParseIntPipe } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FormConfigService, type PublicFormConfig } from './form-config.service.js';
import { DEFAULT_FORM_CONFIG_ID } from './form-config.data.js';

interface FormConfigResponse extends PublicFormConfig {
  id: number;
}

@ApiTags('Form Config')
@Controller('form-config')
export class FormConfigController {
  constructor(
    @Inject(FormConfigService) private readonly configs: FormConfigService
  ) {}

  @Get('get/:id')
  @ApiOperation({
    summary: 'Obtiene configuración pública por id',
    description: 'Devuelve schema sin links y uiSchema. El front nunca recibe links del HyperSchema.',
  })
  @ApiParam({ name: 'id', type: Number, example: DEFAULT_FORM_CONFIG_ID })
  @ApiResponse({ status: 200, description: 'Configuración pública encontrada.' })
  getById(@Param('id', ParseIntPipe) id: number): FormConfigResponse {
    return { id, ...this.configs.getPublicConfig(id) };
  }

  @Get('get')
  @ApiOperation({
    summary: 'Obtiene configuración pública default',
    description: 'Usa el id default configurado en memoria.',
  })
  @ApiResponse({ status: 200, description: 'Configuración pública default.' })
  getDefault(): FormConfigResponse {
    return {
      id: DEFAULT_FORM_CONFIG_ID,
      ...this.configs.getPublicConfig(DEFAULT_FORM_CONFIG_ID),
    };
  }
}
