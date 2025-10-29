# User System & assigned_to Field Implementation Analysis

**Date**: 2025-10-29
**Analyzed By**: code-deep-dive-analyst
**Status**: BREAKING CHANGE ANALYSIS

## Executive Summary

This analysis evaluates the architectural changes needed to:
1. Add a `users` table with human-readable IDs
2. **REPLACE** `agent_identifier` and `last_modified_by` fields with a single `assigned_to` field (BREAKING CHANGE)
3. Add `task_type` enumeration to tasks
4. Ensure Web UI actions are attributed to "Human_Admin"
5. Recommend a strategy for keeping shared/src/types.ts and web-ui/src/types/index.ts in sync

**Critical Finding**: The replacement of `agent_identifier` and `last_modified_by` with `assigned_to` is a BREAKING CHANGE that will require:
- Database migration (column renaming/restructuring)
- MCP tool interface updates (removing `agent_identifier` and `modified_by` parameters)
- Web UI updates to pass `assigned_to` instead of hardcoded 'web-ui'
- Security log updates
- Conflict detection logic redesign

---

## 1. Current State Analysis

### 1.1 Database Schema

**Current Attribution Model** (`shared/src/database.ts`):

```sql
-- Epics table (lines 328-342)
CREATE TABLE IF NOT EXISTS epics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'todo',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  agent_identifier TEXT,              -- TO BE REMOVED
  last_modified_by TEXT,               -- TO BE REMOVED
  FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
);

-- Stories table (lines 344-363)
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
  agent_identifier TEXT,              -- TO BE REMOVED
  last_modified_by TEXT,               -- TO BE REMOVED
  FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
  FOREIGN KEY (epic_id) REFERENCES epics (id) ON DELETE SET NULL
);

-- Tasks table (lines 388-402)
CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  story_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'todo',
  assignee TEXT,                       -- DIFFERENT: already has assignee
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  agent_identifier TEXT,              -- TO BE REMOVED
  last_modified_by TEXT,               -- TO BE REMOVED
  FOREIGN KEY (story_id) REFERENCES stories (id) ON DELETE CASCADE
);

-- Bugs table (lines 365-385)
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
  agent_identifier TEXT,              -- TO BE REMOVED
  last_modified_by TEXT,               -- TO BE REMOVED
  FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
  FOREIGN KEY (story_id) REFERENCES stories (id) ON DELETE SET NULL
);

-- Relationships table (lines 418-434)
CREATE TABLE IF NOT EXISTS relationships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_type TEXT NOT NULL,
  source_id INTEGER NOT NULL,
  target_type TEXT NOT NULL,
  target_id INTEGER NOT NULL,
  relationship_type TEXT NOT NULL,
  project_id INTEGER NOT NULL,
  agent_identifier TEXT NOT NULL,      -- TO BE REMOVED
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
  UNIQUE(source_type, source_id, target_type, target_id, relationship_type)
);

-- Sprints table (lines 467-485)
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
  agent_identifier TEXT,               -- TO BE REMOVED
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Security logs (lines 313-326)
CREATE TABLE IF NOT EXISTS security_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,
  project_id INTEGER,
  agent_identifier TEXT,               -- TO BE REMOVED
  attempted_path TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id INTEGER,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE SET NULL
);
```

**Key Observations**:
1. **Dual attribution system**: Both `agent_identifier` (for tracking) and `last_modified_by` (for conflict detection)
2. **Tasks table special case**: Already has `assignee` field, distinct from `agent_identifier`
3. **Relationships require agent_identifier**: Currently NOT NULL
4. **No task_type field** in tasks table
5. **No users table** to normalize user identifiers

### 1.2 Type Definitions

**shared/src/types.ts** (Lines 20-76):
```typescript
export interface Epic {
  id: number;
  project_id: number;
  title: string;
  description: string;
  status: EntityStatus;
  created_at: string;
  updated_at: string;
  agent_identifier: string | null;      // TO BE REMOVED
  last_modified_by: string | null;      // TO BE REMOVED
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
  agent_identifier: string | null;      // TO BE REMOVED
  last_modified_by: string | null;      // TO BE REMOVED
}

export interface Task {
  id: number;
  story_id: number;
  title: string;
  description: string;
  status: EntityStatus;
  assignee: string | null;              // KEEP - but different semantics
  created_at: string;
  updated_at: string;
  agent_identifier: string | null;      // TO BE REMOVED
  last_modified_by: string | null;      // TO BE REMOVED
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
  created_at: string;
  updated_at: string;
  agent_identifier: string | null;      // TO BE REMOVED
  last_modified_by: string | null;      // TO BE REMOVED
}
```

**web-ui/src/types/index.ts** (Lines 9-61):
```typescript
// COMPLETELY DUPLICATED - different from shared types!
export interface Epic {
  id: number;
  project_id: number;
  title: string;
  description: string;
  status: EntityStatus;
  created_at: string;
  updated_at: string;
  last_modified_by: string;             // Note: NOT nullable here!
}

export interface Story {
  id: number;
  project_id: number;
  epic_id: number | null;
  title: string;
  description: string;
  acceptance_criteria?: string | null;
  status: EntityStatus;
  priority: Priority;
  points?: number;
  created_at: string;
  updated_at: string;
  last_modified_by: string;             // Note: NOT nullable here!
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
  last_modified_by: string;             // Note: NOT nullable here!
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
  points?: number;
  created_at: string;
  updated_at: string;
  last_modified_by: string;             // Note: NOT nullable here!
}
```

**Type Sync Issue**: Web UI types are DUPLICATED with slightly different optional fields and nullability!

### 1.3 MCP Tool Interface

**Current Parameters** (from `mcp-server/src/index.ts`):

```typescript
// create_epic tool (lines 126-140)
{
  name: 'create_epic',
  inputSchema: {
    properties: {
      project_identifier: { type: 'string' },
      agent_identifier: { type: 'string' },        // TO BE REMOVED
      modified_by: { type: 'string' },             // TO BE REMOVED
      title: { type: 'string' },
      description: { type: 'string' },
      status: { type: 'string' }
    },
    required: ['project_identifier', 'agent_identifier', 'title', 'description']
  }
}

// update_epic tool (lines 142-158)
{
  name: 'update_epic',
  inputSchema: {
    properties: {
      project_identifier: { type: 'string' },
      agent_identifier: { type: 'string' },        // TO BE REMOVED
      modified_by: { type: 'string' },             // TO BE REMOVED
      id: { type: 'number' },
      title: { type: 'string' },
      description: { type: 'string' },
      status: { type: 'string' }
    },
    required: ['project_identifier', 'agent_identifier', 'id']
  }
}
```

**Pattern repeats** for all tools: stories, tasks, bugs, relationships, notes, sprints.

### 1.4 Project Context Handling

**Current Implementation** (`mcp-server/src/utils/project-context.ts`):

