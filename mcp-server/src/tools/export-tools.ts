import type { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';
import type { AgileDatabase } from '@agile-mcp/shared';
import { getProjectContext, ProjectContextError } from '../utils/project-context.js';
import * as fs from 'fs';
import * as path from 'path';

export async function handleExportTools(request: CallToolRequest, db: AgileDatabase) {
  const { name, arguments: args } = request.params;

  try {
      if (name === 'export_backlog') {
        const ctx = getProjectContext(
          db,
          args.project_identifier as string,
          args.agent_identifier as string
        );
        const outputDir = (args.output_dir as string) || '.agile-backlog';

        // Create output directory structure
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }

        const epicsDir = path.join(outputDir, 'epics');
        if (!fs.existsSync(epicsDir)) {
          fs.mkdirSync(epicsDir, { recursive: true });
        }

        const orphanStoriesDir = path.join(outputDir, 'orphan-stories');
        if (!fs.existsSync(orphanStoriesDir)) {
          fs.mkdirSync(orphanStoriesDir, { recursive: true });
        }

        // Filter by current project
        const epics = db.listEpics({ project_id: ctx.project_id });
        const allStories = db.listStories({ project_id: ctx.project_id });
        const backlogData: any = { project: ctx.project_name, epics: [], orphan_stories: [] };

      // Export epics and their stories
      for (const epic of epics) {
        const epicSlug = slugify(epic.title);
        const epicDir = path.join(epicsDir, epicSlug);
        fs.mkdirSync(epicDir, { recursive: true });

        // Write epic.md
        const epicMd = `# ${epic.title}

**Status:** ${epic.status}

## Description
${epic.description}

**Created:** ${epic.created_at}
**Updated:** ${epic.updated_at}
`;
        fs.writeFileSync(path.join(epicDir, 'epic.md'), epicMd);

        // Get stories for this epic
        const epicStories = allStories.filter(s => s.epic_id === epic.id);
        const featuresDir = path.join(epicDir, 'features');
        if (epicStories.length > 0) {
          fs.mkdirSync(featuresDir, { recursive: true });
        }

        const epicData: any = { ...epic, stories: [] };

        // Export stories as "features"
        for (const story of epicStories) {
          const storySlug = slugify(story.title);
          const storyPath = path.join(featuresDir, `${storySlug}.md`);

          const tasks = db.listTasks({ story_id: story.id });
          const dependencies = db.listDependencies(story.id);

          let storyMd = `# ${story.title}

**Status:** ${story.status}
**Priority:** ${story.priority}
${story.points ? `**Points:** ${story.points}` : ''}

## Description
${story.description}

`;

          if (dependencies.length > 0) {
            storyMd += `## Dependencies\n`;
            for (const dep of dependencies) {
              const depStory = db.getStory(dep.depends_on_story_id);
              if (depStory) {
                storyMd += `- ${dep.dependency_type === 'blocks' ? 'Blocks' : 'Blocked by'}: ${depStory.title} (#${depStory.id})\n`;
              }
            }
            storyMd += '\n';
          }

          if (tasks.length > 0) {
            storyMd += `## Tasks\n`;
            for (const task of tasks) {
              const checkbox = task.status === 'done' ? '[x]' : '[ ]';
              storyMd += `- ${checkbox} **${task.title}** (${task.status})${task.assignee ? ` - @${task.assignee}` : ''}\n`;
              storyMd += `  ${task.description}\n`;
            }
            storyMd += '\n';
          }

          storyMd += `**Created:** ${story.created_at}\n**Updated:** ${story.updated_at}\n`;

          fs.writeFileSync(storyPath, storyMd);
          epicData.stories.push(story);
        }

        backlogData.epics.push(epicData);
      }

      // Export orphan stories (stories without an epic)
      const orphanStories = allStories.filter(s => s.epic_id === null);
      for (const story of orphanStories) {
        const storySlug = slugify(story.title);
        const storyPath = path.join(orphanStoriesDir, `${storySlug}.md`);

        const tasks = db.listTasks({ story_id: story.id });
        const dependencies = db.listDependencies(story.id);

        let storyMd = `# ${story.title}

**Status:** ${story.status}
**Priority:** ${story.priority}
${story.points ? `**Points:** ${story.points}` : ''}

## Description
${story.description}

`;

        if (dependencies.length > 0) {
          storyMd += `## Dependencies\n`;
          for (const dep of dependencies) {
            const depStory = db.getStory(dep.depends_on_story_id);
            if (depStory) {
              storyMd += `- ${dep.dependency_type === 'blocks' ? 'Blocks' : 'Blocked by'}: ${depStory.title} (#${depStory.id})\n`;
            }
          }
          storyMd += '\n';
        }

        if (tasks.length > 0) {
          storyMd += `## Tasks\n`;
          for (const task of tasks) {
            const checkbox = task.status === 'done' ? '[x]' : '[ ]';
            storyMd += `- ${checkbox} **${task.title}** (${task.status})${task.assignee ? ` - @${task.assignee}` : ''}\n`;
            storyMd += `  ${task.description}\n`;
          }
          storyMd += '\n';
        }

        storyMd += `**Created:** ${story.created_at}\n**Updated:** ${story.updated_at}\n`;

        fs.writeFileSync(storyPath, storyMd);
        backlogData.orphan_stories.push(story);
      }

        // Write backlog.json
        fs.writeFileSync(
          path.join(outputDir, 'backlog.json'),
          JSON.stringify(backlogData, null, 2)
        );

        const taskCount = db.listTasks({ project_id: ctx.project_id }).length;

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: `Backlog exported to ${outputDir}`,
                project: ctx.project_name,
                stats: {
                  epics: epics.length,
                  stories: allStories.length,
                  orphan_stories: orphanStories.length,
                  tasks: taskCount,
                },
                output_dir: outputDir,
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

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
