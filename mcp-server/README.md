# Agile MCP Server

MCP server providing agile backlog management tools for AI agents.

## Installation

```bash
npm install
npm run build
```

## Configuration

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "agile-backlog": {
      "command": "node",
      "args": ["/absolute/path/to/agile-mcp/mcp-server/dist/index.js"]
    }
  }
}
```

### Other MCP Clients

The server uses stdio transport and can be integrated with any MCP-compatible client:

```bash
node dist/index.js
```

## Available Tools

### Epic Tools

#### create_epic
```typescript
{
  title: string;
  description: string;
  status?: 'todo' | 'in_progress' | 'review' | 'done' | 'blocked';
}
```

#### update_epic
```typescript
{
  id: number;
  title?: string;
  description?: string;
  status?: 'todo' | 'in_progress' | 'review' | 'done' | 'blocked';
}
```

#### list_epics
No parameters. Returns all epics.

#### get_epic
```typescript
{
  id: number;
}
```
Returns epic with all its stories.

#### delete_epic
```typescript
{
  id: number;
}
```

### Story Tools

#### create_story
```typescript
{
  title: string;
  description: string;
  epic_id?: number;
  status?: 'todo' | 'in_progress' | 'review' | 'done' | 'blocked';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  points?: number;
}
```

#### update_story
```typescript
{
  id: number;
  epic_id?: number;
  title?: string;
  description?: string;
  status?: 'todo' | 'in_progress' | 'review' | 'done' | 'blocked';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  points?: number;
}
```

#### list_stories
```typescript
{
  epic_id?: number;
  status?: string;
  priority?: string;
  has_dependencies?: boolean;
}
```

#### get_story
```typescript
{
  id: number;
}
```
Returns story with all tasks and dependencies.

#### delete_story
```typescript
{
  id: number;
}
```

### Task Tools

#### create_task
```typescript
{
  story_id: number;
  title: string;
  description: string;
  status?: 'todo' | 'in_progress' | 'review' | 'done' | 'blocked';
  assignee?: string;
}
```

#### update_task
```typescript
{
  id: number;
  story_id?: number;
  title?: string;
  description?: string;
  status?: 'todo' | 'in_progress' | 'review' | 'done' | 'blocked';
  assignee?: string;
}
```

#### list_tasks
```typescript
{
  story_id?: number;
  status?: string;
  assignee?: string;
}
```

#### get_task
```typescript
{
  id: number;
}
```

#### delete_task
```typescript
{
  id: number;
}
```

### Dependency Tools

#### add_dependency
```typescript
{
  story_id: number;
  depends_on_story_id: number;
  dependency_type: 'blocks' | 'blocked_by';
}
```

Automatically prevents circular dependencies.

#### remove_dependency
```typescript
{
  id: number;
}
```

#### list_dependencies
```typescript
{
  story_id?: number;  // Optional: filter by story
}
```

### Export Tools

#### export_backlog
```typescript
{
  output_dir?: string;  // Default: '.agile-backlog'
}
```

Exports to markdown files in agile-planner format:
```
.agile-backlog/
├── epics/
│   └── [epic-slug]/
│       ├── epic.md
│       └── features/
│           └── [story-slug].md
├── orphan-stories/
│   └── [story-slug].md
└── backlog.json
```

## Available Resources

### backlog://overview
Complete backlog overview with all epics, stories, tasks, and dependencies.

### backlog://dependencies
Dependency graph data structure for visualization:
```typescript
{
  nodes: StoryNode[];
  edges: DependencyEdge[];
}
```

### backlog://hierarchy
Hierarchical tree structure:
```typescript
{
  id: number;
  type: 'epic' | 'story' | 'task';
  title: string;
  status: string;
  children?: HierarchyNode[];
}[]
```

## Development

```bash
# Watch mode
npm run dev

# Build
npm run build

# Run built server
npm start
```

## Database

The server shares a SQLite database with the web UI located at `../agile-backlog.db`.

## Error Handling

All tools return appropriate error messages:
- Missing required fields
- Invalid IDs
- Circular dependency detection
- Invalid status transitions
