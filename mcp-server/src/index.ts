#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { AgileDatabase } from '@agile-mcp/shared';
import { handleProjectTools } from './tools/project-tools.js';
import { handleEpicTools } from './tools/epic-tools.js';
import { handleStoryTools } from './tools/story-tools.js';
import { handleTaskTools } from './tools/task-tools.js';
import { handleDependencyTools } from './tools/dependency-tools.js';
import { handleRelationshipTools } from './tools/relationship-tools.js';
import { handleNoteTools } from './tools/note-tools.js';
import { handleExportTools } from './tools/export-tools.js';
import { registerResources } from './resources/index.js';

const db = new AgileDatabase();

const server = new Server(
  {
    name: 'agile-mcp-server',
    version: '2.0.0', // Bumped version for project isolation feature
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// Register all resources
registerResources(server, db);

// CallTool handler - routes to appropriate tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  console.error(`[CallTool] Received request for tool: ${request.params.name}`);

  // Try each handler in sequence until one returns a result
  const handlers = [
    handleProjectTools,
    handleEpicTools,
    handleStoryTools,
    handleTaskTools,
    handleDependencyTools,
    handleRelationshipTools,
    handleNoteTools,
    handleExportTools,
  ];

  for (const handler of handlers) {
    try {
      const result = await handler(request, db);
      if (result !== null) {
        console.error(`[CallTool] Handler returned result for: ${request.params.name}`);
        return result;
      }
    } catch (error) {
      console.error(`[CallTool] Handler error for ${request.params.name}:`, error);
      throw error;
    }
  }

  // No handler found for this tool
  console.error(`[CallTool] No handler found for tool: ${request.params.name}`);
  throw new Error(`Unknown tool: ${request.params.name}`);
});

