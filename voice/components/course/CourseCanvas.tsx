import { useCallback, useEffect, useMemo } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type Edge,
  BackgroundVariant,
  type NodeTypes,
  type EdgeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import PartNode from './nodes/PartNode';
import PhaseGroupNode from './nodes/PhaseGroupNode';
import AnimatedEdge from './AnimatedEdge';
import type { Course, PartStatus } from '../../lib/course-types';

// ── Layout constants ────────────────────────
const PHASE_GAP_X = 80;
const PART_GAP_Y = 96;
const PART_WIDTH = 230;
const PHASE_PADDING_X = 40;
const PHASE_PADDING_TOP = 128;
const PHASE_PADDING_BOTTOM = 44;
const PHASE_START_X = 60;
const PHASE_START_Y = 60;

// ── Grid layout: max 4 phases per row, tops aligned ─────
const PHASES_PER_ROW = 4;
const PHASE_ROW_GAP = 80;

function getDefaultPhasePosition(phaseIdx: number, maxPhaseHeight: number): { x: number; y: number } {
  const phaseWidth = PART_WIDTH + PHASE_PADDING_X * 2;
  const row = Math.floor(phaseIdx / PHASES_PER_ROW);
  const col = phaseIdx % PHASES_PER_ROW;
  return {
    x: PHASE_START_X + col * (phaseWidth + PHASE_GAP_X),
    y: PHASE_START_Y + row * (maxPhaseHeight + PHASE_ROW_GAP),
  };
}

interface CourseCanvasProps {
  course: Course;
  selectedPartId: string | null;
  onPartClick: (partId: string) => void;
  onStatusChange: (partId: string, status: PartStatus) => void;
  onResetViewReady?: (resetFn: () => void) => void;
}

function getEdgeStatus(sourceStatus: PartStatus, targetStatus: PartStatus): 'locked' | 'active' | 'completed' {
  if (sourceStatus === 'mastered' && targetStatus === 'mastered') return 'completed';
  if (sourceStatus === 'mastered' || sourceStatus === 'in_progress') return 'active';
  return 'locked';
}

// ── localStorage helpers for persisting phase positions ──
const STORAGE_PREFIX = 'course-layout-v2:';

function loadSavedPositions(courseTitle: string): Record<string, { x: number; y: number }> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_PREFIX + courseTitle) || '{}');
  } catch {
    return {};
  }
}

function savePhasePosition(courseTitle: string, nodeId: string, position: { x: number; y: number }) {
  try {
    const saved = loadSavedPositions(courseTitle);
    saved[nodeId] = position;
    localStorage.setItem(STORAGE_PREFIX + courseTitle, JSON.stringify(saved));
  } catch {
    // localStorage unavailable — silently ignore
  }
}

// Outer wrapper provides the ReactFlowProvider context
export default function CourseCanvas(props: CourseCanvasProps) {
  return (
    <ReactFlowProvider>
      <CourseCanvasInner {...props} />
    </ReactFlowProvider>
  );
}

