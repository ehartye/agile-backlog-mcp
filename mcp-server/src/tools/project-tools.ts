import type { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';
import type { AgileDatabase } from '@agile-mcp/shared';

export async function handleProjectTools(request: CallToolRequest, db: AgileDatabase) {
  const { name, arguments: args } = request.params;

    if (name === 'register_project') {
      try {
        const identifier = args.identifier as string;

        // Check if project already exists with this identifier
        const existing = db.getProjectByIdentifier(identifier);
        if (existing) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: false,
                  message: `Project "${existing.name}" is already registered with identifier "${identifier}"`,
                  project: existing,
                }, null, 2),
              },
            ],
          };
        }

        const project = db.createProject({
          identifier: identifier,
          name: args.name as string,
          description: args.description as string,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: `Project "${project.name}" registered successfully with identifier "${identifier}"`,
                project,
              }, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: (error as Error).message,
              }, null, 2),
            },
          ],
        };
      }
    }

    if (name === 'list_projects') {
      const projects = db.listProjects();
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(projects, null, 2),
          },
        ],
      };
    }

    if (name === 'get_project') {
      const project = args.identifier
        ? db.getProjectByIdentifier(args.identifier as string)
        : db.getProject(args.id as number);

      if (!project) {
        throw new Error('Project not found');
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(project, null, 2),
          },
        ],
      };
    }

    if (name === 'get_security_logs') {
      const limit = (args.limit as number) || 50;
      const logs = db.getSecurityLogs(limit);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(logs, null, 2),
          },
        ],
      };
    }

    return null; // Tool not found
}
