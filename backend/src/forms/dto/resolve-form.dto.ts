// ---------------------------------------------------------------------------
// DTOs de entrada. El front ya NO envía el hyperSchema (no conoce los links):
// solo referencia la configuración guardada por `id` (default 1).
// ---------------------------------------------------------------------------

import { IsArray, IsBoolean, IsIn, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { JsonHyperSchema, LinkRole } from '../../index.js';

const LINK_ROLES: LinkRole[] = ['init', 'catalog', 'dependent', 'submit'];

/** Body base compartido por init / dependent / submit. */
export class FormPayloadDto {
  /** Id de la configuración guardada. Default: 0. */
  @ApiPropertyOptional({ type: Number, example: 0, description: 'Id de la configuración guardada.' })
  @IsNumber()
  @IsOptional()
  id?: number;

  /** Identificador de instancia generado por el front al cargar la vista. */
  @ApiProperty({ type: String, example: 'fe9d6d60-5f83-4d57-b609-1b1c09c3b7a2' })
  @IsString()
  sessionId!: string;

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
  values?: Record<string, unknown>;
}

/** Body del endpoint genérico `/resolve`, que permite elegir los roles. */
export class ResolveFormDto extends FormPayloadDto {
  @ApiPropertyOptional({
    enum: LINK_ROLES,
    isArray: true,
    example: ['init', 'catalog'],
  })
  @IsArray()
  @IsOptional()
  @IsIn(LINK_ROLES, { each: true })
  roles?: LinkRole[];
}
