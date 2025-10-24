import type { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';
import type { AgileDatabase } from '@agile-mcp/shared';
import { getProjectContext, validateProjectAccess, detectConflict, ProjectContextError } from '../utils/project-context.js';

export async function handleStoryTools(request: CallToolRequest, db: AgileDatabase) {
  const { name, arguments: args } = request.params;

  try {
      if (name === 'create_story') {
        const ctx = getProjectContext(
          db,
          args.project_identifier as string,
          args.agent_identifier as string,
          args.modified_by as string | undefined
        );

        // If epic_id is provided, validate it belongs to this project
        if (args.epic_id) {
          validateProjectAccess(db, ctx, 'epic', args.epic_id as number);
        }

        const story = db.createStory({
          project_id: ctx.project_id,
          epic_id: args.epic_id as number | undefined,
          title: args.title as string,
          description: args.description as string,
          acceptance_criteria: args.acceptance_criteria as string | undefined,
          status: args.status as any,
          priority: args.priority as any,
          points: args.points as number | undefined,
        }, ctx.agent_identifier, ctx.modified_by);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                story,
                project: ctx.project_name,
              }, null, 2),
            },
          ],
        };
      }

      if (name === 'update_story') {
        const ctx = getProjectContext(
          db,
          args.project_identifier as string,
          args.agent_identifier as string,
          args.modified_by as string | undefined
        );

        // Validate access to the story
        validateProjectAccess(db, ctx, 'story', args.id as number);

        // If changing epic_id, validate the new epic
        if (args.epic_id !== undefined && args.epic_id !== null) {
          validateProjectAccess(db, ctx, 'epic', args.epic_id as number);
        }

        // Detect conflicts
        const hasConflict = detectConflict(db, 'story', args.id as number, ctx.modified_by, ctx.agent_identifier);

        const story = db.updateStory({
          id: args.id as number,
          epic_id: args.epic_id as number | undefined,
          title: args.title as string | undefined,
          description: args.description as string | undefined,
          acceptance_criteria: args.acceptance_criteria as string | undefined,
          status: args.status as any,
          priority: args.priority as any,
          points: args.points as number | undefined,
        }, ctx.agent_identifier, ctx.modified_by);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                story,
                conflict_detected: hasConflict,
                warning: hasConflict ? 'This story was recently modified by another agent' : undefined,
              }, null, 2),
            },
          ],
        };
      }

      if (name === 'list_stories') {
        const ctx = getProjectContext(
          db,
          args.project_identifier as string,
          args.agent_identifier as string
        );

        const stories = db.listStories({
          project_id: ctx.project_id,
          epic_id: args.epic_id as number | undefined,
          status: args.status as any,
          priority: args.priority as any,
          has_dependencies: args.has_dependencies as boolean | undefined,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                project: ctx.project_name,
                count: stories.length,
                stories,
              }, null, 2),
            },
          ],
        };
      }

      if (name === 'get_story') {
        const ctx = getProjectContext(
          db,
          args.project_identifier as string,
          args.agent_identifier as string
        );

        const story = db.getStory(args.id as number);
        if (!story) {
          throw new Error(`Story ${args.id} not found`);
        }

        // Validate access
        validateProjectAccess(db, ctx, 'story', args.id as number);

        const tasks = db.listTasks({ project_id: ctx.project_id, story_id: args.id as number });
        const dependencies = db.listDependencies(args.id as number);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                story,
                tasks,
                dependencies,
              }, null, 2),
            },
          ],
        };
      }

      if (name === 'delete_story') {
        const ctx = getProjectContext(
          db,
          args.project_identifier as string,
          args.agent_identifier as string
        );

        // Validate access
        validateProjectAccess(db, ctx, 'story', args.id as number);

        db.deleteStory(args.id as number);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: `Story ${args.id} deleted successfully`,
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