// List tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      // Project tools
      {
        name: 'register_project',
        description: 'Register a new project with a unique identifier. Required before creating any epics/stories/tasks.',
        inputSchema: {
          type: 'object',
          properties: {
            identifier: { type: 'string', description: 'Unique project identifier (e.g., "frontend-app", "api-service")' },
            name: { type: 'string', description: 'Human-readable project name' },
            description: { type: 'string', description: 'Project description' },
          },
          required: ['identifier', 'name', 'description'],
        },
      },
      {
        name: 'list_projects',
        description: 'List all registered projects',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_project',
        description: 'Get project details by identifier or ID',
        inputSchema: {
          type: 'object',
          properties: {
            identifier: { type: 'string', description: 'Project identifier' },
            id: { type: 'number', description: 'Project ID (alternative to identifier)' },
          },
        },
      },
      {
        name: 'get_security_logs',
        description: 'Get security event logs (unauthorized access attempts, conflicts, etc.)',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Number of logs to retrieve (default: 50)' },
          },
        },
      },
      // Epic tools
      {
        name: 'create_epic',
        description: 'Create a new epic in the current project',
        inputSchema: {
          type: 'object',
          properties: {
            project_identifier: { type: 'string', description: 'Project identifier' },
            agent_identifier: { type: 'string', description: 'Agent identifier for attribution' },
            modified_by: { type: 'string', description: 'Display name (optional, defaults to agent_identifier)' },
            title: { type: 'string', description: 'Epic title' },
            description: { type: 'string', description: 'Epic description' },
            status: { type: 'string', enum: ['todo', 'in_progress', 'review', 'done', 'blocked'], description: 'Initial status (default: todo)' },
          },
          required: ['project_identifier', 'agent_identifier', 'title', 'description'],
        },
      },
      {
        name: 'update_epic',
        description: 'Update an existing epic in the current project',
        inputSchema: {
          type: 'object',
          properties: {
            project_identifier: { type: 'string', description: 'Project identifier' },
            agent_identifier: { type: 'string', description: 'Agent identifier for attribution' },
            modified_by: { type: 'string', description: 'Identifier for the agent/user making this change (for conflict detection)' },
            id: { type: 'number', description: 'Epic ID' },
            title: { type: 'string', description: 'New title' },
            description: { type: 'string', description: 'New description' },
            status: { type: 'string', enum: ['todo', 'in_progress', 'review', 'done', 'blocked'] },
          },
          required: ['project_identifier', 'agent_identifier', 'id'],
        },
      },
      {
        name: 'list_epics',
        description: 'List all epics in the current project',
        inputSchema: {
          type: 'object',
          properties: {
            project_identifier: { type: 'string', description: 'Project identifier' },
            agent_identifier: { type: 'string', description: 'Agent identifier for attribution' },
            status: { type: 'string', enum: ['todo', 'in_progress', 'review', 'done', 'blocked'], description: 'Filter by status' },
          },
          required: ['project_identifier', 'agent_identifier'],
        },
      },
      {
        name: 'get_epic',
        description: 'Get a specific epic with all its stories',
        inputSchema: {
          type: 'object',
          properties: {
            project_identifier: { type: 'string', description: 'Project identifier' },
            agent_identifier: { type: 'string', description: 'Agent identifier for attribution' },
            id: { type: 'number', description: 'Epic ID' },
          },
          required: ['project_identifier', 'agent_identifier', 'id'],
        },
      },
      {
        name: 'delete_epic',
        description: 'Delete an epic from the current project',
        inputSchema: {
          type: 'object',
          properties: {
            project_identifier: { type: 'string', description: 'Project identifier' },
            agent_identifier: { type: 'string', description: 'Agent identifier for attribution' },
            id: { type: 'number', description: 'Epic ID' },
          },
          required: ['project_identifier', 'agent_identifier', 'id'],
        },
      },
      // Story tools
      {
        name: 'create_story',
        description: 'Create a new user story in the current project',
        inputSchema: {
          type: 'object',
          properties: {
            project_identifier: { type: 'string', description: 'Project identifier' },
            agent_identifier: { type: 'string', description: 'Agent identifier for attribution' },
            modified_by: { type: 'string', description: 'Identifier for the agent/user making this change (for conflict detection)' },
            epic_id: { type: 'number', description: 'Epic ID (optional)' },
            title: { type: 'string', description: 'Story title' },
            description: { type: 'string', description: 'Story description' },
            acceptance_criteria: { type: 'string', description: 'Acceptance criteria (optional)' },
            status: { type: 'string', enum: ['todo', 'in_progress', 'review', 'done', 'blocked'] },
            priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
            points: { type: 'number', description: 'Story points' },
          },
          required: ['project_identifier', 'agent_identifier', 'title', 'description'],
        },
      },
      {
        name: 'update_story',
        description: 'Update an existing story in the current project',
        inputSchema: {
          type: 'object',
          properties: {
            project_identifier: { type: 'string', description: 'Project identifier' },
            agent_identifier: { type: 'string', description: 'Agent identifier for attribution' },
            modified_by: { type: 'string', description: 'Identifier for the agent/user making this change (for conflict detection)' },
            id: { type: 'number', description: 'Story ID' },
            epic_id: { type: 'number', description: 'Epic ID' },
            title: { type: 'string', description: 'New title' },
            description: { type: 'string', description: 'New description' },
            acceptance_criteria: { type: 'string', description: 'Acceptance criteria' },
            status: { type: 'string', enum: ['todo', 'in_progress', 'review', 'done', 'blocked'] },
            priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
            points: { type: 'number', description: 'Story points' },
          },
          required: ['project_identifier', 'agent_identifier', 'id'],
        },
      },
      {
        name: 'list_stories',
        description: 'List stories in the current project with optional filters',
        inputSchema: {
          type: 'object',
          properties: {
            project_identifier: { type: 'string', description: 'Project identifier' },
            agent_identifier: { type: 'string', description: 'Agent identifier for attribution' },
            epic_id: { type: 'number', description: 'Filter by epic ID' },
            status: { type: 'string', enum: ['todo', 'in_progress', 'review', 'done', 'blocked'] },
            priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
            has_dependencies: { type: 'boolean', description: 'Filter by dependency existence' },
          },
          required: ['project_identifier', 'agent_identifier'],
        },
      },
      {
        name: 'get_story',
        description: 'Get a specific story with all its tasks',
        inputSchema: {
          type: 'object',
          properties: {
            project_identifier: { type: 'string', description: 'Project identifier' },
            agent_identifier: { type: 'string', description: 'Agent identifier for attribution' },
            id: { type: 'number', description: 'Story ID' },
          },
          required: ['project_identifier', 'agent_identifier', 'id'],
        },
      },
      {
        name: 'delete_story',
        description: 'Delete a story from the current project',
        inputSchema: {
          type: 'object',
          properties: {
            project_identifier: { type: 'string', description: 'Project identifier' },
            agent_identifier: { type: 'string', description: 'Agent identifier for attribution' },
            id: { type: 'number', description: 'Story ID' },
          },
          required: ['project_identifier', 'agent_identifier', 'id'],
        },
      },
      // Task tools
      {
        name: 'create_task',
        description: 'Create a new task in the current project',
        inputSchema: {
          type: 'object',
          properties: {
            project_identifier: { type: 'string', description: 'Project identifier' },
            agent_identifier: { type: 'string', description: 'Agent identifier for attribution' },
            modified_by: { type: 'string', description: 'Identifier for the agent/user making this change (for conflict detection)' },
            story_id: { type: 'number', description: 'Story ID' },
            title: { type: 'string', description: 'Task title' },
            description: { type: 'string', description: 'Task description' },
            status: { type: 'string', enum: ['todo', 'in_progress', 'review', 'done', 'blocked'] },
            assignee: { type: 'string', description: 'Task assignee' },
          },
          required: ['project_identifier', 'agent_identifier', 'story_id', 'title', 'description'],
        },
      },
      {
        name: 'update_task',
        description: 'Update an existing task in the current project',
        inputSchema: {
          type: 'object',
          properties: {
            project_identifier: { type: 'string', description: 'Project identifier' },
            agent_identifier: { type: 'string', description: 'Agent identifier for attribution' },
            modified_by: { type: 'string', description: 'Identifier for the agent/user making this change (for conflict detection)' },
            id: { type: 'number', description: 'Task ID' },
            story_id: { type: 'number', description: 'Story ID' },
            title: { type: 'string', description: 'New title' },
            description: { type: 'string', description: 'New description' },
            status: { type: 'string', enum: ['todo', 'in_progress', 'review', 'done', 'blocked'] },
            assignee: { type: 'string', description: 'Task assignee' },
          },
          required: ['project_identifier', 'agent_identifier', 'id'],
        },
      },
      {
        name: 'list_tasks',
        description: 'List tasks in the current project with optional filters',
        inputSchema: {
          type: 'object',
          properties: {
            project_identifier: { type: 'string', description: 'Project identifier' },
            agent_identifier: { type: 'string', description: 'Agent identifier for attribution' },
            story_id: { type: 'number', description: 'Filter by story ID' },
            status: { type: 'string', enum: ['todo', 'in_progress', 'review', 'done', 'blocked'] },
            assignee: { type: 'string', description: 'Filter by assignee' },
          },
          required: ['project_identifier', 'agent_identifier'],
        },
      },
      {
        name: 'get_task',
        description: 'Get a specific task from the current project',
        inputSchema: {
          type: 'object',
          properties: {
            project_identifier: { type: 'string', description: 'Project identifier' },
            agent_identifier: { type: 'string', description: 'Agent identifier for attribution' },
            id: { type: 'number', description: 'Task ID' },
          },
          required: ['project_identifier', 'agent_identifier', 'id'],
        },
      },
      {
        name: 'delete_task',
        description: 'Delete a task from the current project',
        inputSchema: {
          type: 'object',
          properties: {
            project_identifier: { type: 'string', description: 'Project identifier' },
            agent_identifier: { type: 'string', description: 'Agent identifier for attribution' },
            id: { type: 'number', description: 'Task ID' },
          },
          required: ['project_identifier', 'agent_identifier', 'id'],
        },
      },
      // Dependency tools
      {
        name: 'add_dependency',
        description: 'Add a dependency between two stories in the current project (prevents circular dependencies)',
        inputSchema: {
          type: 'object',
          properties: {
            project_identifier: { type: 'string', description: 'Project identifier' },
            agent_identifier: { type: 'string', description: 'Agent identifier for attribution' },
            story_id: { type: 'number', description: 'Story ID that depends on another' },
            depends_on_story_id: { type: 'number', description: 'Story ID that is depended upon' },
            dependency_type: { type: 'string', enum: ['blocks', 'blocked_by'], description: 'Type of dependency' },
          },
          required: ['project_identifier', 'agent_identifier', 'story_id', 'depends_on_story_id', 'dependency_type'],
        },
      },
      {
        name: 'remove_dependency',
        description: 'Remove a dependency from the current project',
        inputSchema: {
          type: 'object',
          properties: {
            project_identifier: { type: 'string', description: 'Project identifier' },
            agent_identifier: { type: 'string', description: 'Agent identifier for attribution' },
            id: { type: 'number', description: 'Dependency ID' },
          },
          required: ['project_identifier', 'agent_identifier', 'id'],
        },
      },
      {
        name: 'list_dependencies',
        description: 'List all dependencies in the current project or dependencies for a specific story',
        inputSchema: {
          type: 'object',
          properties: {
            project_identifier: { type: 'string', description: 'Project identifier' },
            agent_identifier: { type: 'string', description: 'Agent identifier for attribution' },
            story_id: { type: 'number', description: 'Filter by story ID (optional)' },
          },
          required: ['project_identifier', 'agent_identifier'],
        },
      },
      // Relationship tools (polymorphic many-to-many)
      {
        name: 'create_relationship',
        description: 'Create a polymorphic relationship between any two entities (project, epic, story, or task)',
        inputSchema: {
          type: 'object',
          properties: {
            project_identifier: { type: 'string', description: 'Project identifier' },
            agent_identifier: { type: 'string', description: 'Agent identifier for attribution' },
            source_type: { type: 'string', enum: ['project', 'epic', 'story', 'task'], description: 'Type of source entity' },
            source_id: { type: 'number', description: 'ID of source entity' },
            target_type: { type: 'string', enum: ['project', 'epic', 'story', 'task'], description: 'Type of target entity' },
            target_id: { type: 'number', description: 'ID of target entity' },
            relationship_type: { type: 'string', enum: ['blocks', 'blocked_by', 'related_to', 'cloned_from', 'depends_on'], description: 'Type of relationship' },
          },
          required: ['project_identifier', 'agent_identifier', 'source_type', 'source_id', 'target_type', 'target_id', 'relationship_type'],
        },
      },
      {
        name: 'delete_relationship',
        description: 'Delete a relationship',
        inputSchema: {
          type: 'object',
          properties: {
            project_identifier: { type: 'string', description: 'Project identifier' },
            agent_identifier: { type: 'string', description: 'Agent identifier for attribution' },
            id: { type: 'number', description: 'Relationship ID' },
          },
          required: ['project_identifier', 'agent_identifier', 'id'],
        },
      },
      {
        name: 'list_relationships',
        description: 'List relationships with optional filters for source, target, or relationship type',
        inputSchema: {
          type: 'object',
          properties: {
            project_identifier: { type: 'string', description: 'Project identifier' },
            agent_identifier: { type: 'string', description: 'Agent identifier for attribution' },
            source_type: { type: 'string', enum: ['project', 'epic', 'story', 'task'], description: 'Filter by source entity type (optional)' },
            source_id: { type: 'number', description: 'Filter by source entity ID (optional)' },
            target_type: { type: 'string', enum: ['project', 'epic', 'story', 'task'], description: 'Filter by target entity type (optional)' },
            target_id: { type: 'number', description: 'Filter by target entity ID (optional)' },
            relationship_type: { type: 'string', enum: ['blocks', 'blocked_by', 'related_to', 'cloned_from', 'depends_on'], description: 'Filter by relationship type (optional)' },
          },
          required: ['project_identifier', 'agent_identifier'],
        },
      },
      {
        name: 'get_relationships_for_entity',
        description: 'Get all relationships for a specific entity (as source or target)',
        inputSchema: {
          type: 'object',
          properties: {
            project_identifier: { type: 'string', description: 'Project identifier' },
            agent_identifier: { type: 'string', description: 'Agent identifier for attribution' },
            entity_type: { type: 'string', enum: ['project', 'epic', 'story', 'task'], description: 'Type of entity' },
            entity_id: { type: 'number', description: 'ID of entity' },
          },
          required: ['project_identifier', 'agent_identifier', 'entity_type', 'entity_id'],
        },
      },
      // Note tools (polymorphic notes)
      {
        name: 'create_note',
        description: 'Create a note attached to any entity (project, epic, story, or task). Supports markdown formatting.',
        inputSchema: {
          type: 'object',
          properties: {
            project_identifier: { type: 'string', description: 'Project identifier' },
            agent_identifier: { type: 'string', description: 'Agent identifier for attribution' },
            parent_type: { type: 'string', enum: ['project', 'epic', 'story', 'task'], description: 'Type of parent entity' },
            parent_id: { type: 'number', description: 'ID of parent entity' },
            content: { type: 'string', description: 'Note content (markdown supported)' },
            author_name: { type: 'string', description: 'Optional author name (defaults to agent_identifier)' },
          },
          required: ['project_identifier', 'agent_identifier', 'parent_type', 'parent_id', 'content'],
        },
      },
      {
        name: 'update_note',
        description: 'Update an existing note',
        inputSchema: {
          type: 'object',
          properties: {
            project_identifier: { type: 'string', description: 'Project identifier' },
            agent_identifier: { type: 'string', description: 'Agent identifier for attribution' },
            id: { type: 'number', description: 'Note ID' },
            content: { type: 'string', description: 'New note content (markdown supported)' },
            author_name: { type: 'string', description: 'Optional author name' },
          },
          required: ['project_identifier', 'agent_identifier', 'id', 'content'],
        },
      },
      {
        name: 'delete_note',
        description: 'Delete a note',
        inputSchema: {
          type: 'object',
          properties: {
            project_identifier: { type: 'string', description: 'Project identifier' },
            agent_identifier: { type: 'string', description: 'Agent identifier for attribution' },
            id: { type: 'number', description: 'Note ID' },
          },
          required: ['project_identifier', 'agent_identifier', 'id'],
        },
      },
      {
        name: 'list_notes',
        description: 'List notes with optional filters for parent entity or agent',
        inputSchema: {
          type: 'object',
          properties: {
            project_identifier: { type: 'string', description: 'Project identifier' },
            agent_identifier: { type: 'string', description: 'Agent identifier for attribution' },
            parent_type: { type: 'string', enum: ['project', 'epic', 'story', 'task'], description: 'Filter by parent entity type (optional)' },
            parent_id: { type: 'number', description: 'Filter by parent entity ID (optional)' },
          },
          required: ['project_identifier', 'agent_identifier'],
        },
      },
      {
        name: 'get_notes_for_entity',
        description: 'Get all notes for a specific entity',
        inputSchema: {
          type: 'object',
          properties: {
            project_identifier: { type: 'string', description: 'Project identifier' },
            agent_identifier: { type: 'string', description: 'Agent identifier for attribution' },
            entity_type: { type: 'string', enum: ['project', 'epic', 'story', 'task'], description: 'Type of entity' },
            entity_id: { type: 'number', description: 'ID of entity' },
          },
          required: ['project_identifier', 'agent_identifier', 'entity_type', 'entity_id'],
        },
      },
      // Export tools
      {
        name: 'export_backlog',
        description: 'Export the current project backlog to markdown files (agile-planner format)',
        inputSchema: {
          type: 'object',
          properties: {
            project_identifier: { type: 'string', description: 'Project identifier' },
            agent_identifier: { type: 'string', description: 'Agent identifier for attribution' },
            output_dir: { type: 'string', description: 'Output directory path (default: .agile-backlog)' },
          },
          required: ['project_identifier', 'agent_identifier'],
        },
      },
    ],
  };
});

// Start the server
async function main() {
  console.error('[Startup] Initializing Agile MCP Server...');
  console.error('[Startup] Database initialized');
  console.error('[Startup] Handlers registered');

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[Startup] Agile MCP Server running on stdio');
  console.error('[Startup] Server ready to accept connections');
}

main().catch((error) => {
  console.error('[FATAL] Server startup error:', error);
  console.error('[FATAL] Stack trace:', error.stack);
  process.exit(1);
});
