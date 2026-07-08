// ---------------------------------------------------------------------------
// Acceso a las configuraciones "guardadas". Hoy leen del fixture en memoria
// (form-config.data.ts); el día que exista una BD (Mongo, etc.) solo cambia la
// implementación de este servicio, no los controllers.
//
// La config guardada es { schema: hyperSchema, uiSchema }. El front solo recibe
// el schema SIN links + el uiSchema; nunca los links de resolución.
// ---------------------------------------------------------------------------

import { Injectable, NotFoundException } from '@nestjs/common';
import { DEFAULT_FORM_CONFIG_ID, FORM_CONFIGS, type FormConfig } from './form-config.data.js';
import type { JsonHyperSchema } from '../index.js';

/** Config que ve el front: schema del formulario (sin links) + uiSchema. */
export interface PublicFormConfig {
  schema: JsonHyperSchema;
  uiSchema: Record<string, unknown>;
}

@Injectable()
export class FormConfigService {
  /** Config completa (con links) — uso interno del backend. */
  getById(id: string = DEFAULT_FORM_CONFIG_ID): FormConfig {
    const config = FORM_CONFIGS[id || DEFAULT_FORM_CONFIG_ID];
    if (!config) {
      throw new NotFoundException(`No existe la configuración de formulario "${id}"`);
    }
    return config;
  }

  /** hyperSchema (con links) para pasarlo al motor de resolución. */
  getHyperSchema(id: string = DEFAULT_FORM_CONFIG_ID): JsonHyperSchema {
    return this.getById(id).schema;
  }

  /** Config pública: schema SIN links + uiSchema (lo que ve el front). */
  getPublicConfig(id: string = DEFAULT_FORM_CONFIG_ID): PublicFormConfig {
    const { schema, uiSchema } = this.getById(id);
    const { links: _links, ...schemaWithoutLinks } = schema;
    return { schema: schemaWithoutLinks as JsonHyperSchema, uiSchema };
  }
}
