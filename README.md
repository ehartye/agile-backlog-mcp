# Agile MCP - Backlog Management for AI Agents

A comprehensive agile backlog management system built with the Model Context Protocol (MCP), featuring a web UI for dependency visualization.

## Features

### MCP Server (AI Agent Interface)
- **Project Isolation** ⭐ NEW - Path-based security with working directory validation
- **Epic, Story, and Task Management** - Full CRUD operations
- **Dependency Tracking** - Create dependencies with circular dependency prevention
- **Status Workflow System** - Enforced status transitions (todo → in_progress → review → done)
- **Conflict Detection** - Tracks modifications to detect concurrent edits
- **Security Logging** - Audit trail for unauthorized access attempts
- **Markdown Export** - Export backlog to markdown files (agile-planner format)
- **MCP Resources** - Read-only views for backlog overview, dependencies, and hierarchy

### Web UI (Human Interface)
- **Project Management** ⭐ NEW - Register and switch between projects
- **Full CRUD Operations** ⭐ NEW - Create, edit, and delete epics, stories, and tasks via modal forms
- **Backlog List View** - Filterable list of all stories with epic grouping
- **Dependency Graph (DAG)** - Interactive React Flow visualization of story dependencies (project-filtered)
- **Hierarchy Tree** - D3-powered tree view of Epic → Story → Task relationships (project-filtered)

### Shared Database
- **SQLite** - Lightweight database with WAL mode
- **Project Isolation** - Projects table with repository path tracking
- **Security Audit** - Security logs table for compliance
- **Hybrid Storage** - Database backend with markdown export capability
- **Type-Safe** - Full TypeScript types shared across all components

## Architecture

```
agile-mcp/
├── mcp-server/          # MCP server for AI agent access
│   ├── src/
│   │   ├── tools/       # MCP tool handlers
│   │   ├── resources/   # MCP resource handlers
│   │   └── index.ts     # Server entry point
│   └── package.json
├── web-ui/              # React visualization dashboard
│   ├── server/          # Express API server
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── utils/       # API client
│   │   └── types/       # TypeScript types
│   └── package.json
├── shared/              # Shared database schema & types
│   └── src/
│       ├── database.ts  # SQLite database class
│       └── types.ts     # Shared TypeScript types
└── agile-backlog.db     # SQLite database file
```

## Installation

### Prerequisites
- Node.js 18+
- npm 9+

### Setup

1. **Clone the repository**
   ```bash
   cd agile-mcp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

   This will install dependencies for all workspaces (shared, mcp-server, web-ui).

3. **Build shared package**
   ```bash
   cd shared
   npm run build
   cd ..
   ```

4. **Build MCP server**
   ```bash
   cd mcp-server
   npm run build
   cd ..
   ```

## Usage

### MCP Server (for AI Agents)

#### Configure in Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "agile-backlog": {
      "command": "node",
      "args": ["/path/to/agile-mcp/mcp-server/dist/index.js"]
    }
  }
}
```

#### Available MCP Tools

**Projects:** ⭐ NEW
- `register_project` - Register a new project with repository path
- `list_projects` - List all registered projects
- `get_project` - Get project details by working directory or ID
- `get_security_logs` - View security audit logs

**Epics:** (all require `working_directory` parameter)
- `create_epic` - Create a new epic in current project
- `update_epic` - Update an existing epic (with conflict detection)
- `list_epics` - List all epics in current project
- `get_epic` - Get epic with all stories
- `delete_epic` - Delete an epic from current project

**Stories:** (all require `working_directory` parameter)
- `create_story` - Create a new user story in current project
- `update_story` - Update an existing story (with conflict detection)
- `list_stories` - List stories (with filters, project-scoped)
- `get_story` - Get story with tasks and dependencies
- `delete_story` - Delete a story from current project

**Tasks:** (all require `working_directory` parameter)
- `create_task` - Create a new task in current project
- `update_task` - Update an existing task (with conflict detection)
- `list_tasks` - List tasks (with filters, project-scoped)
- `get_task` - Get a specific task
- `delete_task` - Delete a task from current project

**Dependencies:** (all require `working_directory` parameter)
- `add_dependency` - Add story dependency (both stories must be in same project)
- `remove_dependency` - Remove dependency
- `list_dependencies` - List all dependencies in current project

**Export:** (requires `working_directory` parameter)
- `export_backlog` - Export current project's backlog to markdown files

#### Available MCP Resources

- `backlog://overview` - Complete backlog summary
- `backlog://dependencies` - Dependency graph data
- `backlog://hierarchy` - Hierarchical tree data

#### Example Usage with AI Agent

```
User: Register this project with the agile backlog tool

AI: I'll register your project.
[Uses register_project tool with current directory path]

User: Create an epic for user authentication

AI: I'll create an authentication epic for you in this project.
[Uses create_epic tool with working_directory]

User: Add a story for login functionality to that epic

AI: I'll add a login story to the authentication epic.
[Uses create_story tool with working_directory and epic_id]

User: The login story depends on the session management story

AI: I'll add a dependency between these stories in your project.
[Uses add_dependency tool with working_directory]

User: Show me all the dependencies

AI: Here's the dependency graph for your project.
[Reads backlog://dependencies resource]

User: Export everything to markdown

AI: I'll export your project's backlog.
[Uses export_backlog tool with working_directory]
```

#### Project Isolation Security

All tools (except `register_project` and `list_projects`) require a `working_directory` parameter:

