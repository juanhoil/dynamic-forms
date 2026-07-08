// ---------------------------------------------------------------------------
// Punto de entrada de las utilerías del motor de HyperSchema para backend.
// Reexporta el motor de resolución, el servicio de links, el motor de
// plantillas CEL, buildRequest y los tipos.
// ---------------------------------------------------------------------------

export * from './types.js';

export {
  resolveLinks,
  resolveInitial,
  resolveDependent,
  resolveSubmit,
  resolveSource,
  resolveEnumObjectMapping,
  resolveItemValue,
  resolveItemTemplate,
  buildTemplateScope,
  type LinkRole,
  type ResolveOptions,
  type ResolveResult,
} from './services/hyperSchemaResolver.js';

export {
  createMockService,
  defaultForLink,
  type HyperSchemaService,
  type ResolvedLink,
  type MockServiceOptions,
} from './services/mockService.js';

export {
  renderTemplate,
  renderTemplateValue,
  renderTemplateRecursive,
  isWholeTemplateToken,
  collectTokenPaths,
  unresolvedTokens,
  type Scope,
} from './utils/templateEngine.js';

export { buildRequest, buildScope, type BuiltRequest } from './utils/buildRequest.js';

export { clone, resolvePointer, setValue, isEmptyValue } from './utils/pointer.js';
