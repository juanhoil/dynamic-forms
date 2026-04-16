import React, { useState, useMemo, useCallback } from 'react';
import 'reactflow/dist/style.css';

// Components
import WorkflowSidebar from './components/WorkflowSidebar';
import WorkflowCanvas from './components/WorkflowCanvas';
import WorkflowDetailPanel from './components/WorkflowDetailPanel';

/**
 * INITIAL WORKFLOW configuration
 */
const INITIAL_WORKFLOW = {
  id: 1,
  groups: [
    { id:1, label: "Inicio",  color: "#6366f1" },
    { id:2, label: "Proceso", color: "#14b8a6" },
    { id:3, label: "Fin",     color: "#f59e0b" }
  ],
  states: [
    { id: 1, label: "Nuevo Ticket",  group: "inicio",  is_initial: true,  is_terminal: false, sla: { hours: 1,  minutes: 0,  total_minutes: 60   } },
    { id: 2, label: "En Revisión",   group: "proceso", is_initial: false, is_terminal: false, sla: { hours: 8,  minutes: 0,  total_minutes: 480  } },
    { id: 3, label: "Incompleto",    group: "proceso", is_initial: false, is_terminal: false, sla: { hours: 24, minutes: 0,  total_minutes: 1440 } },
    { id: 4, label: "En Espera",     group: "proceso", is_initial: false, is_terminal: false, sla: { hours: 48, minutes: 0,  total_minutes: 2880 } },
    { id: 5, label: "Resuelto",      group: "fin",     is_initial: false, is_terminal: true,  sla: { hours: 0,  minutes: 0,  total_minutes: 0    } },
    { id: 6, label: "Cerrado",       group: "fin",     is_initial: false, is_terminal: true,  sla: { hours: 0,  minutes: 0,  total_minutes: 0    } }
  ],
  transitions: [
    { id:1, from: 1, to: 2   },
    { id:2, from: 2, to: 3   },
    { id:3, from: 2, to: 4   },
    { id:4, from: 2, to: 5   },
    { id:5, from: 3, to: 2   },
    { id:6, from: 4, to: 2   },
    { id:7, from: 4, to: 6   }
  ]
};

const WorkflowExample1 = () => {
  const [workflow, setWorkflow] = useState(INITIAL_WORKFLOW);
  const [selectedNodeId, setSelectedNodeId] = useState(null);

  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return workflow.states[selectedNodeId];
  }, [selectedNodeId, workflow.states]);

  // Handlers
  const handleAddState = ({ label, group }) => {
    const id = label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    const newState = {
      id,
      label,
      group,
      is_initial: false,
      is_terminal: group === 'fin',
      sla: { hours: 0, minutes: 0, total_minutes: 0 }
    };

    setWorkflow(prev => ({
      ...prev,
      states: { ...prev.states, [id]: newState }
    }));
    setSelectedNodeId(id);
  };

  const handleDeleteState = (id) => {
    setWorkflow(prev => {
      const { [id]: _, ...remainingStates } = prev.states;
      return {
        ...prev,
        states: remainingStates,
        transitions: prev.transitions.filter(t => t.from !== id && t.to !== id)
      };
    });
    if (selectedNodeId === id) {
      setSelectedNodeId(null);
    }
  };

  const handleUpdateSLA = (id, hours, minutes) => {
    const total_minutes = (hours * 60) + minutes;
    setWorkflow(prev => {
      const updatedStates = { ...prev.states };
      updatedStates[id] = {
        ...updatedStates[id],
        sla: { hours, minutes, total_minutes }
      };
      return { ...prev, states: updatedStates };
    });
  };

  const handleUpdateLabel = (id, label) => {
    setWorkflow(prev => {
      const updatedStates = { ...prev.states };
      updatedStates[id] = { ...updatedStates[id], label };
      return { ...prev, states: updatedStates };
    });
  };

  const handleAddTransition = (from, to) => {
    const sourceState = workflow.states[from];
    if (sourceState && sourceState.group === 'fin') {
      alert('No se pueden agregar transiciones desde un estado de tipo FIN.');
      return;
    }

    setWorkflow(prev => {
      const exists = prev.transitions.some(t => t.from === from && t.to === to);
      if (exists) return prev;
      return {
        ...prev,
        transitions: [...prev.transitions, { from, to }]
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
    const sourceState = workflow.states[params.source];
    if (sourceState && sourceState.group === 'fin') {
      return;
    }

    setWorkflow(prev => {
      const exists = prev.transitions.some(t => t.from === params.source && t.to === params.target);
      if (exists) return prev;
      return {
        ...prev,
        transitions: [...prev.transitions, { from: params.source, to: params.target }]
      };
    });
  }, [workflow.states]);

  const handleEdgesDelete = useCallback((deletedEdges) => {
    const deletedTransitionIds = new Set(deletedEdges.map(e => `${e.source}-${e.target}`));
    setWorkflow(prev => ({
      ...prev,
      transitions: prev.transitions.filter(t => !deletedTransitionIds.has(`${t.from}-${t.to}`))
    }));
  }, []);

  const handleNodeClick = useCallback((event, node) => {
    setSelectedNodeId(node.id);
  }, []);

  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Header Panel */}
      <div style={{ padding: '1rem 2rem', background: 'white', borderBottom: '1px solid #e0e0e0' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>Workflow Editor: Lifecycle de Tickets</h1>
        <p style={{ margin: '0.25rem 0 0', color: '#666', fontSize: '0.9rem' }}>
          Visualiza y gestiona el flujo de estados de los tickets.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr 300px', flex: 1, overflow: 'hidden' }}>
        <WorkflowSidebar
          groups={workflow.groups}
          states={workflow.states}
          selectedNodeId={selectedNodeId}
          onSelectNode={setSelectedNodeId}
          onAddState={handleAddState}
          onDeleteState={handleDeleteState}
        />

        <WorkflowCanvas
          states={workflow.states}
          transitions={workflow.transitions}
          groups={workflow.groups}
          onConnect={handleConnect}
          onEdgesDelete={handleEdgesDelete}
          onNodeClick={handleNodeClick}
          onPaneClick={handlePaneClick}
          selectedNodeId={selectedNodeId}
        />

        <WorkflowDetailPanel
          selectedNode={selectedNode}
          states={workflow.states}
          transitions={workflow.transitions}
          groups={workflow.groups}
          onUpdateSLA={handleUpdateSLA}
          onUpdateLabel={handleUpdateLabel}
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