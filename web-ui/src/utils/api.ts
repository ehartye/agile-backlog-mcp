import type { Epic, Story, Task, Dependency, DependencyGraph, HierarchyNode } from '../types';

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
};
