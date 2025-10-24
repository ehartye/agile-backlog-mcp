# MCP Server Reference

> Complete reference for AI agents using Agile MCP via Model Context Protocol

## Table of Contents

- [Overview](#overview)
- [Installation & Configuration](#installation--configuration)
- [Project Isolation](#project-isolation)
- [Tool Catalog](#tool-catalog)
  - [Project Tools](#project-tools)
  - [Epic Tools](#epic-tools)
  - [Story Tools](#story-tools)
  - [Task Tools](#task-tools)
  - [Dependency Tools](#dependency-tools)
  - [Export Tools](#export-tools)
- [Resources](#resources)
- [Workflows](#workflows)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)

---

## Overview

The Agile MCP server exposes agile backlog management tools via the Model Context Protocol. It enables AI agents to:

- Register and manage projects with unique identifiers
- Create and maintain epics, stories, and tasks
- Track dependencies between stories
- Export backlog data for analysis
- Collaborate with other agents using conflict detection

**Key Features:**
- **Project Isolation**: All operations scoped to specific projects
- **Security Auditing**: All access attempts logged
- **Conflict Detection**: Tracks concurrent modifications
- **Circular Dependency Prevention**: Automatic validation

---

## Installation & Configuration

### Build the MCP Server

```bash
cd mcp-server
npm install
npm run build
```

### Configure in Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or equivalent:

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

### Configure in Claude Code

The MCP server is automatically configured when Claude Code detects the project.

### Verify Installation

After restarting Claude, test with:

```
List all available projects
```

---

## Project Isolation

### Core Concept

All backlog items (epics, stories, tasks) belong to a specific project. Projects are identified by unique string identifiers like `"frontend-app"` or `"api-service"`.

**Every MCP tool call (except project management) requires two parameters:**
- `project_identifier`: The unique identifier of the project you're working with
- `agent_identifier`: Your agent's identifier for tracking and conflict detection

### Workflow

```
1. Register project (once per repository)
   ├─ project_identifier: "my-app"
   └─ Creates project record

2. Use project_identifier in all subsequent calls
   ├─ Validates project exists
   ├─ Filters results to that project
   └─ Prevents cross-project access

3. All operations scoped to your project
   ├─ create_epic(project_identifier="my-app", ...)
   ├─ create_story(project_identifier="my-app", ...)
   └─ list_stories(project_identifier="my-app")
```

### Security

**Access Control:**
- Unregistered project identifiers → `PROJECT_NOT_REGISTERED` error
- Attempts to access other project's items → `PROJECT_ACCESS_DENIED` error
- All violations logged to security_logs table

**Audit Trail:**
```json
{
  "event_type": "unauthorized_access",
  "agent_identifier": "claude",
  "attempted_path": "unregistered-project",
  "message": "Attempted access to unregistered project"
}
```

---

## Tool Catalog

### Project Tools

#### register_project

Register a new project with a unique identifier.

**Parameters:**
```typescript
{
  project_identifier: string;  // Unique identifier (e.g., "my-app")
  name: string;                // Display name
  description: string;         // Project description
  agent_identifier: string;    // Your agent identifier
}
```

**Example:**
```
Tool: register_project
{
  "project_identifier": "frontend-app",
  "name": "Frontend Application",
  "description": "React-based web application",
  "agent_identifier": "claude"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Project registered successfully",
  "project": {
    "id": 1,
    "identifier": "frontend-app",
    "name": "Frontend Application",
    "description": "React-based web application",
    "created_at": "2025-10-24T12:00:00Z",
    "updated_at": "2025-10-24T12:00:00Z",
    "last_accessed_at": "2025-10-24T12:00:00Z"
  }
}
```

---

#### list_projects

List all registered projects, sorted by last accessed.

**Parameters:**
```typescript
{
  agent_identifier: string;  // Your agent identifier
}
```

**Example:**
```
Tool: list_projects
{
  "agent_identifier": "claude"
}
```

**Response:**
```json
{
  "success": true,
  "count": 2,
  "projects": [
    {
      "id": 1,
      "identifier": "frontend-app",
      "name": "Frontend Application",
      "description": "React-based web application",
      "created_at": "2025-10-24T12:00:00Z",
      "updated_at": "2025-10-24T12:00:00Z",
      "last_accessed_at": "2025-10-24T14:00:00Z"
    }
  ]
}
```

---

#### get_project

Get project details by identifier or ID.

**Parameters:**
```typescript
{
  project_identifier?: string;  // Project identifier
  id?: number;                  // Or project ID
  agent_identifier: string;     // Your agent identifier
}
```

**Example:**
```
Tool: get_project
{
  "project_identifier": "frontend-app",
  "agent_identifier": "claude"
}
```

---

#### update_project

Update project details.

**Parameters:**
```typescript
{
  project_identifier: string;   // Project to update
  agent_identifier: string;     // Your agent identifier
  name?: string;                // New display name
  description?: string;         // New description
}
```

---

#### delete_project

Delete a project and all its epics, stories, and tasks (CASCADE).

**Parameters:**
```typescript
{
  project_identifier: string;  // Project to delete
  agent_identifier: string;    // Your agent identifier
}
```

**Warning**: This is irreversible and deletes all related data.

---

#### get_security_logs

View security event logs for auditing.

**Parameters:**
```typescript
{
  agent_identifier: string;  // Your agent identifier
  limit?: number;            // Max logs to return (default: 50)
}
```

**Example:**
```
Tool: get_security_logs
{
  "agent_identifier": "claude",
  "limit": 10
}
```

**Response:**
```json
{
  "success": true,
  "count": 2,
  "logs": [
    {
      "id": 1,
      "event_type": "unauthorized_access",
      "project_id": null,
      "agent_identifier": "other-agent",
      "attempted_path": "unregistered-project",
      "entity_type": null,
      "entity_id": null,
      "message": "Attempted access to unregistered project",
      "created_at": "2025-10-24T12:00:00Z"
    }
  ]
}
```

---

### Epic Tools

#### create_epic

Create a new epic in a project.

**Parameters:**
```typescript
{
  project_identifier: string;  // REQUIRED: Project identifier
  agent_identifier: string;    // REQUIRED: Your agent identifier
  title: string;               // REQUIRED: Epic title
  description: string;         // REQUIRED: Epic description
  status?: string;             // Optional: 'todo', 'in_progress', 'review', 'done', 'blocked' (default: 'todo')
}
```

**Example:**
```
Tool: create_epic
{
  "project_identifier": "frontend-app",
  "agent_identifier": "claude",
  "title": "User Authentication System",
  "description": "Implement secure user authentication with JWT tokens",
  "status": "in_progress"
}
```

**Response:**
```json
{
  "success": true,
  "epic": {
    "id": 1,
    "project_id": 1,
    "title": "User Authentication System",
    "description": "Implement secure user authentication with JWT tokens",
    "status": "in_progress",
    "agent_identifier": "claude",
    "last_modified_by": "claude",
    "created_at": "2025-10-24T12:00:00Z",
    "updated_at": "2025-10-24T12:00:00Z"
  },
  "project": "frontend-app"
}
```

---

#### update_epic

Update an existing epic.

**Parameters:**
```typescript
{
  project_identifier: string;  // REQUIRED: Project identifier
  agent_identifier: string;    // REQUIRED: Your agent identifier
  id: number;                  // REQUIRED: Epic ID
  title?: string;              // New title
  description?: string;        // New description
  status?: string;             // New status
}
```

**Example:**
```
Tool: update_epic
{
  "project_identifier": "frontend-app",
  "agent_identifier": "claude",
  "id": 1,
  "status": "review"
}
```

**Response with Conflict Detection:**
```json
{
  "success": true,
  "epic": { /* updated epic */ },
  "conflict_detected": true,
  "warning": "This epic was recently modified by agent: other-agent"
}
```

---

#### list_epics

List all epics in a project.

**Parameters:**
```typescript
{
  project_identifier: string;  // REQUIRED: Project identifier
  agent_identifier: string;    // REQUIRED: Your agent identifier
  status?: string;             // Optional: Filter by status
}
```

**Example:**
```
Tool: list_epics
{
  "project_identifier": "frontend-app",
  "agent_identifier": "claude",
  "status": "in_progress"
}
```

---

#### get_epic

Get epic details with all associated stories.

**Parameters:**
```typescript
{
  project_identifier: string;  // REQUIRED: Project identifier
  agent_identifier: string;    // REQUIRED: Your agent identifier
  id: number;                  // REQUIRED: Epic ID
}
```

**Response:**
```json
{
  "success": true,
  "epic": {
    "id": 1,
    "title": "User Authentication System",
    /* ... epic fields ... */
    "stories": [
      {
        "id": 1,
        "epic_id": 1,
        "title": "Login Page",
        /* ... story fields ... */
      }
    ]
  },
  "project": "frontend-app"
}
```

---

#### delete_epic

Delete an epic (sets epic_id to NULL for associated stories).

**Parameters:**
```typescript
{
  project_identifier: string;  // REQUIRED: Project identifier
  agent_identifier: string;    // REQUIRED: Your agent identifier
  id: number;                  // REQUIRED: Epic ID
}
```

---

### Story Tools

#### create_story

Create a new user story.

**Parameters:**
```typescript
{
  project_identifier: string;  // REQUIRED: Project identifier
  agent_identifier: string;    // REQUIRED: Your agent identifier
  title: string;               // REQUIRED: Story title
  description: string;         // REQUIRED: Story description
  epic_id?: number;            // Optional: Epic to associate with
  status?: string;             // Optional: Status (default: 'todo')
  priority?: string;           // Optional: 'low', 'medium', 'high', 'critical' (default: 'medium')
  points?: number;             // Optional: Story points
}
```

**Example:**
```
Tool: create_story
{
  "project_identifier": "frontend-app",
  "agent_identifier": "claude",
  "epic_id": 1,
  "title": "Login Page",
  "description": "Create login UI with email and password fields",
  "priority": "high",
  "points": 5
}
```

**Response:**
```json
{
  "success": true,
  "story": {
    "id": 1,
    "project_id": 1,
    "epic_id": 1,
    "title": "Login Page",
    "description": "Create login UI with email and password fields",
    "status": "todo",
    "priority": "high",
    "points": 5,
    "agent_identifier": "claude",
    "last_modified_by": "claude",
    "created_at": "2025-10-24T12:00:00Z",
    "updated_at": "2025-10-24T12:00:00Z"
  },
  "project": "frontend-app"
}
```

---

#### update_story

Update an existing story.

**Parameters:**
```typescript
{
  project_identifier: string;  // REQUIRED: Project identifier
  agent_identifier: string;    // REQUIRED: Your agent identifier
  id: number;                  // REQUIRED: Story ID
  epic_id?: number;            // New epic (or null to make orphan)
  title?: string;              // New title
  description?: string;        // New description
  status?: string;             // New status
  priority?: string;           // New priority
  points?: number;             // New points
}
```

---

#### list_stories

List stories with optional filters.

**Parameters:**
```typescript
{
  project_identifier: string;   // REQUIRED: Project identifier
  agent_identifier: string;     // REQUIRED: Your agent identifier
  epic_id?: number;             // Filter by epic
  status?: string;              // Filter by status
  priority?: string;            // Filter by priority
  has_dependencies?: boolean;   // Filter stories with/without dependencies
}
```

**Example:**
```
Tool: list_stories
{
  "project_identifier": "frontend-app",
  "agent_identifier": "claude",
  "status": "todo",
  "priority": "high"
}
```

---

#### get_story

Get story details with tasks and dependencies.

**Parameters:**
```typescript
{
  project_identifier: string;  // REQUIRED: Project identifier
  agent_identifier: string;    // REQUIRED: Your agent identifier
  id: number;                  // REQUIRED: Story ID
}
```

**Response:**
```json
{
  "success": true,
  "story": {
    "id": 1,
    "title": "Login Page",
    /* ... story fields ... */
    "tasks": [
      {
        "id": 1,
        "story_id": 1,
        "title": "Design login form",
        /* ... task fields ... */
      }
    ],
    "dependencies": [
      {
        "id": 1,
        "story_id": 1,
        "depends_on_story_id": 2,
        "dependency_type": "blocks"
      }
    ]
  },
  "project": "frontend-app"
}
```

---

#### delete_story

Delete a story and all its tasks (CASCADE).

**Parameters:**
```typescript
{
  project_identifier: string;  // REQUIRED: Project identifier
  agent_identifier: string;    // REQUIRED: Your agent identifier
  id: number;                  // REQUIRED: Story ID
}
```

---

### Task Tools

#### create_task

Create a new task under a story.

**Parameters:**
```typescript
{
  project_identifier: string;  // REQUIRED: Project identifier
  agent_identifier: string;    // REQUIRED: Your agent identifier
  story_id: number;            // REQUIRED: Story to attach task to
  title: string;               // REQUIRED: Task title
  description: string;         // REQUIRED: Task description
  status?: string;             // Optional: Status (default: 'todo')
  assignee?: string;           // Optional: Assignee name
}
```

**Example:**
```
Tool: create_task
{
  "project_identifier": "frontend-app",
  "agent_identifier": "claude",
  "story_id": 1,
  "title": "Design login form mockup",
  "description": "Create Figma mockup of login form",
  "assignee": "designer"
}
```

---

#### update_task

Update an existing task.

**Parameters:**
```typescript
{
  project_identifier: string;  // REQUIRED: Project identifier
  agent_identifier: string;    // REQUIRED: Your agent identifier
  id: number;                  // REQUIRED: Task ID
  title?: string;              // New title
  description?: string;        // New description
  status?: string;             // New status
  assignee?: string;           // New assignee
}
```

---

#### list_tasks

List tasks with optional filters.

**Parameters:**
```typescript
{
  project_identifier: string;  // REQUIRED: Project identifier
  agent_identifier: string;    // REQUIRED: Your agent identifier
  story_id?: number;           // Filter by story
  status?: string;             // Filter by status
  assignee?: string;           // Filter by assignee
}
```

---

#### delete_task

Delete a task.

**Parameters:**
```typescript
{
  project_identifier: string;  // REQUIRED: Project identifier
  agent_identifier: string;    // REQUIRED: Your agent identifier
  id: number;                  // REQUIRED: Task ID
}
```

---

### Dependency Tools

#### add_dependency

Create a dependency between two stories.

**Parameters:**
```typescript
{
  project_identifier: string;    // REQUIRED: Project identifier
  agent_identifier: string;      // REQUIRED: Your agent identifier
  story_id: number;              // REQUIRED: Story that has the dependency
  depends_on_story_id: number;   // REQUIRED: Story that is depended upon
  dependency_type: string;       // REQUIRED: 'blocks' or 'blocked_by'
}
```

**Example:**
```
Tool: add_dependency
{
  "project_identifier": "frontend-app",
  "agent_identifier": "claude",
  "story_id": 2,
  "depends_on_story_id": 1,
  "dependency_type": "blocks"
}
```

**Validation:**
- Both stories must be in the same project
- Automatically checks for circular dependencies (BFS algorithm)
- Prevents duplicate dependencies (UNIQUE constraint)

**Error if Circular:**
```json
{
  "success": false,
  "error": "Cannot create dependency: would create circular dependency"
}
```

---

#### remove_dependency

Remove a dependency.

**Parameters:**
```typescript
{
  project_identifier: string;  // REQUIRED: Project identifier
  agent_identifier: string;    // REQUIRED: Your agent identifier
  id: number;                  // REQUIRED: Dependency ID
}
```

---

#### list_dependencies

List dependencies, optionally filtered by story or project.

**Parameters:**
```typescript
{
  project_identifier: string;  // REQUIRED: Project identifier
  agent_identifier: string;    // REQUIRED: Your agent identifier
  story_id?: number;           // Optional: Filter by story
}
```

---

### Relationship Tools

#### create_relationship

Create a polymorphic relationship between any two entities (project, epic, story, or task).

**Parameters:**
```typescript
{
  project_identifier: string;      // REQUIRED: Project identifier
  agent_identifier: string;        // REQUIRED: Your agent identifier
  source_type: string;             // REQUIRED: 'project', 'epic', 'story', or 'task'
  source_id: number;               // REQUIRED: Source entity ID
  target_type: string;             // REQUIRED: 'project', 'epic', 'story', or 'task'
  target_id: number;               // REQUIRED: Target entity ID
  relationship_type: string;       // REQUIRED: See relationship types below
}
```

**Relationship Types:**
- `blocks` - Source blocks target
- `blocked_by` - Source is blocked by target
- `related_to` - General relationship
- `cloned_from` - Source was cloned from target
- `depends_on` - Source depends on target

**Example:**
```
Tool: create_relationship
{
  "project_identifier": "frontend-app",
  "agent_identifier": "claude",
  "source_type": "story",
  "source_id": 5,
  "target_type": "epic",
  "target_id": 2,
  "relationship_type": "related_to"
}
```

**Validation:**
- Both entities must be in the same project
- Circular dependency detection for 'blocks', 'blocked_by', and 'depends_on' types
- Prevents duplicate relationships (UNIQUE constraint)

---

#### delete_relationship

Remove a relationship.

**Parameters:**
```typescript
{
  project_identifier: string;  // REQUIRED: Project identifier
  agent_identifier: string;    // REQUIRED: Your agent identifier
  id: number;                  // REQUIRED: Relationship ID
}
```

---

#### list_relationships

List relationships with optional filters.

**Parameters:**
```typescript
{
  project_identifier: string;      // REQUIRED: Project identifier
  agent_identifier: string;        // REQUIRED: Your agent identifier
  source_type?: string;            // Optional: Filter by source entity type
  source_id?: number;              // Optional: Filter by source entity ID
  target_type?: string;            // Optional: Filter by target entity type
  target_id?: number;              // Optional: Filter by target entity ID
  relationship_type?: string;      // Optional: Filter by relationship type
}
```

**Example:**
```
Tool: list_relationships
{
  "project_identifier": "frontend-app",
  "agent_identifier": "claude",
  "source_type": "story",
  "relationship_type": "blocks"
}
```

---

#### get_relationships_for_entity

Get all relationships for a specific entity (as source or target).

**Parameters:**
```typescript
{
  project_identifier: string;  // REQUIRED: Project identifier
  agent_identifier: string;    // REQUIRED: Your agent identifier
  entity_type: string;         // REQUIRED: 'project', 'epic', 'story', or 'task'
  entity_id: number;           // REQUIRED: Entity ID
}
```

**Example:**
```
Tool: get_relationships_for_entity
{
  "project_identifier": "frontend-app",
  "agent_identifier": "claude",
  "entity_type": "story",
  "entity_id": 5
}
```

---

### Note Tools

#### create_note

Create a note attached to any entity. Supports markdown formatting.

**Parameters:**
```typescript
{
  project_identifier: string;  // REQUIRED: Project identifier
  agent_identifier: string;    // REQUIRED: Your agent identifier
  parent_type: string;         // REQUIRED: 'project', 'epic', 'story', or 'task'
  parent_id: number;           // REQUIRED: Parent entity ID
  content: string;             // REQUIRED: Note content (markdown supported)
  author_name?: string;        // Optional: Author name (defaults to agent_identifier)
}
```

**Example:**
```
Tool: create_note
{
  "project_identifier": "frontend-app",
  "agent_identifier": "claude",
  "parent_type": "story",
  "parent_id": 5,
  "content": "## Implementation Notes\n\n- Use React hooks\n- Add unit tests\n- Consider edge cases",
  "author_name": "Claude"
}
```

---

#### update_note

Update an existing note.

**Parameters:**
```typescript
{
  project_identifier: string;  // REQUIRED: Project identifier
  agent_identifier: string;    // REQUIRED: Your agent identifier
  id: number;                  // REQUIRED: Note ID
  content: string;             // REQUIRED: New note content (markdown supported)
  author_name?: string;        // Optional: Update author name
}
```

---

#### delete_note

Delete a note.

**Parameters:**
```typescript
{
  project_identifier: string;  // REQUIRED: Project identifier
  agent_identifier: string;    // REQUIRED: Your agent identifier
  id: number;                  // REQUIRED: Note ID
}
```

---

#### list_notes

List notes with optional filters.

**Parameters:**
```typescript
{
  project_identifier: string;  // REQUIRED: Project identifier
  agent_identifier: string;    // REQUIRED: Your agent identifier
  parent_type?: string;        // Optional: Filter by parent entity type
  parent_id?: number;          // Optional: Filter by parent entity ID
}
```

---

#### get_notes_for_entity

Get all notes for a specific entity.

**Parameters:**
```typescript
{
  project_identifier: string;  // REQUIRED: Project identifier
  agent_identifier: string;    // REQUIRED: Your agent identifier
  entity_type: string;         // REQUIRED: 'project', 'epic', 'story', or 'task'
  entity_id: number;           // REQUIRED: Entity ID
}
```

**Example:**
```
Tool: get_notes_for_entity
{
  "project_identifier": "frontend-app",
  "agent_identifier": "claude",
  "entity_type": "story",
  "entity_id": 5
}
```

---

### Export Tools

#### export_backlog

Export project backlog data for analysis.

**Parameters:**
```typescript
{
  project_identifier: string;  // REQUIRED: Project identifier
  agent_identifier: string;    // REQUIRED: Your agent identifier
  format?: string;             // Optional: Export format (default: 'json')
}
```

**Example:**
```
Tool: export_backlog
{
  "project_identifier": "frontend-app",
  "agent_identifier": "claude"
}
```

---

## Resources

### backlog://overview

Get complete backlog overview for a project.

**Access:**
```
Read resource: backlog://overview?project_id=1
```

**Returns:**
```json
{
  "project": { /* project details */ },
  "epics": [ /* all epics */ ],
  "stories": [ /* all stories */ ],
  "tasks": [ /* all tasks */ ],
  "dependencies": [ /* all dependencies */ ]
}
```

---

### backlog://dependencies

Get dependency graph data for visualization.

**Access:**
```
Read resource: backlog://dependencies?project_id=1
```

**Returns:**
```json
{
  "nodes": [
    { "id": 1, "title": "Story 1", "status": "todo" }
  ],
  "edges": [
    { "from": 1, "to": 2, "type": "blocks" }
  ]
}
```

---

### backlog://hierarchy

Get hierarchical tree data.

**Access:**
```
Read resource: backlog://hierarchy?project_id=1
```

**Returns:**
```json
[
  {
    "id": 1,
    "type": "epic",
    "title": "Epic 1",
    "status": "in_progress",
    "children": [
      {
        "id": 1,
        "type": "story",
        "title": "Story 1",
        "status": "todo",
        "children": [
          {
            "id": 1,
            "type": "task",
            "title": "Task 1",
            "status": "done"
          }
        ]
      }
    ]
  }
]
```

---

## Workflows

### Basic Workflow

```
1. Register Project
   ↓
2. Create Epic
   ↓
3. Create Stories in Epic
   ↓
4. Create Tasks for Stories
   ↓
5. Add Dependencies between Stories
   ↓
6. Update Statuses as work progresses
   ↓
7. Export backlog when complete
```

### Multi-Agent Workflow

```
Agent A:
├─ Registers project "my-app"
├─ Creates epic "Feature X"
└─ Creates story "Story 1"

Agent B:
├─ Accesses same project "my-app"
├─ Creates epic "Feature Y"
├─ Creates story "Story 2"
└─ Adds dependency: Story 2 depends on Story 1

Both agents:
└─ System detects conflicts via last_modified_by tracking
```

---

## Error Handling

### Error Types

**PROJECT_NOT_REGISTERED:**
```json
{
  "success": false,
  "error": "No project registered with identifier: unregistered-project",
  "code": "PROJECT_NOT_REGISTERED"
}
```

**PROJECT_ACCESS_DENIED:**
```json
{
  "success": false,
  "error": "Access denied: epic #5 belongs to a different project",
  "code": "PROJECT_ACCESS_DENIED"
}
```

**CONFLICT_DETECTED:**
```json
{
  "success": true,
  "epic": { /* ... */ },
  "conflict_detected": true,
  "warning": "This epic was recently modified by agent: other-agent"
}
```

**CIRCULAR_DEPENDENCY:**
```json
{
  "success": false,
  "error": "Cannot create dependency: would create circular dependency"
}
```

### Handling Errors

```
1. Check response.success field
2. If false, read response.error and response.code
3. Log error for debugging
4. If PROJECT_NOT_REGISTERED:
   - Register the project first
5. If PROJECT_ACCESS_DENIED:
   - Verify correct project_identifier
6. If CONFLICT_DETECTED:
   - Fetch latest version
   - Decide whether to overwrite or merge
```

---

## Best Practices

### Always Register Projects First

```
# First time working with a repository
register_project({
  project_identifier: "my-app",
  name: "My Application",
  description: "...",
  agent_identifier: "claude"
})
```

### Use Descriptive Agent Identifiers

```
agent_identifier: "claude-main"        ✅ Good
agent_identifier: "claude-assistant-2" ✅ Good
agent_identifier: "agent"              ❌ Too generic
agent_identifier: "a1"                 ❌ Not descriptive
```

### Check for Conflicts Before Critical Updates

```
# Get story first
get_story({ id: 1, ... })

# Check response.last_modified_by
if (last_modified_by !== "claude") {
  # Warn user or fetch latest
}

# Then update
update_story({ id: 1, ... })
```

### Use Filters to Reduce Data Transfer

```
# Instead of:
list_stories({ project_identifier: "my-app" })

# Use filters:
list_stories({
  project_identifier: "my-app",
  status: "in_progress",
  priority: "high"
})
```

### Validate Before Creating Dependencies

```
# Ensure both stories exist and are in same project
get_story({ id: 1 })
get_story({ id: 2 })

# Then create dependency
add_dependency({
  story_id: 2,
  depends_on_story_id: 1,
  dependency_type: "blocks"
})
```

### Monitor Security Logs Periodically

```
# Check for access violations
get_security_logs({ limit: 50 })

# Review any unauthorized_access or project_violation events
```

---

**Document Version**: 1.0
**Last Updated**: 2025-10-24
