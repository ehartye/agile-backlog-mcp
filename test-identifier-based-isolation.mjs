#!/usr/bin/env node
/**
 * Comprehensive test suite for identifier-based project isolation
 *
 * Tests:
 * - Project registration with identifiers
 * - Epic/Story/Task creation with agent attribution
 * - Project isolation
 * - Agent identifier tracking
 * - Orphan stories with identifiers
 * - Database migration
 */

import { AgileDatabase } from './shared/dist/index.js';
import fs from 'fs';
import assert from 'assert';

const TEST_DB_PATH = './test-identifier-isolation.db';

// Clean up any existing test database
if (fs.existsSync(TEST_DB_PATH)) {
  fs.unlinkSync(TEST_DB_PATH);
}

console.log('🧪 Starting Identifier-Based Project Isolation Tests...\n');

let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    testsPassed++;
  } catch (error) {
    console.error(`❌ ${name}`);
    console.error(`   Error: ${error.message}`);
    testsFailed++;
  }
}

// Initialize database
const db = new AgileDatabase(TEST_DB_PATH);

// Test 1: Database initialization
test('Database initializes with correct schema', () => {
  assert(db, 'Database should be initialized');
});

// Test 2: Register projects with identifiers
let project1, project2;

test('Register project 1 with identifier', () => {
  project1 = db.createProject({
    identifier: 'frontend-app',
    name: 'Frontend Application',
    description: 'React-based frontend project'
  });

  assert(project1.id, 'Project 1 should have an ID');
  assert.strictEqual(project1.identifier, 'frontend-app', 'Project 1 identifier should match');
  assert.strictEqual(project1.name, 'Frontend Application', 'Project 1 name should match');
});

test('Register project 2 with identifier', () => {
  project2 = db.createProject({
    identifier: 'backend-api',
    name: 'Backend API Service',
    description: 'Node.js backend API'
  });

  assert(project2.id, 'Project 2 should have an ID');
  assert.strictEqual(project2.identifier, 'backend-api', 'Project 2 identifier should match');
  assert(project2.id !== project1.id, 'Projects should have different IDs');
});

test('Get project by identifier', () => {
  const retrieved = db.getProjectByIdentifier('frontend-app');
  assert(retrieved, 'Project should be retrievable by identifier');
  assert.strictEqual(retrieved.id, project1.id, 'Retrieved project should match');
});

test('Identifier uniqueness enforced', () => {
  try {
    db.createProject({
      identifier: 'frontend-app', // Duplicate
      name: 'Another Frontend',
      description: 'This should fail'
    });
    throw new Error('Should have thrown duplicate identifier error');
  } catch (error) {
    assert(error.message.includes('UNIQUE'), 'Should fail with UNIQUE constraint error');
  }
});

// Test 3: Epic creation with agent attribution
let epic1, epic2;

test('Create epic in project 1 with agent attribution', () => {
  epic1 = db.createEpic({
    project_id: project1.id,
    title: 'User Authentication',
    description: 'Implement OAuth2 authentication',
    status: 'todo'
  }, 'claude-agent-1', 'Claude Assistant');

  assert(epic1.id, 'Epic should have an ID');
  assert.strictEqual(epic1.project_id, project1.id, 'Epic should belong to project 1');
  assert.strictEqual(epic1.agent_identifier, 'claude-agent-1', 'Epic should have agent_identifier');
  assert.strictEqual(epic1.last_modified_by, 'Claude Assistant', 'Epic should have modified_by');
});

test('Create epic in project 2 with agent attribution', () => {
  epic2 = db.createEpic({
    project_id: project2.id,
    title: 'API Gateway',
    description: 'Implement API gateway with rate limiting',
    status: 'in_progress'
  }, 'agent-bot-2', 'Bot Assistant');

  assert(epic2.id, 'Epic should have an ID');
  assert.strictEqual(epic2.project_id, project2.id, 'Epic should belong to project 2');
  assert.strictEqual(epic2.agent_identifier, 'agent-bot-2', 'Epic should have agent_identifier');
  assert.strictEqual(epic2.last_modified_by, 'Bot Assistant', 'Epic should have modified_by');
});

// Test 4: Story creation with agent attribution
let story1, story2, orphanStory1, orphanStory2;

