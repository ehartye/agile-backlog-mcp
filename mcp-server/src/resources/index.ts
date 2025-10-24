import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListResourcesRequestSchema, ReadResourceRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import type { AgileDatabase } from '@agile-mcp/shared';

export function registerResources(server: Server, db: AgileDatabase) {
  // List available resources
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources: [
        {
          uri: 'backlog://overview',
          name: 'Backlog Overview',
          description: 'Complete overview of all epics, stories, and tasks',
          mimeType: 'application/json',
        },
        {
          uri: 'backlog://dependencies',
          name: 'Dependency Graph',
          description: 'Graph data structure of all story dependencies',
          mimeType: 'application/json',
        },
        {
          uri: 'backlog://hierarchy',
          name: 'Backlog Hierarchy',
          description: 'Hierarchical tree view of epics > stories > tasks',
          mimeType: 'application/json',
        },
      ],
    };
  });

  // Read resource contents
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const uri = request.params.uri;

    if (uri === 'backlog://overview') {
      const epics = db.listEpics();
      const stories = db.listStories();
      const tasks = db.listTasks();
      const dependencies = db.listDependencies();

      const overview = {
        summary: {
          total_epics: epics.length,
          total_stories: stories.length,
          total_tasks: tasks.length,
          total_dependencies: dependencies.length,
        },
        epics,
        stories,
        tasks,
        dependencies,
      };

      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(overview, null, 2),
          },
        ],
      };
    }

    if (uri === 'backlog://dependencies') {
      const graph = db.getDependencyGraph();
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(graph, null, 2),
          },
        ],
      };
    }

    if (uri === 'backlog://hierarchy') {
      const hierarchy = db.getHierarchy();
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(hierarchy, null, 2),
          },
        ],
      };
    }

    throw new Error(`Unknown resource: ${uri}`);
  });
}
