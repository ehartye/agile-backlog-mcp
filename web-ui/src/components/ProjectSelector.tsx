import { useEffect, useState } from 'react';
import { FolderGit2, Plus } from 'lucide-react';

interface Project {
  id: number;
  identifier: string;
  name: string;
  description: string;
}

interface ProjectSelectorProps {
  selectedProjectId: number | null;
  onProjectChange: (projectId: number | null) => void;
}

export default function ProjectSelector({ selectedProjectId, onProjectChange }: ProjectSelectorProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProject, setNewProject] = useState({ identifier: '', name: '', description: '' });

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      const data = await response.json();
      setProjects(data);

      // Auto-select first project if none selected
      if (data.length > 0 && !selectedProjectId) {
        onProjectChange(data[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProject),
      });

      if (response.ok) {
        const created = await response.json();
        setProjects([...projects, created]);
        onProjectChange(created.id);
        setNewProject({ identifier: '', name: '', description: '' });
        setShowNewProject(false);
      }
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  return (
    <div className="p-4 border-b">
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
          <FolderGit2 size={16} />
          Project
        </label>
        <button
          onClick={() => setShowNewProject(!showNewProject)}
          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
          title="New Project"
        >
          <Plus size={16} />
        </button>
      </div>

      <select
        value={selectedProjectId || ''}
        onChange={(e) => onProjectChange(e.target.value ? parseInt(e.target.value) : null)}
        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
      >
        <option value="">All Projects</option>
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </select>

      {showNewProject && (
        <form onSubmit={handleCreateProject} className="mt-3 p-3 bg-gray-50 rounded-lg space-y-2">
          <input
            type="text"
            placeholder="Project Identifier (e.g., my-app)"
            value={newProject.identifier}
            onChange={(e) => setNewProject({ ...newProject, identifier: e.target.value })}
            className="w-full px-2 py-1 text-sm border rounded"
            required
          />
          <input
            type="text"
            placeholder="Project Name"
            value={newProject.name}
            onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
            className="w-full px-2 py-1 text-sm border rounded"
            required
          />
          <input
            type="text"
            placeholder="Description"
            value={newProject.description}
            onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
            className="w-full px-2 py-1 text-sm border rounded"
            required
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => setShowNewProject(false)}
              className="flex-1 px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
