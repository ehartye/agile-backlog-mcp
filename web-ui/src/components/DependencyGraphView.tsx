import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { api } from '../utils/api';
import type { DependencyGraph, EntityStatus } from '../types';

const statusColors: Record<EntityStatus, string> = {
  todo: '#d1d5db',
  in_progress: '#3b82f6',
  review: '#eab308',
  done: '#22c55e',
  blocked: '#ef4444',
};

interface DependencyGraphViewProps {
  projectId?: number | null;
}

export default function DependencyGraphView({ projectId: projectIdProp }: DependencyGraphViewProps) {
  const { projectId: projectIdParam } = useParams<{ projectId: string }>();
  const projectId = projectIdParam ? parseInt(projectIdParam) : projectIdProp;

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (projectId) {
      loadGraph();
    }
  }, [projectId]);

  async function loadGraph() {
    try {
      setLoading(true);
      const graph: DependencyGraph = await api.graph.dependencies(projectId || undefined);

      // Convert to React Flow format
      const flowNodes: Node[] = graph.nodes.map((node) => ({
        id: node.id.toString(),
        data: {
          label: (
            <div className="px-3 py-2">
              <div className="font-semibold text-sm mb-1">{node.title}</div>
              <div className="text-xs opacity-75">
                #{node.id} • {node.priority}
                {node.points && ` • ${node.points}pts`}
              </div>
            </div>
          ),
        },
        position: { x: 0, y: 0 }, // Will be auto-laid out
        style: {
          background: statusColors[node.status],
          color: node.status === 'todo' ? '#1f2937' : '#ffffff',
          border: '2px solid #374151',
          borderRadius: '8px',
          minWidth: isMobile ? '150px' : '200px',
          maxWidth: isMobile ? '200px' : '300px',
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      }));

      const flowEdges: Edge[] = graph.edges.map((edge, index) => ({
        id: `${edge.source}-${edge.target}-${index}`,
        source: edge.source.toString(),
        target: edge.target.toString(),
        label: edge.type === 'blocks' ? 'blocks' : 'blocked by',
        type: 'smoothstep',
        animated: true,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#6b7280',
        },
        style: {
          stroke: '#6b7280',
          strokeWidth: 2,
        },
      }));

      // Simple auto-layout using Dagre-like algorithm
      const layouted = autoLayout(flowNodes, flowEdges, isMobile);

      setNodes(layouted.nodes);
      setEdges(layouted.edges);
    } catch (error) {
      console.error('Failed to load dependency graph:', error);
    } finally {
      setLoading(false);
    }
  }

  if (!projectId) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-gray-500">Please select a project to view dependencies</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-gray-500">Loading dependency graph...</div>
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-50">
        <div className="text-gray-500 text-lg mb-2">No stories with dependencies found</div>
        <div className="text-sm text-gray-400">
          Add dependencies between stories to visualize them here
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="bg-white shadow-sm border-b px-4 md:px-6 py-4">
        <h2 className="text-xl md:text-2xl font-bold text-gray-800">Dependency Graph (DAG)</h2>
        <p className="text-sm text-gray-500 mt-1">
          {nodes.length} stories • {edges.length} dependencies
        </p>
      </div>

      <div className="flex-1 bg-gray-50">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          fitView
          attributionPosition="bottom-left"
        >
          <Background />
          <Controls />
          <MiniMap
            nodeColor={(node) => node.style?.background as string}
            maskColor="rgba(0, 0, 0, 0.1)"
          />
        </ReactFlow>
      </div>
    </div>
  );
}

// Simple auto-layout algorithm
function autoLayout(nodes: Node[], edges: Edge[], isMobile: boolean): { nodes: Node[]; edges: Edge[] } {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const inDegree = new Map<string, number>();
  const outEdges = new Map<string, string[]>();

  // Calculate in-degrees and out-edges
  nodes.forEach(node => {
    inDegree.set(node.id, 0);
    outEdges.set(node.id, []);
  });

  edges.forEach(edge => {
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    outEdges.get(edge.source)?.push(edge.target);
  });

  // Topological sort to determine levels
  const levels = new Map<string, number>();
  const queue: string[] = [];

  nodes.forEach(node => {
    if (inDegree.get(node.id) === 0) {
      queue.push(node.id);
      levels.set(node.id, 0);
    }
  });

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentLevel = levels.get(current) || 0;

    outEdges.get(current)?.forEach(target => {
      const newDegree = (inDegree.get(target) || 0) - 1;
      inDegree.set(target, newDegree);

      const targetLevel = Math.max(levels.get(target) || 0, currentLevel + 1);
      levels.set(target, targetLevel);

      if (newDegree === 0) {
        queue.push(target);
      }
    });
  }

  // Assign positions based on levels
  const levelGroups = new Map<number, string[]>();
  levels.forEach((level, nodeId) => {
    if (!levelGroups.has(level)) {
      levelGroups.set(level, []);
    }
    levelGroups.get(level)?.push(nodeId);
  });

  const X_SPACING = isMobile ? 200 : 300;
  const Y_SPACING = isMobile ? 100 : 150;

  levelGroups.forEach((nodeIds, level) => {
    const startY = -(nodeIds.length - 1) * Y_SPACING / 2;
    nodeIds.forEach((nodeId, index) => {
      const node = nodeMap.get(nodeId);
      if (node) {
        node.position = {
          x: level * X_SPACING,
          y: startY + index * Y_SPACING,
        };
      }
    });
  });

  return { nodes: Array.from(nodeMap.values()), edges };
}
