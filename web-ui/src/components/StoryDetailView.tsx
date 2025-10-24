import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Edit, Trash, Calendar, Plus, X } from 'lucide-react';
import { api } from '../utils/api';
import type { Story, Task, EntityStatus, Priority, Sprint } from '../types';
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
  const { projectId: projectIdParam, storyId } = useParams<{ projectId: string; storyId: string }>();
  const navigate = useNavigate();
  const [story, setStory] = useState<Story | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentSprint, setCurrentSprint] = useState<Sprint | null>(null);
  const [availableSprints, setAvailableSprints] = useState<Sprint[]>([]);
  const [showAddToSprint, setShowAddToSprint] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const projectId = projectIdParam ? parseInt(projectIdParam) : null;

  useEffect(() => {
    loadStory();
  }, [storyId]);

  async function loadStory() {
    if (!storyId || !projectId) return;

    try {
      setLoading(true);
      const [storyData, sprintsData] = await Promise.all([
        api.stories.get(parseInt(storyId)),
        api.sprints.list({ project_id: projectId }),
      ]);

      setStory(storyData.story);
      setTasks(storyData.tasks || []);

      // Find which sprint this story is in by checking all sprints
      let foundSprint: Sprint | null = null;
      for (const sprint of sprintsData) {
        const sprintDetails = await api.sprints.get(sprint.id);
        if (sprintDetails.stories.some(s => s.id === parseInt(storyId))) {
          foundSprint = sprint;
          break;
        }
      }
      setCurrentSprint(foundSprint);

      // Available sprints are planning or active sprints (not the current one)
      setAvailableSprints(
        sprintsData.filter(s =>
          (s.status === 'planning' || s.status === 'active') &&
          s.id !== foundSprint?.id
        )
      );
    } catch (error) {
      console.error('Failed to load story:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleAddToSprint = async (sprintId: number) => {
    if (!story) return;
    try {
      await api.sprints.addStory(sprintId, story.id);
      setShowAddToSprint(false);
      loadStory(); // Reload to update sprint info
    } catch (error) {
      console.error('Failed to add story to sprint:', error);
      alert('Failed to add story to sprint: ' + (error as Error).message);
    }
  };

  const handleRemoveFromSprint = async () => {
    if (!story || !currentSprint) return;
    if (!confirm(`Remove this story from ${currentSprint.name}?`)) return;

    try {
      await api.sprints.removeStory(currentSprint.id, story.id);
      loadStory(); // Reload to update sprint info
    } catch (error) {
      console.error('Failed to remove story from sprint:', error);
      alert('Failed to remove story from sprint: ' + (error as Error).message);
    }
  };

  const handleDelete = async () => {
    if (!story || !confirm('Are you sure you want to delete this story?')) return;

    try {
      await api.stories.delete(story.id);
      navigate(projectId ? `/project/${projectId}` : '/');
    } catch (error) {
      console.error('Failed to delete story:', error);
    }
  };

  const handleBack = () => {
    navigate(projectId ? `/project/${projectId}` : '/');
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

          {/* Sprint Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Calendar size={20} />
                Sprint
              </h2>
              {!currentSprint && !showAddToSprint && availableSprints.length > 0 && (
                <button
                  onClick={() => setShowAddToSprint(true)}
                  className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  <Plus size={16} />
                  Add to Sprint
                </button>
              )}
            </div>

            {currentSprint ? (
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded border-l-4 border-blue-500">
                <div>
                  <Link
                    to={`/project/${projectId}/sprint/${currentSprint.id}`}
                    className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {currentSprint.name}
                  </Link>
                  <div className="text-sm text-gray-600 mt-1">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      currentSprint.status === 'planning' ? 'bg-gray-100 text-gray-700' :
                      currentSprint.status === 'active' ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {currentSprint.status}
                    </span>
                    <span className="ml-2">
                      {new Date(currentSprint.start_date).toLocaleDateString()} - {new Date(currentSprint.end_date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleRemoveFromSprint}
                  className="p-2 text-red-600 hover:bg-red-50 rounded"
                  title="Remove from sprint"
                >
                  <X size={20} />
                </button>
              </div>
            ) : showAddToSprint ? (
              <div className="space-y-2">
                {availableSprints.map(sprint => (
                  <button
                    key={sprint.id}
                    onClick={() => handleAddToSprint(sprint.id)}
                    className="w-full text-left p-3 border rounded hover:bg-gray-50"
                  >
                    <div className="font-medium">{sprint.name}</div>
                    <div className="text-sm text-gray-600">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        sprint.status === 'planning' ? 'bg-gray-100 text-gray-700' :
                        sprint.status === 'active' ? 'bg-green-100 text-green-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {sprint.status}
                      </span>
                      <span className="ml-2">
                        {new Date(sprint.start_date).toLocaleDateString()} - {new Date(sprint.end_date).toLocaleDateString()}
                      </span>
                    </div>
                  </button>
                ))}
                <button
                  onClick={() => setShowAddToSprint(false)}
                  className="w-full px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded border"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">
                {availableSprints.length === 0
                  ? 'No active or planning sprints available. Create a sprint to add this story.'
                  : 'Not in any sprint. Click "Add to Sprint" to assign this story to a sprint.'}
              </p>
            )}
          </div>

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
