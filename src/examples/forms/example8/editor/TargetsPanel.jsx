import React from 'react';
import { esc } from '../ui/text';
import { DatabaseIcon, PlusIcon } from '../ui/icons';

const methodClass = (m) => `xrm-method-${String(m || '').toLowerCase()}`;

export default function TargetsPanel({ targets, onOpenTarget, onAddTarget }) {
  return (
    <>
      <div className="xrm-rp-head">
        <span className="xrm-rp-eyebrow">Endpoints</span>
        <button
          className="xrm-tbtn"
          style={{ padding: '3px 8px', fontSize: '10px' }}
          onClick={() => onAddTarget()}
        >
          <PlusIcon size={11} />
          Agregar
        </button>
      </div>
      <div className="xrm-tg-list">
        {!targets.length ? (
          <div className="xrm-empty">
            Sin endpoints registrados.
            <br />
            Agrega uno con el botón +
          </div>
        ) : (
          targets.map((t) => {
            const count = Object.keys(t.assignments || {}).length;
            return (
              <div className="xrm-tg-row" key={t.id} onClick={() => onOpenTarget(t.id)}>
                <span className={`xrm-tg-method ${methodClass(t.method)}`}>{t.method}</span>
                <span className="xrm-tg-name" title={t.name}>{esc(t.name)}</span>
                {count > 0 && <span className="xrm-tg-mapped-count">{count}</span>}
              </div>
            );
          })
        )}
      </div>
    </>
  );
}

export { DatabaseIcon };