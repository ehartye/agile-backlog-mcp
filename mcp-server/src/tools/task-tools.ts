import type { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';
import type { AgileDatabase } from '@agile-mcp/shared';
import { getProjectContext, validateProjectAccess, detectConflict, ProjectContextError } from '../utils/project-context.js';

export async function handleTaskTools(request: CallToolRequest, db: AgileDatabase) {
  const { name, arguments: args } = request.params;

  try {
      if (name === 'create_task') {
        const ctx = getProjectContext(
          db,
          args.project_identifier as string,
          args.agent_identifier as string,
          args.modified_by as string | undefined
        );

        // Validate story belongs to this project
        validateProjectAccess(db, ctx, 'story', args.story_id as number);

        const task = db.createTask({
          story_id: args.story_id as number,
          title: args.title as string,
          description: args.description as string,
          status: args.status as any,
          assignee: args.assignee as string | undefined,
        }, ctx.agent_identifier, ctx.modified_by);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                task,
                project: ctx.project_name,
              }, null, 2),
            },
          ],
        };
      }

      if (name === 'update_task') {
        const ctx = getProjectContext(
          db,
          args.project_identifier as string,
          args.agent_identifier as string,
          args.modified_by as string | undefined
        );

        // Validate access to the task
        validateProjectAccess(db, ctx, 'task', args.id as number);

        // If changing story_id, validate the new story
        if (args.story_id !== undefined) {
          validateProjectAccess(db, ctx, 'story', args.story_id as number);
        }

        // Detect conflicts
        const hasConflict = detectConflict(db, 'task', args.id as number, ctx.modified_by, ctx.agent_identifier);

        const task = db.updateTask({
          id: args.id as number,
          story_id: args.story_id as number | undefined,
          title: args.title as string | undefined,
          description: args.description as string | undefined,
          status: args.status as any,
          assignee: args.assignee as string | undefined,
        }, ctx.agent_identifier, ctx.modified_by);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                task,
                conflict_detected: hasConflict,
                warning: hasConflict ? 'This task was recently modified by another agent' : undefined,
              }, null, 2),
            },
          ],
        };
      }

      if (name === 'list_tasks') {
        const ctx = getProjectContext(
          db,
          args.project_identifier as string,
          args.agent_identifier as string
        );

        const tasks = db.listTasks({
          project_id: ctx.project_id,
          story_id: args.story_id as number | undefined,
          status: args.status as any,
          assignee: args.assignee as string | undefined,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                project: ctx.project_name,
                count: tasks.length,
                tasks,
              }, null, 2),
            },
          ],
        };
      }

      if (name === 'get_task') {
        const ctx = getProjectContext(
          db,
          args.project_identifier as string,
          args.agent_identifier as string
        );

        const task = db.getTask(args.id as number);
        if (!task) {
          throw new Error(`Task ${args.id} not found`);
        }

        // Validate access
        validateProjectAccess(db, ctx, 'task', args.id as number);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                task,
              }, null, 2),
            },
          ],
        };
      }

      if (name === 'delete_task') {
        const ctx = getProjectContext(
          db,
          args.project_identifier as string,
          args.agent_identifier as string
        );

        // Validate access
        validateProjectAccess(db, ctx, 'task', args.id as number);

        db.deleteTask(args.id as number);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: `Task ${args.id} deleted successfully`,
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
