import React, { useState, useMemo, useCallback } from 'react';
import 'reactflow/dist/style.css';
import WorkflowSidebar from './components/WorkflowSidebar';
import WorkflowCanvas from './components/WorkflowCanvas';

/**
 * WORKFLOW configuration (same as Example 1)
 */
const WORKFLOW = {
  id: 1,
  groups: [
    { id: 1, label: "Inicio",  color: "#6366f1" },
    { id: 2, label: "Proceso", color: "#14b8a6" },
    { id: 3, label: "Fin",     color: "#f59e0b" }
  ],
  states: [
    { id: 1, label: "Nuevo Ticket",  group: 1, color: "#6366f1", sla: { hours: 1,  minutes: 0,  total_minutes: 60   } },
    { id: 2, label: "En Revisión",   group: 2, color: "#14b8a6", sla: { hours: 8,  minutes: 0,  total_minutes: 480  } },
    { id: 3, label: "Incompleto",    group: 2, color: "#14b8a6", sla: { hours: 24, minutes: 0,  total_minutes: 1440 } },
    { id: 4, label: "En Espera",     group: 2, color: "#14b8a6", sla: { hours: 48, minutes: 0,  total_minutes: 2880 } },
    { id: 5, label: "Resuelto",      group: 3, color: "#0af545", sla: { hours: 0,  minutes: 0,  total_minutes: 0    } },
    { id: 6, label: "Cerrado",       group: 3, color: "#f50a39", sla: { hours: 0,  minutes: 0,  total_minutes: 0    } }
  ],
  transitions: [
    { id: 1, from: 1, to: 2 },
    { id: 2, from: 2, to: 3 },
    { id: 3, from: 2, to: 4 },
    { id: 5, from: 3, to: 2 },
    { id: 6, from: 4, to: 5 },
    { id: 7, from: 4, to: 6 }
  ]
};

const now = new Date();
const dt = (minAgo) => new Date(now - minAgo * 60000).toISOString();

/**
 * Demo tickets simulating DB rows
 */
const DEMO_TICKETS = {
  t1: {
    id: "TK-001",
    title: "Error en módulo de pagos",
    workflow_id: WORKFLOW.id,
    current_state_id: 2,
    previous_state_id: 1,
    created_at: dt(120),
    updated_at: dt(45),
    assignee: "Ana García",
    priority: "alta",
    history: [
      { from_state_id: null, from_state_label: null, to_state_id: 1, to_state_label: "Nuevo Ticket", timestamp: dt(120) },
      { from_state_id: 1, from_state_label: "Nuevo Ticket", to_state_id: 2, to_state_label: "En Revisión", timestamp: dt(45) }
    ]
  },
  t2: {
    id: "TK-002",
    title: "Acceso denegado en dashboard",
    workflow_id: WORKFLOW.id,
    current_state_id: 1,
    previous_state_id: null,
    created_at: dt(15),
    updated_at: dt(15),
    assignee: null,
    priority: "media",
    history: [
      { from_state_id: null, from_state_label: null, to_state_id: 1, to_state_label: "Nuevo Ticket", timestamp: dt(15) }
    ]
  },
  t3: {
    id: "TK-003",
    title: "Formulario no guarda datos",
    workflow_id: WORKFLOW.id,
    current_state_id: 3,
    previous_state_id: 2,
    created_at: dt(180),
    updated_at: dt(20),
    assignee: "Luis Torres",
    priority: "alta",
    history: [
      { from_state_id: null, from_state_label: null, to_state_id: 1, to_state_label: "Nuevo Ticket", timestamp: dt(180) },
      { from_state_id: 1, from_state_label: "Nuevo Ticket", to_state_id: 2, to_state_label: "En Revisión", timestamp: dt(120) },
      { from_state_id: 2, from_state_label: "En Revisión", to_state_id: 3, to_state_label: "Incompleto", timestamp: dt(20) }
    ]
  },
  t4: {
    id: "TK-004",
    title: "Lentitud en carga de página",
    workflow_id: WORKFLOW.id,
    current_state_id: 4,
    previous_state_id: 2,
    created_at: dt(300),
    updated_at: dt(50),
    assignee: "María López",
    priority: "baja",
    history: [
      { from_state_id: null, from_state_label: null, to_state_id: 1, to_state_label: "Nuevo Ticket", timestamp: dt(300) },
      { from_state_id: 1, from_state_label: "Nuevo Ticket", to_state_id: 2, to_state_label: "En Revisión", timestamp: dt(200) },
      { from_state_id: 2, from_state_label: "En Revisión", to_state_id: 4, to_state_label: "En Espera", timestamp: dt(50) }
    ]
  },
  t5: {
    id: "TK-005",
    title: "Bug resuelto verificado",
    workflow_id: WORKFLOW.id,
    current_state_id: 5,
    previous_state_id: 2,
    created_at: dt(400),
    updated_at: dt(10),
    assignee: "Carlos Ruiz",
    priority: "media",
    history: [
      { from_state_id: null, from_state_label: null, to_state_id: 1, to_state_label: "Nuevo Ticket", timestamp: dt(400) },
      { from_state_id: 1, from_state_label: "Nuevo Ticket", to_state_id: 2, to_state_label: "En Revisión", timestamp: dt(350) },
      { from_state_id: 2, from_state_label: "En Revisión", to_state_id: 5, to_state_label: "Resuelto", timestamp: dt(10) }
    ]
  }
};

