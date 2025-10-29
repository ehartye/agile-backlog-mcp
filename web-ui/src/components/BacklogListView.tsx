import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash, ChevronDown, ChevronUp, Calendar, PlayCircle, Bug as BugIcon } from 'lucide-react';
import { api } from '../utils/api';
import type { Epic, Story, Bug, EntityStatus, Priority, BugSeverity, Sprint, User } from '../types';
import EpicFormModal from './EpicFormModal';
import StoryFormModal from './StoryFormModal';
import BugFormModal from './BugFormModal';
import RelationshipManager from './RelationshipManager';
import NotesPanel from './NotesPanel';
import SprintFormModal from './SprintFormModal';

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

const severityColors: Record<BugSeverity, string> = {
  trivial: 'bg-gray-100 text-gray-700 border-gray-300',
  minor: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  major: 'bg-orange-100 text-orange-700 border-orange-300',
  critical: 'bg-red-100 text-red-700 border-red-300',
};

interface BacklogListViewProps {
  projectId?: number | null;
}

export default function BacklogListView({ projectId: projectIdProp }: BacklogListViewProps) {
  const { projectId: projectIdParam } = useParams<{ projectId: string }>();
  const projectId = projectIdParam ? parseInt(projectIdParam) : projectIdProp;
  const navigate = useNavigate();

  const [epics, setEpics] = useState<Epic[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    epic_id: '',
    status: '',
    priority: '',
    sprint_id: '',
    severity: '',
  });
  const [epicModalOpen, setEpicModalOpen] = useState(false);
  const [storyModalOpen, setStoryModalOpen] = useState(false);
  const [bugModalOpen, setBugModalOpen] = useState(false);
  const [sprintModalOpen, setSprintModalOpen] = useState(false);
  const [editingEpic, setEditingEpic] = useState<Epic | null>(null);
  const [editingStory, setEditingStory] = useState<Story | null>(null);
  const [editingBug, setEditingBug] = useState<Bug | null>(null);
  const [expandedStoryId, setExpandedStoryId] = useState<number | null>(null);
  const [expandedBugId, setExpandedBugId] = useState<number | null>(null);

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

      const [epicsData, storiesData, bugsData, sprintsData, usersData] = await Promise.all([
        api.epics.list(projectId ? { project_id: projectId } : {}),
        api.stories.list(filterParams),
        api.bugs.list(filterParams),
        projectId ? api.sprints.list({ project_id: projectId }) : Promise.resolve([]),
        api.users.list(),
      ]);
      setEpics(epicsData);
      setStories(storiesData);
      setBugs(bugsData);
      setSprints(sprintsData);
      setUsers(usersData);
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

  const handleDeleteBug = async (id: number) => {
    if (!confirm('Are you sure you want to delete this bug?')) return;
    try {
      await api.bugs.delete(id);
      loadData();
    } catch (error) {
      console.error('Failed to delete bug:', error);
    }
  };

  const handleEditBug = (bug: Bug) => {
    setEditingBug(bug);
    setBugModalOpen(true);
  };

  const handleNewEpic = () => {
    setEditingEpic(null);
    setEpicModalOpen(true);
  };

  const handleNewStory = () => {
    setEditingStory(null);
    setStoryModalOpen(true);
  };

  const handleNewBug = () => {
    setEditingBug(null);
    setBugModalOpen(true);
  };

  const handleNewSprint = () => {
    setSprintModalOpen(true);
  };

  const handleViewActiveSprint = () => {
    const activeSprint = sprints.find(s => s.status === 'active');
    if (activeSprint && projectId) {
      navigate(`/project/${projectId}/sprint/${activeSprint.id}`);
    }
  };

  const getEpicName = (epicId: number | null) => {
    if (!epicId) return 'No Epic';
    return epics.find(e => e.id === epicId)?.title || `Epic #${epicId}`;
  };

  const getUserDisplay = (userId: string | null | undefined) => {
    if (!userId) return null;
    const user = users.find(u => u.user_id === userId);
    return user ? `${user.display_name}` : userId;
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
              {stories.length} stories • {bugs.length} bugs • {epics.length} epics • {sprints.length} sprints
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
            <button
              onClick={handleNewBug}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
            >
              <BugIcon size={16} />
              <span className="hidden sm:inline">Quick</span> Bug
            </button>
            <button
              onClick={handleNewSprint}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
            >
              <Calendar size={16} />
              <span className="hidden sm:inline">New</span> Sprint
            </button>
            {sprints.some(s => s.status === 'active') && (
              <button
                onClick={handleViewActiveSprint}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm"
              >
                <PlayCircle size={16} />
                Active Sprint
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b px-4 md:px-6 py-3 flex flex-wrap gap-2 md:gap-4">
        <select
          value={filters.sprint_id}
          onChange={(e) => setFilters({ ...filters, sprint_id: e.target.value })}
          className="px-3 py-2 border rounded-lg text-sm"
        >
          <option value="">All Stories</option>
          <option value="backlog">Backlog (No Sprint)</option>
          {sprints.map(sprint => (
            <option key={sprint.id} value={sprint.id}>
              {sprint.name} ({sprint.status})
            </option>
          ))}
        </select>

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

        <select
          value={filters.severity}
          onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
          className="px-3 py-2 border rounded-lg text-sm"
        >
          <option value="">All Severities</option>
          <option value="critical">Critical</option>
          <option value="major">Major</option>
          <option value="minor">Minor</option>
          <option value="trivial">Trivial</option>
        </select>

        <button
          onClick={() => setFilters({ epic_id: '', status: '', priority: '', sprint_id: '', severity: '' })}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
        >
          Clear Filters
        </button>
      </div>

      {/* Stories and Bugs List */}
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="max-w-6xl mx-auto space-y-3">
          {stories.length === 0 && bugs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No stories or bugs found
            </div>
          ) : (
            <>
              {/* Bugs Section */}
              {bugs.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <BugIcon size={20} className="text-red-600" />
                    Bugs ({bugs.length})
                  </h3>
                  {bugs.map(bug => (
                    <div
                      key={bug.id}
                      className="bg-white rounded-lg border-2 border-red-200 p-3 md:p-4 hover:shadow-md transition-shadow mb-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <BugIcon size={16} className="text-red-600 shrink-0" />
                            <span className="text-base md:text-lg font-semibold text-gray-800 break-words">
                              {bug.title}
                            </span>
                            <span className={`px-2 py-1 rounded text-xs whitespace-nowrap border ${severityColors[bug.severity]}`}>
                              {bug.severity.toUpperCase()}
                            </span>
                            <span className={`px-2 py-1 rounded text-xs whitespace-nowrap ${statusColors[bug.status]}`}>
                              {bug.status.replace('_', ' ')}
                            </span>
                            <span className={`text-xs md:text-sm whitespace-nowrap ${priorityColors[bug.priority]}`}>
                              {bug.priority.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2 break-words">{bug.description}</p>
                          {bug.error_message && (
                            <div className="mb-3 p-3 bg-red-50 rounded border-l-4 border-red-500">
                              <div className="text-xs font-semibold text-red-700 mb-1">Error Message:</div>
                              <pre className="text-xs text-red-800 whitespace-pre-wrap font-mono overflow-x-auto">
                                {bug.error_message}
                              </pre>
                            </div>
                          )}
                          <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs text-gray-500">
                            <span>#{bug.id}</span>
                            {bug.story_id && <span>Story #{bug.story_id}</span>}
                            {bug.points && <span>{bug.points} points</span>}
                            {bug.assigned_to && <span className="text-blue-600">👤 {getUserDisplay(bug.assigned_to)}</span>}
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-1 sm:gap-2 shrink-0">
                          <button
                            onClick={() => handleEditBug(bug)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                            title="Edit bug"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteBug(bug.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded"
                            title="Delete bug"
                          >
                            <Trash size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Expand/Collapse Button */}
                      <button
                        onClick={() => setExpandedBugId(expandedBugId === bug.id ? null : bug.id)}
                        className="w-full mt-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded border border-gray-200 flex items-center justify-center gap-2"
                      >
                        {expandedBugId === bug.id ? (
                          <>
                            <ChevronUp size={16} />
                            Hide Details
                          </>
                        ) : (
                          <>
                            <ChevronDown size={16} />
                            View Details
                          </>
                        )}
                      </button>

                      {/* Expandable Details Section */}
                      {expandedBugId === bug.id && (
                        <div className="mt-4 space-y-4 border-t pt-4">
                          <RelationshipManager
                            entityType="bug"
                            entityId={bug.id}
                            projectId={projectId}
                          />
                          <NotesPanel
                            entityType="bug"
                            entityId={bug.id}
                            projectId={projectId}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Stories Section */}
              {stories.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">
                    Stories ({stories.length})
                  </h3>
                  {stories.map(story => (
              <div
                key={story.id}
                className="bg-white rounded-lg border p-3 md:p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <Link
                        to={projectId ? `/project/${projectId}/story/${story.id}` : '#'}
                        className="text-base md:text-lg font-semibold text-gray-800 hover:text-blue-600 break-words"
                      >
                        {story.title}
                      </Link>
                      <span className={`px-2 py-1 rounded text-xs whitespace-nowrap ${statusColors[story.status]}`}>
                        {story.status.replace('_', ' ')}
                      </span>
                      <span className={`text-xs md:text-sm whitespace-nowrap ${priorityColors[story.priority]}`}>
                        {story.priority.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3 break-words">{story.description}</p>
                    {story.acceptance_criteria && (
                      <div className="mb-3 p-3 bg-gray-50 rounded border-l-4 border-green-500">
                        <div className="text-xs font-semibold text-gray-700 mb-1">Acceptance Criteria:</div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{story.acceptance_criteria}</p>
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs text-gray-500">
                      <span>#{story.id}</span>
                      <span className="break-all">{getEpicName(story.epic_id)}</span>
                      {story.points && <span>{story.points} points</span>}
                      {story.assigned_to && <span className="text-blue-600">👤 {getUserDisplay(story.assigned_to)}</span>}
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-1 sm:gap-2 shrink-0">
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

                {/* Expand/Collapse Button */}
                <button
                  onClick={() => setExpandedStoryId(expandedStoryId === story.id ? null : story.id)}
                  className="w-full mt-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded border border-gray-200 flex items-center justify-center gap-2"
                >
                  {expandedStoryId === story.id ? (
                    <>
                      <ChevronUp size={16} />
                      Hide Details
                    </>
                  ) : (
                    <>
                      <ChevronDown size={16} />
                      View Details
                    </>
                  )}
                </button>

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
            ))}
          </div>
        )}
      </>
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

      <BugFormModal
        isOpen={bugModalOpen}
        onClose={() => {
          setBugModalOpen(false);
          setEditingBug(null);
        }}
        onSave={loadData}
        bug={editingBug}
        projectId={projectId}
      />

      {projectId && (
        <SprintFormModal
          isOpen={sprintModalOpen}
          onClose={() => setSprintModalOpen(false)}
          onSuccess={loadData}
          projectId={projectId}
        />
      )}
    </div>
  );
}
