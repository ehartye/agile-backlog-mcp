import type { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';
import type { AgileDatabase } from '@agile-mcp/shared';
import { getProjectContext, validateProjectAccess, ProjectContextError } from '../utils/project-context.js';

export async function handleDependencyTools(request: CallToolRequest, db: AgileDatabase) {
  const { name, arguments: args } = request.params;

  try {
      if (name === 'add_dependency') {
        const ctx = getProjectContext(
          db,
          args.project_identifier as string,
          args.agent_identifier as string
        );

        // Validate both stories belong to this project
        validateProjectAccess(db, ctx, 'story', args.story_id as number);
        validateProjectAccess(db, ctx, 'story', args.depends_on_story_id as number);

        try {
          const dependency = db.createDependency({
            story_id: args.story_id as number,
            depends_on_story_id: args.depends_on_story_id as number,
            dependency_type: args.dependency_type as any,
          });

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  dependency,
                  project: ctx.project_name,
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

      if (name === 'remove_dependency') {
        const ctx = getProjectContext(
          db,
          args.project_identifier as string,
          args.agent_identifier as string
        );

        // Get the dependency first to validate project access
        const dependency = db.getDependency(args.id as number);
        if (dependency) {
          validateProjectAccess(db, ctx, 'story', dependency.story_id);
        }

        db.deleteDependency(args.id as number);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: `Dependency ${args.id} removed successfully`,
              }, null, 2),
            },
          ],
        };
      }

      if (name === 'list_dependencies') {
        const ctx = getProjectContext(
          db,
          args.project_identifier as string,
          args.agent_identifier as string
        );

        let dependencies;
        if (args.story_id !== undefined) {
          // Validate story belongs to this project
          validateProjectAccess(db, ctx, 'story', args.story_id as number);
          dependencies = db.listDependencies(args.story_id as number);
        } else {
          // Get all dependencies, but filter to only this project's stories
          const allDeps = db.listDependencies();
          const projectStories = db.listStories({ project_id: ctx.project_id });
          const projectStoryIds = new Set(projectStories.map(s => s.id));

          dependencies = allDeps.filter(
            d => projectStoryIds.has(d.story_id) && projectStoryIds.has(d.depends_on_story_id)
          );
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                project: ctx.project_name,
                count: dependencies.length,
                dependencies,
              }, null, 2),
            },
          ],
        };
      }

      return { content: [] };
    } catch (error) {
      if (error instanceof ProjectContextError) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: error.message,
                code: error.code,
              }, null, 2),
            },
          ],
          isError: true,
        };
      }
      throw error;
    }

  return null; // Tool not found
}
