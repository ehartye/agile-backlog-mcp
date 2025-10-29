import type { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';
import type { AgileDatabase } from '@agile-mcp/shared';
import { getProjectContext, validateProjectAccess, detectConflict, ProjectContextError } from '../utils/project-context.js';

export async function handleEpicTools(request: CallToolRequest, db: AgileDatabase) {
  const { name, arguments: args } = request.params;

  try {
      if (name === 'create_epic') {
        const ctx = getProjectContext(
          db,
          args.project_identifier as string,
          args.user_id as string,
          
        );

        const epic = db.createEpic({
          project_id: ctx.project_id,
          title: args.title as string,
          description: args.description as string,
          status: args.status as any,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                epic,
                project: ctx.project_name,
              }, null, 2),
            },
          ],
        };
      }

      if (name === 'update_epic') {
        const ctx = getProjectContext(
          db,
          args.project_identifier as string,
          args.user_id as string,
          
        );

        // Validate access
        validateProjectAccess(db, ctx, 'epic', args.id as number);

        // Detect conflicts
        const hasConflict = detectConflict(db, 'epic', args.id as number, ctx.user_id);

        const epic = db.updateEpic({
          id: args.id as number,
          title: args.title as string | undefined,
          description: args.description as string | undefined,
          status: args.status as any,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                epic,
                conflict_detected: hasConflict,
                warning: hasConflict ? 'This epic was recently modified by another agent' : undefined,
              }, null, 2),
            },
          ],
        };
      }

      if (name === 'list_epics') {
        const ctx = getProjectContext(
          db,
          args.project_identifier as string,
          args.user_id as string
        );

        const epics = db.listEpics({ project_id: ctx.project_id });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                project: ctx.project_name,
                count: epics.length,
                epics,
              }, null, 2),
            },
          ],
        };
      }

      if (name === 'get_epic') {
        const ctx = getProjectContext(
          db,
          args.project_identifier as string,
          args.user_id as string
        );

        const epic = db.getEpic(args.id as number);
        if (!epic) {
          throw new Error(`Epic ${args.id} not found`);
        }

        // Validate access
        validateProjectAccess(db, ctx, 'epic', args.id as number);

        const stories = db.listStories({ epic_id: args.id as number, project_id: ctx.project_id });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                epic,
                stories,
              }, null, 2),
            },
          ],
        };
      }

      if (name === 'delete_epic') {
        const ctx = getProjectContext(
          db,
          args.project_identifier as string,
          args.user_id as string
        );

        // Validate access
        validateProjectAccess(db, ctx, 'epic', args.id as number);

        db.deleteEpic(args.id as number);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: `Epic ${args.id} deleted successfully`,
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
