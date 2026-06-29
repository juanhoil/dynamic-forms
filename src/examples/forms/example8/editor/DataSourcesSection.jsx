import React, { useState } from 'react';
import { esc } from '../ui/text';
import { ChevronIcon, EditIcon, TrashIcon } from '../ui/icons';

/**
 * Sección "Initial data sources" — muestra los endpoints del schema
 * (los `links[]`) y permite abrir el modal de edición, eliminar, etc.
 */
export default function DataSourcesSection({ targets, onOpenTarget, onAddTarget, onDeleteTarget }) {
  const [expandedId, setExpandedId] = useState(null);

  if (!targets.length) {
    return (
      <div className="xrm-empty">
        Sin data sources configuradas. Agrega una con el botón +.
      </div>
    );
  }

  return (
    <div className="xrm-ds-list">
      {targets.map((t) => {
        const isOpen = expandedId === t.id;
        const entries = Object.entries(t.assignments || {});
        return (
          <div className={`xrm-ds-card ${isOpen ? 'open' : ''}`} key={t.id}>
            <div
              className="xrm-ds-head"
              onClick={() => setExpandedId(isOpen ? null : t.id)}
            >
              <ChevronIcon open={isOpen} size={12} />
              <div className="xrm-ds-head-main">
                <div className="xrm-ds-head-row">
                  <span className="xrm-ds-rel">{esc(t.rel || t.name)}</span>
                  <span className="xrm-ds-role">{esc(t.dataRole || 'independent')}</span>
                  <span className="xrm-ds-count">
                    {entries.length} mapping{entries.length === 1 ? '' : 's'}
                  </span>
                </div>
                <div className="xrm-ds-url">{esc(t.url || t.name)}</div>
                {t.templatePointers && Object.keys(t.templatePointers).length > 0 && (
                  <div className="xrm-ds-watches">
                    <span className="xrm-ds-watches-label">Watches:</span>
                    {Object.keys(t.templatePointers).map((k) => (
                      <span key={k} className="xrm-ds-watch-tag">
                        {k}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="xrm-ds-actions">
                <button
                  className="xrm-icon-btn"
                  title="Editar endpoint"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenTarget && onOpenTarget(t.id);
                  }}
                >
                  <EditIcon />
                </button>
                <button
                  className="xrm-icon-btn danger"
                  title="Eliminar endpoint"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteTarget && onDeleteTarget(t);
                  }}
                >
                  <TrashIcon size={12} />
                </button>
              </div>
            </div>
            {isOpen && (
              <div className="xrm-ds-body">
                {entries.length === 0 ? (
                  <div className="xrm-ds-empty">No mappings defined.</div>
                ) : (
                  <div className="xrm-ds-mappings">
                    {entries.map(([field, asgn]) => (
                      <div className="xrm-ds-mapping-row" key={field}>
                        <span className="xrm-ds-mapping-field">{field}</span>
                        <span className="xrm-ds-mapping-kind">
                          {asgn.type === 'select' ? '.enum' : '.default'}
                        </span>
                        <span className="xrm-ds-mapping-arrow">←</span>
                        <code className="xrm-ds-mapping-source">
                          {asgn.type === 'default'
                            ? esc(asgn.sourceTpl || '—')
                            : `${esc(asgn.enumSource || '—')} · value: ${esc(asgn.valueTpl || '—')} · label: ${esc(asgn.labelTpl || '—')}`}
                        </code>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}