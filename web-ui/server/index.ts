import express from 'express';
import cors from 'cors';
import { AgileDatabase } from '@agile-mcp/shared';

const app = express();
const PORT = process.env.PORT || 3004;

// Initialize database
const db = new AgileDatabase();

// Middleware
app.use(cors());
app.use(express.json());

// API Routes

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Projects
app.get('/api/projects', (_req, res) => {
  try {
    const projects = db.listProjects();
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.get('/api/projects/:id', (req, res) => {
  try {
    const project = db.getProject(parseInt(req.params.id));
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/api/projects', (req, res) => {
  try {
    const project = db.createProject(req.body);
    res.status(201).json(project);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

app.patch('/api/projects/:id', (req, res) => {
  try {
    const project = db.updateProject({ id: parseInt(req.params.id), ...req.body });
    res.json(project);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

app.delete('/api/projects/:id', (req, res) => {
  try {
    db.deleteProject(parseInt(req.params.id));
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Security logs
app.get('/api/security-logs', (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const logs = db.getSecurityLogs(limit);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Epics
app.get('/api/epics', (req, res) => {
  try {
    const filter: any = {};
    if (req.query.project_id) filter.project_id = parseInt(req.query.project_id as string);
    if (req.query.status) filter.status = req.query.status;

    const epics = db.listEpics(filter);
    res.json(epics);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.get('/api/epics/:id', (req, res) => {
  try {
    const epic = db.getEpic(parseInt(req.params.id));
    if (!epic) {
      return res.status(404).json({ error: 'Epic not found' });
    }
    const stories = db.listStories({ epic_id: parseInt(req.params.id) });
    res.json({ epic, stories });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/api/epics', (req, res) => {
  try {
    const epic = db.createEpic(req.body, 'web-ui');
    res.status(201).json(epic);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

app.patch('/api/epics/:id', (req, res) => {
  try {
    const epic = db.updateEpic({ id: parseInt(req.params.id), ...req.body }, 'web-ui');
    res.json(epic);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

app.delete('/api/epics/:id', (req, res) => {
  try {
    db.deleteEpic(parseInt(req.params.id));
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Stories
app.get('/api/stories', (req, res) => {
  try {
    const filter: any = {};
    if (req.query.project_id) filter.project_id = parseInt(req.query.project_id as string);
    if (req.query.epic_id) filter.epic_id = parseInt(req.query.epic_id as string);
    if (req.query.status) filter.status = req.query.status;
    if (req.query.priority) filter.priority = req.query.priority;
    if (req.query.has_dependencies) filter.has_dependencies = req.query.has_dependencies === 'true';

    let stories = db.listStories(filter);

    // Filter by sprint if sprint_id is provided
    if (req.query.sprint_id) {
      if (req.query.sprint_id === 'backlog') {
        // Show stories not in any active or planning sprint
        const allSprints = db.listSprints({
          project_id: filter.project_id,
        }).filter(s => s.status === 'active' || s.status === 'planning');

        const storyIdsInSprints = new Set<number>();
        for (const sprint of allSprints) {
          const sprintStories = db.getSprintStories(sprint.id);
          sprintStories.forEach(s => storyIdsInSprints.add(s.id));
        }

        stories = stories.filter(s => !storyIdsInSprints.has(s.id));
      } else {
        // Show stories in specific sprint
        const sprintId = parseInt(req.query.sprint_id as string);
        const sprintStories = db.getSprintStories(sprintId);
        const storyIdsInSprint = new Set(sprintStories.map(s => s.id));
        stories = stories.filter(s => storyIdsInSprint.has(s.id));
      }
    }

    res.json(stories);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.get('/api/stories/:id', (req, res) => {
  try {
    const story = db.getStory(parseInt(req.params.id));
    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }
    const tasks = db.listTasks({ story_id: parseInt(req.params.id) });
    const dependencies = db.listDependencies(parseInt(req.params.id));
    res.json({ story, tasks, dependencies });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/api/stories', (req, res) => {
  try {
    const story = db.createStory(req.body, 'web-ui');
    res.status(201).json(story);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

app.patch('/api/stories/:id', (req, res) => {
  try {
    const story = db.updateStory({ id: parseInt(req.params.id), ...req.body }, 'web-ui');
    res.json(story);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

app.delete('/api/stories/:id', (req, res) => {
  try {
    db.deleteStory(parseInt(req.params.id));
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Tasks
app.get('/api/tasks', (req, res) => {
  try {
    const filter: any = {};
    if (req.query.project_id) filter.project_id = parseInt(req.query.project_id as string);
    if (req.query.story_id) filter.story_id = parseInt(req.query.story_id as string);
    if (req.query.status) filter.status = req.query.status;
    if (req.query.assignee) filter.assignee = req.query.assignee;

    const tasks = db.listTasks(filter);
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/api/tasks', (req, res) => {
  try {
    const task = db.createTask(req.body, 'web-ui');
    res.status(201).json(task);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

app.patch('/api/tasks/:id', (req, res) => {
  try {
    const task = db.updateTask({ id: parseInt(req.params.id), ...req.body }, 'web-ui');
    res.json(task);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

app.delete('/api/tasks/:id', (req, res) => {
  try {
    db.deleteTask(parseInt(req.params.id));
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Dependencies
app.get('/api/dependencies', (req, res) => {
  try {
    const storyId = req.query.story_id ? parseInt(req.query.story_id as string) : undefined;
    const dependencies = db.listDependencies(storyId);
    res.json(dependencies);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/api/dependencies', (req, res) => {
  try {
    const dependency = db.createDependency(req.body);
    res.status(201).json(dependency);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

app.delete('/api/dependencies/:id', (req, res) => {
  try {
    db.deleteDependency(parseInt(req.params.id));
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Relationships
app.get('/api/relationships', (req, res) => {
  try {
    const filter: any = {};
    if (req.query.project_id) filter.project_id = parseInt(req.query.project_id as string);
    if (req.query.source_type) filter.source_type = req.query.source_type;
    if (req.query.source_id) filter.source_id = parseInt(req.query.source_id as string);
    if (req.query.target_type) filter.target_type = req.query.target_type;
    if (req.query.target_id) filter.target_id = parseInt(req.query.target_id as string);
    if (req.query.relationship_type) filter.relationship_type = req.query.relationship_type;

    const relationships = db.listRelationships(filter);
    res.json(relationships);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.get('/api/relationships/:id', (req, res) => {
  try {
    const relationship = db.getRelationship(parseInt(req.params.id));
    if (!relationship) {
      return res.status(404).json({ error: 'Relationship not found' });
    }
    res.json(relationship);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.get('/api/relationships/entity/:entityType/:entityId', (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const relationships = db.getRelationshipsForEntity(
      entityType as any,
      parseInt(entityId)
    );
    res.json(relationships);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/api/relationships', (req, res) => {
  try {
    const relationship = db.createRelationship(req.body);
    res.status(201).json(relationship);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

app.delete('/api/relationships/:id', (req, res) => {
  try {
    db.deleteRelationship(parseInt(req.params.id));
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Notes
app.get('/api/notes', (req, res) => {
  try {
    const filter: any = {};
    if (req.query.project_id) filter.project_id = parseInt(req.query.project_id as string);
    if (req.query.parent_type) filter.parent_type = req.query.parent_type;
    if (req.query.parent_id) filter.parent_id = parseInt(req.query.parent_id as string);
    if (req.query.agent_identifier) filter.agent_identifier = req.query.agent_identifier;

    const notes = db.listNotes(filter);
    res.json(notes);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.get('/api/notes/:id', (req, res) => {
  try {
    const note = db.getNote(parseInt(req.params.id));
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }
    res.json(note);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.get('/api/notes/entity/:entityType/:entityId', (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const notes = db.getNotesForEntity(
      entityType as any,
      parseInt(entityId)
    );
    res.json(notes);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/api/notes', (req, res) => {
  try {
    const note = db.createNote(req.body);
    res.status(201).json(note);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

app.patch('/api/notes/:id', (req, res) => {
  try {
    const note = db.updateNote({ id: parseInt(req.params.id), ...req.body });
    res.json(note);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

app.delete('/api/notes/:id', (req, res) => {
  try {
    db.deleteNote(parseInt(req.params.id));
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Graph data
app.get('/api/graph/dependencies', (req, res) => {
  try {
    const projectId = req.query.project_id ? parseInt(req.query.project_id as string) : undefined;
    const graph = db.getDependencyGraph(projectId);
    res.json(graph);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.get('/api/graph/hierarchy', (req, res) => {
  try {
    const projectId = req.query.project_id ? parseInt(req.query.project_id as string) : undefined;
    const hierarchy = db.getHierarchy(projectId);
    res.json(hierarchy);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Sprints
app.get('/api/sprints', (req, res) => {
  try {
    const filter: any = {};
    if (req.query.project_id) filter.project_id = parseInt(req.query.project_id as string);
    if (req.query.status) filter.status = req.query.status;

    const sprints = db.listSprints(filter);
    res.json(sprints);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.get('/api/sprints/:id', (req, res) => {
  try {
    const sprint = db.getSprint(parseInt(req.params.id));
    if (!sprint) {
      return res.status(404).json({ error: 'Sprint not found' });
    }
    const stories = db.getSprintStories(parseInt(req.params.id));
    const capacity = db.calculateSprintCapacity(parseInt(req.params.id));
    res.json({ sprint, stories, capacity });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/api/sprints', (req, res) => {
  try {
    const sprint = db.createSprint(req.body, 'web-ui');
    res.status(201).json(sprint);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

app.patch('/api/sprints/:id', (req, res) => {
  try {
    const sprint = db.updateSprint({ id: parseInt(req.params.id), ...req.body }, 'web-ui');
    res.json(sprint);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

app.delete('/api/sprints/:id', (req, res) => {
  try {
    db.deleteSprint(parseInt(req.params.id));
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/api/sprints/:sprintId/stories/:storyId', (req, res) => {
  try {
    db.addStoryToSprint(parseInt(req.params.sprintId), parseInt(req.params.storyId), 'web-ui');
    const capacity = db.calculateSprintCapacity(parseInt(req.params.sprintId));
    res.json({ success: true, capacity });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

app.delete('/api/sprints/:sprintId/stories/:storyId', (req, res) => {
  try {
    db.removeStoryFromSprint(parseInt(req.params.sprintId), parseInt(req.params.storyId));
    const capacity = db.calculateSprintCapacity(parseInt(req.params.sprintId));
    res.json({ success: true, capacity });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/api/sprints/:id/start', (req, res) => {
  try {
    const sprint = db.getSprint(parseInt(req.params.id));
    if (!sprint) {
      return res.status(404).json({ error: 'Sprint not found' });
    }
    if (sprint.status !== 'planning') {
      return res.status(400).json({ error: `Sprint is already in '${sprint.status}' status` });
    }
    const updated = db.updateSprint({ id: parseInt(req.params.id), status: 'active' }, 'web-ui');
    const snapshot = db.createSprintSnapshot(parseInt(req.params.id));
    res.json({ sprint: updated, initial_snapshot: snapshot });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

app.post('/api/sprints/:id/complete', (req, res) => {
  try {
    const sprint = db.getSprint(parseInt(req.params.id));
    if (!sprint) {
      return res.status(404).json({ error: 'Sprint not found' });
    }
    if (sprint.status !== 'active') {
      return res.status(400).json({ error: `Only active sprints can be completed. Current status: ${sprint.status}` });
    }

    const finalSnapshot = db.createSprintSnapshot(parseInt(req.params.id));
    const updated = db.updateSprint({ id: parseInt(req.params.id), status: 'completed' }, 'web-ui');

    const stories = db.getSprintStories(sprint.id);
    const capacity = db.calculateSprintCapacity(parseInt(req.params.id));

    const completedStories = stories.filter(s => s.status === 'done');
    const incompleteStories = stories.filter(s => s.status !== 'done');

    const report = {
      total_stories: stories.length,
      completed_stories: completedStories.length,
      incomplete_stories: incompleteStories.length,
      completed_points: capacity.completed,
      remaining_points: capacity.remaining,
      velocity: capacity.completed,
      completion_rate: stories.length > 0 ? Math.round((completedStories.length / stories.length) * 100) : 0,
    };

    res.json({ sprint: updated, final_snapshot: finalSnapshot, report });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

app.get('/api/sprints/:id/burndown', (req, res) => {
  try {
    const sprint = db.getSprint(parseInt(req.params.id));
    if (!sprint) {
      return res.status(404).json({ error: 'Sprint not found' });
    }

    const snapshots = db.getSprintSnapshots(parseInt(req.params.id));
    const capacity = db.calculateSprintCapacity(parseInt(req.params.id));

    const startDate = new Date(sprint.start_date);
    const endDate = new Date(sprint.end_date);
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const totalPoints = capacity.committed;
    const pointsPerDay = totalPoints / totalDays;

    const idealBurndown: number[] = [];
    for (let i = 0; i <= totalDays; i++) {
      idealBurndown.push(Math.max(0, totalPoints - (pointsPerDay * i)));
    }

    res.json({ sprint, snapshots, ideal_burndown: idealBurndown, total_days: totalDays, capacity });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.get('/api/projects/:projectId/velocity', (req, res) => {
  try {
    const sprintCount = req.query.sprint_count ? parseInt(req.query.sprint_count as string) : 3;
    const velocities = db.calculateVelocity(parseInt(req.params.projectId), sprintCount);

    const average = velocities.length > 0
      ? velocities.reduce((a, b) => a + b, 0) / velocities.length
      : 0;

    const sprints = db.listSprints({ project_id: parseInt(req.params.projectId), status: 'completed' });
    const recentSprints = sprints.slice(0, sprintCount);

    res.json({
      average_velocity: Math.round(average * 10) / 10,
      velocities,
      sprint_names: recentSprints.map(s => s.name),
      sprint_count: velocities.length,
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/api/sprints/:id/snapshot', (req, res) => {
  try {
    const sprint = db.getSprint(parseInt(req.params.id));
    if (!sprint) {
      return res.status(404).json({ error: 'Sprint not found' });
    }
    const snapshot = db.createSprintSnapshot(parseInt(req.params.id), req.body.date);
    res.status(201).json(snapshot);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
