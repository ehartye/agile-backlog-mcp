import type {
  Epic, Story, Task, Bug, Dependency, DependencyGraph, HierarchyNode,
  Relationship, Note, EntityType, Sprint, SprintCapacity, SprintSnapshot,
  SprintReport, User
} from '../types';

const API_BASE = '/api';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || 'Request failed');
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export const api = {
  // Epics
  epics: {
    list: (filters?: Record<string, any>) => {
      const params = new URLSearchParams(filters).toString();
      return fetchJson<Epic[]>(`/epics${params ? `?${params}` : ''}`);
    },
    get: (id: number) => fetchJson<{ epic: Epic; stories: Story[] }>(`/epics/${id}`),
    create: (data: Partial<Epic>) => fetchJson<Epic>('/epics', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id: number, data: Partial<Epic>) => fetchJson<Epic>(`/epics/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
    delete: (id: number) => fetchJson<void>(`/epics/${id}`, { method: 'DELETE' }),
  },

  // Stories
  stories: {
    list: (filters?: Record<string, any>) => {
      const params = new URLSearchParams(filters).toString();
      return fetchJson<Story[]>(`/stories${params ? `?${params}` : ''}`);
    },
    get: (id: number) => fetchJson<{ story: Story; tasks: Task[]; dependencies: Dependency[] }>(`/stories/${id}`),
    create: (data: Partial<Story>) => fetchJson<Story>('/stories', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id: number, data: Partial<Story>) => fetchJson<Story>(`/stories/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
    delete: (id: number) => fetchJson<void>(`/stories/${id}`, { method: 'DELETE' }),
  },

  // Bugs
  bugs: {
    list: (filters?: Record<string, any>) => {
      const params = new URLSearchParams(filters).toString();
      return fetchJson<Bug[]>(`/bugs${params ? `?${params}` : ''}`);
    },
    get: (id: number) => fetchJson<{ bug: Bug }>(`/bugs/${id}`),
    create: (data: Partial<Bug>) => fetchJson<Bug>('/bugs', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id: number, data: Partial<Bug>) => fetchJson<Bug>(`/bugs/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
    delete: (id: number) => fetchJson<void>(`/bugs/${id}`, { method: 'DELETE' }),
  },

  // Tasks
  tasks: {
    list: (filters?: Record<string, any>) => {
      const params = new URLSearchParams(filters).toString();
      return fetchJson<Task[]>(`/tasks${params ? `?${params}` : ''}`);
    },
    create: (data: Partial<Task>) => fetchJson<Task>('/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id: number, data: Partial<Task>) => fetchJson<Task>(`/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
    delete: (id: number) => fetchJson<void>(`/tasks/${id}`, { method: 'DELETE' }),
  },

  // Dependencies
  dependencies: {
    list: (storyId?: number) => {
      const params = storyId ? `?story_id=${storyId}` : '';
      return fetchJson<Dependency[]>(`/dependencies${params}`);
    },
    create: (data: Partial<Dependency>) => fetchJson<Dependency>('/dependencies', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    delete: (id: number) => fetchJson<void>(`/dependencies/${id}`, { method: 'DELETE' }),
  },

  // Graph data
  graph: {
    dependencies: (projectId?: number) => {
      const params = projectId ? `?project_id=${projectId}` : '';
      return fetchJson<DependencyGraph>(`/graph/dependencies${params}`);
    },
    hierarchy: (projectId?: number) => {
      const params = projectId ? `?project_id=${projectId}` : '';
      return fetchJson<HierarchyNode[]>(`/graph/hierarchy${params}`);
    },
  },

  // Relationships
  relationships: {
    list: (filters?: Record<string, any>) => {
      const params = new URLSearchParams(filters).toString();
      return fetchJson<Relationship[]>(`/relationships${params ? `?${params}` : ''}`);
    },
    get: (id: number) => fetchJson<Relationship>(`/relationships/${id}`),
    forEntity: (entityType: EntityType, entityId: number) =>
      fetchJson<Relationship[]>(`/relationships/entity/${entityType}/${entityId}`),
    create: (data: Partial<Relationship>) => fetchJson<Relationship>('/relationships', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    delete: (id: number) => fetchJson<void>(`/relationships/${id}`, { method: 'DELETE' }),
  },

  // Notes
  notes: {
    list: (filters?: Record<string, any>) => {
      const params = new URLSearchParams(filters).toString();
      return fetchJson<Note[]>(`/notes${params ? `?${params}` : ''}`);
    },
    get: (id: number) => fetchJson<Note>(`/notes/${id}`),
    forEntity: (entityType: EntityType, entityId: number) =>
      fetchJson<Note[]>(`/notes/entity/${entityType}/${entityId}`),
    create: (data: Partial<Note>) => fetchJson<Note>('/notes', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id: number, data: Partial<Note>) => fetchJson<Note>(`/notes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
    delete: (id: number) => fetchJson<void>(`/notes/${id}`, { method: 'DELETE' }),
  },

  // Sprints
  sprints: {
    list: (filters?: Record<string, any>) => {
      const params = new URLSearchParams(filters).toString();
      return fetchJson<Sprint[]>(`/sprints${params ? `?${params}` : ''}`);
    },
    get: (id: number) =>
      fetchJson<{ sprint: Sprint; stories: Story[]; bugs: Bug[]; capacity: SprintCapacity }>(`/sprints/${id}`),
    create: (data: Partial<Sprint>) => fetchJson<Sprint>('/sprints', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id: number, data: Partial<Sprint>) => fetchJson<Sprint>(`/sprints/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
    delete: (id: number) => fetchJson<void>(`/sprints/${id}`, { method: 'DELETE' }),
    addStory: (sprintId: number, storyId: number) =>
      fetchJson<{ success: boolean; capacity: SprintCapacity }>(`/sprints/${sprintId}/stories/${storyId}`, {
        method: 'POST',
      }),
    removeStory: (sprintId: number, storyId: number) =>
      fetchJson<{ success: boolean; capacity: SprintCapacity }>(`/sprints/${sprintId}/stories/${storyId}`, {
        method: 'DELETE',
      }),
    addBug: (sprintId: number, bugId: number) =>
      fetchJson<{ success: boolean; capacity: SprintCapacity }>(`/sprints/${sprintId}/bugs/${bugId}`, {
        method: 'POST',
      }),
    removeBug: (sprintId: number, bugId: number) =>
      fetchJson<{ success: boolean; capacity: SprintCapacity }>(`/sprints/${sprintId}/bugs/${bugId}`, {
        method: 'DELETE',
      }),
    start: (id: number) =>
      fetchJson<{ sprint: Sprint; initial_snapshot: SprintSnapshot }>(`/sprints/${id}/start`, {
        method: 'POST',
      }),
    complete: (id: number) =>
      fetchJson<{ sprint: Sprint; final_snapshot: SprintSnapshot; report: SprintReport }>(`/sprints/${id}/complete`, {
        method: 'POST',
      }),
    getBurndown: (id: number) =>
      fetchJson<{
        sprint: Sprint;
        snapshots: SprintSnapshot[];
        ideal_burndown: number[];
        total_days: number;
        capacity: SprintCapacity;
      }>(`/sprints/${id}/burndown`),
    getVelocityReport: (projectId: number, sprintCount: number = 3) => {
      const params = new URLSearchParams({ sprint_count: sprintCount.toString() }).toString();
      return fetchJson<{
        average_velocity: number;
        velocities: number[];
        sprint_names: string[];
        sprint_count: number;
      }>(`/projects/${projectId}/velocity?${params}`);
    },
    createSnapshot: (id: number, date?: string) =>
      fetchJson<SprintSnapshot>(`/sprints/${id}/snapshot`, {
        method: 'POST',
        body: JSON.stringify({ date }),
      }),
  },

  // Users
  users: {
    list: () => fetchJson<User[]>('/users'),
    get: (userId: string) => fetchJson<User>(`/users/${userId}`),
  },
};
