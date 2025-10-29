import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { UserSelector } from './UserSelector';

interface Task {
  id?: number;
  story_id: number;
  title: string;
  description: string;
  task_type?: 'Code Change' | 'Doc Change' | 'Research' | 'QA';
  status: 'todo' | 'in_progress' | 'review' | 'done' | 'blocked';
  assigned_to?: string;
}

interface Story {
  id: number;
  title: string;
}

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  task?: Task | null;
  projectId: number;
  defaultStoryId?: number;
}

export default function TaskFormModal({ isOpen, onClose, onSave, task, projectId, defaultStoryId }: TaskFormModalProps) {
  const [formData, setFormData] = useState<Task>({
    story_id: defaultStoryId || 0,
    title: '',
    description: '',
    task_type: 'Code Change',
    status: 'todo',
    assigned_to: '',
  });
  const [stories, setStories] = useState<Story[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchStories();
    }
  }, [isOpen, projectId]);

  useEffect(() => {
    if (task) {
      setFormData(task);
    } else {
      setFormData({
        story_id: defaultStoryId || 0,
        title: '',
        description: '',
        task_type: 'Code Change',
        status: 'todo',
        assigned_to: '',
      });
    }
  }, [task, defaultStoryId]);

  const fetchStories = async () => {
    try {
      const response = await fetch(`/api/stories?project_id=${projectId}`);
      const data = await response.json();
      setStories(data);
    } catch (error) {
      console.error('Failed to fetch stories:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = task
        ? `/api/tasks/${task.id}`
        : '/api/tasks';
      const method = task ? 'PATCH' : 'POST';

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
      console.error('Failed to save task:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">{task ? 'Edit Task' : 'Create Task'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Story</label>
            <select
              value={formData.story_id}
              onChange={(e) => setFormData({ ...formData, story_id: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select a story</option>
              {stories.map((story) => (
                <option key={story.id} value={story.id}>
                  {story.title}
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Task Type</label>
            <select
              value={formData.task_type || 'Code Change'}
              onChange={(e) => setFormData({ ...formData, task_type: e.target.value as Task['task_type'] })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="Code Change">Code Change</option>
              <option value="Doc Change">Doc Change</option>
              <option value="Research">Research</option>
              <option value="QA">QA</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as Task['status'] })}
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
              <UserSelector
                value={formData.assigned_to || null}
                onChange={(userId) => setFormData({ ...formData, assigned_to: userId || undefined })}
                label="Assigned To"
                placeholder="Optional"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              {task ? 'Update' : 'Create'}
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
