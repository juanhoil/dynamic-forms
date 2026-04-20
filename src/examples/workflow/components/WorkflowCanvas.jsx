import React, { useState, useCallback, useMemo } from 'react';
import ReactFlow, { Background, Controls, MarkerType } from 'reactflow';

const COLUMN_X = {
  1:  80,
  2: 350,
  3: 620,
};

const ROW_GAP = 120;
const ROW_START_Y = 80;

const stateToNode = (state, groups, isHighlighted = false) => {
  const group = groups[state.group];
  const color = state.color || (group ? group.color : '#ccc');
  const baseStyle = {
    border: `2px solid ${color}`,
    borderRadius: '8px',
    padding: '10px 16px',
    background: '#fff',
    textAlign: 'center',
    boxShadow: isHighlighted
      ? `0 0 0 4px ${color}66, 0 4px 6px -1px rgb(0 0 0 / 0.3)`
      : '0 4px 6px -1px rgb(0 0 0 / 0.1)',
  };
  if (isHighlighted) {
    baseStyle.zIndex = 10;
  }
  return {
    id: String(state.id),
    data: {
      label: state.label,
      sla: state.sla.total_minutes,
      group: group ? group.label : ''
    },
    position: { x: 0, y: 0 },
    sourcePosition: 'right',
    targetPosition: 'left',
    style: baseStyle,
  };
};

const transitionToEdge = (t) => ({
  id: `e-${t.from}-${t.to}`,
  source: String(t.from),
  target: String(t.to),
  animated: true,
  style: { stroke: "#555" },
  markerEnd: {
    type: MarkerType.ArrowClosed,
    color: '#555',
  },
});

const WorkflowCanvas = ({ states, transitions, groups, onConnect, onEdgesDelete, onNodeClick, onPaneClick, selectedNodeId, highlightNodeId }) => {
  const [nodePositions, setNodePositions] = useState({});

  const nodes = useMemo(() => {
    const statesList = Object.values(states);
    // Group states by their group id for column positioning
    const grouped = {};
    statesList.forEach(s => {
      if (!grouped[s.group]) grouped[s.group] = [];
      grouped[s.group].push(s);
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

    return statesList.map((state) => {
      const isHighlighted = highlightNodeId !== undefined && state.id === highlightNodeId;
      const node = stateToNode(state, groups, isHighlighted);
      const savedPos = nodePositions[state.id];
      node.position = savedPos || defaultPositions[state.id] || { x: 300, y: 200 };
      return node;
    });
  }, [states, groups, nodePositions, highlightNodeId]);

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
    <div style={{ position: 'relative', background: '#fff', minHeight: 0 }}>
      <div style={{ position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)', zIndex: 5, fontSize: '11px', color: '#94a3b8', pointerEvents: 'none', background: 'rgba(255,255,255,0.8)', padding: '4px 12px', borderRadius: '20px' }}>
        Arrastre nodos para organizar · Use scroll para zoom
      </div>
      <div style={{ position: 'absolute', inset: 0 }}>
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
    </div>
  );
};

export default WorkflowCanvas;