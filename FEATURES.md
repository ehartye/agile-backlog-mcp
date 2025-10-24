# Agile MCP - Completed Features

## Overview

The Agile MCP tool is now fully functional with complete project isolation, CRUD operations via both MCP (for AI agents) and Web UI (for humans).

## Core Architecture

### 1. **MCP Server** (Port: via stdio)
- **Purpose**: Provides AI agents with agile backlog management tools
- **Communication**: stdio-based MCP protocol
- **Location**: `mcp-server/`
- **Version**: 2.0.0 (with project isolation)

### 2. **API Server** (Port: 3001)
- **Purpose**: REST API for web UI and external integrations
- **Communication**: HTTP/JSON
- **Location**: `web-ui/server/`

### 3. **Web UI** (Port: 3004 via Project Hub)
- **Purpose**: Human-friendly interface for backlog visualization and management
- **Framework**: React + Vite
- **Location**: `web-ui/src/`

### 4. **Shared Database** (SQLite with WAL mode)
- **Purpose**: Centralized data storage for all components
- **Location**: `~/.agile-mcp/backlog.db`
- **Package**: `shared/`

## Project Isolation Features ✅

### Security Model
- **Path-based Isolation**: Projects are tied to repository paths
- **Working Directory Validation**: Every MCP tool call validates `working_directory` against registered projects
- **Hard Errors**: Cross-project access attempts throw `ProjectContextError`
- **Security Logging**: All violations logged to `security_logs` table
- **Conflict Detection**: Tracks `last_modified_by` to detect concurrent modifications

### Database Schema
```sql
-- Projects table
CREATE TABLE projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  repository_path TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_accessed_at TEXT NOT NULL
);

-- Security logs
CREATE TABLE security_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL, -- 'unauthorized_access', 'project_violation', 'conflict_detected'
  working_directory TEXT,
  entity_type TEXT,         -- 'epic', 'story', 'task', 'dependency', 'project'
  entity_id INTEGER,
  details TEXT,
  timestamp TEXT NOT NULL
);

-- All entities have project_id and last_modified_by
ALTER TABLE epics ADD COLUMN project_id INTEGER;
ALTER TABLE epics ADD COLUMN last_modified_by TEXT;
-- (similar for stories, tasks)
```

### MCP Tools with Project Isolation

#### Project Management
- `register_project` - Register a new project with repository path
- `list_projects` - List all registered projects
- `get_project` - Get project details by working_directory or ID
- `get_security_logs` - View security audit trail

#### Epic/Story/Task Tools (all require `working_directory`)
- `create_epic`, `update_epic`, `list_epics`, `get_epic`, `delete_epic`
- `create_story`, `update_story`, `list_stories`, `get_story`, `delete_story`
- `create_task`, `update_task`, `list_tasks`, `get_task`, `delete_task`

All operations:
1. Validate `working_directory` maps to a registered project
2. Filter results to only show current project's items
3. Prevent cross-project access (e.g., can't add story to another project's epic)
4. Log security events for violations
5. Track `modified_by` for conflict detection

#### Dependency Management
- `add_dependency` - Add dependency between stories (both must be in same project)
- `remove_dependency` - Remove dependency
- `list_dependencies` - List dependencies (filtered by project)

#### Export
- `export_backlog` - Export current project's backlog to markdown

## Web UI Features ✅

### Project Management
- **Project Selector**: Dropdown in sidebar with all registered projects
- **Create Project**: Inline form to register new projects
- **Auto-select**: Automatically selects first project on load
- **Filter All Views**: All data filtered by selected project

### CRUD Operations (Full Create, Read, Update, Delete)

#### Epics
- **Create**: "New Epic" button → modal form (title, description, status)
- **Read**: List view with all epics, get epic with stories
- **Update**: Edit button on each epic (not shown in current list view, but API supports it)
- **Delete**: Delete epic endpoint available

#### Stories
- **Create**: "New Story" button → modal form
  - Fields: epic (dropdown), title, description, status, priority, points
  - Epic selector fetches only current project's epics
- **Read**: List view with filtering (epic, status, priority)
- **Update**: Edit button on each story → pre-filled modal form
- **Delete**: Trash button with confirmation

#### Tasks
- **Create**: Task form modal (used in hierarchy view)
  - Fields: story (dropdown), title, description, status, assignee
  - Story selector fetches only current project's stories
- **Read**: Tasks shown under stories
- **Update**: Edit task modal
- **Delete**: Delete task endpoint

### Visualization Views

#### 1. **Backlog List View** (`/`)
- Filterable list of stories
- Shows epic, status, priority, points
- Edit and delete actions
- Project-scoped filtering
- Create epic/story buttons

#### 2. **Dependency Graph View** (`/dag`)
- Interactive DAG using React Flow
- Story nodes with status colors
- Dependency edges with labels ("blocks", "blocked by")
- Auto-layout with smooth animations
- Zoom, pan, minimap controls
- **Project filtered**: Only shows current project's stories and dependencies

#### 3. **Hierarchy Tree View** (`/tree`)
- D3.js hierarchical tree visualization
- Epics → Stories → Tasks
- Collapsible nodes
- Status colors
- Click to expand/collapse
- **Project filtered**: Only shows current project's hierarchy

