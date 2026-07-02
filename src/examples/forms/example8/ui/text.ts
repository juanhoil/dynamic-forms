// ---------------------------------------------------------------------------
// Helpers de presentación para el editor: HTML escape y syntax highlighting.
// ---------------------------------------------------------------------------

/**
 * Escapa un valor para inserción segura como HTML (en dangerouslySetInnerHTML).
 */
export const esc = (s: unknown) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Syntax highlighting de un string JSON. Devuelve HTML con clases `xrm-r-*`.
 */
export const hl = (json: unknown) => {
  if (!json) return '';
  return String(json)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
      (m) => {
        if (/^".*":$/.test(m)) return `<span class="xrm-r-key">${m}</span>`;
        if (/^"/.test(m)) return `<span class="xrm-r-str">${m}</span>`;
        if (/true|false/.test(m)) return `<span class="xrm-r-bool">${m}</span>`;
        if (/null/.test(m)) return `<span class="xrm-r-null">${m}</span>`;
        return `<span class="xrm-r-num">${m}</span>`;
      }
    )
    .replace(/[{}\[\]]/g, (b) => `<span class="xrm-r-brace">${b}</span>`);
};