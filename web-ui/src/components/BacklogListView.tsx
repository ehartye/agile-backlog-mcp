import { useEffect, useState } from 'react';
import { Plus, Edit, Trash, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '../utils/api';
import type { Epic, Story, EntityStatus, Priority } from '../types';
import EpicFormModal from './EpicFormModal';
import StoryFormModal from './StoryFormModal';
import RelationshipManager from './RelationshipManager';
import NotesPanel from './NotesPanel';

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

interface BacklogListViewProps {
  projectId: number | null;
}

export default function BacklogListView({ projectId }: BacklogListViewProps) {
  const [epics, setEpics] = useState<Epic[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    epic_id: '',
    status: '',
    priority: '',
  });
  const [epicModalOpen, setEpicModalOpen] = useState(false);
  const [storyModalOpen, setStoryModalOpen] = useState(false);
  const [editingEpic, setEditingEpic] = useState<Epic | null>(null);
  const [editingStory, setEditingStory] = useState<Story | null>(null);
  const [expandedStoryId, setExpandedStoryId] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, [filters, projectId]);

  async function loadData() {
    try {
      setLoading(true);
      const filterParams: any = Object.fromEntries(
        Object.entries(filters).filter(([_, v]) => v !== '')
      );
      if (projectId) {
        filterParams.project_id = projectId;
      }

      const [epicsData, storiesData] = await Promise.all([
        api.epics.list(projectId ? { project_id: projectId } : {}),
        api.stories.list(filterParams),
      ]);
      setEpics(epicsData);
      setStories(storiesData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleDeleteStory = async (id: number) => {
    if (!confirm('Are you sure you want to delete this story?')) return;
    try {
      await api.stories.delete(id);
      loadData();
    } catch (error) {
      console.error('Failed to delete story:', error);
    }
  };

  const handleEditStory = (story: Story) => {
    setEditingStory(story);
    setStoryModalOpen(true);
  };

  const handleNewEpic = () => {
    setEditingEpic(null);
    setEpicModalOpen(true);
  };

  const handleNewStory = () => {
    setEditingStory(null);
    setStoryModalOpen(true);
  };

  const getEpicName = (epicId: number | null) => {
    if (!epicId) return 'No Epic';
    return epics.find(e => e.id === epicId)?.title || `Epic #${epicId}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!projectId) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Please select a project to view backlog</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm border-b px-4 md:px-6 py-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-800">Backlog</h2>
            <p className="text-sm text-gray-500 mt-1">
              {stories.length} stories across {epics.length} epics
            </p>
          </div>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <button
              onClick={handleNewEpic}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">New</span> Epic
            </button>
            <button
              onClick={handleNewStory}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">New</span> Story
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b px-4 md:px-6 py-3 flex flex-wrap gap-2 md:gap-4">
        <select
          value={filters.epic_id}
          onChange={(e) => setFilters({ ...filters, epic_id: e.target.value })}
          className="px-3 py-2 border rounded-lg text-sm"
        >
          <option value="">All Epics</option>
          {epics.map(epic => (
            <option key={epic.id} value={epic.id}>{epic.title}</option>
          ))}
        </select>

        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="px-3 py-2 border rounded-lg text-sm"
        >
          <option value="">All Statuses</option>
          <option value="todo">Todo</option>
          <option value="in_progress">In Progress</option>
          <option value="review">Review</option>
          <option value="done">Done</option>
          <option value="blocked">Blocked</option>
        </select>

        <select
          value={filters.priority}
          onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
          className="px-3 py-2 border rounded-lg text-sm"
        >
          <option value="">All Priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>

        <button
          onClick={() => setFilters({ epic_id: '', status: '', priority: '' })}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
        >
          Clear Filters
        </button>
      </div>

      {/* Story List */}
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="max-w-6xl mx-auto space-y-3">
          {stories.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No stories found
            </div>
          ) : (
            stories.map(story => (
              <div
                key={story.id}
                className="bg-white rounded-lg border p-3 md:p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h3 className="text-base md:text-lg font-semibold text-gray-800 break-words">
                        {story.title}
                      </h3>
                      <span className={`px-2 py-1 rounded text-xs whitespace-nowrap ${statusColors[story.status]}`}>
                        {story.status.replace('_', ' ')}
                      </span>
                      <span className={`text-xs md:text-sm whitespace-nowrap ${priorityColors[story.priority]}`}>
                        {story.priority.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3 break-words">{story.description}</p>
                    <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs text-gray-500">
                      <span>#{story.id}</span>
                      <span className="break-all">{getEpicName(story.epic_id)}</span>
                      {story.points && <span>{story.points} points</span>}
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-1 sm:gap-2 shrink-0">
                    <button
                      onClick={() => setExpandedStoryId(expandedStoryId === story.id ? null : story.id)}
                      className="p-2 text-gray-600 hover:bg-gray-50 rounded"
                      title={expandedStoryId === story.id ? "Hide details" : "View details"}
                    >
                      {expandedStoryId === story.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    <button
                      onClick={() => handleEditStory(story)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                      title="Edit story"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteStory(story.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded"
                      title="Delete story"
                    >
                      <Trash size={16} />
                    </button>
                  </div>
                </div>

                {/* Expandable Details Section */}
                {expandedStoryId === story.id && (
                  <div className="mt-4 space-y-4 border-t pt-4">
                    <RelationshipManager
                      entityType="story"
                      entityId={story.id}
                      projectId={projectId}
                    />
                    <NotesPanel
                      entityType="story"
                      entityId={story.id}
                      projectId={projectId}
                    />
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modals */}
      <EpicFormModal
        isOpen={epicModalOpen}
        onClose={() => setEpicModalOpen(false)}
        onSave={loadData}
        epic={editingEpic}
        projectId={projectId}
      />

      <StoryFormModal
        isOpen={storyModalOpen}
        onClose={() => setStoryModalOpen(false)}
        onSave={loadData}
        story={editingStory}
        projectId={projectId}
      />
    </div>
  );
}
