import React, { useState, useCallback, useMemo } from 'react';
import ReactFlow, { Background, Controls, MarkerType } from 'reactflow';

const COLUMN_X = {
  inicio:  80,
  proceso: 350,
  fin:     620,
};

const ROW_GAP = 120;
const ROW_START_Y = 80;

const stateToNode = (state, groups) => {
  const group = groups[state.group];
  return {
    id: state.id,
    data: {
      label: state.label,
      sla: state.sla.total_minutes,
      group: group.label
    },
    position: { x: 0, y: 0 },
    sourcePosition: 'right',
    targetPosition: 'left',
    style: {
      border: state.is_terminal ? `2px solid ${group.color}` : `2px solid ${group.color}`,
      textAlign: 'center',
      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
    },
  };
};

const transitionToEdge = (t) => ({
  id: `e-${t.from}-${t.to}`,
  source: t.from,
  target: t.to,
  animated: true,
  style: { stroke: "#555" },
  markerEnd: {
    type: MarkerType.ArrowClosed,
    color: '#555',
  },
});

const WorkflowCanvas = ({ states, transitions, groups, onConnect, onEdgesDelete, onNodeClick, onPaneClick, selectedNodeId }) => {
  const [nodePositions, setNodePositions] = useState({});

  const nodes = useMemo(() => {
    // Group states by their group to assign column-based positions
    const grouped = { inicio: [], proceso: [], fin: [] };
    Object.values(states).forEach(s => {
      if (grouped[s.group]) {
        grouped[s.group].push(s);
      }
    });

    // Build a map of default positions per state id
    const defaultPositions = {};
    Object.keys(grouped).forEach(groupId => {
      const groupStates = grouped[groupId];
      groupStates.forEach((state, i) => {
        defaultPositions[state.id] = {
          x: COLUMN_X[groupId] || 300,
          y: ROW_START_Y + i * ROW_GAP,
        };
      });
    });

    return Object.values(states).map((state) => {
      const node = stateToNode(state, groups);
      const savedPos = nodePositions[state.id];
      node.position = savedPos || defaultPositions[state.id] || { x: 300, y: 200 };
      return node;
    });
  }, [states, groups, nodePositions]);

  const edges = useMemo(() => {
    return transitions.map(t => transitionToEdge(t));
  }, [transitions]);

  const onNodesChange = useCallback((changes) => {
    changes.forEach(change => {
      if (change.type === 'position' && change.position) {
        setNodePositions(prev => ({
          ...prev,
          [change.id]: { ...change.position }
        }));
      }
    });
  }, []);

  const onEdgesChange = useCallback(() => {}, []);

  const handleConnect = useCallback((params) => {
    onConnect(params);
  }, [onConnect]);

  const handleEdgesDeleteLocal = useCallback((deletedEdges) => {
    onEdgesDelete(deletedEdges);
  }, [onEdgesDelete]);

  return (
    <div style={{ position: 'relative', background: '#fff' }}>
      <div style={{ position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)', zIndex: 5, fontSize: '11px', color: '#94a3b8', pointerEvents: 'none', background: 'rgba(255,255,255,0.8)', padding: '4px 12px', borderRadius: '20px' }}>
        Arrastre nodos para organizar · Use scroll para zoom
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onEdgesDelete={handleEdgesDeleteLocal}
        onConnect={handleConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        fitView
      >
        <Background color="#cbd5e1" gap={20} />
        <Controls />
      </ReactFlow>
    </div>
  );
};

export default WorkflowCanvas;