// ---------------------------------------------------------------------------
// DTOs de entrada. El front ya NO envía el hyperSchema (no conoce los links):
// solo referencia la configuración guardada por `id` (default 1).
// ---------------------------------------------------------------------------

import { IsArray, IsBoolean, IsIn, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';
import type { JsonHyperSchema, LinkRole } from '../../index.js';

const LINK_ROLES: LinkRole[] = ['init', 'catalog', 'dependent', 'submit'];

/** Body base compartido por init / dependent / submit. */
export class FormPayloadDto {
  /** Id de la configuración guardada. Default: 0. */
  @IsNumber()
  @IsOptional()
  id?: number;

  /** Identificador de instancia generado por el front al cargar la vista. */
  @IsString()
  sessionId!: string;

  @IsObject()
  @IsOptional()
  formData?: Record<string, unknown>;

  /**
   * Schema público activo que tiene el front (sin links). Se usa para preservar
   * enums/defaults calculados previamente por init/catalog al ejecutar
   * dependent/submit sin re-ejecutar catálogos.
   */
  @IsObject()
  @IsOptional()
  schema?: JsonHyperSchema;

  /** Si true, usa los testValues declarados en cada link en vez de la red. */
  @IsBoolean()
  @IsOptional()
  useTestValues?: boolean;

  /** Variables externas de runtime (secretos, tokens, api keys...). */
  @IsObject()
  @IsOptional()
  values?: Record<string, unknown>;
}

/** Body del endpoint genérico `/resolve`, que permite elegir los roles. */
export class ResolveFormDto extends FormPayloadDto {
  @IsArray()
  @IsOptional()
  @IsIn(LINK_ROLES, { each: true })
  roles?: LinkRole[];
}
