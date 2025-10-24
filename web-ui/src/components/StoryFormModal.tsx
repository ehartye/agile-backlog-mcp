import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface Story {
  id?: number;
  epic_id: number | null;
  title: string;
  description: string;
  acceptance_criteria?: string | null;
  status: 'todo' | 'in_progress' | 'review' | 'done' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'critical';
  points?: number;
}

interface Epic {
  id: number;
  title: string;
}

interface StoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  story?: Story | null;
  projectId: number;
}

export default function StoryFormModal({ isOpen, onClose, onSave, story, projectId }: StoryFormModalProps) {
  const [formData, setFormData] = useState<Story>({
    epic_id: null,
    title: '',
    description: '',
    acceptance_criteria: '',
    status: 'todo',
    priority: 'medium',
    points: undefined,
  });
  const [epics, setEpics] = useState<Epic[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchEpics();
    }
  }, [isOpen, projectId]);

  useEffect(() => {
    if (story) {
      setFormData(story);
    } else {
      setFormData({
        epic_id: null,
        title: '',
        description: '',
        acceptance_criteria: '',
        status: 'todo',
        priority: 'medium',
        points: undefined,
      });
    }
  }, [story]);

  const fetchEpics = async () => {
    try {
      const response = await fetch(`/api/epics?project_id=${projectId}`);
      const data = await response.json();
      setEpics(data);
    } catch (error) {
      console.error('Failed to fetch epics:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = story
        ? `/api/stories/${story.id}`
        : '/api/stories';
      const method = story ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        onSave();
        onClose();
      }
    } catch (error) {
      console.error('Failed to save story:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">{story ? 'Edit Story' : 'Create Story'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Epic (Optional)</label>
            <select
              value={formData.epic_id || ''}
              onChange={(e) => setFormData({ ...formData, epic_id: e.target.value ? parseInt(e.target.value) : null })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">No Epic</option>
              {epics.map((epic) => (
                <option key={epic.id} value={epic.id}>
                  {epic.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={4}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Acceptance Criteria (Optional)</label>
            <textarea
              value={formData.acceptance_criteria || ''}
              onChange={(e) => setFormData({ ...formData, acceptance_criteria: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Enter acceptance criteria..."
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as Story['status'] })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="review">Review</option>
                <option value="done">Done</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as Story['priority'] })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Points</label>
              <input
                type="number"
                value={formData.points || ''}
                onChange={(e) => setFormData({ ...formData, points: e.target.value ? parseInt(e.target.value) : undefined })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                min="0"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              {story ? 'Update' : 'Create'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