```typescript
// Lines 10-44
export function getProjectContext(
  db: AgileDatabase,
  projectIdentifier: string,
  agentIdentifier: string,          // TO BE REPLACED with user_id
  modifiedBy?: string               // TO BE REMOVED
): ProjectContext {
  const project = db.getProjectByIdentifier(projectIdentifier);

  if (!project) {
    db.logSecurityEvent(
      'unauthorized_access',
      projectIdentifier,
      'project',
      `Attempted to access unregistered project: ${projectIdentifier}`,
      null,
      null,
      agentIdentifier
    );
    throw new ProjectContextError(
      `No project registered with identifier: ${projectIdentifier}`,
      'PROJECT_NOT_REGISTERED'
    );
  }

  return {
    project_identifier: projectIdentifier,
    project_id: project.id,
    project_name: project.name,
    agent_identifier: agentIdentifier,    // TO BE REMOVED
    modified_by: modifiedBy || agentIdentifier,  // TO BE REMOVED
  };
}

// Conflict detection (lines 88-142)
export function detectConflict(
  db: AgileDatabase,
  entityType: 'epic' | 'story' | 'task' | 'bug',
  entityId: number,
  currentModifiedBy: string,            // TO BE REPLACED with assigned_to check
  currentAgentIdentifier: string
): boolean {
  let entity: any = null;

  switch (entityType) {
    case 'epic': entity = db.getEpic(entityId); break;
    case 'story': entity = db.getStory(entityId); break;
    case 'task': entity = db.getTask(entityId); break;
    case 'bug': entity = db.getBug(entityId); break;
  }

  if (!entity) return false;

  // Check if last modifier is different from current
  if (entity.last_modified_by && entity.last_modified_by !== currentModifiedBy) {
    db.logSecurityEvent(
      'conflict_detected',
      '',
      entityType,
      `Concurrent modification detected: ${entityType} #${entityId} was last modified by '${entity.last_modified_by}', now being modified by '${currentModifiedBy}'`,
      projectId,
      entityId,
      currentAgentIdentifier
    );
    return true;
  }

  return false;
}
```

### 1.5 Web UI Attribution

**Current Hardcoded Attribution** (`web-ui/server/index.ts`):

```typescript
// Line 111 - Epic creation
const epic = db.createEpic(req.body, 'web-ui');

// Line 120 - Epic update
const epic = db.updateEpic({ id: parseInt(req.params.id), ...req.body }, 'web-ui');

// Line 194 - Story creation
const story = db.createStory(req.body, 'web-ui');

// Line 203 - Story update
const story = db.updateStory({ id: parseInt(req.params.id), ...req.body }, 'web-ui');

// Line 275 - Bug creation
const bug = db.createBug(req.body, 'web-ui');

// Line 283 - Bug update
const bug = db.updateBug({ id: parseInt(req.params.id), ...req.body }, 'web-ui');

// Line 318 - Task creation
const task = db.createTask(req.body, 'web-ui');

// Line 327 - Task update
const task = db.updateTask({ id: parseInt(req.params.id), ...req.body }, 'web-ui');

// Line 553 - Sprint creation
const sprint = db.createSprint(req.body, 'web-ui');

// Line 562 - Sprint update
const sprint = db.updateSprint({ id: parseInt(req.params.id), ...req.body }, 'web-ui');

// Line 580 - Add story to sprint
db.addStoryToSprint(parseInt(req.params.sprintId), parseInt(req.params.storyId), 'web-ui');

// Line 600 - Add bug to sprint
db.addBugToSprint(parseInt(req.params.sprintId), parseInt(req.params.bugId), 'web-ui');

// Line 627 - Start sprint
const updated = db.updateSprint({ id: parseInt(req.params.id), status: 'active' }, 'web-ui');

// Line 646 - Complete sprint
const updated = db.updateSprint({ id: parseInt(req.params.id), status: 'completed' }, 'web-ui');
```

**Critical Issue**: All Web UI actions are hardcoded as 'web-ui', no user context.

---

## 2. Proposed User Table Design

### 2.1 Users Table Schema

```sql
CREATE TABLE IF NOT EXISTS users (
  user_id TEXT PRIMARY KEY,              -- e.g., "Code_Agent_1", "Human_Admin"
  display_name TEXT NOT NULL,            -- e.g., "Code Agent 1", "Administrator"
  user_type TEXT NOT NULL,               -- 'human', 'code_agent', 'doc_agent', 'qa_agent'
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK(user_type IN ('human', 'code_agent', 'doc_agent', 'qa_agent', 'system'))
);

-- Index for type filtering
CREATE INDEX IF NOT EXISTS idx_users_type ON users(user_type);
```

### 2.2 User Type Definitions

```typescript
// shared/src/types.ts additions
export type UserType = 'human' | 'code_agent' | 'doc_agent' | 'qa_agent' | 'system';

export interface User {
  user_id: string;               // Primary key
  display_name: string;
  user_type: UserType;
  created_at: string;
  updated_at: string;
}

export interface CreateUserInput {
  user_id: string;
  display_name: string;
  user_type: UserType;
}

