import React, { useState, useMemo, useCallback } from 'react';
import 'reactflow/dist/style.css';

// Components
import WorkflowSidebar from './components/WorkflowSidebar';
import WorkflowCanvas from './components/WorkflowCanvas';
import WorkflowDetailPanel from './components/WorkflowDetailPanel';

/**
 * INITIAL WORKFLOW configuration
 */
const INITIAL_WORKFLOW = { //Tema: ConfigFlowJob
  id: 1,
  groups: [ //etapa
    { id: 1, label: "Inicio",  color: "#6366f1" },
    { id: 2, label: "Proceso", color: "#14b8a6" },
    { id: 3, label: "Fin",     color: "#f59e0b" }
  ],
  states: [//estatus
    { id: 1, label: "Nuevo Ticket",  group: 1, color: "#6366f1", sla: { hours: 1,  minutes: 0,  total_minutes: 60   } },
    { id: 2, label: "En Revisión",   group: 2, color: "#14b8a6", sla: { hours: 8,  minutes: 0,  total_minutes: 480  } },
    { id: 3, label: "Incompleto",    group: 2, color: "#14b8a6", sla: { hours: 24, minutes: 0,  total_minutes: 1440 } },
    { id: 4, label: "En Espera",     group: 2, color: "#14b8a6", sla: { hours: 48, minutes: 0,  total_minutes: 2880 } },
    { id: 5, label: "Resuelto",      group: 3, color: "#0af545", sla: { hours: 0,  minutes: 0,  total_minutes: 0    } },
    { id: 6, label: "Cerrado",       group: 3, color: "#f50a39", sla: { hours: 0,  minutes: 0,  total_minutes: 0    } }
  ],
  transitions: [//transiciones
    { id: 1, from: 1, to: 2 },
    { id: 2, from: 2, to: 3 },
    { id: 3, from: 2, to: 4 },
    { id: 4, from: 3, to: 2 },
    { id: 5, from: 4, to: 5 },
    { id: 6, from: 4, to: 6 }
  ]
};

