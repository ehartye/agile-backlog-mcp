import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { api } from '../utils/api';
import type { Sprint, SprintSnapshot, SprintCapacity } from '../types';

export default function BurndownChart() {
  const { projectId, sprintId } = useParams<{ projectId: string; sprintId: string }>();
  const navigate = useNavigate();
  const [sprint, setSprint] = useState<Sprint | null>(null);
  const [snapshots, setSnapshots] = useState<SprintSnapshot[]>([]);
  const [idealBurndown, setIdealBurndown] = useState<number[]>([]);
  const [capacity, setCapacity] = useState<SprintCapacity | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sprintId) return;

    const loadBurndown = async () => {
      setLoading(true);
      try {
        const data = await api.sprints.getBurndown(parseInt(sprintId));
        setSprint(data.sprint);
        setSnapshots(data.snapshots);
        setIdealBurndown(data.ideal_burndown);
        setCapacity(data.capacity);
      } catch (error) {
        console.error('Failed to load burndown:', error);
      } finally {
        setLoading(false);
      }
    };

    loadBurndown();
  }, [sprintId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Loading burndown chart...</div>
      </div>
    );
  }

  if (!sprint) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Sprint not found</div>
      </div>
    );
  }

  // Chart dimensions
  const width = 800;
  const height = 400;
  const padding = { top: 40, right: 40, bottom: 60, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Calculate scales
  const maxPoints = Math.max(...idealBurndown, ...snapshots.map(s => s.remaining_points), 0);
  const days = idealBurndown.length - 1;

  const xScale = (day: number) => padding.left + (day / days) * chartWidth;
  const yScale = (points: number) => padding.top + chartHeight - (points / maxPoints) * chartHeight;

  // Generate ideal line path
  const idealPath = idealBurndown
    .map((points, day) => `${day === 0 ? 'M' : 'L'} ${xScale(day)} ${yScale(points)}`)
    .join(' ');

  // Generate actual line path from snapshots
  const actualPath = snapshots.length > 0
    ? snapshots
        .map((snapshot, index) => {
          const day = Math.floor(
            (new Date(snapshot.snapshot_date).getTime() - new Date(sprint.start_date).getTime()) /
            (1000 * 60 * 60 * 24)
          );
          return `${index === 0 ? 'M' : 'L'} ${xScale(day)} ${yScale(snapshot.remaining_points)}`;
        })
        .join(' ')
    : '';

  // Generate grid lines
  const yGridLines = 5;
  const gridYValues = Array.from({ length: yGridLines + 1 }, (_, i) => (maxPoints / yGridLines) * i);

  const startDate = new Date(sprint.start_date);
  const endDate = new Date(sprint.end_date);

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(projectId ? `/project/${projectId}/sprint/${sprintId}` : '/')}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Burndown Chart</h1>
              <p className="text-gray-600 text-sm mt-1">{sprint.name}</p>
            </div>
          </div>
        </div>

        {/* Sprint Info */}
        <div className="flex items-center gap-6 text-sm text-gray-600 mt-4">
          <div>
            <span className="font-medium">Duration:</span>{' '}
            {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}
          </div>
          {capacity && (
            <>
              <div>
                <span className="font-medium">Committed:</span> {capacity.committed} pts
              </div>
              <div>
                <span className="font-medium">Completed:</span> {capacity.completed} pts
              </div>
              <div>
                <span className="font-medium">Remaining:</span> {capacity.remaining} pts
              </div>
            </>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 overflow-auto p-6">
        <div className="bg-white rounded-lg shadow-sm p-6 inline-block min-w-full">
          <svg width={width} height={height} className="mx-auto">
            {/* Grid lines */}
            {gridYValues.map((value, i) => (
              <g key={i}>
                <line
                  x1={padding.left}
                  y1={yScale(value)}
                  x2={width - padding.right}
                  y2={yScale(value)}
                  stroke="#e5e7eb"
                  strokeWidth="1"
                />
                <text
                  x={padding.left - 10}
                  y={yScale(value)}
                  textAnchor="end"
                  alignmentBaseline="middle"
                  className="text-xs fill-gray-500"
                >
                  {Math.round(value)}
                </text>
              </g>
            ))}

            {/* X-axis labels (days) */}
            {Array.from({ length: days + 1 }, (_, i) => i).map((day) => (
              <text
                key={day}
                x={xScale(day)}
                y={height - padding.bottom + 20}
                textAnchor="middle"
                className="text-xs fill-gray-500"
              >
                Day {day}
              </text>
            ))}

            {/* Axes */}
            <line
              x1={padding.left}
              y1={padding.top}
              x2={padding.left}
              y2={height - padding.bottom}
              stroke="#374151"
              strokeWidth="2"
            />
            <line
              x1={padding.left}
              y1={height - padding.bottom}
              x2={width - padding.right}
              y2={height - padding.bottom}
              stroke="#374151"
              strokeWidth="2"
            />

            {/* Ideal burndown line */}
            <path
              d={idealPath}
              fill="none"
              stroke="#9ca3af"
              strokeWidth="2"
              strokeDasharray="5,5"
            />

            {/* Actual burndown line */}
            {actualPath && (
              <path
                d={actualPath}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="3"
              />
            )}

            {/* Actual burndown points */}
            {snapshots.map((snapshot) => {
              const day = Math.floor(
                (new Date(snapshot.snapshot_date).getTime() - new Date(sprint.start_date).getTime()) /
                (1000 * 60 * 60 * 24)
              );
              return (
                <circle
                  key={snapshot.id}
                  cx={xScale(day)}
                  cy={yScale(snapshot.remaining_points)}
                  r="4"
                  fill="#3b82f6"
                />
              );
            })}

            {/* Y-axis label */}
            <text
              x={padding.left - 45}
              y={padding.top + chartHeight / 2}
              textAnchor="middle"
              transform={`rotate(-90, ${padding.left - 45}, ${padding.top + chartHeight / 2})`}
              className="text-sm font-medium fill-gray-700"
            >
              Story Points Remaining
            </text>

            {/* X-axis label */}
            <text
              x={padding.left + chartWidth / 2}
              y={height - 10}
              textAnchor="middle"
              className="text-sm font-medium fill-gray-700"
            >
              Sprint Days
            </text>
          </svg>

          {/* Legend */}
          <div className="flex justify-center gap-6 mt-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 bg-gray-400 border-t-2 border-dashed"></div>
              <span className="text-sm text-gray-600">Ideal Burndown</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 bg-blue-500"></div>
              <span className="text-sm text-gray-600">Actual Burndown</span>
            </div>
          </div>

          {snapshots.length === 0 && (
            <div className="text-center mt-6 text-gray-500">
              No snapshots recorded yet. Snapshots are created when you start the sprint and can be manually added daily.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
