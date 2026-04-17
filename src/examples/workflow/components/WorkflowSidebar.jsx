import React, { useState } from 'react';

const WorkflowSidebar = ({ groups, states, selectedNodeId, onSelectNode, onAddState, onDeleteState }) => {
  const [isAdding, setIsAdding] = useState(false);
  const groupEntries = Object.entries(groups);
  const [newState, setNewState] = useState({ label: '', group: groupEntries[0]?.[0] || '' });

  const handleAdd = (e) => {
    e.preventDefault();
    if (!newState.label.trim()) return;

    onAddState(newState);
    setNewState({ ...newState, label: '' });
    setIsAdding(false);
  };

  return (
    <div style={{ background: '#f8fafc', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Estados por Grupo</span>
        <button
          onClick={() => setIsAdding(!isAdding)}
          style={{
            background: '#6366f1',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            padding: '2px 8px',
            fontSize: '10px',
            cursor: 'pointer'
          }}
        >
          {isAdding ? 'Cerrar' : '+ Nuevo'}
        </button>
      </div>

      {isAdding && (
        <div style={{ padding: '12px', borderBottom: '1px solid #e2e8f0', background: '#eff6ff' }}>
          <form onSubmit={handleAdd}>
            <input
              type="text"
              placeholder="Nombre del estado..."
              value={newState.label}
              onChange={(e) => setNewState({ ...newState, label: e.target.value })}
              style={{ width: '100%', padding: '6px 8px', fontSize: '12px', border: '1px solid #bfdbfe', borderRadius: '4px', marginBottom: '8px' }}
              autoFocus
            />
            <select
              value={newState.group}
              onChange={(e) => setNewState({ ...newState, group: e.target.value })}
              style={{ width: '100%', padding: '6px 8px', fontSize: '12px', border: '1px solid #bfdbfe', borderRadius: '4px', marginBottom: '8px' }}
            >
              {groupEntries.map(([id, g]) => (
                <option key={id} value={id}>{g.label}</option>
              ))}
            </select>
            <button
              type="submit"
              style={{ width: '100%', background: '#6366f1', color: 'white', border: 'none', borderRadius: '4px', padding: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
            >
              Añadir Estado
            </button>
          </form>
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
        {groupEntries.map(([groupId, group]) => (
          <div key={groupId} style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: group.color }}></div>
              <span style={{ fontWeight: 600, fontSize: '13px' }}>{group.label}</span>
            </div>
            <div style={{ paddingLeft: '16px' }}>
              {Object.values(states)
                .filter(s => s.group == groupId)
                .map(state => (
                  <div
                    key={state.id}
                    onClick={() => onSelectNode(state.id)}
                    style={{
                      padding: '6px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      background: selectedNodeId === state.id ? '#e2e8f0' : 'transparent',
                      color: selectedNodeId === state.id ? '#1e293b' : '#64748b',
                      marginBottom: '2px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <span style={{ flex: 1 }}>{state.label}</span>
                    {state.sla.total_minutes > 0 && (
                      <span style={{ fontSize: '10px', background: '#f1f5f9', padding: '1px 4px', borderRadius: '10px', color: '#94a3b8', marginRight: '4px' }}>
                        ⏱ {state.sla.total_minutes}m
                      </span>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); onDeleteState(state.id); }}
                      style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '12px', cursor: 'pointer', padding: '0 2px', lineHeight: 1 }}
                      title="Eliminar estado"
                    >
                      ×
                    </button>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WorkflowSidebar;