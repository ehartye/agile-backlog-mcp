export type EntityStatus = 'todo' | 'in_progress' | 'review' | 'done' | 'blocked';
export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type DependencyType = 'blocks' | 'blocked_by';

export interface Epic {
  id: number;
  project_id: number;
  title: string;
  description: string;
  status: EntityStatus;
  created_at: string;
  updated_at: string;
  last_modified_by: string;
}

export interface Story {
  id: number;
  epic_id: number | null;
  title: string;
  description: string;
  status: EntityStatus;
  priority: Priority;
  points?: number;
  created_at: string;
  updated_at: string;
  last_modified_by: string;
}

export interface Task {
  id: number;
  story_id: number;
  title: string;
  description: string;
  status: EntityStatus;
  assignee?: string;
  created_at: string;
  updated_at: string;
  last_modified_by: string;
}

export interface Dependency {
  id: number;
  story_id: number;
  depends_on_story_id: number;
  dependency_type: DependencyType;
  created_at: string;
}

export interface StoryNode {
  id: number;
  title: string;
  status: EntityStatus;
  priority: Priority;
  epic_id: number | null;
  points?: number;
  dependencies: number[];
  dependents: number[];
}

export interface DependencyEdge {
  source: number;
  target: number;
  type: DependencyType;
}

export interface DependencyGraph {
  nodes: StoryNode[];
  edges: DependencyEdge[];
}

export interface HierarchyNode {
  id: number;
  type: 'epic' | 'story' | 'task';
  title: string;
  status: EntityStatus;
  children?: HierarchyNode[];
}