test('Create story in project 1 with epic and agent attribution', () => {
  story1 = db.createStory({
    project_id: project1.id,
    epic_id: epic1.id,
    title: 'Login Page',
    description: 'Create login page with OAuth buttons',
    status: 'todo',
    priority: 'high',
    points: 5
  }, 'claude-agent-1', 'Claude Assistant');

  assert(story1.id, 'Story should have an ID');
  assert.strictEqual(story1.project_id, project1.id, 'Story should belong to project 1');
  assert.strictEqual(story1.epic_id, epic1.id, 'Story should belong to epic 1');
  assert.strictEqual(story1.agent_identifier, 'claude-agent-1', 'Story should have agent_identifier');
  assert.strictEqual(story1.last_modified_by, 'Claude Assistant', 'Story should have modified_by');
});

test('Create story in project 2 with epic and agent attribution', () => {
  story2 = db.createStory({
    project_id: project2.id,
    epic_id: epic2.id,
    title: 'Rate Limiter',
    description: 'Implement Redis-based rate limiting',
    status: 'in_progress',
    priority: 'critical',
    points: 8
  }, 'agent-bot-2', 'Bot Assistant');

  assert(story2.id, 'Story should have an ID');
  assert.strictEqual(story2.project_id, project2.id, 'Story should belong to project 2');
  assert.strictEqual(story2.agent_identifier, 'agent-bot-2', 'Story should have agent_identifier');
});

// Test 5: Orphan stories with project_id (CRITICAL)
test('Create orphan story in project 1 (no epic)', () => {
  orphanStory1 = db.createStory({
    project_id: project1.id,
    epic_id: null,
    title: 'Standalone Frontend Task',
    description: 'Independent UI improvement',
    status: 'todo',
    priority: 'medium',
    points: 2
  }, 'claude-agent-1', 'Claude');

  assert(orphanStory1.id, 'Orphan story should have an ID');
  assert.strictEqual(orphanStory1.project_id, project1.id, 'Orphan story should have project_id');
  assert.strictEqual(orphanStory1.epic_id, null, 'Orphan story should have no epic');
  assert.strictEqual(orphanStory1.agent_identifier, 'claude-agent-1', 'Orphan story should have agent_identifier');
});

test('Create orphan story in project 2 (no epic)', () => {
  orphanStory2 = db.createStory({
    project_id: project2.id,
    epic_id: null,
    title: 'Standalone Backend Task',
    description: 'Optimize database queries',
    status: 'done',
    priority: 'low',
    points: 3
  }, 'agent-bot-2', 'Bot');

  assert(orphanStory2.id, 'Orphan story should have an ID');
  assert.strictEqual(orphanStory2.project_id, project2.id, 'Orphan story should have project_id');
  assert.strictEqual(orphanStory2.epic_id, null, 'Orphan story should have no epic');
});

// Test 6: Project isolation for epics
test('Project 1 sees only its own epic', () => {
  const epics = db.listEpics({ project_id: project1.id });
  assert.strictEqual(epics.length, 1, 'Project 1 should have exactly 1 epic');
  assert.strictEqual(epics[0].id, epic1.id, 'Project 1 should see its own epic');
});

test('Project 2 sees only its own epic', () => {
  const epics = db.listEpics({ project_id: project2.id });
  assert.strictEqual(epics.length, 1, 'Project 2 should have exactly 1 epic');
  assert.strictEqual(epics[0].id, epic2.id, 'Project 2 should see its own epic');
});

// Test 7: Project isolation for stories (INCLUDING ORPHANS)
test('Project 1 has exactly 2 stories (1 with epic, 1 orphan)', () => {
  const stories = db.listStories({ project_id: project1.id });
  assert.strictEqual(stories.length, 2, 'Project 1 should have exactly 2 stories');
});

test('Project 2 has exactly 2 stories (1 with epic, 1 orphan)', () => {
  const stories = db.listStories({ project_id: project2.id });
  assert.strictEqual(stories.length, 2, 'Project 2 should have exactly 2 stories');
});

test('Project 1 sees its own orphan story', () => {
  const stories = db.listStories({ project_id: project1.id });
  const storyIds = stories.map(s => s.id);
  assert(storyIds.includes(orphanStory1.id), 'Project 1 should see its own orphan story');
});

test('Project 1 does NOT see project 2 orphan story', () => {
  const stories = db.listStories({ project_id: project1.id });
  const storyIds = stories.map(s => s.id);
  assert(!storyIds.includes(orphanStory2.id), 'Project 1 should NOT see project 2 orphan story');
});

// Test 8: Task creation with agent attribution
let task1;

