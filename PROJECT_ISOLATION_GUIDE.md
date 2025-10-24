# Project Isolation - Quick Reference Guide

## What Changed?

**Version 2.0** introduces multi-project support with strict isolation:
- Each project is tied to a repository path
- Agents can ONLY access items from their own project
- Concurrent modifications are detected and logged
- Security violations are logged for audit

## Core Concepts

### 1. Projects
A project represents a codebase/repository with its own backlog.

### 2. Working Directory
Every MCP tool call must include the current working directory, which is validated against registered projects.

### 3. Project Isolation
- Epic belongs to Project
- Stories belong to Epics (inherit project)
- Tasks belong to Stories (inherit project via Epic)
- Cross-project access = **ERROR**

### 4. Conflict Detection
When multiple agents modify the same item, the system detects and warns about conflicts.

## Basic Workflow

### Step 1: Register Your Project
**First time only** - register the project with its repository path:

```typescript
Tool: register_project
Parameters: {
  name: "my-app",
  repository_path: "/home/user/repos/my-app",
  description: "My web application"
}
```

✅ Success response:
```json
{
  "success": true,
  "message": "Project 'my-app' registered successfully",
  "project": { "id": 1, "name": "my-app", ... }
}
```

### Step 2: Create Backlog Items
All create/update/delete operations now require `working_directory`:

```typescript
Tool: create_epic
Parameters: {
  working_directory: "/home/user/repos/my-app",
  modified_by: "agent-alice",  // optional, for conflict detection
  title: "User Management",
  description: "User registration and authentication"
}
```

✅ Success response:
```json
{
  "success": true,
  "epic": { "id": 1, "project_id": 1, "title": "User Management", ... },
  "project": "my-app"
}
```

### Step 3: List Items (Auto-Filtered by Project)
```typescript
Tool: list_epics
Parameters: {
  working_directory: "/home/user/repos/my-app"
}
```

Response includes **only** epics from your project:
```json
{
  "success": true,
  "project": "my-app",
  "count": 5,
  "epics": [...]
}
```

## Required Parameters

### All Tools Now Require:
- `working_directory` (string) - Current working directory path

### Optional but Recommended:
- `modified_by` (string) - Agent/user identifier for conflict detection
  - Defaults to "agent" if not provided
  - Used to detect concurrent modifications

## Error Scenarios

### 1. Unregistered Project
**Cause**: Working directory doesn't match any registered project

```json
{
  "success": false,
  "error": "No project registered for path: /home/user/unregistered-repo",
  "code": "PROJECT_NOT_REGISTERED"
}
```

**Solution**: Register the project first using `register_project`

### 2. Cross-Project Access
**Cause**: Trying to access/modify items from another project

```json
{
  "success": false,
  "error": "Access denied: epic #5 belongs to a different project. You can only access items from your current project (my-app).",
  "code": "PROJECT_ACCESS_DENIED"
}
```

**Solution**: Switch to the correct project directory

### 3. Concurrent Modification Detected
**Cause**: Another agent modified the item recently

```json
{
  "success": true,
  "epic": { ... },
  "conflict_detected": true,
  "warning": "This epic was recently modified by another agent"
}
```

**Action**: Review changes before proceeding, operation still succeeded

## New Tools

### Project Management

#### `register_project`
Register a new project with its repository path.

**Parameters:**
- `name` (string, required) - Project name
- `repository_path` (string, required) - Absolute path to repo
- `description` (string, required) - Project description

#### `list_projects`
List all registered projects (sorted by last accessed).

**Parameters:** None

#### `get_project`
Get project details.

**Parameters:**
- `working_directory` (string) OR `id` (number)

#### `get_security_logs`
View security event logs.

**Parameters:**
- `limit` (number, optional) - Default: 50

**Event Types:**
- `unauthorized_access` - Unregistered path attempts
- `project_violation` - Cross-project access attempts
- `conflict_detected` - Concurrent modifications

## Best Practices

### 1. Register Once Per Project
```bash
# Only need to do this once per project
register_project(name="my-app", path="/path/to/repo", ...)
```

### 2. Always Pass Working Directory
```typescript
// Every operation needs this
{
  working_directory: process.cwd() // or your current path
}
```

### 3. Use Meaningful Agent IDs
```typescript
{
  modified_by: "agent-alice"  // or "user-bob", "ci-pipeline", etc.
}
```

### 4. Check Security Logs Periodically
```typescript
get_security_logs(limit: 100)
```

### 5. Handle Conflicts Gracefully
```typescript
if (response.conflict_detected) {
  // Warn user or fetch latest version
}
```

## Migration from v1.0

If you have existing backlog data from v1.0:

### Option 1: Register Projects for Existing Data
1. Identify all unique repositories in your old data
2. Register each as a project
3. Manually assign epics to correct projects via database

### Option 2: Fresh Start
1. Export old data using `export_backlog`
2. Start fresh with v2.0
3. Register projects, then re-create items

### Option 3: Migration Script (TODO)
A migration tool will be provided to auto-create projects from existing data.

## Troubleshooting

### "Project not registered" but I just registered it
- Check path normalization: `/home/user` vs `/home/user/`
- Verify exact path matches: `list_projects` to see registered paths

### "Access denied" for my own items
- Verify `working_directory` matches project path
- Check which project the item belongs to
- Use `get_security_logs` to see what went wrong

### Conflict warnings on every update
- Different agents using different `modified_by` values
- This is normal in multi-agent scenarios
- Review changes before proceeding

## Example Multi-Project Setup

```typescript
// Project 1: Frontend
register_project({
  name: "frontend",
  repository_path: "/home/user/repos/my-app-frontend",
  description: "React frontend application"
})

// Project 2: Backend
register_project({
  name: "backend",
  repository_path: "/home/user/repos/my-app-backend",
  description: "Node.js API backend"
})

// Agent working on frontend
create_epic({
  working_directory: "/home/user/repos/my-app-frontend",
  title: "UI Redesign"
})

// Agent working on backend
create_epic({
  working_directory: "/home/user/repos/my-app-backend",
  title: "API v2"
})

// These are completely isolated!
// Frontend agent CANNOT access Backend epics
// Backend agent CANNOT access Frontend epics
```

## Security Benefits

✅ **Multi-tenancy**: Multiple projects in one database, fully isolated
✅ **Access Control**: Path-based security prevents cross-project access
✅ **Audit Trail**: All security events logged
✅ **Conflict Detection**: Concurrent modifications detected and logged
✅ **Clear Errors**: Explicit error messages for security violations

## Questions?

See `PROJECT_ISOLATION_STATUS.md` for implementation details and remaining work.
