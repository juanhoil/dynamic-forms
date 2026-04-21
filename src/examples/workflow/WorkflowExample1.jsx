import React from 'react';
import 'reactflow/dist/style.css';

import { useWorkflow } from './hooks';
import WorkflowSidebar from './components/WorkflowSidebar';
import WorkflowCanvas from './components/WorkflowCanvas';
import WorkflowDetailPanel from './components/WorkflowDetailPanel';

/**
 * INITIAL WORKFLOW configuration
 */
const INITIAL_WORKFLOW = {
  id: 1,
  groups: [
    { id: 1, label: "Inicio", color: "#6366f1" },
    { id: 2, label: "Proceso", color: "#14b8a6" },
    { id: 3, label: "Fin", color: "#f59e0b" }
  ],
  states: [
    { id: 1, label: "Nuevo Ticket", group: 1, color: "#6366f1", sla: { hours: 1, minutes: 0, total_minutes: 60 } },
    { id: 2, label: "En Revisión", group: 2, color: "#14b8a6", sla: { hours: 8, minutes: 0, total_minutes: 480 } },
    { id: 3, label: "Incompleto", group: 2, color: "#14b8a6", sla: { hours: 24, minutes: 0, total_minutes: 1440 } },
    { id: 4, label: "En Espera", group: 2, color: "#14b8a6", sla: { hours: 48, minutes: 0, total_minutes: 2880 } },
    { id: 5, label: "Resuelto", group: 3, color: "#0af545", sla: { hours: 0, minutes: 0, total_minutes: 0 } },
    { id: 6, label: "Cerrado", group: 3, color: "#f50a39", sla: { hours: 0, minutes: 0, total_minutes: 0 } }
  ],
  transitions: [
    { id: 1, from: 1, to: 2 },
    { id: 2, from: 2, to: 3 },
    { id: 3, from: 2, to: 4 },
    { id: 4, from: 3, to: 2 },
    { id: 5, from: 4, to: 5 },
    { id: 6, from: 4, to: 6 }
  ]
};

const WorkflowExample1 = () => {
  const {
    workflow,
    selectedNodeId,
    selectedNode,
    groupsMap,
    statesMap,
    setSelectedNodeId,
    handleAddState,
    handleDeleteState,
    handleUpdateSLA,
    handleUpdateLabel,
    handleUpdateColor,
    handleAddTransition,
    handleRemoveTransition,
    handleConnect,
    handleEdgesDelete,
    handleNodeClick,
    handlePaneClick
  } = useWorkflow(INITIAL_WORKFLOW);

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