export interface UpdateUserInput {
  user_id: string;
  display_name?: string;
  user_type?: UserType;
}
```

### 2.3 Seed Data Script

```typescript
// Database initialization addition (in initializeDatabase method)
private initializeDefaultUsers(): void {
  const defaultUsers = [
    {
      user_id: 'Human_Admin',
      display_name: 'Administrator',
      user_type: 'human'
    },
    {
      user_id: 'System',
      display_name: 'System',
      user_type: 'system'
    },
    {
      user_id: 'Web_UI',
      display_name: 'Web UI (Legacy)',
      user_type: 'system'
    }
  ];

  const insert = this.db.prepare(`
    INSERT OR IGNORE INTO users (user_id, display_name, user_type)
    VALUES (?, ?, ?)
  `);

  for (const user of defaultUsers) {
    insert.run(user.user_id, user.display_name, user.user_type);
  }
}
```

---

## 3. Migration Strategy: agent_identifier → assigned_to

### 3.1 Database Migration

**Migration #7: Replace agent_identifier and last_modified_by with assigned_to**

```typescript
// In runMigrations() method
private runMigrations(): void {
  // ... existing migrations ...

  // Migration 7: Replace agent_identifier/last_modified_by with assigned_to
  const epicsTableInfo = this.db.pragma('table_info(epics)') as Array<{ name: string }>;
  const hasAssignedTo = epicsTableInfo.some(col => col.name === 'assigned_to');
  const hasAgentIdentifier = epicsTableInfo.some(col => col.name === 'agent_identifier');

  if (!hasAssignedTo && hasAgentIdentifier) {
    console.error('[Migration 7] Replacing agent_identifier/last_modified_by with assigned_to...');

    // Step 1: Create users table
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

    // Step 2: Insert system users
    this.db.exec(`
      INSERT OR IGNORE INTO users (user_id, display_name, user_type)
      VALUES
        ('Human_Admin', 'Administrator', 'human'),
        ('System', 'System', 'system'),
        ('Web_UI', 'Web UI (Legacy)', 'system')
    `);

    // Step 3: Migrate agent_identifier values to users table
    const existingAgents = this.db.prepare(`
      SELECT DISTINCT agent_identifier FROM (
        SELECT agent_identifier FROM epics WHERE agent_identifier IS NOT NULL
        UNION
        SELECT agent_identifier FROM stories WHERE agent_identifier IS NOT NULL
        UNION
        SELECT agent_identifier FROM tasks WHERE agent_identifier IS NOT NULL
        UNION
        SELECT agent_identifier FROM bugs WHERE agent_identifier IS NOT NULL
      )
    `).all() as Array<{ agent_identifier: string }>;

    const insertUser = this.db.prepare(`
      INSERT OR IGNORE INTO users (user_id, display_name, user_type)
      VALUES (?, ?, ?)
    `);

    for (const { agent_identifier } of existingAgents) {
      // Infer user type from identifier pattern
      let userType: string = 'system';
      let displayName = agent_identifier;

      if (agent_identifier.includes('code') || agent_identifier.includes('Code')) {
        userType = 'code_agent';
        displayName = agent_identifier.replace(/_/g, ' ');
      } else if (agent_identifier.includes('doc') || agent_identifier.includes('Doc')) {
        userType = 'doc_agent';
        displayName = agent_identifier.replace(/_/g, ' ');
      } else if (agent_identifier.includes('qa') || agent_identifier.includes('QA')) {
        userType = 'qa_agent';
        displayName = agent_identifier.replace(/_/g, ' ');
      }

      insertUser.run(agent_identifier, displayName, userType);
    }

    // Step 4: Recreate tables with assigned_to
    // EPICS
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

    // Prefer last_modified_by over agent_identifier (more recent activity indicator)
    this.db.exec(`
      INSERT INTO epics_new (id, project_id, title, description, status, assigned_to, created_at, updated_at)
      SELECT id, project_id, title, description, status,
             COALESCE(last_modified_by, agent_identifier),
             created_at, updated_at
      FROM epics
    `);

    this.db.exec('DROP TABLE epics');
    this.db.exec('ALTER TABLE epics_new RENAME TO epics');

    // STORIES
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

    // TASKS - merge assignee and agent_identifier into assigned_to
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

    // Prioritize: assignee > last_modified_by > agent_identifier
    this.db.exec(`
      INSERT INTO tasks_new (id, story_id, title, description, status, assigned_to, created_at, updated_at)
      SELECT id, story_id, title, description, status,
             COALESCE(assignee, last_modified_by, agent_identifier),
             created_at, updated_at
      FROM tasks
    `);

    this.db.exec('DROP TABLE tasks');
    this.db.exec('ALTER TABLE tasks_new RENAME TO tasks');

    // BUGS
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

    // RELATIONSHIPS
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

    // SPRINTS
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

    // SECURITY LOGS
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
```

### 3.2 Updated Type Definitions

```typescript
// shared/src/types.ts - UPDATED interfaces
export interface Epic {
  id: number;
  project_id: number;
  title: string;
  description: string;
  status: EntityStatus;
  assigned_to: string | null;          // NEW: FK to users.user_id
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
  assigned_to: string | null;          // NEW: FK to users.user_id
  created_at: string;
  updated_at: string;
}

export type TaskType = 'Code Change' | 'Doc Change' | 'Research' | 'QA';

export interface Task {
  id: number;
  story_id: number;
  title: string;
  description: string;
  task_type: TaskType;                 // NEW
  status: EntityStatus;
  assigned_to: string | null;          // CHANGED: replaces assignee + agent_identifier
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
  assigned_to: string | null;          // NEW: FK to users.user_id
  created_at: string;
  updated_at: string;
}

export interface Relationship {
  id: number;
  source_type: EntityType;
  source_id: number;
  target_type: EntityType;
  target_id: number;
  relationship_type: RelationshipType;
  project_id: number;
  created_by: string;                  // CHANGED: renamed from agent_identifier
  created_at: string;
  updated_at: string;
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
  created_by: string | null;           // CHANGED: renamed from agent_identifier
  created_at: string;
  updated_at: string;
}

export interface SecurityLog {
  id: number;
  event_type: 'unauthorized_access' | 'project_violation' | 'conflict_detected';
  project_id: number | null;
  user_id: string | null;              // CHANGED: renamed from agent_identifier
  attempted_path: string;
  entity_type: string;
  entity_id: number | null;
  message: string;
  created_at: string;
}
```

### 3.3 Updated Input Types

```typescript
// shared/src/types.ts - Input types
export interface CreateEpicInput {
  project_id: number;
  title: string;
  description: string;
  status?: EntityStatus;
  assigned_to?: string;                // NEW: optional user assignment
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
  assigned_to?: string;                // NEW: optional user assignment
}

export interface CreateTaskInput {
  story_id: number;
  title: string;
  description: string;
  task_type?: TaskType;                // NEW
  status?: EntityStatus;
  assigned_to?: string;                // CHANGED: replaces assignee
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
  assigned_to?: string;                // NEW: optional user assignment
}

export interface CreateRelationshipInput {
  source_type: EntityType;
  source_id: number;
  target_type: EntityType;
  target_id: number;
  relationship_type: RelationshipType;
  project_id: number;
  created_by: string;                  // CHANGED: renamed from agent_identifier
}
```

---

## 4. MCP Tool Interface Updates

### 4.1 Updated Tool Schemas

**BREAKING CHANGE**: Remove `agent_identifier` and `modified_by` parameters, add `user_id`:

```typescript
// mcp-server/src/index.ts - Updated tool schemas

// create_epic - UPDATED
{
  name: 'create_epic',
  description: 'Create a new epic in the current project',
  inputSchema: {
    type: 'object',
    properties: {
      project_identifier: { type: 'string', description: 'Project identifier' },
      user_id: { type: 'string', description: 'User ID (from users table, e.g., "Code_Agent_1")' },
      title: { type: 'string', description: 'Epic title' },
      description: { type: 'string', description: 'Epic description' },
      status: { type: 'string', enum: ['todo', 'in_progress', 'review', 'done', 'blocked'] },
      assigned_to: { type: 'string', description: 'Assign to user (optional, defaults to user_id)' }
    },
    required: ['project_identifier', 'user_id', 'title', 'description']
  }
}

// update_epic - UPDATED
{
  name: 'update_epic',
  description: 'Update an existing epic in the current project',
  inputSchema: {
    type: 'object',
    properties: {
      project_identifier: { type: 'string', description: 'Project identifier' },
      user_id: { type: 'string', description: 'User ID making this change' },
      id: { type: 'number', description: 'Epic ID' },
      title: { type: 'string', description: 'New title' },
      description: { type: 'string', description: 'New description' },
      status: { type: 'string', enum: ['todo', 'in_progress', 'review', 'done', 'blocked'] },
      assigned_to: { type: 'string', description: 'Reassign to different user (optional)' }
    },
    required: ['project_identifier', 'user_id', 'id']
  }
}

// create_task - UPDATED with task_type
{
  name: 'create_task',
  description: 'Create a new task in the current project',
  inputSchema: {
    type: 'object',
    properties: {
      project_identifier: { type: 'string', description: 'Project identifier' },
      user_id: { type: 'string', description: 'User ID creating this task' },
      story_id: { type: 'number', description: 'Story ID' },
      title: { type: 'string', description: 'Task title' },
      description: { type: 'string', description: 'Task description' },
      task_type: {
        type: 'string',
        enum: ['Code Change', 'Doc Change', 'Research', 'QA'],
        description: 'Type of task (default: Code Change)'
      },
      status: { type: 'string', enum: ['todo', 'in_progress', 'review', 'done', 'blocked'] },
      assigned_to: { type: 'string', description: 'Assign to user (optional, defaults to user_id)' }
    },
    required: ['project_identifier', 'user_id', 'story_id', 'title', 'description']
  }
}
```

### 4.2 Updated Project Context

```typescript
// mcp-server/src/utils/project-context.ts - UPDATED

export interface ProjectContext {
  project_identifier: string;
  project_id: number;
  project_name: string;
  user_id: string;                     // CHANGED: renamed from agent_identifier
}

export function getProjectContext(
  db: AgileDatabase,
  projectIdentifier: string,
  userId: string                       // CHANGED: renamed from agentIdentifier
): ProjectContext {
  const project = db.getProjectByIdentifier(projectIdentifier);

  if (!project) {
    db.logSecurityEvent(
      'unauthorized_access',
      projectIdentifier,
      'project',
      `Attempted to access unregistered project: ${projectIdentifier}`,
      null,
      null,
      userId                           // CHANGED
    );

    throw new ProjectContextError(
      `No project registered with identifier: ${projectIdentifier}`,
      'PROJECT_NOT_REGISTERED'
    );
  }

  // Validate user exists
  const user = db.getUser(userId);
  if (!user) {
    throw new ProjectContextError(
      `User '${userId}' not found. Please register user first.`,
      'USER_NOT_FOUND'
    );
  }

  return {
    project_identifier: projectIdentifier,
    project_id: project.id,
    project_name: project.name,
    user_id: userId                    // CHANGED
  };
}

// REMOVED: detectConflict function (conflict detection now based on assigned_to)
// Conflicts are only when two users try to update the same entity
// The last update wins, but we log warnings if assigned_to changes
```

### 4.3 Updated Tool Handlers

```typescript
// mcp-server/src/tools/story-tools.ts - UPDATED

export async function handleStoryTools(request: CallToolRequest, db: AgileDatabase) {
  const { name, arguments: args } = request.params;

  try {
    if (name === 'create_story') {
      const ctx = getProjectContext(
        db,
        args.project_identifier as string,
        args.user_id as string               // CHANGED
      );

      if (args.epic_id) {
        validateProjectAccess(db, ctx, 'epic', args.epic_id as number);
      }

      // Validate assigned_to user if provided
      const assignedTo = args.assigned_to as string | undefined || ctx.user_id;
      if (assignedTo) {
        const user = db.getUser(assignedTo);
        if (!user) {
          throw new Error(`User '${assignedTo}' not found`);
        }
      }

      const story = db.createStory({
        project_id: ctx.project_id,
        epic_id: args.epic_id as number | undefined,
        title: args.title as string,
        description: args.description as string,
        acceptance_criteria: args.acceptance_criteria as string | undefined,
        status: args.status as any,
        priority: args.priority as any,
        points: args.points as number | undefined,
        assigned_to: assignedTo             // NEW
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              story,
              project: ctx.project_name,
              created_by: ctx.user_id,
              assigned_to: assignedTo
            }, null, 2)
          }
        ]
      };
    }

    if (name === 'update_story') {
      const ctx = getProjectContext(
        db,
        args.project_identifier as string,
        args.user_id as string               // CHANGED
      );

      validateProjectAccess(db, ctx, 'story', args.id as number);

      if (args.epic_id !== undefined && args.epic_id !== null) {
        validateProjectAccess(db, ctx, 'epic', args.epic_id as number);
      }

      // Validate assigned_to user if provided
      if (args.assigned_to) {
        const user = db.getUser(args.assigned_to as string);
        if (!user) {
          throw new Error(`User '${args.assigned_to}' not found`);
        }
      }

      // Check for concurrent modification warning
      const currentStory = db.getStory(args.id as number);
      const assignmentChanged = args.assigned_to &&
                                currentStory?.assigned_to &&
                                currentStory.assigned_to !== args.assigned_to;

      if (assignmentChanged) {
        db.logSecurityEvent(
          'conflict_detected',
          ctx.project_identifier,
          'story',
          `Story #${args.id} reassigned from '${currentStory.assigned_to}' to '${args.assigned_to}' by '${ctx.user_id}'`,
          ctx.project_id,
          args.id as number,
          ctx.user_id
        );
      }

      const story = db.updateStory({
        id: args.id as number,
        epic_id: args.epic_id as number | undefined,
        title: args.title as string | undefined,
        description: args.description as string | undefined,
        acceptance_criteria: args.acceptance_criteria as string | undefined,
        status: args.status as any,
        priority: args.priority as any,
        points: args.points as number | undefined,
        assigned_to: args.assigned_to as string | undefined
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              story,
              modified_by: ctx.user_id,
              assignment_changed: assignmentChanged,
              warning: assignmentChanged ?
                `Story was reassigned from '${currentStory!.assigned_to}' to '${args.assigned_to}'` :
                undefined
            }, null, 2)
          }
        ]
      };
    }

    // ... other handlers follow same pattern
    return null;
  } catch (error) {
    // ... error handling
  }
}
```

---

## 5. Web UI Updates

### 5.1 Updated API Client

```typescript
// web-ui/server/index.ts - UPDATED

