import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import type {
  Project,
  Epic,
  Story,
  Task,
  Dependency,
  StatusTransition,
  SecurityLog,
  CreateProjectInput,
  CreateEpicInput,
  CreateStoryInput,
  CreateTaskInput,
  CreateDependencyInput,
  UpdateProjectInput,
  UpdateEpicInput,
  UpdateStoryInput,
  UpdateTaskInput,
  EpicFilter,
  StoryFilter,
  TaskFilter,
  ProjectContext,
  DependencyGraph,
  StoryNode,
  DependencyEdge,
  HierarchyNode,
} from './types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '../../agile-backlog.db');

export class AgileDatabase {
  private db: Database.Database;

  constructor(dbPath: string = DB_PATH) {
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');  // Enable foreign key constraints
    this.initializeDatabase();
  }

  private runMigrations(): void {
    // Migration 1: Check if stories table exists and needs project_id column
    const storiesTableInfo = this.db.pragma('table_info(stories)') as Array<{ name: string }>;

    if (storiesTableInfo.length > 0) {
      const hasProjectId = storiesTableInfo.some(col => col.name === 'project_id');

      if (!hasProjectId) {
        console.error('[Migration] Stories table exists without project_id column');

        // Check if there are any stories
        const storyCount = this.db.prepare('SELECT COUNT(*) as count FROM stories').get() as { count: number };

        if (storyCount.count > 0) {
          console.error('[Migration] Adding project_id column to stories table with backfill...');

          // Add the column as nullable first
          this.db.exec('ALTER TABLE stories ADD COLUMN project_id INTEGER');

          // Backfill project_id from epics for stories that have epic_id
          this.db.exec(`
            UPDATE stories
            SET project_id = (
              SELECT e.project_id
              FROM epics e
              WHERE e.id = stories.epic_id
            )
            WHERE epic_id IS NOT NULL
          `);

          // For orphan stories (epic_id IS NULL), we need to handle them
          // Check if there are any orphan stories without project_id
          const orphanCount = this.db.prepare(
            'SELECT COUNT(*) as count FROM stories WHERE epic_id IS NULL AND project_id IS NULL'
          ).get() as { count: number };

          if (orphanCount.count > 0) {
            throw new Error(
              `[Migration] Found ${orphanCount.count} orphan stories (no epic) that cannot be assigned to a project. ` +
              'Please delete these stories or assign them to an epic before migrating. ' +
              'You can list them with: SELECT * FROM stories WHERE epic_id IS NULL AND project_id IS NULL'
            );
          }

          // Now make the column NOT NULL since all rows should have values
          // SQLite doesn't support ALTER COLUMN, so we need to recreate the table
          console.error('[Migration] Recreating stories table with project_id as NOT NULL...');
          this.db.exec(`
            CREATE TABLE stories_new (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              project_id INTEGER NOT NULL,
              epic_id INTEGER,
              title TEXT NOT NULL,
              description TEXT NOT NULL,
              status TEXT NOT NULL DEFAULT 'todo',
              priority TEXT NOT NULL DEFAULT 'medium',
              points INTEGER,
              created_at TEXT NOT NULL DEFAULT (datetime('now')),
              updated_at TEXT NOT NULL DEFAULT (datetime('now')),
              last_modified_by TEXT,
              FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
              FOREIGN KEY (epic_id) REFERENCES epics (id) ON DELETE SET NULL
            )
          `);

          this.db.exec(`
            INSERT INTO stories_new
            SELECT id, project_id, epic_id, title, description, status, priority, points,
                   created_at, updated_at, last_modified_by
            FROM stories
          `);

          this.db.exec('DROP TABLE stories');
          this.db.exec('ALTER TABLE stories_new RENAME TO stories');

          console.error('[Migration] Successfully migrated stories table');
        } else {
          // No stories exist, safe to just add column (will be handled by CREATE TABLE IF NOT EXISTS)
          console.error('[Migration] Stories table is empty, will be recreated with project_id');
          this.db.exec('DROP TABLE stories');
        }
      }
    }

    // Migration 2: Add identifier column to projects and remove repository_path
    const projectsTableInfo = this.db.pragma('table_info(projects)') as Array<{ name: string }>;

    if (projectsTableInfo.length > 0) {
      const hasIdentifier = projectsTableInfo.some(col => col.name === 'identifier');
      const hasRepositoryPath = projectsTableInfo.some(col => col.name === 'repository_path');

      if (!hasIdentifier || hasRepositoryPath) {
        console.error('[Migration] Migrating projects table to identifier-based system...');

        const projectCount = this.db.prepare('SELECT COUNT(*) as count FROM projects').get() as { count: number };

        if (projectCount.count > 0) {
          // Add identifier column if it doesn't exist
          if (!hasIdentifier) {
            this.db.exec('ALTER TABLE projects ADD COLUMN identifier TEXT');

            // Backfill identifier from slugified name
            const projects = this.db.prepare('SELECT id, name FROM projects').all() as Array<{ id: number; name: string }>;
            const updateStmt = this.db.prepare('UPDATE projects SET identifier = ? WHERE id = ?');

            for (const project of projects) {
              const identifier = project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
              updateStmt.run(identifier, project.id);
            }
          }

          // Recreate table without repository_path
          console.error('[Migration] Recreating projects table with identifier...');
          this.db.exec(`
            CREATE TABLE projects_new (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              identifier TEXT NOT NULL UNIQUE,
              name TEXT NOT NULL,
              description TEXT NOT NULL,
              created_at TEXT NOT NULL DEFAULT (datetime('now')),
              updated_at TEXT NOT NULL DEFAULT (datetime('now')),
              last_accessed_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
          `);

          this.db.exec(`
            INSERT INTO projects_new (id, identifier, name, description, created_at, updated_at, last_accessed_at)
            SELECT id, identifier, name, description, created_at, updated_at, last_accessed_at
            FROM projects
          `);

          this.db.exec('DROP TABLE projects');
          this.db.exec('ALTER TABLE projects_new RENAME TO projects');

          console.error('[Migration] Successfully migrated projects table');
        } else {
          // No projects exist, safe to drop and recreate
          console.error('[Migration] Projects table is empty, will be recreated with identifier');
          this.db.exec('DROP TABLE projects');
        }
      }
    }

    // Migration 3: Add agent_identifier columns to epics, stories, tasks
    const epicsTableInfo = this.db.pragma('table_info(epics)') as Array<{ name: string }>;
    const hasAgentIdentifierInEpics = epicsTableInfo.length > 0 && epicsTableInfo.some(col => col.name === 'agent_identifier');

    if (epicsTableInfo.length > 0 && !hasAgentIdentifierInEpics) {
      console.error('[Migration] Adding agent_identifier to epics table...');
      this.db.exec('ALTER TABLE epics ADD COLUMN agent_identifier TEXT');
    }

    const storiesTableInfo2 = this.db.pragma('table_info(stories)') as Array<{ name: string }>;
    const hasAgentIdentifierInStories = storiesTableInfo2.length > 0 && storiesTableInfo2.some(col => col.name === 'agent_identifier');

    if (storiesTableInfo2.length > 0 && !hasAgentIdentifierInStories) {
      console.error('[Migration] Adding agent_identifier to stories table...');
      this.db.exec('ALTER TABLE stories ADD COLUMN agent_identifier TEXT');
    }

    const tasksTableInfo = this.db.pragma('table_info(tasks)') as Array<{ name: string }>;
    const hasAgentIdentifierInTasks = tasksTableInfo.length > 0 && tasksTableInfo.some(col => col.name === 'agent_identifier');

    if (tasksTableInfo.length > 0 && !hasAgentIdentifierInTasks) {
      console.error('[Migration] Adding agent_identifier to tasks table...');
      this.db.exec('ALTER TABLE tasks ADD COLUMN agent_identifier TEXT');
    }

    // Migration 4: Add agent_identifier to security_logs
    const securityLogsTableInfo = this.db.pragma('table_info(security_logs)') as Array<{ name: string }>;
    const hasAgentIdentifierInLogs = securityLogsTableInfo.length > 0 && securityLogsTableInfo.some(col => col.name === 'agent_identifier');

    if (securityLogsTableInfo.length > 0 && !hasAgentIdentifierInLogs) {
      console.error('[Migration] Adding agent_identifier to security_logs table...');
      this.db.exec('ALTER TABLE security_logs ADD COLUMN agent_identifier TEXT');
    }
  }