/**
 * State Machine Engine
 */
function getNextStates(currentStateId) {
  return WORKFLOW.transitions
    .filter(t => t.from === currentStateId)
    .map(t => WORKFLOW.states.find(s => s.id === t.to))
    .filter(Boolean);
}

function canTransition(fromId, toId) {
  return WORKFLOW.transitions.some(t => t.from === fromId && t.to === toId);
}

/**
 * Helper functions
 */
const groupsArrayToMap = (groupsArr) => {
  const map = {};
  groupsArr.forEach(g => { map[g.id] = g; });
  return map;
};

const statesArrayToMap = (statesArr) => {
  const map = {};
  statesArr.forEach(s => { map[s.id] = s; });
  return map;
};

const formatDate = (iso) => {
  const d = new Date(iso);
  return d.toLocaleString('es-ES', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' });
};

/**
 * Ticket Card Component
 */
const TicketCard = ({ ticket, onTransition }) => {
  const currentState = WORKFLOW.states.find(s => s.id === ticket.current_state_id);
  const group = currentState ? WORKFLOW.groups.find(g => g.id === currentState.group) : null;
  const nextStates = getNextStates(ticket.current_state_id);

  const handleTransition = (toStateId) => {
    if (!canTransition(ticket.current_state_id, toStateId)) return;
    onTransition(toStateId);
  };

  return (
    <div style={{
      background: '#181c27',
      border: '1px solid #2e3550',
      borderRadius: '16px',
      overflow: 'hidden',
      boxShadow: '0 8px 32px rgba(0,0,0,.4)',
      maxWidth: '560px',
      width: '100%'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid #2e3550',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '12px'
      }}>
        <div>
          <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace', marginBottom: '4px' }}>{ticket.id}</div>
          <div style={{ fontSize: '15px', fontWeight: 600, color: '#e2e8f0' }}>{ticket.title}</div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
            {ticket.assignee ? `Asignado: ${ticket.assignee}` : 'Sin asignar'} · Prioridad: {ticket.priority}
          </div>
        </div>
        {currentState && group && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '7px',
            padding: '6px 12px',
            borderRadius: '999px',
            fontSize: '12px',
            fontWeight: 600,
            border: `1.5px solid ${currentState.color || group.color}`,
            background: `${currentState.color || group.color}22`,
            color: currentState.color || group.color,
            whiteSpace: 'nowrap'
          }}>
            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: currentState.color || group.color }}></div>
            {currentState.label}
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: '20px' }}>
        {/* State Info */}
        <div style={{
          background: '#1e2334',
          border: '1px solid #2e3550',
          borderRadius: '10px',
          padding: '14px 16px',
          marginBottom: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '.5px', fontWeight: 600 }}>Grupo</span>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>{group?.label || '-'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '.5px', fontWeight: 600 }}>SLA Configurado</span>
            {currentState?.group === 3 ? (
              <span style={{
                fontSize: '12px',
                padding: '3px 8px',
                borderRadius: '20px',
                background: '#252b3b',
                color: '#64748b',
                border: '1px solid #2e3550'
              }}>Sin SLA</span>
            ) : (
              <span style={{
                fontSize: '12px',
                padding: '3px 8px',
                borderRadius: '20px',
                background: 'rgba(34,197,94,.12)',
                color: '#22c55e',
                border: '1px solid rgba(34,197,94,.25)'
              }}>⏱ {currentState?.sla.hours}h</span>
            )}
          </div>
        </div>

        {/* History Trail */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '.6px', textTransform: 'uppercase', color: '#64748b', marginBottom: '10px' }}>Historial</div>
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
            {ticket.history.map((h, i) => {
              const isCurrent = h.to_state_id === ticket.current_state_id;
              const state = WORKFLOW.states.find(s => s.id === h.to_state_id);
              const st = state ? WORKFLOW.groups.find(g => g.id === state.group) : null;
              return (
                <React.Fragment key={i}>
                  {i > 0 && <span style={{ fontSize: '10px', color: '#2e3550', padding: '0 2px' }}>→</span>}
                  <span style={{
                    fontSize: '11px',
                    padding: '3px 8px',
                    borderRadius: '20px',
                    background: isCurrent ? '#252b3b' : '#1e2334',
                    border: `1px solid ${isCurrent ? '#3d4668' : '#2e3550'}`,
                    color: isCurrent ? '#e2e8f0' : '#64748b',
                    fontWeight: isCurrent ? 600 : 400
                  }}>
                    {h.to_state_label}
                  </span>
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Next States */}
        <div>
          <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '.6px', textTransform: 'uppercase', color: '#64748b', marginBottom: '10px' }}>Próximos estados disponibles</div>
          {nextStates.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '20px',
              color: '#64748b',
              fontSize: '13px',
              background: '#1e2334',
              borderRadius: '10px',
              border: '1px solid #2e3550'
            }}>
              <div style={{ fontSize: '24px', marginBottom: '6px' }}>✅</div>
              Estado terminal — no hay más transiciones disponibles
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {nextStates.map(ns => {
                const nsGroup = WORKFLOW.groups.find(g => g.id === ns.group);
                const color = ns.color || nsGroup?.color;
                return (
                  <button
                    key={ns.id}
                    onClick={() => handleTransition(ns.id)}
                    disabled={false}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      borderRadius: '10px',
                      border: '1.5px solid #2e3550',
                      background: '#1e2334',
                      color: '#e2e8f0',
                      cursor: 'pointer',
                      opacity: 1,
                      textAlign: 'left',
                      transition: 'border-color .15s, background .15s, transform .1s',
                      fontFamily: 'inherit'
                    }}
                    onMouseEnter={(e) => {
                      if (!ns.group === 3) {
                        e.currentTarget.style.borderColor = '#3d4668';
                        e.currentTarget.style.background = '#252b3b';
                        e.currentTarget.style.transform = 'translateX(2px)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#2e3550';
                      e.currentTarget.style.background = '#1e2334';
                      e.currentTarget.style.transform = 'translateX(0)';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: color, flexShrink: 0 }}></div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '2px' }}>{ns.label}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{nsGroup?.label}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      {ns.group !== 3 && ns.sla.total_minutes > 0 && (
                        <span style={{
                          fontSize: '11px',
                          padding: '2px 7px',
                          borderRadius: '20px',
                          background: 'rgba(245,158,11,.1)',
                          color: '#f59e0b',
                          border: '1px solid rgba(245,158,11,.2)'
                        }}>⏱ {ns.sla.hours}h SLA</span>
                      )}
                      <span style={{ fontSize: '16px', color: '#64748b' }}>→</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* History Log */}
        {ticket.history.length > 0 && (
          <div style={{ marginTop: '20px', borderTop: '1px solid #2e3550', paddingTop: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '.6px', textTransform: 'uppercase', color: '#64748b', marginBottom: '10px' }}>Registro de cambios</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {ticket.history.slice().reverse().map((h, i) => (
                <div key={i} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '12px',
                  color: '#64748b',
                  padding: '6px 10px',
                  borderRadius: '8px',
                  background: '#1e2334',
                  border: '1px solid #2e3550'
                }}>
                  <span style={{ fontSize: '10px', fontFamily: 'monospace', color: '#64748b', flexShrink: 0 }}>{formatDate(h.timestamp)}</span>
                  <span style={{ flex: 1, color: '#94a3b8' }}>
                    {h.from_state_label ? (
                      <>{h.from_state_label} → <strong style={{ color: '#e2e8f0' }}>{h.to_state_label}</strong></>
                    ) : (
                      <>Creado en <strong style={{ color: '#e2e8f0' }}>{h.to_state_label}</strong></>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * JSON Output Panel
 */
const JsonPanel = ({ ticket }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(ticket, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      maxWidth: '560px',
      width: '100%',
      background: '#181c27',
      border: '1px solid #2e3550',
      borderRadius: '10px',
      overflow: 'hidden'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 14px',
        borderBottom: '1px solid #2e3550',
        fontSize: '11px',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '.5px',
        color: '#64748b'
      }}>
        <span>Estado actual — JSON para API</span>
        <button
          onClick={handleCopy}
          style={{
            height: '26px',
            padding: '0 10px',
            borderRadius: '6px',
            border: '1px solid #3d4668',
            background: '#252b3b',
            color: '#94a3b8',
            fontSize: '11px',
            cursor: 'pointer',
            fontFamily: 'inherit'
          }}
        >
          {copied ? '✓ Copiado' : ' Copiar'}
        </button>
      </div>
      <pre style={{
        padding: '14px',
        fontFamily: "'Fira Code', 'Cascadia Code', monospace",
        fontSize: '11px',
        lineHeight: 1.7,
        color: '#94a3b8',
        whiteSpace: 'pre',
        overflowX: 'auto',
        maxHeight: '280px',
        overflowY: 'auto',
        margin: 0
      }}>{JSON.stringify(ticket, null, 2)}</pre>
    </div>
  );
};

/**
 * Main Component
 */
const WorkflowExample2 = () => {
  const [currentTicketId, setCurrentTicketId] = useState('t1');
  const [tickets, setTickets] = useState(() => JSON.parse(JSON.stringify(DEMO_TICKETS)));

  const groupsMap = useMemo(() => groupsArrayToMap(WORKFLOW.groups), []);
  const statesMap = useMemo(() => statesArrayToMap(WORKFLOW.states), []);
  const currentTicket = tickets[currentTicketId];

  const handleTransition = useCallback((toStateId) => {
    if (!canTransition(currentTicket.current_state_id, toStateId)) return;

    const now = new Date().toISOString();
    const prevState = WORKFLOW.states.find(s => s.id === currentTicket.current_state_id);
    const nextState = WORKFLOW.states.find(s => s.id === toStateId);

    setTickets(prev => ({
      ...prev,
      [currentTicketId]: {
        ...prev[currentTicketId],
        previous_state_id: prev[currentTicketId].current_state_id,
        current_state_id: toStateId,
        updated_at: now,
        history: [
          ...prev[currentTicketId].history,
          {
            from_state_id: prev[currentTicketId].current_state_id,
            from_state_label: prevState?.label,
            to_state_id: toStateId,
            to_state_label: nextState?.label,
            timestamp: now
          }
        ]
      }
    }));
  }, [currentTicket, currentTicketId]);

  // Compute highlighted nodes for the workflow diagram
  const [selectedNodeId, setSelectedNodeId] = useState(null);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      background: '#0f1117'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 24px',
        background: '#181c27',
        borderBottom: '1px solid #2e3550',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: '#e2e8f0' }}>🎫 Ticket State Machine</h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
            Muestra el estado actual del ticket y los estados disponibles para avanzar
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ fontSize: '12px', color: '#64748b' }}>Ticket demo:</label>
          <select
            value={currentTicketId}
            onChange={(e) => setCurrentTicketId(e.target.value)}
            style={{
              height: '32px',
              background: '#1e2334',
              border: '1px solid #3d4668',
              borderRadius: '8px',
              color: '#e2e8f0',
              fontSize: '13px',
              padding: '0 12px',
              outline: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit'
            }}
          >
            <option value="t1">TK-001 — Error en módulo de pagos</option>
            <option value="t2">TK-002 — Acceso denegado en dashboard</option>
            <option value="t3">TK-003 — Formulario no guarda datos</option>
            <option value="t4">TK-004 — Lentitud en carga</option>
            <option value="t5">TK-005 — Bug resuelto</option>
          </select>
        </div>
      </div>

      {/* Main content */}
      <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr 400px', flex: 1, overflow: 'hidden' }}>
        {/* Left: Workflow diagram */}
        <div style={{ background: '#0f1117', borderRight: '1px solid #2e3550' }}>
          <WorkflowCanvas
            states={statesMap}
            transitions={WORKFLOW.transitions}
            groups={groupsMap}
            onConnect={() => {}}
            onEdgesDelete={() => {}}
            onNodeClick={(e, node) => setSelectedNodeId(Number(node.id))}
            onPaneClick={() => setSelectedNodeId(null)}
            selectedNodeId={currentTicket.current_state_id}
            highlightNodeId={currentTicket.current_state_id}
          />
        </div>

        {/* Center: Ticket Card */}
        <div style={{
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px',
          overflowY: 'auto',
          background: '#0f1117'
        }}>
          <TicketCard ticket={currentTicket} onTransition={handleTransition} />
         {/* <JsonPanel ticket={currentTicket} /> */}
        </div>

        {/* Right: State info */}
        <div style={{
          background: '#181c27',
          borderLeft: '1px solid #2e3550',
          padding: '20px',
          overflowY: 'auto'
        }}>
          <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px', color: '#64748b', marginBottom: '16px' }}>
            Información del Workflow
          </div>

          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>Estado actual del ticket</div>
            {(() => {
              const state = WORKFLOW.states.find(s => s.id === currentTicket.current_state_id);
              const group = state ? WORKFLOW.groups.find(g => g.id === state.group) : null;
              return state ? (
                <div style={{
                  padding: '12px',
                  background: '#1e2334',
                  borderRadius: '10px',
                  border: `1px solid ${state.color || group?.color || '#2e3550'}`,
                  borderLeftWidth: '4px'
                }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#e2e8f0' }}>{state.label}</div>
                  <div style={{ fontSize: '11px', color: state.color || group?.color, marginTop: '4px' }}>{group?.label}</div>
                </div>
              ) : null;
            })()}
          </div>

          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>Transiciones disponibles</div>
            {getNextStates(currentTicket.current_state_id).length === 0 ? (
              <div style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>Estado terminal</div>
            ) : (
              getNextStates(currentTicket.current_state_id).map(ns => {
                const g = WORKFLOW.groups.find(gr => gr.id === ns.group);
                return (
                  <div key={ns.id} style={{
                    padding: '8px 12px',
                    background: '#1e2334',
                    borderRadius: '8px',
                    border: '1px solid #2e3550',
                    marginBottom: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <span style={{ fontSize: '12px', color: '#e2e8f0' }}>{ns.label}</span>
                    <span style={{ fontSize: '10px', color: g?.color }}>{g?.label}</span>
                  </div>
                );
              })
            )}
          </div>

          <div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>Grupos del workflow</div>
            {WORKFLOW.groups.map(g => (
              <div key={g.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '6px'
              }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: g.color }}></div>
                <span style={{ fontSize: '12px', color: '#e2e8f0' }}>{g.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkflowExample2;