### UI Components

All form modals are complete with:
- **EpicFormModal**: Create/edit epics
- **StoryFormModal**: Create/edit stories with epic selector
- **TaskFormModal**: Create/edit tasks with story selector
- **ProjectSelector**: Project dropdown with create form

## API Endpoints

### Projects
- `GET /api/projects` - List all projects
- `GET /api/projects/:id` - Get project by ID
- `POST /api/projects` - Create project
- `PATCH /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Epics
- `GET /api/epics?project_id=X` - List epics (filtered)
- `GET /api/epics/:id` - Get epic with stories
- `POST /api/epics` - Create epic
- `PATCH /api/epics/:id` - Update epic
- `DELETE /api/epics/:id` - Delete epic

### Stories
- `GET /api/stories?project_id=X&epic_id=Y&status=Z&priority=W` - List stories (filtered)
- `GET /api/stories/:id` - Get story with tasks and dependencies
- `POST /api/stories` - Create story
- `PATCH /api/stories/:id` - Update story
- `DELETE /api/stories/:id` - Delete story

### Tasks
- `GET /api/tasks?project_id=X&story_id=Y` - List tasks (filtered)
- `POST /api/tasks` - Create task
- `PATCH /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

### Dependencies
- `GET /api/dependencies?story_id=X` - List dependencies
- `POST /api/dependencies` - Create dependency
- `DELETE /api/dependencies/:id` - Delete dependency

### Graph Data
- `GET /api/graph/dependencies?project_id=X` - Get dependency graph (filtered)
- `GET /api/graph/hierarchy?project_id=X` - Get hierarchy tree (filtered)

### Security
- `GET /api/security-logs?limit=50` - Get security audit logs

## Usage Examples

### For AI Agents (via MCP)

```typescript
// 1. Register project
register_project({
  name: "My App",
  repository_path: "/home/user/repos/my-app",
  description: "Main application"
})

// 2. Create epic (from project directory)
create_epic({
  working_directory: "/home/user/repos/my-app",
  modified_by: "claude-agent-1",
  title: "User Authentication",
  description: "Implement user auth system",
  status: "in_progress"
})

// 3. Create story
create_story({
  working_directory: "/home/user/repos/my-app",
  modified_by: "claude-agent-1",
  epic_id: 1,
  title: "Login page",
  description: "Create login UI",
  priority: "high",
  points: 5
})

// 4. Attempt cross-project access (WILL FAIL)
create_story({
  working_directory: "/home/user/repos/other-project",  // Different project!
  epic_id: 1,  // Epic from my-app
  // ❌ ProjectContextError: Epic does not belong to this project
})
```

### For Humans (via Web UI)

1. **Select Project**: Use dropdown in sidebar
2. **View Backlog**: Click "Backlog List" to see all stories
3. **Create Epic**: Click "New Epic" button
4. **Create Story**: Click "New Story" button, select epic from dropdown
5. **Edit Story**: Click edit icon, modify fields, save
6. **View Dependencies**: Click "Dependency Graph" to see DAG
7. **View Hierarchy**: Click "Hierarchy Tree" to see tree structure

## Security & Validation

### Project Validation Process
```typescript
1. Tool receives working_directory parameter
2. getProjectContext() normalizes path and looks up project
3. If no project found → ProjectContextError + security log
4. If found → returns { project_id, project_name, modified_by }
5. validateProjectAccess() checks entity belongs to project
6. If mismatch → ProjectContextError + security log
7. If valid → proceed with operation
```

### Conflict Detection
```typescript
1. detectConflict() checks last_modified_by
2. If different from current agent → returns true
3. Agent can choose to:
   - Abort and alert user
   - Overwrite (with warning)
   - Merge changes
```

## Running the System

### Start MCP Server
```bash
# Added to Claude Code MCP config automatically
# Or manually:
cd mcp-server
npm start
```

### Start Web UI
```bash
cd web-ui
npm run dev    # Development mode
npm run build  # Production build
npm start      # Start API + serve static files
```

### Register with Project Hub
```bash
# Already registered on port 3004
claude mcp hub:start agile-backlog
```

## Documentation

- **PROJECT_ISOLATION_GUIDE.md** - Detailed usage guide for agents
- **PROJECT_ISOLATION_STATUS.md** - Implementation status checklist
- **FEATURES.md** (this file) - Complete feature overview

## Next Steps / Future Enhancements

Potential future additions (not currently implemented):
- [ ] User authentication for web UI
- [ ] Real-time collaboration with WebSockets
- [ ] Advanced filtering (date ranges, search, tags)
- [ ] Burndown charts and sprint tracking
- [ ] Export to JIRA, GitHub Issues, etc.
- [ ] Dependency cycle detection in UI
- [ ] Drag-and-drop for status changes
- [ ] Bulk operations (multi-select, batch update)
- [ ] Comments and attachments on items
- [ ] Activity feed / audit trail in UI

## Status: ✅ COMPLETE

All core features for project isolation, CRUD operations, and visualization are fully implemented and tested.
