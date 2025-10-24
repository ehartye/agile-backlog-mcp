import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { api } from '../utils/api';
import type { Sprint, SprintStatus } from '../types';

interface SprintFormModalProps {
  projectId: number;
  sprint?: Sprint | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SprintFormModal({ projectId, sprint, isOpen, onClose, onSuccess }: SprintFormModalProps) {
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [capacityPoints, setCapacityPoints] = useState<number | ''>('');
  const [status, setStatus] = useState<SprintStatus>('planning');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sprint) {
      setName(sprint.name);
      setGoal(sprint.goal || '');
      setStartDate(sprint.start_date);
      setEndDate(sprint.end_date);
      setCapacityPoints(sprint.capacity_points || '');
      setStatus(sprint.status);
    } else {
      // Default to next Monday for start date
      const nextMonday = new Date();
      nextMonday.setDate(nextMonday.getDate() + ((1 + 7 - nextMonday.getDay()) % 7));
      const twoWeeksLater = new Date(nextMonday);
      twoWeeksLater.setDate(twoWeeksLater.getDate() + 13);

      setName('');
      setGoal('');
      setStartDate(nextMonday.toISOString().split('T')[0]);
      setEndDate(twoWeeksLater.toISOString().split('T')[0]);
      setCapacityPoints('');
      setStatus('planning');
    }
    setError(null);
  }, [sprint, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const data = {
        project_id: projectId,
        name,
        goal: goal || null,
        start_date: startDate,
        end_date: endDate,
        capacity_points: capacityPoints ? Number(capacityPoints) : null,
        status,
      };

      if (sprint) {
        await api.sprints.update(sprint.id, data);
      } else {
        await api.sprints.create(data);
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">
            {sprint ? 'Edit Sprint' : 'Create Sprint'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={loading}
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Sprint Name *
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
              placeholder="e.g., Sprint 23, Q1 Iteration 1"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="goal" className="block text-sm font-medium text-gray-700 mb-1">
              Sprint Goal
            </label>
            <textarea
              id="goal"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={2}
              placeholder="What is the goal for this sprint?"
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 mb-1">
                Start Date *
              </label>
              <input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 mb-1">
                End Date *
              </label>
              <input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="capacity" className="block text-sm font-medium text-gray-700 mb-1">
                Capacity (Story Points)
              </label>
              <input
                id="capacity"
                type="number"
                min="0"
                value={capacityPoints}
                onChange={(e) => setCapacityPoints(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Team capacity"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as SprintStatus)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={loading}
              >
                <option value="planning">Planning</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Saving...' : sprint ? 'Update Sprint' : 'Create Sprint'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
