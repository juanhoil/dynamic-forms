// ---------------------------------------------------------------------------
// GET /api/form-config/get/:id   (default id = 1)
//
// Devuelve la configuración COMPLETA para el editor (Example 8): formSchema,
// externalVariables globales, dataSource (links de lectura) y submit. El motor
// de runtime (init/dependent/submit) nunca expone esto al form final; solo el
// editor la consume para editar.
// ---------------------------------------------------------------------------

import { Controller, Get, Inject, Param, ParseIntPipe } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FormConfigService } from './form-config.service.js';
import { DEFAULT_FORM_CONFIG_ID, type FormConfig, type FormConfigLite } from './form-config.data.js';

@Controller('form-config')
export class FormConfigController {
  constructor(
    @Inject(FormConfigService) private readonly configs: FormConfigService
  ) {}

  @Get('get/:id')
  @ApiOperation({
    summary: 'Obtiene la configuración completa por id (para el editor)',
    description: 'Devuelve formSchema, externalVariables, dataSource, submit y uiSchema.',
  })
  @ApiParam({ name: 'id', type: Number, example: DEFAULT_FORM_CONFIG_ID })
  @ApiResponse({ status: 200, description: 'Configuración encontrada.' })
  getById(@Param('id', ParseIntPipe) id: number): FormConfig {
    return this.configs.getFormConfigFull(id);
  }

  @Get('get-all')
  @ApiOperation({
    summary: 'Obtiene todas las configuraciones públicas',
    description: 'Devuelve todas las configuraciones públicas.',
  })
  @ApiResponse({ status: 200, description: 'Configuraciones públicas encontradas.' })
  getAll(): FormConfigLite[] {
    return this.configs.getAllFormConfigsLite();
  }
}
