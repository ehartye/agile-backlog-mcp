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

    const stories = db.listStories(filter);
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

// Start server
app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
