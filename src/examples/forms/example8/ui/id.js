// ---------------------------------------------------------------------------
// Generadores de IDs estables para el editor.
// ---------------------------------------------------------------------------

/**
 * Genera un ID prefijado con un contador numérico.
 * Ej: uid('t', 4) → 't4'
 */
export const uid = (prefix, counter) => `${prefix}${counter}`;