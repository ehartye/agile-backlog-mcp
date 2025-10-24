# API Reference

> Complete REST API reference for integrating with Agile MCP

## Table of Contents

- [Overview](#overview)
- [Base URL & Authentication](#base-url--authentication)
- [Response Format](#response-format)
- [Error Handling](#error-handling)
- [Endpoints](#endpoints)
  - [Health Check](#health-check)
  - [Projects](#projects)
  - [Security Logs](#security-logs)
  - [Epics](#epics)
  - [Stories](#stories)
  - [Tasks](#tasks)
  - [Dependencies](#dependencies)
  - [Graph Data](#graph-data)
- [Query Parameters](#query-parameters)
- [Code Examples](#code-examples)

---

## Overview

The Agile MCP API is a RESTful HTTP API that provides access to the agile backlog management system. It's used by the Web UI and can be integrated into other applications.

**Base Technology:**
- Express 4.21.0
- JSON request/response bodies
- CORS enabled

---

## Base URL & Authentication

### Development
```
http://localhost:3004/api
```

### Production
```
http://your-server:3004/api
```

### Authentication

Currently, the API does not require authentication. All requests are processed with the `agent_identifier` set to `'web-ui'`.

**Future Enhancement**: Authentication middleware can be added for production deployments.

---

## Response Format

### Success Response

```json
{
  "id": 1,
  "title": "Epic Title",
  /* ... resource fields ... */
}
```

or for lists:

```json
[
  {
    "id": 1,
    "title": "Item 1"
  },
  {
    "id": 2,
    "title": "Item 2"
  }
]
```

### Error Response

```json
{
  "error": "Error message describing what went wrong"
}
```

**HTTP Status Codes:**
- `200 OK` - Success
- `201 Created` - Resource created
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

---

## Error Handling

### Common Errors

**Resource Not Found (404):**
```json
{
  "error": "Epic not found"
}
```

**Validation Error (400):**
```json
{
  "error": "Missing required field: title"
}
```

**Server Error (500):**
```json
{
  "error": "Internal server error"
}
```

---

## Endpoints

### Health Check

#### GET /api/health

Check if the API server is running.

**Response:**
```json
{
  "status": "ok",
  "database": "connected"
}
```

**Example:**
```bash
curl http://localhost:3004/api/health
```

---

### Projects

#### GET /api/projects

List all registered projects.

**Query Parameters:** None

**Response:**
```json
[
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
```

**Example:**
```bash
curl http://localhost:3004/api/projects
```

```javascript
fetch('http://localhost:3004/api/projects')
  .then(res => res.json())
  .then(projects => console.log(projects));
```

---

#### GET /api/projects/:id

Get a single project by ID.

**Parameters:**
- `id` (path) - Project ID

**Response:**
```json
{
  "id": 1,
  "identifier": "frontend-app",
  "name": "Frontend Application",
  "description": "React-based web application",
  "created_at": "2025-10-24T12:00:00Z",
  "updated_at": "2025-10-24T12:00:00Z",
  "last_accessed_at": "2025-10-24T14:00:00Z"
}
```

**Example:**
```bash
curl http://localhost:3004/api/projects/1
```

---

#### POST /api/projects

Create a new project.

**Request Body:**
```json
{
  "identifier": "my-app",
  "name": "My Application",
  "description": "Description of the project"
}
```

**Response:** `201 Created`
```json
{
  "id": 1,
  "identifier": "my-app",
  "name": "My Application",
  "description": "Description of the project",
  "created_at": "2025-10-24T12:00:00Z",
  "updated_at": "2025-10-24T12:00:00Z",
  "last_accessed_at": "2025-10-24T12:00:00Z"
}
```

**Example:**
```bash
curl -X POST http://localhost:3004/api/projects \
  -H "Content-Type: application/json" \
  -d '{"identifier":"my-app","name":"My Application","description":"Test project"}'
```

```javascript
fetch('http://localhost:3004/api/projects', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    identifier: 'my-app',
    name: 'My Application',
    description: 'Test project'
  })
}).then(res => res.json());
```

---

#### PATCH /api/projects/:id

Update a project.

**Parameters:**
- `id` (path) - Project ID

**Request Body:**
```json
{
  "name": "Updated Name",
  "description": "Updated description"
}
```

**Response:** `200 OK`
```json
{
  "id": 1,
  "identifier": "my-app",
  "name": "Updated Name",
  "description": "Updated description",
  "created_at": "2025-10-24T12:00:00Z",
  "updated_at": "2025-10-24T13:00:00Z",
  "last_accessed_at": "2025-10-24T14:00:00Z"
}
```

---

#### DELETE /api/projects/:id

Delete a project and all its epics, stories, and tasks (CASCADE).

**Parameters:**
- `id` (path) - Project ID

**Response:** `200 OK`
```json
{
  "message": "Project deleted successfully"
}
```

**Example:**
```bash
curl -X DELETE http://localhost:3004/api/projects/1
```

**Warning:** This is irreversible and deletes all related data.

---

### Security Logs

#### GET /api/security-logs

Get security event logs.

**Query Parameters:**
- `limit` (optional) - Maximum number of logs to return (default: 50)

**Response:**
```json
[
  {
    "id": 1,
    "event_type": "unauthorized_access",
    "project_id": null,
    "agent_identifier": "unknown-agent",
    "attempted_path": "unregistered-project",
    "entity_type": null,
    "entity_id": null,
    "message": "Attempted access to unregistered project",
    "created_at": "2025-10-24T12:00:00Z"
  }
]
```

**Example:**
```bash
curl http://localhost:3004/api/security-logs?limit=10
```

---

### Epics

#### GET /api/epics

List epics with optional filtering.

**Query Parameters:**
- `project_id` (optional) - Filter by project ID
- `status` (optional) - Filter by status ('todo', 'in_progress', 'review', 'done', 'blocked')

**Response:**
```json
[
  {
    "id": 1,
    "project_id": 1,
    "title": "User Authentication",
    "description": "Implement auth system",
    "status": "in_progress",
    "agent_identifier": "web-ui",
    "last_modified_by": "web-ui",
    "created_at": "2025-10-24T12:00:00Z",
    "updated_at": "2025-10-24T12:00:00Z"
  }
]
```

**Example:**
```bash
# All epics
curl http://localhost:3004/api/epics

# Filtered by project
curl http://localhost:3004/api/epics?project_id=1

# Filtered by status
curl http://localhost:3004/api/epics?status=in_progress
```

---

#### GET /api/epics/:id

Get a single epic with all its stories.

**Parameters:**
- `id` (path) - Epic ID

**Response:**
```json
{
  "id": 1,
  "project_id": 1,
  "title": "User Authentication",
  "description": "Implement auth system",
  "status": "in_progress",
  "agent_identifier": "web-ui",
  "last_modified_by": "web-ui",
  "created_at": "2025-10-24T12:00:00Z",
  "updated_at": "2025-10-24T12:00:00Z",
  "stories": [
    {
      "id": 1,
      "epic_id": 1,
      "project_id": 1,
      "title": "Login Page",
      "description": "Create login UI",
      "status": "todo",
      "priority": "high",
      "points": 5,
      "agent_identifier": "web-ui",
      "last_modified_by": "web-ui",
      "created_at": "2025-10-24T12:00:00Z",
      "updated_at": "2025-10-24T12:00:00Z"
    }
  ]
}
```

---

#### POST /api/epics

Create a new epic.

**Request Body:**
```json
{
  "project_id": 1,
  "title": "New Epic",
  "description": "Epic description",
  "status": "todo"
}
```

**Response:** `201 Created`
```json
{
  "id": 2,
  "project_id": 1,
  "title": "New Epic",
  "description": "Epic description",
  "status": "todo",
  "agent_identifier": "web-ui",
  "last_modified_by": "web-ui",
  "created_at": "2025-10-24T12:00:00Z",
  "updated_at": "2025-10-24T12:00:00Z"
}
```

---

#### PATCH /api/epics/:id

Update an epic.

**Parameters:**
- `id` (path) - Epic ID

**Request Body:**
```json
{
  "title": "Updated Title",
  "status": "in_progress"
}
```

**Response:** `200 OK` (updated epic object)

---

#### DELETE /api/epics/:id

Delete an epic (sets epic_id to NULL for associated stories).

**Parameters:**
- `id` (path) - Epic ID

**Response:** `200 OK`
```json
{
  "message": "Epic deleted successfully"
}
```

---

### Stories

#### GET /api/stories

List stories with optional filtering.

**Query Parameters:**
- `project_id` (optional) - Filter by project ID
- `epic_id` (optional) - Filter by epic ID
- `status` (optional) - Filter by status
- `priority` (optional) - Filter by priority ('low', 'medium', 'high', 'critical')
- `has_dependencies` (optional) - Filter by dependency existence (true/false)

**Response:**
```json
[
  {
    "id": 1,
    "project_id": 1,
    "epic_id": 1,
    "title": "Login Page",
    "description": "Create login UI",
    "status": "todo",
    "priority": "high",
    "points": 5,
    "agent_identifier": "web-ui",
    "last_modified_by": "web-ui",
    "created_at": "2025-10-24T12:00:00Z",
    "updated_at": "2025-10-24T12:00:00Z"
  }
]
```

**Example:**
```bash
# All stories
curl http://localhost:3004/api/stories

# Filtered by project and priority
curl http://localhost:3004/api/stories?project_id=1&priority=high

# Multiple filters
curl http://localhost:3004/api/stories?project_id=1&status=todo&priority=high
```

---

#### GET /api/stories/:id

Get a single story with all its tasks and dependencies.

**Parameters:**
- `id` (path) - Story ID

**Response:**
```json
{
  "id": 1,
  "project_id": 1,
  "epic_id": 1,
  "title": "Login Page",
  "description": "Create login UI",
  "status": "todo",
  "priority": "high",
  "points": 5,
  "agent_identifier": "web-ui",
  "last_modified_by": "web-ui",
  "created_at": "2025-10-24T12:00:00Z",
  "updated_at": "2025-10-24T12:00:00Z",
  "tasks": [
    {
      "id": 1,
      "story_id": 1,
      "title": "Design login form",
      "description": "Create mockup",
      "status": "done",
      "assignee": "designer",
      "agent_identifier": "web-ui",
      "last_modified_by": "web-ui",
      "created_at": "2025-10-24T12:00:00Z",
      "updated_at": "2025-10-24T13:00:00Z"
    }
  ],
  "dependencies": [
    {
      "id": 1,
      "story_id": 1,
      "depends_on_story_id": 2,
      "dependency_type": "blocks",
      "created_at": "2025-10-24T12:00:00Z"
    }
  ]
}
```

---

#### POST /api/stories

Create a new story.

**Request Body:**
```json
{
  "project_id": 1,
  "epic_id": 1,
  "title": "New Story",
  "description": "Story description",
  "status": "todo",
  "priority": "medium",
  "points": 3
}
```

**Response:** `201 Created` (created story object)

---

#### PATCH /api/stories/:id

Update a story.

**Parameters:**
- `id` (path) - Story ID

**Request Body:**
```json
{
  "status": "in_progress",
  "points": 8
}
```

**Response:** `200 OK` (updated story object)

---

#### DELETE /api/stories/:id

Delete a story and all its tasks (CASCADE).

**Parameters:**
- `id` (path) - Story ID

**Response:** `200 OK`
```json
{
  "message": "Story deleted successfully"
}
```

---

### Tasks

#### GET /api/tasks

List tasks with optional filtering.

**Query Parameters:**
- `project_id` (optional) - Filter by project ID
- `story_id` (optional) - Filter by story ID
- `status` (optional) - Filter by status
- `assignee` (optional) - Filter by assignee

**Response:**
```json
[
  {
    "id": 1,
    "story_id": 1,
    "title": "Design login form",
    "description": "Create mockup",
    "status": "done",
    "assignee": "designer",
    "agent_identifier": "web-ui",
    "last_modified_by": "web-ui",
    "created_at": "2025-10-24T12:00:00Z",
    "updated_at": "2025-10-24T13:00:00Z"
  }
]
```

**Example:**
```bash
# All tasks for a story
curl http://localhost:3004/api/tasks?story_id=1

# Tasks by status
curl http://localhost:3004/api/tasks?status=done
```

---

#### POST /api/tasks

Create a new task.

**Request Body:**
```json
{
  "story_id": 1,
  "title": "New Task",
  "description": "Task description",
  "status": "todo",
  "assignee": "developer"
}
```

**Response:** `201 Created` (created task object)

---

#### PATCH /api/tasks/:id

Update a task.

**Parameters:**
- `id` (path) - Task ID

**Request Body:**
```json
{
  "status": "in_progress",
  "assignee": "new-assignee"
}
```

**Response:** `200 OK` (updated task object)

---

#### DELETE /api/tasks/:id

Delete a task.

**Parameters:**
- `id` (path) - Task ID

**Response:** `200 OK`
```json
{
  "message": "Task deleted successfully"
}
```

---

### Dependencies

#### GET /api/dependencies

List dependencies with optional filtering.

**Query Parameters:**
- `story_id` (optional) - Filter by story ID
- `project_id` (optional) - Filter by project ID

**Response:**
```json
[
  {
    "id": 1,
    "story_id": 2,
    "depends_on_story_id": 1,
    "dependency_type": "blocks",
    "created_at": "2025-10-24T12:00:00Z"
  }
]
```

**Example:**
```bash
# All dependencies for a story
curl http://localhost:3004/api/dependencies?story_id=2

# All dependencies in a project
curl http://localhost:3004/api/dependencies?project_id=1
```

---

#### POST /api/dependencies

Create a new dependency between stories.

**Request Body:**
```json
{
  "story_id": 2,
  "depends_on_story_id": 1,
  "dependency_type": "blocks"
}
```

**Validation:**
- Both stories must exist in the same project
- Circular dependencies are automatically detected and prevented
- Duplicate dependencies are prevented (UNIQUE constraint)

**Response:** `201 Created`
```json
{
  "id": 1,
  "story_id": 2,
  "depends_on_story_id": 1,
  "dependency_type": "blocks",
  "created_at": "2025-10-24T12:00:00Z"
}
```

**Error if Circular:**
```json
{
  "error": "Cannot create dependency: would create circular dependency"
}
```

---

#### DELETE /api/dependencies/:id

Delete a dependency.

**Parameters:**
- `id` (path) - Dependency ID

**Response:** `200 OK`
```json
{
  "message": "Dependency deleted successfully"
}
```

---

### Graph Data

#### GET /api/graph/dependencies

Get dependency graph data for visualization (React Flow format).

**Query Parameters:**
- `project_id` (optional) - Filter by project ID

**Response:**
```json
{
  "nodes": [
    {
      "id": "1",
      "data": {
        "label": "Login Page",
        "status": "todo",
        "priority": "high",
        "points": 5
      },
      "position": { "x": 0, "y": 0 }
    }
  ],
  "edges": [
    {
      "id": "e1-2",
      "source": "1",
      "target": "2",
      "label": "blocks",
      "type": "smoothstep"
    }
  ]
}
```

**Example:**
```bash
curl http://localhost:3004/api/graph/dependencies?project_id=1
```

---

#### GET /api/graph/hierarchy

Get hierarchy tree data for visualization (D3 format).

**Query Parameters:**
- `project_id` (optional) - Filter by project ID

**Response:**
```json
[
  {
    "id": 1,
    "type": "epic",
    "title": "User Authentication",
    "status": "in_progress",
    "children": [
      {
        "id": 1,
        "type": "story",
        "title": "Login Page",
        "status": "todo",
        "children": [
          {
            "id": 1,
            "type": "task",
            "title": "Design login form",
            "status": "done"
          }
        ]
      }
    ]
  }
]
```

**Example:**
```bash
curl http://localhost:3004/api/graph/hierarchy?project_id=1
```

---

## Query Parameters

### Filtering

All `GET` list endpoints support query parameter filtering:

```bash
# Single filter
GET /api/stories?status=todo

# Multiple filters
GET /api/stories?project_id=1&status=todo&priority=high

# Boolean filters
GET /api/stories?has_dependencies=true
```

### Common Query Parameters

| Parameter | Type | Description | Endpoints |
|-----------|------|-------------|-----------|
| `project_id` | number | Filter by project | epics, stories, tasks, dependencies, graph |
| `status` | string | Filter by status | epics, stories, tasks |
| `epic_id` | number | Filter by epic | stories |
| `story_id` | number | Filter by story | tasks, dependencies |
| `priority` | string | Filter by priority | stories |
| `assignee` | string | Filter by assignee | tasks |
| `has_dependencies` | boolean | Filter by dependency existence | stories |
| `limit` | number | Limit results | security-logs |

---

## Code Examples

### JavaScript/TypeScript

```typescript
// Fetch all projects
const projects = await fetch('http://localhost:3004/api/projects')
  .then(res => res.json());

// Create a new epic
const epic = await fetch('http://localhost:3004/api/epics', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    project_id: 1,
    title: 'New Epic',
    description: 'Epic description'
  })
}).then(res => res.json());

// Update a story
const story = await fetch('http://localhost:3004/api/stories/1', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    status: 'in_progress'
  })
}).then(res => res.json());

// Delete a task
await fetch('http://localhost:3004/api/tasks/1', {
  method: 'DELETE'
});
```

### Python

```python
import requests

BASE_URL = 'http://localhost:3004/api'

# Fetch all projects
projects = requests.get(f'{BASE_URL}/projects').json()

# Create a new story
story = requests.post(f'{BASE_URL}/stories', json={
    'project_id': 1,
    'epic_id': 1,
    'title': 'New Story',
    'description': 'Story description',
    'priority': 'high',
    'points': 5
}).json()

# Get stories filtered by status
stories = requests.get(f'{BASE_URL}/stories', params={
    'project_id': 1,
    'status': 'todo'
}).json()

# Update epic status
requests.patch(f'{BASE_URL}/epics/1', json={
    'status': 'in_progress'
})
```

### curl

```bash
# List all epics
curl http://localhost:3004/api/epics

# Create a new project
curl -X POST http://localhost:3004/api/projects \
  -H "Content-Type: application/json" \
  -d '{"identifier":"my-app","name":"My App","description":"Test"}'

# Update story status
curl -X PATCH http://localhost:3004/api/stories/1 \
  -H "Content-Type: application/json" \
  -d '{"status":"in_progress"}'

# Delete epic
curl -X DELETE http://localhost:3004/api/epics/1

# Get filtered stories
curl "http://localhost:3004/api/stories?project_id=1&status=todo&priority=high"
```

---

**Document Version**: 1.0
**Last Updated**: 2025-10-24
