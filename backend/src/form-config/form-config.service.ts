// ---------------------------------------------------------------------------
// Acceso a las configuraciones "guardadas". Hoy leen del fixture en memoria
// (form-config.data.ts); el día que exista una BD (Mongo, etc.) solo cambia la
// implementación de este servicio, no los controllers.
//
// La config guardada es { schema: hyperSchema, uiSchema }. El front solo recibe
// el schema SIN links + el uiSchema; nunca los links de resolución.
// ---------------------------------------------------------------------------

import { Injectable } from '@nestjs/common';
import { DEFAULT_FORM_CONFIG_ID, getAllFormConfigsLite, getFormConfig, type FormConfigLite, FormConfig } from './form-config.data.js';
import type { HyperSchemaConfig, JsonHyperSchema } from '../index.js';

/** Config que ve el front: schema del formulario (sin links) + uiSchema. */
export interface PublicFormConfig {
  schema: JsonHyperSchema;
  uiSchema: Record<string, unknown>;
}

@Injectable()
export class FormConfigService {
  /** Listado ligero de configuraciones (id/name/description). */
  getAllFormConfigsLite(): FormConfigLite[] {
    return getAllFormConfigsLite();
  }

  /** Config completa (con links) — uso del editor / backend. */
  getFormConfigFull(id: number): FormConfig {
    return getFormConfig(id);
  }

  /**
   * Config del motor: modelo dividido {formSchema, externalVariables global,
   * dataSource, submit}. Es lo que consumen init/dependent/submit.
   */
  getEngineConfig(id: number = DEFAULT_FORM_CONFIG_ID): HyperSchemaConfig {
    const config = getFormConfig(id);
    return {
      formSchema: (config.formSchema ?? {}) as JsonHyperSchema,
      externalVariables: config.externalVariables,
      dataSource: config.dataSource ?? [],
      submit: config.submit ?? null,
    };
  }

  /** Config pública: solo formSchema (sin links) + uiSchema (lo que ve el front). */
  getPublicConfig(id: number = DEFAULT_FORM_CONFIG_ID): PublicFormConfig {
    const config = getFormConfig(id);
    return { schema: (config.formSchema ?? {}) as JsonHyperSchema, uiSchema: config.uiSchema ?? {} };
  }
}