test('Create task in project 1 with agent attribution', () => {
  task1 = db.createTask({
    story_id: story1.id,
    title: 'Design OAuth flow',
    description: 'Create wireframes for OAuth flow',
    status: 'todo',
    assignee: 'designer-1'
  }, 'claude-agent-1', 'Claude');

  assert(task1.id, 'Task should have an ID');
  assert.strictEqual(task1.story_id, story1.id, 'Task should belong to story 1');
  assert.strictEqual(task1.agent_identifier, 'claude-agent-1', 'Task should have agent_identifier');
  assert.strictEqual(task1.last_modified_by, 'Claude', 'Task should have modified_by');
});

test('Tasks filtered by project via story relationship', () => {
  const tasks = db.listTasks({ project_id: project1.id });
  assert.strictEqual(tasks.length, 1, 'Project 1 should have 1 task');
  assert.strictEqual(tasks[0].id, task1.id, 'Project 1 should see its own task');
});

// Test 9: Agent identifier tracking
test('Epic tracks agent_identifier correctly', () => {
  const retrieved = db.getEpic(epic1.id);
  assert.strictEqual(retrieved.agent_identifier, 'claude-agent-1', 'Epic should track agent_identifier');
  assert.strictEqual(retrieved.last_modified_by, 'Claude Assistant', 'Epic should track modified_by');
});

test('Story tracks agent_identifier correctly', () => {
  const retrieved = db.getStory(story1.id);
  assert.strictEqual(retrieved.agent_identifier, 'claude-agent-1', 'Story should track agent_identifier');
});

test('Task tracks agent_identifier correctly', () => {
  const retrieved = db.getTask(task1.id);
  assert.strictEqual(retrieved.agent_identifier, 'claude-agent-1', 'Task should track agent_identifier');
});

// Test 10: Update operations with agent tracking
test('Update epic with different agent', () => {
  const updated = db.updateEpic({
    id: epic1.id,
    status: 'in_progress'
  }, 'different-agent', 'Different Agent');

  assert.strictEqual(updated.status, 'in_progress', 'Epic status should be updated');
  assert.strictEqual(updated.agent_identifier, 'different-agent', 'Epic should have new agent_identifier');
  assert.strictEqual(updated.last_modified_by, 'Different Agent', 'Epic should have new modified_by');
});

// Test 11: Project ID helper methods
test('getProjectIdForEpic returns correct project', () => {
  const projectId = db.getProjectIdForEpic(epic1.id);
  assert.strictEqual(projectId, project1.id, 'Should return correct project ID for epic');
});

test('getProjectIdForStory returns correct project (including orphan)', () => {
  const projectId = db.getProjectIdForStory(orphanStory1.id);
  assert.strictEqual(projectId, project1.id, 'Should return correct project ID for orphan story');
});

test('getProjectIdForTask returns correct project via story', () => {
  const projectId = db.getProjectIdForTask(task1.id);
  assert.strictEqual(projectId, project1.id, 'Should return correct project ID for task via story');
});

// Test 12: List all projects
test('List all projects', () => {
  const projects = db.listProjects();
  assert.strictEqual(projects.length, 2, 'Should have 2 projects');
  assert(projects.find(p => p.identifier === 'frontend-app'), 'Should find frontend-app');
  assert(projects.find(p => p.identifier === 'backend-api'), 'Should find backend-api');
});

// Test 13: Validate identifier uniqueness
test('validateProjectIdentifier works correctly', () => {
  assert(db.validateProjectIdentifier('frontend-app'), 'Should validate existing identifier');
  assert(!db.validateProjectIdentifier('nonexistent-project'), 'Should reject nonexistent identifier');
});

// Cleanup
db.close();
if (fs.existsSync(TEST_DB_PATH)) {
  fs.unlinkSync(TEST_DB_PATH);
}

// Summary
console.log('\n' + '='.repeat(60));
console.log(`✅ Tests Passed: ${testsPassed}`);
console.log(`❌ Tests Failed: ${testsFailed}`);
console.log(`📊 Total Tests: ${testsPassed + testsFailed}`);
console.log(`🎯 Pass Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);
console.log('='.repeat(60));

if (testsFailed > 0) {
  console.log('\n❌ Some tests failed! Review the errors above.');
  process.exit(1);
} else {
  console.log('\n🎉 All tests passed! Identifier-based isolation is working correctly.');
  process.exit(0);
}
