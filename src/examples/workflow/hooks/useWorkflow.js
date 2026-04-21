import { useState, useMemo, useCallback } from 'react';

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

export function useWorkflow(initialWorkflow) {
  const [workflow, setWorkflow] = useState(initialWorkflow);
  const [selectedNodeId, setSelectedNodeId] = useState(null);

  // Lookup maps
  const groupsMap = useMemo(() => groupsArrayToMap(workflow.groups), [workflow.groups]);
  const statesMap = useMemo(() => statesArrayToMap(workflow.states), [workflow.states]);

  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return statesMap[selectedNodeId] || null;
  }, [selectedNodeId, statesMap]);

  // Handlers
  const handleAddState = useCallback(({ label, group }) => {
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
  }, [workflow.states]);

  const handleDeleteState = useCallback((id) => {
    setWorkflow(prev => ({
      ...prev,
      states: prev.states.filter(s => s.id !== id),
      transitions: prev.transitions.filter(t => t.from !== id && t.to !== id)
    }));
    setSelectedNodeId(current => current === id ? null : current);
  }, []);

  const handleUpdateSLA = useCallback((id, hours, minutes) => {
    const total_minutes = (hours * 60) + minutes;
    setWorkflow(prev => ({
      ...prev,
      states: prev.states.map(s =>
        s.id === id ? { ...s, sla: { hours, minutes, total_minutes } } : s
      )
    }));
  }, []);

  const handleUpdateLabel = useCallback((id, label) => {
    setWorkflow(prev => ({
      ...prev,
      states: prev.states.map(s =>
        s.id === id ? { ...s, label } : s
      )
    }));
  }, []);

  const handleUpdateColor = useCallback((id, color) => {
    setWorkflow(prev => ({
      ...prev,
      states: prev.states.map(s =>
        s.id === id ? { ...s, color } : s
      )
    }));
  }, []);

  const handleAddTransition = useCallback((from, to) => {
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
  }, [statesMap]);

  const handleRemoveTransition = useCallback((from, to) => {
    setWorkflow(prev => ({
      ...prev,
      transitions: prev.transitions.filter(t => !(t.from === from && t.to === to))
    }));
  }, []);

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

  return {
    // Datos
    workflow,
    selectedNodeId,
    selectedNode,
    groupsMap,
    statesMap,
    // Setters directos
    setSelectedNodeId,
    // Handlers
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
  };
}
