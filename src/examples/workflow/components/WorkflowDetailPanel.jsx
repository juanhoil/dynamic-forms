import React, { useState, useEffect } from 'react';

const WorkflowDetailPanel = ({ selectedNode, states, transitions, groups, onUpdateSLA, onUpdateLabel, onAddState, onDeleteState, onAddTransition, onRemoveTransition }) => {
  const [label, setLabel] = useState('');
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [isAdding, setIsAdding] = useState(false);
  const [newState, setNewState] = useState({ label: '', group: Object.keys(groups)[0] });
  const [newTransitionTarget, setNewTransitionTarget] = useState('');

  useEffect(() => {
    if (selectedNode) {
      setLabel(selectedNode.label);
      setHours(selectedNode.sla.hours || 0);
      setMinutes(selectedNode.sla.minutes || 0);
      setIsAdding(false);
      setNewTransitionTarget('');
    }
  }, [selectedNode]);

  const handleAdd = (e) => {
    e.preventDefault();
    if (!newState.label.trim()) return;
    onAddState(newState);
    setNewState({ ...newState, label: '' });
    setIsAdding(false);
  };

  const handleAddTransition = () => {
    if (!newTransitionTarget) return;
    onAddTransition(selectedNode.id, newTransitionTarget);
    setNewTransitionTarget('');
  };

  if (!selectedNode) {
    return (
      <div style={{ background: '#f8fafc', borderLeft: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Detalles del Estado</span>
          <button
            onClick={() => setIsAdding(!isAdding)}
            style={{ background: '#6366f1', color: 'white', border: 'none', borderRadius: '4px', padding: '2px 8px', fontSize: '10px', cursor: 'pointer' }}
          >
            {isAdding ? 'Cancelar' : '+ Nuevo Estado'}
          </button>
        </div>

        {isAdding ? (
          <div style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '14px', marginBottom: '16px' }}>Crear Nuevo Estado</h3>
            <form onSubmit={handleAdd}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Nombre</label>
                <input
                  type="text"
                  placeholder="Ej: En revisión técnica"
                  value={newState.label}
                  onChange={(e) => setNewState({ ...newState, label: e.target.value })}
                  style={{ width: '100%', padding: '8px', fontSize: '13px', border: '1px solid #e2e8f0', borderRadius: '4px' }}
                  autoFocus
                />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Grupo</label>
                <select
                  value={newState.group}
                  onChange={(e) => setNewState({ ...newState, group: e.target.value })}
                  style={{ width: '100%', padding: '8px', fontSize: '13px', border: '1px solid #e2e8f0', borderRadius: '4px' }}
                >
                  {Object.entries(groups).map(([id, g]) => (
                    <option key={id} value={id}>{g.label}</option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                style={{ width: '100%', background: '#6366f1', color: 'white', border: 'none', borderRadius: '4px', padding: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
              >
                Crear Estado
              </button>
            </form>
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: '#94a3b8', marginTop: '40px', fontSize: '13px', padding: '20px' }}>
            Selecciona un estado en el diagrama para ver sus detalles o usa el botón superior para crear uno nuevo.
          </div>
        )}
      </div>
    );
  }

  const handleSLAUpdate = () => {
    onUpdateSLA(selectedNode.id, parseInt(hours), parseInt(minutes));
  };

  const handleLabelUpdate = () => {
    onUpdateLabel(selectedNode.id, label);
  };

  return (
    <div style={{ background: '#f8fafc', borderLeft: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>
        Detalles del Estado
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 10px',
          borderRadius: '20px',
          fontSize: '11px',
          fontWeight: 600,
          background: groups[selectedNode.group].color + '22',
          color: groups[selectedNode.group].color,
          border: `1px solid ${groups[selectedNode.group].color}44`,
          marginBottom: '20px'
        }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }}></div>
          {groups[selectedNode.group].label.toUpperCase()}
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>Nombre</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              style={{ flex: 1, padding: '6px 10px', fontSize: '14px', border: '1px solid #e2e8f0', borderRadius: '4px', outline: 'none' }}
            />
            <button
              onClick={handleLabelUpdate}
              style={{ background: '#6366f1', color: 'white', border: 'none', borderRadius: '4px', padding: '0 12px', fontSize: '12px', cursor: 'pointer' }}
            >
              ✓
            </button>
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>ID Técnico</label>
          <div style={{ fontSize: '12px', fontFamily: 'monospace', color: '#64748b', background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px' }}>{selectedNode.id}</div>
        </div>

        <button
          onClick={() => { if (window.confirm(`¿Eliminar "${selectedNode.label}"? Se eliminarán también sus transiciones.`)) onDeleteState(selectedNode.id); }}
          style={{ width: '100%', background: 'transparent', border: '1px solid #fecaca', borderRadius: '4px', padding: '8px', fontSize: '12px', color: '#ef4444', cursor: 'pointer', marginBottom: '20px' }}
        >
          Eliminar Estado
        </button>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>SLA Configurado</label>
          {selectedNode.group === 'fin' ? (
            <div style={{ background: '#fef2f2', padding: '12px', borderRadius: '8px', border: '1px solid #fecaca', color: '#991b1b', fontSize: '12px' }}>
              Los estados de tipo FIN no tienen SLA configurado.
            </div>
          ) : (
          <>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block' }}>Horas</span>
                <input
                  type="number"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  style={{ width: '100%', padding: '6px 10px', fontSize: '14px', border: '1px solid #e2e8f0', borderRadius: '4px' }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block' }}>Minutos</span>
                <input
                  type="number"
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                  max="59"
                  style={{ width: '100%', padding: '6px 10px', fontSize: '14px', border: '1px solid #e2e8f0', borderRadius: '4px' }}
                />
              </div>
              <button
                onClick={handleSLAUpdate}
                style={{ background: '#6366f1', color: 'white', border: 'none', borderRadius: '4px', padding: '20px 12px 6px', marginTop: '14px', fontSize: '12px', cursor: 'pointer' }}
              >
                Guardar
              </button>
            </div>
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '8px 12px' }}>
               <span style={{ fontSize: '18px', fontWeight: 700, color: '#b45309' }}>{selectedNode.sla.total_minutes}</span>
               <span style={{ fontSize: '12px', color: '#92400e', marginLeft: '4px' }}>minutos totales</span>
            </div>
          </>
          )}
        </div>

        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '20px', marginTop: '20px' }}>
          <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: '12px' }}>Transiciones Salientes</label>
          {transitions.filter(t => t.from === selectedNode.id).length === 0 ? (
            <div style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic', marginBottom: '16px' }}>Sin transiciones salientes</div>
          ) : (
            <div style={{ marginBottom: '16px' }}>
              {transitions
                .filter(t => t.from === selectedNode.id)
                .map((t, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', background: '#fff', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12px' }}>
                    <span style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ color: '#1e293b', fontWeight: 500 }}>{states[t.from]?.label || t.from}</span>
                      <span style={{ color: '#94a3b8' }}>→</span>
                      <span style={{ color: groups[states[t.to]?.group]?.color || '#000', fontWeight: 600 }}>{states[t.to]?.label || t.to}</span>
                    </span>
                    <button
                      onClick={() => onRemoveTransition(t.from, t.to)}
                      style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '14px', cursor: 'pointer', padding: '0 4px' }}
                      title="Eliminar transición"
                    >
                      ×
                    </button>
                  </div>
                ))
              }
            </div>
          )}

          {selectedNode.group === 'fin' ? (
            <div style={{ background: '#fef2f2', padding: '12px', borderRadius: '8px', border: '1px solid #fecaca', color: '#991b1b', fontSize: '11px' }}>
              <strong>Nota:</strong> Los estados de tipo FIN no pueden tener transiciones salientes.
            </div>
          ) : (
            <div style={{ background: '#f1f5f9', padding: '12px', borderRadius: '8px' }}>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>Añadir Nueva Transición</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select
                  value={newTransitionTarget}
                  onChange={(e) => setNewTransitionTarget(e.target.value)}
                  style={{ flex: 1, padding: '6px', fontSize: '12px', border: '1px solid #e2e8f0', borderRadius: '4px' }}
                >
                  <option value="">Seleccionar destino...</option>
                  {Object.values(states)
                    .filter(s => s.id !== selectedNode.id)
                    .map(s => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))
                  }
                </select>
                <button
                  onClick={handleAddTransition}
                  disabled={!newTransitionTarget}
                  style={{
                    background: newTransitionTarget ? '#6366f1' : '#cbd5e1',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '0 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: newTransitionTarget ? 'pointer' : 'default'
                  }}
                >
                  +
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkflowDetailPanel;