function CourseCanvasInner({
  course,
  selectedPartId,
  onPartClick,
  onResetViewReady,
}: CourseCanvasProps) {
  // ── Build nodes and edges from course data ──
  const { initialNodes, initialEdges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const phaseWidth = PART_WIDTH + PHASE_PADDING_X * 2;
    const maxPhaseHeight = Math.max(
      ...course.phases.map(p => PHASE_PADDING_TOP + p.parts.length * PART_GAP_Y + PHASE_PADDING_BOTTOM)
    );

    // Load any previously-saved phase positions
    const savedPositions = loadSavedPositions(course.title);

    // Collect all parts in order for cross-phase edges
    const allParts: { id: string; phaseIdx: number; partIdx: number; status: PartStatus }[] = [];

    course.phases.forEach((phase, phaseIdx) => {
      const phaseHeight = PHASE_PADDING_TOP + phase.parts.length * PART_GAP_Y + PHASE_PADDING_BOTTOM;

      // Phase group node (background)
      const masteredCount = phase.parts.filter(p => p.status === 'mastered').length;

      const phaseGroupId = `phase_group_${phase.id}`;

      nodes.push({
        id: phaseGroupId,
        type: 'phaseGroup',
        position: savedPositions[phaseGroupId] || getDefaultPhasePosition(phaseIdx, maxPhaseHeight),
        data: {
          label: phase.title,
          description: phase.description,
          phaseIndex: phaseIdx,
          partCount: phase.parts.length,
          masteredCount,
        },
        style: {
          width: phaseWidth,
          height: phaseHeight,
          zIndex: 0,
        },
        draggable: true,
        selectable: false,
        connectable: false,
        dragHandle: '.phase-drag-handle',
      });

      // Part nodes inside this phase (children of the phase group)
      phase.parts.forEach((part, partIdx) => {
        const nodeId = part.id;
        nodes.push({
          id: nodeId,
          type: 'partNode',
          parentId: phaseGroupId,
          position: {
            x: PHASE_PADDING_X,
            y: PHASE_PADDING_TOP + partIdx * PART_GAP_Y,
          },
          data: {
            label: part.title,
            status: part.status,
            phaseIndex: phaseIdx,
            partIndex: partIdx,
            isSelected: selectedPartId === nodeId,
          },
          draggable: false,
          zIndex: 1,
        });

        allParts.push({ id: nodeId, phaseIdx, partIdx, status: part.status });

        // Edge from previous part (within phase)
        if (partIdx > 0) {
          const prevPart = phase.parts[partIdx - 1];
          edges.push({
            id: `e-${phase.parts[partIdx - 1].id}-${part.id}`,
            source: phase.parts[partIdx - 1].id,
            target: part.id,
            type: 'animatedEdge',
            data: { status: getEdgeStatus(prevPart.status, part.status) },
            animated: false,
          });
        }
      });

    });

    // Cross-phase edges: last part of phase N → first part of phase N+1
    for (let i = 0; i < course.phases.length - 1; i++) {
      const currentPhase = course.phases[i];
      const nextPhase = course.phases[i + 1];
      const lastPart = currentPhase.parts[currentPhase.parts.length - 1];
      const firstPart = nextPhase.parts[0];

      edges.push({
        id: `e-cross-${lastPart.id}-${firstPart.id}`,
        source: lastPart.id,
        target: firstPart.id,
        type: 'animatedEdge',
        data: { status: getEdgeStatus(lastPart.status, firstPart.status) },
        animated: false,
      });
    }

    return { initialNodes: nodes, initialEdges: edges };
  }, [course, selectedPartId]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edgesState, , onEdgesChange] = useEdgesState(initialEdges);
  const { fitView } = useReactFlow();

  const nodeTypes: NodeTypes = useMemo(() => ({
    partNode: PartNode,
    phaseGroup: PhaseGroupNode,
  }), []);

  const edgeTypes: EdgeTypes = useMemo(() => ({
    animatedEdge: AnimatedEdge,
  }), []);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (node.type === 'partNode') {
        onPartClick(node.id);
      }
    },
    [onPartClick]
  );

  // Persist phase positions to localStorage when drag ends
  const onNodeDragStop = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (node.type === 'phaseGroup') {
        savePhasePosition(course.title, node.id, node.position);
      }
    },
    [course.title]
  );

  // Reset all phases to their default computed positions (perpendicular snake layout)
  const resetLayout = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_PREFIX + course.title);
    } catch { /* ignore */ }

    const maxPhaseHeight = Math.max(
      ...course.phases.map(p => PHASE_PADDING_TOP + p.parts.length * PART_GAP_Y + PHASE_PADDING_BOTTOM)
    );

    setNodes(prev => prev.map(node => {
      if (node.type === 'phaseGroup') {
        const phaseIdx = (node.data as Record<string, unknown>).phaseIndex as number;
        return {
          ...node,
          position: getDefaultPhasePosition(phaseIdx, maxPhaseHeight),
        };
      }
      return node;
    }));

    // Re-center the view after a tick so positions settle
    setTimeout(() => fitView({ padding: 0.3, maxZoom: 1, duration: 300 }), 50);
  }, [course, setNodes, fitView]);

  // Expose resetLayout to parent via callback (refresh button resets positions + fits view)
  useEffect(() => {
    if (onResetViewReady) {
      onResetViewReady(resetLayout);
    }
  }, [resetLayout, onResetViewReady]);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edgesState}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.3, maxZoom: 1 }}
        minZoom={0.3}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
        panOnScroll
        zoomOnScroll
        panOnDrag
        nodesConnectable={false}
        elementsSelectable={false}
        style={{ background: '#faf9f7' }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={28}
          size={1}
          color="rgba(200, 180, 160, 0.3)"
        />
        <Controls
          showInteractive={false}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            border: '1px solid #ece9e4',
            borderRadius: 12,
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          }}
        />
        <MiniMap
          nodeColor={(node) => {
            if (node.type === 'phaseGroup') return 'transparent';
            const data = node.data as { status?: PartStatus };
            if (data.status === 'mastered') return '#00c864';
            if (data.status === 'in_progress') return '#ff6b00';
            if (data.status === 'not_started') return '#ddd';
            return '#eee';
          }}
          maskColor="rgba(250, 249, 247, 0.8)"
          style={{
            border: '1px solid #ece9e4',
            borderRadius: 12,
            overflow: 'hidden',
          }}
          pannable
          zoomable
        />
      </ReactFlow>
    </div>
  );
}
