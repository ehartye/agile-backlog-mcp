import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { UserSelector } from './UserSelector';

interface Bug {
  id?: number;
  story_id: number | null;
  title: string;
  description: string;
  severity: 'critical' | 'major' | 'minor' | 'trivial';
  error_message?: string | null;
  status: 'todo' | 'in_progress' | 'review' | 'done' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'critical';
  points?: number;
  assigned_to?: string;
}

interface Story {
  id: number;
  title: string;
}

interface BugFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  bug?: Bug | null;
  projectId: number;
}

export default function BugFormModal({ isOpen, onClose, onSave, bug, projectId }: BugFormModalProps) {
  const [formData, setFormData] = useState<Bug>({
    story_id: null,
    title: '',
    description: '',
    severity: 'major',
    error_message: '',
    status: 'todo',
    priority: 'medium',
    points: undefined,
    assigned_to: undefined,
  });
  const [stories, setStories] = useState<Story[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchStories();
    }
  }, [isOpen, projectId]);

  useEffect(() => {
    if (bug) {
      setFormData(bug);
    } else {
      resetForm();
    }
  }, [bug]);

  const resetForm = () => {
    setFormData({
      story_id: null,
      title: '',
      description: '',
      severity: 'major',
      error_message: '',
      status: 'todo',
      priority: 'medium',
      points: undefined,
      assigned_to: undefined,
    });
  };

  const fetchStories = async () => {
    try {
      const response = await fetch(`/api/stories?project_id=${projectId}`);
      const data = await response.json();
      setStories(data);
    } catch (error) {
      console.error('Failed to fetch stories:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent, saveAndNew: boolean = false) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const url = bug
        ? `/api/bugs/${bug.id}`
        : '/api/bugs';
      const method = bug ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, project_id: projectId }),
      });

      if (response.ok) {
        onSave();

        if (saveAndNew) {
          // Reset form and keep modal open
          resetForm();
          // Focus on title field
          setTimeout(() => {
            const titleInput = document.querySelector('input[name="title"]') as HTMLInputElement;
            titleInput?.focus();
          }, 100);
        } else {
          // Close modal
          onClose();
        }
      }
    } catch (error) {
      console.error('Failed to save bug:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const severityColors = {
    critical: 'border-red-500 bg-red-50',
    major: 'border-orange-500 bg-orange-50',
    minor: 'border-yellow-500 bg-yellow-50',
    trivial: 'border-gray-500 bg-gray-50',
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
          <h2 className="text-xl font-semibold">{bug ? 'Edit Bug' : 'Create Bug'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={(e) => handleSubmit(e, false)} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Story (Optional)</label>
            <select
              value={formData.story_id || ''}
              onChange={(e) => setFormData({ ...formData, story_id: e.target.value ? parseInt(e.target.value) : null })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
            >
              <option value="">No Story (Standalone Bug)</option>
              {stories.map((story) => (
                <option key={story.id} value={story.id}>
                  {story.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
              rows={4}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Severity *</label>
            <div className="grid grid-cols-4 gap-2">
              {(['critical', 'major', 'minor', 'trivial'] as const).map((severity) => (
                <button
                  key={severity}
                  type="button"
                  onClick={() => setFormData({ ...formData, severity })}
                  className={`px-3 py-2 border-2 rounded-lg font-medium capitalize transition-all ${
                    formData.severity === severity
                      ? severityColors[severity] + ' border-opacity-100'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {severity}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Error Message (Optional)</label>
            <textarea
              value={formData.error_message || ''}
              onChange={(e) => setFormData({ ...formData, error_message: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 font-mono text-sm"
              rows={3}
              placeholder="Paste error message or stack trace here..."
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as Bug['status'] })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
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
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as Bug['priority'] })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
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
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
                min="0"
              />
            </div>
          </div>

          <div>
            <UserSelector
              value={formData.assigned_to || null}
              onChange={(userId) => setFormData({ ...formData, assigned_to: userId || undefined })}
              label="Assigned To"
              placeholder="Optional"
            />
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-50"
            >
              {bug ? 'Update' : 'Save'}
            </button>
            {!bug && (
              <button
                type="button"
                onClick={(e) => handleSubmit(e as any, true)}
                disabled={isSaving}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium disabled:opacity-50"
              >
                Save & New
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
