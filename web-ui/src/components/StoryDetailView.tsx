import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Edit, Trash } from 'lucide-react';
import { api } from '../utils/api';
import type { Story, Task, EntityStatus, Priority } from '../types';
import RelationshipManager from './RelationshipManager';
import NotesPanel from './NotesPanel';
import StoryFormModal from './StoryFormModal';

const statusColors: Record<EntityStatus, string> = {
  todo: 'bg-gray-200 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-700',
  review: 'bg-yellow-100 text-yellow-700',
  done: 'bg-green-100 text-green-700',
  blocked: 'bg-red-100 text-red-700',
};

const priorityColors: Record<Priority, string> = {
  low: 'text-gray-500',
  medium: 'text-blue-600',
  high: 'text-orange-600',
  critical: 'text-red-600 font-bold',
};

export default function StoryDetailView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [story, setStory] = useState<Story | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);

  // Get project from URL params
  const projectParam = searchParams.get('project');
  const projectId = projectParam ? parseInt(projectParam) : null;

  useEffect(() => {
    loadStory();
  }, [id]);

  async function loadStory() {
    if (!id) return;

    try {
      setLoading(true);
      const data = await api.stories.get(parseInt(id));
      setStory(data.story);
      setTasks(data.tasks || []);
    } catch (error) {
      console.error('Failed to load story:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleDelete = async () => {
    if (!story || !confirm('Are you sure you want to delete this story?')) return;

    try {
      await api.stories.delete(story.id);
      navigate(`/${projectId ? `?project=${projectId}` : ''}`);
    } catch (error) {
      console.error('Failed to delete story:', error);
    }
  };

  const handleBack = () => {
    navigate(`/${projectId ? `?project=${projectId}` : ''}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!story) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="text-gray-500 mb-4">Story not found</div>
        <button
          onClick={handleBack}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Back to Backlog
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b px-4 md:px-6 py-4">
        <div className="max-w-6xl mx-auto">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4"
          >
            <ArrowLeft size={20} />
            Back to Backlog
          </button>

          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800">{story.title}</h1>
                <span className={`px-3 py-1 rounded text-sm ${statusColors[story.status]}`}>
                  {story.status.replace('_', ' ')}
                </span>
                <span className={`text-sm ${priorityColors[story.priority]}`}>
                  {story.priority.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span>Story #{story.id}</span>
                {story.epic_id && <span>Epic #{story.epic_id}</span>}
                {story.points && <span>{story.points} points</span>}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setEditModalOpen(true)}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                title="Edit story"
              >
                <Edit size={20} />
              </button>
              <button
                onClick={handleDelete}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                title="Delete story"
              >
                <Trash size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Description */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-3">Description</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{story.description}</p>
          </div>

          {/* Acceptance Criteria */}
          {story.acceptance_criteria && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-3">Acceptance Criteria</h2>
              <div className="p-4 bg-green-50 rounded border-l-4 border-green-500">
                <p className="text-gray-700 whitespace-pre-wrap">{story.acceptance_criteria}</p>
              </div>
            </div>
          )}

          {/* Tasks */}
          {tasks.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-3">Tasks ({tasks.length})</h2>
              <div className="space-y-2">
                {tasks.map(task => (
                  <div key={task.id} className="p-3 border rounded flex items-center justify-between">
                    <div>
                      <div className="font-medium">{task.title}</div>
                      <div className="text-sm text-gray-500">{task.description}</div>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs ${statusColors[task.status]}`}>
                      {task.status.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Relationships */}
          <RelationshipManager
            entityType="story"
            entityId={story.id}
            projectId={story.project_id}
          />

          {/* Notes */}
          <NotesPanel
            entityType="story"
            entityId={story.id}
            projectId={story.project_id}
          />
        </div>
      </div>

      {/* Edit Modal */}
      <StoryFormModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSave={loadStory}
        story={story}
        projectId={story.project_id}
      />
    </div>
  );
}
