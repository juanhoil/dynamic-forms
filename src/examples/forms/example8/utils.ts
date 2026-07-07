// ---------------------------------------------------------------------------
// Barrel de compatibilidad temporal — re-exporta desde las nuevas
// ubicaciones por capas. Mantiene imports antiguos funcionando:
//   import { buildMappingJSON, esc } from './example8/utils';
// ---------------------------------------------------------------------------

export { parsedSchema, schemaPlainProps, findAllArraySources } from './utils/schema';
export { buildMappingJSON } from './utils/mapping';
export { sampleFromSchema } from './utils/sample';
export { esc, hl } from './ui/text';
export { uid } from './ui/id';