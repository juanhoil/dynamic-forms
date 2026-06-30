import React, { useState } from 'react';
import { esc } from '../ui/text';
import { PlusIcon } from '../ui/icons';
import { shcemaNewDireccion as schemaDireccion } from '../../shcemas';

/**
 * Sidebar "Editar Formulario"
 * - Muestra los campos del schema (CP, Estado, etc.)
 * - Cada campo tiene:
 *    - nombre
 *    - badge "variables" si tiene mappings que dependen de respuestas, "Text" si no
 *    - pill "Required" / "Optional" según `required[]` del schema
 *    - cantidad de mappings apuntando a este campo
 *    - al hacer clic abre el primer target que mapea ese campo
 */
export default function SchemaSidebar({ targets, requiredFields = [], onOpenTarget }) {
  const fieldsMap = schemaDireccion.properties || {};
  const selectFields = new Set();
  const mappedFields = new Set();
  const mappingCount = {};

  targets.forEach((t) => {
    Object.entries(t.assignments || {}).forEach(([f, a]) => {
      mappedFields.add(f);
      mappingCount[f] = (mappingCount[f] || 0) + 1;
      if (a.type === 'select') selectFields.add(f);
    });
  });

  const targetForField = (field) =>
    targets.find((t) => t.assignments && t.assignments[field]);

  const [formName, setFormName] = useState('Formulario de dirección');
  const [formDesc, setFormDesc] = useState(
    'Captura de dirección con autollenado por código postal.'
  );

  return (
    <div className="xrm-sidebar">
      <div className="xrm-sb-head">
        <div className="xrm-sb-eyebrow">Editar Formulario</div>
        <div className="xrm-sb-title">{formName}</div>
      </div>

      <div className="xrm-sb-section">
        <input
          className="xrm-sb-input"
          value={formName}
          onChange={(e) => setFormName(e.target.value)}
          placeholder="Escribe un nombre para el formulario…"
        />
        <textarea
          className="xrm-sb-textarea"
          value={formDesc}
          onChange={(e) => setFormDesc(e.target.value)}
          placeholder="Escribe una descripción para el formulario…"
          rows={2}
        />
      </div>
    </div>
  );
}