- **Validates Path**: Checks that working_directory matches a registered project
- **Filters Results**: Only shows items from the current project
- **Prevents Cross-Project Access**: Throws error if trying to access another project's items
- **Logs Violations**: Records unauthorized access attempts in security_logs table
- **Conflict Detection**: Tracks `last_modified_by` to detect concurrent edits

See [PROJECT_ISOLATION_GUIDE.md](./PROJECT_ISOLATION_GUIDE.md) for detailed usage guide.

### Web UI (for Humans)

#### Start the Development Servers

**Option 1: Via Project Hub** (Recommended)
1. Open the Project Hub Dashboard: http://100.76.77.115:3000
2. Find "agile-mcp" and click "Start"
3. Access the UI at http://100.76.77.115:3004

**Option 2: Via Command Line**
```bash
# From web-ui directory
cd web-ui
npm run dev
```

This starts:
- **API Server** on http://localhost:3001
- **Web UI** on http://localhost:3004

See [PROJECT_HUB.md](./PROJECT_HUB.md) for more details on hub integration.

#### Web UI Features

**Project Management:**
- Select active project from dropdown in sidebar
- Create new projects with inline form
- All views automatically filter by selected project

**CRUD Operations:** ⭐ NEW
- **Create**: "New Epic" and "New Story" buttons with modal forms
- **Edit**: Click edit icon on any story to modify
- **Delete**: Trash icon with confirmation for stories
- Full CRUD support for epics, stories, and tasks

#### Views

1. **Backlog List** (http://localhost:3004/)
   - View all stories in a filterable list (project-scoped)
   - Filter by epic, status, and priority
   - Create/edit epics and stories via modal forms
   - Delete stories with confirmation
   - Quick overview of backlog items

2. **Dependency Graph** (http://localhost:3004/dag)
   - Interactive DAG visualization (project-scoped)
   - Color-coded by status
   - Shows blocking relationships
   - Zoom, pan, and minimap controls
   - Auto-layout algorithm

3. **Hierarchy Tree** (http://localhost:3004/tree)
   - D3-powered tree visualization (project-scoped)
   - Epic → Story → Task hierarchy
   - Collapsible branches
   - Zoom and pan enabled
   - Status-colored nodes

## Data Model

### Project ⭐ NEW
```typescript
{
  id: number;
  name: string;
  repository_path: string;  // Unique absolute path
  description: string;
  created_at: string;
  updated_at: string;
  last_accessed_at: string;
}
```

### Epic
```typescript
{
  id: number;
  project_id: number;           // ⭐ NEW
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'review' | 'done' | 'blocked';
  last_modified_by: string;     // ⭐ NEW
  created_at: string;
  updated_at: string;
}
```

### Story
```typescript
{
  id: number;
  project_id: number;           // ⭐ NEW
  epic_id: number | null;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'review' | 'done' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'critical';
  points: number | null;
  last_modified_by: string;     // ⭐ NEW
  created_at: string;
  updated_at: string;
}
```

### Task
```typescript
{
  id: number;
  project_id: number;           // ⭐ NEW
  story_id: number;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'review' | 'done' | 'blocked';
  assignee: string | null;
  last_modified_by: string;     // ⭐ NEW
  created_at: string;
  updated_at: string;
}
```

### Dependency
```typescript
{
  id: number;
  story_id: number;
  depends_on_story_id: number;
  dependency_type: 'blocks' | 'blocked_by';
  created_at: string;
}
```

### Security Log ⭐ NEW
```typescript
{
  id: number;
  event_type: 'unauthorized_access' | 'project_violation' | 'conflict_detected';
  working_directory: string;
  entity_type: 'epic' | 'story' | 'task' | 'dependency' | 'project';
  entity_id: number | null;
  details: string;
  timestamp: string;
}
```

## Status Workflow

All entities (epics, stories, tasks) follow this workflow:

```
todo → in_progress → review → done
        ↓              ↑
      blocked ────────┘
```

Allowed transitions are enforced by the database.

## Development

### Project Structure

- **Monorepo** - Uses npm workspaces
- **Shared Package** - Common database and types
- **MCP Server** - Standalone MCP server for AI agents
- **Web UI** - React frontend + Express backend

### Build

```bash
# Build all packages
npm run build

# Build specific package
npm run build --workspace=shared
npm run build --workspace=mcp-server
npm run build --workspace=web-ui
```

### Development Mode

```bash
# Watch mode for shared package
cd shared && npm run dev

# Watch mode for MCP server
cd mcp-server && npm run dev

# Dev server for web UI (runs both API and client)
cd web-ui && npm run dev
```

## Database

The SQLite database is created automatically at `~/.agile-mcp/backlog.db` with the following tables:

- `projects` ⭐ NEW - Registered projects with repository paths
- `security_logs` ⭐ NEW - Security audit trail
- `epics` - Epic entities (with project_id and last_modified_by)
- `stories` - User story entities (with project_id and last_modified_by)
- `tasks` - Task entities (with project_id and last_modified_by)
- `dependencies` - Story dependencies (project-scoped)
- `status_transitions` - Allowed status transitions

### Backup

```bash
# Backup database
cp agile-backlog.db agile-backlog.backup.db

# Export to markdown
# Use the export_backlog MCP tool
```

## Technologies

- **MCP SDK** - @modelcontextprotocol/sdk
- **Database** - better-sqlite3
- **Backend** - Express.js
- **Frontend** - React + TypeScript + Vite
- **Graph Viz** - React Flow (@xyflow/react)
- **Tree Viz** - D3.js
- **Styling** - Tailwind CSS

## License

MIT

## Contributing

Contributions welcome! Please open an issue or PR.
