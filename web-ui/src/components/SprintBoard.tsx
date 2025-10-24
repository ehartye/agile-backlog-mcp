import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, PlayCircle, CheckCircle } from 'lucide-react';
import { api } from '../utils/api';
import type { Sprint, Story, SprintCapacity, EntityStatus } from '../types';

export default function SprintBoard() {
  const { projectId, sprintId } = useParams<{ projectId: string; sprintId: string }>();
  const navigate = useNavigate();
  const [sprint, setSprint] = useState<Sprint | null>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [capacity, setCapacity] = useState<SprintCapacity | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sprintId) return;

    const loadSprint = async () => {
      setLoading(true);
      try {
        const data = await api.sprints.get(parseInt(sprintId));
        setSprint(data.sprint);
        setStories(data.stories);
        setCapacity(data.capacity);
      } catch (error) {
        console.error('Failed to load sprint:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSprint();
  }, [sprintId]);

  const handleStartSprint = async () => {
    if (!sprint || !confirm('Start this sprint?')) return;
    try {
      const data = await api.sprints.start(sprint.id);
      setSprint(data.sprint);
    } catch (error) {
      console.error('Failed to start sprint:', error);
      alert('Failed to start sprint: ' + (error as Error).message);
    }
  };

  const handleCompleteSprint = async () => {
    if (!sprint || !confirm('Complete this sprint? This will generate a report and close the sprint.')) return;
    try {
      const data = await api.sprints.complete(sprint.id);
      setSprint(data.sprint);
      alert(`Sprint completed!\n\nCompleted: ${data.report.completed_stories}/${data.report.total_stories} stories\nVelocity: ${data.report.velocity} points\nCompletion rate: ${data.report.completion_rate}%`);
    } catch (error) {
      console.error('Failed to complete sprint:', error);
      alert('Failed to complete sprint: ' + (error as Error).message);
    }
  };

  const getStoriesByStatus = (status: EntityStatus) => {
    return stories.filter(story => story.status === status);
  };

  const getStatusColor = (status: EntityStatus) => {
    switch (status) {
      case 'todo': return 'bg-gray-100 border-gray-300';
      case 'in_progress': return 'bg-blue-50 border-blue-300';
      case 'review': return 'bg-yellow-50 border-yellow-300';
      case 'done': return 'bg-green-50 border-green-300';
      case 'blocked': return 'bg-red-50 border-red-300';
      default: return 'bg-gray-100 border-gray-300';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Loading sprint...</div>
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

  const columns: { status: EntityStatus; title: string }[] = [
    { status: 'todo', title: 'To Do' },
    { status: 'in_progress', title: 'In Progress' },
    { status: 'review', title: 'Review' },
    { status: 'done', title: 'Done' },
    { status: 'blocked', title: 'Blocked' },
  ];

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(projectId ? `/project/${projectId}` : '/')}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{sprint.name}</h1>
              {sprint.goal && <p className="text-gray-600 text-sm mt-1">{sprint.goal}</p>}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {sprint.status === 'planning' && (
              <button
                onClick={handleStartSprint}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <PlayCircle size={20} />
                Start Sprint
              </button>
            )}
            {sprint.status === 'active' && (
              <>
                <Link
                  to={`/project/${projectId}/sprint/${sprint.id}/burndown`}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  View Burndown
                </Link>
                <button
                  onClick={handleCompleteSprint}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <CheckCircle size={20} />
                  Complete Sprint
                </button>
              </>
            )}
          </div>
        </div>

        {/* Sprint Info */}
        <div className="flex items-center gap-6 text-sm text-gray-600">
          <div>
            <span className="font-medium">Status:</span>{' '}
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              sprint.status === 'planning' ? 'bg-gray-100 text-gray-700' :
              sprint.status === 'active' ? 'bg-blue-100 text-blue-700' :
              sprint.status === 'completed' ? 'bg-green-100 text-green-700' :
              'bg-red-100 text-red-700'
            }`}>
              {sprint.status}
            </span>
          </div>
          <div>
            <span className="font-medium">Duration:</span>{' '}
            {new Date(sprint.start_date).toLocaleDateString()} - {new Date(sprint.end_date).toLocaleDateString()}
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

      {/* Board */}
      <div className="flex-1 overflow-x-auto p-6">
        <div className="flex gap-4 h-full min-w-max">
          {columns.map(({ status, title }) => {
            const columnStories = getStoriesByStatus(status);
            const columnPoints = columnStories.reduce((sum, story) => sum + (story.points || 0), 0);

            return (
              <div key={status} className="flex-1 min-w-[280px] flex flex-col">
                <div className="bg-white rounded-t-lg border-t-4 border-x px-4 py-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">{title}</h3>
                    <span className="text-sm text-gray-500">
                      {columnStories.length} • {columnPoints} pts
                    </span>
                  </div>
                </div>

                <div className={`flex-1 ${getStatusColor(status)} border-x border-b rounded-b-lg p-3 space-y-3 overflow-y-auto`}>
                  {columnStories.map(story => (
                    <Link
                      key={story.id}
                      to={`/project/${projectId}/story/${story.id}`}
                      className="block bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow border border-gray-200"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-gray-900 text-sm flex-1">{story.title}</h4>
                        {story.points && (
                          <span className="ml-2 px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                            {story.points} pts
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className={`font-medium ${getPriorityColor(story.priority)}`}>
                          {story.priority}
                        </span>
                        <span className="text-gray-400">•</span>
                        <span className="text-gray-500">#{story.id}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
