import type { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';
import type { AgileDatabase } from '@agile-mcp/shared';
import { getProjectContext, validateProjectAccess, detectConflict, ProjectContextError } from '../utils/project-context.js';

export async function handleBugTools(request: CallToolRequest, db: AgileDatabase) {
  const { name, arguments: args } = request.params;

  try {
      if (name === 'create_bug') {
        const ctx = getProjectContext(
          db,
          args.project_identifier as string,
          args.user_id as string,
          
        );

        // If story_id is provided, validate it belongs to this project
        if (args.story_id) {
          validateProjectAccess(db, ctx, 'story', args.story_id as number);
        }

        const bug = db.createBug({
          project_id: ctx.project_id,
          story_id: args.story_id as number | undefined,
          title: args.title as string,
          description: args.description as string,
          severity: args.severity as any,
          error_message: args.error_message as string | undefined,
          status: args.status as any,
          priority: args.priority as any,
          points: args.points as number | undefined,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                bug,
                project: ctx.project_name,
              }, null, 2),
            },
          ],
        };
      }

      if (name === 'update_bug') {
        const ctx = getProjectContext(
          db,
          args.project_identifier as string,
          args.user_id as string,
          
        );

        // Validate access to the bug
        validateProjectAccess(db, ctx, 'bug', args.id as number);

        // If changing story_id, validate the new story
        if (args.story_id !== undefined && args.story_id !== null) {
          validateProjectAccess(db, ctx, 'story', args.story_id as number);
        }

        // Detect conflicts
        const hasConflict = detectConflict(db, 'bug', args.id as number, ctx.user_id);

        const bug = db.updateBug({
          id: args.id as number,
          story_id: args.story_id as number | undefined,
          title: args.title as string | undefined,
          description: args.description as string | undefined,
          severity: args.severity as any,
          error_message: args.error_message as string | undefined,
          status: args.status as any,
          priority: args.priority as any,
          points: args.points as number | undefined,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                bug,
                conflict_detected: hasConflict,
                warning: hasConflict ? 'This bug was recently modified by another agent' : undefined,
              }, null, 2),
            },
          ],
        };
      }

      if (name === 'list_bugs') {
        const ctx = getProjectContext(
          db,
          args.project_identifier as string,
          args.user_id as string
        );

        const bugs = db.listBugs({
          project_id: ctx.project_id,
          story_id: args.story_id as number | undefined,
          status: args.status as any,
          priority: args.priority as any,
          severity: args.severity as any,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                project: ctx.project_name,
                count: bugs.length,
                bugs,
              }, null, 2),
            },
          ],
        };
      }

      if (name === 'get_bug') {
        const ctx = getProjectContext(
          db,
          args.project_identifier as string,
          args.user_id as string
        );

        const bug = db.getBug(args.id as number);
        if (!bug) {
          throw new Error(`Bug ${args.id} not found`);
        }

        // Validate access
        validateProjectAccess(db, ctx, 'bug', args.id as number);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                bug,
              }, null, 2),
            },
          ],
        };
      }

      if (name === 'delete_bug') {
        const ctx = getProjectContext(
          db,
          args.project_identifier as string,
          args.user_id as string
        );

        // Validate access
        validateProjectAccess(db, ctx, 'bug', args.id as number);

        db.deleteBug(args.id as number);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: `Bug ${args.id} deleted successfully`,
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
