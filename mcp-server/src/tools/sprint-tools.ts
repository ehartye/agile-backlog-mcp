import type { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';
import type { AgileDatabase } from '@agile-mcp/shared';
import { getProjectContext, validateProjectAccess, ProjectContextError } from '../utils/project-context.js';

export async function handleSprintTools(request: CallToolRequest, db: AgileDatabase) {
  const { name, arguments: args } = request.params;

  try {
      if (name === 'create_sprint') {
        const ctx = getProjectContext(
          db,
          args.project_identifier as string,
          args.agent_identifier as string
        );

        const sprint = db.createSprint({
          project_id: ctx.project_id,
          name: args.name as string,
          goal: args.goal as string | undefined,
          start_date: args.start_date as string,
          end_date: args.end_date as string,
          capacity_points: args.capacity_points as number | undefined,
          status: args.status as any,
        }, ctx.user_id);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                sprint,
                project: ctx.project_name,
              }, null, 2),
            },
          ],
        };
      }

      if (name === 'list_sprints') {
        const ctx = getProjectContext(
          db,
          args.project_identifier as string,
          args.agent_identifier as string
        );

        const sprints = db.listSprints({
          project_id: ctx.project_id,
          status: args.status as any,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                sprints,
                count: sprints.length,
                project: ctx.project_name,
              }, null, 2),
            },
          ],
        };
      }

      if (name === 'get_sprint') {
        const ctx = getProjectContext(
          db,
          args.project_identifier as string,
          args.agent_identifier as string
        );

        const sprint = db.getSprint(args.sprint_id as number);
        if (!sprint) {
          throw new Error(`Sprint ${args.sprint_id} not found`);
        }

        // Validate project access
        if (sprint.project_id !== ctx.project_id) {
          throw new ProjectContextError(
            `Sprint ${sprint.id} belongs to a different project`,
            'PROJECT_VIOLATION'
          );
        }

        const stories = db.getSprintStories(sprint.id);
        const capacity = db.calculateSprintCapacity(sprint.id);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                sprint,
                stories,
                capacity,
                project: ctx.project_name,
              }, null, 2),
            },
          ],
        };
      }

      if (name === 'update_sprint') {
        const ctx = getProjectContext(
          db,
          args.project_identifier as string,
          args.agent_identifier as string
        );

        const sprint = db.getSprint(args.sprint_id as number);
        if (!sprint) {
          throw new Error(`Sprint ${args.sprint_id} not found`);
        }

        // Validate project access
        if (sprint.project_id !== ctx.project_id) {
          throw new ProjectContextError(
            `Sprint ${sprint.id} belongs to a different project`,
            'PROJECT_VIOLATION'
          );
        }

        const updated = db.updateSprint({
          id: args.sprint_id as number,
          name: args.name as string | undefined,
          goal: args.goal as string | undefined,
          start_date: args.start_date as string | undefined,
          end_date: args.end_date as string | undefined,
          capacity_points: args.capacity_points as number | undefined,
          status: args.status as any,
        }, ctx.user_id);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                sprint: updated,
                project: ctx.project_name,
              }, null, 2),
            },
          ],
        };
      }

      if (name === 'delete_sprint') {
        const ctx = getProjectContext(
          db,
          args.project_identifier as string,
          args.agent_identifier as string
        );

        const sprint = db.getSprint(args.sprint_id as number);
        if (!sprint) {
          throw new Error(`Sprint ${args.sprint_id} not found`);
        }

        // Validate project access
        if (sprint.project_id !== ctx.project_id) {
          throw new ProjectContextError(
            `Sprint ${sprint.id} belongs to a different project`,
            'PROJECT_VIOLATION'
          );
        }

        // Only allow deletion if sprint is in planning status
        if (sprint.status !== 'planning') {
          throw new Error(`Cannot delete sprint in '${sprint.status}' status. Only 'planning' sprints can be deleted.`);
        }

        db.deleteSprint(args.sprint_id as number);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: `Sprint '${sprint.name}' deleted successfully`,
                project: ctx.project_name,
              }, null, 2),
            },
          ],
        };
      }

      if (name === 'add_story_to_sprint') {
        const ctx = getProjectContext(
          db,
          args.project_identifier as string,
          args.agent_identifier as string
        );

        const sprint = db.getSprint(args.sprint_id as number);
        if (!sprint) {
          throw new Error(`Sprint ${args.sprint_id} not found`);
        }

        // Validate sprint project access
        if (sprint.project_id !== ctx.project_id) {
          throw new ProjectContextError(
            `Sprint ${sprint.id} belongs to a different project`,
            'PROJECT_VIOLATION'
          );
        }

        // Validate story project access
        validateProjectAccess(db, ctx, 'story', args.story_id as number);

        // Check if story is already in an active sprint
        const currentSprint = db.getStoryCurrentSprint(args.story_id as number);
        if (currentSprint && currentSprint.id !== sprint.id) {
          throw new Error(`Story ${args.story_id} is already in sprint '${currentSprint.name}' (ID: ${currentSprint.id})`);
        }

        db.addStoryToSprint(args.sprint_id as number, args.story_id as number, ctx.user_id);

        const capacity = db.calculateSprintCapacity(args.sprint_id as number);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: `Story ${args.story_id} added to sprint '${sprint.name}'`,
                capacity,
                project: ctx.project_name,
              }, null, 2),
            },
          ],
        };
      }

      if (name === 'remove_story_from_sprint') {
        const ctx = getProjectContext(
          db,
          args.project_identifier as string,
          args.agent_identifier as string
        );

        const sprint = db.getSprint(args.sprint_id as number);
        if (!sprint) {
          throw new Error(`Sprint ${args.sprint_id} not found`);
        }

        // Validate sprint project access
        if (sprint.project_id !== ctx.project_id) {
          throw new ProjectContextError(
            `Sprint ${sprint.id} belongs to a different project`,
            'PROJECT_VIOLATION'
          );
        }

        db.removeStoryFromSprint(args.sprint_id as number, args.story_id as number);

        const capacity = db.calculateSprintCapacity(args.sprint_id as number);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: `Story ${args.story_id} removed from sprint '${sprint.name}'`,
                capacity,
                project: ctx.project_name,
              }, null, 2),
            },
          ],
        };
      }

      if (name === 'start_sprint') {
        const ctx = getProjectContext(
          db,
          args.project_identifier as string,
          args.agent_identifier as string
        );

        const sprint = db.getSprint(args.sprint_id as number);
        if (!sprint) {
          throw new Error(`Sprint ${args.sprint_id} not found`);
        }

        // Validate project access
        if (sprint.project_id !== ctx.project_id) {
          throw new ProjectContextError(
            `Sprint ${sprint.id} belongs to a different project`,
            'PROJECT_VIOLATION'
          );
        }

        if (sprint.status !== 'planning') {
          throw new Error(`Sprint is already in '${sprint.status}' status`);
        }

        // Update status to active
        const updated = db.updateSprint({
          id: args.sprint_id as number,
          status: 'active',
        }, ctx.user_id);

        // Create initial snapshot
        const snapshot = db.createSprintSnapshot(args.sprint_id as number);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                sprint: updated,
                initial_snapshot: snapshot,
                message: `Sprint '${sprint.name}' started`,
                project: ctx.project_name,
              }, null, 2),
            },
          ],
        };
      }

      if (name === 'complete_sprint') {
        const ctx = getProjectContext(
          db,
          args.project_identifier as string,
          args.agent_identifier as string
        );

        const sprint = db.getSprint(args.sprint_id as number);
        if (!sprint) {
          throw new Error(`Sprint ${args.sprint_id} not found`);
        }

        // Validate project access
        if (sprint.project_id !== ctx.project_id) {
          throw new ProjectContextError(
            `Sprint ${sprint.id} belongs to a different project`,
            'PROJECT_VIOLATION'
          );
        }

        if (sprint.status !== 'active') {
          throw new Error(`Only active sprints can be completed. Current status: ${sprint.status}`);
        }

        // Create final snapshot
        const finalSnapshot = db.createSprintSnapshot(args.sprint_id as number);

        // Update status to completed
        const updated = db.updateSprint({
          id: args.sprint_id as number,
          status: 'completed',
        }, ctx.user_id);

        // Generate sprint report
        const stories = db.getSprintStories(sprint.id);
        const capacity = db.calculateSprintCapacity(args.sprint_id as number);

        const completedStories = stories.filter(s => s.status === 'done');
        const incompleteStories = stories.filter(s => s.status !== 'done');

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                sprint: updated,
                final_snapshot: finalSnapshot,
                report: {
                  total_stories: stories.length,
                  completed_stories: completedStories.length,
                  incomplete_stories: incompleteStories.length,
                  completed_points: capacity.completed,
                  remaining_points: capacity.remaining,
                  velocity: capacity.completed,
                  completion_rate: stories.length > 0 ? Math.round((completedStories.length / stories.length) * 100) : 0,
                },
                message: `Sprint '${sprint.name}' completed`,
                project: ctx.project_name,
              }, null, 2),
            },
          ],
        };
      }

      if (name === 'get_sprint_burndown') {
        const ctx = getProjectContext(
          db,
          args.project_identifier as string,
          args.agent_identifier as string
        );

        const sprint = db.getSprint(args.sprint_id as number);
        if (!sprint) {
          throw new Error(`Sprint ${args.sprint_id} not found`);
        }

        // Validate project access
        if (sprint.project_id !== ctx.project_id) {
          throw new ProjectContextError(
            `Sprint ${sprint.id} belongs to a different project`,
            'PROJECT_VIOLATION'
          );
        }

        const snapshots = db.getSprintSnapshots(args.sprint_id as number);
        const capacity = db.calculateSprintCapacity(args.sprint_id as number);

        // Calculate ideal burndown
        const startDate = new Date(sprint.start_date);
        const endDate = new Date(sprint.end_date);
        const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const totalPoints = capacity.committed;
        const pointsPerDay = totalPoints / totalDays;

        const idealBurndown: number[] = [];
        for (let i = 0; i <= totalDays; i++) {
          idealBurndown.push(Math.max(0, totalPoints - (pointsPerDay * i)));
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                sprint,
                snapshots,
                ideal_burndown: idealBurndown,
                total_days: totalDays,
                capacity: capacity,
                project: ctx.project_name,
              }, null, 2),
            },
          ],
        };
      }

      if (name === 'get_velocity_report') {
        const ctx = getProjectContext(
          db,
          args.project_identifier as string,
          args.agent_identifier as string
        );

        const sprintCount = (args.sprint_count as number) || 3;
        const velocities = db.calculateVelocity(ctx.project_id, sprintCount);

        const average = velocities.length > 0
          ? velocities.reduce((a, b) => a + b, 0) / velocities.length
          : 0;

        const sprints = db.listSprints({ project_id: ctx.project_id, status: 'completed' });
        const recentSprints = sprints.slice(0, sprintCount);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                average_velocity: Math.round(average * 10) / 10,
                velocities,
                sprint_names: recentSprints.map(s => s.name),
                sprint_count: velocities.length,
                project: ctx.project_name,
              }, null, 2),
            },
          ],
        };
      }

      if (name === 'create_daily_snapshot') {
        const ctx = getProjectContext(
          db,
          args.project_identifier as string,
          args.agent_identifier as string
        );

        const sprint = db.getSprint(args.sprint_id as number);
        if (!sprint) {
          throw new Error(`Sprint ${args.sprint_id} not found`);
        }

        // Validate project access
        if (sprint.project_id !== ctx.project_id) {
          throw new ProjectContextError(
            `Sprint ${sprint.id} belongs to a different project`,
            'PROJECT_VIOLATION'
          );
        }

        const snapshot = db.createSprintSnapshot(
          args.sprint_id as number,
          args.date as string | undefined
        );

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                snapshot,
                sprint: sprint.name,
                project: ctx.project_name,
              }, null, 2),
            },
          ],
        };
      }

      return null;
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
