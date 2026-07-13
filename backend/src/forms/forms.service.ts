// ---------------------------------------------------------------------------
// Provider que envuelve el motor puro `hyperschema-engine`. El controller
// nunca importa el motor directamente: lo hace a través de este servicio, lo
// que permite inyección de dependencias, testeo y un único lugar donde
// configurar el `service` de red, timeouts o allowlists (anti-SSRF).
// ---------------------------------------------------------------------------

import { Injectable } from '@nestjs/common';
import {
  resolveDependent,
  resolveInitial,
  resolveLinks,
  resolveSubmit,
  type HyperSchemaConfig,
  type LinkRole,
  type ResolveOptions,
  type ResolveResult,
} from '../index.js';

@Injectable()
export class FormsService {
  /** Carga inicial: resuelve los roles `init` + `catalog`. */
  init(
    config: HyperSchemaConfig,
    formData: Record<string, unknown> = {},
    opts: ResolveOptions = {}
  ): Promise<ResolveResult> {
    return resolveInitial(config, formData, opts);
  }

  /** Resuelve los links `dependent` para los valores actuales del form. */
  dependent(
    config: HyperSchemaConfig,
    formData: Record<string, unknown> = {},
    opts: ResolveOptions = {}
  ): Promise<ResolveResult> {
    return resolveDependent(config, formData, opts);
  }

  /** Ejecuta el link `submit`. */
  submit(
    config: HyperSchemaConfig,
    formData: Record<string, unknown> = {},
    opts: ResolveOptions = {}
  ): Promise<ResolveResult> {
    return resolveSubmit(config, formData, opts);
  }

  /** Ejecución genérica de roles arbitrarios. */
  run(
    config: HyperSchemaConfig,
    formData: Record<string, unknown>,
    roles: LinkRole[],
    opts: ResolveOptions = {}
  ): Promise<ResolveResult> {
    return resolveLinks(config, formData, roles, opts);
  }
}
