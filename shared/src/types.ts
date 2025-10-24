// Core entity types
export type EntityStatus = 'todo' | 'in_progress' | 'review' | 'done' | 'blocked';
export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type DependencyType = 'blocks' | 'blocked_by';
export type EntityType = 'project' | 'epic' | 'story' | 'task';
export type RelationshipType = 'blocks' | 'blocked_by' | 'related_to' | 'cloned_from' | 'depends_on';
export type SprintStatus = 'planning' | 'active' | 'completed' | 'cancelled';

export interface Project {
  id: number;
  identifier: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  last_accessed_at: string;
}

export interface Epic {
  id: number;
  project_id: number;
  title: string;
  description: string;
  status: EntityStatus;
  created_at: string;
  updated_at: string;
  agent_identifier: string | null;
  last_modified_by: string | null;
}

export interface Story {
  id: number;
  project_id: number;
  epic_id: number | null;
  title: string;
  description: string;
  acceptance_criteria: string | null;
  status: EntityStatus;
  priority: Priority;
  points: number | null;
  created_at: string;
  updated_at: string;
  agent_identifier: string | null;
  last_modified_by: string | null;
}

export interface Task {
  id: number;
  story_id: number;
  title: string;
  description: string;
  status: EntityStatus;
  assignee: string | null;
  created_at: string;
  updated_at: string;
  agent_identifier: string | null;
  last_modified_by: string | null;
}

export interface Dependency {
  id: number;
  story_id: number;
  depends_on_story_id: number;
  dependency_type: DependencyType;
  created_at: string;
}

export interface Relationship {
  id: number;
  source_type: EntityType;
  source_id: number;
  target_type: EntityType;
  target_id: number;
  relationship_type: RelationshipType;
  project_id: number;
  agent_identifier: string;
  created_at: string;
  updated_at: string;
}

export interface Note {
  id: number;
  parent_type: EntityType;
  parent_id: number;
  content: string;
  agent_identifier: string;
  author_name: string | null;
  project_id: number;
  created_at: string;
  updated_at: string;
}

export interface StatusTransition {
  id: number;
  entity_type: 'epic' | 'story' | 'task';
  from_status: EntityStatus;
  to_status: EntityStatus;
  allowed: boolean;
}

export interface SecurityLog {
  id: number;
  event_type: 'unauthorized_access' | 'project_violation' | 'conflict_detected';
  project_id: number | null;
  agent_identifier: string | null;
  attempted_path: string;
  entity_type: string;
  entity_id: number | null;
  message: string;
  created_at: string;
}

export interface Sprint {
  id: number;
  project_id: number;
  name: string;
  goal: string | null;
  start_date: string;
  end_date: string;
  capacity_points: number | null;
  status: SprintStatus;
  created_at: string;
  updated_at: string;
  agent_identifier: string | null;
}

export interface SprintStory {
  id: number;
  sprint_id: number;
  story_id: number;
  added_at: string;
  added_by: string | null;
}

export interface SprintSnapshot {
  id: number;
  sprint_id: number;
  snapshot_date: string;
  remaining_points: number;
  completed_points: number;
  added_points: number;
  removed_points: number;
  created_at: string;
}

// Input types for creation (without auto-generated fields)
export interface CreateProjectInput {
  identifier: string;
  name: string;
  description: string;
}

export interface CreateEpicInput {
  project_id: number;
  title: string;
  description: string;
  status?: EntityStatus;
}

export interface CreateStoryInput {
  project_id: number;
  epic_id?: number | null;
  title: string;
  description: string;
  acceptance_criteria?: string | null;
  status?: EntityStatus;
  priority?: Priority;
  points?: number | null;
}

export interface CreateTaskInput {
  story_id: number;
  title: string;
  description: string;
  status?: EntityStatus;
  assignee?: string | null;
}

export interface CreateDependencyInput {
  story_id: number;
  depends_on_story_id: number;
  dependency_type: DependencyType;
}

export interface CreateRelationshipInput {
  source_type: EntityType;
  source_id: number;
  target_type: EntityType;
  target_id: number;
  relationship_type: RelationshipType;
  project_id: number;
  agent_identifier: string;
}

export interface CreateNoteInput {
  parent_type: EntityType;
  parent_id: number;
  content: string;
  agent_identifier: string;
  author_name?: string | null;
  project_id: number;
}

export interface UpdateNoteInput {
  id: number;
  content: string;
  agent_identifier: string;
  author_name?: string | null;
}

export interface CreateSprintInput {
  project_id: number;
  name: string;
  goal?: string | null;
  start_date: string;
  end_date: string;
  capacity_points?: number | null;
  status?: SprintStatus;
}

// Update types (all fields optional except id)
export interface UpdateEpicInput {
  id: number;
  title?: string;
  description?: string;
  status?: EntityStatus;
}

export interface UpdateStoryInput {
  id: number;
  epic_id?: number | null;
  title?: string;
  description?: string;
  acceptance_criteria?: string | null;
  status?: EntityStatus;
  priority?: Priority;
  points?: number | null;
}

export interface UpdateTaskInput {
  id: number;
  story_id?: number;
  title?: string;
  description?: string;
  status?: EntityStatus;
  assignee?: string | null;
}

// Update types for projects
export interface UpdateProjectInput {
  id: number;
  identifier?: string;
  name?: string;
  description?: string;
}

export interface UpdateSprintInput {
  id: number;
  name?: string;
  goal?: string | null;
  start_date?: string;
  end_date?: string;
  capacity_points?: number | null;
  status?: SprintStatus;
}

// Query filters
export interface EpicFilter {
  project_id?: number;
  status?: EntityStatus;
}

export interface StoryFilter {
  project_id?: number;
  epic_id?: number;
  status?: EntityStatus;
  priority?: Priority;
  has_dependencies?: boolean;
}

export interface TaskFilter {
  project_id?: number;
  story_id?: number;
  status?: EntityStatus;
  assignee?: string;
}

export interface RelationshipFilter {
  project_id?: number;
  source_type?: EntityType;
  source_id?: number;
  target_type?: EntityType;
  target_id?: number;
  relationship_type?: RelationshipType;
}

export interface NoteFilter {
  project_id?: number;
  parent_type?: EntityType;
  parent_id?: number;
  agent_identifier?: string;
}

export interface SprintFilter {
  project_id?: number;
  status?: SprintStatus;
}

// Project context for validation
export interface ProjectContext {
  project_identifier: string;
  project_id: number;
  project_name: string;
  agent_identifier: string;
  modified_by: string;
}

// Graph data structures for UI
export interface StoryNode {
  id: number;
  title: string;
  status: EntityStatus;
  priority: Priority;
  epic_id: number | null;
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
