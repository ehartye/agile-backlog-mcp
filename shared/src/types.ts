// Core entity types
export type EntityStatus = 'todo' | 'in_progress' | 'review' | 'done' | 'blocked';
export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type BugSeverity = 'critical' | 'major' | 'minor' | 'trivial';
export type DependencyType = 'blocks' | 'blocked_by';
export type EntityType = 'project' | 'epic' | 'story' | 'task' | 'bug';
export type RelationshipType = 'blocks' | 'blocked_by' | 'related_to' | 'cloned_from' | 'depends_on';
export type SprintStatus = 'planning' | 'active' | 'completed' | 'cancelled';
export type UserType = 'human' | 'code_agent' | 'doc_agent' | 'qa_agent' | 'system';
export type TaskType = 'Code Change' | 'Doc Change' | 'Research' | 'QA';

export interface Project {
  id: number;
  identifier: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  last_accessed_at: string;
}

export interface User {
  user_id: string;  // Primary key (e.g., "Human_Admin", "Code_Agent_1")
  display_name: string;
  user_type: UserType;
  created_at: string;
  updated_at: string;
}

export interface Epic {
  id: number;
  project_id: number;
  title: string;
  description: string;
  status: EntityStatus;
  assigned_to: string | null;  // FK to users.user_id
  created_at: string;
  updated_at: string;
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
  assigned_to: string | null;  // FK to users.user_id
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: number;
  story_id: number;
  title: string;
  description: string;
  task_type: TaskType;
  status: EntityStatus;
  assigned_to: string | null;  // FK to users.user_id (replaces assignee)
  created_at: string;
  updated_at: string;
}

export interface Bug {
  id: number;
  project_id: number;
  story_id: number | null;
  title: string;
  description: string;
  severity: BugSeverity;
  error_message: string | null;
  status: EntityStatus;
  priority: Priority;
  points: number | null;
  assigned_to: string | null;  // FK to users.user_id
  created_at: string;
  updated_at: string;
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
  created_by: string;  // FK to users.user_id (renamed from agent_identifier)
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
  entity_type: 'epic' | 'story' | 'task' | 'bug';
  from_status: EntityStatus;
  to_status: EntityStatus;
  allowed: boolean;
}

export interface SecurityLog {
  id: number;
  event_type: 'unauthorized_access' | 'project_violation' | 'conflict_detected';
  project_id: number | null;
  user_id: string | null;  // FK to users.user_id (renamed from agent_identifier)
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
  created_by: string | null;  // FK to users.user_id (renamed from agent_identifier)
  created_at: string;
  updated_at: string;
}

export interface SprintStory {
  id: number;
  sprint_id: number;
  story_id: number;
  added_at: string;
  added_by: string | null;
}

export interface SprintBug {
  id: number;
  sprint_id: number;
  bug_id: number;
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

export interface CreateUserInput {
  user_id: string;
  display_name: string;
  user_type: UserType;
}

export interface CreateEpicInput {
  project_id: number;
  title: string;
  description: string;
  status?: EntityStatus;
  assigned_to?: string;  // Optional user assignment
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
  assigned_to?: string;  // Optional user assignment
}

export interface CreateTaskInput {
  story_id: number;
  title: string;
  description: string;
  task_type?: TaskType;  // Defaults to 'Code Change'
  status?: EntityStatus;
  assigned_to?: string;  // Optional user assignment (replaces assignee)
}

export interface CreateBugInput {
  project_id: number;
  story_id?: number | null;
  title: string;
  description: string;
  severity: BugSeverity;
  error_message?: string | null;
  status?: EntityStatus;
  priority?: Priority;
  points?: number | null;
  assigned_to?: string;  // Optional user assignment
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
  created_by: string;  // User who created the relationship
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
export interface UpdateUserInput {
  user_id: string;
  display_name?: string;
  user_type?: UserType;
}

export interface UpdateEpicInput {
  id: number;
  title?: string;
  description?: string;
  status?: EntityStatus;
  assigned_to?: string;  // Reassign to different user
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
  assigned_to?: string;  // Reassign to different user
}

export interface UpdateTaskInput {
  id: number;
  story_id?: number;
  title?: string;
  description?: string;
  task_type?: TaskType;
  status?: EntityStatus;
  assigned_to?: string;  // Reassign to different user (replaces assignee)
}

export interface UpdateBugInput {
  id: number;
  story_id?: number | null;
  title?: string;
  description?: string;
  severity?: BugSeverity;
  error_message?: string | null;
  status?: EntityStatus;
  priority?: Priority;
  points?: number | null;
  assigned_to?: string;  // Reassign to different user
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
  assigned_to?: string;  // Filter by assigned user
}

export interface StoryFilter {
  project_id?: number;
  epic_id?: number;
  status?: EntityStatus;
  priority?: Priority;
  has_dependencies?: boolean;
  assigned_to?: string;  // Filter by assigned user
}

export interface TaskFilter {
  project_id?: number;
  story_id?: number;
  status?: EntityStatus;
  task_type?: TaskType;  // Filter by task type
  assigned_to?: string;  // Filter by assigned user (replaces assignee)
}

export interface BugFilter {
  project_id?: number;
  story_id?: number;
  status?: EntityStatus;
  priority?: Priority;
  severity?: BugSeverity;
  assigned_to?: string;  // Filter by assigned user
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
  user_id: string;  // User performing the operation (replaces agent_identifier/modified_by)
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
