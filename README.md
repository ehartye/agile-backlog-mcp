# Agile MCP

> A comprehensive agile backlog management system built with the Model Context Protocol (MCP), featuring project isolation, multi-agent support, and interactive visualization

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb)](https://reactjs.org/)

## Overview

Agile MCP provides a complete agile backlog management solution that bridges AI agents and human teams. It consists of three integrated components:

- **MCP Server**: Exposes agile backlog tools via Model Context Protocol for AI agents (Claude, etc.)
- **Web UI**: Interactive dashboard for humans with dependency graphs and hierarchy trees
- **Shared Database**: SQLite database with project isolation and security auditing

## Key Features

### 🔒 Project Isolation
- **Identifier-based security**: Each project has a unique identifier
- **Multi-project support**: Manage multiple repositories in a single database
- **Access control**: AI agents can only access items from their registered project
- **Security auditing**: All access attempts logged for compliance

### 🤖 MCP Server (AI Agent Interface)
- **Epic, Story, and Task Management**: Full CRUD operations
- **Sprint & Iteration Planning**: Create sprints, manage capacity, track velocity
- **Burndown Tracking**: Daily snapshots and burndown chart data
- **Dependency Tracking**: Create dependencies with circular dependency prevention
- **Conflict Detection**: Track modifications to detect concurrent edits
- **Export Capabilities**: Export backlog data for analysis
- **MCP Resources**: Read-only views for backlog overview and dependencies

### 🌐 Web UI (Human Interface)
- **Project Management**: Register and switch between projects
- **Full CRUD Operations**: Create, edit, and delete epics, stories, and tasks
- **Sprint Management**: Create and manage sprints, add/remove stories
- **Sprint Board**: Kanban-style board with drag-and-drop (5 status columns)
- **Burndown Charts**: Visual burndown tracking with ideal vs actual lines
- **Velocity Reports**: Historical velocity calculation for sprint planning
- **Backlog List View**: Filterable list with sprint and epic filtering
- **Dependency Graph**: Interactive React Flow visualization showing story dependencies
- **Hierarchy Tree**: D3-powered tree view of Epic → Story → Task relationships
- **Responsive Design**: Mobile-friendly interface with adaptive layouts

### 💾 Database & Security
- **SQLite with WAL mode**: Fast, reliable local storage
- **Foreign key constraints**: Cascade deletes maintain data integrity
- **Automatic migrations**: Database schema updates applied automatically
- **Security logs**: Audit trail for unauthorized access attempts
- **Conflict detection**: Track concurrent modifications

## Architecture

```
agile-mcp/
├── mcp-server/          # MCP server for AI agent access
│   ├── src/
│   │   ├── tools/       # Tool handlers (project, epic, story, task, dependency)
│   │   ├── resources/   # MCP resource handlers
│   │   └── index.ts     # Server entry point
│   └── package.json
├── web-ui/              # React visualization dashboard
│   ├── server/          # Express REST API server (port 3004)
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

## Quick Start

### Prerequisites
- Node.js 18+
- npm 9+

### Installation

```bash
# Install dependencies for all workspaces
npm install

# Build shared package
cd shared && npm run build && cd ..

# Build MCP server
cd mcp-server && npm run build && cd ..
```

### Usage

#### For AI Agents (MCP Server)

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "agile-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/agile-mcp/mcp-server/dist/index.js"]
    }
  }
}
```

Then in Claude:

```
Register this project: "my-app"
Create an epic for user authentication
Add a story for login functionality to that epic
```

#### For Humans (Web UI)

```bash
cd web-ui
npm run dev
```

Visit http://localhost:3004 to access:
- **Backlog List** (`/`) - Filterable story list with CRUD operations and sprint filtering
- **Sprint Board** (`/project/:id/sprint/:sprintId`) - Kanban board for active sprints
- **Burndown Chart** (`/project/:id/sprint/:sprintId/burndown`) - Sprint burndown visualization
- **Dependency Graph** (`/project/:id/dag`) - Interactive dependency visualization
- **Hierarchy Tree** (`/project/:id/tree`) - Epic → Story → Task hierarchy

## Core Concepts

### Projects
Each project represents a codebase/repository with its own isolated backlog:
- Unique identifier (e.g., `"frontend-app"`, `"api-service"`)
- All epics, stories, and tasks belong to a project
- AI agents must register projects before creating backlog items

### Epics, Stories, and Tasks
Standard agile hierarchy:
- **Epics**: High-level feature areas or initiatives
- **Stories**: User stories with priority, points, and status
- **Tasks**: Actionable sub-items of stories

### Sprints & Iterations
Time-boxed work periods with capacity planning:
- **Sprint lifecycle**: planning → active → completed
- **Story assignment**: Add/remove stories from sprints
- **Capacity tracking**: Monitor committed vs completed points
- **Burndown charts**: Track remaining work over time
- **Velocity metrics**: Calculate historical team velocity
- **Daily snapshots**: Record progress for burndown visualization

### Dependencies
Story-to-story relationships:
- **blocks** / **blocked_by** dependency types
- Automatic circular dependency detection
- Visualized in dependency graph view

### Status Workflow
All items follow this workflow:
```
todo → in_progress → review → done
        ↓              ↑
      blocked ────────┘
```

## Technology Stack

| Layer | Technology |
|-------|-----------|
| **MCP Protocol** | @modelcontextprotocol/sdk |
| **Database** | SQLite (better-sqlite3) |
| **Backend API** | Express.js, TypeScript |
| **Frontend** | React 18, TypeScript, Vite |
| **Graph Visualization** | React Flow (@xyflow/react) |
| **Tree Visualization** | D3.js |
| **Styling** | Tailwind CSS |
| **Icons** | Lucide React |

## Documentation

- **[QUICKSTART.md](./QUICKSTART.md)** - Get started in 5 minutes
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Technical architecture and design
- **[MCP_SERVER.md](./MCP_SERVER.md)** - Complete MCP tool reference for AI agents
- **[API_REFERENCE.md](./API_REFERENCE.md)** - REST API documentation for developers
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Production deployment guide

## Example Workflows

### AI Agent Workflow

```typescript
// 1. Register project
Tool: register_project
{
  "project_identifier": "my-app",
  "name": "My Application",
  "description": "Main application project"
}

// 2. Create epic
Tool: create_epic
{
  "project_identifier": "my-app",
  "agent_identifier": "claude",
  "title": "User Authentication",
  "description": "Implement secure user authentication"
}

// 3. Create story
Tool: create_story
{
  "project_identifier": "my-app",
  "agent_identifier": "claude",
  "epic_id": 1,
  "title": "Login page",
  "description": "Create login UI with email and password",
  "priority": "high",
  "points": 5
}

// 4. Add dependency
Tool: add_dependency
{
  "project_identifier": "my-app",
  "agent_identifier": "claude",
  "story_id": 2,
  "depends_on_story_id": 1,
  "dependency_type": "blocks"
}
```

### Web UI Workflow

1. Open http://localhost:3004
2. Select project from dropdown (or create new project)
3. Click "New Epic" to create an epic
4. Click "New Story" to create a story
5. Click "New Sprint" to create a sprint for iteration planning
6. Add stories to sprints from story detail pages
7. View active sprint board by clicking "Active Sprint" button
8. Track progress with burndown charts
9. Use edit/delete icons for modifications
10. Switch to "Dependency Graph" to visualize relationships
11. Switch to "Hierarchy Tree" to see the full hierarchy

## Security Features

### Project Isolation
- Each project has a unique identifier
- All MCP tools validate project access
- Cross-project access attempts are blocked and logged

### Audit Trail
- Security logs track all access violations
- Event types: `unauthorized_access`, `project_violation`, `conflict_detected`
- Accessible via `/api/security-logs` endpoint

### Conflict Detection
- Tracks `last_modified_by` for all entities
- Detects concurrent modifications
- Warns when multiple agents edit the same item

## Development

### Build All Packages

```bash
npm run build
```

### Watch Mode

```bash
# MCP server
cd mcp-server && npm run dev

# Web UI (runs both API server and Vite dev server)
cd web-ui && npm run dev
```

### Database Location

The SQLite database is created at `./agile-backlog.db` in the project root.

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

- **Issues**: Report bugs or request features via GitHub issues
- **Documentation**: See docs/ directory for detailed guides
- **MCP SDK**: https://github.com/anthropics/mcp

---

**Built with ❤️ for seamless AI-human collaboration in agile development**
