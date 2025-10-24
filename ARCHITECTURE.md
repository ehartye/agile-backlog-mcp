# Agile MCP - Technical Architecture

> Comprehensive guide to the technical architecture, design decisions, and implementation details

## Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Monorepo Structure](#monorepo-structure)
- [Database Design](#database-design)
- [MCP Server Architecture](#mcp-server-architecture)
- [Web UI Architecture](#web-ui-architecture)
- [API Server Design](#api-server-design)
- [Security Model](#security-model)
- [Design Decisions](#design-decisions)

---

## Overview

Agile MCP is a monorepo application built with three integrated components:

1. **MCP Server** - Stdio-based MCP protocol server for AI agents
2. **Web UI** - React frontend + Express API backend for humans
3. **Shared Library** - Common database and type definitions

### High-Level Architecture

```
┌─────────────────┐                 ┌──────────────────┐
│   AI Agents     │                 │     Humans       │
│   (Claude)      │                 │   (Browsers)     │
└────────┬────────┘                 └────────┬─────────┘
         │                                   │
         │ MCP Protocol                      │ HTTP/REST
         │ (stdio)                           │
         v                                   v
┌────────────────────┐             ┌─────────────────────┐
│   MCP Server       │             │  Web UI (React)     │
│   - Tools          │             │  - Components       │
│   - Resources      │             │  - API Client       │
│   - Validation     │             └──────────┬──────────┘
└────────┬───────────┘                        │
         │                                    │ fetch()
         │                        ┌───────────v───────────┐
         │                        │  API Server (Express) │
         │                        │  - REST Endpoints     │
         │                        │  - Query Params       │
         │                        └───────────┬───────────┘
         │                                    │
         │                                    │
         └───────────────┬────────────────────┘
                         │
                         v
              ┌────────────────────────┐
              │  Shared Database       │
              │  (SQLite + WAL)        │
              │  - Projects            │
              │  - Epics/Stories/Tasks │
              │  - Dependencies        │
              │  - Security Logs       │
              └────────────────────────┘
```

---

## System Architecture

### Component Interaction Flow

**AI Agent Flow:**
```
Claude → MCP Client → stdio → MCP Server → Database → Response
```

**Human User Flow:**
```
Browser → React UI → fetch → Express API → Database → JSON Response → UI Update
```

### Key Characteristics

- **Shared Database**: Both MCP server and API server access the same SQLite database
- **Independent Processes**: MCP server and web server run as separate processes
- **Type Safety**: Shared TypeScript types ensure consistency across all components
- **Project Isolation**: All operations scoped to projects via identifier validation

---

## Monorepo Structure

### Workspace Layout

```
agile-mcp/
├── package.json              # Root workspace configuration
├── mcp-server/               # MCP protocol server
│   ├── src/
│   │   ├── index.ts         # Server entry point (MCP setup)
│   │   ├── tools/           # Tool handler modules
│   │   │   ├── project-tools.ts
│   │   │   ├── epic-tools.ts
│   │   │   ├── story-tools.ts
│   │   │   ├── task-tools.ts
│   │   │   ├── dependency-tools.ts
│   │   │   └── export-tools.ts
│   │   ├── resources/       # Resource handler modules
│   │   │   └── index.ts
│   │   └── utils/           # Utility modules
│   │       └── project-context.ts
│   ├── dist/                # Compiled JavaScript output
│   ├── package.json
│   └── tsconfig.json
│
├── web-ui/                   # React frontend + Express backend
│   ├── server/
│   │   └── index.ts         # Express API server
│   ├── src/
│   │   ├── main.tsx         # React entry point
│   │   ├── App.tsx          # Main React component
│   │   ├── components/      # React components
│   │   │   ├── DependencyGraphView.tsx
│   │   │   ├── HierarchyTreeView.tsx
│   │   │   ├── BacklogListView.tsx
│   │   │   ├── ProjectSelector.tsx
│   │   │   ├── EpicFormModal.tsx
│   │   │   ├── StoryFormModal.tsx
│   │   │   └── TaskFormModal.tsx
│   │   ├── utils/
│   │   │   └── api.ts       # API client
│   │   └── types/
│   │       └── index.ts     # UI-specific types
│   ├── dist/                # Production build output
│   ├── package.json
│   ├── vite.config.ts       # Vite configuration
│   ├── tailwind.config.js   # Tailwind CSS configuration
│   └── tsconfig.json
│
├── shared/                   # Shared library
│   ├── src/
│   │   ├── index.ts         # Package exports
│   │   ├── database.ts      # Database class
│   │   └── types.ts         # TypeScript type definitions
│   ├── dist/                # Compiled JavaScript + .d.ts
│   ├── package.json
│   └── tsconfig.json
│
└── agile-backlog.db          # SQLite database file
```

### Package Dependencies

```
mcp-server  →  shared  →  SQLite
web-ui      →  shared  →  SQLite
```

Both `mcp-server` and `web-ui` depend on `shared` package for database access and types.

---

## Database Design

### Database Technology

- **Engine**: SQLite 3 via `better-sqlite3` (v11.0.0)
- **Mode**: WAL (Write-Ahead Logging) for better concurrency
- **Location**: `./agile-backlog.db` in project root
- **Foreign Keys**: Enabled via `PRAGMA foreign_keys = ON`

### Schema Overview

The database contains 7 tables with foreign key relationships enforcing referential integrity:

```
projects
    ├─→ epics (ON DELETE CASCADE)
    │     └─→ stories (ON DELETE SET NULL)
    ├─→ stories (ON DELETE CASCADE)
    │     └─→ tasks (ON DELETE CASCADE)
    │     └─→ dependencies (ON DELETE CASCADE)
    └─→ security_logs (ON DELETE CASCADE)
```

### Detailed Schema

#### projects Table

Stores registered projects with unique identifiers.

```sql
CREATE TABLE projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  identifier TEXT NOT NULL UNIQUE,      -- Unique project identifier (e.g., "my-app")
  name TEXT NOT NULL,                   -- Display name
  description TEXT,                     -- Project description
  created_at TEXT NOT NULL,             -- ISO 8601 timestamp
  updated_at TEXT NOT NULL,             -- ISO 8601 timestamp
  last_accessed_at TEXT NOT NULL        -- ISO 8601 timestamp
);
```

**Indexes:**
- PRIMARY KEY on `id`
- UNIQUE on `identifier`

#### epics Table

High-level feature areas or initiatives.

```sql
CREATE TABLE epics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,          -- Foreign key to projects
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo',  -- See status values below
  agent_identifier TEXT NOT NULL,       -- Agent that created/owns this epic
  last_modified_by TEXT,                -- Last agent/user to modify
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
```

**Status values**: `todo`, `in_progress`, `review`, `done`, `blocked`

#### stories Table

User stories with priority and point estimates.

```sql
CREATE TABLE stories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,          -- Foreign key to projects
  epic_id INTEGER,                      -- Foreign key to epics (nullable for orphan stories)
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo',
  priority TEXT NOT NULL DEFAULT 'medium',  -- low, medium, high, critical
  points INTEGER,                       -- Story points
  agent_identifier TEXT NOT NULL,
  last_modified_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (epic_id) REFERENCES epics(id) ON DELETE SET NULL
);
```

**Priority values**: `low`, `medium`, `high`, `critical`

#### tasks Table

Sub-items of stories for implementation tracking.

```sql
CREATE TABLE tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  story_id INTEGER NOT NULL,            -- Foreign key to stories
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo',
  assignee TEXT,                        -- Optional assignee name/identifier
  agent_identifier TEXT NOT NULL,
  last_modified_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE
);
```

#### dependencies Table

Story-to-story dependency relationships.

```sql
CREATE TABLE dependencies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  story_id INTEGER NOT NULL,            -- Story that has the dependency
  depends_on_story_id INTEGER NOT NULL, -- Story that is depended upon
  dependency_type TEXT NOT NULL,        -- 'blocks' or 'blocked_by'
  created_at TEXT NOT NULL,
  FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE,
  FOREIGN KEY (depends_on_story_id) REFERENCES stories(id) ON DELETE CASCADE,
  UNIQUE(story_id, depends_on_story_id) -- Prevent duplicate dependencies
);
```

**Dependency types**: `blocks`, `blocked_by`

**Circular Dependency Prevention**: Validated in application layer using BFS algorithm before insertion.

#### status_transitions Table

Defines allowed status transitions for workflow enforcement.

```sql
CREATE TABLE status_transitions (
  entity_type TEXT NOT NULL,            -- 'epic', 'story', or 'task'
  from_status TEXT NOT NULL,            -- Current status
  to_status TEXT NOT NULL,              -- Target status
  allowed INTEGER NOT NULL DEFAULT 1,   -- 1 = allowed, 0 = disallowed
  PRIMARY KEY (entity_type, from_status, to_status)
);
```

**Default workflow**:
```
todo → in_progress → review → done
        ↓              ↑
      blocked ────────┘
```

#### security_logs Table

Audit trail for security events and access violations.

```sql
CREATE TABLE security_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,             -- 'unauthorized_access', 'project_violation', 'conflict_detected'
  project_id INTEGER,                   -- Related project (if applicable)
  agent_identifier TEXT,                -- Agent that triggered the event
  attempted_path TEXT,                  -- Path/identifier attempted (if applicable)
  entity_type TEXT,                     -- 'epic', 'story', 'task', 'dependency', 'project'
  entity_id INTEGER,                    -- Entity ID involved
  message TEXT,                         -- Human-readable description
  created_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
```

### Database Class API

The `AgileDatabase` class (in `shared/src/database.ts`) provides a typed interface:

**Project Methods:**
- `createProject(input)` → `Project`
- `getProject(id)` → `Project | undefined`
- `getProjectByIdentifier(identifier)` → `Project | undefined`
- `listProjects()` → `Project[]`
- `updateProject(id, updates)` → `void`
- `deleteProject(id)` → `void`

**Epic Methods:**
- `createEpic(input)` → `Epic`
- `getEpic(id)` → `Epic | undefined`
- `listEpics(projectId?, status?)` → `Epic[]`
- `updateEpic(id, updates)` → `void`
- `deleteEpic(id)` → `void`

**Story Methods:**
- `createStory(input)` → `Story`
- `getStory(id)` → `Story | undefined`
- `listStories(filters)` → `Story[]`
- `updateStory(id, updates)` → `void`
- `deleteStory(id)` → `void`

**Task Methods:**
- `createTask(input)` → `Task`
- `getTask(id)` → `Task | undefined`
- `listTasks(filters)` → `Task[]`
- `updateTask(id, updates)` → `void`
- `deleteTask(id)` → `void`

**Dependency Methods:**
- `createDependency(input)` → `Dependency`
- `getDependency(id)` → `Dependency | undefined`
- `listDependencies(storyId?, projectId?)` → `Dependency[]`
- `deleteDependency(id)` → `void`
- `wouldCreateCircularDependency(storyId, dependsOnStoryId)` → `boolean`

**Graph Methods:**
- `getDependencyGraph(projectId?)` → `{ nodes, edges }`
- `getHierarchy(projectId?)` → `HierarchyNode[]`

**Security Methods:**
- `logSecurityEvent(event)` → `void`
- `getSecurityLogs(limit?)` → `SecurityLog[]`

### Migrations

The database includes automatic migration support via `runMigrations()` method:

1. **Stories project_id migration**: Adds `project_id` column to stories table and backfills from epics
2. **Agent identifier migration**: Adds `agent_identifier` columns to entities
3. **Identifier-based projects**: Converts from repository paths to identifier system

Migrations run automatically on database initialization.

---

## MCP Server Architecture

### Protocol

- **Transport**: stdio (standard input/output)
- **Protocol**: Model Context Protocol (MCP) v1.0
- **SDK**: `@modelcontextprotocol/sdk` v1.0.4

### Server Initialization

```typescript
// mcp-server/src/index.ts
const server = new Server({
  name: 'agile-mcp',
  version: '1.0.0'
}, {
  capabilities: {
    tools: {},
    resources: {}
  }
});

// Connect stdio transport
const transport = new StdioServerTransport();
await server.connect(transport);
```

### Tool Organization

Tools are organized by domain in separate modules:

```
tools/
├── project-tools.ts      # Project registration and management (7 tools)
├── epic-tools.ts         # Epic CRUD operations (5 tools)
├── story-tools.ts        # Story CRUD operations (5 tools)
├── task-tools.ts         # Task CRUD operations (4 tools)
├── dependency-tools.ts   # Dependency management (3 tools)
└── export-tools.ts       # Data export (1 tool)
```

Each tool module exports handler functions that:
1. Accept `CallToolRequest` parameters
2. Validate project context using `getProjectContext()`
3. Perform database operations
4. Return formatted responses

### Tool Registration

Tools are registered in `index.ts`:

```typescript
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'register_project',
      description: 'Register a new project with unique identifier',
      inputSchema: { /* JSON Schema */ }
    },
    // ... more tool definitions
  ]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch(name) {
    case 'register_project':
      return handleRegisterProject(args);
    case 'create_epic':
      return handleCreateEpic(args);
    // ... more tool handlers
  }
});
```

### Project Context Validation

All tools (except project registration) use the `getProjectContext()` utility:

```typescript
// utils/project-context.ts
export async function getProjectContext(
  projectIdentifier: string,
  agentIdentifier: string
): Promise<ProjectContext> {
  const project = db.getProjectByIdentifier(projectIdentifier);

  if (!project) {
    db.logSecurityEvent({
      event_type: 'unauthorized_access',
      agent_identifier: agentIdentifier,
      attempted_path: projectIdentifier,
      message: `Attempted access to unregistered project: ${projectIdentifier}`
    });
    throw new ProjectContextError(
      `No project registered with identifier: ${projectIdentifier}`,
      'PROJECT_NOT_REGISTERED'
    );
  }

  return {
    project_id: project.id,
    project_identifier: project.identifier,
    project_name: project.name,
    agent_identifier: agentIdentifier
  };
}
```

### Error Handling

Custom error class for project context violations:

```typescript
export class ProjectContextError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message);
    this.name = 'ProjectContextError';
  }
}
```

Error codes:
- `PROJECT_NOT_REGISTERED` - Project identifier not found
- `PROJECT_ACCESS_DENIED` - Attempting to access another project's entity
- `CONFLICT_DETECTED` - Concurrent modification detected

---

## Web UI Architecture

### Frontend Stack

- **Framework**: React 18.3.0
- **Build Tool**: Vite 6.0.0
- **Language**: TypeScript 5.6.0
- **Styling**: Tailwind CSS 3.4.17
- **Routing**: React Router 6.28.0
- **Graph Visualization**: React Flow (@xyflow/react) 12.3.0
- **Tree Visualization**: D3.js 7.9.0
- **Icons**: Lucide React 0.468.0

### Component Architecture

```
App.tsx (Router, Navigation, State Management)
├── ProjectSelector (Project dropdown)
├── Routes:
│   ├── / → BacklogListView (Story list + CRUD)
│   ├── /dag → DependencyGraphView (React Flow graph)
│   └── /tree → HierarchyTreeView (D3 tree)
└── Modals:
    ├── EpicFormModal
    ├── StoryFormModal
    └── TaskFormModal
```

### Key Components

#### App.tsx
- Main application shell with routing
- Manages global state: `selectedProjectId`, `apiConnected`, `isMobileMenuOpen`
- Polls API health check every 30 seconds
- Responsive sidebar navigation

#### DependencyGraphView
- Uses React Flow for interactive graph rendering
- Nodes represent stories (colored by status)
- Edges represent dependencies
- Features: zoom, pan, minimap, auto-layout
- Mobile-responsive with adjusted node sizes

#### HierarchyTreeView
- Uses D3.js for tree layout
- Shows Epic → Story → Task hierarchy
- Collapsible nodes
- SVG-based rendering with zoom/pan

#### BacklogListView
- Table/card-based story list
- Filters: epic, status, priority
- Inline CRUD operations via modals
- Paginated display

#### Form Modals
- Shared modal pattern for create/edit operations
- Form validation
- API integration via utils/api.ts

### State Management

- **Component-level state**: useState hooks for local state
- **No global state library**: Props passed down from App.tsx
- **API client**: Centralized in `utils/api.ts`

### API Client

```typescript
// utils/api.ts
const api = {
  projects: {
    list: () => fetchJson<Project[]>('/api/projects'),
    get: (id) => fetchJson<Project>(`/api/projects/${id}`),
    create: (data) => fetchJson<Project>('/api/projects', { method: 'POST', body: data }),
    // ...
  },
  epics: { /* ... */ },
  stories: { /* ... */ },
  tasks: { /* ... */ },
  dependencies: { /* ... */ },
  graph: {
    dependencies: (projectId) => fetchJson(`/api/graph/dependencies?project_id=${projectId}`),
    hierarchy: (projectId) => fetchJson(`/api/graph/hierarchy?project_id=${projectId}`)
  }
};
```

### Responsive Design

- **Breakpoint**: `md` at 768px (Tailwind default)
- **Mobile menu**: Hamburger menu with slide-out navigation
- **Adaptive layouts**: Flex direction changes, font size adjustments
- **Touch-friendly**: Larger tap targets on mobile

---

## API Server Design

### Technology

- **Framework**: Express 4.21.0
- **Port**: 3004 (configurable via `PORT` env variable)
- **Middleware**: CORS, JSON body parser
- **Database**: Shared `AgileDatabase` instance

### Endpoint Structure

All endpoints follow RESTful conventions:

```
GET    /api/resource        # List resources (with query params for filtering)
GET    /api/resource/:id    # Get single resource by ID
POST   /api/resource        # Create new resource
PATCH  /api/resource/:id    # Update existing resource
DELETE /api/resource/:id    # Delete resource
```

### Complete Endpoint List

| Method | Endpoint | Query Params | Description |
|--------|----------|--------------|-------------|
| GET | `/api/health` | - | Health check |
| GET | `/api/projects` | - | List all projects |
| GET | `/api/projects/:id` | - | Get project |
| POST | `/api/projects` | - | Create project |
| PATCH | `/api/projects/:id` | - | Update project |
| DELETE | `/api/projects/:id` | - | Delete project |
| GET | `/api/security-logs` | `limit` | Get security logs |
| GET | `/api/epics` | `project_id`, `status` | List epics |
| GET | `/api/epics/:id` | - | Get epic with stories |
| POST | `/api/epics` | - | Create epic |
| PATCH | `/api/epics/:id` | - | Update epic |
| DELETE | `/api/epics/:id` | - | Delete epic |
| GET | `/api/stories` | `project_id`, `epic_id`, `status`, `priority`, `has_dependencies` | List stories |
| GET | `/api/stories/:id` | - | Get story with tasks and dependencies |
| POST | `/api/stories` | - | Create story |
| PATCH | `/api/stories/:id` | - | Update story |
| DELETE | `/api/stories/:id` | - | Delete story |
| GET | `/api/tasks` | `project_id`, `story_id`, `status`, `assignee` | List tasks |
| POST | `/api/tasks` | - | Create task |
| PATCH | `/api/tasks/:id` | - | Update task |
| DELETE | `/api/tasks/:id` | - | Delete task |
| GET | `/api/dependencies` | `story_id`, `project_id` | List dependencies |
| POST | `/api/dependencies` | - | Create dependency |
| DELETE | `/api/dependencies/:id` | - | Delete dependency |
| GET | `/api/graph/dependencies` | `project_id` | Get graph data |
| GET | `/api/graph/hierarchy` | `project_id` | Get tree data |

### Request/Response Format

**Standard Response Format:**
```typescript
{
  // Success response
  data: T,        // Resource or array of resources
  message?: string
}

// Error response
{
  error: string,
  code?: string
}
```

### Agent Tracking

All mutations include hardcoded agent identifier:

```typescript
const entity = db.createStory({
  ...data,
  agent_identifier: 'web-ui',
  last_modified_by: 'web-ui'
});
```

---

## Security Model

### Project Isolation

**Identifier-Based Access Control:**
- Each project has a unique string identifier
- All MCP tool calls require `project_identifier` parameter
- Database queries filter by `project_id`
- Cross-project access blocked at application layer

**Validation Flow:**
```
1. Tool receives project_identifier
2. getProjectContext() looks up project
3. If not found → ProjectContextError + security log
4. If found → return ProjectContext with project_id
5. All subsequent queries filter by project_id
```

### Access Violations

**Types of Violations:**
1. **Unauthorized Access**: Attempting to use unregistered project identifier
2. **Project Violation**: Attempting to access another project's entity
3. **Conflict Detection**: Concurrent modifications by different agents

**Handling:**
- All violations logged to `security_logs` table
- Error thrown with descriptive message
- Agent identifier recorded for audit trail

### Audit Trail

**Security Log Entry:**
```typescript
{
  event_type: 'project_violation',
  project_id: 1,
  agent_identifier: 'claude-agent-2',
  attempted_path: 'other-project',
  entity_type: 'epic',
  entity_id: 5,
  message: 'Attempted to access epic from different project',
  created_at: '2025-10-24T12:00:00Z'
}
```

**Querying Logs:**
```bash
GET /api/security-logs?limit=100
```

### Conflict Detection

**Mechanism:**
- `last_modified_by` field tracks last modifier
- `detectConflict()` compares current agent with last modifier
- Returns boolean flag indicating conflict

**Response with Conflict:**
```json
{
  "success": true,
  "epic": { /* ... */ },
  "conflict_detected": true,
  "warning": "This epic was recently modified by agent: other-agent"
}
```

---

## Design Decisions

### 1. Monorepo with npm Workspaces

**Decision**: Use monorepo structure with three packages

**Rationale**:
- Shared types prevent drift between frontend and backend
- Single dependency installation and build process
- Easier to maintain consistency across components
- Better development experience

**Alternatives Considered**:
- Separate repositories → rejected due to type synchronization complexity

### 2. SQLite Database

**Decision**: Use SQLite instead of PostgreSQL/MySQL

**Rationale**:
- Zero configuration required
- Single file storage, easy to backup
- Sufficient performance for local/small team use
- WAL mode provides adequate concurrency
- Embedded database simplifies deployment

**Trade-offs**:
- Limited to single-machine deployments
- No built-in replication
- Maximum ~100 concurrent writers (sufficient for use case)

### 3. Identifier-Based Project Isolation

**Decision**: Use string identifiers instead of file paths

**Rationale**:
- More flexible than absolute paths
- Easier to type and remember
- Not tied to filesystem structure
- Works across different environments

**Evolution**: Originally used `repository_path`, migrated to `identifier` system

### 4. Explicit project_identifier Parameter

**Decision**: Require `project_identifier` on every MCP tool call

**Rationale**:
- Explicit is better than implicit for security
- No MCP protocol extensions needed
- Clear audit trail
- Flexibility for cross-project workflows
- Easier to test

**Alternatives Considered**:
- Session-based caching → rejected for complexity
- MCP protocol extension → rejected for non-standard approach

### 5. React Flow for Dependency Graph

**Decision**: Use React Flow instead of custom D3 or vis.js

**Rationale**:
- React-native API, integrates seamlessly
- Built-in zoom, pan, minimap
- Auto-layout algorithms included
- Active maintenance and community
- TypeScript support

### 6. Express for API Server

**Decision**: Use Express instead of Next.js API routes or Fastify

**Rationale**:
- Simple, well-understood API
- Minimal boilerplate
- Extensive middleware ecosystem
- Easy to deploy standalone
- No framework lock-in

### 7. Cascade Deletes in Database

**Decision**: Use CASCADE for project/epic/story deletes

**Rationale**:
- Maintains referential integrity automatically
- Prevents orphaned records
- Simplifies application logic
- Aligns with agile hierarchy

**Implementation**:
```sql
FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
```

### 8. Status Transition Enforcement

**Decision**: Encode allowed status transitions in database

**Rationale**:
- Prevents invalid state changes
- Single source of truth for workflow
- Easy to query and modify
- Enforced at data layer

**Alternative**: Could be enforced in application layer, but database ensures consistency

---

## Performance Considerations

### Database Optimization

- **WAL Mode**: Write-Ahead Logging for better concurrency
- **Foreign Key Indexes**: Automatic indexes on foreign key columns
- **Prepared Statements**: All queries use prepared statements (via better-sqlite3)

### Frontend Optimization

- **Code Splitting**: Vite automatically chunks code
- **Lazy Loading**: Routes and heavy components loaded on demand
- **React Flow Optimization**: Only visible nodes rendered
- **D3 Memoization**: Tree calculations memoized

### API Optimization

- **Query Parameter Filtering**: Reduce data transfer
- **Selective Joins**: Only join related data when needed
- **Connection Pooling**: Not applicable (SQLite, single connection)

---

## Deployment Architecture

### Development

```
┌────────────────────────────────────────┐
│  Developer Machine                      │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │  MCP Server (stdio)              │  │
│  │  Port: N/A                       │  │
│  └──────────────────────────────────┘  │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │  API Server (Express)            │  │
│  │  Port: 3004                      │  │
│  └──────────────────────────────────┘  │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │  Vite Dev Server                 │  │
│  │  Port: 3005                      │  │
│  └──────────────────────────────────┘  │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │  SQLite Database                 │  │
│  │  File: agile-backlog.db          │  │
│  └──────────────────────────────────┘  │
└────────────────────────────────────────┘
```

### Production

```
┌────────────────────────────────────────┐
│  Server                                 │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │  MCP Server (stdio)              │  │
│  │  Managed by Claude Desktop/Code  │  │
│  └──────────────────────────────────┘  │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │  Node.js Process                 │  │
│  │  - Express API Server            │  │
│  │  - Serve Static React Build      │  │
│  │  Port: 3004                      │  │
│  └──────────────────────────────────┘  │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │  SQLite Database                 │  │
│  │  File: agile-backlog.db          │  │
│  └──────────────────────────────────┘  │
└────────────────────────────────────────┘
```

---

## Future Considerations

### Scalability

**Current Limits:**
- SQLite: ~100 concurrent writers
- Single-machine deployment
- Local file storage

**If Scaling Needed:**
- Migrate to PostgreSQL for multi-machine support
- Add connection pooling
- Implement caching layer (Redis)
- Consider event-driven architecture

### Multi-Tenancy

**Current**: Single database, project isolation via identifiers

**For True Multi-Tenancy:**
- Separate databases per tenant
- or Schema-based isolation in PostgreSQL
- Add authentication/authorization layer

### Real-Time Collaboration

**Future Enhancement:**
- WebSocket support for live updates
- Operational Transform for conflict resolution
- Presence indicators for concurrent editing

---

**Document Version**: 1.0
**Last Updated**: 2025-10-24
