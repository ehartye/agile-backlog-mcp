import { useEffect, useState } from 'react';
import { api } from '../utils/api';
import type { Sprint } from '../types';

interface SprintSelectorProps {
  projectId: number | null;
  selectedSprintId: number | null;
  onSprintChange: (sprintId: number | null) => void;
}

export default function SprintSelector({ projectId, selectedSprintId, onSprintChange }: SprintSelectorProps) {
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!projectId) {
      setSprints([]);
      return;
    }

    const loadSprints = async () => {
      setLoading(true);
      try {
        const data = await api.sprints.list({ project_id: projectId });
        setSprints(data);
      } catch (error) {
        console.error('Failed to load sprints:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSprints();
  }, [projectId]);

  if (!projectId) {
    return null;
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'planning': return 'bg-gray-100 text-gray-700';
      case 'active': return 'bg-blue-100 text-blue-700';
      case 'completed': return 'bg-green-100 text-green-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="mb-4">
      <label htmlFor="sprint-select" className="block text-sm font-medium text-gray-700 mb-2">
        Filter by Sprint
      </label>
      <select
        id="sprint-select"
        value={selectedSprintId || ''}
        onChange={(e) => onSprintChange(e.target.value ? parseInt(e.target.value) : null)}
        disabled={loading}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="">All Stories</option>
        <option value="backlog">Backlog (No Sprint)</option>
        {sprints.map((sprint) => (
          <option key={sprint.id} value={sprint.id}>
            {sprint.name} ({sprint.status})
          </option>
        ))}
      </select>

      {selectedSprintId && sprints.length > 0 && (
        <div className="mt-2">
          {sprints
            .filter(s => s.id === selectedSprintId)
            .map(sprint => (
              <div key={sprint.id} className="text-sm text-gray-600">
                <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getStatusBadgeColor(sprint.status)}`}>
                  {sprint.status}
                </span>
                {sprint.goal && (
                  <span className="ml-2">Goal: {sprint.goal}</span>
                )}
                <span className="ml-2">
                  {new Date(sprint.start_date).toLocaleDateString()} - {new Date(sprint.end_date).toLocaleDateString()}
                </span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