  private initializeDatabase(): void {
    // Run migrations first
    this.runMigrations();

    // Create projects table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        identifier TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        last_accessed_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    // Create security_logs table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS security_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type TEXT NOT NULL,
        project_id INTEGER,
        agent_identifier TEXT,
        attempted_path TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id INTEGER,
        message TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE SET NULL
      )
    `);

    // Create epics table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS epics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'todo',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        agent_identifier TEXT,
        last_modified_by TEXT,
        FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
      )
    `);

    // Create stories table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS stories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        epic_id INTEGER,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'todo',
        priority TEXT NOT NULL DEFAULT 'medium',
        points INTEGER,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        agent_identifier TEXT,
        last_modified_by TEXT,
        FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
        FOREIGN KEY (epic_id) REFERENCES epics (id) ON DELETE SET NULL
      )
    `);

    // Create tasks table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        story_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'todo',
        assignee TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        agent_identifier TEXT,
        last_modified_by TEXT,
        FOREIGN KEY (story_id) REFERENCES stories (id) ON DELETE CASCADE
      )
    `);

    // Create dependencies table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS dependencies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        story_id INTEGER NOT NULL,
        depends_on_story_id INTEGER NOT NULL,
        dependency_type TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (story_id) REFERENCES stories (id) ON DELETE CASCADE,
        FOREIGN KEY (depends_on_story_id) REFERENCES stories (id) ON DELETE CASCADE,
        UNIQUE(story_id, depends_on_story_id)
      )
    `);

    // Create status_transitions table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS status_transitions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_type TEXT NOT NULL,
        from_status TEXT NOT NULL,
        to_status TEXT NOT NULL,
        allowed INTEGER NOT NULL DEFAULT 1
      )
    `);

    // Insert default allowed status transitions
    this.initializeDefaultTransitions();
  }

  private initializeDefaultTransitions(): void {
    const transitions = [
      // Epic, Story, and Task all have the same workflow
      ['epic', 'todo', 'in_progress'],
      ['epic', 'in_progress', 'review'],
      ['epic', 'review', 'done'],
      ['epic', 'review', 'in_progress'],
      ['epic', 'in_progress', 'blocked'],
      ['epic', 'blocked', 'in_progress'],
      ['story', 'todo', 'in_progress'],
      ['story', 'in_progress', 'review'],
      ['story', 'review', 'done'],
      ['story', 'review', 'in_progress'],
      ['story', 'in_progress', 'blocked'],
      ['story', 'blocked', 'in_progress'],
      ['task', 'todo', 'in_progress'],
      ['task', 'in_progress', 'review'],
      ['task', 'review', 'done'],
      ['task', 'review', 'in_progress'],
      ['task', 'in_progress', 'blocked'],
      ['task', 'blocked', 'in_progress'],
    ];

    const insert = this.db.prepare(`
      INSERT OR IGNORE INTO status_transitions (entity_type, from_status, to_status, allowed)
      VALUES (?, ?, ?, 1)
    `);

    for (const [entity_type, from_status, to_status] of transitions) {
      insert.run(entity_type, from_status, to_status);
    }
  }

  // Project operations
  createProject(input: CreateProjectInput): Project {
    const stmt = this.db.prepare(`
      INSERT INTO projects (identifier, name, description)
      VALUES (?, ?, ?)
    `);
    const result = stmt.run(input.identifier, input.name, input.description);
    return this.getProject(result.lastInsertRowid as number)!;
  }

  getProject(id: number): Project | null {
    const stmt = this.db.prepare('SELECT * FROM projects WHERE id = ?');
    return stmt.get(id) as Project | null;
  }

  getProjectByIdentifier(identifier: string): Project | null {
    const stmt = this.db.prepare('SELECT * FROM projects WHERE identifier = ?');
    const project = stmt.get(identifier) as Project | null;

    // Update last_accessed_at when project is accessed
    if (project) {
      this.db.prepare('UPDATE projects SET last_accessed_at = datetime(\'now\') WHERE id = ?').run(project.id);
    }

    return project;
  }

  getProjectByName(name: string): Project | null {
    const stmt = this.db.prepare('SELECT * FROM projects WHERE name = ?');
    return stmt.get(name) as Project | null;
  }

  listProjects(): Project[] {
    const stmt = this.db.prepare('SELECT * FROM projects ORDER BY last_accessed_at DESC');
    return stmt.all() as Project[];
  }

  updateProject(input: UpdateProjectInput): Project {
    const updates: string[] = [];
    const values: any[] = [];

    if (input.identifier !== undefined) {
      updates.push('identifier = ?');
      values.push(input.identifier);
    }
    if (input.name !== undefined) {
      updates.push('name = ?');
      values.push(input.name);
    }
    if (input.description !== undefined) {
      updates.push('description = ?');
      values.push(input.description);
    }

    updates.push('updated_at = datetime(\'now\')');
    values.push(input.id);

    const stmt = this.db.prepare(`
      UPDATE projects SET ${updates.join(', ')} WHERE id = ?
    `);
    stmt.run(...values);
    return this.getProject(input.id)!;
  }

  deleteProject(id: number): void {
    this.db.prepare('DELETE FROM projects WHERE id = ?').run(id);
  }

  // Security logging
  logSecurityEvent(
    eventType: 'unauthorized_access' | 'project_violation' | 'conflict_detected',
    attemptedPath: string,
    entityType: string,
    message: string,
    projectId: number | null = null,
    entityId: number | null = null,
    agentIdentifier: string | null = null
  ): void {
    const stmt = this.db.prepare(`
      INSERT INTO security_logs (event_type, project_id, agent_identifier, attempted_path, entity_type, entity_id, message)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(eventType, projectId, agentIdentifier, attemptedPath, entityType, entityId, message);
  }

  getSecurityLogs(limit: number = 100): SecurityLog[] {
    const stmt = this.db.prepare(`
      SELECT * FROM security_logs
      ORDER BY created_at DESC
      LIMIT ?
    `);
    return stmt.all(limit) as SecurityLog[];
  }

  // Project context validation (identifier-based)
  validateProjectIdentifier(identifier: string): boolean {
    const project = this.getProjectByIdentifier(identifier);
    return !!project;
  }

  getProjectIdForEpic(epicId: number): number | null {
    const stmt = this.db.prepare('SELECT project_id FROM epics WHERE id = ?');
    const result = stmt.get(epicId) as { project_id: number } | undefined;
    return result?.project_id ?? null;
  }

  getProjectIdForStory(storyId: number): number | null {
    const stmt = this.db.prepare('SELECT project_id FROM stories WHERE id = ?');
    const result = stmt.get(storyId) as { project_id: number } | undefined;
    return result?.project_id ?? null;
  }

  getProjectIdForTask(taskId: number): number | null {
    const stmt = this.db.prepare(`
      SELECT s.project_id
      FROM tasks t
      JOIN stories s ON t.story_id = s.id
      WHERE t.id = ?
    `);
    const result = stmt.get(taskId) as { project_id: number } | undefined;
    return result?.project_id ?? null;
  }

  // Epic operations
  createEpic(input: CreateEpicInput, agentIdentifier?: string, modifiedBy?: string): Epic {
    const stmt = this.db.prepare(`
      INSERT INTO epics (project_id, title, description, status, agent_identifier, last_modified_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      input.project_id,
      input.title,
      input.description,
      input.status || 'todo',
      agentIdentifier || null,
      modifiedBy || null
    );
    return this.getEpic(result.lastInsertRowid as number)!;
  }

  getEpic(id: number): Epic | null {
    const stmt = this.db.prepare('SELECT * FROM epics WHERE id = ?');
    return stmt.get(id) as Epic | null;
  }

  listEpics(filter?: EpicFilter): Epic[] {
    let query = 'SELECT * FROM epics WHERE 1=1';
    const values: any[] = [];

    if (filter?.project_id !== undefined) {
      query += ' AND project_id = ?';
      values.push(filter.project_id);
    }
    if (filter?.status) {
      query += ' AND status = ?';
      values.push(filter.status);
    }

    query += ' ORDER BY created_at DESC';

    const stmt = this.db.prepare(query);
    return stmt.all(...values) as Epic[];
  }

  updateEpic(input: UpdateEpicInput, agentIdentifier?: string, modifiedBy?: string): Epic {
    const updates: string[] = [];
    const values: any[] = [];

    if (input.title !== undefined) {
      updates.push('title = ?');
      values.push(input.title);
    }
    if (input.description !== undefined) {
      updates.push('description = ?');
      values.push(input.description);
    }
    if (input.status !== undefined) {
      updates.push('status = ?');
      values.push(input.status);
    }

    updates.push('updated_at = datetime(\'now\')');
    updates.push('agent_identifier = ?');
    values.push(agentIdentifier || null);
    updates.push('last_modified_by = ?');
    values.push(modifiedBy || null);
    values.push(input.id);

    const stmt = this.db.prepare(`
      UPDATE epics SET ${updates.join(', ')} WHERE id = ?
    `);
    stmt.run(...values);
    return this.getEpic(input.id)!;
  }

  deleteEpic(id: number): void {
    this.db.prepare('DELETE FROM epics WHERE id = ?').run(id);
  }

  // Story operations
  createStory(input: CreateStoryInput, agentIdentifier?: string, modifiedBy?: string): Story {
    const stmt = this.db.prepare(`
      INSERT INTO stories (project_id, epic_id, title, description, status, priority, points, agent_identifier, last_modified_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      input.project_id,
      input.epic_id ?? null,
      input.title,
      input.description,
      input.status || 'todo',
      input.priority || 'medium',
      input.points ?? null,
      agentIdentifier || null,
      modifiedBy || null
    );
    return this.getStory(result.lastInsertRowid as number)!;
  }

  getStory(id: number): Story | null {
    const stmt = this.db.prepare('SELECT * FROM stories WHERE id = ?');
    return stmt.get(id) as Story | null;
  }

  listStories(filter?: StoryFilter): Story[] {
    let query = 'SELECT * FROM stories WHERE 1=1';
    const values: any[] = [];

    // Add project filtering using direct column
    if (filter?.project_id !== undefined) {
      query += ' AND project_id = ?';
      values.push(filter.project_id);
    }

    if (filter?.epic_id !== undefined) {
      query += ' AND epic_id = ?';
      values.push(filter.epic_id);
    }
    if (filter?.status) {
      query += ' AND status = ?';
      values.push(filter.status);
    }
    if (filter?.priority) {
      query += ' AND priority = ?';
      values.push(filter.priority);
    }
    if (filter?.has_dependencies !== undefined) {
      if (filter.has_dependencies) {
        query += ' AND id IN (SELECT DISTINCT story_id FROM dependencies UNION SELECT DISTINCT depends_on_story_id FROM dependencies)';
      } else {
        query += ' AND id NOT IN (SELECT DISTINCT story_id FROM dependencies UNION SELECT DISTINCT depends_on_story_id FROM dependencies)';
      }
    }

    query += ' ORDER BY created_at DESC';

    const stmt = this.db.prepare(query);
    return stmt.all(...values) as Story[];
  }

  updateStory(input: UpdateStoryInput, agentIdentifier?: string, modifiedBy?: string): Story {
    const updates: string[] = [];
    const values: any[] = [];

    if (input.epic_id !== undefined) {
      updates.push('epic_id = ?');
      values.push(input.epic_id);
    }
    if (input.title !== undefined) {
      updates.push('title = ?');
      values.push(input.title);
    }
    if (input.description !== undefined) {
      updates.push('description = ?');
      values.push(input.description);
    }
    if (input.status !== undefined) {
      updates.push('status = ?');
      values.push(input.status);
    }
    if (input.priority !== undefined) {
      updates.push('priority = ?');
      values.push(input.priority);
    }
    if (input.points !== undefined) {
      updates.push('points = ?');
      values.push(input.points);
    }

    updates.push('updated_at = datetime(\'now\')');
    updates.push('agent_identifier = ?');
    values.push(agentIdentifier || null);
    updates.push('last_modified_by = ?');
    values.push(modifiedBy || null);
    values.push(input.id);

    const stmt = this.db.prepare(`
      UPDATE stories SET ${updates.join(', ')} WHERE id = ?
    `);
    stmt.run(...values);
    return this.getStory(input.id)!;
  }

  deleteStory(id: number): void {
    this.db.prepare('DELETE FROM stories WHERE id = ?').run(id);
  }

  // Task operations
  createTask(input: CreateTaskInput, agentIdentifier?: string, modifiedBy?: string): Task {
    const stmt = this.db.prepare(`
      INSERT INTO tasks (story_id, title, description, status, assignee, agent_identifier, last_modified_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      input.story_id,
      input.title,
      input.description,
      input.status || 'todo',
      input.assignee ?? null,
      agentIdentifier || null,
      modifiedBy || null
    );
    return this.getTask(result.lastInsertRowid as number)!;
  }

  getTask(id: number): Task | null {
    const stmt = this.db.prepare('SELECT * FROM tasks WHERE id = ?');
    return stmt.get(id) as Task | null;
  }

  listTasks(filter?: TaskFilter): Task[] {
    let query = 'SELECT t.* FROM tasks t';
    const values: any[] = [];

    // Add project filtering via story's project_id
    if (filter?.project_id !== undefined) {
      query += ' JOIN stories s ON t.story_id = s.id WHERE s.project_id = ?';
      values.push(filter.project_id);
    } else {
      query += ' WHERE 1=1';
    }

    if (filter?.story_id !== undefined) {
      query += ' AND t.story_id = ?';
      values.push(filter.story_id);
    }
    if (filter?.status) {
      query += ' AND t.status = ?';
      values.push(filter.status);
    }
    if (filter?.assignee) {
      query += ' AND t.assignee = ?';
      values.push(filter.assignee);
    }

    query += ' ORDER BY t.created_at DESC';

    const stmt = this.db.prepare(query);
    return stmt.all(...values) as Task[];
  }

  updateTask(input: UpdateTaskInput, agentIdentifier?: string, modifiedBy?: string): Task {
    const updates: string[] = [];
    const values: any[] = [];

    if (input.story_id !== undefined) {
      updates.push('story_id = ?');
      values.push(input.story_id);
    }
    if (input.title !== undefined) {
      updates.push('title = ?');
      values.push(input.title);
    }
    if (input.description !== undefined) {
      updates.push('description = ?');
      values.push(input.description);
    }
    if (input.status !== undefined) {
      updates.push('status = ?');
      values.push(input.status);
    }
    if (input.assignee !== undefined) {
      updates.push('assignee = ?');
      values.push(input.assignee);
    }

    updates.push('updated_at = datetime(\'now\')');
    updates.push('agent_identifier = ?');
    values.push(agentIdentifier || null);
    updates.push('last_modified_by = ?');
    values.push(modifiedBy || null);
    values.push(input.id);

    const stmt = this.db.prepare(`
      UPDATE tasks SET ${updates.join(', ')} WHERE id = ?
    `);
    stmt.run(...values);
    return this.getTask(input.id)!;
  }

  deleteTask(id: number): void {
    this.db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  }

  // Dependency operations
  createDependency(input: CreateDependencyInput): Dependency {
    // Check for circular dependencies
    if (this.wouldCreateCircularDependency(input.story_id, input.depends_on_story_id)) {
      throw new Error('Cannot create dependency: would create a circular dependency');
    }

    const stmt = this.db.prepare(`
      INSERT INTO dependencies (story_id, depends_on_story_id, dependency_type)
      VALUES (?, ?, ?)
    `);
    const result = stmt.run(input.story_id, input.depends_on_story_id, input.dependency_type);
    return this.getDependency(result.lastInsertRowid as number)!;
  }

  getDependency(id: number): Dependency | null {
    const stmt = this.db.prepare('SELECT * FROM dependencies WHERE id = ?');
    return stmt.get(id) as Dependency | null;
  }

  listDependencies(storyId?: number): Dependency[] {
    if (storyId !== undefined) {
      const stmt = this.db.prepare('SELECT * FROM dependencies WHERE story_id = ? OR depends_on_story_id = ?');
      return stmt.all(storyId, storyId) as Dependency[];
    }
    const stmt = this.db.prepare('SELECT * FROM dependencies ORDER BY created_at DESC');
    return stmt.all() as Dependency[];
  }

  deleteDependency(id: number): void {
    this.db.prepare('DELETE FROM dependencies WHERE id = ?').run(id);
  }

  private wouldCreateCircularDependency(storyId: number, dependsOnId: number): boolean {
    // BFS to check if dependsOnId depends on storyId (directly or transitively)
    const visited = new Set<number>();
    const queue = [dependsOnId];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === storyId) {
        return true;
      }
      if (visited.has(current)) {
        continue;
      }
      visited.add(current);

      const deps = this.db.prepare('SELECT depends_on_story_id FROM dependencies WHERE story_id = ?').all(current) as { depends_on_story_id: number }[];
      for (const dep of deps) {
        queue.push(dep.depends_on_story_id);
      }
    }

    return false;
  }

  // Status transition validation
  canTransitionStatus(entityType: 'epic' | 'story' | 'task', fromStatus: string, toStatus: string): boolean {
    const stmt = this.db.prepare(`
      SELECT allowed FROM status_transitions
      WHERE entity_type = ? AND from_status = ? AND to_status = ?
    `);
    const result = stmt.get(entityType, fromStatus, toStatus) as { allowed: number } | undefined;
    return result?.allowed === 1;
  }

  // Graph data for UI
  getDependencyGraph(projectId?: number): DependencyGraph {
    const stories = this.listStories(projectId ? { project_id: projectId } : {});
    const dependencies = this.listDependencies();

    const nodes: StoryNode[] = stories.map(story => {
      const storyDeps = dependencies.filter(d => d.story_id === story.id);
      const storyDependents = dependencies.filter(d => d.depends_on_story_id === story.id);

      return {
        id: story.id,
        title: story.title,
        status: story.status,
        priority: story.priority,
        epic_id: story.epic_id,
        dependencies: storyDeps.map(d => d.depends_on_story_id),
        dependents: storyDependents.map(d => d.story_id),
      };
    });

    const edges: DependencyEdge[] = dependencies.map(d => ({
      source: d.story_id,
      target: d.depends_on_story_id,
      type: d.dependency_type,
    }));

    return { nodes, edges };
  }

  getHierarchy(projectId?: number): HierarchyNode[] {
    const epics = this.listEpics(projectId ? { project_id: projectId } : {});

    return epics.map(epic => {
      const stories = this.listStories({ epic_id: epic.id });

      return {
        id: epic.id,
        type: 'epic',
        title: epic.title,
        status: epic.status,
        children: stories.map(story => {
          const tasks = this.listTasks({ story_id: story.id });

          return {
            id: story.id,
            type: 'story',
            title: story.title,
            status: story.status,
            children: tasks.map(task => ({
              id: task.id,
              type: 'task',
              title: task.title,
              status: task.status,
            })),
          };
        }),
      };
    });
  }

  close(): void {
    this.db.close();
  }
}
