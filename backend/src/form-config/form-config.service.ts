// ---------------------------------------------------------------------------
// Acceso a las configuraciones "guardadas". Hoy leen del fixture en memoria
// (form-config.data.ts); el día que exista una BD (Mongo, etc.) solo cambia la
// implementación de este servicio, no los controllers.
//
// La config guardada es { schema: hyperSchema, uiSchema }. El front solo recibe
// el schema SIN links + el uiSchema; nunca los links de resolución.
// ---------------------------------------------------------------------------

import { Injectable, NotFoundException } from '@nestjs/common';
import { DEFAULT_FORM_CONFIG_ID, getFormConfig, type FormConfig } from './form-config.data.js';
import type { JsonHyperSchema } from '../index.js';

/** Config que ve el front: schema del formulario (sin links) + uiSchema. */
export interface PublicFormConfig {
  schema: JsonHyperSchema;
  uiSchema: Record<string, unknown>;
}

@Injectable()
export class FormConfigService {
  /** Config completa (con links) — uso interno del backend. */

  /** hyperSchema (con links) para pasarlo al motor de resolución. */
  getHyperSchema(id: number = DEFAULT_FORM_CONFIG_ID): JsonHyperSchema {
    return getFormConfig(id).schema;
  }

  /** Config pública: schema SIN links + uiSchema (lo que ve el front). */
  getPublicConfig(id: number = DEFAULT_FORM_CONFIG_ID): PublicFormConfig {
    const { schema, uiSchema } = getFormConfig(id);
    const { links: _links, ...schemaWithoutLinks } = schema;
    return { schema: schemaWithoutLinks as JsonHyperSchema, uiSchema };
  }
}
