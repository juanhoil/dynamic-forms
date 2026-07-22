// ---------------------------------------------------------------------------
// DTOs de entrada. El front ya NO envía el hyperSchema (no conoce los links):
// solo referencia la configuración guardada por `id` (default 1).
// La sesión la asigna el backend en `/init` (como form_create_session del MCP).
// ---------------------------------------------------------------------------

import { IsBoolean, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { JsonHyperSchema } from '../../index.js';

/** Body de `/init`: el servidor asigna `sessionId` y lo devuelve en la respuesta. */
export class FormPayloadDto {
  /** Id de la configuración guardada. Default: 0. */
  @ApiPropertyOptional({ type: Number, example: 0, description: 'Id de la configuración guardada.' })
  @IsNumber()
  @IsOptional()
  id?: number;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true, example: { pais: 'MX' } })
  @IsObject()
  @IsOptional()
  formData?: Record<string, unknown>;

  /**
   * Schema público activo que tiene el front (sin links). Se usa para preservar
   * enums/defaults calculados previamente por init/catalog al ejecutar
   * dependent/submit sin re-ejecutar catálogos.
   */
  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    description: 'Schema público activo del front, sin links.',
  })
  @IsObject()
  @IsOptional()
  schema?: JsonHyperSchema;

  /** Si true, usa los testValues declarados en cada link en vez de la red. */
  @ApiPropertyOptional({ type: Boolean, example: true })
  @IsBoolean()
  @IsOptional()
  useTestValues?: boolean;

  /** Variables externas de runtime (secretos, tokens, api keys...). */
  @ApiPropertyOptional({ type: 'object', additionalProperties: true, example: { userId: 'demo-user' } })
  @IsObject()
  @IsOptional()
  context?: Record<string, unknown>;
}

/** Body de `/dependent` y `/submit`: usan la sesión asignada en `/init`. */
export class FormSessionPayloadDto extends FormPayloadDto {
  /** Identificador de instancia asignado por el backend en `/init`. */
  @ApiProperty({ type: String, example: 'fe9d6d60-5f83-4d57-b609-1b1c09c3b7a2' })
  @IsString()
  sessionId!: string;
}