// Add user context (could be from session, auth, etc.)
const WEB_UI_USER_ID = 'Human_Admin';  // Default for Web UI

// Epics
app.post('/api/epics', (req, res) => {
  try {
    const epic = db.createEpic({
      ...req.body,
      assigned_to: req.body.assigned_to || WEB_UI_USER_ID
    });
    res.status(201).json(epic);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

app.patch('/api/epics/:id', (req, res) => {
  try {
    const epic = db.updateEpic({
      id: parseInt(req.params.id),
      ...req.body,
      // Don't override assigned_to unless explicitly provided
    });
    res.json(epic);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// Stories
app.post('/api/stories', (req, res) => {
  try {
    const story = db.createStory({
      ...req.body,
      assigned_to: req.body.assigned_to || WEB_UI_USER_ID
    });
    res.status(201).json(story);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// Tasks
app.post('/api/tasks', (req, res) => {
  try {
    const task = db.createTask({
      ...req.body,
      task_type: req.body.task_type || 'Code Change',
      assigned_to: req.body.assigned_to || WEB_UI_USER_ID
    });
    res.status(201).json(task);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// Bugs
app.post('/api/bugs', (req, res) => {
  try {
    const bug = db.createBug({
      ...req.body,
      assigned_to: req.body.assigned_to || WEB_UI_USER_ID
    });
    res.status(201).json(bug);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// Sprints
app.post('/api/sprints', (req, res) => {
  try {
    const sprint = db.createSprint(req.body, WEB_UI_USER_ID);
    res.status(201).json(sprint);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// Add user management endpoints
app.get('/api/users', (_req, res) => {
  try {
    const users = db.listUsers();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/api/users', (req, res) => {
  try {
    const user = db.createUser(req.body);
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});
```

### 5.2 Updated UI Components

**TaskFormModal.tsx** - Add task_type selector:

```typescript
// web-ui/src/components/TaskFormModal.tsx

interface Task {
  id?: number;
  story_id: number;
  title: string;
  description: string;
  task_type: 'Code Change' | 'Doc Change' | 'Research' | 'QA';  // NEW
  status: 'todo' | 'in_progress' | 'review' | 'done' | 'blocked';
  assigned_to?: string;                                           // CHANGED
}

const [formData, setFormData] = useState<Task>({
  story_id: 0,
  title: '',
  description: '',
  task_type: 'Code Change',                                      // NEW
  status: 'todo',
  assigned_to: undefined,
});

// In form JSX:
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">Task Type</label>
  <select
    value={formData.task_type}
    onChange={(e) => setFormData({ ...formData, task_type: e.target.value as Task['task_type'] })}
    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
  >
    <option value="Code Change">Code Change</option>
    <option value="Doc Change">Doc Change</option>
    <option value="Research">Research</option>
    <option value="QA">QA</option>
  </select>
</div>

<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
  <select
    value={formData.assigned_to || ''}
    onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value || undefined })}
    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
  >
    <option value="">Unassigned</option>
    {users.map((user) => (
      <option key={user.user_id} value={user.user_id}>
        {user.display_name} ({user.user_type})
      </option>
    ))}
  </select>
</div>
```

### 5.3 User Selector Component

```typescript
// web-ui/src/components/UserSelector.tsx - NEW

import { useState, useEffect } from 'react';

interface User {
  user_id: string;
  display_name: string;
  user_type: 'human' | 'code_agent' | 'doc_agent' | 'qa_agent' | 'system';
}

interface UserSelectorProps {
  value: string | undefined;
  onChange: (userId: string | undefined) => void;
  filterType?: User['user_type'];
  allowUnassigned?: boolean;
}

export default function UserSelector({
  value,
  onChange,
  filterType,
  allowUnassigned = true
}: UserSelectorProps) {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      let data = await response.json();

      if (filterType) {
        data = data.filter((u: User) => u.user_type === filterType);
      }

      setUsers(data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value || undefined)}
      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
    >
      {allowUnassigned && <option value="">Unassigned</option>}
      {users.map((user) => (
        <option key={user.user_id} value={user.user_id}>
          {user.display_name}
          {user.user_type !== 'human' && ` (${user.user_type.replace('_', ' ')})`}
        </option>
      ))}
    </select>
  );
}
```

---

## 6. Type Sync Strategy

### 6.1 Current Problem

**Duplication Issues**:
- `shared/src/types.ts` (405 lines) - Source of truth for backend
- `web-ui/src/types/index.ts` (174 lines) - Partial duplicate with differences
- **Inconsistencies**:
  - Nullable vs non-nullable fields (`last_modified_by: string | null` vs `string`)
  - Optional vs required fields (`points?: number` vs `points: number | null`)
  - Missing interfaces in Web UI (Project, Note, Relationship, Sprint, etc.)
  - Type aliases missing in Web UI

### 6.2 Option 1: Direct Import (RECOMMENDED)

**Approach**: Web UI imports types directly from `@agile-mcp/shared`

**Pros**:
- Single source of truth
- Zero maintenance overhead
- Type changes automatically propagate
- Compiler enforces consistency

**Cons**:
- Web UI depends on shared package build
- Requires shared package to be built before web-ui dev

**Implementation**:

```typescript
// web-ui/src/types/index.ts - REPLACE with re-export
export * from '@agile-mcp/shared';

// OR selectively re-export
export type {
  EntityStatus,
  Priority,
  BugSeverity,
  TaskType,
  Epic,
  Story,
  Task,
  Bug,
  Project,
  Sprint,
  Note,
  Relationship,
  User,
  // ... etc
} from '@agile-mcp/shared';
```

```json
// web-ui/package.json - ensure dependency
{
  "dependencies": {
    "@agile-mcp/shared": "*"
  }
}
```

**Build Changes**:

```json
// package.json - root workspace
{
  "scripts": {
    "build": "npm run build --workspace=shared && npm run build --workspaces --if-present",
    "dev:web": "npm run build --workspace=shared && npm run dev --workspace=web-ui"
  }
}
```

### 6.3 Option 2: Code Generation

**Approach**: Generate web-ui types from shared types

**Pros**:
- Web UI doesn't depend on shared package at runtime
- Can customize generated types for frontend needs
- Clear separation of concerns

**Cons**:
- Requires build step
- Need to maintain generation script
- Can get out of sync if generation not run

**Implementation**:

```typescript
// scripts/generate-web-types.ts
import ts from 'typescript';
import fs from 'fs';

// Parse shared/src/types.ts
// Generate web-ui/src/types/index.ts with:
// - Convert null to undefined for optional fields
// - Add JSDoc comments
// - Skip backend-only types
```

### 6.4 Option 3: Monorepo Shared Types Package

**Approach**: Create separate `@agile-mcp/types` package

**Pros**:
- Lightweight type-only package
- Can be consumed by both backend and frontend
- Clear ownership

**Cons**:
- Extra package to maintain
- Overkill for this project size

### 6.5 Recommendation

**Use Option 1: Direct Import**

**Rationale**:
1. Already using npm workspaces - infrastructure is there
2. TypeScript handles this natively
3. Smallest maintenance burden
4. Enforces consistency
5. Works well with monorepo structure

**Implementation Steps**:
1. Delete `web-ui/src/types/index.ts` (except re-exports)
2. Replace with `export * from '@agile-mcp/shared'`
3. Update `web-ui/package.json` to depend on `@agile-mcp/shared`
4. Update root `package.json` scripts to build shared first
5. Fix any type incompatibilities in web-ui components

---

## 7. Breaking Changes Summary

### 7.1 Database Schema Changes

| Table | Change | Impact |
|-------|--------|--------|
| **epics** | `agent_identifier` → REMOVED | Migration required |
| **epics** | `last_modified_by` → REMOVED | Migration required |
| **epics** | `assigned_to` → ADDED | New FK to users.user_id |
| **stories** | `agent_identifier` → REMOVED | Migration required |
| **stories** | `last_modified_by` → REMOVED | Migration required |
| **stories** | `assigned_to` → ADDED | New FK to users.user_id |
| **tasks** | `agent_identifier` → REMOVED | Migration required |
| **tasks** | `last_modified_by` → REMOVED | Migration required |
| **tasks** | `assignee` → RENAMED to `assigned_to` | Migration required |
| **tasks** | `task_type` → ADDED | New enum field |
| **bugs** | `agent_identifier` → REMOVED | Migration required |
| **bugs** | `last_modified_by` → REMOVED | Migration required |
| **bugs** | `assigned_to` → ADDED | New FK to users.user_id |
| **relationships** | `agent_identifier` → RENAMED to `created_by` | Migration required |
| **sprints** | `agent_identifier` → RENAMED to `created_by` | Migration required |
| **security_logs** | `agent_identifier` → RENAMED to `user_id` | Migration required |
| **users** | NEW TABLE | Must be created |

### 7.2 MCP Tool Interface Changes

**All tools affected**:
- **REMOVED**: `agent_identifier` parameter
- **REMOVED**: `modified_by` parameter
- **ADDED**: `user_id` parameter (required)
- **ADDED**: `assigned_to` parameter (optional) for create/update operations

**Example**:
```diff
// Before
create_story(
  project_identifier: "my-project",
- agent_identifier: "Code_Agent_1",
- modified_by: "Code_Agent_1",
  title: "...",
  description: "..."
)

// After
create_story(
  project_identifier: "my-project",
+ user_id: "Code_Agent_1",
  title: "...",
  description: "...",
+ assigned_to: "Code_Agent_1"  // optional
)
```

### 7.3 Database Method Signature Changes

```typescript
// shared/src/database.ts - BREAKING CHANGES

// Before
createEpic(input: CreateEpicInput, agentIdentifier?: string, modifiedBy?: string): Epic

// After
createEpic(input: CreateEpicInput): Epic
// Note: assigned_to is now part of CreateEpicInput

// Before
updateEpic(input: UpdateEpicInput, agentIdentifier?: string, modifiedBy?: string): Epic

// After
updateEpic(input: UpdateEpicInput): Epic
// Note: assigned_to can be updated via UpdateEpicInput

// Before
logSecurityEvent(
  eventType: string,
  attemptedPath: string,
  entityType: string,
  message: string,
  projectId: number | null,
  entityId: number | null,
  agentIdentifier: string | null
): void

// After
logSecurityEvent(
  eventType: string,
  attemptedPath: string,
  entityType: string,
  message: string,
  projectId: number | null,
  entityId: number | null,
  userId: string | null
): void
```

### 7.4 Type Definition Changes

All entity interfaces lose `agent_identifier` and `last_modified_by`, gain `assigned_to`:

```typescript
// Before
interface Story {
  // ...
  agent_identifier: string | null;
  last_modified_by: string | null;
}

// After
interface Story {
  // ...
  assigned_to: string | null;  // FK to users.user_id
}
```

### 7.5 Conflict Detection Changes

**Before**:
- Tracked via `last_modified_by` field
- Compared current user with last modifier
- Prevented overwrites

**After**:
- Tracked via `assigned_to` field changes
- Logs warnings when assignment changes
- Allows overwrites but logs security events

---

## 8. Migration Plan

### 8.1 Pre-Migration Checklist

- [ ] **Backup database**: `cp agile-backlog.db agile-backlog.db.backup`
- [ ] **Document current agent_identifier values**:
  ```sql
  SELECT DISTINCT agent_identifier FROM (
    SELECT agent_identifier FROM epics
    UNION SELECT agent_identifier FROM stories
    UNION SELECT agent_identifier FROM tasks
    UNION SELECT agent_identifier FROM bugs
  ) WHERE agent_identifier IS NOT NULL;
  ```
- [ ] **Stop all MCP clients**: Ensure no active connections
- [ ] **Stop Web UI server**

### 8.2 Migration Execution

1. **Create users table and seed data**
   - Run migration #7 (see section 3.1)
   - Creates users table
   - Inserts system users (Human_Admin, System, Web_UI)
   - Auto-creates users from existing agent_identifier values

2. **Recreate entity tables with assigned_to**
   - Epics, Stories, Tasks, Bugs, Relationships, Sprints
   - Prioritizes last_modified_by over agent_identifier for assignment
   - Tasks: merges assignee → assigned_to

3. **Update security_logs**
   - Renames agent_identifier → user_id
   - Adds FK to users table

4. **Create indexes**
   - idx_epics_assigned, idx_stories_assigned, etc.
   - idx_users_type

### 8.3 Code Updates

**Order of updates**:

1. **shared/src/types.ts** - Update type definitions
2. **shared/src/database.ts** - Update method signatures, add migration
3. **mcp-server/src/utils/project-context.ts** - Update context handling
4. **mcp-server/src/index.ts** - Update tool schemas
5. **mcp-server/src/tools/*.ts** - Update all tool handlers
6. **web-ui/src/types/index.ts** - Replace with re-export from shared
7. **web-ui/server/index.ts** - Update API endpoints
8. **web-ui/src/components/*.tsx** - Update form components

### 8.4 Testing Plan

**Database Migration**:
```bash
# Test migration on copy
cp agile-backlog.db test-migration.db
npm run build --workspace=shared
node -e "
  const { AgileDatabase } = require('./shared/dist/index.js');
  const db = new AgileDatabase('./test-migration.db');
  console.log('Migration successful');
  const users = db.listUsers();
  console.log('Users:', users);
  db.close();
"
```

**MCP Tools**:
```bash
# Test tool invocation
npm run dev:mcp
# Use MCP inspector to test:
# - create_epic with new user_id parameter
# - update_story with assigned_to
# - create_task with task_type
```

**Web UI**:
```bash
npm run dev:web
# Test:
# - Create epic (should assign to Human_Admin)
# - Create task with task_type selector
# - Reassign story to different user
# - View users list
```

### 8.5 Rollback Plan

If migration fails:
```bash
# Restore backup
cp agile-backlog.db.backup agile-backlog.db

# Revert code changes
git reset --hard HEAD

# Rebuild old version
npm run build
```

---

## 9. Implementation Checklist

### 9.1 Phase 1: Database & Types (1-2 hours)

- [ ] **Update shared/src/types.ts**
  - [ ] Add UserType, User, CreateUserInput, UpdateUserInput
  - [ ] Add TaskType enum
  - [ ] Remove agent_identifier, last_modified_by from all entity interfaces
  - [ ] Add assigned_to to Epic, Story, Task, Bug
  - [ ] Rename agent_identifier to created_by in Relationship, Sprint
  - [ ] Rename agent_identifier to user_id in SecurityLog
  - [ ] Update all Create/Update input types

- [ ] **Update shared/src/database.ts**
  - [ ] Add Migration #7 (full script in section 3.1)
  - [ ] Add initializeDefaultUsers() method
  - [ ] Update all table creation DDL
  - [ ] Add users table methods: createUser, getUser, listUsers, updateUser, deleteUser
  - [ ] Update createEpic/updateEpic/deleteEpic signatures
  - [ ] Update createStory/updateStory/deleteStory signatures
  - [ ] Update createTask/updateTask/deleteTask signatures (add task_type)
  - [ ] Update createBug/updateBug/deleteBug signatures
  - [ ] Update createRelationship signature (agent_identifier → created_by)
  - [ ] Update createSprint/updateSprint signatures (agent_identifier → created_by)
  - [ ] Update logSecurityEvent signature (agentIdentifier → userId)
  - [ ] Update addStoryToSprint/addBugToSprint signatures (addedBy parameter)

- [ ] **Test Migration**
  - [ ] Create test database with old schema
  - [ ] Run migration
  - [ ] Verify users table created
  - [ ] Verify all tables have assigned_to/created_by
  - [ ] Verify indexes created
  - [ ] Check data integrity

### 9.2 Phase 2: MCP Server (2-3 hours)

- [ ] **Update mcp-server/src/utils/project-context.ts**
  - [ ] Update ProjectContext interface (remove agent_identifier, modified_by; add user_id)
  - [ ] Update getProjectContext signature and implementation
  - [ ] Add user validation in getProjectContext
  - [ ] Remove detectConflict function (replaced by assignment tracking)
  - [ ] Add optional conflict logging for assignment changes

- [ ] **Update mcp-server/src/index.ts**
  - [ ] Update all tool schemas (86 tools total):
    - [ ] create_epic (remove agent_identifier, modified_by; add user_id, assigned_to)
    - [ ] update_epic
    - [ ] list_epics
    - [ ] get_epic
    - [ ] delete_epic
    - [ ] create_story (+ add assigned_to)
    - [ ] update_story
    - [ ] list_stories
    - [ ] get_story
    - [ ] delete_story
    - [ ] create_task (+ add task_type, assigned_to)
    - [ ] update_task
    - [ ] list_tasks
    - [ ] get_task
    - [ ] delete_task
    - [ ] create_bug (+ add assigned_to)
    - [ ] update_bug
    - [ ] list_bugs
    - [ ] get_bug
    - [ ] delete_bug
    - [ ] create_relationship (agent_identifier → created_by)
    - [ ] delete_relationship
    - [ ] list_relationships
    - [ ] get_relationships_for_entity
    - [ ] create_note (keep agent_identifier for notes)
    - [ ] update_note
    - [ ] list_notes
    - [ ] delete_note
    - [ ] get_notes_for_entity
    - [ ] export_backlog
    - [ ] create_sprint (agent_identifier → user_id)
    - [ ] update_sprint
    - [ ] list_sprints
    - [ ] get_sprint
    - [ ] delete_sprint
    - [ ] add_story_to_sprint
    - [ ] remove_story_from_sprint
    - [ ] start_sprint
    - [ ] complete_sprint
    - [ ] get_sprint_burndown
    - [ ] get_velocity_report
    - [ ] create_daily_snapshot

- [ ] **Update mcp-server/src/tools/*.ts** (8 files)
  - [ ] epic-tools.ts
  - [ ] story-tools.ts (full example in section 4.3)
  - [ ] task-tools.ts (add task_type handling)
  - [ ] bug-tools.ts
  - [ ] relationship-tools.ts (agent_identifier → created_by)
  - [ ] note-tools.ts (keep agent_identifier for attribution)
  - [ ] sprint-tools.ts (agent_identifier → user_id)
  - [ ] export-tools.ts

- [ ] **Test MCP Tools**
  - [ ] Start MCP server: `npm run dev:mcp`
  - [ ] Test with MCP Inspector or test script
  - [ ] Verify user_id parameter required
  - [ ] Verify assigned_to assignment works
  - [ ] Verify task_type enum values
  - [ ] Test user validation errors

### 9.3 Phase 3: Web UI Backend (1 hour)

- [ ] **Update web-ui/server/index.ts**
  - [ ] Define WEB_UI_USER_ID constant ('Human_Admin')
  - [ ] Update POST /api/epics (add assigned_to logic)
  - [ ] Update PATCH /api/epics
  - [ ] Update POST /api/stories (add assigned_to logic)
  - [ ] Update PATCH /api/stories
  - [ ] Update POST /api/tasks (add task_type, assigned_to logic)
  - [ ] Update PATCH /api/tasks
  - [ ] Update POST /api/bugs (add assigned_to logic)
  - [ ] Update PATCH /api/bugs
  - [ ] Update POST /api/sprints (use WEB_UI_USER_ID)
  - [ ] Update PATCH /api/sprints
  - [ ] Update POST /api/sprints/:id/start
  - [ ] Update POST /api/sprints/:id/complete
  - [ ] Add GET /api/users
  - [ ] Add POST /api/users
  - [ ] Add GET /api/users/:id
  - [ ] Add PATCH /api/users/:id
  - [ ] Add DELETE /api/users/:id

- [ ] **Test API Endpoints**
  - [ ] Test epic CRUD with assigned_to
  - [ ] Test story CRUD with assigned_to
  - [ ] Test task CRUD with task_type
  - [ ] Test bug CRUD with assigned_to
  - [ ] Test user management endpoints

### 9.4 Phase 4: Web UI Frontend (2-3 hours)

- [ ] **Update web-ui/src/types/index.ts**
  - [ ] Delete entire file
  - [ ] Replace with: `export * from '@agile-mcp/shared';`

- [ ] **Update web-ui/package.json**
  - [ ] Add dependency: `"@agile-mcp/shared": "*"`

- [ ] **Create UserSelector component**
  - [ ] Create web-ui/src/components/UserSelector.tsx (see section 5.3)
  - [ ] Fetch users from /api/users
  - [ ] Support filterType prop
  - [ ] Support allowUnassigned prop

- [ ] **Update form components**
  - [ ] EpicFormModal.tsx
    - [ ] Add UserSelector for assigned_to
    - [ ] Update form submission
  - [ ] StoryFormModal.tsx
    - [ ] Add UserSelector for assigned_to
    - [ ] Update form submission
  - [ ] TaskFormModal.tsx
    - [ ] Add task_type selector (Code Change, Doc Change, Research, QA)
    - [ ] Replace assignee with UserSelector for assigned_to
    - [ ] Update form submission
  - [ ] BugFormModal.tsx
    - [ ] Add UserSelector for assigned_to
    - [ ] Update form submission
  - [ ] SprintFormModal.tsx
    - [ ] Update to use new types (no UI changes needed)

- [ ] **Update list/detail views**
  - [ ] BacklogListView.tsx
    - [ ] Display assigned_to instead of last_modified_by
    - [ ] Add user avatar/badge
  - [ ] StoryDetailView.tsx
    - [ ] Display assigned_to
    - [ ] Show task_type for tasks
  - [ ] TaskList.tsx
    - [ ] Display task_type badge
    - [ ] Display assigned_to

- [ ] **Create User Management Page (optional)**
  - [ ] Create web-ui/src/pages/UsersPage.tsx
  - [ ] List all users
  - [ ] Create/edit/delete users
  - [ ] Filter by user_type

- [ ] **Test Web UI**
  - [ ] Create new epic, assign to user
  - [ ] Create new story, assign to user
  - [ ] Create new task, select task_type, assign to user
  - [ ] Create new bug, assign to user
  - [ ] Verify user selector populates correctly
  - [ ] Verify task_type selector works
  - [ ] Verify assignments display correctly in lists

### 9.5 Phase 5: Documentation (1 hour)

- [ ] **Update README.md**
  - [ ] Document users table
  - [ ] Document assigned_to field
  - [ ] Document task_type enum
  - [ ] Update examples to use user_id

- [ ] **Update MCP_SERVER.md**
  - [ ] Update tool schemas documentation
  - [ ] Add migration guide
  - [ ] Document breaking changes

- [ ] **Update API_REFERENCE.md**
  - [ ] Update endpoint documentation
  - [ ] Document new /api/users endpoints
  - [ ] Update request/response examples

- [ ] **Create MIGRATION.md**
  - [ ] Document migration process
  - [ ] Provide rollback instructions
  - [ ] List all breaking changes

### 9.6 Phase 6: Testing & Validation (1-2 hours)

- [ ] **End-to-End Testing**
  - [ ] Test full workflow: MCP tool → Database → Web UI
  - [ ] Create project via MCP
  - [ ] Create epic via MCP with user_id
  - [ ] View epic in Web UI (should show assigned_to)
  - [ ] Update epic in Web UI (reassign)
  - [ ] View in MCP (should reflect change)

- [ ] **Migration Testing**
  - [ ] Test on database with existing data
  - [ ] Verify all agent_identifier values migrated to users
  - [ ] Verify assigned_to populated correctly
  - [ ] Check tasks: assignee → assigned_to
  - [ ] Verify relationships: agent_identifier → created_by

- [ ] **Error Handling**
  - [ ] Test invalid user_id
  - [ ] Test missing required fields
  - [ ] Test FK constraint violations
  - [ ] Verify error messages are clear

---

## 10. Files Changed Summary

### 10.1 Modified Files (Core)

| File | Lines Changed | Type | Priority |
|------|---------------|------|----------|
| `shared/src/types.ts` | ~100+ | Type definitions | HIGH |
| `shared/src/database.ts` | ~500+ | Schema migration | HIGH |
| `mcp-server/src/utils/project-context.ts` | ~50 | Context handling | HIGH |
| `mcp-server/src/index.ts` | ~300 | Tool schemas | HIGH |
| `web-ui/server/index.ts` | ~50 | API endpoints | MEDIUM |
| `web-ui/src/types/index.ts` | ~170 (delete) | Type sync | MEDIUM |

### 10.2 Modified Files (Tool Handlers)

| File | Changes | Complexity |
|------|---------|------------|
| `mcp-server/src/tools/epic-tools.ts` | Update all handlers | MEDIUM |
| `mcp-server/src/tools/story-tools.ts` | Update all handlers | MEDIUM |
| `mcp-server/src/tools/task-tools.ts` | Update + task_type | MEDIUM |
| `mcp-server/src/tools/bug-tools.ts` | Update all handlers | MEDIUM |
| `mcp-server/src/tools/relationship-tools.ts` | Rename field | LOW |
| `mcp-server/src/tools/note-tools.ts` | Keep agent_identifier | LOW |
| `mcp-server/src/tools/sprint-tools.ts` | Rename field | LOW |
| `mcp-server/src/tools/export-tools.ts` | Update context | LOW |

### 10.3 Modified Files (UI Components)

| File | Changes | Complexity |
|------|---------|------------|
| `web-ui/src/components/EpicFormModal.tsx` | Add UserSelector | MEDIUM |
| `web-ui/src/components/StoryFormModal.tsx` | Add UserSelector | MEDIUM |
| `web-ui/src/components/TaskFormModal.tsx` | Add task_type + UserSelector | HIGH |
| `web-ui/src/components/BugFormModal.tsx` | Add UserSelector | MEDIUM |
| `web-ui/src/components/BacklogListView.tsx` | Display changes | LOW |

### 10.4 New Files

| File | Purpose | Size |
|------|---------|------|
| `web-ui/src/components/UserSelector.tsx` | User selection component | ~80 lines |
| `MIGRATION.md` (optional) | Migration guide | ~200 lines |

### 10.5 Total Impact

- **Files Modified**: 25+
- **Lines Changed**: ~2000+
- **New Files**: 1-2
- **Estimated Time**: 10-15 hours
- **Risk Level**: HIGH (database schema + API changes)

---

## 11. Recommendations

### 11.1 Type Sync

**Recommendation**: Implement Option 1 (Direct Import)

**Action Items**:
1. Delete `web-ui/src/types/index.ts`
2. Replace with `export * from '@agile-mcp/shared';`
3. Update build scripts to build shared first
4. Fix any type incompatibilities in UI components

**Benefits**:
- Eliminates 174 lines of duplicated code
- Enforces consistency
- Zero maintenance overhead
- Catches type mismatches at compile time

### 11.2 Migration Approach

**Recommendation**: Phased rollout with feature flag

**Approach**:
1. **Phase 0**: Implement migration in code, add feature flag
2. **Phase 1**: Test migration on dev database
3. **Phase 2**: Deploy code (migration disabled)
4. **Phase 3**: Enable migration, monitor logs
5. **Phase 4**: Remove old code paths

**Feature Flag**:
```typescript
const USE_ASSIGNED_TO = process.env.USE_ASSIGNED_TO === 'true';

if (USE_ASSIGNED_TO) {
  // New code path
} else {
  // Legacy code path (deprecated)
}
```

### 11.3 Conflict Detection

**Recommendation**: Simplified conflict detection

**Old Approach**: Prevent overwrites via last_modified_by
**New Approach**: Log warnings when assigned_to changes

**Rationale**:
- Simpler logic
- Less database overhead
- Still provides audit trail
- Allows flexibility in reassignment

### 11.4 User Registration

**Recommendation**: Auto-register users on first use

**Implementation**:
```typescript
function getOrCreateUser(userId: string): User {
  let user = db.getUser(userId);

  if (!user) {
    // Auto-register with defaults
    const userType = inferUserType(userId);
    const displayName = userId.replace(/_/g, ' ');

    user = db.createUser({
      user_id: userId,
      display_name: displayName,
      user_type: userType
    });
  }

  return user;
}
```

### 11.5 Task Type Defaults

**Recommendation**: Smart defaults based on title

**Implementation**:
```typescript
function inferTaskType(title: string): TaskType {
  const lower = title.toLowerCase();

  if (lower.includes('doc') || lower.includes('readme')) {
    return 'Doc Change';
  } else if (lower.includes('test') || lower.includes('qa')) {
    return 'QA';
  } else if (lower.includes('research') || lower.includes('investigate')) {
    return 'Research';
  }

  return 'Code Change';  // Default
}
```

---

## Conclusion

This analysis provides a complete blueprint for implementing the user system and `assigned_to` field while removing `agent_identifier` and `last_modified_by`. The changes are extensive but well-scoped, with clear migration paths and rollback strategies.

**Key Takeaways**:
1. **Breaking Change**: This is a major version bump (v2.x → v3.0)
2. **Database Migration**: Required, but automated
3. **MCP Tools**: All tools require parameter updates
4. **Type Sync**: Use direct import from shared package
5. **Web UI**: Minimal changes, mostly adding user selectors
6. **Testing**: Comprehensive testing required across all layers

**Risk Mitigation**:
- Automated migration script
- Comprehensive testing checklist
- Rollback plan documented
- Phased rollout with feature flag (optional)

**Estimated Timeline**: 10-15 hours of development + 3-5 hours of testing

---

**Research saved to**: `/home/ehartye/repos/agile-mcp/.code-research/user-system-and-assigned-to-implementation.md`
