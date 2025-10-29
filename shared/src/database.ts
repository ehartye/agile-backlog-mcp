import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import type {
  Project,
  User,
  Epic,
  Story,
  Task,
  Bug,
  Dependency,
  Relationship,
  Note,
  Sprint,
  SprintStory,
  SprintBug,
  SprintSnapshot,
  StatusTransition,
  SecurityLog,
  CreateProjectInput,
  CreateUserInput,
  CreateEpicInput,
  CreateStoryInput,
  CreateTaskInput,
  CreateBugInput,
  CreateDependencyInput,
  CreateRelationshipInput,
  CreateNoteInput,
  CreateSprintInput,
  UpdateUserInput,
  UpdateNoteInput,
  UpdateProjectInput,
  UpdateEpicInput,
  UpdateStoryInput,
  UpdateTaskInput,
  UpdateBugInput,
  UpdateSprintInput,
  EpicFilter,
  StoryFilter,
  TaskFilter,
  BugFilter,
  RelationshipFilter,
  NoteFilter,
  SprintFilter,
  ProjectContext,
  DependencyGraph,
  StoryNode,
  DependencyEdge,
  HierarchyNode,
  EntityType,
  RelationshipType,
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

    // Migration 5: Migrate dependencies to relationships table
    const relationshipsTableInfo = this.db.pragma('table_info(relationships)') as Array<{ name: string }>;
    const dependenciesTableInfo = this.db.pragma('table_info(dependencies)') as Array<{ name: string }>;

    if (relationshipsTableInfo.length > 0 && dependenciesTableInfo.length > 0) {
      // Check if we have dependencies that haven't been migrated yet
      const dependencyCount = this.db.prepare('SELECT COUNT(*) as count FROM dependencies').get() as { count: number };
      const relationshipCount = this.db.prepare(
        'SELECT COUNT(*) as count FROM relationships WHERE source_type = ? AND target_type = ?'
      ).get('story', 'story') as { count: number };

      // Only migrate if we have dependencies but fewer relationships than dependencies
      if (dependencyCount.count > 0 && relationshipCount.count < dependencyCount.count) {
        console.error(`[Migration] Migrating ${dependencyCount.count} dependencies to relationships table...`);

        // Migrate dependencies to relationships
        this.db.exec(`
          INSERT OR IGNORE INTO relationships (
            source_type, source_id, target_type, target_id,
            relationship_type, project_id, agent_identifier, created_at, updated_at
          )
          SELECT
            'story' as source_type,
            d.story_id as source_id,
            'story' as target_type,
            d.depends_on_story_id as target_id,
            d.dependency_type as relationship_type,
            s.project_id as project_id,
            COALESCE(s.agent_identifier, 'migration') as agent_identifier,
            d.created_at as created_at,
            d.created_at as updated_at
          FROM dependencies d
          JOIN stories s ON d.story_id = s.id
        `);

        const migratedCount = this.db.prepare(
          'SELECT COUNT(*) as count FROM relationships WHERE source_type = ? AND target_type = ?'
        ).get('story', 'story') as { count: number };

        console.error(`[Migration] Successfully migrated ${migratedCount.count} dependencies to relationships`);
        console.error('[Migration] Note: Old dependencies table kept for backward compatibility');
      }
    }

    // Migration 6: Add acceptance_criteria column to stories table
    const storiesTableInfo3 = this.db.pragma('table_info(stories)') as Array<{ name: string }>;
    const hasAcceptanceCriteria = storiesTableInfo3.length > 0 && storiesTableInfo3.some(col => col.name === 'acceptance_criteria');

    if (storiesTableInfo3.length > 0 && !hasAcceptanceCriteria) {
      console.error('[Migration] Adding acceptance_criteria to stories table...');
      this.db.exec('ALTER TABLE stories ADD COLUMN acceptance_criteria TEXT');
    }

    // Migration 7: Create users table and replace agent_identifier/last_modified_by with assigned_to
    const usersTableInfo = this.db.pragma('table_info(users)') as Array<{ name: string }>;
    const epicsTableInfo7 = this.db.pragma('table_info(epics)') as Array<{ name: string }>;
    const hasAssignedToInEpics = epicsTableInfo7.some(col => col.name === 'assigned_to');

    if (usersTableInfo.length === 0 || !hasAssignedToInEpics) {
      console.error('[Migration 7] Creating users table and migrating to assigned_to model...');

      // Step 0: Clean up any temporary tables from previous failed migrations
      this.db.exec(`
        DROP TABLE IF EXISTS epics_new;
        DROP TABLE IF EXISTS stories_new;
        DROP TABLE IF EXISTS tasks_new;
        DROP TABLE IF EXISTS bugs_new;
        DROP TABLE IF EXISTS relationships_new;
        DROP TABLE IF EXISTS sprints_new;
        DROP TABLE IF EXISTS security_logs_new;
      `);

      // Step 1: Create users table if it doesn't exist
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          user_id TEXT PRIMARY KEY,
          display_name TEXT NOT NULL,
          user_type TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          CHECK(user_type IN ('human', 'code_agent', 'doc_agent', 'qa_agent', 'system'))
        )
      `);

      // Step 2: Insert default system users
      this.db.exec(`
        INSERT OR IGNORE INTO users (user_id, display_name, user_type)
        VALUES
          ('Human_Admin', 'Administrator', 'human'),
          ('System', 'System', 'system'),
          ('Web_UI', 'Web UI (Legacy)', 'system')
      `);

      // Step 3: Migrate existing agent_identifier AND last_modified_by values to users table
      if (epicsTableInfo7.length > 0) {
        // Collect ALL unique identifiers from both agent_identifier and last_modified_by columns
        const existingUsers = this.db.prepare(`
          SELECT DISTINCT user_id FROM (
            SELECT agent_identifier as user_id FROM epics WHERE agent_identifier IS NOT NULL
            UNION
            SELECT last_modified_by as user_id FROM epics WHERE last_modified_by IS NOT NULL
            UNION
            SELECT agent_identifier as user_id FROM stories WHERE agent_identifier IS NOT NULL
            UNION
            SELECT last_modified_by as user_id FROM stories WHERE last_modified_by IS NOT NULL
            UNION
            SELECT agent_identifier as user_id FROM tasks WHERE agent_identifier IS NOT NULL
            UNION
            SELECT last_modified_by as user_id FROM tasks WHERE last_modified_by IS NOT NULL
            UNION
            SELECT assignee as user_id FROM tasks WHERE assignee IS NOT NULL
            UNION
            SELECT agent_identifier as user_id FROM bugs WHERE agent_identifier IS NOT NULL
            UNION
            SELECT last_modified_by as user_id FROM bugs WHERE last_modified_by IS NOT NULL
            UNION
            SELECT agent_identifier as user_id FROM relationships WHERE agent_identifier IS NOT NULL
            UNION
            SELECT agent_identifier as user_id FROM sprints WHERE agent_identifier IS NOT NULL
            UNION
            SELECT agent_identifier as user_id FROM security_logs WHERE agent_identifier IS NOT NULL
          )
        `).all() as Array<{ user_id: string }>;

        const insertUser = this.db.prepare(`
          INSERT OR IGNORE INTO users (user_id, display_name, user_type)
          VALUES (?, ?, ?)
        `);

        for (const { user_id } of existingUsers) {
          let userType: 'human' | 'code_agent' | 'doc_agent' | 'qa_agent' | 'system' = 'system';
          const displayName = user_id.replace(/_/g, ' ');

          const lowerUserId = user_id.toLowerCase();
          if (lowerUserId.includes('code')) {
            userType = 'code_agent';
          } else if (lowerUserId.includes('doc')) {
            userType = 'doc_agent';
          } else if (lowerUserId.includes('qa')) {
            userType = 'qa_agent';
          } else if (lowerUserId.includes('human') || lowerUserId.includes('admin')) {
            userType = 'human';
          }

          insertUser.run(user_id, displayName, userType);
        }
      }

      // Step 4: Migrate tables (only if they have old columns)
      // EPICS
      if (epicsTableInfo7.length > 0 && !hasAssignedToInEpics) {
        console.error('[Migration 7] Migrating epics table...');
        this.db.exec(`
          CREATE TABLE epics_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'todo',
            assigned_to TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
            FOREIGN KEY (assigned_to) REFERENCES users (user_id) ON DELETE SET NULL
          )
        `);

        this.db.exec(`
          INSERT INTO epics_new (id, project_id, title, description, status, assigned_to, created_at, updated_at)
          SELECT id, project_id, title, description, status,
                 COALESCE(last_modified_by, agent_identifier),
                 created_at, updated_at
          FROM epics
        `);

        this.db.exec('DROP TABLE epics');
        this.db.exec('ALTER TABLE epics_new RENAME TO epics');
      }

      // STORIES
      const storiesTableInfo7 = this.db.pragma('table_info(stories)') as Array<{ name: string }>;
      const hasAssignedToInStories = storiesTableInfo7.some(col => col.name === 'assigned_to');

      if (storiesTableInfo7.length > 0 && !hasAssignedToInStories) {
        console.error('[Migration 7] Migrating stories table...');
        this.db.exec(`
          CREATE TABLE stories_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            epic_id INTEGER,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            acceptance_criteria TEXT,
            status TEXT NOT NULL DEFAULT 'todo',
            priority TEXT NOT NULL DEFAULT 'medium',
            points INTEGER,
            assigned_to TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
            FOREIGN KEY (epic_id) REFERENCES epics (id) ON DELETE SET NULL,
            FOREIGN KEY (assigned_to) REFERENCES users (user_id) ON DELETE SET NULL
          )
        `);

        this.db.exec(`
          INSERT INTO stories_new (id, project_id, epic_id, title, description, acceptance_criteria,
                                   status, priority, points, assigned_to, created_at, updated_at)
          SELECT id, project_id, epic_id, title, description, acceptance_criteria,
                 status, priority, points,
                 COALESCE(last_modified_by, agent_identifier),
                 created_at, updated_at
          FROM stories
        `);

        this.db.exec('DROP TABLE stories');
        this.db.exec('ALTER TABLE stories_new RENAME TO stories');
      }

      // TASKS - merge assignee and agent_identifier into assigned_to, add task_type
      const tasksTableInfo7 = this.db.pragma('table_info(tasks)') as Array<{ name: string }>;
      const hasAssignedToInTasks = tasksTableInfo7.some(col => col.name === 'assigned_to');
      const hasTaskType = tasksTableInfo7.some(col => col.name === 'task_type');

      if (tasksTableInfo7.length > 0 && (!hasAssignedToInTasks || !hasTaskType)) {
        console.error('[Migration 7] Migrating tasks table...');
        this.db.exec(`
          CREATE TABLE tasks_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            story_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            task_type TEXT DEFAULT 'Code Change',
            status TEXT NOT NULL DEFAULT 'todo',
            assigned_to TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (story_id) REFERENCES stories (id) ON DELETE CASCADE,
            FOREIGN KEY (assigned_to) REFERENCES users (user_id) ON DELETE SET NULL,
            CHECK(task_type IN ('Code Change', 'Doc Change', 'Research', 'QA'))
          )
        `);

        this.db.exec(`
          INSERT INTO tasks_new (id, story_id, title, description, task_type, status, assigned_to, created_at, updated_at)
          SELECT id, story_id, title, description, 'Code Change' as task_type, status,
                 COALESCE(assignee, last_modified_by, agent_identifier),
                 created_at, updated_at
          FROM tasks
        `);

        this.db.exec('DROP TABLE tasks');
        this.db.exec('ALTER TABLE tasks_new RENAME TO tasks');
      }

      // BUGS
      const bugsTableInfo7 = this.db.pragma('table_info(bugs)') as Array<{ name: string }>;
      const hasAssignedToInBugs = bugsTableInfo7.some(col => col.name === 'assigned_to');

      if (bugsTableInfo7.length > 0 && !hasAssignedToInBugs) {
        console.error('[Migration 7] Migrating bugs table...');
        this.db.exec(`
          CREATE TABLE bugs_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            story_id INTEGER,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            severity TEXT NOT NULL DEFAULT 'major',
            error_message TEXT,
            status TEXT NOT NULL DEFAULT 'todo',
            priority TEXT NOT NULL DEFAULT 'medium',
            points INTEGER,
            assigned_to TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
            FOREIGN KEY (story_id) REFERENCES stories (id) ON DELETE SET NULL,
            FOREIGN KEY (assigned_to) REFERENCES users (user_id) ON DELETE SET NULL
          )
        `);

        this.db.exec(`
          INSERT INTO bugs_new (id, project_id, story_id, title, description, severity, error_message,
                                status, priority, points, assigned_to, created_at, updated_at)
          SELECT id, project_id, story_id, title, description, severity, error_message,
                 status, priority, points,
                 COALESCE(last_modified_by, agent_identifier),
                 created_at, updated_at
          FROM bugs
        `);

        this.db.exec('DROP TABLE bugs');
        this.db.exec('ALTER TABLE bugs_new RENAME TO bugs');
      }

      // RELATIONSHIPS
      const relationshipsTableInfo7 = this.db.pragma('table_info(relationships)') as Array<{ name: string }>;
      const hasCreatedByInRelationships = relationshipsTableInfo7.some(col => col.name === 'created_by');

      if (relationshipsTableInfo7.length > 0 && !hasCreatedByInRelationships) {
        console.error('[Migration 7] Migrating relationships table...');
        this.db.exec(`
          CREATE TABLE relationships_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source_type TEXT NOT NULL,
            source_id INTEGER NOT NULL,
            target_type TEXT NOT NULL,
            target_id INTEGER NOT NULL,
            relationship_type TEXT NOT NULL,
            project_id INTEGER NOT NULL,
            created_by TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
            FOREIGN KEY (created_by) REFERENCES users (user_id) ON DELETE RESTRICT,
            UNIQUE(source_type, source_id, target_type, target_id, relationship_type)
          )
        `);

        this.db.exec(`
          INSERT INTO relationships_new (id, source_type, source_id, target_type, target_id,
                                          relationship_type, project_id, created_by, created_at, updated_at)
          SELECT id, source_type, source_id, target_type, target_id,
                 relationship_type, project_id, agent_identifier,
                 created_at, updated_at
          FROM relationships
        `);

        this.db.exec('DROP TABLE relationships');
        this.db.exec('ALTER TABLE relationships_new RENAME TO relationships');
      }

      // SPRINTS
      const sprintsTableInfo7 = this.db.pragma('table_info(sprints)') as Array<{ name: string }>;
      const hasCreatedByInSprints = sprintsTableInfo7.some(col => col.name === 'created_by');

      if (sprintsTableInfo7.length > 0 && !hasCreatedByInSprints) {
        console.error('[Migration 7] Migrating sprints table...');
        this.db.exec(`
          CREATE TABLE sprints_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            goal TEXT,
            start_date TEXT NOT NULL,
            end_date TEXT NOT NULL,
            capacity_points INTEGER,
            status TEXT NOT NULL DEFAULT 'planning',
            created_by TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
            FOREIGN KEY (created_by) REFERENCES users (user_id) ON DELETE SET NULL
          )
        `);

        this.db.exec(`
          INSERT INTO sprints_new (id, project_id, name, goal, start_date, end_date, capacity_points,
                                   status, created_by, created_at, updated_at)
          SELECT id, project_id, name, goal, start_date, end_date, capacity_points,
                 status, agent_identifier, created_at, updated_at
          FROM sprints
        `);

        this.db.exec('DROP TABLE sprints');
        this.db.exec('ALTER TABLE sprints_new RENAME TO sprints');
      }

      // SECURITY LOGS
      const securityLogsTableInfo7 = this.db.pragma('table_info(security_logs)') as Array<{ name: string }>;
      const hasUserIdInLogs = securityLogsTableInfo7.some(col => col.name === 'user_id');

      if (securityLogsTableInfo7.length > 0 && !hasUserIdInLogs) {
        console.error('[Migration 7] Migrating security_logs table...');
        this.db.exec(`
          CREATE TABLE security_logs_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_type TEXT NOT NULL,
            project_id INTEGER,
            user_id TEXT,
            attempted_path TEXT NOT NULL,
            entity_type TEXT NOT NULL,
            entity_id INTEGER,
            message TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE SET NULL,
            FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE SET NULL
          )
        `);

        this.db.exec(`
          INSERT INTO security_logs_new (id, event_type, project_id, user_id, attempted_path,
                                          entity_type, entity_id, message, created_at)
          SELECT id, event_type, project_id, agent_identifier, attempted_path,
                 entity_type, entity_id, message, created_at
          FROM security_logs
        `);

        this.db.exec('DROP TABLE security_logs');
        this.db.exec('ALTER TABLE security_logs_new RENAME TO security_logs');
      }

      // Create indexes
      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_epics_assigned ON epics(assigned_to);
        CREATE INDEX IF NOT EXISTS idx_stories_assigned ON stories(assigned_to);
        CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to);
        CREATE INDEX IF NOT EXISTS idx_bugs_assigned ON bugs(assigned_to);
        CREATE INDEX IF NOT EXISTS idx_relationships_created_by ON relationships(created_by);
        CREATE INDEX IF NOT EXISTS idx_sprints_created_by ON sprints(created_by);
        CREATE INDEX IF NOT EXISTS idx_security_logs_user ON security_logs(user_id);
        CREATE INDEX IF NOT EXISTS idx_users_type ON users(user_type);
      `);

      console.error('[Migration 7] Successfully migrated to assigned_to/created_by model');
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
        acceptance_criteria TEXT,
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

    // Create bugs table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS bugs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        story_id INTEGER,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        severity TEXT NOT NULL DEFAULT 'major',
        error_message TEXT,
        status TEXT NOT NULL DEFAULT 'todo',
        priority TEXT NOT NULL DEFAULT 'medium',
        points INTEGER,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        agent_identifier TEXT,
        last_modified_by TEXT,
        FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
        FOREIGN KEY (story_id) REFERENCES stories (id) ON DELETE SET NULL
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

    // Create relationships table (polymorphic many-to-many relationships)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS relationships (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_type TEXT NOT NULL,
        source_id INTEGER NOT NULL,
        target_type TEXT NOT NULL,
        target_id INTEGER NOT NULL,
        relationship_type TEXT NOT NULL,
        project_id INTEGER NOT NULL,
        agent_identifier TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
        UNIQUE(source_type, source_id, target_type, target_id, relationship_type)
      )
    `);

    // Create indexes for relationships
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_relationships_source ON relationships(source_type, source_id);
      CREATE INDEX IF NOT EXISTS idx_relationships_target ON relationships(target_type, target_id);
      CREATE INDEX IF NOT EXISTS idx_relationships_project ON relationships(project_id);
    `);

    // Create notes table (polymorphic notes for any entity)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        parent_type TEXT NOT NULL,
        parent_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        agent_identifier TEXT NOT NULL,
        author_name TEXT,
        project_id INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
      )
    `);

    // Create indexes for notes
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_notes_parent ON notes(parent_type, parent_id);
      CREATE INDEX IF NOT EXISTS idx_notes_project ON notes(project_id);
      CREATE INDEX IF NOT EXISTS idx_notes_agent ON notes(agent_identifier);
    `);

    // Create sprints table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sprints (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        goal TEXT,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        capacity_points INTEGER,
        status TEXT NOT NULL DEFAULT 'planning',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        agent_identifier TEXT,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_sprints_project ON sprints(project_id);
      CREATE INDEX IF NOT EXISTS idx_sprints_status ON sprints(status);
    `);

    // Create sprint_stories junction table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sprint_stories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sprint_id INTEGER NOT NULL,
        story_id INTEGER NOT NULL,
        added_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        added_by TEXT,
        FOREIGN KEY (sprint_id) REFERENCES sprints(id) ON DELETE CASCADE,
        FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE,
        UNIQUE(sprint_id, story_id)
      );

      CREATE INDEX IF NOT EXISTS idx_sprint_stories_sprint ON sprint_stories(sprint_id);
      CREATE INDEX IF NOT EXISTS idx_sprint_stories_story ON sprint_stories(story_id);
    `);

    // Create sprint_bugs junction table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sprint_bugs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sprint_id INTEGER NOT NULL,
        bug_id INTEGER NOT NULL,
        added_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        added_by TEXT,
        FOREIGN KEY (sprint_id) REFERENCES sprints(id) ON DELETE CASCADE,
        FOREIGN KEY (bug_id) REFERENCES bugs(id) ON DELETE CASCADE,
        UNIQUE(sprint_id, bug_id)
      );

      CREATE INDEX IF NOT EXISTS idx_sprint_bugs_sprint ON sprint_bugs(sprint_id);
      CREATE INDEX IF NOT EXISTS idx_sprint_bugs_bug ON sprint_bugs(bug_id);
    `);

    // Create sprint_snapshots table for burndown tracking
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sprint_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sprint_id INTEGER NOT NULL,
        snapshot_date TEXT NOT NULL,
        remaining_points INTEGER NOT NULL,
        completed_points INTEGER NOT NULL,
        added_points INTEGER NOT NULL DEFAULT 0,
        removed_points INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sprint_id) REFERENCES sprints(id) ON DELETE CASCADE,
        UNIQUE(sprint_id, snapshot_date)
      );

      CREATE INDEX IF NOT EXISTS idx_sprint_snapshots_sprint ON sprint_snapshots(sprint_id);
      CREATE INDEX IF NOT EXISTS idx_sprint_snapshots_date ON sprint_snapshots(snapshot_date);
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
      // Epic, Story, Task, and Bug all have the same workflow
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
      ['bug', 'todo', 'in_progress'],
      ['bug', 'in_progress', 'review'],
      ['bug', 'review', 'done'],
      ['bug', 'review', 'in_progress'],
      ['bug', 'in_progress', 'blocked'],
      ['bug', 'blocked', 'in_progress'],
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

  getProjectIdForBug(bugId: number): number | null {
    const stmt = this.db.prepare('SELECT project_id FROM bugs WHERE id = ?');
    const result = stmt.get(bugId) as { project_id: number } | undefined;
    return result?.project_id ?? null;
  }

  // User operations
  createUser(input: CreateUserInput): User {
    const stmt = this.db.prepare(`
      INSERT INTO users (user_id, display_name, user_type)
      VALUES (?, ?, ?)
    `);
    stmt.run(input.user_id, input.display_name, input.user_type);
    return this.getUser(input.user_id)!;
  }

  getUser(user_id: string): User | null {
    const stmt = this.db.prepare('SELECT * FROM users WHERE user_id = ?');
    return stmt.get(user_id) as User | null;
  }

  listUsers(): User[] {
    const stmt = this.db.prepare('SELECT * FROM users ORDER BY user_type, display_name');
    return stmt.all() as User[];
  }

  updateUser(input: UpdateUserInput): User {
    const updates: string[] = [];
    const values: any[] = [];

    if (input.display_name !== undefined) {
      updates.push('display_name = ?');
      values.push(input.display_name);
    }
    if (input.user_type !== undefined) {
      updates.push('user_type = ?');
      values.push(input.user_type);
    }

    updates.push('updated_at = datetime(\'now\')');
    values.push(input.user_id);

    const stmt = this.db.prepare(`
      UPDATE users SET ${updates.join(', ')} WHERE user_id = ?
    `);
    stmt.run(...values);
    return this.getUser(input.user_id)!;
  }

  deleteUser(user_id: string): void {
    // Note: This will fail if user has assigned items due to FK constraints
    this.db.prepare('DELETE FROM users WHERE user_id = ?').run(user_id);
  }

  // Epic operations
  createEpic(input: CreateEpicInput): Epic {
    const stmt = this.db.prepare(`
      INSERT INTO epics (project_id, title, description, status, assigned_to)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      input.project_id,
      input.title,
      input.description,
      input.status || 'todo',
      input.assigned_to ?? null
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
    if (filter?.assigned_to) {
      query += ' AND assigned_to = ?';
      values.push(filter.assigned_to);
    }

    query += ' ORDER BY created_at DESC';

    const stmt = this.db.prepare(query);
    return stmt.all(...values) as Epic[];
  }

  updateEpic(input: UpdateEpicInput): Epic {
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
    if (input.assigned_to !== undefined) {
      updates.push('assigned_to = ?');
      values.push(input.assigned_to);
    }

    updates.push('updated_at = datetime(\'now\')');
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
  createStory(input: CreateStoryInput): Story {
    const stmt = this.db.prepare(`
      INSERT INTO stories (project_id, epic_id, title, description, acceptance_criteria, status, priority, points, assigned_to)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      input.project_id,
      input.epic_id ?? null,
      input.title,
      input.description,
      input.acceptance_criteria ?? null,
      input.status || 'todo',
      input.priority || 'medium',
      input.points ?? null,
      input.assigned_to ?? null
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
    if (filter?.assigned_to) {
      query += ' AND assigned_to = ?';
      values.push(filter.assigned_to);
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

  updateStory(input: UpdateStoryInput): Story {
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
    if (input.acceptance_criteria !== undefined) {
      updates.push('acceptance_criteria = ?');
      values.push(input.acceptance_criteria);
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
    if (input.assigned_to !== undefined) {
      updates.push('assigned_to = ?');
      values.push(input.assigned_to);
    }

    updates.push('updated_at = datetime(\'now\')');
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

  // Bug operations
  createBug(input: CreateBugInput): Bug {
    const stmt = this.db.prepare(`
      INSERT INTO bugs (project_id, story_id, title, description, severity, error_message, status, priority, points, assigned_to)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      input.project_id,
      input.story_id ?? null,
      input.title,
      input.description,
      input.severity,
      input.error_message ?? null,
      input.status || 'todo',
      input.priority || 'medium',
      input.points ?? null,
      input.assigned_to ?? null
    );
    return this.getBug(result.lastInsertRowid as number)!;
  }

  getBug(id: number): Bug | null {
    const stmt = this.db.prepare('SELECT * FROM bugs WHERE id = ?');
    return stmt.get(id) as Bug | null;
  }

  listBugs(filter?: BugFilter): Bug[] {
    let query = 'SELECT * FROM bugs WHERE 1=1';
    const values: any[] = [];

    if (filter?.project_id !== undefined) {
      query += ' AND project_id = ?';
      values.push(filter.project_id);
    }
    if (filter?.story_id !== undefined) {
      query += ' AND story_id = ?';
      values.push(filter.story_id);
    }
    if (filter?.status) {
      query += ' AND status = ?';
      values.push(filter.status);
    }
    if (filter?.priority) {
      query += ' AND priority = ?';
      values.push(filter.priority);
    }
    if (filter?.severity) {
      query += ' AND severity = ?';
      values.push(filter.severity);
    }
    if (filter?.assigned_to) {
      query += ' AND assigned_to = ?';
      values.push(filter.assigned_to);
    }

    query += ' ORDER BY created_at DESC';

    const stmt = this.db.prepare(query);
    return stmt.all(...values) as Bug[];
  }

  updateBug(input: UpdateBugInput): Bug {
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
    if (input.severity !== undefined) {
      updates.push('severity = ?');
      values.push(input.severity);
    }
    if (input.error_message !== undefined) {
      updates.push('error_message = ?');
      values.push(input.error_message);
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
    if (input.assigned_to !== undefined) {
      updates.push('assigned_to = ?');
      values.push(input.assigned_to);
    }

    updates.push('updated_at = datetime(\'now\')');
    values.push(input.id);

    const stmt = this.db.prepare(`
      UPDATE bugs SET ${updates.join(', ')} WHERE id = ?
    `);
    stmt.run(...values);
    return this.getBug(input.id)!;
  }

  deleteBug(id: number): void {
    this.db.prepare('DELETE FROM bugs WHERE id = ?').run(id);
  }

  // Task operations
  createTask(input: CreateTaskInput): Task {
    const stmt = this.db.prepare(`
      INSERT INTO tasks (story_id, title, description, task_type, status, assigned_to)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      input.story_id,
      input.title,
      input.description,
      input.task_type || 'Code Change',
      input.status || 'todo',
      input.assigned_to ?? null
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
    if (filter?.task_type) {
      query += ' AND t.task_type = ?';
      values.push(filter.task_type);
    }
    if (filter?.assigned_to) {
      query += ' AND t.assigned_to = ?';
      values.push(filter.assigned_to);
    }

    query += ' ORDER BY t.created_at DESC';

    const stmt = this.db.prepare(query);
    return stmt.all(...values) as Task[];
  }

  updateTask(input: UpdateTaskInput): Task {
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
    if (input.task_type !== undefined) {
      updates.push('task_type = ?');
      values.push(input.task_type);
    }
    if (input.status !== undefined) {
      updates.push('status = ?');
      values.push(input.status);
    }
    if (input.assigned_to !== undefined) {
      updates.push('assigned_to = ?');
      values.push(input.assigned_to);
    }

    updates.push('updated_at = datetime(\'now\')');
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

  // Relationship operations (polymorphic many-to-many)
  createRelationship(input: CreateRelationshipInput): Relationship {
    // Check for circular relationships on dependency types
    if (input.relationship_type === 'blocks' || input.relationship_type === 'blocked_by' || input.relationship_type === 'depends_on') {
      if (this.wouldCreateCircularRelationship(
        input.source_type,
        input.source_id,
        input.target_type,
        input.target_id,
        input.relationship_type
      )) {
        throw new Error('Cannot create relationship: would create a circular dependency');
      }
    }

    const stmt = this.db.prepare(`
      INSERT INTO relationships (
        source_type, source_id, target_type, target_id,
        relationship_type, project_id, created_by
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      input.source_type,
      input.source_id,
      input.target_type,
      input.target_id,
      input.relationship_type,
      input.project_id,
      input.created_by
    );
    return this.getRelationship(result.lastInsertRowid as number)!;
  }

  getRelationship(id: number): Relationship | null {
    const stmt = this.db.prepare('SELECT * FROM relationships WHERE id = ?');
    return stmt.get(id) as Relationship | null;
  }

  listRelationships(filter?: RelationshipFilter): Relationship[] {
    let query = 'SELECT * FROM relationships WHERE 1=1';
    const values: any[] = [];

    if (filter?.project_id !== undefined) {
      query += ' AND project_id = ?';
      values.push(filter.project_id);
    }
    if (filter?.source_type) {
      query += ' AND source_type = ?';
      values.push(filter.source_type);
    }
    if (filter?.source_id !== undefined) {
      query += ' AND source_id = ?';
      values.push(filter.source_id);
    }
    if (filter?.target_type) {
      query += ' AND target_type = ?';
      values.push(filter.target_type);
    }
    if (filter?.target_id !== undefined) {
      query += ' AND target_id = ?';
      values.push(filter.target_id);
    }
    if (filter?.relationship_type) {
      query += ' AND relationship_type = ?';
      values.push(filter.relationship_type);
    }

    query += ' ORDER BY created_at DESC';

    const stmt = this.db.prepare(query);
    return stmt.all(...values) as Relationship[];
  }

  deleteRelationship(id: number): void {
    this.db.prepare('DELETE FROM relationships WHERE id = ?').run(id);
  }

  getRelationshipsForEntity(entityType: EntityType, entityId: number): Relationship[] {
    const stmt = this.db.prepare(`
      SELECT * FROM relationships
      WHERE (source_type = ? AND source_id = ?)
         OR (target_type = ? AND target_id = ?)
      ORDER BY created_at DESC
    `);
    return stmt.all(entityType, entityId, entityType, entityId) as Relationship[];
  }

  private wouldCreateCircularRelationship(
    sourceType: EntityType,
    sourceId: number,
    targetType: EntityType,
    targetId: number,
    relationshipType: RelationshipType
  ): boolean {
    // Only check for circular dependencies on dependency-type relationships
    if (relationshipType !== 'blocks' && relationshipType !== 'blocked_by' && relationshipType !== 'depends_on') {
      return false;
    }

    // BFS to check if target depends on source (directly or transitively)
    const visited = new Set<string>();
    const queue: Array<{ type: EntityType; id: number }> = [{ type: targetType, id: targetId }];

    while (queue.length > 0) {
      const current = queue.shift()!;
      const key = `${current.type}:${current.id}`;

      if (current.type === sourceType && current.id === sourceId) {
        return true;
      }
      if (visited.has(key)) {
        continue;
      }
      visited.add(key);

      // Find all entities that current depends on
      const deps = this.db.prepare(`
        SELECT target_type, target_id
        FROM relationships
        WHERE source_type = ? AND source_id = ?
          AND (relationship_type = 'blocks' OR relationship_type = 'blocked_by' OR relationship_type = 'depends_on')
      `).all(current.type, current.id) as Array<{ target_type: EntityType; target_id: number }>;

      for (const dep of deps) {
        queue.push({ type: dep.target_type, id: dep.target_id });
      }
    }

    return false;
  }

  // Note operations (polymorphic notes for any entity)
  createNote(input: CreateNoteInput): Note {
    const stmt = this.db.prepare(`
      INSERT INTO notes (parent_type, parent_id, content, agent_identifier, author_name, project_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      input.parent_type,
      input.parent_id,
      input.content,
      input.agent_identifier,
      input.author_name ?? null,
      input.project_id
    );
    return this.getNote(result.lastInsertRowid as number)!;
  }

  getNote(id: number): Note | null {
    const stmt = this.db.prepare('SELECT * FROM notes WHERE id = ?');
    return stmt.get(id) as Note | null;
  }

  listNotes(filter?: NoteFilter): Note[] {
    let query = 'SELECT * FROM notes WHERE 1=1';
    const values: any[] = [];

    if (filter?.project_id !== undefined) {
      query += ' AND project_id = ?';
      values.push(filter.project_id);
    }
    if (filter?.parent_type) {
      query += ' AND parent_type = ?';
      values.push(filter.parent_type);
    }
    if (filter?.parent_id !== undefined) {
      query += ' AND parent_id = ?';
      values.push(filter.parent_id);
    }
    if (filter?.agent_identifier) {
      query += ' AND agent_identifier = ?';
      values.push(filter.agent_identifier);
    }

    query += ' ORDER BY created_at DESC';

    const stmt = this.db.prepare(query);
    return stmt.all(...values) as Note[];
  }

  updateNote(input: UpdateNoteInput): Note {
    const updates: string[] = [];
    const values: any[] = [];

    updates.push('content = ?');
    values.push(input.content);

    updates.push('agent_identifier = ?');
    values.push(input.agent_identifier);

    if (input.author_name !== undefined) {
      updates.push('author_name = ?');
      values.push(input.author_name);
    }

    updates.push('updated_at = datetime(\'now\')');
    values.push(input.id);

    const stmt = this.db.prepare(`
      UPDATE notes SET ${updates.join(', ')} WHERE id = ?
    `);
    stmt.run(...values);
    return this.getNote(input.id)!;
  }

  deleteNote(id: number): void {
    this.db.prepare('DELETE FROM notes WHERE id = ?').run(id);
  }

  getNotesForEntity(entityType: EntityType, entityId: number): Note[] {
    const stmt = this.db.prepare(`
      SELECT * FROM notes
      WHERE parent_type = ? AND parent_id = ?
      ORDER BY created_at DESC
    `);
    return stmt.all(entityType, entityId) as Note[];
  }

  // Sprint methods
  createSprint(input: CreateSprintInput, agentIdentifier?: string): Sprint {
    const stmt = this.db.prepare(`
      INSERT INTO sprints (project_id, name, goal, start_date, end_date, capacity_points, status, agent_identifier)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      input.project_id,
      input.name,
      input.goal ?? null,
      input.start_date,
      input.end_date,
      input.capacity_points ?? null,
      input.status || 'planning',
      agentIdentifier || null
    );
    return this.getSprint(result.lastInsertRowid as number)!;
  }

  getSprint(id: number): Sprint | null {
    const stmt = this.db.prepare('SELECT * FROM sprints WHERE id = ?');
    return stmt.get(id) as Sprint | null;
  }

  listSprints(filter?: SprintFilter): Sprint[] {
    let query = 'SELECT * FROM sprints WHERE 1=1';
    const params: any[] = [];

    if (filter?.project_id) {
      query += ' AND project_id = ?';
      params.push(filter.project_id);
    }

    if (filter?.status) {
      query += ' AND status = ?';
      params.push(filter.status);
    }

    query += ' ORDER BY start_date DESC';

    const stmt = this.db.prepare(query);
    return stmt.all(...params) as Sprint[];
  }

  updateSprint(input: UpdateSprintInput, agentIdentifier?: string): Sprint {
    const current = this.getSprint(input.id);
    if (!current) {
      throw new Error(`Sprint ${input.id} not found`);
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (input.name !== undefined) {
      updates.push('name = ?');
      params.push(input.name);
    }

    if (input.goal !== undefined) {
      updates.push('goal = ?');
      params.push(input.goal);
    }

    if (input.start_date !== undefined) {
      updates.push('start_date = ?');
      params.push(input.start_date);
    }

    if (input.end_date !== undefined) {
      updates.push('end_date = ?');
      params.push(input.end_date);
    }

    if (input.capacity_points !== undefined) {
      updates.push('capacity_points = ?');
      params.push(input.capacity_points);
    }

    if (input.status !== undefined) {
      updates.push('status = ?');
      params.push(input.status);
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');

    if (agentIdentifier) {
      updates.push('agent_identifier = ?');
      params.push(agentIdentifier);
    }

    params.push(input.id);

    const stmt = this.db.prepare(`
      UPDATE sprints
      SET ${updates.join(', ')}
      WHERE id = ?
    `);
    stmt.run(...params);

    return this.getSprint(input.id)!;
  }

  deleteSprint(id: number): void {
    this.db.prepare('DELETE FROM sprints WHERE id = ?').run(id);
  }

  // Sprint-Story association methods
  addStoryToSprint(sprintId: number, storyId: number, addedBy?: string): SprintStory {
    const stmt = this.db.prepare(`
      INSERT INTO sprint_stories (sprint_id, story_id, added_by)
      VALUES (?, ?, ?)
    `);
    const result = stmt.run(sprintId, storyId, addedBy || null);

    const getSt = this.db.prepare('SELECT * FROM sprint_stories WHERE id = ?');
    return getSt.get(result.lastInsertRowid) as SprintStory;
  }

  removeStoryFromSprint(sprintId: number, storyId: number): void {
    this.db.prepare(`
      DELETE FROM sprint_stories
      WHERE sprint_id = ? AND story_id = ?
    `).run(sprintId, storyId);
  }

  getSprintStories(sprintId: number): Story[] {
    const stmt = this.db.prepare(`
      SELECT s.* FROM stories s
      INNER JOIN sprint_stories ss ON s.id = ss.story_id
      WHERE ss.sprint_id = ?
      ORDER BY ss.added_at
    `);
    return stmt.all(sprintId) as Story[];
  }

  getStoryCurrentSprint(storyId: number): Sprint | null {
    const stmt = this.db.prepare(`
      SELECT spr.* FROM sprints spr
      INNER JOIN sprint_stories ss ON spr.id = ss.sprint_id
      WHERE ss.story_id = ? AND spr.status IN ('planning', 'active')
      ORDER BY spr.start_date DESC
      LIMIT 1
    `);
    return stmt.get(storyId) as Sprint | null;
  }

  // Sprint-Bug association methods
  addBugToSprint(sprintId: number, bugId: number, addedBy?: string): SprintBug {
    const stmt = this.db.prepare(`
      INSERT INTO sprint_bugs (sprint_id, bug_id, added_by)
      VALUES (?, ?, ?)
    `);
    const result = stmt.run(sprintId, bugId, addedBy || null);

    const getSt = this.db.prepare('SELECT * FROM sprint_bugs WHERE id = ?');
    return getSt.get(result.lastInsertRowid) as SprintBug;
  }

  removeBugFromSprint(sprintId: number, bugId: number): void {
    this.db.prepare(`
      DELETE FROM sprint_bugs
      WHERE sprint_id = ? AND bug_id = ?
    `).run(sprintId, bugId);
  }

  getSprintBugs(sprintId: number): Bug[] {
    const stmt = this.db.prepare(`
      SELECT b.* FROM bugs b
      INNER JOIN sprint_bugs sb ON b.id = sb.bug_id
      WHERE sb.sprint_id = ?
      ORDER BY sb.added_at
    `);
    return stmt.all(sprintId) as Bug[];
  }

  getBugCurrentSprint(bugId: number): Sprint | null {
    const stmt = this.db.prepare(`
      SELECT spr.* FROM sprints spr
      INNER JOIN sprint_bugs sb ON spr.id = sb.sprint_id
      WHERE sb.bug_id = ? AND spr.status IN ('planning', 'active')
      ORDER BY spr.start_date DESC
      LIMIT 1
    `);
    return stmt.get(bugId) as Sprint | null;
  }

  // Sprint snapshot methods for burndown tracking
  createSprintSnapshot(sprintId: number, date?: string): SprintSnapshot {
    const snapshotDate = date || new Date().toISOString().split('T')[0];

    // Calculate current metrics from stories and bugs
    const stories = this.getSprintStories(sprintId);
    const bugs = this.getSprintBugs(sprintId);
    let completedPoints = 0;
    let remainingPoints = 0;

    for (const story of stories) {
      const points = story.points || 0;
      if (story.status === 'done') {
        completedPoints += points;
      } else {
        remainingPoints += points;
      }
    }

    for (const bug of bugs) {
      const points = bug.points || 0;
      if (bug.status === 'done') {
        completedPoints += points;
      } else {
        remainingPoints += points;
      }
    }

    // Check if snapshot already exists for this date
    const existing = this.db.prepare(`
      SELECT * FROM sprint_snapshots
      WHERE sprint_id = ? AND snapshot_date = ?
    `).get(sprintId, snapshotDate) as SprintSnapshot | undefined;

    if (existing) {
      // Update existing snapshot
      this.db.prepare(`
        UPDATE sprint_snapshots
        SET remaining_points = ?, completed_points = ?
        WHERE id = ?
      `).run(remainingPoints, completedPoints, existing.id);
      return this.db.prepare('SELECT * FROM sprint_snapshots WHERE id = ?').get(existing.id) as SprintSnapshot;
    } else {
      // Create new snapshot
      const stmt = this.db.prepare(`
        INSERT INTO sprint_snapshots (sprint_id, snapshot_date, remaining_points, completed_points, added_points, removed_points)
        VALUES (?, ?, ?, ?, 0, 0)
      `);
      const result = stmt.run(sprintId, snapshotDate, remainingPoints, completedPoints);
      return this.db.prepare('SELECT * FROM sprint_snapshots WHERE id = ?').get(result.lastInsertRowid) as SprintSnapshot;
    }
  }

  getSprintSnapshots(sprintId: number): SprintSnapshot[] {
    const stmt = this.db.prepare(`
      SELECT * FROM sprint_snapshots
      WHERE sprint_id = ?
      ORDER BY snapshot_date ASC
    `);
    return stmt.all(sprintId) as SprintSnapshot[];
  }

  calculateSprintCapacity(sprintId: number): { capacity: number | null; committed: number; completed: number; remaining: number } {
    const sprint = this.getSprint(sprintId);
    if (!sprint) {
      throw new Error(`Sprint ${sprintId} not found`);
    }

    const stories = this.getSprintStories(sprintId);
    const bugs = this.getSprintBugs(sprintId);
    let committedPoints = 0;
    let completedPoints = 0;
    let remainingPoints = 0;

    for (const story of stories) {
      const points = story.points || 0;
      committedPoints += points;
      if (story.status === 'done') {
        completedPoints += points;
      } else {
        remainingPoints += points;
      }
    }

    for (const bug of bugs) {
      const points = bug.points || 0;
      committedPoints += points;
      if (bug.status === 'done') {
        completedPoints += points;
      } else {
        remainingPoints += points;
      }
    }

    return {
      capacity: sprint.capacity_points,
      committed: committedPoints,
      completed: completedPoints,
      remaining: remainingPoints,
    };
  }

  calculateVelocity(projectId: number, sprintCount: number = 3): number[] {
    const sprints = this.listSprints({ project_id: projectId, status: 'completed' });
    const recentSprints = sprints.slice(0, sprintCount);

    const velocities: number[] = [];
    for (const sprint of recentSprints) {
      const stories = this.getSprintStories(sprint.id);
      let completedPoints = 0;
      for (const story of stories) {
        if (story.status === 'done') {
          completedPoints += story.points || 0;
        }
      }
      velocities.push(completedPoints);
    }

    return velocities;
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
