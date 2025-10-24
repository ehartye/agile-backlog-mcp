import { useEffect, useState, useRef } from 'react';
import * as d3 from 'd3';
import { api } from '../utils/api';
import type { HierarchyNode, EntityStatus } from '../types';

const statusColors: Record<EntityStatus, string> = {
  todo: '#d1d5db',
  in_progress: '#3b82f6',
  review: '#eab308',
  done: '#22c55e',
  blocked: '#ef4444',
};

interface HierarchyTreeViewProps {
  projectId: number | null;
}

export default function HierarchyTreeView({ projectId }: HierarchyTreeViewProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [data, setData] = useState<HierarchyNode[]>([]);
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
      loadHierarchy();
    }
  }, [projectId]);

  useEffect(() => {
    if (data.length > 0 && svgRef.current) {
      renderTree();
    }
  }, [data, isMobile]);

  async function loadHierarchy() {
    try {
      setLoading(true);
      const hierarchy = await api.graph.hierarchy(projectId || undefined);
      setData(hierarchy);
    } catch (error) {
      console.error('Failed to load hierarchy:', error);
    } finally {
      setLoading(false);
    }
  }

  function renderTree() {
    if (!svgRef.current || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    const g = svg.append('g');

    // Create root hierarchy with all epics as children
    const root = d3.hierarchy<HierarchyNode>({
      id: 0,
      type: 'epic' as const,
      title: 'Root',
      status: 'todo' as const,
      children: data,
    });

    const horizontalMargin = isMobile ? 100 : 300;
    const verticalMargin = isMobile ? 50 : 100;
    const offsetX = isMobile ? 50 : 150;
    const offsetY = isMobile ? 30 : 50;

    const treeLayout = d3.tree<HierarchyNode>()
      .size([height - verticalMargin, width - horizontalMargin])
      .separation((a, b) => (a.parent === b.parent ? 1 : 1.2));

    const treeData = treeLayout(root);

    // Add zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Center the view
    g.attr('transform', `translate(${offsetX}, ${offsetY})`);

    // Draw links
    g.selectAll('.link')
      .data(treeData.links().filter(d => d.source.data.id !== 0))
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('fill', 'none')
      .attr('stroke', '#9ca3af')
      .attr('stroke-width', 2)
      .attr('d', d3.linkHorizontal<any, any>()
        .x(d => d.y)
        .y(d => d.x)
      );

    // Draw nodes
    const nodes = g.selectAll('.node')
      .data(treeData.descendants().filter(d => d.data.id !== 0))
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(${d.y},${d.x})`);

    // Node circles
    nodes.append('circle')
      .attr('r', d => {
        if (d.data.type === 'epic') return 12;
        if (d.data.type === 'story') return 10;
        return 8;
      })
      .attr('fill', d => statusColors[d.data.status])
      .attr('stroke', '#374151')
      .attr('stroke-width', 2);

    // Node labels
    nodes.append('text')
      .attr('dy', '.35em')
      .attr('x', d => d.children ? -15 : 15)
      .attr('text-anchor', d => d.children ? 'end' : 'start')
      .style('font-size', d => {
        if (isMobile) {
          if (d.data.type === 'epic') return '12px';
          if (d.data.type === 'story') return '11px';
          return '10px';
        }
        if (d.data.type === 'epic') return '14px';
        if (d.data.type === 'story') return '12px';
        return '11px';
      })
      .style('font-weight', d => d.data.type === 'epic' ? 'bold' : 'normal')
      .text(d => {
        const maxLength = isMobile
          ? (d.data.type === 'epic' ? 20 : 25)
          : (d.data.type === 'epic' ? 30 : 40);
        return d.data.title.length > maxLength
          ? d.data.title.substring(0, maxLength) + '...'
          : d.data.title;
      });

    // Type badges
    nodes.append('text')
      .attr('dy', '1.8em')
      .attr('x', d => d.children ? -15 : 15)
      .attr('text-anchor', d => d.children ? 'end' : 'start')
      .style('font-size', '10px')
      .style('fill', '#6b7280')
      .text(d => `[${d.data.type}]`);
  }

  if (!projectId) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-gray-500">Please select a project to view hierarchy</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-gray-500">Loading hierarchy tree...</div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-50">
        <div className="text-gray-500 text-lg mb-2">No data to display</div>
        <div className="text-sm text-gray-400">
          Create epics and stories to visualize the hierarchy
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="bg-white shadow-sm border-b px-4 md:px-6 py-4">
        <h2 className="text-xl md:text-2xl font-bold text-gray-800">Hierarchy Tree</h2>
        <p className="text-sm text-gray-500 mt-1">
          Epic → Story → Task hierarchy view
        </p>
        <div className="mt-2 text-xs text-gray-600">
          Scroll to zoom • Drag to pan
        </div>
      </div>

      <div className="flex-1 bg-gray-50">
        <svg
          ref={svgRef}
          className="w-full h-full"
          style={{ cursor: 'grab' }}
        />
      </div>
    </div>
  );
}