/**
 * Convert arrays to lookup objects for components that expect { id: obj } format
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

const WorkflowExample1 = () => {
  const [workflow, setWorkflow] = useState(INITIAL_WORKFLOW);
  const [selectedNodeId, setSelectedNodeId] = useState(null);

  // Lookup maps for components
  const groupsMap = useMemo(() => groupsArrayToMap(workflow.groups), [workflow.groups]);
  const statesMap = useMemo(() => statesArrayToMap(workflow.states), [workflow.states]);

  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return statesMap[selectedNodeId] || null;
  }, [selectedNodeId, statesMap]);

  // Handlers
  const handleAddState = ({ label, group }) => {
    const maxId = workflow.states.reduce((max, s) => Math.max(max, s.id), 0);
    const newId = maxId + 1;
    const newState = {
      id: newId,
      label,
      group: Number(group),
      is_initial: false,
      is_terminal: Number(group) === 3,
      sla: { hours: 0, minutes: 0, total_minutes: 0 }
    };

    setWorkflow(prev => ({
      ...prev,
      states: [...prev.states, newState]
    }));
    setSelectedNodeId(newId);
  };

  const handleDeleteState = (id) => {
    setWorkflow(prev => ({
      ...prev,
      states: prev.states.filter(s => s.id !== id),
      transitions: prev.transitions.filter(t => t.from !== id && t.to !== id)
    }));
    if (selectedNodeId === id) {
      setSelectedNodeId(null);
    }
  };

  const handleUpdateSLA = (id, hours, minutes) => {
    const total_minutes = (hours * 60) + minutes;
    setWorkflow(prev => ({
      ...prev,
      states: prev.states.map(s =>
        s.id === id ? { ...s, sla: { hours, minutes, total_minutes } } : s
      )
    }));
  };

  const handleUpdateLabel = (id, label) => {
    setWorkflow(prev => ({
      ...prev,
      states: prev.states.map(s =>
        s.id === id ? { ...s, label } : s
      )
    }));
  };

  const handleUpdateColor = (id, color) => {
    setWorkflow(prev => ({
      ...prev,
      states: prev.states.map(s =>
        s.id === id ? { ...s, color } : s
      )
    }));
  };

  const handleAddTransition = (from, to) => {
    const sourceState = statesMap[from];
    if (sourceState && sourceState.group === 3) {
      alert('No se pueden agregar transiciones desde un estado de tipo FIN.');
      return;
    }

    setWorkflow(prev => {
      const exists = prev.transitions.some(t => t.from === from && t.to === to);
      if (exists) return prev;
      const maxId = prev.transitions.reduce((max, t) => Math.max(max, t.id), 0);
      return {
        ...prev,
        transitions: [...prev.transitions, { id: maxId + 1, from, to }]
      };
    });
  };

  const handleRemoveTransition = (from, to) => {
    setWorkflow(prev => ({
      ...prev,
      transitions: prev.transitions.filter(t => !(t.from === from && t.to === to))
    }));
  };

  const handleConnect = useCallback((params) => {
    const sourceId = Number(params.source);
    const targetId = Number(params.target);
    const sourceState = statesMap[sourceId];
    if (sourceState && sourceState.group === 3) {
      return;
    }

    setWorkflow(prev => {
      const exists = prev.transitions.some(t => t.from === sourceId && t.to === targetId);
      if (exists) return prev;
      const maxId = prev.transitions.reduce((max, t) => Math.max(max, t.id), 0);
      return {
        ...prev,
        transitions: [...prev.transitions, { id: maxId + 1, from: sourceId, to: targetId }]
      };
    });
  }, [statesMap]);

  const handleEdgesDelete = useCallback((deletedEdges) => {
    setWorkflow(prev => {
      const deletedSet = new Set(deletedEdges.map(e => `${e.source}-${e.target}`));
      return {
        ...prev,
        transitions: prev.transitions.filter(t => !deletedSet.has(`${t.from}-${t.to}`))
      };
    });
  }, []);

  const handleNodeClick = useCallback((event, node) => {
    setSelectedNodeId(Number(node.id));
  }, []);

  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Header Panel */}
      <div style={{ padding: '1rem 2rem', background: 'white', borderBottom: '1px solid #e0e0e0' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>Workflow Editor: Amparar Cobertura</h1>
        <p style={{ margin: '0.25rem 0 0', color: '#666', fontSize: '0.9rem' }}>
          Visualiza y gestiona el flujo de estados de los tickets.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr 300px', gridTemplateRows: '1fr', flex: 1, overflow: 'hidden' }}>
        <WorkflowSidebar
          groups={groupsMap}
          states={statesMap}
          selectedNodeId={selectedNodeId}
          onSelectNode={setSelectedNodeId}
          onAddState={handleAddState}
          onDeleteState={handleDeleteState}
        />

        <WorkflowCanvas
          states={statesMap}
          transitions={workflow.transitions}
          groups={groupsMap}
          onConnect={handleConnect}
          onEdgesDelete={handleEdgesDelete}
          onNodeClick={handleNodeClick}
          onPaneClick={handlePaneClick}
          selectedNodeId={selectedNodeId}
        />

        <WorkflowDetailPanel
          selectedNode={selectedNode}
          states={statesMap}
          transitions={workflow.transitions}
          groups={groupsMap}
          onUpdateSLA={handleUpdateSLA}
          onUpdateLabel={handleUpdateLabel}
          onUpdateColor={handleUpdateColor}
          onAddState={handleAddState}
          onDeleteState={handleDeleteState}
          onAddTransition={handleAddTransition}
          onRemoveTransition={handleRemoveTransition}
        />
      </div>
    </div>
  );
};

export default WorkflowExample1;